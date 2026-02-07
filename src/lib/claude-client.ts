import Anthropic from '@anthropic-ai/sdk';
import { ParsedFiling } from '@/types/edgar';
import { buildDocumentContext } from './edgar-parser';
import {
  ThesisPoint,
  RedFlag,
  QuickStats,
  BaseCase,
  FinancialAnalysis,
  ToneAnalysis,
  PeerComparisonEntry,
  SegmentAnalysis,
  CompetitorIntel,
  ApiCallCost,
  AnalysisCost,
} from '@/types/analysis';

const CLAUDE_SONNET = 'claude-sonnet-4-5-20250929';
const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

function calculateCost(usage: { input_tokens: number; output_tokens: number }, model: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    [CLAUDE_SONNET]: { input: 3, output: 15 },
    [CLAUDE_HAIKU]: { input: 0.30, output: 1.25 },
  };
  const rate = rates[model] || rates[CLAUDE_SONNET];
  return (usage.input_tokens / 1_000_000) * rate.input + (usage.output_tokens / 1_000_000) * rate.output;
}

function buildSystemPrompt(filing: ParsedFiling): string {
  const docContext = buildDocumentContext(filing);
  return `You are an expert financial analyst with deep expertise in equity research, credit analysis, and financial statement forensics. You have a sophisticated understanding of accounting, valuation, and competitive dynamics.

Here is the complete SEC filing to analyze:

${docContext}

This document has been cleaned and parsed. Analyze it to provide investment insights. Always respond with valid JSON matching the requested schema.`;
}

export class ClaudeClient {
  private client: Anthropic;
  private systemPrompt: string;
  private calls: ApiCallCost[] = [];

