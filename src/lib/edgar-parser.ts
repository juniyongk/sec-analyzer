import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { ParsedFiling } from '@/types/edgar';

const SEC_USER_AGENT = process.env.SEC_EDGAR_USER_AGENT || 'SECAnalyzer contact@example.com';

export async function fetchEdgarHtml(url: string): Promise<{ html: string; resolvedUrl: string }> {
  // Handle various EDGAR URL formats
  const fetchUrl = normalizeEdgarUrl(url);

  const response = await fetch(fetchUrl, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch EDGAR filing: ${response.status} ${response.statusText}`);
  }

  return { html: await response.text(), resolvedUrl: fetchUrl };
}

function normalizeEdgarUrl(url: string): string {
  // Handle iXBRL viewer URLs: /ix?doc=/Archives/edgar/data/...
  if (url.includes('/ix?doc=') || url.includes('/ix?')) {
    try {
      const parsedUrl = new URL(url);
      const docPath = parsedUrl.searchParams.get('doc');
      if (docPath) {
        return docPath.startsWith('http') ? docPath : `https://www.sec.gov${docPath}`;
      }
    } catch { /* fall through */ }
  }

  // Handle old viewer URLs: /cgi-bin/viewer?action=view&...
  if (url.includes('cgi-bin/viewer')) {
    try {
      const params = new URL(url).searchParams;
      const docUrl = params.get('url');
      if (docUrl) {
        return docUrl.startsWith('http') ? docUrl : `https://www.sec.gov${docUrl}`;
      }
    } catch { /* fall through */ }
  }

  // If it's an EDGAR Archives URL, use as-is
  if (url.includes('/Archives/edgar/')) {
    return url;
  }

  return url;
}

// Extract metadata from the URL filename (e.g., pcyo-20251130x10q.htm)
export function extractMetadataFromUrl(url: string): { ticker?: string; period?: string; filingType?: string } {
  const result: { ticker?: string; period?: string; filingType?: string } = {};

  // Match patterns like: pcyo-20251130x10q.htm or aapl-20230930.htm
  const filenameMatch = url.match(/\/([a-zA-Z]+)-(\d{8})(?:x?(10[kq]|8k|s1))?\.htm/i);
  if (filenameMatch) {
    result.ticker = filenameMatch[1].toUpperCase();
    const dateStr = filenameMatch[2];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month, 10) - 1] || month;
    result.period = `${monthName} ${parseInt(day, 10)}, ${year}`;

    if (filenameMatch[3]) {
      const ft = filenameMatch[3].toUpperCase();
      result.filingType = ft === '10K' ? '10-K' : ft === '10Q' ? '10-Q' : ft === '8K' ? '8-K' : ft;
    }
  }

  return result;
}

export function parseEdgarHtml(html: string, originalUrl?: string): ParsedFiling {
  const $ = cheerio.load(html);

  // Extract URL-based metadata as fallback
  const urlMeta = originalUrl ? extractMetadataFromUrl(originalUrl) : {};

  // Extract company name from common locations
  const companyName = extractCompanyName($, html) || urlMeta.ticker || 'Unknown Company';
  const filingType = extractFilingType($, html) || urlMeta.filingType || '10-K';
  const fiscalPeriod = extractFiscalPeriod($, html) || urlMeta.period || 'Unknown Period';

  // Extract financial statement tables
  const tables = extractFinancialTables($);

  // Extract text sections - also handle 10-Q Item numbers (Item 2 = MD&A for 10-Q)
  const is10Q = filingType === '10-Q';

  const riskFactors = extractSection($, html, [
    'Item 1A', 'ITEM 1A', 'Risk Factors', 'RISK FACTORS'
  ], ['Item 1B', 'ITEM 1B', 'Item 2', 'ITEM 2']);

  const mda = extractSection($, html,
    is10Q
      ? ['Item 2', 'ITEM 2', "Management's Discussion", "MANAGEMENT'S DISCUSSION"]
      : ['Item 7', 'ITEM 7', "Management's Discussion", "MANAGEMENT'S DISCUSSION"],
    is10Q
      ? ['Item 3', 'ITEM 3', 'Item 4', 'ITEM 4']
      : ['Item 7A', 'ITEM 7A', 'Item 8', 'ITEM 8']
  );

  const footnotes = extractSection($, html, [
    'Notes to Consolidated Financial', 'NOTES TO CONSOLIDATED FINANCIAL',
    'Notes to Financial Statements', 'NOTES TO FINANCIAL STATEMENTS',
    'Notes to Condensed', 'NOTES TO CONDENSED',
    'Notes to Unaudited', 'NOTES TO UNAUDITED'
  ], ['Item 9', 'ITEM 9', 'Report of Independent', 'Item 2', 'ITEM 2']);

  const segments = extractSection($, html, [
    'Segment Information', 'SEGMENT INFORMATION',
    'Business Segments', 'BUSINESS SEGMENTS',
    'Reportable Segments', 'REPORTABLE SEGMENTS'
  ], ['Note ', 'Item ']);

  const allCleanedText = [riskFactors, mda, footnotes, segments]
    .filter(Boolean)
    .join(' ');

  return {
    companyName,
    filingType,
    fiscalPeriod,
    financials: {
      incomeStatement: tables.incomeStatement,
      balanceSheet: tables.balanceSheet,
      cashFlow: tables.cashFlow,
    },
    sections: {
      riskFactors: cleanText(riskFactors),
      mda: cleanText(mda),
      footnotes: cleanText(footnotes),
      segments: cleanText(segments),
    },
    rawTextLength: html.length,
    cleanedTextLength: allCleanedText.length,
  };
}

