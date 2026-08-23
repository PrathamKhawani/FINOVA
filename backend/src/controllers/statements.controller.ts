import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { parsePDF } from '../services/pdf-parser.service';
import { parseWalletCSV, parseWalletPDF } from '../services/wallet-parser.service';
import { categorizeTransaction, isIncomeCategory, isExpenseCategory } from '../services/categorizer.service';

// ── Multer Configuration — accept PDF and CSV ─────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'text/plain'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ext === '.csv' || ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF or CSV files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Helper: parse date string to Date ─────────────────────────────────────────
const parseDate = (dateStr: string): Date => {
  const formats = [
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, handler: (m: RegExpMatchArray) => new Date(`20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`) },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, handler: (m: RegExpMatchArray) => new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`) },
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, handler: (m: RegExpMatchArray) => new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`) },
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, handler: (m: RegExpMatchArray) => new Date(m[0]) },
    { regex: /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/, handler: (m: RegExpMatchArray) => new Date(`${m[1]} ${m[2]} ${m[3]}`) },
    { regex: /^(\d{1,2})\s+([A-Za-z]{3,9})$/, handler: (m: RegExpMatchArray) => new Date(`${m[1]} ${m[2]} 2025`) },
  ];
  for (const { regex, handler } of formats) {
    const match = dateStr.match(regex);
    if (match) {
      const d = handler(match);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
};

// ── Duplicate Detection ───────────────────────────────────────────────────────
async function detectDuplicates(
  userId: string,
  newTxns: Array<{ date: Date; amount: number; type: string; rawNarration: string; referenceId: string | null }>
) {
  // Fetch existing transactions for this user (last 90 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const existing = await prisma.transaction.findMany({
    where: {
      statement: { userId },
      date: { gte: cutoff },
    },
    select: { id: true, date: true, amount: true, type: true, rawNarration: true, referenceId: true },
  });

  const duplicateMap = new Map<number, string>(); // newTxn index → existing tx id

  newTxns.forEach((newTx, idx) => {
    for (const ex of existing) {
      // Check: same amount, same direction, date within 2 days
      const dateDiff = Math.abs(new Date(newTx.date).getTime() - new Date(ex.date).getTime());
      const sameAmount = Math.abs(newTx.amount - ex.amount) < 0.01;
      const sameType = newTx.type === ex.type;
      const withinWindow = dateDiff <= 2 * 24 * 60 * 60 * 1000; // 2 days

      if (sameAmount && sameType && withinWindow) {
        // Check reference ID match (strongest signal)
        if (newTx.referenceId && ex.referenceId && newTx.referenceId === ex.referenceId) {
          duplicateMap.set(idx, ex.id);
          break;
        }
        // Check narration similarity (simple substring)
        const narA = (newTx.rawNarration || '').toLowerCase().substring(0, 30);
        const narB = (ex.rawNarration || '').toLowerCase().substring(0, 30);
        if (narA.length > 5 && narB.length > 5 && (narA.includes(narB.substring(0, 15)) || narB.includes(narA.substring(0, 15)))) {
          duplicateMap.set(idx, ex.id);
          break;
        }
      }
    }
  });

  return duplicateMap;
}

// ── POST /api/statements/upload (Bank Statement — PDF) ────────────────────────
export const uploadStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(req.file.originalname).toLowerCase();

    let bankName = 'Unknown Bank';
    let period = '';
    let rawTxs: any[] = [];
    let warnings: string[] = [];
    const source = 'BANK';

    if (ext === '.pdf') {
      const result = await parsePDF(buffer);
      bankName = result.bankName;
      period = result.period;
      rawTxs = result.transactions;
      warnings = result.warnings || [];
    } else {
      res.status(422).json({ success: false, message: 'Bank statement must be a PDF. For wallet/CSV files use the Wallet Import page.' });
      return;
    }

    if (rawTxs.length === 0) {
      res.status(422).json({
        success: false,
        message: 'Could not extract transactions from this PDF. Ensure it is a valid bank statement.',
        warnings,
      });
      return;
    }

    let totalCredits = 0;
    let totalDebits = 0;

    const txData = rawTxs.map((raw) => {
      const isCredit = raw.credit !== null && raw.credit > 0 && (raw.debit === null || raw.debit === 0);
      const amount = isCredit ? (raw.credit ?? 0) : (raw.debit ?? 0);
      const rawNarration = raw.rawNarration || raw.description;

      const catResult = categorizeTransaction(rawNarration, isCredit, 'BANK');
      if (isCredit && isIncomeCategory(catResult.category)) totalCredits += amount;
      if (!isCredit && isExpenseCategory(catResult.category)) totalDebits += amount;

      return {
        date: parseDate(raw.date),
        description: raw.description,
        rawNarration,
        merchantName: catResult.merchantName,
        counterparty: catResult.counterparty,
        channel: catResult.channel,
        amount,
        debit: raw.debit,
        credit: raw.credit,
        type: isCredit ? 'credit' : 'debit',
        transactionType: isCredit ? 'Income' : 'Expense',
        source: 'BANK',
        provider: bankName,
        category: catResult.category,
        subcategory: catResult.subcategory,
        confidence: catResult.confidence,
        referenceId: catResult.referenceId,
        balance: raw.balance,
        needsReview: catResult.needsReview,
        classificationReason: (catResult as any).classificationReason,
      };
    });

    // Duplicate detection
    const dupMap = await detectDuplicates(req.user!.userId, txData.map(t => ({
      date: t.date, amount: t.amount, type: t.type, rawNarration: t.rawNarration, referenceId: t.referenceId,
    })));

    const txDataWithDups = txData.map((t, idx) => ({
      ...t,
      isDuplicate: dupMap.has(idx),
      duplicateOf: dupMap.get(idx) || null,
    }));

    const statement = await prisma.bankStatement.create({
      data: {
        userId: req.user!.userId,
        source,
        provider: bankName,
        bankName,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        period,
        totalCredits,
        totalDebits,
        transactions: { create: txDataWithDups },
      },
      include: { transactions: true },
    });

    const dupCount = dupMap.size;
    res.status(201).json({
      success: true,
      message: `Successfully extracted ${statement.transactions.length} transactions from ${bankName} statement${dupCount > 0 ? ` (${dupCount} potential duplicate(s) flagged)` : ''}`,
      data: { statement },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process statement' });
  }
};

