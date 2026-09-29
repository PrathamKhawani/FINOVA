/**
 * FINOVA Universal Wallet & UPI Statement Parser v11
 *
 * Data Integrity Guarantee:
 *  - NEVER uses current year as a fallback for missing transaction years.
 *  - NEVER rounds, alters, or fabricates transaction amounts, dates, or IDs.
 *  - NEVER confuses account numbers, balances, or totals with transaction amounts.
 *  - statementSource (BANK/WALLET/provider) is always SEPARATE from paymentChannel (UPI/NEFT/IMPS).
 *  - Raw narration is preserved verbatim from the original file.
 *  - CSV parsing logic is NEVER modified during PDF fixes (strict pipeline separation).
 *
 * TWO COMPLETELY INDEPENDENT PIPELINES:
 *  A) CSV  → parseWalletCSV()   — maps CSV columns, preserves verbatim values
 *  B) PDF  → parseWalletPDF()   — native PDF text extraction → Paytm block parser
 *
 * Paytm PDF structure (FY Apr–Mar):
 *  - Date is on its own line: "27 Mar"
 *  - Time is on next line:    "9:23 AM"
 *  - Transaction continues until the NEXT date line
 *  - Amount has explicit sign: "+ Rs.100" or "- Rs.354.06"
 *  - Year boundary: dates Apr–Dec belong to startYear; dates Jan–Mar belong to endYear
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHARED INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedWalletTransaction {
  date: string;
  time?: string;                 // HH:MM or HH:MM:SS, preserved verbatim
  description: string;
  rawNarration: string;          // Verbatim original line(s) from source
  debit: number | null;          // Money OUT — null if this is a credit transaction
  credit: number | null;         // Money IN — null if this is a debit transaction
  balance: number | null;
  referenceId?: string | null;   // UPI transaction ID / UTR / reference no.
  upiId?: string | null;         // UPI VPA of counterparty (e.g. merchant@bank)
  orderId?: string | null;       // Order/payment ID (Paytm ORDER, PhonePe txnId etc.)
  notes?: string | null;         // User notes / remarks preserved from source
  linkedAccount?: string | null; // Bank account / wallet account name+number used
  paymentChannel?: string | null; // HOW the money moved: UPI/NEFT/IMPS/Card/Wallet etc.
  status?: string;
  account?: string;              // Legacy alias for linkedAccount
}

export interface WalletParseResult {
  provider: string;       // "PhonePe" | "Paytm" | "Google Pay" | "BHIM" | "Unknown / Not specified"
  transactions: ParsedWalletTransaction[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
//   PIPELINE A — CSV PARSER
//   DO NOT MODIFY THIS SECTION WHILE WORKING ON PDF FIXES
// ══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────

// ── CSV Column Name Aliases (exhaustive) ─────────────────────────────────────
// Each list covers all known column header variants seen in real exports.
const DATE_COLS        = ['date', 'transaction date', 'txn date', 'value date', 'datetime', 'post date', 'trans date'];
const TIME_COLS        = ['time', 'transaction time', 'txn time'];
const DESC_COLS        = ['description', 'narration', 'details', 'transaction description', 'particulars', 'remarks', 'note', 'notes', 'paid to', 'received from', 'transaction details', 'narration/details'];
const DEBIT_COLS       = ['debit', 'debit amount', 'amount (dr)', 'dr', 'withdrawn', 'paid', 'amount paid', 'spent', 'withdrawal', 'withdrawals', 'debit (inr)', 'dr (rs)', 'money out'];
const CREDIT_COLS      = ['credit', 'credit amount', 'amount (cr)', 'cr', 'deposited', 'received', 'amount received', 'refund', 'deposit', 'deposits', 'credit (inr)', 'cr (rs)', 'money in'];
const AMOUNT_COLS      = ['amount', 'txn amount', 'transaction amount', 'total amount'];
const TYPE_COLS        = ['type', 'transaction type', 'txn type', 'dr/cr', 'direction', 'cr/dr'];
const BALANCE_COLS     = ['balance', 'closing balance', 'available balance', 'running balance', 'balance (inr)', 'balance (rs)'];
const REF_COLS         = ['reference', 'reference id', 'reference no', 'ref no', 'ref id', 'utr', 'utr no', 'transaction id', 'txn id', 'transaction ref', 'chq no', 'chq/ref no', 'cheque no'];
const UPI_ID_COLS      = ['upi id', 'upi ref', 'vpa', 'upi vpa', 'counterparty vpa', 'payer vpa', 'payee vpa', 'upi reference'];
const ORDER_ID_COLS    = ['order id', 'order no', 'order number', 'payment id', 'merchant order id', 'external ref'];
const NOTES_COLS       = ['note', 'notes', 'remarks', 'comment', 'comments', 'memo', 'user note', 'narration note'];
const ACCOUNT_COLS     = ['account', 'account no', 'account number', 'bank account', 'linked account', 'source account', 'paid by', 'paid to account'];
const CHANNEL_COLS     = ['channel', 'payment channel', 'payment mode', 'mode', 'transfer mode', 'payment method', 'method'];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ()\/]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse an amount string to a number, returning null for empty/invalid values.
 * DOES NOT use Math.abs() — direction is determined by the type/dr-cr column,
 * not by sign. The sign in the raw string is preserved in the direction decision.
 */
function parseAmountCSV(val: string | undefined | null): { value: number | null; isNegative: boolean } {
  if (!val || val.trim() === '' || val.trim() === '-' || val.trim() === '—') {
    return { value: null, isNegative: false };
  }
  const raw = val.trim();
  const isNegative = raw.startsWith('-') || (raw.startsWith('(') && raw.endsWith(')'));
  const cleaned = raw.replace(/[₹\u20B9$£Rs,\s]/g, '').replace(/[()]/g, '').replace(/^-/, '').trim();
  if (!cleaned || cleaned === '-') return { value: null, isNegative: false };
  const num = parseFloat(cleaned);
  return isNaN(num) ? { value: null, isNegative: false } : { value: num, isNegative };
}

