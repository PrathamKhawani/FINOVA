/**
 * FINOVA Wallet Statement Parser
 *
 * Supports:
 *   1. Generic CSV wallet export (PhonePe, Google Pay, Paytm CSV downloads)
 *   2. PhonePe PDF Transaction History
 *   3. Paytm Passbook PDF
 *   4. Google Pay PDF statement
 *
 * Returns the same ParsedTransaction[] format as pdf-parser.service.ts
 * so the unified pipeline (categorize → store) requires zero changes.
 *
 * PDF extraction uses `unpdf` (serverless-native, no worker file required).
 * pdfjs-dist is NOT used here to avoid the Vercel "Cannot find module './pdf.worker.js'" error.
 *
 * Architecture note: This is file-based import only.
 * Official API integration (PhonePe API, Paytm API) is deferred to Semester 8
 * and requires merchant authorization credentials.
 */

export interface ParsedWalletTransaction {
  date: string;
  description: string;
  rawNarration: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
}

export interface WalletParseResult {
  provider: string;       // "PhonePe" | "Paytm" | "Google Pay" | "Unknown Wallet"
  transactions: ParsedWalletTransaction[];
  warnings: string[];
}

// ── CSV Column Name Aliases ───────────────────────────────────────────────────
const DATE_COLS = ['date', 'transaction date', 'txn date', 'value date', 'datetime'];
const DESC_COLS = ['description', 'narration', 'details', 'transaction description', 'particulars', 'remarks', 'note'];
const DEBIT_COLS = ['debit', 'debit amount', 'amount (dr)', 'dr', 'withdrawn', 'paid', 'amount paid'];
const CREDIT_COLS = ['credit', 'credit amount', 'amount (cr)', 'cr', 'deposited', 'received', 'amount received'];
const AMOUNT_COLS = ['amount', 'txn amount', 'transaction amount'];
const TYPE_COLS = ['type', 'transaction type', 'txn type', 'dr/cr'];
const BALANCE_COLS = ['balance', 'closing balance', 'available balance'];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function parseAmount(val: string): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  const cleaned = val.replace(/[₹,\s]/g, '').replace(/[()]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

function detectProvider(content: string, filename?: string): string {
  const lower = content.toLowerCase();
  const fileLower = (filename || '').toLowerCase();

  if (lower.includes('phonepe') || fileLower.includes('phonepe')) return 'PhonePe';
  if (lower.includes('paytm') || fileLower.includes('paytm')) return 'Paytm';
  if (lower.includes('google pay') || lower.includes('gpay') || fileLower.includes('gpay')) return 'Google Pay';
  if (lower.includes('amazon pay') || fileLower.includes('amazonpay')) return 'Amazon Pay';
  if (lower.includes('mobikwik') || fileLower.includes('mobikwik')) return 'MobiKwik';
  if (lower.includes('freecharge') || fileLower.includes('freecharge')) return 'FreeCharge';

  return 'Wallet';
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
export function parseWalletCSV(
  content: string,
  filename?: string
): WalletParseResult {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];
  const provider = detectProvider(content, filename);

  // Split into lines, skip empty
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { provider, transactions: [], warnings: ['CSV file is empty or has only headers'] };
  }

  // Find the header row (first line containing recognizable column names)
  let headerLine = 0;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVRow(lines[i]).map(normalizeHeader);
    if (
      cols.some(c => DATE_COLS.includes(c)) &&
      (cols.some(c => DESC_COLS.includes(c)) || cols.some(c => AMOUNT_COLS.includes(c)))
    ) {
      headerLine = i;
      headers = cols;
      break;
    }
  }

  if (headers.length === 0) {
    warnings.push('Could not detect column headers. Attempting auto-detection with first row.');
    headers = parseCSVRow(lines[0]).map(normalizeHeader);
    headerLine = 0;
  }

  // Map column indices
  const colIdx = {
    date: headers.findIndex(h => DATE_COLS.includes(h)),
    desc: headers.findIndex(h => DESC_COLS.includes(h)),
    debit: headers.findIndex(h => DEBIT_COLS.includes(h)),
    credit: headers.findIndex(h => CREDIT_COLS.includes(h)),
    amount: headers.findIndex(h => AMOUNT_COLS.includes(h)),
    type: headers.findIndex(h => TYPE_COLS.includes(h)),
    balance: headers.findIndex(h => BALANCE_COLS.includes(h)),
  };

  if (colIdx.date === -1) {
    return { provider, transactions: [], warnings: ['Could not find a Date column in CSV'] };
  }
  if (colIdx.desc === -1 && colIdx.amount === -1 && colIdx.debit === -1) {
    return { provider, transactions: [], warnings: ['Could not find Description or Amount columns in CSV'] };
  }

  // Parse data rows
  for (let i = headerLine + 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < 2) continue;

    const dateStr = (row[colIdx.date] || '').trim();
    if (!dateStr || dateStr === '—' || dateStr === '-') continue;

    const description = colIdx.desc >= 0 ? (row[colIdx.desc] || '').trim() : '';
    const balance = colIdx.balance >= 0 ? parseAmount(row[colIdx.balance] || '') : null;

    let debit: number | null = null;
    let credit: number | null = null;

    if (colIdx.debit >= 0 || colIdx.credit >= 0) {
      // Separate debit/credit columns
      debit = parseAmount(row[colIdx.debit] || '');
      credit = parseAmount(row[colIdx.credit] || '');
    } else if (colIdx.amount >= 0) {
      // Single amount column — use type column to determine direction
      const rawAmount = parseAmount(row[colIdx.amount] || '');
      const typeStr = colIdx.type >= 0 ? (row[colIdx.type] || '').toLowerCase() : '';

      if (typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('paid') || typeStr.includes('withdrawn')) {
        debit = rawAmount;
      } else if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('received')) {
        credit = rawAmount;
      } else {
        // Check amount sign
        const rawStr = (row[colIdx.amount] || '').trim();
        if (rawStr.startsWith('-')) {
          debit = Math.abs(rawAmount || 0) || null;
        } else {
          credit = rawAmount;
        }
      }
    }

    if (debit === null && credit === null) continue;

    transactions.push({
      date: dateStr,
      description: description || `Transaction on ${dateStr}`,
      rawNarration: description || `Transaction on ${dateStr}`,
      debit,
      credit,
      balance,
    });
  }

  if (transactions.length === 0) {
    warnings.push('No valid transactions found in CSV. Please check the file format.');
  }

  return { provider, transactions, warnings };
}