// ── POST /api/wallet/upload (Wallet — CSV or PDF) ────────────────────────────
export const uploadWalletStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(req.file.originalname).toLowerCase();

    let provider = 'Wallet';
    let rawTxs: any[] = [];
    let warnings: string[] = [];

    if (ext === '.csv' || req.file.mimetype === 'text/csv') {
      const content = buffer.toString('utf-8');
      const result = parseWalletCSV(content, req.file.originalname);
      provider = result.provider;
      rawTxs = result.transactions;
      warnings = result.warnings;
    } else if (ext === '.pdf') {
      const result = await parseWalletPDF(buffer, req.file.originalname);
      provider = result.provider;
      rawTxs = result.transactions;
      warnings = result.warnings;
    } else {
      res.status(422).json({ success: false, message: 'Wallet imports support CSV or PDF format only.' });
      return;
    }

    if (rawTxs.length === 0) {
      res.status(422).json({
        success: false,
        message: `Could not extract transactions from this ${provider} file. ${warnings.join(' ')}`,
        warnings,
      });
      return;
    }

    let totalCredits = 0;
    let totalDebits = 0;

    const txData = rawTxs.map((raw) => {
      const isCredit = raw.credit !== null && raw.credit > 0 && (raw.debit === null || raw.debit === 0);
      const amount = isCredit ? (raw.credit ?? 0) : (raw.debit ?? 0);
      const rawNarration = raw.rawNarration || raw.description;

      const catResult = categorizeTransaction(rawNarration, isCredit, 'WALLET');
      if (isCredit && isIncomeCategory(catResult.category)) totalCredits += amount;
      if (!isCredit && isExpenseCategory(catResult.category)) totalDebits += amount;

      return {
        date: parseDate(raw.date),
        description: raw.description,
        rawNarration,
        merchantName: catResult.merchantName,
        counterparty: catResult.counterparty,
        channel: catResult.channel || provider,
        amount,
        debit: raw.debit,
        credit: raw.credit,
        type: isCredit ? 'credit' : 'debit',
        transactionType: isCredit ? 'Income' : 'Expense',
        source: 'WALLET',
        provider,
        category: catResult.category,
        subcategory: catResult.subcategory,
        confidence: catResult.confidence,
        referenceId: catResult.referenceId,
        balance: raw.balance,
        needsReview: catResult.needsReview,
      };
    });

    // Duplicate detection
    const dupMap = await detectDuplicates(req.user!.userId, txData.map(t => ({
      date: t.date, amount: t.amount, type: t.type, rawNarration: t.rawNarration, referenceId: t.referenceId,
    })));

    const txDataWithDups = txData.map((t, idx) => ({
      ...t,
      isDuplicate: dupMap.has(idx),
      duplicateOf: dupMap.get(idx) || null,
    }));

    const statement = await prisma.bankStatement.create({
      data: {
        userId: req.user!.userId,
        source: 'WALLET',
        provider,
        bankName: provider,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        period: '',
        totalCredits,
        totalDebits,
        transactions: { create: txDataWithDups },
      },
      include: { transactions: true },
    });

    const dupCount = dupMap.size;
    res.status(201).json({
      success: true,
      message: `Successfully imported ${statement.transactions.length} transactions from ${provider}${dupCount > 0 ? ` (${dupCount} potential duplicate(s) flagged)` : ''}`,
      data: { statement },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error('Wallet upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to process wallet statement' });
  }
};

// ── GET /api/statements ────────────────────────────────────────────────────────
export const getStatements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statements = await prisma.bankStatement.findMany({
      where: { userId: req.user!.userId },
      include: { _count: { select: { transactions: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: { statements } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statements' });
  }
};

// ── GET /api/statements/:id ────────────────────────────────────────────────────
export const getStatementById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const statement = await prisma.bankStatement.findFirst({
      where: { id, userId: req.user!.userId },
      include: { transactions: { orderBy: { date: 'desc' } } },
    });
    if (!statement) {
      res.status(404).json({ success: false, message: 'Statement not found' });
      return;
    }
    res.json({ success: true, data: { statement } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch statement' });
  }
};

// ── DELETE /api/statements/:id ─────────────────────────────────────────────────
export const deleteStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const statement = await prisma.bankStatement.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!statement) {
      res.status(404).json({ success: false, message: 'Statement not found' });
      return;
    }
    const filePath = path.join(process.cwd(), 'uploads', statement.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.bankStatement.delete({ where: { id } });
    res.json({ success: true, message: 'Statement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete statement' });
  }
};
