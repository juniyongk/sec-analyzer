export interface ParsedFiling {
  companyName: string;
  filingType: string;
  fiscalPeriod: string;
  financials: {
    incomeStatement: string[][] | null;
    balanceSheet: string[][] | null;
    cashFlow: string[][] | null;
  };
  sections: {
    riskFactors: string;
    mda: string;
    footnotes: string;
    segments: string;
  };
  rawTextLength: number;
  cleanedTextLength: number;
}