// ── Simple CSV Row Parser (handles quoted fields) ─────────────────────────────
function parseCSVRow(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ── PDF Text Extraction via unpdf (serverless-safe, no worker required) ───────
//
// unpdf bundles its own pdfjs-dist WASM distribution and never tries to load
// a separate pdf.worker.js — safe in Vercel, AWS Lambda, Cloudflare Workers, etc.
//
async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: string[][] }> {
  // Dynamic require to allow tree-shaking in TypeScript builds
  const { getDocumentProxy, extractText, getResolvedPDFJS } = require('unpdf') as {
    getDocumentProxy: (data: Uint8Array) => Promise<any>;
    extractText: (doc: any, opts?: { mergePages?: boolean }) => Promise<{ text: string; totalPages: number }>;
    getResolvedPDFJS: () => Promise<any>;
  };

  const data = new Uint8Array(buffer);
  const doc = await getDocumentProxy(data);

  console.log('[FINOVA Wallet] unpdf: document loaded, pages:', doc.numPages);

  // Per-page text for structured parsing
  const pages: string[][] = [];
  let fullText = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Group items by Y coordinate to reconstruct reading order
    const yMap = new Map<number, Array<{ x: number; str: string }>>();
    for (const item of content.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      // Group items within 5px of the same y
      let matchedY: number | null = null;
      for (const yKey of yMap.keys()) {
        if (Math.abs(yKey - y) <= 5) { matchedY = yKey; break; }
      }
      if (matchedY !== null) {
        yMap.get(matchedY)!.push({ x, str: item.str });
      } else {
        yMap.set(y, [{ x, str: item.str }]);
      }
    }

    // Sort top-to-bottom, left-to-right within each line
    const ys = Array.from(yMap.keys()).sort((a, b) => b - a);
    const pageLines: string[] = [];
    for (const y of ys) {
      const lineItems = yMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineStr = lineItems.map(it => it.str).join(' ').trim();
      if (lineStr) {
        pageLines.push(lineStr);
        fullText += lineStr + '\n';
      }
    }
    pages.push(pageLines);
    fullText += '\n';
  }

  return { text: fullText, pages };
}