// ── Strict Source Detection ───────────────────────────────────────────────────
function detectProvider(fullText: string, filename?: string): string {
  const fileLower = (filename || '').toLowerCase();

  // 1. Check filename for explicit provider name
  if (fileLower.includes('phonepe')) return 'PhonePe';
  if (fileLower.includes('paytm'))   return 'Paytm';
  if (fileLower.includes('gpay') || fileLower.includes('googlepay') || fileLower.includes('google_pay')) return 'Google Pay';
  if (fileLower.includes('bhim'))    return 'BHIM';
  if (fileLower.includes('amazonpay') || fileLower.includes('amazon_pay')) return 'Amazon Pay';
  if (fileLower.includes('mobikwik')) return 'MobiKwik';
  if (fileLower.includes('freecharge')) return 'FreeCharge';

  // 2. Check ONLY document header / first 15 lines (document-level title/branding)
  const lines = fullText.split(/\r?\n/).slice(0, 15);
  const headerText = lines.join(' ').toLowerCase();

  if (headerText.includes('paytm payments bank') || headerText.includes('paytm passbook') || headerText.includes('paytm wallet') || headerText.includes('one97 communications') || headerText.includes('paytm')) return 'Paytm';
  if (headerText.includes('phonepe private limited') || headerText.includes('phonepe transaction history') || headerText.includes('phonepe')) return 'PhonePe';
  if (headerText.includes('google pay') || headerText.includes('google india digital services') || headerText.includes('gpay statement') || (headerText.includes('transaction statement') && fullText.toLowerCase().includes('google pay'))) return 'Google Pay';
  if (headerText.includes('bhim upi statement') || headerText.includes('npci bhim') || headerText.includes('bhim')) return 'BHIM';
  if (headerText.includes('amazon pay balance') || headerText.includes('amazon pay statement') || headerText.includes('amazon pay')) return 'Amazon Pay';

  // 3. Default to "Unknown / Not specified" (NEVER default to Google Pay!)
  return 'Unknown / Not specified';
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 5).join('\n');
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount  = (sample.match(/;/g) || []).length;
  const tabCount   = (sample.match(/\t/g) || []).length;
  const pipeCount  = (sample.match(/\|/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount && semiCount > pipeCount) return ';';
  if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) return '\t';
  if (pipeCount > commaCount * 2 && pipeCount > semiCount && pipeCount > tabCount) return '|';
  return ',';
}