  constructor(filing: ParsedFiling) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.systemPrompt = buildSystemPrompt(filing);
  }

  private async call(prompt: string, model: string, step: string, retries = 2): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.messages.create({
          model,
          max_tokens: 8192,
          system: this.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        });

        const usage = response.usage;
        const cost = calculateCost(
          { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
          model
        );
        this.calls.push({
          step,
          model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cost,
        });

        const block = response.content[0];
        return block.type === 'text' ? block.text : '';
      } catch (err: unknown) {
        const isRetryable = err instanceof Error && (
          err.message.includes('overloaded') ||
          err.message.includes('rate_limit') ||
          err.message.includes('529') ||
          err.message.includes('500') ||
          err.message.includes('timeout')
        );

        if (attempt < retries && isRetryable) {
          console.warn(`[${step}] Attempt ${attempt + 1} failed, retrying in ${(attempt + 1) * 3}s...`, err instanceof Error ? err.message : err);
          await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
          continue;
        }
        throw new Error(`Claude API error in ${step}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    throw new Error(`Claude API failed after ${retries + 1} attempts for ${step}`);
  }

  private parseJSON<T>(text: string): T {
    // Try to extract JSON from markdown code blocks or raw JSON
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return JSON.parse(text);
  }

  async quickScan(): Promise<{
    quickStats: QuickStats;
    bullCase: ThesisPoint[];
    bearCase: ThesisPoint[];
    baseCase: BaseCase;
    keyQuestions: string[];
    redFlags: RedFlag[];
    cost: AnalysisCost;
  }> {
    const prompt = `Analyze this filing and provide a comprehensive investment analysis. Return a JSON object with this exact structure:

{
  "quickStats": {
    "revenue": "string (e.g., '$5.2B')",
    "revenueGrowthYoY": "string (e.g., '+18%')",
    "revenueGrowthQoQ": "string (e.g., '+4%')",
    "operatingMargin": "string (e.g., '22.3%')",
    "operatingMarginChange": "string (e.g., '+340bps YoY')",
    "netDebtToEbitda": "string (e.g., '2.1x')",
    "netDebtToEbitdaPrior": "string (e.g., '2.8x')",
    "redFlagsCritical": 0,
    "redFlagsWarning": 0,
    "redFlagsMonitor": 0
  },
  "bullCase": [
    {
      "title": "string",
      "confidence": "High Confidence|Medium Confidence|Low Confidence",
      "details": ["string"],
      "implication": "string"
    }
  ],
  "bearCase": [
    {
      "title": "string",
      "severity": "High Severity|Medium Severity|Low Severity",
      "details": ["string"],
      "implication": "string"
    }
  ],
  "baseCase": {
    "scenario": "string (1-2 paragraphs)",
    "dependency": "string",
    "mainRisk": "string"
  },
  "keyQuestions": ["string (5 questions for management)"],
  "redFlags": [
    {
      "title": "string",
      "severity": "critical|warning|monitor",
      "description": "string",
      "details": ["string"],
      "impact": "string"
    }
  ]
}

Provide 3-5 bull points, 3-5 bear points, and 3-7 red flags. Use specific numbers from the filing.`;

    const text = await this.call(prompt, CLAUDE_SONNET, 'quick_scan');
    const result = this.parseJSON<{
      quickStats: QuickStats;
      bullCase: ThesisPoint[];
      bearCase: ThesisPoint[];
      baseCase: BaseCase;
      keyQuestions: string[];
      redFlags: RedFlag[];
    }>(text);

    const total = this.calls.reduce((sum, c) => sum + c.cost, 0);

    return {
      ...result,
      cost: {
        mode: 'quick',
        calls: [...this.calls],
        total,
        breakdown: {
          financial: total * 0.3,
          redFlags: total * 0.25,
          tone: 0,
          peers: 0,
          synthesis: total * 0.45,
        },
      },
    };
  }

  async financialAnalysis(): Promise<{ financialAnalysis: FinancialAnalysis; cost: ApiCallCost }> {
    const prompt = `Provide detailed financial analysis as JSON:

{
  "revenueAnalysis": "string (revenue trends, 5 year if available, YoY/QoQ growth, drivers)",
  "marginAnalysis": "string (gross, operating, net margins with specific drivers of change)",
  "qualityOfEarnings": "string (non-recurring items, working capital trends DSO/inventory/DPO, accruals vs cash flow, revenue quality)",
  "returnsMetrics": "string (ROIC, ROE, ROA over time with specific numbers)",
  "debtAnalysis": "string (total debt, net debt, key ratios, maturity profile, covenants)",
  "capexAndFcf": "string (capex intensity, FCF generation and uses)"
}

Provide specific numbers and percentages from the filing. Highlight concerning trends.`;

    const text = await this.call(prompt, CLAUDE_SONNET, 'financial_analysis');
    return {
      financialAnalysis: this.parseJSON<FinancialAnalysis>(text),
      cost: this.calls[this.calls.length - 1],
    };
  }

  async toneAnalysis(): Promise<{ toneAnalysis: ToneAnalysis; cost: ApiCallCost }> {
    const prompt = `Analyze management tone in the MD&A and risk factors sections. Return JSON:

{
  "overallSentiment": "bullish|neutral|bearish",
  "sentimentScore": 0.0,
  "bullishWords": [{"word": "string", "count": 0}],
  "bearishWords": [{"word": "string", "count": 0}],
  "hedgeWords": [{"word": "string", "count": 0}],
  "keyPhrases": ["string (notable 2-3 word phrases)"],
  "readabilityScore": 0.0,
  "toneShift": "string (comparison to typical filing tone, any notable shifts)"
}

Top 5 words for each category. Count approximate occurrences. Readability: Fog Index estimate.`;

    const text = await this.call(prompt, CLAUDE_HAIKU, 'tone_analysis');
    return {
      toneAnalysis: this.parseJSON<ToneAnalysis>(text),
      cost: this.calls[this.calls.length - 1],
    };
  }

  async peerComparison(peers?: string[]): Promise<{ peerComparison: PeerComparisonEntry[]; cost: ApiCallCost }> {
    const peerContext = peers?.length
      ? `Compare against these specific peers: ${peers.join(', ')}.`
      : 'Identify 3-5 likely public company peers based on the filing.';

    const prompt = `${peerContext} Based on your knowledge, provide a peer comparison as JSON:

{
  "peers": [
    {
      "ticker": "string",
      "name": "string",
      "revenueGrowth": "string (e.g., '+12% YoY')",
      "grossMargin": "string",
      "operatingMargin": "string",
      "netDebtToEbitda": "string",
      "evToRevenue": "string"
    }
  ]
}

Provide 3-5 peers with approximate but realistic metrics.`;

    const text = await this.call(prompt, CLAUDE_HAIKU, 'peer_comparison');
    const result = this.parseJSON<{ peers: PeerComparisonEntry[] }>(text);
    return {
      peerComparison: result.peers,
      cost: this.calls[this.calls.length - 1],
    };
  }

  async segmentAnalysis(): Promise<{ segmentAnalysis: SegmentAnalysis; cost: ApiCallCost }> {
    const prompt = `Analyze each reportable business segment from the filing. Return JSON:

{
  "segments": [
    {
      "name": "string",
      "revenue": "string (with % of total)",
      "operatingIncome": "string",
      "margin": "string",
      "growth": "string",
      "commentary": "string (management outlook and key drivers)"
    }
  ]
}

If segments are not separately disclosed, note this and analyze based on available information.`;

    const text = await this.call(prompt, CLAUDE_SONNET, 'segment_analysis');
    return {
      segmentAnalysis: this.parseJSON<SegmentAnalysis>(text),
      cost: this.calls[this.calls.length - 1],
    };
  }

  async competitorResearch(): Promise<{ competitorIntel: CompetitorIntel; cost: ApiCallCost }> {
    const prompt = `Identify private and emerging competitors mentioned in the risk factors and MD&A. Also infer likely competitive threats based on the company's industry. Return JSON:

{
  "competitors": [
    {
      "name": "string",
      "description": "string",
      "fundingRaised": "string (if known or estimated)",
      "businessModel": "string",
      "recentNews": "string",
      "potentialImpact": "string (HIGH/MEDIUM/LOW with explanation)"
    }
  ]
}

Include 2-4 competitors. Be specific about competitive dynamics.`;

    const text = await this.call(prompt, CLAUDE_SONNET, 'competitor_intel');
    return {
      competitorIntel: this.parseJSON<CompetitorIntel>(text),
      cost: this.calls[this.calls.length - 1],
    };
  }

  async footnoteDeepDive(): Promise<{ footnoteAnalysis: string; cost: ApiCallCost }> {
    const prompt = `Provide a deep dive analysis of the footnotes covering:
1. DEBT: All instruments, terms, maturity schedule, covenants and headroom
2. REVENUE RECOGNITION: Policies, changes, performance obligations
3. LEASES: Operating and finance lease commitments
4. CONTINGENCIES: Legal proceedings, contingent liabilities
5. PENSION/OPEB: Funded status, assumptions
6. SBC: Stock-based compensation details, dilution
7. RELATED PARTIES: Any related party transactions
8. SUBSEQUENT EVENTS: Post-period events

Return as a single structured text string (not JSON). Use headers and bullet points.`;

    const text = await this.call(prompt, CLAUDE_SONNET, 'footnote_analysis');
    return {
      footnoteAnalysis: text,
      cost: this.calls[this.calls.length - 1],
    };
  }

  async smartHighlights(): Promise<{ smartHighlights: string[]; cost: ApiCallCost }> {
    const prompt = `Identify the most important changes, new disclosures, and significant items in this filing. Return JSON:

{
  "highlights": [
    "string (prefix with emoji: 🔴 for critical, 🟡 for notable, 🟢 for positive, followed by NEW/CHANGE/REMOVED and description)"
  ]
}

Focus on: items that changed >20%, new or removed risk factors, accounting policy changes, new legal proceedings, debt changes, subsequent events. Provide 8-12 highlights.`;

    const text = await this.call(prompt, CLAUDE_HAIKU, 'smart_highlights');
    const result = this.parseJSON<{ highlights: string[] }>(text);
    return {
      smartHighlights: result.highlights,
      cost: this.calls[this.calls.length - 1],
    };
  }

  getTotalCost(): number {
    return this.calls.reduce((sum, c) => sum + c.cost, 0);
  }

  getCalls(): ApiCallCost[] {
    return [...this.calls];
  }
}
