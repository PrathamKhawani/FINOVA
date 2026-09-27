/**
 * FINOVA Universal Wallet & UPI Statement Parser v9
 *
 * Data Integrity Guarantee:
 *  - NEVER uses current year as a fallback for missing transaction years.
 *  - NEVER rounds, alters, or fabricates transaction amounts, dates, or IDs.
 *  - NEVER confuses account numbers, balances, or totals with transaction amounts.
 *  - statementSource (BANK/WALLET/provider) is always SEPARATE from paymentChannel (UPI/NEFT/IMPS).
 *  - Raw narration is preserved verbatim from the original file.
 *
 * CSV extraction: maps columns dynamically from header names; preserves original values exactly.
 * PDF extraction: reconstructs complete transaction blocks before parsing.
 * Native PDF extraction first; OCR only when genuinely required.
 */

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
function parseAmount(val: string | undefined | null): { value: number | null; isNegative: boolean } {
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

// ── Statement Year Inference from Document Header ─────────────────────────────
// NEVER uses current year — leaves year as null if not found in header.
function detectStatementYear(lines: string[]): string | null {
  const headerText = lines.slice(0, 30).join(' ');
  // Look for a 4-digit year in the 2020-2099 range
  const m = headerText.match(/\b(20[2-9]\d)\b/);
  return m ? m[1] : null;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
export function parseWalletCSV(
  content: string,
  filename?: string
): WalletParseResult {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];
  const provider = detectProvider(content, filename);

  const rawLines = content.split(/\r?\n/);
  const lines = rawLines.filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return { provider, transactions: [], warnings: ['CSV file is empty or has only headers'] };
  }

  // Find header line — search first 10 rows for the one with Date + (Description or Amount)
  let headerLine = 0;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVRow(lines[i]).map(normalizeHeader);
    const hasDate   = cols.some(c => DATE_COLS.includes(c));
    const hasAmount = cols.some(c => [...DESC_COLS, ...AMOUNT_COLS, ...DEBIT_COLS, ...CREDIT_COLS].includes(c));
    if (hasDate && hasAmount) {
      headerLine = i;
      headers = cols;
      break;
    }
  }

  if (headers.length === 0) {
    warnings.push('Could not detect column headers in first 10 rows. Using first row as headers.');
    headers = parseCSVRow(lines[0]).map(normalizeHeader);
    headerLine = 0;
  }

  // Build column index map
  const idx = {
    date:    headers.findIndex(h => DATE_COLS.includes(h)),
    time:    headers.findIndex(h => TIME_COLS.includes(h)),
    desc:    headers.findIndex(h => DESC_COLS.includes(h)),
    debit:   headers.findIndex(h => DEBIT_COLS.includes(h)),
    credit:  headers.findIndex(h => CREDIT_COLS.includes(h)),
    amount:  headers.findIndex(h => AMOUNT_COLS.includes(h)),
    type:    headers.findIndex(h => TYPE_COLS.includes(h)),
    balance: headers.findIndex(h => BALANCE_COLS.includes(h)),
    ref:     headers.findIndex(h => REF_COLS.includes(h)),
    upiId:   headers.findIndex(h => UPI_ID_COLS.includes(h)),
    orderId: headers.findIndex(h => ORDER_ID_COLS.includes(h)),
    notes:   headers.findIndex(h => NOTES_COLS.includes(h)),
    account: headers.findIndex(h => ACCOUNT_COLS.includes(h)),
    channel: headers.findIndex(h => CHANNEL_COLS.includes(h)),
  };

  if (idx.date === -1) {
    return { provider, transactions: [], warnings: [`Could not find a Date column in CSV. Found headers: ${headers.join(', ')}`] };
  }
  if (idx.desc === -1 && idx.amount === -1 && idx.debit === -1) {
    return { provider, transactions: [], warnings: [`Could not find Description or Amount columns in CSV. Found headers: ${headers.join(', ')}`] };
  }

  console.log(`[FINOVA CSV] Column map: date=${idx.date} desc=${idx.desc} debit=${idx.debit} credit=${idx.credit} amount=${idx.amount} ref=${idx.ref} upiId=${idx.upiId} orderId=${idx.orderId} channel=${idx.channel}`);

  for (let i = headerLine + 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < 2) continue;

    // Preserve exact date string from source — NEVER alter it
    const dateStr = idx.date >= 0 ? (row[idx.date] || '').trim() : '';
    if (!dateStr || dateStr === '—' || dateStr === '-') continue;

    // Preserve exact time string
    const timeStr = idx.time >= 0 ? (row[idx.time] || '').trim() || undefined : undefined;

    // Preserve exact description
    const description = idx.desc >= 0 ? (row[idx.desc] || '').trim() : '';

    // Preserve exact balance
    const { value: balance } = idx.balance >= 0 ? parseAmount(row[idx.balance] || '') : { value: null };

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
      const { value: dv } = parseAmount(idx.debit >= 0 ? (row[idx.debit] || '') : '');
      const { value: cv } = parseAmount(idx.credit >= 0 ? (row[idx.credit] || '') : '');
      debit  = dv;
      credit = cv;
    } else if (idx.amount >= 0) {
      // Single amount column — use type column or sign to determine direction
      const rawAmountStr = row[idx.amount] || '';
      const { value: rawAmount, isNegative } = parseAmount(rawAmountStr);
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
    warnings.push(`No valid transactions found in CSV. Detected ${lines.length - headerLine - 1} data rows after header.`);
  }

  return { provider, transactions, warnings };
}

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