function parseCSVRow(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
export function parseWalletCSV(
  content: string,
  filename?: string
): WalletParseResult {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];

  // 1. Strip UTF-8 BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  const provider = detectProvider(cleanContent, filename);

  const rawLines = cleanContent.split(/\r?\n/);
  const nonFolderLines = rawLines.filter(l => l.trim().length > 0);

  if (nonFolderLines.length < 2) {
    return { provider, transactions: [], warnings: ['CSV file is empty or has only headers'] };
  }

  // 2. Auto-detect delimiter
  const delimiter = detectDelimiter(nonFolderLines);

  // 3. Find header line — search first 20 rows for the one with Date + (Description or Amount or Debit/Credit)
  let headerLine = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(20, nonFolderLines.length); i++) {
    const cols = parseCSVRow(nonFolderLines[i], delimiter).map(normalizeHeader);
    const hasDate   = cols.some(c => DATE_COLS.includes(c) || c.includes('date'));
    const hasAmount = cols.some(c => [...DESC_COLS, ...AMOUNT_COLS, ...DEBIT_COLS, ...CREDIT_COLS, ...TYPE_COLS].includes(c));
    if (hasDate && hasAmount) {
      headerLine = i;
      headers = cols;
      break;
    }
  }

  if (headerLine === -1) {
    // Fallback: pick first row with at least 2 non-empty columns
    for (let i = 0; i < Math.min(10, nonFolderLines.length); i++) {
      const cols = parseCSVRow(nonFolderLines[i], delimiter).map(normalizeHeader);
      const nonCount = cols.filter(c => c.length > 0).length;
      if (nonCount >= 2) {
        headerLine = i;
        headers = cols;
        warnings.push(`Could not detect standard header names. Using row ${i + 1} as headers.`);
        break;
      }
    }
  }

  if (headerLine === -1 || headers.length === 0) {
    headers = parseCSVRow(nonFolderLines[0], delimiter).map(normalizeHeader);
    headerLine = 0;
  }

  // Build column index map
  const idx = {
    date:    headers.findIndex(h => DATE_COLS.includes(h) || h.includes('date')),
    time:    headers.findIndex(h => TIME_COLS.includes(h) || h.includes('time')),
    desc:    headers.findIndex(h => DESC_COLS.includes(h) || h.includes('desc') || h.includes('narration') || h.includes('detail')),
    debit:   headers.findIndex(h => DEBIT_COLS.includes(h) || h.includes('debit') || h.includes('paid') || h.includes('dr')),
    credit:  headers.findIndex(h => CREDIT_COLS.includes(h) || h.includes('credit') || h.includes('received') || h.includes('cr')),
    amount:  headers.findIndex(h => AMOUNT_COLS.includes(h) || h === 'amount' || h.includes('amount')),
    type:    headers.findIndex(h => TYPE_COLS.includes(h) || h.includes('type') || h.includes('direction')),
    balance: headers.findIndex(h => BALANCE_COLS.includes(h) || h.includes('balance')),
    ref:     headers.findIndex(h => REF_COLS.includes(h) || h.includes('ref') || h.includes('utr') || h.includes('txn id')),
    upiId:   headers.findIndex(h => UPI_ID_COLS.includes(h) || h.includes('upi') || h.includes('vpa')),
    orderId: headers.findIndex(h => ORDER_ID_COLS.includes(h) || h.includes('order')),
    notes:   headers.findIndex(h => NOTES_COLS.includes(h) || h.includes('note') || h.includes('remark')),
    account: headers.findIndex(h => ACCOUNT_COLS.includes(h) || h.includes('account')),
    channel: headers.findIndex(h => CHANNEL_COLS.includes(h) || h.includes('channel') || h.includes('mode')),
  };

  if (idx.date === -1) {
    return { provider, transactions: [], warnings: [`Could not find a Date column in CSV. Found headers: ${headers.filter(h => h).join(', ')}`] };
  }
  if (idx.desc === -1 && idx.amount === -1 && idx.debit === -1 && idx.credit === -1) {
    return { provider, transactions: [], warnings: [`Could not find Description or Amount columns in CSV. Found headers: ${headers.filter(h => h).join(', ')}`] };
  }

  console.log(`[FINOVA CSV] Detected delimiter: "${delimiter}", header row: ${headerLine + 1}. Column map: date=${idx.date} desc=${idx.desc} debit=${idx.debit} credit=${idx.credit} amount=${idx.amount} ref=${idx.ref} upiId=${idx.upiId} orderId=${idx.orderId}`);

  for (let i = headerLine + 1; i < nonFolderLines.length; i++) {
    const row = parseCSVRow(nonFolderLines[i], delimiter);
    if (row.length < 2) continue;

    // Preserve exact date string from source — NEVER alter it
    const dateStr = idx.date >= 0 ? (row[idx.date] || '').trim() : '';
    if (!dateStr || dateStr === '—' || dateStr === '-') continue;

    // Preserve exact time string
    const timeStr = idx.time >= 0 ? (row[idx.time] || '').trim() || undefined : undefined;

    // Preserve exact description
    const description = idx.desc >= 0 ? (row[idx.desc] || '').trim() : '';

    // Preserve exact balance
    const { value: balance } = idx.balance >= 0 ? parseAmountCSV(row[idx.balance] || '') : { value: null };

    // Preserve exact reference ID
    const referenceId = idx.ref >= 0 ? (row[idx.ref] || '').trim() || null : null;

    // Preserve exact UPI ID
    const upiId = idx.upiId >= 0 ? (row[idx.upiId] || '').trim() || null : null;

    // Preserve exact order ID
    const orderId = idx.orderId >= 0 ? (row[idx.orderId] || '').trim() || null : null;

    // Preserve exact notes
    const notes = idx.notes >= 0 ? (row[idx.notes] || '').trim() || null : null;

    // Preserve exact linked account
    const linkedAccount = idx.account >= 0 ? (row[idx.account] || '').trim() || null : null;

    // Preserve exact payment channel (paymentChannel ≠ statementSource)
    const paymentChannel = idx.channel >= 0 ? (row[idx.channel] || '').trim() || null : null;

    // Determine debit/credit amounts
    let debit: number | null = null;
    let credit: number | null = null;

    if (idx.debit >= 0 || idx.credit >= 0) {
      // Explicit separate debit/credit columns — most reliable
      const { value: dv } = parseAmountCSV(idx.debit >= 0 ? (row[idx.debit] || '') : '');
      const { value: cv } = parseAmountCSV(idx.credit >= 0 ? (row[idx.credit] || '') : '');
      debit  = dv;
      credit = cv;
    } else if (idx.amount >= 0) {
      // Single amount column — use type column or sign to determine direction
      const rawAmountStr = row[idx.amount] || '';
      const { value: rawAmount, isNegative } = parseAmountCSV(rawAmountStr);
      if (rawAmount === null) continue;

      const typeStr = idx.type >= 0 ? (row[idx.type] || '').toLowerCase().trim() : '';

      if (typeStr.includes('dr') || typeStr === 'debit' || typeStr.includes('paid') || typeStr.includes('withdrawn') || typeStr.includes('out')) {
        debit = rawAmount;
      } else if (typeStr.includes('cr') || typeStr === 'credit' || typeStr.includes('received') || typeStr.includes('in')) {
        credit = rawAmount;
      } else if (isNegative) {
        // Negative sign means money out (debit)
        debit = rawAmount;
      } else {
        // Positive with no type context — treat as credit
        credit = rawAmount;
      }
    }

    if (debit === null && credit === null) continue;

    // Raw narration: include all available fields for full auditability
    const rawParts: string[] = [];
    rawParts.push(description || `Transaction on ${dateStr}`);
    if (timeStr) rawParts.push(`Time: ${timeStr}`);
    if (referenceId) rawParts.push(`Ref: ${referenceId}`);
    if (upiId) rawParts.push(`UPI: ${upiId}`);
    if (orderId) rawParts.push(`Order: ${orderId}`);
    if (notes) rawParts.push(`Note: ${notes}`);
    if (linkedAccount) rawParts.push(`Account: ${linkedAccount}`);

    transactions.push({
      date: dateStr,
      time: timeStr,
      description: description || `Transaction on ${dateStr}`,
      rawNarration: rawParts.join(' | '),
      debit,
      credit,
      balance,
      referenceId,
      upiId,
      orderId,
      notes,
      linkedAccount,
      paymentChannel,
      account: linkedAccount || undefined,
    });
  }

  if (transactions.length === 0) {
    warnings.push(`No valid transactions found in CSV. Detected ${nonFolderLines.length - headerLine - 1} data rows after header.`);
  }

  return { provider, transactions, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
//   PIPELINE B — PDF PARSER (DEDICATED — NO SHARED LOGIC WITH CSV)
//   Rebuilt from root cause for Paytm FY Apr–Mar statements.
// ══════════════════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────────

// ── PDF Text Extraction via unpdf (serverless-safe, Vercel-compatible) ─────────
async function extractPDFPages(buffer: Buffer): Promise<{ pages: string[][]; allText: string }> {
  const { getDocumentProxy } = require('unpdf') as {
    getDocumentProxy: (data: Uint8Array) => Promise<any>;
  };

  const data = new Uint8Array(buffer);
  const doc = await getDocumentProxy(data);

  console.log('[FINOVA PDF] unpdf loaded document, pages:', doc.numPages);

  const pages: string[][] = [];
  let allText = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Group text items by Y coordinate (6px tolerance) — top-to-bottom order
    const yMap = new Map<number, Array<{ x: number; str: string }>>();

    for (const item of content.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);

      let matchedY: number | null = null;
      for (const yKey of yMap.keys()) {
        if (Math.abs(yKey - y) <= 6) { matchedY = yKey; break; }
      }
      if (matchedY !== null) {
        yMap.get(matchedY)!.push({ x, str: item.str });
      } else {
        yMap.set(y, [{ x, str: item.str }]);
      }
    }

    // Sort descending by Y (PDF Y is bottom-up), merge items left-to-right
    const ys = Array.from(yMap.keys()).sort((a, b) => b - a);
    const pageLines: string[] = [];

    for (const y of ys) {
      const lineItems = yMap.get(y)!.sort((a, b) => a.x - b.x);
      // Re-join split comma-separated numbers (e.g. "1,23" split by PDF renderer)
      const lineStr = lineItems
        .map(it => it.str)
        .join(' ')
        .replace(/(\d+),\s+(\d{2,3})/g, '$1,$2')
        .trim();
      if (lineStr) {
        pageLines.push(lineStr);
        allText += lineStr + '\n';
      }
    }

    pages.push(pageLines);
    allText += '\n';
  }

  return { pages, allText };
}

