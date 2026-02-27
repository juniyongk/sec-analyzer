import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisMode, AnalysisCost } from '@/types/analysis';
import { ParsedFiling } from '@/types/edgar';
import { fetchEdgarHtml, parseEdgarHtml } from '@/lib/edgar-parser';
import { ClaudeClient } from '@/lib/claude-client';
import { mockQuickScan, mockStandardAnalysis, mockDeepDive } from '@/lib/claude-mock';
import { saveAnalysisToFile } from '@/lib/persistence';

export const maxDuration = 300;

const useMock = !process.env.ANTHROPIC_API_KEY;

async function safeStep<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}] Step failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { edgarUrl, mode, peers } = body as {
    edgarUrl: string;
    mode: AnalysisMode;
    peers?: string[];
  };

  if (!edgarUrl || !['quick', 'standard', 'deep'].includes(mode)) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }

  const id = uuidv4();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream may be closed
        }
      };

      try {
        // Step 1: Fetch and parse document
        send({ type: 'progress', progress: 5, step: 'Downloading SEC filing...' });

        let filing: ParsedFiling;
        try {
          const { html, resolvedUrl } = await fetchEdgarHtml(edgarUrl);
          filing = parseEdgarHtml(html, resolvedUrl || edgarUrl);
        } catch {
          if (useMock) {
            filing = createMockFiling();
          } else {
            send({ type: 'error', message: 'Failed to fetch or parse EDGAR document. Please check the URL and try again.' });
            controller.close();
            return;
          }
        }

        send({
          type: 'progress',
          progress: 15,
          step: 'Document parsed. Starting analysis...',
          companyName: filing.companyName,
          filingType: filing.filingType,
          fiscalPeriod: filing.fiscalPeriod,
        });

        if (useMock) {
          await runMockStream(id, filing, mode, edgarUrl, send);
        } else {
          await runRealStream(id, filing, mode, edgarUrl, peers, send);
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Analysis failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function runMockStream(
  id: string,
  filing: ParsedFiling,
  mode: AnalysisMode,
  edgarUrl: string,
  send: (data: Record<string, unknown>) => void
) {
  send({ type: 'progress', progress: 30, step: 'Generating investment thesis...' });
  const quickResult = await mockQuickScan(filing);

  send({
    type: 'partial',
    data: {
      quickStats: quickResult.quickStats,
      bullCase: quickResult.bullCase,
      bearCase: quickResult.bearCase,
      baseCase: quickResult.baseCase,
      keyQuestions: quickResult.keyQuestions,
      redFlags: quickResult.redFlags,
    },
  });

  if (mode === 'quick') {
    const result = {
      id, companyName: filing.companyName, filingType: filing.filingType,
      fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
      status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      ...quickResult,
    };
    await safeStep('persist', () => saveAnalysisToFile(result));
    send({ type: 'complete', result });
    return;
  }

  send({ type: 'progress', progress: 50, step: 'Running detailed analysis...' });
  const standardResult = await mockStandardAnalysis(filing);
  const allRedFlags = [...quickResult.redFlags, ...standardResult.additionalRedFlags];

  const mergedCost: AnalysisCost = {
    mode,
    calls: [...quickResult.cost.calls, ...standardResult.cost.calls],
    total: quickResult.cost.total + standardResult.cost.total,
    breakdown: {
      financial: standardResult.cost.breakdown.financial,
      redFlags: standardResult.cost.breakdown.redFlags + quickResult.cost.breakdown.redFlags,
      tone: standardResult.cost.breakdown.tone,
      peers: standardResult.cost.breakdown.peers,
      synthesis: quickResult.cost.breakdown.synthesis,
    },
  };

  send({
    type: 'partial',
    data: {
      financialAnalysis: standardResult.financialAnalysis,
      peerComparison: standardResult.peerComparison,
      toneAnalysis: standardResult.toneAnalysis,
      redFlags: allRedFlags,
    },
  });

  if (mode === 'standard') {
    const result = {
      id, companyName: filing.companyName, filingType: filing.filingType,
      fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
      status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      quickStats: quickResult.quickStats, bullCase: quickResult.bullCase,
      bearCase: quickResult.bearCase, baseCase: quickResult.baseCase,
      keyQuestions: quickResult.keyQuestions, redFlags: allRedFlags,
      financialAnalysis: standardResult.financialAnalysis,
      peerComparison: standardResult.peerComparison,
      toneAnalysis: standardResult.toneAnalysis,
      cost: mergedCost,
    };
    await safeStep('persist', () => saveAnalysisToFile(result));
    send({ type: 'complete', result });
    return;
  }

  send({ type: 'progress', progress: 70, step: 'Running deep dive analysis...' });
  const deepResult = await mockDeepDive(filing);
  const finalCost: AnalysisCost = {
    mode: 'deep',
    calls: [...mergedCost.calls, ...deepResult.cost.calls],
    total: mergedCost.total + deepResult.cost.total,
    breakdown: {
      ...mergedCost.breakdown,
      segments: deepResult.cost.breakdown.segments,
      competitors: deepResult.cost.breakdown.competitors,
      footnotes: deepResult.cost.breakdown.footnotes,
    },
  };

  const result = {
    id, companyName: filing.companyName, filingType: filing.filingType,
    fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
    status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    quickStats: quickResult.quickStats, bullCase: quickResult.bullCase,
    bearCase: quickResult.bearCase, baseCase: quickResult.baseCase,
    keyQuestions: quickResult.keyQuestions, redFlags: allRedFlags,
    financialAnalysis: standardResult.financialAnalysis,
    peerComparison: standardResult.peerComparison,
    toneAnalysis: standardResult.toneAnalysis,
    segmentAnalysis: deepResult.segmentAnalysis,
    competitorIntel: deepResult.competitorIntel,
    footnoteAnalysis: deepResult.footnoteAnalysis,
    smartHighlights: deepResult.smartHighlights,
    cost: finalCost,
  };
  await safeStep('persist', () => saveAnalysisToFile(result));
  send({ type: 'complete', result });
}

async function runRealStream(
  id: string,
  filing: ParsedFiling,
  mode: AnalysisMode,
  edgarUrl: string,
  peers: string[] | undefined,
  send: (data: Record<string, unknown>) => void
) {
  const client = new ClaudeClient(filing);

  // Quick scan (required)
  send({ type: 'progress', progress: 25, step: 'Generating investment thesis...' });
  const quickResult = await client.quickScan();

  send({
    type: 'partial',
    data: {
      quickStats: quickResult.quickStats,
      bullCase: quickResult.bullCase,
      bearCase: quickResult.bearCase,
      baseCase: quickResult.baseCase,
      keyQuestions: quickResult.keyQuestions,
      redFlags: quickResult.redFlags,
    },
  });

  if (mode === 'quick') {
    const result = {
      id, companyName: filing.companyName, filingType: filing.filingType,
      fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
      status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      ...quickResult,
    };
    await safeStep('persist', () => saveAnalysisToFile(result));
    send({ type: 'complete', result });
    return;
  }

  // Standard: financial, tone, peers in parallel
  send({ type: 'progress', progress: 45, step: 'Analyzing financial details...' });
  const [financialResult, toneResult, peerResult] = await Promise.all([
    safeStep('financial', () => client.financialAnalysis()),
    safeStep('tone', () => client.toneAnalysis()),
    safeStep('peers', () => client.peerComparison(peers)),
  ]);

  send({
    type: 'partial',
    data: {
      ...(financialResult && { financialAnalysis: financialResult.financialAnalysis }),
      ...(toneResult && { toneAnalysis: toneResult.toneAnalysis }),
      ...(peerResult && { peerComparison: peerResult.peerComparison }),
    },
  });

  if (mode === 'standard') {
    const totalCost = client.getTotalCost();
    const result = {
      id, companyName: filing.companyName, filingType: filing.filingType,
      fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
      status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
      createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      quickStats: quickResult.quickStats, bullCase: quickResult.bullCase,
      bearCase: quickResult.bearCase, baseCase: quickResult.baseCase,
      keyQuestions: quickResult.keyQuestions, redFlags: quickResult.redFlags,
      ...(financialResult && { financialAnalysis: financialResult.financialAnalysis }),
      ...(toneResult && { toneAnalysis: toneResult.toneAnalysis }),
      ...(peerResult && { peerComparison: peerResult.peerComparison }),
      cost: {
        mode: 'standard' as const,
        calls: client.getCalls(),
        total: totalCost,
        breakdown: {
          financial: financialResult?.cost.cost || 0,
          redFlags: quickResult.cost.breakdown.redFlags,
          tone: toneResult?.cost.cost || 0,
          peers: peerResult?.cost.cost || 0,
          synthesis: quickResult.cost.breakdown.synthesis,
        },
      },
    };
    await safeStep('persist', () => saveAnalysisToFile(result));
    send({ type: 'complete', result });
    return;
  }

  // Deep dive: segments, competitors, footnotes, highlights
  send({ type: 'progress', progress: 70, step: 'Analyzing segments and competitors...' });
  const [segmentResult, competitorResult, footnoteResult, highlightResult] = await Promise.all([
    safeStep('segments', () => client.segmentAnalysis()),
    safeStep('competitors', () => client.competitorResearch()),
    safeStep('footnotes', () => client.footnoteDeepDive()),
    safeStep('highlights', () => client.smartHighlights()),
  ]);

  const totalCost = client.getTotalCost();
  const result = {
    id, companyName: filing.companyName, filingType: filing.filingType,
    fiscalPeriod: filing.fiscalPeriod, edgarUrl, mode,
    status: 'complete' as const, progress: 100, currentStep: 'Analysis complete',
    createdAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    quickStats: quickResult.quickStats, bullCase: quickResult.bullCase,
    bearCase: quickResult.bearCase, baseCase: quickResult.baseCase,
    keyQuestions: quickResult.keyQuestions, redFlags: quickResult.redFlags,
    ...(financialResult && { financialAnalysis: financialResult.financialAnalysis }),
    ...(toneResult && { toneAnalysis: toneResult.toneAnalysis }),
    ...(peerResult && { peerComparison: peerResult.peerComparison }),
    ...(segmentResult && { segmentAnalysis: segmentResult.segmentAnalysis }),
    ...(competitorResult && { competitorIntel: competitorResult.competitorIntel }),
    ...(footnoteResult && { footnoteAnalysis: footnoteResult.footnoteAnalysis }),
    ...(highlightResult && { smartHighlights: highlightResult.smartHighlights }),
    cost: {
      mode: 'deep' as const,
      calls: client.getCalls(),
      total: totalCost,
      breakdown: {
        financial: financialResult?.cost.cost || 0,
        redFlags: quickResult.cost.breakdown.redFlags,
        tone: toneResult?.cost.cost || 0,
        peers: peerResult?.cost.cost || 0,
        synthesis: quickResult.cost.breakdown.synthesis,
        segments: segmentResult?.cost.cost || 0,
        competitors: competitorResult?.cost.cost || 0,
        footnotes: footnoteResult?.cost.cost || 0,
      },
    },
  };
  await safeStep('persist', () => saveAnalysisToFile(result));
  send({ type: 'complete', result });
}

function createMockFiling(): ParsedFiling {
  return {
    companyName: 'Acme Technology Corp.',
    filingType: '10-K',
    fiscalPeriod: 'December 31, 2024',
    financials: {
      incomeStatement: [
        ['', 'FY2024', 'FY2023', 'FY2022'],
        ['Revenue', '$5,200', '$4,407', '$3,890'],
        ['Gross Profit', '$3,390', '$2,822', '$2,450'],
        ['Operating Income', '$1,160', '$835', '$670'],
        ['Net Income', '$874', '$621', '$492'],
      ],
      balanceSheet: [
        ['', 'FY2024', 'FY2023'],
        ['Cash & Equivalents', '$1,200', '$980'],
        ['Total Assets', '$9,800', '$9,200'],
        ['Long-Term Debt', '$3,800', '$4,100'],
        ['Total Equity', '$3,600', '$2,850'],
      ],
      cashFlow: [
        ['', 'FY2024', 'FY2023'],
        ['Cash from Operations', '$1,120', '$890'],
        ['Free Cash Flow', '$700', '$410'],
      ],
    },
    sections: {
      riskFactors: 'We face significant competition. Our top three customers represent 65% of revenue.',
      mda: 'Revenue grew 18% YoY to $5.2B. Operating margins expanded 340bps to 22.3%.',
      footnotes: 'Term Loan A: $1.2B outstanding. Senior Notes: $2.0B at 5.50%.',
      segments: 'Enterprise Solutions: $2.8B (54%). SMB Products: $1.6B (31%). Professional Services: $0.8B (15%).',
    },
    rawTextLength: 250000,
    cleanedTextLength: 15000,
  };
}