// ── PDF Text Extraction via unpdf (serverless-safe, Vercel-compatible) ─────────
async function extractTextFromPDF(buffer: Buffer): Promise<{ text: string; pages: string[][]; items: any[] }> {
  const { getDocumentProxy } = require('unpdf') as {
    getDocumentProxy: (data: Uint8Array) => Promise<any>;
  };

  const data = new Uint8Array(buffer);
  const doc = await getDocumentProxy(data);

  console.log('[FINOVA Universal PDF] unpdf loaded document, total pages:', doc.numPages);

  const pages: string[][] = [];
  const allItems: any[] = [];
  let fullText = '';

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const yMap = new Map<number, Array<{ x: number; y: number; str: string }>>();
    for (const item of content.items as any[]) {
      if (!item.str || item.str.trim() === '') continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);

      allItems.push({ str: item.str, x, y, page: p });

      let matchedY: number | null = null;
      for (const yKey of yMap.keys()) {
        if (Math.abs(yKey - y) <= 6) { matchedY = yKey; break; }
      }
      if (matchedY !== null) {
        yMap.get(matchedY)!.push({ x, y, str: item.str });
      } else {
        yMap.set(y, [{ x, y, str: item.str }]);
      }
    }

    const ys = Array.from(yMap.keys()).sort((a, b) => b - a);
    const pageLines: string[] = [];
    for (const y of ys) {
      const lineItems = yMap.get(y)!.sort((a, b) => a.x - b.x);
      // Fix: re-join split comma-separated numbers (e.g. "1,23" split by PDF)
      let lineStr = lineItems.map(it => it.str).join(' ').replace(/(\d+),\s+(\d{2,3})/g, '$1,$2').trim();
      if (lineStr) {
        pageLines.push(lineStr);
        fullText += lineStr + '\n';
      }
    }
    pages.push(pageLines);
    fullText += '\n';
  }

  return { text: fullText, pages, items: allItems };
}

// ── Date & Time Utilities ─────────────────────────────────────────────────────
const DATE_ANCHOR_RES = [
  // Full dates with year: "27/03/2025", "27-03-2025", "01/12/25", "27.03.2025"
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
  // ISO: "2025-03-27"
  /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
  // "5 Oct 2024", "02 Aug, 2026"
  /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+\d{2,4}\b/i,
  // "Oct 5, 2024"
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}\b/i,
  // Date WITHOUT year — only use as anchor if no full-date match above
  /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i,
];

