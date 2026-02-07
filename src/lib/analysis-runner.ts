import { v4 as uuidv4 } from 'uuid';
import { AnalysisMode, AnalysisResult, AnalysisCost } from '@/types/analysis';
import { ParsedFiling } from '@/types/edgar';
import { fetchEdgarHtml, parseEdgarHtml } from './edgar-parser';
import { mockQuickScan, mockStandardAnalysis, mockDeepDive } from './claude-mock';
import { ClaudeClient } from './claude-client';
import { setAnalysis, updateAnalysis, getAnalysis } from './store';
import { saveAnalysisToFile } from './persistence';

const useMock = !process.env.ANTHROPIC_API_KEY;

function estimateCost(mode: AnalysisMode): number {
  switch (mode) {
    case 'quick': return 0.30;
    case 'standard': return 0.70;
    case 'deep': return 1.35;
  }
}

function estimateTime(mode: AnalysisMode): number {
  switch (mode) {
    case 'quick': return useMock ? 8 : 150;
    case 'standard': return useMock ? 15 : 270;
    case 'deep': return useMock ? 20 : 420;
  }
}

export function startAnalysis(
  edgarUrl: string,
  mode: AnalysisMode,
  companyName?: string,
  peers?: string[]
): { id: string; estimatedCost: number; estimatedTime: number } {
  const id = uuidv4();

  const analysis: AnalysisResult = {
    id,
    companyName: companyName || 'Analyzing...',
    filingType: '',
    fiscalPeriod: '',
    edgarUrl,
    mode,
    status: 'processing',
    progress: 0,
    currentStep: 'Fetching document...',
    createdAt: new Date().toISOString(),
  };

  setAnalysis(id, analysis);

  // Run analysis async
  runAnalysis(id, edgarUrl, mode, peers).then(() => {
    // Save completed analysis to disk for history
    const completed = getAnalysis(id);
    if (completed && completed.status === 'complete') {
      saveAnalysisToFile(completed).catch(err =>
        console.error('Failed to persist analysis:', err)
      );
    }
  }).catch(err => {
    console.error('Analysis failed:', err);
    updateAnalysis(id, {
      status: 'error',
      currentStep: `Error: ${err.message}`,
    });
  });

  return {
    id,
    estimatedCost: estimateCost(mode),
    estimatedTime: estimateTime(mode),
  };
}

async function runAnalysis(
  id: string,
  edgarUrl: string,
  mode: AnalysisMode,
  peers?: string[]
): Promise<void> {
  // Step 1: Fetch and parse document
  updateAnalysis(id, { progress: 5, currentStep: 'Downloading document...' });

  let filing: ParsedFiling;
  try {
    const { html, resolvedUrl } = await fetchEdgarHtml(edgarUrl);
    filing = parseEdgarHtml(html, resolvedUrl || edgarUrl);
  } catch {
    // If fetch fails (e.g., no network), create a mock filing for demo purposes
    if (useMock) {
      filing = createMockFiling();
    } else {
      throw new Error('Failed to fetch or parse EDGAR document');
    }
  }

  updateAnalysis(id, {
    companyName: filing.companyName,
    filingType: filing.filingType,
    fiscalPeriod: filing.fiscalPeriod,
    progress: 15,
    currentStep: 'Document parsed. Extracting financial data...',
  });

  updateAnalysis(id, { progress: 20, currentStep: 'Analyzing financials...' });

  if (useMock) {
    await runMockAnalysis(id, filing, mode);
  } else {
    await runRealAnalysis(id, filing, mode, peers);
  }
}