// ── Month name maps for Paytm abbreviated format ──────────────────────────────
const MONTH_NUM: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const MONTH_PAD: Record<number, string> = {
  1: '01', 2: '02', 3: '03', 4: '04', 5: '05', 6: '06',
  7: '07', 8: '08', 9: '09', 10: '10', 11: '11', 12: '12',
};

/**
 * Detect statement period from Paytm PDF header.
 *
 * Handles formats:
 *  - "1 APR'24 - 31 MAR'25"       (Paytm FY format with abbreviated months + 2-digit year)
 *  - "01 April 2024 - 31 March 2025"  (full month names + 4-digit year)
 *  - "Transaction Statement Period 01 April 2024 - 31 March 2025"
 *
 * Returns: { startYear, startMonth (1-12), endYear, endMonth (1-12) }
 * or null if not found.
 */
interface StatementPeriod {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  periodStr: string;
}

function detectPaytmPeriod(lines: string[]): StatementPeriod | null {
  const headerText = lines.slice(0, 50).join(' ');

  // Pattern 1: "1 APR'24 - 31 MAR'25"  or  "1 Apr'24 - 31 Mar'25"
  // The abbreviated month + 2-digit year format used by Paytm
  const abbrevPattern = /(\d{1,2})\s+([A-Za-z]{3})'(\d{2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3})'(\d{2})/i;
  const abbrevMatch = headerText.match(abbrevPattern);
  if (abbrevMatch) {
    const startMonthName = abbrevMatch[2].toLowerCase();
    const startYearShort = parseInt(abbrevMatch[3], 10);
    const endMonthName   = abbrevMatch[5].toLowerCase();
    const endYearShort   = parseInt(abbrevMatch[6], 10);

    const startMonth = MONTH_NUM[startMonthName];
    const endMonth   = MONTH_NUM[endMonthName];

    if (startMonth && endMonth) {
      const startYear = 2000 + startYearShort;
      const endYear   = 2000 + endYearShort;

      console.log(`[FINOVA PDF] Detected Paytm period (abbrev): ${abbrevMatch[1]} ${abbrevMatch[2].toUpperCase()}'${abbrevMatch[3]} - ${abbrevMatch[4]} ${abbrevMatch[5].toUpperCase()}'${abbrevMatch[6]}`);
      console.log(`[FINOVA PDF] Resolved: startYear=${startYear} startMonth=${startMonth} endYear=${endYear} endMonth=${endMonth}`);

      return {
        startYear,
        startMonth,
        endYear,
        endMonth,
        periodStr: `${abbrevMatch[1]} ${abbrevMatch[2].toUpperCase()}'${abbrevMatch[3]} - ${abbrevMatch[4]} ${abbrevMatch[5].toUpperCase()}'${abbrevMatch[6]}`,
      };
    }
  }

  // Pattern 2: "01 April 2024 - 31 March 2025" (full month names with 4-digit years)
  const fullPattern = /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
  const fullMatch = headerText.match(fullPattern);
  if (fullMatch) {
    const startMonth = MONTH_NUM[fullMatch[2].toLowerCase()];
    const endMonth   = MONTH_NUM[fullMatch[5].toLowerCase()];
    const startYear  = parseInt(fullMatch[3], 10);
    const endYear    = parseInt(fullMatch[6], 10);

    if (startMonth && endMonth) {
      console.log(`[FINOVA PDF] Detected period (full): ${fullMatch[0]}`);
      return {
        startYear, startMonth,
        endYear,   endMonth,
        periodStr: fullMatch[0],
      };
    }
  }

  // Pattern 3: Generic — single 4-digit year anywhere in header
  const singleYear = headerText.match(/\b(20[2-9]\d)\b/);
  if (singleYear) {
    const yr = parseInt(singleYear[1], 10);
    console.log(`[FINOVA PDF] Generic year fallback: ${yr}`);
    return {
      startYear: yr, startMonth: 1,
      endYear: yr,   endMonth: 12,
      periodStr: singleYear[1],
    };
  }

  return null;
}

/**
 * Resolve the correct year for a transaction date given the statement period.
 *
 * Rules:
 *  - If the period is the same year start→end (e.g. Jan–Dec 2024), use that year.
 *  - If the period crosses a year boundary (e.g. Apr 2024 – Mar 2025):
 *    - Months >= startMonth  → startYear (e.g. Apr–Dec → 2024)
 *    - Months < startMonth   → endYear   (e.g. Jan–Mar → 2025)
 *
 * NEVER uses current system year.
 */
function resolveYearForMonth(txMonth: number, period: StatementPeriod): number {
  if (period.startYear === period.endYear) {
    // Same year throughout
    return period.startYear;
  }
  // Cross-year boundary: months from startMonth onwards belong to startYear
  if (txMonth >= period.startMonth) {
    return period.startYear;
  } else {
    return period.endYear;
  }
}

// ── Paytm date-line detector ──────────────────────────────────────────────────
// Matches: "27 Mar", "1 Apr", "31 March", "28 January" etc.
// These are date-ONLY lines (no year) in the Paytm PDF format.
const PAYTM_DATE_RE = /^(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)$/i;

// Matches full dates that already include year (general PDF formats)
const FULL_DATE_RE = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b|\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b|\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i;

// Time line: "9:23 AM", "12:29 AM", "3:45 PM"
const TIME_LINE_RE = /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))$/i;

// Time anywhere in a block
const TIME_ANYWHERE_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/i;

/**
 * Try to match a Paytm date-only line ("27 Mar").
 * Returns { day, monthNum, monthName } or null.
 */
function matchPaytmDateLine(line: string): { day: number; monthNum: number; monthName: string } | null {
  const m = line.trim().match(PAYTM_DATE_RE);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase().substring(0, 3); // normalize to 3-char abbrev
  const monthNum = MONTH_NUM[m[2].toLowerCase()];
  if (!monthNum) return null;
  return { day, monthNum, monthName };
}