function extractCompanyName($: cheerio.CheerioAPI, html: string): string {
  // Try iXBRL tags first (modern EDGAR filings)
  const ixbrlName = $('ix\\:nonnumeric[name*="EntityRegistrantName"], [name*="EntityRegistrantName"]').first().text().trim();
  if (ixbrlName && ixbrlName.length < 200) return ixbrlName;

  // Try dei:EntityRegistrantName (another iXBRL pattern)
  const deiName = $('ix\\:nonnumeric[name*="dei:EntityRegistrantName"]').first().text().trim();
  if (deiName && deiName.length < 200) return deiName;

  // Try common HTML selectors
  const selectors = [
    'span.companyName',
    '#companyName',
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().trim();
      if (text && text.length < 200) {
        return text.replace(/\s*-\s*SEC Filing.*$/i, '').replace(/\s*\|\s*SEC.*$/i, '').trim();
      }
    }
  }

  // Try the <title> tag but clean it up
  const titleText = $('title').first().text().trim();
  if (titleText && titleText.length < 200) {
    const cleaned = titleText
      .replace(/\s*-\s*SEC Filing.*$/i, '')
      .replace(/\s*\|\s*SEC.*$/i, '')
      .replace(/10-[KQ].*$/i, '')
      .replace(/XBRL.*$/i, '')
      .trim();
    if (cleaned.length > 2 && cleaned.length < 150) return cleaned;
  }

  // Search for company name patterns in the first part of the document
  const bodyText = $('body').text().substring(0, 10000);

  // Pattern: "COMPANY NAME, INC." or similar near top of filing
  const namePatterns = [
    /(?:FORM\s+10-[KQ].*?(?:for|of)\s+)([A-Z][A-Za-z\s&,.]+?(?:Inc|Corp|Ltd|LLC|Co|Company|Holdings|Group|Technologies|Enterprises)\.?)/i,
    /(?:Commission [Ff]ile|Registrant)[:\s]+([A-Z][A-Za-z\s&,.]+?(?:Inc|Corp|Ltd|LLC|Co|Company|Holdings|Group|Technologies|Enterprises)\.?)/i,
    /^\s*([A-Z][A-Z\s&,.]+?(?:INC|CORP|LTD|LLC|CO|COMPANY|HOLDINGS|GROUP|TECHNOLOGIES|ENTERPRISES)\.?)\s*$/m,
  ];

  for (const pattern of namePatterns) {
    const match = bodyText.match(pattern);
    if (match) return match[1].trim();
  }

  return '';
}

function extractFilingType($: cheerio.CheerioAPI, html: string): string {
  // Check iXBRL tags
  const ixbrlType = $('ix\\:nonnumeric[name*="DocumentType"], [name*="DocumentType"]').first().text().trim();
  if (ixbrlType) {
    if (/10-Q/i.test(ixbrlType)) return '10-Q';
    if (/10-K/i.test(ixbrlType)) return '10-K';
    if (/8-K/i.test(ixbrlType)) return '8-K';
  }

  const text = html.substring(0, 15000);
  // Check for FORM 10-Q before 10-K since "10-K" appears in some 10-Q cross-references
  if (/FORM\s+10-Q|quarterly\s+report/i.test(text)) return '10-Q';
  if (/FORM\s+10-K|annual\s+report/i.test(text)) return '10-K';
  if (/10-Q/i.test(text)) return '10-Q';
  if (/10-K/i.test(text)) return '10-K';
  if (/8-K/i.test(text)) return '8-K';
  if (/S-1/i.test(text)) return 'S-1';
  return '';
}

