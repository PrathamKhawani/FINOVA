/**
 * FINOVA Wallet Statement Parser
 *
 * Supports:
 *   1. Generic CSV wallet export (PhonePe, Google Pay, Paytm CSV downloads)
 *   2. PhonePe PDF Transaction History
 *   3. Paytm Passbook PDF
 *
 * Returns the same ParsedTransaction[] format as pdf-parser.service.ts
 * so the unified pipeline (categorize → store) requires zero changes.
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

// ── PDF Wallet Parser (PhonePe / Paytm PDF exports) ──────────────────────────
// These PDFs have a recognizable table structure — we extract text and parse rows
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

export async function parseWalletPDF(
  buffer: Buffer,
  filename?: string
): Promise<WalletParseResult> {
  const warnings: string[] = [];
  const transactions: ParsedWalletTransaction[] = [];

  let provider = 'Wallet';
  let allText = '';

  try {
    const data = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true } as any).promise;

    const textLines: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      textLines.push(pageText);
      allText += pageText + '\n';
    }

    provider = detectProvider(allText, filename);

    // PhonePe PDF format: rows like "DD MMM YYYY  Description  ₹Amount"
    const phonepePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s+([^₹\n]+?)\s+(?:Paid|Received|Debited|Credited)?\s*₹\s*([\d,]+(?:\.\d{1,2})?)/gi;

    let match;
    while ((match = phonepePattern.exec(allText)) !== null) {
      const dateStr = match[1].trim();
      const desc = match[2].trim();
      const amountStr = match[3].replace(/,/g, '');
      const amount = parseFloat(amountStr);

      if (isNaN(amount)) continue;

      // Determine direction from context around match
      const context = allText.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30).toLowerCase();
      const isDebit = context.includes('paid') || context.includes('debited') || context.includes('sent');

      transactions.push({
        date: dateStr,
        description: desc,
        rawNarration: desc,
        debit: isDebit ? amount : null,
        credit: isDebit ? null : amount,
        balance: null,
      });
    }

    // Paytm PDF format: similar pattern with "Dr" / "Cr" markers
    if (transactions.length === 0) {
      const paytmPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+([^\n]+?)\s+(Dr|Cr)\s+₹?\s*([\d,]+(?:\.\d{1,2})?)/gi;
      while ((match = paytmPattern.exec(allText)) !== null) {
        const dateStr = match[1].trim();
        const desc = match[2].trim();
        const drCr = match[3].toUpperCase();
        const amount = parseFloat(match[4].replace(/,/g, ''));

        if (isNaN(amount)) continue;

        transactions.push({
          date: dateStr,
          description: desc,
          rawNarration: desc,
          debit: drCr === 'DR' ? amount : null,
          credit: drCr === 'CR' ? amount : null,
          balance: null,
        });
      }
    }

    if (transactions.length === 0) {
      warnings.push(
        `Could not extract transactions from this ${provider} PDF. The file format may not be supported. ` +
        `For better results, please export transactions as CSV from the ${provider} app.`
      );
    }
  } catch (err: any) {
    warnings.push(`PDF parsing error: ${err.message}`);
  }

  return { provider, transactions, warnings };
}