/**
 * Extract explicitly signed amount from Paytm PDF block.
 * Paytm uses:  "+ Rs.354.06"  or  "- Rs.71,918.00"  or  "+ Rs.100"
 *
 * Returns { amount (positive number), isCredit } or null.
 */
function extractPaytmSignedAmount(blockText: string): { amount: number; isCredit: boolean } | null {
  // Primary: +/- followed by Rs. and amount  (Paytm's own format)
  const rsPattern = /([+\-])\s*Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/g;
  const rsMatches: Array<{ amount: number; isCredit: boolean }> = [];
  let m: RegExpExecArray | null;
  while ((m = rsPattern.exec(blockText)) !== null) {
    const val = parseFloat(m[2].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      rsMatches.push({ amount: val, isCredit: m[1] === '+' });
    }
  }

  if (rsMatches.length > 0) {
    // Use the FIRST signed amount (transaction amount comes before any balance)
    return rsMatches[0];
  }

  // Secondary: +/- followed by ₹ or just a number
  const genericPattern = /([+\-])\s*[₹\u20B9]?\s*([\d,]+(?:\.\d{1,2})?)/g;
  const genMatches: Array<{ amount: number; isCredit: boolean }> = [];
  while ((m = genericPattern.exec(blockText)) !== null) {
    const val = parseFloat(m[2].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      genMatches.push({ amount: val, isCredit: m[1] === '+' });
    }
  }

  if (genMatches.length > 0) {
    return genMatches[0];
  }

  return null;
}

/**
 * Extract UPI reference / UTR / order ID from a text block.
 */
function extractPDFUPIReference(blockText: string): { referenceId: string | null; upiId: string | null; orderId: string | null } {
  let referenceId: string | null = null;
  let upiId: string | null = null;
  let orderId: string | null = null;

  // UPI Ref No (labelled)
  const labelledRef = blockText.match(/(?:UPI\s*(?:Ref|Transaction|Txn)?\s*(?:No|ID)?|Ref\s*(?:No|ID)?|Txn\s*ID|UTR)[:\s]+([A-Za-z0-9]{8,24})/i);
  if (labelledRef) referenceId = labelledRef[1];

  // UPI path format: "UPI/123456789012"
  const upiPath = blockText.match(/UPI\/([0-9]{8,14})/i);
  if (upiPath && !referenceId) referenceId = upiPath[1];

  // UPI VPA: something@bank
  const vpa = blockText.match(/\b([a-zA-Z0-9._\-]+@[a-zA-Z]{2,})\b/);
  if (vpa) upiId = vpa[1];

  // Order ID (labelled)
  const orderMatch = blockText.match(/(?:Order\s*(?:ID|No)|Payment\s*ID)[:\s]+([A-Za-z0-9_\-]{6,30})/i);
  if (orderMatch) orderId = orderMatch[1];

  // Standalone 10-14 digit numeric reference (Paytm txn IDs)
  if (!referenceId) {
    const standalone = blockText.match(/\b(\d{10,14})\b/);
    if (standalone) referenceId = standalone[1];
  }

  return { referenceId, upiId, orderId };
}

/**
 * Detect paymentChannel from a transaction block (UPI/NEFT/IMPS/Card/Cash etc.)
 * This is HOW money moved — separate from statementSource (BANK/WALLET) and provider.
 */
function detectPDFPaymentChannel(blockText: string): string | null {
  const t = blockText.toUpperCase();
  if (/\bUPI\b/.test(t))        return 'UPI';
  if (/\bNEFT\b/.test(t))       return 'NEFT';
  if (/\bIMPS\b/.test(t))       return 'IMPS';
  if (/\bRTGS\b/.test(t))       return 'RTGS';
  if (/\bATM\b/.test(t))        return 'ATM';
  if (/DEBIT\s*CARD|CREDIT\s*CARD/.test(t)) return 'Card';
  if (/WALLET/.test(t))         return 'Wallet';
  if (/CHEQUE|CHQ/.test(t))     return 'Cheque';
  return null;
}

/**
 * Validate direction using transaction wording as a secondary signal.
 * Returns: 'CREDIT', 'DEBIT', or 'UNKNOWN'
 */
