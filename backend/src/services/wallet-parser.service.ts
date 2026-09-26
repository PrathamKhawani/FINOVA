/**
 * FINOVA Universal Wallet & UPI Statement Parser v8
 *
 * Block-Based Format-Adaptive Extraction Pipeline:
 *  1. Strict Document-Level Source Detection (NEVER defaults to Google Pay; NEVER uses transaction UPI IDs/merchants to guess source).
 *  2. Statement Year Inference from Document Header (NEVER uses current year blindly for missing years; leaves dates intact if year is already present).
 *  3. Transaction Block Clustering (Anchor-Based: Date + Time -> Details -> Ref/Order ID -> Account -> Amount).
 *  4. Native PDF extraction via `unpdf` (serverless-native, no worker file, Vercel safe).
 *  5. Full audit preservation: exact dates, amounts, IDs, and raw narration.
 */

export interface ParsedWalletTransaction {
  date: string;
  time?: string;
  description: string;
  rawNarration: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  referenceId?: string | null;
  status?: string;
  account?: string;
}

export interface WalletParseResult {
  provider: string;       // "PhonePe" | "Paytm" | "Google Pay" | "BHIM" | "Unknown / Not specified"
  transactions: ParsedWalletTransaction[];
  warnings: string[];
}

// ── CSV Column Name Aliases ───────────────────────────────────────────────────
const DATE_COLS = ['date', 'transaction date', 'txn date', 'value date', 'datetime', 'post date'];
const DESC_COLS = ['description', 'narration', 'details', 'transaction description', 'particulars', 'remarks', 'note', 'paid to', 'received from'];
const DEBIT_COLS = ['debit', 'debit amount', 'amount (dr)', 'dr', 'withdrawn', 'paid', 'amount paid', 'spent'];
const CREDIT_COLS = ['credit', 'credit amount', 'amount (cr)', 'cr', 'deposited', 'received', 'amount received', 'refund'];
const AMOUNT_COLS = ['amount', 'txn amount', 'transaction amount', 'total amount'];
const TYPE_COLS = ['type', 'transaction type', 'txn type', 'dr/cr', 'direction'];
const BALANCE_COLS = ['balance', 'closing balance', 'available balance'];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function parseAmount(val: string | undefined | null): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  const cleaned = val.replace(/[₹\u20B9$£Rs,\s]/g, '').replace(/[()]/g, '').trim();
  if (!cleaned || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

// ── Strict Source Detection ───────────────────────────────────────────────────
function detectProvider(fullText: string, filename?: string): string {
  const fileLower = (filename || '').toLowerCase();

  // 1. Check filename for explicit provider name
  if (fileLower.includes('phonepe')) return 'PhonePe';
  if (fileLower.includes('paytm')) return 'Paytm';
  if (fileLower.includes('gpay') || fileLower.includes('googlepay') || fileLower.includes('google_pay')) return 'Google Pay';
  if (fileLower.includes('bhim')) return 'BHIM';
  if (fileLower.includes('amazonpay') || fileLower.includes('amazon_pay')) return 'Amazon Pay';
  if (fileLower.includes('mobikwik')) return 'MobiKwik';
  if (fileLower.includes('freecharge')) return 'FreeCharge';

  // 2. Check ONLY document header / first 15 lines (document-level title/branding)
  const lines = fullText.split(/\r?\n/).slice(0, 15);
  const headerText = lines.join(' ').toLowerCase();

  if (headerText.includes('paytm payments bank') || headerText.includes('paytm passbook') || headerText.includes('paytm wallet') || headerText.includes('one97 communications') || headerText.includes('paytm')) return 'Paytm';
  if (headerText.includes('phonepe private limited') || headerText.includes('phonepe transaction history') || headerText.includes('phonepe')) return 'PhonePe';
  if (headerText.includes('google pay transaction') || headerText.includes('google india digital services') || headerText.includes('gpay statement') || headerText.includes('google pay')) return 'Google Pay';
  if (headerText.includes('bhim upi statement') || headerText.includes('npci bhim') || headerText.includes('bhim')) return 'BHIM';
  if (headerText.includes('amazon pay balance') || headerText.includes('amazon pay statement') || headerText.includes('amazon pay')) return 'Amazon Pay';

  // 3. Default to "Unknown / Not specified" (NEVER default to Google Pay!)
  return 'Unknown / Not specified';
}

// ── Year Inference from Document Header ───────────────────────────────────────
function detectStatementYear(lines: string[]): string | null {
  const headerLines = lines.slice(0, 30);
  const headerText = headerLines.join(' ');

  const rangeMatch = headerText.match(/\b(202[0-9])\b/);
  if (rangeMatch) {
    return rangeMatch[1];
  }
  return null;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
export function parseWalletCSV(
  content: string,
  filename?: string
): WalletParseResult {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];
  const provider = detectProvider(content, filename);

  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { provider, transactions: [], warnings: ['CSV file is empty or has only headers'] };
  }

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
      debit = parseAmount(row[colIdx.debit] || '');
      credit = parseAmount(row[colIdx.credit] || '');
    } else if (colIdx.amount >= 0) {
      const rawAmount = parseAmount(row[colIdx.amount] || '');
      const typeStr = colIdx.type >= 0 ? (row[colIdx.type] || '').toLowerCase() : '';

      if (typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('paid') || typeStr.includes('withdrawn')) {
        debit = rawAmount;
      } else if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('received')) {
        credit = rawAmount;
      } else {
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
    warnings.push('No valid transactions found in CSV.');
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
  // Full dates: "27/03/2025", "27-03-2025", "01/12/25", "Oct 5, 2024", "5 Oct 2024"
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
  /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
  /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/i,
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}\b/i,
  // Date without year: "27 Mar", "27 March", "27-Mar"
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

