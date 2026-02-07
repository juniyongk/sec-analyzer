import {
  AnalysisMode,
  ThesisPoint,
  RedFlag,
  QuickStats,
  BaseCase,
  FinancialAnalysis,
  PeerComparisonEntry,
  ToneAnalysis,
  SegmentAnalysis,
  CompetitorIntel,
  ApiCallCost,
  CostBreakdown,
  AnalysisCost,
} from '@/types/analysis';
import { ParsedFiling } from '@/types/edgar';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function mockCost(step: string, model: string, inputTokens: number, outputTokens: number): ApiCallCost {
  const rates: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 0.30, output: 1.25 },
  };
  const rate = rates[model] || rates['claude-sonnet-4-5-20250929'];
  const cost = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return { step, model, inputTokens, outputTokens, cost };
}

export async function mockQuickScan(filing: ParsedFiling): Promise<{
  quickStats: QuickStats;
  bullCase: ThesisPoint[];
  bearCase: ThesisPoint[];
  baseCase: BaseCase;
  keyQuestions: string[];
  redFlags: RedFlag[];
  cost: AnalysisCost;
}> {
  await delay(2000);

  const companyName = filing.companyName || 'Target Company';

  const quickStats: QuickStats = {
    revenue: '$5.2B',
    revenueGrowthYoY: '+18%',
    revenueGrowthQoQ: '+4%',
    operatingMargin: '22.3%',
    operatingMarginChange: '+340bps YoY',
    netDebtToEbitda: '2.1x',
    netDebtToEbitdaPrior: '2.8x',
    redFlagsCritical: 0,
    redFlagsWarning: 2,
    redFlagsMonitor: 3,
  };

  const bullCase: ThesisPoint[] = [
    {
      title: 'Margin Expansion Accelerating',
      confidence: 'High Confidence',
      details: [
        'Operating margin improved 340bps YoY to 22.3%',
        'Automation initiatives reduced headcount by 12%',
        'Mix shift to higher-margin enterprise products (+15% of revenue)',
        'SG&A leverage: grew only 8% vs 18% revenue growth',
      ],
      implication: 'Expect margins to reach 25%+ in 2025 if trends continue',
    },
    {
      title: 'Market Share Gains in Core Segment',
      confidence: 'Medium Confidence',
      details: [
        'Revenue growth of 18% vs industry ~10%',
        'New product launch captured 8% market share in 6 months',
        'Customer count grew 23%, avg contract value up 12%',
        'NRR at 118%, best in peer group',
      ],
      implication: 'Competitive moat widening with product-led growth',
    },
    {
      title: 'Strong Free Cash Flow Generation',
      confidence: 'High Confidence',
      details: [
        'FCF margin expanded to 15.8% from 11.2%',
        'Capex intensity declining (8% of revenue vs 12% two years ago)',
        'Working capital improvements (DSO down 5 days)',
      ],
      implication: 'Increasing capacity for buybacks, M&A, or debt reduction',
    },
  ];

  const bearCase: ThesisPoint[] = [
    {
      title: 'Customer Concentration Risk Increasing',
      severity: 'High Severity',
      details: [
        'Top 3 customers now 65% of revenue (up from 45% in 2023)',
        'Largest customer (28% revenue) contract up for renewal in Q2 2025',
        'Limited disclosure on contract terms or pricing negotiations',
        'No meaningful diversification progress despite growth',
      ],
      implication: 'Single customer loss could crater revenues by 25-30%',
    },
    {
      title: 'Rising Competitive Threats in Adjacent Markets',
      severity: 'Medium Severity',
      details: [
        'Three well-funded startups raised $500M+ combined in last 12 months',
        'New risk factor disclosure about "emerging competitive dynamics"',
        'Price pressure in SMB segment (ASP down 8% YoY)',
      ],
      implication: 'May need to increase R&D spend, compressing margins',
    },
    {
      title: 'Debt Maturity Wall Approaching',
      severity: 'Medium Severity',
      details: [
        '$1.8B in debt maturing in 2026',
        'Current refinancing environment at higher rates',
        'Interest coverage ratio at 4.2x (comfortable but declining from 5.8x)',
      ],
      implication: 'Refinancing will likely increase interest expense by $30-50M annually',
    },
  ];

  const baseCase: BaseCase = {
    scenario: `Most likely scenario for ${companyName}: continued growth at 12-15% with gradual margin expansion to 24% by 2026. The company's strong market position and operational efficiency improvements provide a solid foundation, though growth will moderate as the market matures.`,
    dependency: 'Customer retention rate stays above 90% and largest customer renews at similar terms',
    mainRisk: 'Pricing pressure from new entrants if largest customer renegotiates or competitive dynamics accelerate',
  };

  const keyQuestions: string[] = [
    "What's the status of renewal discussions with your largest customer?",
    'How sustainable is the current operating margin improvement given automation investment is now largely complete?',
    "What's the plan to diversify customer concentration below 50% for the top 3?",
    'How are you responding to the well-funded startup competitors entering adjacent markets?',
    'Can you provide more color on the $1.8B debt maturity in 2026 and your refinancing strategy?',
  ];

  const redFlags: RedFlag[] = [
    {
      title: 'Customer Concentration Increasing',
      severity: 'warning',
      description: 'Top 3 customers represent 65% of revenue, up from 45%',
      details: [
        'Largest customer is 28% of total revenue',
        'Contract renewal due Q2 2025',
        'No diversification progress disclosed',
      ],
      impact: 'Loss of largest customer would reduce revenue by ~$1.5B',
    },
    {
      title: 'New Competitive Risk Factor Added',
      severity: 'warning',
      description: 'Filing includes new risk factor about "emerging competitive dynamics"',
      details: [
        'This language was not present in prior year filing',
        'References "well-capitalized new entrants"',
        'Notes potential pricing pressure',
      ],
      impact: 'May signal management awareness of growing competitive threats',
    },
    {
      title: 'Accounts Receivable Growing Faster Than Revenue',
      severity: 'monitor',
      description: 'AR grew 24% vs 18% revenue growth',
      details: [
        'DSO increased from 42 to 47 days',
        'Could indicate collection issues or channel stuffing',
        'Allowance for doubtful accounts unchanged despite AR growth',
      ],
      impact: 'May indicate loosening credit terms to sustain growth',
    },
    {
      title: 'Stock-Based Compensation Accelerating',
      severity: 'monitor',
      description: 'SBC increased 35% to $320M (6.2% of revenue)',
      details: [
        'New executive retention grants totaling $45M',
        'Dilution rate at 2.1% annually',
        'Above peer median of 4.5% of revenue',
      ],
      impact: 'Real cost to shareholders via dilution, masks true profitability',
    },
    {
      title: 'Related Party Transaction Disclosure',
      severity: 'monitor',
      description: 'CEO\'s spouse serves on board of key supplier',
      details: [
        '$12M in purchases from the related supplier',
        'Transactions disclosed as "at market rates"',
        'No independent price verification mentioned',
      ],
      impact: 'Governance risk, though amounts are immaterial at <0.3% of revenue',
    },
  ];

  const call = mockCost('quick_scan', 'claude-sonnet-4-5-20250929', 45000, 3500);

  return {
    quickStats,
    bullCase,
    bearCase,
    baseCase,
    keyQuestions,
    redFlags,
    cost: {
      mode: 'quick',
      calls: [call],
      total: call.cost,
      breakdown: {
        financial: call.cost * 0.3,
        redFlags: call.cost * 0.25,
        tone: 0,
        peers: 0,
        synthesis: call.cost * 0.45,
      },
    },
  };
}