async function runMockAnalysis(
  id: string,
  filing: ParsedFiling,
  mode: AnalysisMode
): Promise<void> {
  // Quick scan (always runs)
  updateAnalysis(id, { progress: 30, currentStep: 'Generating investment thesis...' });
  const quickResult = await mockQuickScan(filing);

  updateAnalysis(id, {
    progress: mode === 'quick' ? 80 : 45,
    currentStep: mode === 'quick' ? 'Finalizing report...' : 'Running detailed analysis...',
    quickStats: quickResult.quickStats,
    bullCase: quickResult.bullCase,
    bearCase: quickResult.bearCase,
    baseCase: quickResult.baseCase,
    keyQuestions: quickResult.keyQuestions,
    redFlags: quickResult.redFlags,
    cost: quickResult.cost,
  });

  if (mode === 'quick') {
    updateAnalysis(id, {
      status: 'complete',
      progress: 100,
      currentStep: 'Analysis complete',
      completedAt: new Date().toISOString(),
    });
    return;
  }

  // Standard analysis
  updateAnalysis(id, { progress: 50, currentStep: 'Analyzing financial details...' });
  const standardResult = await mockStandardAnalysis(filing);

  // Merge red flags
  const existingAnalysis = updateAnalysis(id, {});
  const allRedFlags = [
    ...(existingAnalysis?.redFlags || []),
    ...standardResult.additionalRedFlags,
  ];

  // Merge costs
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

  updateAnalysis(id, {
    progress: mode === 'standard' ? 85 : 65,
    currentStep: mode === 'standard' ? 'Finalizing report...' : 'Running deep dive analysis...',
    financialAnalysis: standardResult.financialAnalysis,
    peerComparison: standardResult.peerComparison,
    toneAnalysis: standardResult.toneAnalysis,
    redFlags: allRedFlags,
    cost: mergedCost,
  });

  if (mode === 'standard') {
    updateAnalysis(id, {
      status: 'complete',
      progress: 100,
      currentStep: 'Analysis complete',
      completedAt: new Date().toISOString(),
    });
    return;
  }

  // Deep dive
  updateAnalysis(id, { progress: 70, currentStep: 'Analyzing segments...' });
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

  updateAnalysis(id, {
    status: 'complete',
    progress: 100,
    currentStep: 'Analysis complete',
    completedAt: new Date().toISOString(),
    segmentAnalysis: deepResult.segmentAnalysis,
    competitorIntel: deepResult.competitorIntel,
    footnoteAnalysis: deepResult.footnoteAnalysis,
    smartHighlights: deepResult.smartHighlights,
    cost: finalCost,
  });
}