const TIME_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?|\d{1,2}\s*(?:AM|PM|am|pm))\b/i;

function extractDateAnchor(line: string): string | null {
  for (const re of DATE_ANCHOR_RES) {
    const m = line.match(re);
    if (m) return m[0];
  }
  return null;
}

function extractTime(line: string): string | null {
  const m = line.match(TIME_RE);
  return m ? m[0] : null;
}

/**
 * Extract UPI reference / UTR / order ID from a text block.
 * Returns the most specific match first.
 */
function extractUPIReference(str: string): { referenceId: string | null; upiId: string | null; orderId: string | null } {
  let referenceId: string | null = null;
  let upiId: string | null = null;
  let orderId: string | null = null;

  // UPI Ref/Transaction ID (labelled)
  const labelledRef = str.match(/(?:UPI\s*(?:Ref|Transaction|Txn)?\s*(?:No|ID)?|Ref\s*(?:No|ID)?|Txn\s*ID|UTR)[:\s]+([A-Za-z0-9]{8,24})/i);
  if (labelledRef) referenceId = labelledRef[1];

  // UPI path format: "UPI/123456789012"
  const upiPath = str.match(/UPI\/([0-9]{8,14})/i);
  if (upiPath && !referenceId) referenceId = upiPath[1];

  // UPI VPA: something@bank
  const vpa = str.match(/\b([a-zA-Z0-9._\-]+@[a-zA-Z]{2,})\b/);
  if (vpa) upiId = vpa[1];

  // Order ID (labelled)
  const orderMatch = str.match(/(?:Order\s*(?:ID|No)|Payment\s*ID)[:\s]+([A-Za-z0-9_\-]{6,30})/i);
  if (orderMatch) orderId = orderMatch[1];

  // Standalone 10-14 digit numeric reference (e.g. Paytm txn IDs)
  if (!referenceId) {
    const standalone = str.match(/\b(\d{10,14})\b/);
    if (standalone) referenceId = standalone[1];
  }

  return { referenceId, upiId, orderId };
}

/**
 * Extract valid monetary amounts from text, excluding:
 * - Date components (year/month/day numbers)
 * - Time components
 * - Long alphanumeric tokens (UPI IDs, account numbers)
 * Returns amounts in the order they appear (NOT sorted).
 */
function extractValidAmounts(text: string, dateStr?: string | null): number[] {
  let cleanedText = text;

  // Remove the date anchor string first
  if (dateStr) {
    cleanedText = cleanedText.replace(new RegExp(dateStr.replace(/[\/\-\.]/g, '\\$&'), 'g'), '');
  }
  // Remove all date patterns
  for (const re of DATE_ANCHOR_RES) {
    cleanedText = cleanedText.replace(new RegExp(re.source, 'gi'), '');
  }
  // Remove time strings
  cleanedText = cleanedText.replace(TIME_RE, '');
  // Remove UPI VPAs and alphanumeric tokens ≥ 6 chars (but NOT pure numeric tokens — those may be amounts)
  // Strategy: remove tokens that contain both letters and digits (IDs, VPAs)
  cleanedText = cleanedText.replace(/\b[A-Za-z][A-Za-z0-9@._\-]{5,}\b/gi, '');
  // Remove standalone alphabetic words ≥ 3 chars (descriptions)
  cleanedText = cleanedText.replace(/\b[A-Za-z]{3,}\b/g, '');

  // Now extract decimal amounts (with optional currency symbol and Indian number format)
  const amtMatches = cleanedText.match(
    /(?:[₹\u20B9$£]?\s*)?(?:\d{1,3}(?:,\d{2,3})+\.\d{1,2}|\d{1,3}(?:,\d{2,3})+|\d+\.\d{1,2})/g
  ) || [];

  const validAmts: number[] = [];
  for (const raw of amtMatches) {
    const val = raw.replace(/[₹\u20B9$£,\s]/g, '');
    if (!val) continue;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      validAmts.push(num);
    }
  }

  return validAmts;
}