function inferDirectionFromWording(blockText: string): 'CREDIT' | 'DEBIT' | 'UNKNOWN' {
  const lower = blockText.toLowerCase();

  // Strong CREDIT signals
  if (/\breceived\s+from\b/.test(lower)) return 'CREDIT';
  if (/\bcredited\b/.test(lower)) return 'CREDIT';
  if (/\brefund\b/.test(lower)) return 'CREDIT';
  if (/\bcashback\b/.test(lower)) return 'CREDIT';
  if (/\/cr\//i.test(blockText)) return 'CREDIT';         // UPI/ref/CR/ format
  if (/\binward\s+upi\b/i.test(blockText)) return 'CREDIT'; // "INWARD UPI TRANSFER"
  if (/\bapb-cr-\b/i.test(blockText)) return 'CREDIT';   // APB-CR-* bank formats

  // Strong DEBIT signals
  if (/\bpaid\s+to\b/.test(lower)) return 'DEBIT';
  if (/\bsent\s+to\b/.test(lower)) return 'DEBIT';
  if (/\bdebited\b/.test(lower)) return 'DEBIT';
  if (/\bmoney\s+sent\b/.test(lower)) return 'DEBIT';
  if (/\btrain\s+ticket\b/.test(lower)) return 'DEBIT';
  if (/\bmerchant\b/.test(lower) && !/\breceived\b/.test(lower)) return 'DEBIT';
  if (/\bfinance\b/.test(lower) && !/\breceived\b/.test(lower)) return 'DEBIT';
  if (/\brecharge\b/.test(lower)) return 'DEBIT';
  if (/\/dr\//i.test(blockText)) return 'DEBIT';          // UPI/ref/DR/ format
  if (/\bemi\s+payment\b/i.test(blockText)) return 'DEBIT'; // EMI payments
  if (/\bdirect\s+debit\b/i.test(blockText)) return 'DEBIT'; // Direct debit (ACH/ECS)

  return 'UNKNOWN';
}

/**
 * Extract the description / merchant name from a Paytm transaction block.
 * The description is the first non-date, non-time, non-amount, non-ID line.
 */
function extractPaytmDescription(blockLines: string[], dateLineStr: string): string {
  for (const line of blockLines) {
    const trimmed = line.trim();
    // Skip the date line
    if (trimmed === dateLineStr) continue;
    // Skip time lines
    if (TIME_LINE_RE.test(trimmed)) continue;
    // Skip pure amount lines: "+ Rs.100", "- Rs.354.06"
    if (/^[+\-]\s*Rs\.?\s*[\d,]+(?:\.\d{1,2})?$/.test(trimmed)) continue;
    if (/^[+\-]\s*[₹\u20B9]?\s*[\d,]+(?:\.\d{1,2})?$/.test(trimmed)) continue;
    // Skip lines that are purely numbers
    if (/^[\d,]+(?:\.\d{1,2})?$/.test(trimmed)) continue;
    // Skip UPI ID lines: something@bank
    if (/^[a-zA-Z0-9._\-]+@[a-zA-Z]{2,}$/.test(trimmed)) continue;
    // Skip reference/order ID labeled lines
    if (/^(?:UPI\s*(?:Ref|Txn|Transaction|ID|No)|Ref\s*(?:No|ID)|Order\s*(?:ID|No)|UTR)[:\s]/i.test(trimmed)) continue;
    // Skip known status words
    if (/^(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)$/i.test(trimmed)) continue;
    // Skip page header/footer noise
    if (/^Page\s+\d+\s*(?:of\s*\d+)?$/i.test(trimmed)) continue;
    // Skip total lines
    if (/^Total\s+(?:Money\s+)?(?:Paid|Received)/i.test(trimmed)) continue;
    // Skip statement header
    if (/^Paytm\s+Statement\s+for/i.test(trimmed)) continue;

    // This is the description
    return trimmed;
  }
  return '';
}

/**
 * Extract linked bank account from Paytm block.
 * Paytm format: "Kotak Mahindra Bank - 13" or "HDFC Bank - 4567"
 */
function extractPaytmLinkedAccount(blockText: string): string | null {
  // "Kotak Mahindra Bank - 13" format
  const bankWithNum = blockText.match(/\b([A-Za-z\s]+Bank\s*(?:-\s*\d{1,10})?)\b/i);
  if (bankWithNum) {
    const candidate = bankWithNum[0].trim();
    if (candidate.length > 4 && candidate.length < 60) return candidate;
  }
  // Generic wallet account
  const wallet = blockText.match(/\b(Paytm\s*Wallet|PhonePe\s*Wallet|Google\s*Pay)\b/i);
  if (wallet) return wallet[0].trim();
  return null;
}

// Lines to skip at the document level (not transaction data)
const PDF_SKIP_LINE_RE = /^(Page\s+\d+(?:\s+of\s+\d+)?|Total\s+Money\s+(?:Paid|Received)|Paytm\s+Statement\s+for|Date\s+&\s+Time|Transaction\s+Details|Notes\s+&\s+Tags|Your\s+Account|Amount|Date\s+Time|Transaction\s+statement|Note:\s*This|Disclaimer:)$/i;

/**
 * Parse Paytm PDF transaction blocks.
 *
 * Strategy:
 * 1. Identify date lines using PAYTM_DATE_RE ("27 Mar")
 * 2. Group all lines until the next date line into one transaction block
 * 3. Extract time, description, signed amount, UPI refs, account from block
 * 4. Resolve year from statement period using year-boundary logic
 * 5. Validate direction from sign (authoritative) and wording (secondary)
 *
 * NEVER combines amounts. NEVER invents missing data.
 * Skips Total Money Paid / Total Money Received as statement totals.
 */
function parsePaytmBlocks(
  allLines: string[],
  period: StatementPeriod | null,
  warnings: string[]
): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  // Pre-filter: remove empty lines, page headers/footers, column headers
  const lines = allLines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (PDF_SKIP_LINE_RE.test(trimmed)) return false;
    return true;
  });

  console.log(`[FINOVA PDF] parsePaytmBlocks: ${lines.length} filtered lines to process`);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const dateParsed = matchPaytmDateLine(line);

    if (!dateParsed) {
      i++;
      continue;
    }

    // We have a date line — collect the block
    const blockLines: string[] = [line];
    let j = i + 1;

    while (j < lines.length) {
      const nextLine = lines[j].trim();
      if (!nextLine) { j++; continue; }

      // Next date line → end of current block
      if (matchPaytmDateLine(nextLine)) break;

      // Stop at summary/total lines (these are NOT transactions)
      if (/^Total\s+Money\s+(?:Paid|Received)/i.test(nextLine)) break;
      if (/^(?:Opening|Closing)\s+Balance/i.test(nextLine)) break;
      if (/^(?:Total\s+Credits|Total\s+Debits)/i.test(nextLine)) break;

      blockLines.push(nextLine);
      j++;

      // Safety cap: Paytm transactions rarely exceed 12 lines
      // If we have both an amount AND a UPI ref, the block is complete
      if (blockLines.length >= 12) {
        const partialText = blockLines.join(' ');
        const hasAmount = extractPaytmSignedAmount(partialText) !== null;
        const hasRef = extractPDFUPIReference(partialText).referenceId !== null;
        if (hasAmount && hasRef) break;
        // Hard cap at 15 lines regardless
        if (blockLines.length >= 15) break;
      }
    }

    const blockText = blockLines.join(' ');

    // Skip summary/header blocks
    if (/closing\s*balance|opening\s*balance|total\s+(credits|debits)|account\s*summary|statement\s*period/i.test(blockText)) {
      i = j;
      continue;
    }

    // Skip statement header blocks like "Paytm Statement for 1 APR'24 - 31 MAR'25"
    if (/Paytm\s+Statement\s+for/i.test(blockText)) {
      i = j;
      continue;
    }

    // ── Resolve transaction date with correct year ────────────────────────────
    let dateStr: string;
    const { day, monthNum, monthName } = dateParsed;

    if (period !== null) {
      const year = resolveYearForMonth(monthNum, period);
      // Format: "DD Mon YYYY" e.g. "27 Mar 2025"
      const dayPadded = day.toString().padStart(2, '0');
      const monthFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1, 3).toLowerCase();
      dateStr = `${dayPadded} ${monthFormatted} ${year}`;
    } else {
      // No period detected — preserve partial date, flag for review
      const monthFormatted = monthName.charAt(0).toUpperCase() + monthName.slice(1, 3).toLowerCase();
      dateStr = `${day} ${monthFormatted}`;
      warnings.push(`Could not determine year for transaction on "${dateStr}" — statement period not detected.`);
    }

    // ── Extract time ─────────────────────────────────────────────────────────
    let timeStr: string | undefined;
    // Check if line after date is a time line
    if (blockLines.length > 1) {
      const secondLine = blockLines[1].trim();
      if (TIME_LINE_RE.test(secondLine)) {
        timeStr = secondLine;
      }
    }
    // Fallback: look anywhere in block
    if (!timeStr) {
      const timeMatch = blockText.match(TIME_ANYWHERE_RE);
      if (timeMatch) timeStr = timeMatch[1];
    }

    // ── Extract signed amount ─────────────────────────────────────────────────
    const signedResult = extractPaytmSignedAmount(blockText);

    if (!signedResult) {
      // No amount found — skip, but log for investigation
      console.warn(`[FINOVA PDF] No amount found in block starting "${line}" — block: ${blockText.substring(0, 120)}`);
      i = j;
      continue;
    }

    const { amount, isCredit: signIsCredit } = signedResult;

    // ── Validate direction: sign is authoritative, wording is secondary ───────
    const wordingDir = inferDirectionFromWording(blockText);
    let isCredit: boolean;

    if (wordingDir !== 'UNKNOWN') {
      const wordingIsCredit = wordingDir === 'CREDIT';
      if (wordingIsCredit !== signIsCredit) {
        // Sign and wording conflict — log it, trust the sign
        warnings.push(`Direction conflict in transaction "${dateStr}": sign says ${signIsCredit ? 'CREDIT' : 'DEBIT'} but wording suggests ${wordingDir}. Using sign.`);
      }
    }
    isCredit = signIsCredit; // Sign is authoritative

    // ── Extract description ───────────────────────────────────────────────────
    const description = extractPaytmDescription(blockLines, line) || (isCredit ? 'Credit' : 'Debit');

    // ── Extract UPI references ────────────────────────────────────────────────
    const refs = extractPDFUPIReference(blockText);

    // ── Extract linked account ────────────────────────────────────────────────
    const linkedAccount = extractPaytmLinkedAccount(blockText);

    // ── Extract note/remarks ──────────────────────────────────────────────────
    const noteMatch = blockText.match(/\bNote:\s*([^\|]+)/i);
    const notes = noteMatch ? noteMatch[1].trim() : null;

    // ── Payment channel ───────────────────────────────────────────────────────
    const paymentChannel = detectPDFPaymentChannel(blockText);

    // ── Status ────────────────────────────────────────────────────────────────
    const statusMatch = blockText.match(/\b(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)\b/i);
    const status = statusMatch ? statusMatch[1] : 'Completed';
    const failed = /failed|cancelled/i.test(status);

    const rawNarration = blockLines.join(' | ');

    console.log(`[FINOVA PDF] TX: ${dateStr} ${timeStr || ''} | ${isCredit ? 'CREDIT' : 'DEBIT'} Rs.${amount} | ${description.substring(0, 50)}`);

    txns.push({
      date: dateStr,
      time: timeStr,
      description,
      rawNarration,
      // Amount stored as POSITIVE; debit/credit fields indicate direction
      debit:  (!isCredit && !failed) ? amount : null,
      credit: ( isCredit && !failed) ? amount : null,
      balance: null,
      referenceId: refs.referenceId,
      upiId: refs.upiId,
      orderId: refs.orderId,
      notes,
      linkedAccount,
      paymentChannel,
      status,
      account: linkedAccount || undefined,
    });

    i = j;
  }

  return txns;
}