function extractUPIReference(str: string): string | null {
  const m = str.match(/(?:UPI\s*(?:Ref|Transaction)?\s*(?:No|ID)?|Ref\s*(?:No|ID)?|Txn\s*ID|Order\s*ID|UTR)[:\s]+([A-Za-z0-9]{8,24})/i);
  if (m) return m[1];

  const upiPath = str.match(/UPI\/([0-9]{8,14})/i);
  if (upiPath) return upiPath[1];

  const standalone12 = str.match(/\b\d{10,14}\b/);
  if (standalone12) return standalone12[0];

  return null;
}

function extractValidAmounts(text: string, dateStr?: string | null): number[] {
  let cleanedText = text;
  if (dateStr) {
    cleanedText = cleanedText.replace(new RegExp(dateStr.replace(/[\/\-\.]/g, '\\$&'), 'g'), '');
  }
  for (const re of DATE_ANCHOR_RES) {
    cleanedText = cleanedText.replace(new RegExp(re.source, 'gi'), '');
  }
  cleanedText = cleanedText.replace(TIME_RE, '');
  cleanedText = cleanedText.replace(/\b[A-Za-z0-9\/_-]{6,}\b/gi, '');

  const amtMatches = cleanedText.match(/(?:[₹\u20B9$£Rs]\s*)?\b(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{1,2}\b|(?:[₹\u20B9$£Rs]\s*)?\b(?:\d{1,3}(?:,\d{3})+)\b|(?:[₹\u20B9$£Rs]\s*)\b(?:\d{1,3}(?:,\d{3})*|\d+)\b/g) || [];
  const validAmts: number[] = [];

  for (const raw of amtMatches) {
    const val = raw.replace(/[₹\u20B9$£Rs,\s]/g, '');
    if (!val || val === '-') continue;
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      validAmts.push(num);
    }
  }

  return validAmts;
}