export async function mockStandardAnalysis(filing: ParsedFiling): Promise<{
  financialAnalysis: FinancialAnalysis;
  peerComparison: PeerComparisonEntry[];
  toneAnalysis: ToneAnalysis;
  additionalRedFlags: RedFlag[];
  cost: AnalysisCost;
}> {
  await delay(3000);

  const financialAnalysis: FinancialAnalysis = {
    revenueAnalysis: `Revenue reached $5.2B in FY2024, representing 18% YoY growth and 4% QoQ sequential growth. Revenue growth has been consistent across the last 5 quarters, accelerating from 12% in Q1 to 18% for the full year. The enterprise segment drove growth (up 25%), while SMB grew more modestly at 8%. Geographic mix: North America 68% (up from 65%), International 32%. Recurring revenue now represents 78% of total, up from 72%.`,
    marginAnalysis: `Gross margin expanded 180bps to 65.2%, driven by higher-margin enterprise mix and cloud infrastructure cost optimizations. Operating margin improved 340bps to 22.3%, the strongest level since 2019. Key drivers: (1) headcount reduction from automation (-12% YTD), (2) G&A leverage (grew 5% vs 18% revenue), (3) lower marketing spend as % of revenue (-200bps). Net margin at 16.8% (up from 14.1%), benefiting from operating leverage and lower effective tax rate (21% vs 23%).`,
    qualityOfEarnings: `Quality of earnings assessment: MODERATE-HIGH. Non-recurring items totaled $85M (1.6% of revenue): restructuring charges ($45M), asset impairment ($25M), and one-time legal settlement ($15M). Working capital trends are mixed: DSO deteriorated to 47 days (from 42), but inventory turns improved to 8.2x (from 7.1x). Accruals ratio is 0.08, within normal range. Cash flow from operations of $1.12B represents 21.5% of revenue and 96% of net income - strong cash conversion. One concern: capitalized software development costs increased 40% to $180M, potentially inflating current earnings.`,
    returnsMetrics: `ROIC improved to 18.2% from 15.8%, driven by both margin expansion and improved asset turnover. ROE at 24.5% (from 21.2%), partially boosted by higher leverage. ROA at 10.8% (from 9.2%). All return metrics are in the top quartile vs. peer group. Incremental ROIC on new investments estimated at 22%, suggesting value creation continues.`,
    debtAnalysis: `Total debt: $3.8B. Cash and equivalents: $1.2B. Net debt: $2.6B. Net Debt/EBITDA improved to 2.1x from 2.8x due to EBITDA growth. Debt maturity profile: $500M due 2025 (manageable), $1.8B due 2026 (key risk), $1.5B due 2028+. Weighted average interest rate: 4.8%. Interest coverage: 4.2x (down from 5.8x due to rate increases on floating-rate debt). Credit facility: $1.5B revolving facility, $1.2B available. Key covenant: Net Debt/EBITDA must stay below 3.5x (current headroom: 1.4x).`,
    capexAndFcf: `Capital expenditure: $420M (8.1% of revenue), down from $480M (10.5% of revenue). Capex intensity is declining as major facility investments are complete. Maintenance capex estimated at $200M, growth capex at $220M. Free Cash Flow: $820M (15.8% FCF margin), up from $510M (11.2%). FCF uses in FY2024: debt repayment $300M, share repurchases $250M, dividends $180M. Remaining FCF of $90M added to cash balance.`,
  };

  const peerComparison: PeerComparisonEntry[] = [
    {
      ticker: 'COMP-A',
      name: 'Competitor Alpha Inc.',
      revenueGrowth: '+12% YoY',
      grossMargin: '62.1%',
      operatingMargin: '19.8%',
      netDebtToEbitda: '1.8x',
      evToRevenue: '4.2x',
    },
    {
      ticker: 'COMP-B',
      name: 'Competitor Beta Corp.',
      revenueGrowth: '+22% YoY',
      grossMargin: '58.5%',
      operatingMargin: '15.2%',
      netDebtToEbitda: '3.1x',
      evToRevenue: '6.8x',
    },
    {
      ticker: 'COMP-C',
      name: 'Competitor Gamma Ltd.',
      revenueGrowth: '+8% YoY',
      grossMargin: '71.3%',
      operatingMargin: '28.5%',
      netDebtToEbitda: '0.5x',
      evToRevenue: '8.1x',
    },
    {
      ticker: 'COMP-D',
      name: 'Competitor Delta Holdings',
      revenueGrowth: '+15% YoY',
      grossMargin: '60.0%',
      operatingMargin: '20.1%',
      netDebtToEbitda: '2.5x',
      evToRevenue: '5.0x',
    },
  ];

  const toneAnalysis: ToneAnalysis = {
    overallSentiment: 'bullish',
    sentimentScore: 0.35,
    bullishWords: [
      { word: 'growth', count: 87 },
      { word: 'opportunity', count: 42 },
      { word: 'confident', count: 18 },
      { word: 'strong', count: 31 },
      { word: 'momentum', count: 15 },
    ],
    bearishWords: [
      { word: 'risk', count: 54 },
      { word: 'uncertain', count: 12 },
      { word: 'challenging', count: 8 },
      { word: 'headwinds', count: 6 },
      { word: 'pressure', count: 14 },
    ],
    hedgeWords: [
      { word: 'may', count: 65 },
      { word: 'could', count: 38 },
      { word: 'potential', count: 29 },
      { word: 'might', count: 11 },
    ],
    keyPhrases: [
      'accelerating growth trajectory',
      'disciplined capital allocation',
      'operational excellence initiatives',
      'market-leading position',
      'emerging competitive dynamics',
    ],
    readabilityScore: 14.2,
    toneShift: 'Slightly more positive than prior year. Increased use of "confident" (+50%) and "momentum" (+25%). However, notable increase in hedge words "may" (+20%) and new competitive risk language. Readability index increased from 13.1, suggesting slightly more complex language which can indicate obfuscation.',
  };

  const additionalRedFlags: RedFlag[] = [
    {
      title: 'Capitalized Software Costs Rising Sharply',
      severity: 'warning',
      description: 'Capitalized software development costs increased 40% to $180M',
      details: [
        'As percentage of R&D: 28% (up from 22%)',
        'Useful life assumptions unchanged at 3-5 years',
        'Could be inflating current period earnings',
      ],
      impact: 'If amortization catches up, could reduce operating income by $50-60M',
    },
    {
      title: 'Goodwill Impairment Testing Assumptions',
      severity: 'monitor',
      description: 'Discount rate used in goodwill testing decreased from 10% to 9%',
      details: [
        'Total goodwill: $2.1B (22% of total assets)',
        'Lower discount rate makes impairment less likely to trigger',
        'No impairment recorded despite one reporting unit close to fair value',
      ],
      impact: 'Potential impairment if macro conditions worsen or discount rate normalizes',
    },
  ];

  const calls: ApiCallCost[] = [
    mockCost('financial_analysis', 'claude-sonnet-4-5-20250929', 48000, 4000),
    mockCost('red_flags', 'claude-sonnet-4-5-20250929', 48000, 2500),
    mockCost('tone_analysis', 'claude-haiku-4-5-20251001', 48000, 2000),
    mockCost('peer_comparison', 'claude-haiku-4-5-20251001', 5000, 2000),
  ];

  const total = calls.reduce((sum, c) => sum + c.cost, 0);

  return {
    financialAnalysis,
    peerComparison,
    toneAnalysis,
    additionalRedFlags,
    cost: {
      mode: 'standard',
      calls,
      total,
      breakdown: {
        financial: calls[0].cost,
        redFlags: calls[1].cost,
        tone: calls[2].cost,
        peers: calls[3].cost,
        synthesis: 0,
      },
    },
  };
}