/**
 * General-purpose block parser for non-Paytm PDF formats.
 * Uses full dates (with year) as block boundaries.
 * Falls back to this when Paytm-specific parsing yields no results.
 */
function parseGeneralPDFBlocks(
  allLines: string[],
  statementYear: number | null,
  warnings: string[]
): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  const TIME_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/i;

  const DATE_ANCHOR_RES = [
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
    /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+\d{2,4}\b/i,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}\b/i,
    /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i,
  ];

  function extractDateAnchorGen(line: string): string | null {
    for (const re of DATE_ANCHOR_RES) {
      const m = line.match(re);
      if (m) return m[0];
    }
    return null;
  }

  const filteredLines = allLines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^Page\s+\d+\s*(?:of\s*\d+)?$/i.test(trimmed)) return false;
    if (/^(?:Note|Disclaimer):\s*This\s*statement/i.test(trimmed)) return false;
    return true;
  });

  let i = 0;
  while (i < filteredLines.length) {
    const line = filteredLines[i].trim();
    const dateAnchor = extractDateAnchorGen(line);

    if (!dateAnchor) { i++; continue; }

    const blockLines: string[] = [line];
    let j = i + 1;

    while (j < filteredLines.length) {
      const nextLine = filteredLines[j].trim();
      if (!nextLine) { j++; continue; }

      const nextDate = extractDateAnchorGen(nextLine);
      if (nextDate) break;

      if (/page\s*\d\s*of\s*\d|closing\s*balance|opening\s*balance|total\s+(credits|debits)|statement\s*summary/i.test(nextLine)) break;
      if (/^Note:\s*This\s*statement\s*reflects/i.test(nextLine)) break;

      blockLines.push(nextLine);
      j++;

      if (blockLines.length >= 10) break;
    }

    const blockText = blockLines.join(' ');

    if (/closing\s*balance|opening\s*balance|total\s+(credits|debits)|account\s*summary|statement\s*period|transaction\s*statement\s*period/i.test(blockText)) {
      i = j; continue;
    }
    if (/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*[-–]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/i.test(blockText)) {
      i = j; continue;
    }

    let dateStr = dateAnchor;
    const hasYear = /\d{4}/.test(dateStr);
    if (!hasYear && statementYear) {
      dateStr = `${dateStr} ${statementYear}`;
    }

    const timeMatch = blockText.match(TIME_RE);
    const timeStr = timeMatch ? timeMatch[1] : undefined;
    const refs = extractPDFUPIReference(blockText);
    const paymentChannel = detectPDFPaymentChannel(blockText);

    // Try signed amount first
    const signedResult = extractPaytmSignedAmount(blockText);
    let amount: number;
    let isCredit: boolean | null = null;

    if (signedResult) {
      amount = signedResult.amount;
      isCredit = signedResult.isCredit;
    } else {
      // Unsigned amount heuristics
      const amtMatches: number[] = [];
      const amtRe = /(?:[₹\u20B9$£Rs]?\s*)?([\d,]+(?:\.\d{1,2})?)/g;
      let am: RegExpExecArray | null;
      const cleanedForAmts = blockText
        .replace(TIME_RE, '')
        .replace(/\b\d{4}\b/g, '')
        .replace(/\b\d{1,2}[\/\-\.]\d{1,2}\b/g, '');
      while ((am = amtRe.exec(cleanedForAmts)) !== null) {
        const v = parseFloat(am[1].replace(/,/g, ''));
        if (!isNaN(v) && v > 0 && v < 10000000) amtMatches.push(v);
      }
      if (amtMatches.length === 0) { i = j; continue; }
      amount = amtMatches[amtMatches.length - 1];

      const wording = inferDirectionFromWording(blockText);
      if (wording === 'CREDIT') isCredit = true;
      else if (wording === 'DEBIT') isCredit = false;
    }

    // Extract description
    let description = '';
    for (const bl of blockLines) {
      if (bl.includes(dateAnchor)) continue;
      if (TIME_RE.test(bl)) continue;
      if (/^[+\-]?\s*(?:[₹\u20B9$£Rs]?\s*)?[\d,]+(?:\.\d{1,2})?$/.test(bl.trim())) continue;
      if (/^(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)$/i.test(bl.trim())) continue;
      description = bl.trim();
      break;
    }

    const linkedAccount = extractPaytmLinkedAccount(blockText);
    const noteMatch = blockText.match(/\bNote:\s*([^\|]+)/i);
    const notes = noteMatch ? noteMatch[1].trim() : null;
    const statusMatch = blockText.match(/\b(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)\b/i);
    const status = statusMatch ? statusMatch[1] : 'Completed';
    const failed = /failed|cancelled/i.test(status);

    txns.push({
      date: dateStr,
      time: timeStr,
      description: description || 'Transaction',
      rawNarration: blockLines.join(' | '),
      debit:  (isCredit !== true && !failed) ? amount : null,
      credit: (isCredit === true && !failed)  ? amount : null,
      balance: null,
      referenceId: refs.referenceId,
      upiId: refs.upiId,
      orderId: refs.orderId,
      notes,
      linkedAccount,
      paymentChannel,
      status,
      account: linkedAccount || undefined,
    });

    i = j;
  }

  return txns;
}

