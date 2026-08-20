/**
 * FINOVA PDF Parser Service – Format-Adaptive & Multi-Line Pipeline v3
 *
 * Features:
 *  1. Format-Adaptive PDF Text & Coordinate Extraction (pdfjs-dist → pdf-parse → Tesseract OCR)
 *  2. Dynamic Bank & Period Detection (Infers bank name from statement text, no hardcoded limits)
 *  3. Dynamic Column Header Detection (Supports variations: Post Dt, Val Dt, Details/Narrations, Chq/Ref No, Debit, Credit, Balance)
 *  4. Multi-Line Transaction Row Reconstruction (Joins continuation lines like UPI/..., /KKBK/..., PREMIUM DUE into a single transaction narration)
 *  5. Raw Narration Preservation (Preserves full raw statement text AND clean description)
 *  6. Column-Aware Debit/Credit Assignment (Uses column positions as primary direction evidence)
 *  7. Balance Reconciliation & Auto-Correction
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

// ── Public Interfaces ─────────────────────────────────────────────────────────
export interface RawTransaction {
  date: string;
  description: string;
  rawNarration: string;
  debit: number | null;   // money OUT
  credit: number | null;  // money IN
  balance: number | null;
  rawLine?: string;
}

export interface ParsedStatement {
  bankName: string;
  period: string;
  transactions: RawTransaction[];
  warnings: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseAmount(str: string | undefined | null): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[£$₹\u20B9Rs,\s]/g, '').replace(/\.\s+/g, '.').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === 'NIL') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/,
  // DD Mon YYYY or DD-MMM-YY or DD Mon YY
  /\b(\d{1,2})[\/\-\s]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\-\s]*,?\s*(\d{2,4})?\b/,
  // YYYY-MM-DD
  /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/,
];

function extractDate(str: string): string | null {
  for (const pat of DATE_PATTERNS) {
    const m = str.match(pat);
    if (m) return m[0];
  }
  return null;
}

const AMOUNT_RE = /(?:[£$₹\u20B9Rs]\s*)?[\d,]+(?:\.\s*\d{1,2})?\b/g;

function extractAmounts(str: string): number[] {
  const raw = [...str.matchAll(AMOUNT_RE)].map((m) => parseAmount(m[0]));
  return raw.filter((n): n is number => n !== null && n > 0);
}

// ── Step 1: Coordinate-Based Text Extraction ──────────────────────────────────
interface TextItem { str: string; x: number; y: number }

async function extractStructuredLines(buffer: Buffer): Promise<{ lines: string[]; items: TextItem[][] }> {
  try {
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const allLines: string[] = [];
    const allItems: TextItem[][] = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();

      const raw: TextItem[] = content.items
        .map((it: any) => ({ str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }))
        .filter((it: TextItem) => it.str.trim().length > 0);

      // Group by y coordinate (6px tolerance)
      const yMap = new Map<number, TextItem[]>();
      for (const item of raw) {
        let matched: number | null = null;
        for (const yKey of yMap.keys()) {
          if (Math.abs(yKey - item.y) <= 6) { matched = yKey; break; }
        }
        if (matched !== null) yMap.get(matched)!.push(item);
        else yMap.set(item.y, [item]);
      }

      // Sort lines top-to-bottom, items left-to-right
      const ys = Array.from(yMap.keys()).sort((a: number, b: number) => b - a);
      for (const y of ys) {
        const lineItems = yMap.get(y)!.sort((a: any, b: any) => a.x - b.x);
        allLines.push(lineItems.map((it: any) => it.str).join(' '));
        allItems.push(lineItems);
      }
    }
    return { lines: allLines, items: allItems };
  } catch {
    return { lines: [], items: [] };
  }
}

async function extractTextFallback(buffer: Buffer): Promise<string[]> {
  try {
    const result = await pdfParse(buffer);
    return (result.text || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function ocrFallback(buffer: Buffer): Promise<string[]> {
  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    return (ret.data.text || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ── Step 2: Format-Adaptive Bank & Period Detection ───────────────────────────
const KNOWN_BANK_PATTERNS: [RegExp, string][] = [
  [/hdfc\s*bank/i, 'HDFC Bank'],
  [/state\s*bank\s*of\s*india|(?<!\w)sbi(?!\w)/i, 'State Bank of India'],
  [/icici\s*bank/i, 'ICICI Bank'],
  [/axis\s*bank/i, 'Axis Bank'],
  [/kotak\s*(mahindra)?\s*bank/i, 'Kotak Mahindra Bank'],
  [/punjab\s*national|(?<!\w)pnb(?!\w)/i, 'Punjab National Bank'],
  [/canara\s*bank/i, 'Canara Bank'],
  [/bank\s*of\s*baroda/i, 'Bank of Baroda'],
  [/bank\s*of\s*india/i, 'Bank of India'],
  [/union\s*bank/i, 'Union Bank of India'],
  [/indusind\s*bank/i, 'IndusInd Bank'],
  [/yes\s*bank/i, 'Yes Bank'],
  [/idfc\s*(first)?\s*bank/i, 'IDFC First Bank'],
  [/federal\s*bank/i, 'Federal Bank'],
  [/yourbank|your\s*bank/i, 'YourBank International'],
  [/randombank|random\s*bank/i, 'RandomBank'],
  [/([A-Za-z0-9\s&.-]+(?:\s+Bank|\s+Banking|\s+Financial|\s+Co-operative Bank|\s+Coop Bank))/i, ''],
];

function detectBank(lines: string[]): string {
  const head = lines.slice(0, 40).join('\n');
  for (const [pattern, name] of KNOWN_BANK_PATTERNS) {
    const m = head.match(pattern);
    if (m) {
      if (name === '') {
        const bankName = (m[1] || m[0]).trim();
        if (bankName.length > 2 && bankName.length < 60) return bankName;
      } else {
        return name;
      }
    }
  }
  return 'Bank Statement';
}

function detectPeriod(lines: string[]): string {
  const head = lines.slice(0, 50).join(' ');
  const rangeMatch = head.match(
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{0,4}\s*(?:to|-)\s*\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*,?\s*\d{4}/i
  );
  if (rangeMatch) return rangeMatch[0].replace(/\s+/g, ' ').trim();

  const monthYear = head.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i);
  if (monthYear) return monthYear[0];

  return 'Monthly Statement Period';
}

// ── Step 3: Dynamic Format-Adaptive Column Header Detection ───────────────────
const HEADER_KEYWORDS = {
  date:        ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'trans date', 'post dt', 'val dt', 'post date', 'val date'],
  description: ['description', 'narration', 'particulars', 'details', 'transaction details', 'remarks', 'narration/details', 'details/narrations'],
  reference:   ['chq.no.', 'ref.no.', 'cheque no', 'ref no', 'utr', 'txn id', 'chq/ref no'],
  debit:       ['debit', 'withdrawal', 'withdrawals', 'dr', 'paid out', 'money out', 'amount dr', 'debit amount', 'out', 'dr (rs)', 'debit (inr)'],
  credit:      ['credit', 'deposit', 'deposits', 'paid in', 'money in', 'amount cr', 'credit amount', 'in', 'cr (rs)', 'credit (inr)'],
  balance:     ['balance', 'running balance', 'closing balance', 'available balance', 'balance (inr)', 'balance (rs)'],
};

interface ColumnMap {
  dateX: number | null;
  descX: number | null;
  debitX: number | null;
  creditX: number | null;
  balanceX: number | null;
  headerLineIdx: number;
}

function detectColumnHeaders(items: TextItem[][]): ColumnMap {
  const result: ColumnMap = { dateX: null, descX: null, debitX: null, creditX: null, balanceX: null, headerLineIdx: -1 };

  for (let i = 0; i < Math.min(items.length, 80); i++) {
    const line = items[i];
    const lineStr = line.map(it => it.str).join(' ').toLowerCase();

    const hasDate    = HEADER_KEYWORDS.date.some(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(lineStr));
    const hasDesc    = HEADER_KEYWORDS.description.some(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(lineStr));
    const hasDebit   = HEADER_KEYWORDS.debit.some(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(lineStr));
    const hasCredit  = HEADER_KEYWORDS.credit.some(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(lineStr));
    const hasBalance = HEADER_KEYWORDS.balance.some(k => new RegExp(`\\b${k.replace('.', '\\.')}\\b`, 'i').test(lineStr));

    const colCount = [hasDate, hasDesc, hasDebit, hasCredit, hasBalance].filter(Boolean).length;
    if (colCount < 2) continue;

    const tempMap: ColumnMap = { dateX: null, descX: null, debitX: null, creditX: null, balanceX: null, headerLineIdx: -1 };
    for (const item of line) {
      const w = item.str.toLowerCase().trim();
      if (!w || w.length < 2) continue;

      if (HEADER_KEYWORDS.date.some(k => k === w || w.startsWith(k))) {
        tempMap.dateX = item.x;
      } else if (HEADER_KEYWORDS.balance.some(k => k === w || w.startsWith(k))) {
        tempMap.balanceX = item.x;
      } else if (HEADER_KEYWORDS.debit.some(k => k === w || w.startsWith(k))) {
        tempMap.debitX = item.x;
      } else if (HEADER_KEYWORDS.credit.some(k => k === w || w.startsWith(k))) {
        tempMap.creditX = item.x;
      } else if (HEADER_KEYWORDS.description.some(k => k === w || w.startsWith(k))) {
        tempMap.descX = item.x;
      }
    }

    if (tempMap.debitX !== null || tempMap.creditX !== null || tempMap.balanceX !== null) {
      result.dateX    = tempMap.dateX;
      result.descX    = tempMap.descX;
      result.debitX   = tempMap.debitX;
      result.creditX  = tempMap.creditX;
      result.balanceX = tempMap.balanceX;
      result.headerLineIdx = i;
      break;
    }
  }
  return result;
}

// ── Step 4: Multi-Line Column-Aware Row Reconstruction ────────────────────────
const SKIP_LINES = /opening\s*balance|closing\s*balance|brought\s*forward|total\s*(credits?|debits?|money)|account\s*summary|page\s*\d|balance\s*at\s*\d|statement\s*(of|for)|customer\s*name|account\s*(number|no|type)|sort\s*code|ifsc|^\s*$|balance\s*carry|balance\s*b\/f|available\s*balance|^balance$/i;

function parseRowsWithColumns(
  items: TextItem[][],
  colMap: ColumnMap,
  startIdx: number
): RawTransaction[] {
  const txns: RawTransaction[] = [];
  const COL_TOLERANCE = 65; // px

  let pendingTx: {
    date: string;
    rawLines: string[];
    amountsByX: Array<{ x: number; value: number }>;
  } | null = null;

  const finalizeTx = (pt: typeof pendingTx) => {
    if (!pt) return;
    const fullRaw = pt.rawLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!fullRaw || fullRaw.length < 2) return;

    // Filter amounts vs description text
    const descText = fullRaw.replace(new RegExp(DATE_PATTERNS[0].source, 'g'), '')
                            .replace(new RegExp(DATE_PATTERNS[1].source, 'gi'), '')
                            .replace(new RegExp(DATE_PATTERNS[2].source, 'g'), '')
                            .replace(AMOUNT_RE, '')
                            .replace(/\s+/g, ' ').trim();

    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | null = null;

    const sortedAmts = [...pt.amountsByX].sort((a, b) => a.x - b.x);

    if (colMap.balanceX !== null && sortedAmts.length > 0) {
      const rightmost = sortedAmts[sortedAmts.length - 1];
      if (Math.abs(rightmost.x - colMap.balanceX) <= COL_TOLERANCE) {
        balance = rightmost.value;
        sortedAmts.pop();
      }
    } else if (sortedAmts.length >= 3) {
      balance = sortedAmts[sortedAmts.length - 1].value;
      sortedAmts.pop();
    }

    for (const { x, value } of sortedAmts) {
      if (colMap.debitX !== null && colMap.creditX !== null) {
        const dDist = Math.abs(x - colMap.debitX);
        const cDist = Math.abs(x - colMap.creditX);
        if (dDist <= COL_TOLERANCE && dDist <= cDist) debit = value;
        else if (cDist <= COL_TOLERANCE) credit = value;
      } else if (colMap.debitX !== null && Math.abs(x - colMap.debitX) <= COL_TOLERANCE) {
        debit = value;
      } else if (colMap.creditX !== null && Math.abs(x - colMap.creditX) <= COL_TOLERANCE) {
        credit = value;
      } else {
        const dir = inferDirection(fullRaw);
        if (dir === 'credit') credit = value;
        else debit = value;
      }
    }

    if (debit === null && credit === null && sortedAmts.length > 0) {
      const txAmt = sortedAmts[0].value;
      const dir = inferDirection(fullRaw);
      if (dir === 'credit') credit = txAmt;
      else debit = txAmt;
    }

    if (debit !== null || credit !== null) {
      txns.push({
        date: pt.date,
        description: descText || fullRaw,
        rawNarration: fullRaw,
        debit,
        credit,
        balance,
        rawLine: fullRaw,
      });
    }
  };

  for (let i = startIdx + 1; i < items.length; i++) {
    const line = items[i];
    const lineStr = line.map(it => it.str).join(' ');

    if (SKIP_LINES.test(lineStr)) continue;
    if (lineStr.trim().length < 2) continue;

    const dateStr = extractDate(lineStr);

    if (dateStr) {
      // Start of a new transaction row
      if (pendingTx) finalizeTx(pendingTx);

      const lineAmounts: Array<{ x: number; value: number }> = [];
      for (const item of line) {
        const stripped = item.str.trim();
        const isDate = !!extractDate(stripped);
        const amounts = extractAmounts(stripped);
        if (amounts.length > 0 && !isDate) {
          lineAmounts.push({ x: item.x, value: amounts[amounts.length - 1] });
        }
      }

      pendingTx = {
        date: dateStr,
        rawLines: [lineStr],
        amountsByX: lineAmounts,
      };
    } else if (pendingTx) {
      // Continuation line belonging to the active transaction
      pendingTx.rawLines.push(lineStr);
      for (const item of line) {
        const stripped = item.str.trim();
        const amounts = extractAmounts(stripped);
        if (amounts.length > 0) {
          pendingTx.amountsByX.push({ x: item.x, value: amounts[amounts.length - 1] });
        }
      }
    }
  }

  if (pendingTx) finalizeTx(pendingTx);
  return txns;
}

// ── Step 5: Narration Direction Fallback Heuristic ────────────────────────────
function inferDirection(text: string): 'credit' | 'debit' {
  const lower = text.toLowerCase();
  if (/\b(?:cr|credit|deposit|received|salary|payroll|refund|cashback|reversal|interest)\b/i.test(lower)) {
    return 'credit';
  }
  return 'debit';
}

// ── Step 6: Plain-Text Fallback Parser with Multi-Line Reconstruction ─────────
function parsePlainTextLines(lines: string[]): RawTransaction[] {
  const txns: RawTransaction[] = [];
  let pendingTx: { date: string; rawLines: string[] } | null = null;

  const finalizeTx = (pt: typeof pendingTx) => {
    if (!pt) return;
    const fullRaw = pt.rawLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!fullRaw || fullRaw.length < 3) return;

    const amounts = extractAmounts(fullRaw);
    if (amounts.length === 0) return;

    let desc = fullRaw.replace(new RegExp(DATE_PATTERNS[0].source, 'g'), '')
                      .replace(new RegExp(DATE_PATTERNS[1].source, 'gi'), '')
                      .replace(new RegExp(DATE_PATTERNS[2].source, 'g'), '')
                      .replace(AMOUNT_RE, '')
                      .replace(/\s+/g, ' ').trim();

    const drCrMatch = fullRaw.match(/\b(Dr|Cr)\b/i);
    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | null = null;

    if (drCrMatch) {
      const isDr = drCrMatch[1].toLowerCase() === 'dr';
      const txAmt = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
      if (amounts.length >= 2) balance = amounts[amounts.length - 1];
      if (isDr) debit = txAmt;
      else credit = txAmt;
    } else {
      if (amounts.length >= 2) balance = amounts[amounts.length - 1];
      const txAmt = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
      const dir = inferDirection(fullRaw);
      if (dir === 'credit') credit = txAmt;
      else debit = txAmt;
    }

    if (debit !== null || credit !== null) {
      txns.push({
        date: pt.date,
        description: desc || fullRaw,
        rawNarration: fullRaw,
        debit,
        credit,
        balance,
        rawLine: fullRaw,
      });
    }
  };

  for (const line of lines) {
    if (SKIP_LINES.test(line)) continue;
    if (line.length < 3) continue;

    const dateStr = extractDate(line);

    if (dateStr) {
      if (pendingTx) finalizeTx(pendingTx);
      pendingTx = { date: dateStr, rawLines: [line] };
    } else if (pendingTx) {
      pendingTx.rawLines.push(line);
    }
  }

  if (pendingTx) finalizeTx(pendingTx);
  return txns;
}

// ── Step 7: Reconciliation & Validation ──────────────────────────────────────
function validateTransactions(txns: RawTransaction[]): string[] {
  const warnings: string[] = [];

  const bothSet = txns.filter(t => t.debit !== null && t.credit !== null);
  if (bothSet.length > txns.length * 0.3) {
    warnings.push(`${bothSet.length} transactions have both debit and credit values — column mapping may be inaccurate.`);
  }

  const credits = txns.filter(t => t.credit !== null && t.debit === null).length;
  const debits  = txns.filter(t => t.debit !== null && t.credit === null).length;
  if (credits > 0 && debits === 0 && txns.length > 3) {
    warnings.push('All transactions classified as credits — debit column may not have been detected correctly.');
  }
  if (debits > 0 && credits === 0 && txns.length > 3) {
    warnings.push('All transactions classified as debits — credit column may not have been detected correctly.');
  }

  const withBalance = txns.filter(t => t.balance !== null);
  if (withBalance.length >= 3) {
    let reconcileErrors = 0;
    for (let i = 1; i < withBalance.length; i++) {
      const prev = withBalance[i - 1].balance!;
      const curr = withBalance[i].balance!;
      const debit = withBalance[i].debit ?? 0;
      const credit = withBalance[i].credit ?? 0;
      const expected = Math.round((prev - debit + credit) * 100) / 100;
      const actual = Math.round(curr * 100) / 100;
      if (Math.abs(expected - actual) > 1) reconcileErrors++;
    }
    if (reconcileErrors > withBalance.length * 0.4) {
      warnings.push(`Balance reconciliation failed for ${reconcileErrors}/${withBalance.length} transactions — debit/credit columns may be swapped.`);
    }
  }

  return warnings;
}

// ── Main Exported Parser Function ─────────────────────────────────────────────
export async function parsePDF(buffer: Buffer): Promise<ParsedStatement> {
  let { lines, items } = await extractStructuredLines(buffer);
  let usedOCR = false;

  if (lines.length < 5) {
    lines = await extractTextFallback(buffer);
    items = [];
  }

  if (lines.length < 5) {
    console.log('[FINOVA Parser] Running Tesseract OCR...');
    lines = await ocrFallback(buffer);
    items = [];
    usedOCR = true;
  }

  const bankName = detectBank(lines);
  const period   = detectPeriod(lines);

  let transactions: RawTransaction[] = [];
  let warnings: string[] = [];

  if (usedOCR) {
    warnings.push('PDF required OCR processing for text extraction.');
  }

  if (items.length > 0) {
    const colMap = detectColumnHeaders(items);
    if (colMap.headerLineIdx >= 0) {
      transactions = parseRowsWithColumns(items, colMap, colMap.headerLineIdx);
    }
  }

  if (transactions.length === 0) {
    transactions = parsePlainTextLines(lines);
  }

  const valWarnings = validateTransactions(transactions);
  warnings = [...warnings, ...valWarnings];

  if (valWarnings.some(w => w.includes('swapped')) && transactions.length > 0) {
    const swapped = transactions.map(t => ({
      ...t,
      debit: t.credit,
      credit: t.debit,
    }));
    const swapWarnings = validateTransactions(swapped);
    if (swapWarnings.filter(w => w.includes('reconciliation')).length === 0) {
      transactions = swapped;
      warnings.push('Debit/Credit columns auto-corrected based on balance reconciliation.');
    }
  }

  return { bankName, period, transactions, warnings };
}
