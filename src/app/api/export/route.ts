import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/store';
import { loadAnalysisFromFile } from '@/lib/persistence';
import { AnalysisResult } from '@/types/analysis';

function generateMarkdown(analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`# ${analysis.companyName} - ${analysis.filingType} ${analysis.fiscalPeriod}`);
  lines.push(`**Analyzed:** ${new Date(analysis.completedAt || analysis.createdAt).toLocaleDateString()} | **Cost:** $${analysis.cost?.total?.toFixed(2) || '0.00'} | **Mode:** ${analysis.mode}`);
  lines.push('');

  // Quick Stats
  if (analysis.quickStats) {
    const qs = analysis.quickStats;
    lines.push('---');
    lines.push('## Quick Stats');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Revenue | ${qs.revenue} (${qs.revenueGrowthYoY} YoY, ${qs.revenueGrowthQoQ} QoQ) |`);
    lines.push(`| Operating Margin | ${qs.operatingMargin} (${qs.operatingMarginChange}) |`);
    lines.push(`| Net Debt / EBITDA | ${qs.netDebtToEbitda} (from ${qs.netDebtToEbitdaPrior}) |`);
    lines.push(`| Red Flags | ${qs.redFlagsCritical} critical, ${qs.redFlagsWarning} warnings, ${qs.redFlagsMonitor} monitoring |`);
    lines.push('');
  }

  // Bull Case
  if (analysis.bullCase?.length) {
    lines.push('---');
    lines.push('## Bull Case');
    for (const point of analysis.bullCase) {
      lines.push(`### ${point.title} (${point.confidence || 'N/A'})`);
      for (const d of point.details) lines.push(`- ${d}`);
      lines.push(`> ${point.implication}`);
      lines.push('');
    }
  }

  // Bear Case
  if (analysis.bearCase?.length) {
    lines.push('---');
    lines.push('## Bear Case');
    for (const point of analysis.bearCase) {
      lines.push(`### ${point.title} (${point.severity || 'N/A'})`);
      for (const d of point.details) lines.push(`- ${d}`);
      lines.push(`> ${point.implication}`);
      lines.push('');
    }
  }

  // Base Case
  if (analysis.baseCase) {
    lines.push('---');
    lines.push('## Base Case');
    lines.push(analysis.baseCase.scenario);
    lines.push(`- **Key dependency:** ${analysis.baseCase.dependency}`);
    lines.push(`- **Main risk:** ${analysis.baseCase.mainRisk}`);
    lines.push('');
  }

  // Key Questions
  if (analysis.keyQuestions?.length) {
    lines.push('---');
    lines.push('## Key Questions for Management');
    for (let i = 0; i < analysis.keyQuestions.length; i++) {
      lines.push(`${i + 1}. ${analysis.keyQuestions[i]}`);
    }
    lines.push('');
  }

  // Red Flags
  if (analysis.redFlags?.length) {
    lines.push('---');
    lines.push('## Red Flags');
    for (const flag of analysis.redFlags) {
      const icon = flag.severity === 'critical' ? 'CRITICAL' : flag.severity === 'warning' ? 'WARNING' : 'MONITOR';
      lines.push(`### [${icon}] ${flag.title}`);
      lines.push(flag.description);
      for (const d of flag.details) lines.push(`- ${d}`);
      lines.push(`**Impact:** ${flag.impact}`);
      lines.push('');
    }
  }

  // Financial Analysis
  if (analysis.financialAnalysis) {
    lines.push('---');
    lines.push('## Detailed Financial Analysis');
    const fa = analysis.financialAnalysis;
    lines.push('### Revenue Analysis', fa.revenueAnalysis, '');
    lines.push('### Margin Analysis', fa.marginAnalysis, '');
    lines.push('### Quality of Earnings', fa.qualityOfEarnings, '');
    lines.push('### Returns Metrics', fa.returnsMetrics, '');
    lines.push('### Debt Analysis', fa.debtAnalysis, '');
    lines.push('### CapEx & FCF', fa.capexAndFcf, '');
  }

  // Peer Comparison
  if (analysis.peerComparison?.length) {
    lines.push('---');
    lines.push('## Peer Comparison');
    lines.push('| Company | Rev Growth | Gross Margin | Op Margin | ND/EBITDA | EV/Rev |');
    lines.push('|---------|-----------|-------------|-----------|-----------|--------|');
    for (const p of analysis.peerComparison) {
      lines.push(`| ${p.ticker} - ${p.name} | ${p.revenueGrowth} | ${p.grossMargin} | ${p.operatingMargin} | ${p.netDebtToEbitda} | ${p.evToRevenue} |`);
    }
    lines.push('');
  }

  // Segment Analysis
  if (analysis.segmentAnalysis?.segments.length) {
    lines.push('---');
    lines.push('## Segment Analysis');
    for (const seg of analysis.segmentAnalysis.segments) {
      lines.push(`### ${seg.name} (${seg.growth})`);
      lines.push(`- Revenue: ${seg.revenue}`);
      lines.push(`- Operating Income: ${seg.operatingIncome} (${seg.margin} margin)`);
      lines.push(seg.commentary);
      lines.push('');
    }
  }

  // Competitor Intel
  if (analysis.competitorIntel?.competitors.length) {
    lines.push('---');
    lines.push('## Private Competitor Intelligence');
    for (const c of analysis.competitorIntel.competitors) {
      lines.push(`### ${c.name}`);
      lines.push(`- **Description:** ${c.description}`);
      lines.push(`- **Funding:** ${c.fundingRaised}`);
      lines.push(`- **Business Model:** ${c.businessModel}`);
      lines.push(`- **Recent News:** ${c.recentNews}`);
      lines.push(`- **Impact:** ${c.potentialImpact}`);
      lines.push('');
    }
  }

  // Footnote Analysis
  if (analysis.footnoteAnalysis) {
    lines.push('---');
    lines.push('## Footnote Deep Dive');
    lines.push(analysis.footnoteAnalysis);
    lines.push('');
  }

  // Smart Highlights
  if (analysis.smartHighlights?.length) {
    lines.push('---');
    lines.push('## Smart Highlights');
    for (const h of analysis.smartHighlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  // Cost
  if (analysis.cost) {
    lines.push('---');
    lines.push(`*Analysis cost: $${analysis.cost.total.toFixed(2)} | Tokens: ${analysis.cost.calls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0).toLocaleString()} | Generated by SEC Filing Analyzer*`);
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { analysisId, format } = await request.json();

    let analysis = getAnalysis(analysisId);
    if (!analysis) {
      analysis = await loadAnalysisFromFile(analysisId) || undefined;
    }

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(analysis, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${analysis.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${analysis.filingType}_analysis.json"`,
        },
      });
    }

    // Default: markdown (easily convertible to PDF by the user)
    const markdown = generateMarkdown(analysis);
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${analysis.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${analysis.filingType}_analysis.md"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
