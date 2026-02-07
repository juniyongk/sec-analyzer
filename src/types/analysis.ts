export type AnalysisMode = 'quick' | 'standard' | 'deep';
export type AnalysisStatus = 'processing' | 'complete' | 'error';
export type RedFlagSeverity = 'critical' | 'warning' | 'monitor';
export type ConfidenceLevel = 'High Confidence' | 'Medium Confidence' | 'Low Confidence';
export type SeverityLevel = 'High Severity' | 'Medium Severity' | 'Low Severity';

export interface ThesisPoint {
  title: string;
  confidence?: ConfidenceLevel;
  severity?: SeverityLevel;
  details: string[];
  implication: string;
}

export interface RedFlag {
  title: string;
  severity: RedFlagSeverity;
  description: string;
  details: string[];
  impact: string;
}

export interface QuickStats {
  revenue: string;
  revenueGrowthYoY: string;
  revenueGrowthQoQ: string;
  operatingMargin: string;
  operatingMarginChange: string;
  netDebtToEbitda: string;
  netDebtToEbitdaPrior: string;
  redFlagsCritical: number;
  redFlagsWarning: number;
  redFlagsMonitor: number;
}

export interface BaseCase {
  scenario: string;
  dependency: string;
  mainRisk: string;
}

export interface FinancialAnalysis {
  revenueAnalysis: string;
  marginAnalysis: string;
  qualityOfEarnings: string;
  returnsMetrics: string;
  debtAnalysis: string;
  capexAndFcf: string;
}

export interface PeerComparisonEntry {
  ticker: string;
  name: string;
  revenueGrowth: string;
  grossMargin: string;
  operatingMargin: string;
  netDebtToEbitda: string;
  evToRevenue: string;
}

export interface ToneAnalysis {
  overallSentiment: 'bullish' | 'neutral' | 'bearish';
  sentimentScore: number; // -1 to 1
  bullishWords: { word: string; count: number }[];
  bearishWords: { word: string; count: number }[];
  hedgeWords: { word: string; count: number }[];
  keyPhrases: string[];
  readabilityScore: number;
  toneShift: string;
}

export interface SegmentAnalysis {
  segments: {
    name: string;
    revenue: string;
    operatingIncome: string;
    margin: string;
    growth: string;
    commentary: string;
  }[];
}

export interface CompetitorIntel {
  competitors: {
    name: string;
    description: string;
    fundingRaised: string;
    businessModel: string;
    recentNews: string;
    potentialImpact: string;
  }[];
}

export interface ApiCallCost {
  step: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface CostBreakdown {
  financial: number;
  redFlags: number;
  tone: number;
  peers: number;
  synthesis: number;
  segments?: number;
  competitors?: number;
  footnotes?: number;
}

export interface AnalysisCost {
  mode: AnalysisMode;
  calls: ApiCallCost[];
  total: number;
  breakdown: CostBreakdown;
}

export interface AnalysisResult {
  id: string;
  companyName: string;
  filingType: string;
  fiscalPeriod: string;
  edgarUrl: string;
  mode: AnalysisMode;
  status: AnalysisStatus;
  progress: number;
  currentStep: string;
  createdAt: string;
  completedAt?: string;

  // Results
  quickStats?: QuickStats;
  bullCase?: ThesisPoint[];
  bearCase?: ThesisPoint[];
  baseCase?: BaseCase;
  keyQuestions?: string[];
  redFlags?: RedFlag[];

  // Standard mode additions
  financialAnalysis?: FinancialAnalysis;
  peerComparison?: PeerComparisonEntry[];
  toneAnalysis?: ToneAnalysis;

  // Deep dive additions
  segmentAnalysis?: SegmentAnalysis;
  competitorIntel?: CompetitorIntel;
  footnoteAnalysis?: string;
  smartHighlights?: string[];

  // Cost tracking
  cost?: AnalysisCost;
}

export interface AnalysisProgress {
  status: AnalysisStatus;
  progress: number;
  currentStep: string;
  completedSteps: string[];
  cost: number;
  estimatedTimeRemaining: number;
}

export interface AnalyzeRequest {
  edgarUrl: string;
  mode: AnalysisMode;
  companyName?: string;
  peers?: string[];
}