// ── Google Pay PDF Parser ────────────────────────────────────────────────────
//
// Google Pay PDFs exported from the app typically have this line structure:
//
//   [Date line]      "Oct 5, 2024" or "5 Oct 2024"
//   [Direction]      "To Swiggy" or "From Rahul"  (may be on same or next line)
//   [Amount]         "₹450.00"
//   [Status]         "Completed" / "Pending" / "Failed"
//   [UPI Ref]        "UPI transaction ID: 123456789012"  (optional)
//
// The actual format varies by GPay version. We parse line-by-line to be robust.
//
function parseGooglePayLines(lines: string[]): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  // Date patterns for GPay: "Oct 5, 2024", "5 Oct 2024", "October 5, 2024"
  const GPAY_DATE_RE = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})$|^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/;
  const AMOUNT_RE = /^[₹]?\s*([\d,]+(?:\.\d{1,2})?)$/;
  const INRIA_AMOUNT_RE = /₹\s*([\d,]+(?:\.\d{1,2})?)/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Check if this line is a date
    const dateMatch = line.match(GPAY_DATE_RE);
    if (!dateMatch) { i++; continue; }

    const dateStr = line;
    let desc = '';
    let amountStr = '';
    let status = '';
    let upiRef = '';
    let isDebit: boolean | null = null;

    // Scan next lines (up to 8) for direction/merchant, amount, status
    let j = i + 1;
    while (j < lines.length && j < i + 10) {
      const next = lines[j].trim();
      if (!next) { j++; continue; }

      // New date = new transaction, stop
      if (next.match(GPAY_DATE_RE)) break;

      // Direction line: "To Merchant Name" / "From Person"
      const toMatch = next.match(/^(?:To|Paid to|Sent to)\s+(.+)$/i);
      const fromMatch = next.match(/^(?:From|Received from)\s+(.+)$/i);
      if (toMatch && !desc) {
        desc = toMatch[1].trim();
        isDebit = true;
        j++; continue;
      }
      if (fromMatch && !desc) {
        desc = fromMatch[1].trim();
        isDebit = false;
        j++; continue;
      }

      // Amount line: "₹450.00" or "450.00"
      const amtMatchInline = next.match(INRIA_AMOUNT_RE);
      if (amtMatchInline && !amountStr) {
        amountStr = amtMatchInline[1].replace(/,/g, '');
        j++; continue;
      }
      const amtMatchPlain = next.match(/^([\d,]+(?:\.\d{1,2})?)$/);
      if (amtMatchPlain && !amountStr && parseFloat(amtMatchPlain[1].replace(/,/g, '')) > 0) {
        amountStr = amtMatchPlain[1].replace(/,/g, '');
        j++; continue;
      }

      // Status
      if (/^(Completed|Success|Successful|Pending|Failed|Refunded|Cancelled)$/i.test(next) && !status) {
        status = next;
        j++; continue;
      }

      // UPI reference
      const upiMatch = next.match(/(?:UPI\s+(?:transaction\s+)?ID|Ref(?:erence)?\s+(?:No|ID))[:\s]+([A-Za-z0-9]+)/i);
      if (upiMatch && !upiRef) {
        upiRef = upiMatch[1];
        j++; continue;
      }

      // If we haven't found desc yet and this line is just a name (not an amount/status)
      if (!desc && !/^[\d₹,\.]+$/.test(next) && next.length > 1 && next.length < 60) {
        // Merchant name might appear without "To/From" prefix in some GPay versions
        desc = next;
        j++; continue;
      }

      j++;
    }

    if (!amountStr) { i = j; continue; }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { i = j; continue; }

    // Failed transactions — keep them but mark
    const failed = /failed|cancelled/i.test(status);

    const rawNarration = [
      dateStr,
      isDebit !== null ? (isDebit ? `To ${desc}` : `From ${desc}`) : desc,
      `₹${amount}`,
      status,
      upiRef ? `UPI Ref: ${upiRef}` : '',
    ].filter(Boolean).join(' | ');

    txns.push({
      date: dateStr,
      description: desc || 'Google Pay Transaction',
      rawNarration,
      debit:   (isDebit !== false && !failed) ? amount : null,
      credit:  (isDebit === false && !failed) ? amount : null,
      balance: null,
    });

    i = j;
  }

  return txns;
}