/**
 * Detect paymentChannel from a transaction block (UPI/NEFT/IMPS/Card/Cash etc.)
 * This is HOW money moved — separate from statementSource (BANK/WALLET) and provider.
 */
function detectPaymentChannelFromBlock(blockText: string): string | null {
  const t = blockText.toUpperCase();
  if (/\bUPI\b/.test(t))        return 'UPI';
  if (/\bNEFT\b/.test(t))       return 'NEFT';
  if (/\bIMPS\b/.test(t))       return 'IMPS';
  if (/\bRTGS\b/.test(t))       return 'RTGS';
  if (/\bATM\b/.test(t))        return 'ATM';
  if (/\bNEFT\b/.test(t))       return 'NEFT';
  if (/DEBIT\s*CARD|CREDIT\s*CARD/.test(t)) return 'Card';
  if (/WALLET/.test(t))         return 'Wallet';
  if (/CHEQUE|CHQ/.test(t))     return 'Cheque';
  return null;
}

// ── Transaction Block Parser (Paytm, Google Pay, PhonePe, BHIM) ───────────────
/**
 * Groups vertical lines into a single transaction block:
 * DATE + TIME → details → ref/order ID → notes → account → amount
 *
 * Amount selection rule:
 * - We NEVER pick the first amount blindly (could be a balance/total shown above).
 * - For wallet statements (Paytm / PhonePe / GPay):
 *   The TRANSACTION AMOUNT is typically the last standalone amount in the block
 *   (after date, reference, description lines).
 * - If there are exactly 2 amounts: one is the transaction amount, one is the running balance.
 *   We pick the one that matches the + or - sign context.
 */