// ── Transaction Block Parser (Paytm, Google Pay, PhonePe, BHIM) ───────────────
// Groups vertical lines into a single transaction block:
// DATE + TIME -> details -> ref/order ID -> notes -> account -> amount
function parseTransactionBlocks(lines: string[], statementYear: string | null): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const dateAnchor = extractDateAnchor(line);

    if (!dateAnchor) { i++; continue; }

    const blockLines: string[] = [line];
    let j = i + 1;

    while (j < lines.length && j < i + 12) {
      const nextLine = lines[j].trim();
      if (!nextLine) { j++; continue; }

      const nextDate = extractDateAnchor(nextLine);
      if (nextDate && nextLine !== line) break;

      if (/page\s*\d|closing\s*balance|opening\s*balance|total\s+(credits|debits)|statement\s*summary/i.test(nextLine)) {
        break;
      }

      blockLines.push(nextLine);
      j++;
    }

    const blockText = blockLines.join(' ');
    if (/closing\s*balance|opening\s*balance|total\s+(credits|debits)|account\s*summary/i.test(blockText)) {
      i = j;
      continue;
    }

    let dateStr = dateAnchor;
    // Derive missing year ONLY if dateStr has no 2-digit or 4-digit year already (NEVER use current year blindly!)
    if (!/\d{2,4}$/.test(dateStr) && !/\b202[0-9]\b/.test(dateStr) && statementYear) {
      dateStr = `${dateStr} ${statementYear}`;
    }

    const timeStr = extractTime(blockText);
    const validAmts = extractValidAmounts(blockText, dateAnchor);

    if (validAmts.length === 0) { i = j; continue; }
    const amount = validAmts[0];

    // Determine direction (+ / - or Dr / Cr or Paid / Received)
    let isDebit: boolean | null = null;
    if (/[\-]\s*(?:[₹\u20B9$£Rs]\s*)?\d+/i.test(blockText) || /\b(paid|spent|debited|sent|to|withdrawn|dr)\b/i.test(blockText)) {
      isDebit = true;
    } else if (/[+]\s*(?:[₹\u20B9$£Rs]\s*)?\d+/i.test(blockText) || /\b(received|credited|added|from|refund|cashback|cr)\b/i.test(blockText)) {
      isDebit = false;
    }

    // Extract Details / Description / Merchant
    let description = '';
    const toMatch = blockText.match(/(?:To|Paid to|Sent to|Transfer to|Payment to)\s+([^₹\d\n|]+)/i);
    const fromMatch = blockText.match(/(?:From|Received from|Paid by|Transfer from|Refund from)\s+([^₹\d\n|]+)/i);

    if (toMatch) description = toMatch[1].trim();
    else if (fromMatch) description = fromMatch[1].trim();
    else {
      for (const bl of blockLines) {
        if (bl.includes(dateAnchor)) continue;
        if (TIME_RE.test(bl)) continue;
        if (/^[+\-]?\s*(?:[₹\u20B9$£Rs]\s*)?[\d.,\s]+$/i.test(bl)) continue;
        if (/^(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)$/i.test(bl)) continue;
        description = bl;
        break;
      }
    }

    // Extract Account / Source Instrument (e.g., Kotak Mahindra Bank - 13, Paytm Wallet)
    let accountStr = '';
    const accMatch = blockText.match(/\b([A-Za-z\s]+Bank\s*(?:-\s*\d+)?|Paytm\s*Wallet|Google\s*Pay|PhonePe\s*Wallet)\b/i);
    if (accMatch) accountStr = accMatch[0];

    const upiRef = extractUPIReference(blockText);

    let status = 'Completed';
    const statusMatch = blockText.match(/\b(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)\b/i);
    if (statusMatch) status = statusMatch[1];
    const failed = /failed|cancelled/i.test(status);

    const rawNarration = blockLines.join(' | ');

    txns.push({
      date: dateStr,
      time: timeStr || undefined,
      description: description.trim() || 'Wallet Transaction',
      rawNarration,
      debit: (isDebit !== false && !failed) ? amount : null,
      credit: (isDebit === false && !failed) ? amount : null,
      balance: null,
      referenceId: upiRef,
      status,
      account: accountStr || undefined,
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