export async function mockDeepDive(filing: ParsedFiling): Promise<{
  segmentAnalysis: SegmentAnalysis;
  competitorIntel: CompetitorIntel;
  footnoteAnalysis: string;
  smartHighlights: string[];
  cost: AnalysisCost;
}> {
  await delay(3000);

  const segmentAnalysis: SegmentAnalysis = {
    segments: [
      {
        name: 'Enterprise Solutions',
        revenue: '$2.8B (54% of total)',
        operatingIncome: '$840M',
        margin: '30.0%',
        growth: '+25% YoY',
        commentary: 'Fastest growing segment. Driven by large contract wins and expansion of existing accounts. Management highlighted "significant pipeline" for 2025.',
      },
      {
        name: 'SMB Products',
        revenue: '$1.6B (31% of total)',
        operatingIncome: '$256M',
        margin: '16.0%',
        growth: '+8% YoY',
        commentary: 'Slower growth due to price competition. Management notes "rationalization of lower-margin products." Churn rate increased to 12% from 10%.',
      },
      {
        name: 'Professional Services',
        revenue: '$0.8B (15% of total)',
        operatingIncome: '$72M',
        margin: '9.0%',
        growth: '+12% YoY',
        commentary: 'Primarily implementation and consulting. Margins expanding as more work shifts to partners. Management targeting 12% margin by 2026.',
      },
    ],
  };

  const competitorIntel: CompetitorIntel = {
    competitors: [
      {
        name: 'DisruptTech AI',
        description: 'AI-native platform competing in the enterprise analytics space',
        fundingRaised: '$280M Series D (Dec 2024) at $3.2B valuation',
        businessModel: 'PLG motion with AI-first approach, undercutting incumbents by 40% on price',
        recentNews: 'Hired ex-CTO from target company. Announced partnership with major cloud provider.',
        potentialImpact: 'HIGH - Directly targets enterprise segment with AI advantage. Could accelerate price pressure in 2025-2026.',
      },
      {
        name: 'CloudFirst Platform',
        description: 'Cloud-native SMB solution with aggressive pricing',
        fundingRaised: '$150M Series C (Aug 2024)',
        businessModel: 'Freemium to paid conversion, targeting SMB market exclusively',
        recentNews: 'Reached 50,000 paying customers (up from 20,000 in 12 months). S-1 filing rumored for Q2 2025.',
        potentialImpact: 'MEDIUM - Primarily threatens SMB segment. Already contributing to churn increase.',
      },
      {
        name: 'LegacyMigrate Corp',
        description: 'Specializes in migrating customers off legacy platforms',
        fundingRaised: '$90M Series B (Mar 2024)',
        businessModel: 'Migration-as-a-service targeting competitors\' install base',
        recentNews: 'Won contract to migrate Fortune 500 customer away from target company.',
        potentialImpact: 'LOW-MEDIUM - Niche threat but signals vulnerability in migration/lock-in.',
      },
    ],
  };

  const footnoteAnalysis = `DEBT FOOTNOTE ANALYSIS:
- Revolving Credit Facility: $1.5B commitment, $300M drawn, matures Dec 2027
- Term Loan A: $1.2B outstanding, SOFR + 175bps, matures Jun 2026 (KEY RISK)
- Senior Notes: $600M at 4.25% fixed, matures Oct 2028
- Senior Notes: $2.0B at 5.50% fixed, matures Mar 2026 (KEY RISK)
- TOTAL DEBT MATURITY 2026: $3.2B - requires refinancing in challenging rate environment
- Financial Covenants: Net Leverage ≤ 3.5x (current: 2.1x), Interest Coverage ≥ 3.0x (current: 4.2x)
- Letters of Credit: $45M outstanding

REVENUE RECOGNITION:
- ASC 606 applied; no material changes from prior year
- Performance obligations typically satisfied over time (subscription model)
- Deferred revenue increased 15% to $890M (healthy backlog)
- Contract assets: $120M (unbilled receivables, up 30% - watch this)

LEASE COMMITMENTS:
- Operating leases: $450M total future payments ($95M/year)
- Finance leases: $80M total
- Weighted avg remaining lease term: 5.2 years
- Headquarters lease expires 2028 (potential relocation/renegotiation)

CONTINGENT LIABILITIES:
- Patent infringement lawsuit: $200M claimed, management considers "remote" probability
- Antitrust investigation: EU inquiry ongoing, no provision recorded
- Environmental remediation: $15M accrued
- Tax audits pending in 3 jurisdictions

PENSION/OPEB:
- Defined benefit plan underfunded by $85M (discount rate: 5.1%)
- OPEB obligation: $45M
- Expected contributions FY2025: $25M`;

  const smartHighlights: string[] = [
    '🔴 NEW: Risk factor added about "AI-native competitors" - not present in prior filing',
    '🟡 CHANGE: Revenue recognition - contract asset balance grew 30% (vs 18% revenue growth), suggesting more aggressive recognition timing',
    '🟡 CHANGE: Goodwill impairment discount rate lowered from 10% to 9% - makes impairment less likely to trigger',
    '🟢 NEW: Segment disclosure now breaks out Professional Services separately (previously combined with Enterprise)',
    '🟡 REMOVED: Prior year risk factor about "supply chain disruptions" removed - suggests resolution',
    '🔴 CHANGE: Top customer concentration increased from 20% to 28% of revenue - largest single-period increase',
    '🟢 NEW: Subsequent event - announced $500M share buyback authorization post-quarter end',
    '🟡 CHANGE: Effective tax rate decreased from 23% to 21% due to R&D credit expansion - may not be sustainable',
    '🟡 CHANGE: Capitalized software development costs up 40% - accelerating trend from prior quarter',
    '🟢 CHANGE: Debt reduced by $300M during the year - deleveraging on track',
  ];

  const calls: ApiCallCost[] = [
    mockCost('segment_analysis', 'claude-sonnet-4-5-20250929', 48000, 3000),
    mockCost('competitor_intel', 'claude-sonnet-4-5-20250929', 48000, 3500),
    mockCost('footnote_analysis', 'claude-sonnet-4-5-20250929', 48000, 4000),
    mockCost('smart_highlights', 'claude-haiku-4-5-20251001', 48000, 2000),
  ];

  const total = calls.reduce((sum, c) => sum + c.cost, 0);

  return {
    segmentAnalysis,
    competitorIntel,
    footnoteAnalysis,
    smartHighlights,
    cost: {
      mode: 'deep',
      calls,
      total,
      breakdown: {
        financial: 0,
        redFlags: 0,
        tone: 0,
        peers: 0,
        synthesis: 0,
        segments: calls[0].cost,
        competitors: calls[1].cost,
        footnotes: calls[2].cost,
      },
    },
  };
}