// ── Generic Wallet PDF Pattern Parser (PhonePe / Paytm) ──────────────────────
function parseGenericWalletLines(lines: string[], provider: string): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  // PhonePe PDF format: rows like "DD MMM YYYY  Description  ₹Amount"
  const phonepePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+([^₹\n]+?)\s+(?:Paid|Received|Debited|Credited)?\s*₹\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let match;
  const fullText = lines.join('\n');

  while ((match = phonepePattern.exec(fullText)) !== null) {
    const dateStr = match[1].trim();
    const desc = match[2].trim();
    const amountStr = match[3].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    const context = fullText.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30).toLowerCase();
    const isDebit = context.includes('paid') || context.includes('debited') || context.includes('sent');

    txns.push({
      date: dateStr,
      description: desc,
      rawNarration: desc,
      debit: isDebit ? amount : null,
      credit: isDebit ? null : amount,
      balance: null,
    });
  }

  if (txns.length > 0) return txns;

  // Paytm PDF format: similar pattern with "Dr" / "Cr" markers
  const paytmPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([^\n]+?)\s+(Dr|Cr)\s+₹?\s*([\d,]+(?:\.\d{1,2})?)/gi;
  while ((match = paytmPattern.exec(fullText)) !== null) {
    const dateStr = match[1].trim();
    const desc = match[2].trim();
    const drCr = match[3].toUpperCase();
    const amount = parseFloat(match[4].replace(/,/g, ''));
    if (isNaN(amount)) continue;

    txns.push({
      date: dateStr,
      description: desc,
      rawNarration: desc,
      debit: drCr === 'DR' ? amount : null,
      credit: drCr === 'CR' ? amount : null,
      balance: null,
    });
  }

  return txns;
}

// ── PDF Wallet Parser (PhonePe / Paytm / Google Pay PDF exports) ─────────────
export async function parseWalletPDF(
  buffer: Buffer,
  filename?: string
): Promise<WalletParseResult> {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];

  let provider = 'Wallet';

  try {
    console.log('[FINOVA Wallet] Extracting text from PDF via unpdf, size:', buffer.length);
    const { text: allText, pages } = await extractTextFromPDF(buffer);
    const allLines = pages.flat();
    console.log('[FINOVA Wallet] Extracted', allText.length, 'chars,', allLines.length, 'lines from PDF');

    provider = detectProvider(allText, filename);
    console.log('[FINOVA Wallet] Detected provider:', provider);

    // ── Attempt provider-specific parsing ──────────────────────────────────
    let parsed: ParsedWalletTransaction[] = [];

    if (provider === 'Google Pay' || allText.toLowerCase().includes('google pay')) {
      parsed = parseGooglePayLines(allLines);
      console.log('[FINOVA Wallet] Google Pay line parser:', parsed.length, 'transactions');
    }

    if (parsed.length === 0) {
      parsed = parseGenericWalletLines(allLines, provider);
      console.log('[FINOVA Wallet] Generic wallet parser:', parsed.length, 'transactions');
    }

    if (parsed.length === 0) {
      warnings.push(
        `Could not extract transactions from this ${provider} PDF. The file format may not be supported. ` +
        `For best results, export transactions as CSV from the ${provider} app.`
      );
      // Include a debug preview to help diagnose
      warnings.push(`[DEBUG] First 20 lines of PDF: ${allLines.slice(0, 20).join(' | ')}`);
    }

    transactions.push(...parsed);
  } catch (err: any) {
    console.error('[FINOVA Wallet] PDF parsing error:', err?.message);
    console.error('[FINOVA Wallet] Stack:', err?.stack?.substring(0, 300));
    warnings.push(`PDF parsing error: ${err.message}`);
  }

  return { provider, transactions, warnings };
}