function extractFiscalPeriod($: cheerio.CheerioAPI, html: string): string {
  const text = html.substring(0, 15000);

  // Try patterns like "For the fiscal year ended December 31, 2024"
  const yearEndMatch = text.match(
    /(?:fiscal\s+year|period)\s+ended?\s+(\w+\s+\d{1,2},?\s+\d{4})/i
  );
  if (yearEndMatch) return yearEndMatch[1];

  // Try "December 31, 2024" near filing type
  const dateMatch = text.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
  );
  if (dateMatch) return dateMatch[0];

  return '';
}

function extractFinancialTables($: cheerio.CheerioAPI): {
  incomeStatement: string[][] | null;
  balanceSheet: string[][] | null;
  cashFlow: string[][] | null;
} {
  const result: {
    incomeStatement: string[][] | null;
    balanceSheet: string[][] | null;
    cashFlow: string[][] | null;
  } = {
    incomeStatement: null,
    balanceSheet: null,
    cashFlow: null,
  };

  $('table').each((_i, table) => {
    const tableText = $(table).text().toLowerCase();

    if (!result.incomeStatement &&
      (tableText.includes('statement of operations') ||
        tableText.includes('statement of income') ||
        tableText.includes('statements of operations') ||
        tableText.includes('statements of income') ||
        (tableText.includes('revenue') && tableText.includes('net income')))) {
      result.incomeStatement = parseTable($, table);
    }

    if (!result.balanceSheet &&
      (tableText.includes('balance sheet') ||
        tableText.includes('balance sheets') ||
        (tableText.includes('total assets') && tableText.includes('total liabilities')))) {
      result.balanceSheet = parseTable($, table);
    }

    if (!result.cashFlow &&
      (tableText.includes('statement of cash flows') ||
        tableText.includes('statements of cash flows') ||
        (tableText.includes('operating activities') && tableText.includes('investing activities')))) {
      result.cashFlow = parseTable($, table);
    }
  });

  return result;
}

function parseTable($: cheerio.CheerioAPI, table: AnyNode): string[][] {
  const rows: string[][] = [];
  $(table).find('tr').each((_i, row) => {
    const cells: string[] = [];
    $(row).find('td, th').each((_j, cell) => {
      cells.push($(cell).text().trim().replace(/\s+/g, ' '));
    });
    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      rows.push(cells);
    }
  });
  return rows;
}

function extractSection(
  $: cheerio.CheerioAPI,
  html: string,
  startKeywords: string[],
  endKeywords: string[]
): string {
  const bodyText = $('body').text();

  // Find start position
  let startPos = -1;
  for (const keyword of startKeywords) {
    const idx = bodyText.indexOf(keyword);
    if (idx !== -1) {
      startPos = idx;
      break;
    }
  }
  if (startPos === -1) return '';

  // Find end position (next section)
  let endPos = bodyText.length;
  const searchFrom = startPos + 100; // Skip past the section header
  for (const keyword of endKeywords) {
    const idx = bodyText.indexOf(keyword, searchFrom);
    if (idx !== -1 && idx < endPos) {
      endPos = idx;
    }
  }

  // Extract and limit size
  let section = bodyText.substring(startPos, endPos);

  // Limit to ~50k chars to manage token costs
  if (section.length > 50000) {
    section = section.substring(0, 50000) + '\n[Section truncated for cost management]';
  }

  return section;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/Table of Contents/gi, '')
    .replace(/\d+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatFinancialTable(table: string[][] | null): string {
  if (!table || table.length === 0) return 'Not available';

  return table
    .map(row => row.join(' | '))
    .join('\n');
}

export function buildDocumentContext(filing: ParsedFiling): string {
  const parts = [
    `COMPANY: ${filing.companyName}`,
    `FILING TYPE: ${filing.filingType}`,
    `PERIOD: ${filing.fiscalPeriod}`,
    '',
    '=== FINANCIAL STATEMENTS ===',
    '',
    'INCOME STATEMENT:',
    formatFinancialTable(filing.financials.incomeStatement),
    '',
    'BALANCE SHEET:',
    formatFinancialTable(filing.financials.balanceSheet),
    '',
    'CASH FLOW STATEMENT:',
    formatFinancialTable(filing.financials.cashFlow),
    '',
    '=== RISK FACTORS ===',
    filing.sections.riskFactors || 'Not available',
    '',
    '=== MANAGEMENT DISCUSSION & ANALYSIS ===',
    filing.sections.mda || 'Not available',
    '',
    '=== FOOTNOTES ===',
    filing.sections.footnotes || 'Not available',
    '',
    '=== SEGMENT INFORMATION ===',
    filing.sections.segments || 'Not available',
  ];

  return parts.join('\n');
}