// Helper to run a step safely - returns null on failure instead of crashing
async function safeStep<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}] Step failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function runRealAnalysis(
  id: string,
  filing: ParsedFiling,
  mode: AnalysisMode,
  peers?: string[]
): Promise<void> {
  const client = new ClaudeClient(filing);

  // Quick scan - this is required, so we let it throw
  updateAnalysis(id, { progress: 30, currentStep: 'Generating investment thesis...' });
  const quickResult = await client.quickScan();

  updateAnalysis(id, {
    progress: mode === 'quick' ? 90 : 45,
    currentStep: mode === 'quick' ? 'Finalizing...' : 'Running detailed analysis...',
    quickStats: quickResult.quickStats,
    bullCase: quickResult.bullCase,
    bearCase: quickResult.bearCase,
    baseCase: quickResult.baseCase,
    keyQuestions: quickResult.keyQuestions,
    redFlags: quickResult.redFlags,
  });

  if (mode === 'quick') {
    updateAnalysis(id, {
      status: 'complete',
      progress: 100,
      currentStep: 'Analysis complete',
      completedAt: new Date().toISOString(),
      cost: quickResult.cost,
    });
    return;
  }

  // Standard: run financial, tone, peers in parallel - each can fail independently
  updateAnalysis(id, { progress: 50, currentStep: 'Analyzing financial details...' });
  const [financialResult, toneResult, peerResult] = await Promise.all([
    safeStep('financial', () => client.financialAnalysis()),
    safeStep('tone', () => client.toneAnalysis()),
    safeStep('peers', () => client.peerComparison(peers)),
  ]);

  updateAnalysis(id, {
    progress: mode === 'standard' ? 85 : 65,
    currentStep: mode === 'standard' ? 'Finalizing...' : 'Running deep dive...',
    ...(financialResult && { financialAnalysis: financialResult.financialAnalysis }),
    ...(toneResult && { toneAnalysis: toneResult.toneAnalysis }),
    ...(peerResult && { peerComparison: peerResult.peerComparison }),
  });

  if (mode === 'standard') {
    const totalCost = client.getTotalCost();
    updateAnalysis(id, {
      status: 'complete',
      progress: 100,
      currentStep: 'Analysis complete',
      completedAt: new Date().toISOString(),
      cost: {
        mode: 'standard',
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
    });
    return;
  }

  // Deep dive: segments, competitors, footnotes, highlights - each can fail independently
  updateAnalysis(id, { progress: 70, currentStep: 'Analyzing segments and competitors...' });
  const [segmentResult, competitorResult, footnoteResult, highlightResult] = await Promise.all([
    safeStep('segments', () => client.segmentAnalysis()),
    safeStep('competitors', () => client.competitorResearch()),
    safeStep('footnotes', () => client.footnoteDeepDive()),
    safeStep('highlights', () => client.smartHighlights()),
  ]);

  const totalCost = client.getTotalCost();
  updateAnalysis(id, {
    status: 'complete',
    progress: 100,
    currentStep: 'Analysis complete',
    completedAt: new Date().toISOString(),
    ...(segmentResult && { segmentAnalysis: segmentResult.segmentAnalysis }),
    ...(competitorResult && { competitorIntel: competitorResult.competitorIntel }),
    ...(footnoteResult && { footnoteAnalysis: footnoteResult.footnoteAnalysis }),
    ...(highlightResult && { smartHighlights: highlightResult.smartHighlights }),
    cost: {
      mode: 'deep',
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
  });
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
        ['Cost of Revenue', '$1,810', '$1,585', '$1,440'],
        ['Gross Profit', '$3,390', '$2,822', '$2,450'],
        ['Operating Expenses', '$2,230', '$1,987', '$1,780'],
        ['Operating Income', '$1,160', '$835', '$670'],
        ['Net Income', '$874', '$621', '$492'],
      ],
      balanceSheet: [
        ['', 'FY2024', 'FY2023'],
        ['Cash & Equivalents', '$1,200', '$980'],
        ['Accounts Receivable', '$670', '$540'],
        ['Total Current Assets', '$2,450', '$2,100'],
        ['Goodwill', '$2,100', '$2,100'],
        ['Total Assets', '$9,800', '$9,200'],
        ['Total Current Liabilities', '$1,800', '$1,650'],
        ['Long-Term Debt', '$3,800', '$4,100'],
        ['Total Liabilities', '$6,200', '$6,350'],
        ['Total Equity', '$3,600', '$2,850'],
      ],
      cashFlow: [
        ['', 'FY2024', 'FY2023'],
        ['Net Income', '$874', '$621'],
        ['D&A', '$380', '$350'],
        ['SBC', '$320', '$237'],
        ['Changes in Working Capital', '($154)', '($98)'],
        ['Cash from Operations', '$1,120', '$890'],
        ['CapEx', '($420)', '($480)'],
        ['Free Cash Flow', '$700', '$410'],
        ['Debt Repayment', '($300)', '($200)'],
        ['Share Repurchases', '($250)', '($150)'],
      ],
    },
    sections: {
      riskFactors: 'Item 1A. Risk Factors\n\nWe face significant competition from both established companies and well-funded startups. Our business depends on a limited number of key customers, with our top three customers representing approximately 65% of our revenue. The loss of any of these customers could materially affect our results. We have recently observed emerging competitive dynamics from AI-native platforms that could disrupt our traditional business model. Our substantial indebtedness, including $3.2 billion maturing in 2026, could restrict our operations and ability to invest in growth. We are subject to various legal proceedings, including a patent infringement claim seeking $200 million in damages. Our international operations expose us to currency fluctuations and geopolitical risks.',
      mda: "Management's Discussion and Analysis\n\nFiscal 2024 was a year of strong execution. Revenue grew 18% year-over-year to $5.2 billion, driven by our Enterprise Solutions segment which grew 25%. We are confident in our growth trajectory and expect continued momentum in 2025. Operating margins expanded 340 basis points to 22.3%, reflecting our disciplined approach to cost management and the benefits of our automation initiatives. We reduced headcount by 12% while growing revenue 18%, demonstrating significant operational leverage. Our SMB segment grew 8%, facing some pricing pressure from newer entrants. We continue to invest in product innovation while maintaining capital discipline. Free cash flow reached $820 million, up from $510 million, reflecting strong earnings growth and declining capital intensity.",
      footnotes: 'Note 8 - Debt\nRevolving Credit Facility: $1.5B commitment, $300M drawn, matures December 2027. Term Loan A: $1.2B outstanding, SOFR + 175bps, matures June 2026. Senior Notes: $600M at 4.25% fixed, matures October 2028. Senior Notes: $2.0B at 5.50% fixed, matures March 2026. Financial Covenants: Net Leverage Ratio not to exceed 3.5x. Interest Coverage Ratio not less than 3.0x.\n\nNote 12 - Segment Information\nThe Company operates in three reportable segments: Enterprise Solutions, SMB Products, and Professional Services.',
      segments: 'Enterprise Solutions: Revenue $2.8B (54%), Operating Income $840M, 30.0% margin, +25% YoY. SMB Products: Revenue $1.6B (31%), Operating Income $256M, 16.0% margin, +8% YoY. Professional Services: Revenue $0.8B (15%), Operating Income $72M, 9.0% margin, +12% YoY.',
    },
    rawTextLength: 250000,
    cleanedTextLength: 15000,
  };
}
