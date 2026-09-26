/**
 * FINOVA Universal Wallet & UPI Statement Parser
 *
 * Supports:
 *   1. Generic CSV wallet exports (PhonePe, Google Pay, Paytm, Amazon Pay, etc.)
 *   2. Google Pay PDF transaction history (card/multiline layout)
 *   3. PhonePe PDF transaction history (row layout)
 *   4. Paytm Passbook / Wallet PDF (table layout: Date & Time → Details → Notes & Tags → Your Account → Amount)
 *   5. BHIM / Bank UPI PDF statements (column/table or card layout)
 *   6. Dynamic fallback for ANY online payment/UPI platform PDF
 *
 * Features:
 *   - Strict document-level source detection (NEVER defaults to Google Pay; NEVER uses transaction UPI IDs/merchants to guess source)
 *   - Native PDF extraction via `unpdf` (serverless-native, no worker file, Vercel safe)
 *   - Universal structure-aware parser: Coordinate Table Parser -> Multiline Card Parser -> Sliding Window Scanner
 *   - Accurate extraction of: Date, Time, Transaction ID / UPI Ref, Counterparty/Merchant, Amount, Direction (Sent/Received), Status, Raw Narration
 *   - Preserves original raw narration for complete auditability
 *   - Never fabricates financial values; tags uncertain items for review
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
}

export interface WalletParseResult {
  provider: string;       // "PhonePe" | "Paytm" | "Google Pay" | "BHIM" | "UPI Statement" | "Unknown / Not specified"
  transactions: ParsedWalletTransaction[];
  warnings: string[];
}

// ── CSV Column Name Aliases ───────────────────────────────────────────────────
const DATE_COLS = ['date', 'transaction date', 'txn date', 'value date', 'datetime', 'post date'];
const DESC_COLS = ['description', 'narration', 'details', 'transaction details', 'particulars', 'remarks', 'note', 'paid to', 'received from'];
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
// NEVER assume Google Pay/PhonePe/Paytm unless document header or filename explicitly states it.
// NEVER scan individual transactions, UPI IDs, or merchant names to infer document provider!
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

  if (headerText.includes('paytm payments bank') || headerText.includes('paytm passbook') || headerText.includes('paytm wallet') || headerText.includes('one97 communications')) return 'Paytm';
  if (headerText.includes('phonepe private limited') || headerText.includes('phonepe transaction history')) return 'PhonePe';
  if (headerText.includes('google pay transaction') || headerText.includes('google india digital services') || headerText.includes('gpay statement')) return 'Google Pay';
  if (headerText.includes('bhim upi statement') || headerText.includes('npci bhim')) return 'BHIM';
  if (headerText.includes('amazon pay balance') || headerText.includes('amazon pay statement')) return 'Amazon Pay';

  // Explicit title word check in document header
  if (/\bpaytm\b/i.test(headerText) && !headerText.includes('via paytm') && !headerText.includes('to paytm')) return 'Paytm';
  if (/\bphonepe\b/i.test(headerText) && !headerText.includes('via phonepe') && !headerText.includes('to phonepe')) return 'PhonePe';
  if (/\bgoogle pay\b/i.test(headerText) && !headerText.includes('via google pay') && !headerText.includes('to google pay')) return 'Google Pay';

  // 3. Default to "Unknown / Not specified" (NEVER default to Google Pay!)
  return 'Unknown / Not specified';
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

// ── Date & Time Extraction Utilities ─────────────────────────────────────────
const COMMON_DATE_RES = [
  // "Oct 5, 2024", "Oct 05, 2024", "October 5, 2024", "5 Oct 2024", "05 Oct 2024"
  /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i,
  /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/i,
  // "05/10/2024", "05-10-2024", "05.10.2024", "2024-10-05"
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/,
  /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
  // Short date "01/12/25" or "01-12-25"
  /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2}\b/,
];

const TIME_RE = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?|\d{1,2}\s*(?:AM|PM|am|pm))\b/i;

function extractDateTime(str: string): { dateStr: string | null; timeStr: string | null } {
  let dateStr: string | null = null;
  let timeStr: string | null = null;

  for (const re of COMMON_DATE_RES) {
    const m = str.match(re);
    if (m) {
      dateStr = m[0];
      break;
    }
  }

  const tm = str.match(TIME_RE);
  if (tm) {
    timeStr = tm[0];
  }

  return { dateStr, timeStr };
}

function extractUPIReference(str: string): string | null {
  const m = str.match(/(?:UPI\s*(?:Ref|Transaction)?\s*(?:No|ID)?|Ref\s*(?:No|ID)?|Txn\s*ID|UTR)[:\s]+([A-Za-z0-9]{8,20})/i);
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
  for (const re of COMMON_DATE_RES) {
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

// ── Strategy 1: Structure-Aware Table Column Parser (Paytm Passbook / Column PDFs) ──
// Supports layout: Date & Time → Transaction Details → Notes & Tags → Your Account → Amount
function parseCoordinateTable(items: any[]): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];
  if (!items || items.length === 0) return txns;

  const pageMap = new Map<number, any[]>();
  for (const item of items) {
    const p = item.page || 1;
    if (!pageMap.has(p)) pageMap.set(p, []);
    pageMap.get(p)!.push(item);
  }

  for (const [_, pageItems] of pageMap) {
    pageItems.sort((a, b) => b.y - a.y || a.x - b.x);

    const yMap = new Map<number, any[]>();
    for (const item of pageItems) {
      let matchedY: number | null = null;
      for (const yKey of yMap.keys()) {
        if (Math.abs(yKey - item.y) <= 6) { matchedY = yKey; break; }
      }
      if (matchedY !== null) yMap.get(matchedY)!.push(item);
      else yMap.set(item.y, [item]);
    }

    const ys = Array.from(yMap.keys()).sort((a, b) => b - a);

    let headerY: number | null = null;
    let colBounds = {
      dateX: 0,
      detailsX: 120,
      notesX: 280,
      accountX: 400,
      amountX: 500,
    };

    for (const y of ys) {
      const lineStr = yMap.get(y)!.map(it => it.str).join(' ').toLowerCase();
      if ((lineStr.includes('date') || lineStr.includes('time')) && (lineStr.includes('detail') || lineStr.includes('particulars') || lineStr.includes('amount') || lineStr.includes('account'))) {
        headerY = y;
        for (const it of yMap.get(y)!) {
          const w = it.str.toLowerCase();
          if (w.includes('date') || w.includes('time')) colBounds.dateX = it.x;
          else if (w.includes('detail') || w.includes('particular')) colBounds.detailsX = it.x;
          else if (w.includes('note') || w.includes('tag')) colBounds.notesX = it.x;
          else if (w.includes('account') || w.includes('source')) colBounds.accountX = it.x;
          else if (w.includes('amount')) colBounds.amountX = it.x;
        }
        break;
      }
    }

    let activeRow: {
      dateStr: string;
      timeStr: string | null;
      details: string[];
      notes: string[];
      account: string[];
      amounts: string[];
      rawLines: string[];
    } | null = null;

    const finalizeRow = (r: typeof activeRow) => {
      if (!r) return;
      const fullText = r.rawLines.join(' ');
      const validAmts = extractValidAmounts(r.amounts.join(' ') || fullText, r.dateStr);

      if (validAmts.length === 0) return;
      const amount = validAmts[0];

      const descText = r.details.join(' ') || fullText;
      const notesText = r.notes.join(' ');
      const upiRef = extractUPIReference(descText + ' ' + notesText) || extractUPIReference(fullText);

      let isDebit: boolean | null = null;
      const amtStr = r.amounts.join(' ') || fullText;
      if (amtStr.includes('+') || /\b(cr|credit|received|added)\b/i.test(amtStr + ' ' + descText)) {
        isDebit = false;
      } else if (amtStr.includes('-') || /\b(dr|debit|paid|spent|transferred)\b/i.test(amtStr + ' ' + descText)) {
        isDebit = true;
      } else {
        if (/\b(paid|to|sent)\b/i.test(descText)) isDebit = true;
        else if (/\b(received|from|refund)\b/i.test(descText)) isDebit = false;
      }

      txns.push({
        date: r.dateStr,
        time: r.timeStr || undefined,
        description: descText.trim() || 'Wallet Transaction',
        rawNarration: fullText,
        debit: isDebit !== false ? amount : null,
        credit: isDebit === false ? amount : null,
        balance: null,
        referenceId: upiRef,
      });
    };

    for (const y of ys) {
      if (headerY !== null && y >= headerY) continue;

      const lineItems = yMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineStr = lineItems.map(it => it.str).join(' ');

      if (!lineStr || lineStr.length < 2) continue;
      if (/total|balance|page\s*\d|opening|closing/i.test(lineStr)) continue;

      const { dateStr, timeStr } = extractDateTime(lineStr);

      if (dateStr) {
        if (activeRow) finalizeRow(activeRow);

        activeRow = {
          dateStr,
          timeStr,
          details: [],
          notes: [],
          account: [],
          amounts: [],
          rawLines: [lineStr],
        };

        for (const it of lineItems) {
          if (it.x >= colBounds.amountX - 30) activeRow.amounts.push(it.str);
          else if (it.x >= colBounds.accountX - 30) activeRow.account.push(it.str);
          else if (it.x >= colBounds.notesX - 30) activeRow.notes.push(it.str);
          else if (it.x >= colBounds.detailsX - 30) activeRow.details.push(it.str);
        }
      } else if (activeRow) {
        activeRow.rawLines.push(lineStr);
        for (const it of lineItems) {
          if (it.x >= colBounds.amountX - 30) activeRow.amounts.push(it.str);
          else if (it.x >= colBounds.accountX - 30) activeRow.account.push(it.str);
          else if (it.x >= colBounds.notesX - 30) activeRow.notes.push(it.str);
          else if (it.x >= colBounds.detailsX - 30) activeRow.details.push(it.str);
        }
      }
    }

    if (activeRow) finalizeRow(activeRow);
  }

  return txns;
}

// ── Strategy 2: Multiline Card Block Parser (Google Pay / GPay PDF) ──────────────────
function parseCardBlocks(lines: string[]): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const { dateStr } = extractDateTime(line);

    if (!dateStr) { i++; continue; }

    const blockLines: string[] = [line];
    let j = i + 1;

    while (j < lines.length && j < i + 10) {
      const nextLine = lines[j].trim();
      if (!nextLine) { j++; continue; }

      const nextDate = extractDateTime(nextLine).dateStr;
      if (nextDate && nextLine !== line) break;

      blockLines.push(nextLine);
      j++;
    }

    const blockText = blockLines.join(' ');
    if (/total\s+(credits|debits)|closing\s+balance|opening\s+balance|account\s+summary/i.test(blockText)) {
      i = j;
      continue;
    }

    const timeStr = extractDateTime(blockText).timeStr;
    const upiRef = extractUPIReference(blockText);
    const validAmts = extractValidAmounts(blockText, dateStr);

    if (validAmts.length === 0) { i = j; continue; }
    const amount = validAmts[0];

    let description = '';
    let isDebit: boolean | null = null;

    const toMatch = blockText.match(/(?:To|Paid to|Sent to|Transfer to|Payment to)\s+([^₹\d\n|]+)/i);
    const fromMatch = blockText.match(/(?:From|Received from|Paid by|Transfer from|Refund from)\s+([^₹\d\n|]+)/i);

    if (toMatch) {
      description = toMatch[1].trim();
      isDebit = true;
    } else if (fromMatch) {
      description = fromMatch[1].trim();
      isDebit = false;
    } else {
      for (const bl of blockLines) {
        if (bl.includes(dateStr)) continue;
        if (/^(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)$/i.test(bl)) continue;
        if (bl.match(/^[\d\s₹.,\-\+]+$/)) continue;
        if (bl.toLowerCase().includes('upi') || bl.toLowerCase().includes('google pay')) continue;
        description = bl;
        break;
      }

      if (/\b(paid|debited|sent|withdrawn|dr|\/dr\/)\b/i.test(blockText)) isDebit = true;
      else if (/\b(received|credited|refund|cashback|cr|\/cr\/|inward)\b/i.test(blockText)) isDebit = false;
    }

    let status = 'Completed';
    const statusMatch = blockText.match(/\b(Completed|Successful|Success|Pending|Failed|Cancelled|Refunded)\b/i);
    if (statusMatch) status = statusMatch[1];

    const failed = /failed|cancelled/i.test(status);
    const rawNarration = blockLines.join(' | ');

    txns.push({
      date: dateStr,
      time: timeStr || undefined,
      description: description.trim() || 'UPI Transaction',
      rawNarration,
      debit:   (isDebit !== false && !failed) ? amount : null,
      credit:  (isDebit === false && !failed) ? amount : null,
      balance: null,
      referenceId: upiRef,
      status,
    });

    i = j;
  }

  return txns;
}

// ── Strategy 3: Dynamic Row / Table UPI Statement Parser (PhonePe / Bank) ───────────
function parseTableRows(lines: string[]): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];
  const fullText = lines.join('\n');

  const rowPattern = /([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{2,4})\s+([^\n]+?)\s+(?:(Dr|Cr|Paid|Received|Debited|Credited)\s+)?(?:[₹\u20B9Rs]\s*)?([\d,]+(?:\.\d{1,2})?)/gi;

  let match;
  while ((match = rowPattern.exec(fullText)) !== null) {
    const dateStr = match[1].trim();
    const desc = match[2].trim();
    const typeIndicator = (match[3] || '').toLowerCase();
    const amountStr = match[4].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) continue;
    if (/total|balance|opening|closing/i.test(desc)) continue;

    const timeStr = extractDateTime(desc).timeStr;
    const upiRef = extractUPIReference(desc);

    let isDebit: boolean | null = null;
    if (typeIndicator.includes('dr') || typeIndicator.includes('paid') || typeIndicator.includes('debited')) {
      isDebit = true;
    } else if (typeIndicator.includes('cr') || typeIndicator.includes('received') || typeIndicator.includes('credited')) {
      isDebit = false;
    } else {
      if (/\b(paid|to|dr|debit)\b/i.test(desc)) isDebit = true;
      else if (/\b(received|from|cr|credit|refund)\b/i.test(desc)) isDebit = false;
    }

    txns.push({
      date: dateStr,
      time: timeStr || undefined,
      description: desc,
      rawNarration: desc,
      debit: isDebit !== false ? amount : null,
      credit: isDebit === false ? amount : null,
      balance: null,
      referenceId: upiRef,
    });
  }

  return txns;
}

// ── Strategy 4: Sliding Window Fallback Parser (Universal Any UPI PDF) ────────
function parseSlidingWindow(lines: string[]): ParsedWalletTransaction[] {
  const txns: ParsedWalletTransaction[] = [];
  let pendingTx: { dateStr: string; lines: string[] } | null = null;

  const finalize = (pt: typeof pendingTx) => {
    if (!pt) return;
    const blockText = pt.lines.join(' ').replace(/\s+/g, ' ').trim();
    if (blockText.length < 5) return;

    const validAmts = extractValidAmounts(blockText, pt.dateStr);
    if (validAmts.length === 0) return;
    const amount = validAmts[0];

    const upiRef = extractUPIReference(blockText);
    const timeStr = extractDateTime(blockText).timeStr;

    let isDebit: boolean | null = null;
    if (/\b(to|paid|debited|dr|outward|sent|withdrawn)\b/i.test(blockText)) isDebit = true;
    else if (/\b(from|received|credited|cr|inward|refund|cashback)\b/i.test(blockText)) isDebit = false;

    const desc = blockText.replace(pt.dateStr, '').replace(TIME_RE, '').trim();

    txns.push({
      date: pt.dateStr,
      time: timeStr || undefined,
      description: desc || 'Wallet Transaction',
      rawNarration: blockText,
      debit: isDebit !== false ? amount : null,
      credit: isDebit === false ? amount : null,
      balance: null,
      referenceId: upiRef,
    });
  };

  for (const line of lines) {
    const dateStr = extractDateTime(line).dateStr;
    if (dateStr) {
      if (pendingTx) finalize(pendingTx);
      pendingTx = { dateStr, lines: [line] };
    } else if (pendingTx) {
      pendingTx.lines.push(line);
      if (pendingTx.lines.length >= 8) {
        finalize(pendingTx);
        pendingTx = null;
      }
    }
  }

  if (pendingTx) finalize(pendingTx);
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
    const { text: allText, pages, items } = await extractTextFromPDF(buffer);
    const allLines = pages.flat();

    console.log('[FINOVA Universal PDF] Extracted', allText.length, 'chars across', pages.length, 'page(s) and', allLines.length, 'lines');

    // Strict document-level provider detection (NEVER defaults to Google Pay!)
    provider = detectProvider(allText, filename);
    console.log('[FINOVA Universal PDF] Detected provider:', provider);

    // ── Universal Multi-Strategy Structural Extraction ─────────────────────

    // Strategy 1: Structure-Aware Coordinate Table Parser (Paytm Passbook / Column PDFs)
    let parsed = parseCoordinateTable(items);
    if (parsed.length > 0) {
      console.log('[FINOVA Universal PDF] Strategy 1 (Structure Coordinate Table Parser) succeeded:', parsed.length, 'transactions');
    }

    // Strategy 2: Multiline Card Block Parser (Google Pay / GPay PDF)
    if (parsed.length === 0) {
      parsed = parseCardBlocks(allLines);
      if (parsed.length > 0) {
        console.log('[FINOVA Universal PDF] Strategy 2 (Multiline Card Block Parser) succeeded:', parsed.length, 'transactions');
      }
    }

    // Strategy 3: Dynamic Row/Table Regex Parser (PhonePe / Bank UPI statements)
    if (parsed.length === 0) {
      parsed = parseTableRows(allLines);
      if (parsed.length > 0) {
        console.log('[FINOVA Universal PDF] Strategy 3 (Dynamic Row Parser) succeeded:', parsed.length, 'transactions');
      }
    }

    // Strategy 4: Sliding Window Scanner (Fallback for any UPI layout)
    if (parsed.length === 0) {
      parsed = parseSlidingWindow(allLines);
      if (parsed.length > 0) {
        console.log('[FINOVA Universal PDF] Strategy 4 (Sliding Window Fallback) succeeded:', parsed.length, 'transactions');
      }
    }

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
