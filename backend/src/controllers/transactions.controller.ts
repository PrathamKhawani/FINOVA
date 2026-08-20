import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/transactions
// Query params: category, type (credit|debit), search, page, limit, statementId
export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      category,
      type,
      search,
      statementId,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      statement: { userId },
    };

    if (category) where.category = category;
    if (type === 'credit' || type === 'debit') where.type = type;
    if (statementId) where.statementId = statementId;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { rawNarration: { contains: search, mode: 'insensitive' } },
        { merchantName: { contains: search, mode: 'insensitive' } },
        { counterparty: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
        include: {
          statement: {
            select: { bankName: true, originalName: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// GET /api/transactions/categories
export const getCategories = async (_req: AuthRequest, res: Response): Promise<void> => {
  const categories = [
    'Income',
    'Person-to-Person Transfer',
    'Food & Dining',
    'Groceries',
    'Shopping',
    'Travel & Transport',
    'Fuel',
    'Rent',
    'Utilities & Bills',
    'Healthcare',
    'Education',
    'Insurance & Premium',
    'EMI & Loans',
    'Investments',
    'Subscriptions',
    'Entertainment',
    'ATM & Cash',
    'Bank Charges',
    'Taxes',
    'Other / Needs Review',
  ];
  res.json({ success: true, data: { categories } });
};