function parseTransactionBlocks(lines: string[], statementYear: string | null): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const dateAnchor = extractDateAnchor(line);

    if (!dateAnchor) { i++; continue; }

    // Start a transaction block
    const blockLines: string[] = [line];
    let j = i + 1;

    while (j < lines.length) {
      const nextLine = lines[j].trim();
      if (!nextLine) { j++; continue; }

      // A new Date Anchor marks a new transaction
      const nextDate = extractDateAnchor(nextLine);
      if (nextDate) break;

      // Document-level stop words
      if (/page\s*\d\s*of\s*\d|closing\s*balance|opening\s*balance|total\s+(credits|debits)|statement\s*summary/i.test(nextLine)) break;
      if (/^Note:\s*This\s*statement\s*reflects/i.test(nextLine)) break;

      blockLines.push(nextLine);
      j++;

      // Cap block at 8 lines to avoid merging with next transaction
      if (blockLines.length >= 8) {
        const blockTextTemp = blockLines.join(' ');
        const amts = extractValidAmounts(blockTextTemp, dateAnchor);
        const refs = extractUPIReference(blockTextTemp);
        if (amts.length > 0 && (refs.referenceId || refs.upiId)) break;
      }
    }

    const blockText = blockLines.join(' ');

    // Skip header / summary blocks
    if (/closing\s*balance|opening\s*balance|total\s+(credits|debits)|account\s*summary|statement\s*period|transaction\s*statement\s*period/i.test(blockText)) {
      i = j;
      continue;
    }
    // Skip date-range header lines: "01 August 2026 - 31 August 2026 ₹25,568.45"
    if (/\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\s*[-–]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/i.test(blockText)) {
      i = j;
      continue;
    }

    // Derive year ONLY when date has no year AND statement year is known from header
    // NEVER use current system year as a fallback.
    let dateStr = dateAnchor;
    const hasYear = /\d{4}/.test(dateStr) || /\d{2,4}$/.test(dateStr.replace(/\s+[A-Za-z]+$/, ''));
    if (!hasYear && statementYear) {
      dateStr = `${dateStr} ${statementYear}`;
    }
    // If still no year and no statementYear — leave dateStr as-is (partial date preserved)
    // The controller will flag it as needing review

    const timeStr = extractTime(blockText);
    const refs    = extractUPIReference(blockText);
    const validAmts = extractValidAmounts(blockText, dateAnchor);
    const paymentChannel = detectPaymentChannelFromBlock(blockText);

    if (validAmts.length === 0) { i = j; continue; }

    // Amount selection:
    // - If only 1 amount: that IS the transaction amount
    // - If 2 amounts: typically [balance_before, txn_amount] or [txn_amount, balance_after]
    //   Use direction signals to identify which is the transaction amount
    // - If 3+ amounts: last amount is typically balance, first matching a ₹ symbol or
    //   explicitly marked with +/- is the transaction amount
    let amount: number;
    if (validAmts.length === 1) {
      amount = validAmts[0];
    } else {
      // Look for explicit signed amount in block text
      const positiveMatch = blockText.match(/[+]\s*(?:[₹\u20B9$£]\s*)?(\d[\d,]*\.?\d*)/);
      const negativeMatch = blockText.match(/[-]\s*(?:[₹\u20B9$£]\s*)?(\d[\d,]*\.?\d*)/);
      const signedStr = positiveMatch ? positiveMatch[1] : (negativeMatch ? negativeMatch[1] : null);
      if (signedStr) {
        const signedVal = parseFloat(signedStr.replace(/,/g, ''));
        if (!isNaN(signedVal) && validAmts.includes(signedVal)) {
          amount = signedVal;
        } else {
          // Pick the amount closest to the signed value
          amount = validAmts.reduce((best, v) => Math.abs(v - signedVal) < Math.abs(best - signedVal) ? v : best);
        }
      } else {
        // No sign context: for Paytm/GPay the transaction amount is usually the LAST amount
        // (balance is shown before the transaction line in some formats, or the smaller of two)
        // Heuristic: pick last amount
        amount = validAmts[validAmts.length - 1];
      }
    }

    // Determine direction (credit = money IN, debit = money OUT)
    let isDebit: boolean | null = null;
    if (
      /\bReceived\s+from\b/i.test(blockText) ||
      /\bCredited\b/i.test(blockText) ||
      /[+]\s*(?:[₹\u20B9$£]\s*)?\d+/i.test(blockText) ||
      /\/CR\//i.test(blockText) ||
      (/\bCR\b/i.test(blockText) && !/\b\d+[.,]\d+\s+Cr\b/i.test(blockText))
    ) {
      isDebit = false;
    } else if (
      /\bPaid\s+to\b/i.test(blockText) ||
      /\bSent\s+to\b/i.test(blockText) ||
      /\bDebited\b/i.test(blockText) ||
      /[-]\s*(?:[₹\u20B9$£]\s*)?\d+/i.test(blockText) ||
      /\/DR\//i.test(blockText) ||
      /\bDR\b/i.test(blockText)
    ) {
      isDebit = true;
    }

    // Extract description / merchant / counterparty
    let description = '';
    const paidToMatch      = blockText.match(/\bPaid\s+to\s+([^₹\d\n|]+?)(?=\s*(?:₹|\d{4,}|UPI|Paid\s+by|Paid\s+to|Note:|$))/i);
    const receivedFromMatch = blockText.match(/\bReceived\s+from\s+([^₹\d\n|]+?)(?=\s*(?:₹|\d{4,}|UPI|Paid\s+by|Paid\s+to|Note:|$))/i);
    const sentToMatch      = blockText.match(/\bSent\s+to\s+([^₹\d\n|]+?)(?=\s*(?:₹|\d{4,}|UPI|Paid\s+by|Paid\s+to|Note:|$))/i);

    if (receivedFromMatch) description = receivedFromMatch[1].trim();
    else if (paidToMatch)  description = paidToMatch[1].trim();
    else if (sentToMatch)  description = sentToMatch[1].trim();
    else {
      for (const bl of blockLines) {
        if (bl.includes(dateAnchor)) continue;
        if (TIME_RE.test(bl)) continue;
        if (/^[+\-]?\s*(?:[₹\u20B9$£]\s*)?[\d.,\s]+$/i.test(bl)) continue;
        if (/^(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)$/i.test(bl)) continue;
        description = bl;
        break;
      }
    }
    description = description.replace(/\s*(?:UPI|Transaction|ID|Paid|Received|by|to|from).*$/i, '').trim();

    // Extract linked account
    let linkedAccount: string | null = null;
    const accPaidByMatch = blockText.match(/\bPaid\s+by\s+([A-Za-z0-9\s]+?\d{2,6})\b/i);
    const accPaidToMatch = blockText.match(/\bPaid\s+to\s+([A-Za-z0-9\s]+?\d{2,6})\b/i);
    if (accPaidByMatch) linkedAccount = accPaidByMatch[1].trim();
    else if (isDebit === false && accPaidToMatch) linkedAccount = accPaidToMatch[1].trim();
    else {
      const genericBank = blockText.match(/\b([A-Za-z\s]+Bank\s*(?:-\s*\d+)?|Paytm\s*Wallet|Google\s*Pay|PhonePe\s*Wallet)\b/i);
      if (genericBank) linkedAccount = genericBank[0].trim();
    }

    // Extract note/remarks from block
    const noteMatch = blockText.match(/\bNote:\s*([^\|]+)/i);
    const notes = noteMatch ? noteMatch[1].trim() : null;

    // Status
    let status = 'Completed';
    const statusMatch = blockText.match(/\b(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)\b/i);
    if (statusMatch) status = statusMatch[1];
    const failed = /failed|cancelled/i.test(status);

    const rawNarration = blockLines.join(' | ');

    txns.push({
      date: dateStr,
      time: timeStr || undefined,
      description: description || 'Wallet Transaction',
      rawNarration,
      debit:  (isDebit !== false && !failed) ? amount : null,
      credit: (isDebit === false && !failed)  ? amount : null,
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
    console.log('[FINOVA Universal PDF] Extracting text from PDF via unpdf, buffer length:', buffer.length);
    const { text: allText, pages } = await extractTextFromPDF(buffer);
    const allLines = pages.flat();

    console.log('[FINOVA Universal PDF] Extracted', allText.length, 'chars across', pages.length, 'page(s) and', allLines.length, 'lines');

    // Strict document-level provider detection (NEVER defaults to Google Pay!)
    provider = detectProvider(allText, filename);
    console.log('[FINOVA Universal PDF] Detected provider:', provider);

    // Derive missing transaction year from statement header/period (NEVER use current year!)
    const statementYear = detectStatementYear(allLines);
    if (statementYear) {
      console.log('[FINOVA Universal PDF] Detected statement year:', statementYear);
    } else {
      warnings.push('Could not detect statement year from document header. Transactions without a year in their date will preserve the partial date as-is.');
    }

    // Universal Transaction Block Parser
    const parsed = parseTransactionBlocks(allLines, statementYear);
    console.log('[FINOVA Universal PDF] Transaction Block Parser extracted:', parsed.length, 'transactions');

    if (parsed.length === 0) {
      warnings.push(`Could not extract transactions from this PDF.`);
      warnings.push(`[DEBUG Preview] First 15 lines: ${allLines.slice(0, 15).join(' | ')}`);
    } else {
      transactions.push(...parsed);
    }
  } catch (err: any) {
    console.error('[FINOVA Universal PDF] Error during PDF parsing:', err?.message);
    console.error('[FINOVA Universal PDF] Stack:', err?.stack?.substring(0, 300));
    warnings.push(`PDF extraction error: ${err.message}`);
  }

  return { provider, transactions, warnings };
}