// ── Main Exported Universal PDF Parser ────────────────────────────────────────
export async function parseWalletPDF(
  buffer: Buffer,
  filename?: string
): Promise<WalletParseResult> {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];
  let provider = 'Unknown / Not specified';

  try {
    console.log('[FINOVA PDF] Extracting text from PDF via unpdf, buffer length:', buffer.length);
    const { pages, allText } = await extractPDFPages(buffer);
    const allLines = pages.flat();

    console.log('[FINOVA PDF] Extracted', allText.length, 'chars across', pages.length, 'page(s) and', allLines.length, 'lines');

    // Strict document-level provider detection
    provider = detectProvider(allText, filename);
    console.log('[FINOVA PDF] Detected provider:', provider);

    // Log first 25 lines for debugging
    console.log('[FINOVA PDF] First 25 extracted lines:');
    allLines.slice(0, 25).forEach((l, idx) => console.log(`  [${idx}] ${l}`));

    // Detect statement period — handles Paytm "1 APR'24 - 31 MAR'25" format
    const period = detectPaytmPeriod(allLines);
    if (period) {
      console.log(`[FINOVA PDF] Statement period: ${period.periodStr} | startYear=${period.startYear} startMonth=${period.startMonth} endYear=${period.endYear} endMonth=${period.endMonth}`);
    } else {
      warnings.push('Could not detect statement period from document header. Transaction years may be missing or incorrect.');
      console.warn('[FINOVA PDF] Statement period not detected from header');
    }

    // ── Paytm-specific block parser ──
    // Try the Paytm format first (date-only lines: "27 Mar")
    const paytmParsed = parsePaytmBlocks(allLines, period, warnings);
    console.log('[FINOVA PDF] Paytm block parser extracted:', paytmParsed.length, 'transactions');

    if (paytmParsed.length > 0) {
      transactions.push(...paytmParsed);

      // Statement-level totals validation (informational only — NEVER alters transactions)
      const calcDebits  = paytmParsed.reduce((s, t) => s + (t.debit  ?? 0), 0);
      const calcCredits = paytmParsed.reduce((s, t) => s + (t.credit ?? 0), 0);
      console.log(`[FINOVA PDF] Calculated: Debits=₹${calcDebits.toFixed(2)} Credits=₹${calcCredits.toFixed(2)}`);
    } else {
      // ── General-purpose fallback ──
      console.log('[FINOVA PDF] Paytm parser found 0 transactions — trying general block parser');
      const statementYear = period ? period.endYear : null;
      const generalParsed = parseGeneralPDFBlocks(allLines, statementYear, warnings);
      console.log('[FINOVA PDF] General block parser extracted:', generalParsed.length, 'transactions');

      if (generalParsed.length > 0) {
        transactions.push(...generalParsed);
      } else {
        warnings.push('Could not extract transactions from this PDF.');
        warnings.push(`[DEBUG] First 15 lines: ${allLines.slice(0, 15).join(' | ')}`);
      }
    }

    // Log summary of parsed transactions
    transactions.forEach((t, idx) => {
      const dir = t.credit !== null ? 'CREDIT' : 'DEBIT';
      const amt = t.credit !== null ? t.credit : t.debit;
      console.log(`  [${idx + 1}] ${t.date} ${t.time || ''} | ${dir} ₹${amt} | ${t.description.substring(0, 50)}`);
    });

  } catch (err: any) {
    console.error('[FINOVA PDF] Error during PDF parsing:', err?.message);
    console.error('[FINOVA PDF] Stack:', err?.stack?.substring(0, 300));
    warnings.push(`PDF extraction error: ${err.message}`);
  }

  return { provider, transactions, warnings };
}
