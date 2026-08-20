import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { parsePDF } from '../services/pdf-parser.service';
import { categorizeTransaction, isIncomeCategory, isExpenseCategory } from '../services/categorizer.service';

// ── Multer Configuration ───────────────────────────────────────────────────
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
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Helper: parse date string to Date object ───────────────────────────────
const parseDate = (dateStr: string): Date => {
  // Handles: DD/MM/YY, DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY, DD Mon, YYYY-MM-DD
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

// POST /api/statements/upload
export const uploadStatement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No PDF file provided' });
      return;
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);

    // Parse PDF
    const { bankName, period, transactions: rawTxs, warnings } = await parsePDF(buffer);

    if (rawTxs.length === 0) {
      res.status(422).json({
        success: false,
        message: 'Could not extract transactions from this PDF. The parser could not identify a structured transaction table. Please ensure it is a valid bank statement PDF.',
        warnings,
      });
      return;
    }

    let totalCredits = 0;
    let totalDebits = 0;

    const txData = rawTxs.map((raw) => {
      // Credit = money received INTO account; Debit = money paid OUT of account
      const isCredit = raw.credit !== null && raw.credit > 0 && (raw.debit === null || raw.debit === 0);
      const amount = isCredit ? (raw.credit ?? 0) : (raw.debit ?? 0);
      const rawNarration = raw.rawNarration || raw.description;

      const catResult = categorizeTransaction(rawNarration, isCredit);
      const category = catResult.category;
      const subcategory = catResult.subcategory;
      const merchantName = catResult.merchantName;
      const counterparty = catResult.counterparty;
      const channel = catResult.channel;
      const confidence = catResult.confidence;
      const referenceId = catResult.referenceId;

      // Only count actual income credits; exclude loan disbursements & P2P transfers from pure income total
      if (isCredit && isIncomeCategory(category)) totalCredits += amount;
      // Only count actual expense debits; exclude own-account transfers
      if (!isCredit && isExpenseCategory(category)) totalDebits += amount;

      return {
        date: parseDate(raw.date),
        description: raw.description,
        rawNarration,
        merchantName,
        counterparty,
        channel,
        amount,
        debit: raw.debit,
        credit: raw.credit,
        type: isCredit ? 'credit' : 'debit',
        category,
        subcategory,
        confidence,
        referenceId,
        balance: raw.balance,
      };
    });

    // Save to DB
    const statement = await prisma.bankStatement.create({
      data: {
        userId: req.user!.userId,
        bankName,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        period,
        totalCredits,
        totalDebits,
        transactions: { create: txData },
      },
      include: { transactions: true },
    });

    res.status(201).json({
      success: true,
      message: `Successfully extracted ${statement.transactions.length} transactions from ${bankName} statement`,
      data: { statement },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    if (error.message?.includes('PDF')) {
      res.status(422).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to process statement' });
    }
  }
};

// GET /api/statements
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

// GET /api/statements/:id
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

// DELETE /api/statements/:id
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
    // Delete the file
    const filePath = path.join(process.cwd(), 'uploads', statement.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.bankStatement.delete({ where: { id } });
    res.json({ success: true, message: 'Statement deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete statement' });
  }
};
