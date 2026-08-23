import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { analyzeFinancials } from '../services/financial-intelligence.service';

// GET /api/dashboard/summary
export const getDashboardSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Count all statements
    const statementsCount = await prisma.bankStatement.count({ where: { userId } });

    // Get all transactions for user (full set for analysis)
    const transactions = await prisma.transaction.findMany({
      where: { statement: { userId } },
      orderBy: { date: 'asc' },
      select: {
        id: true, date: true, description: true, rawNarration: true,
        merchantName: true, counterparty: true, channel: true,
        amount: true, type: true, category: true, subcategory: true,
        confidence: true, balance: true, source: true, provider: true,
        isDuplicate: true, needsReview: true,
      },
    });

    // Recent 10 for quick preview on dashboard
    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Separate bank vs wallet
    const bankTxns = transactions.filter(t => t.source === 'BANK' || !t.source);
    const walletTxns = transactions.filter(t => t.source === 'WALLET');

    const bankCredits = bankTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const bankDebits  = bankTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const walletCredits = walletTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const walletDebits  = walletTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
    const duplicateCount   = transactions.filter(t => t.isDuplicate).length;
    const needsReviewCount = transactions.filter(t => t.needsReview).length;

    // Run financial intelligence on non-duplicate transactions
    const cleanTxns = transactions.filter(t => !t.isDuplicate);
    const intelligence = analyzeFinancials(cleanTxns);

    // Build response — rename fields to match frontend expectations
    res.json({
      success: true,
      data: {
        statementsCount,
        transactionCount: transactions.length,
        duplicateCount,
        needsReviewCount,
        bankSummary: {
          totalCredits: Math.round(bankCredits * 100) / 100,
          totalDebits:  Math.round(bankDebits * 100) / 100,
          transactionCount: bankTxns.length,
        },
        walletSummary: {
          totalCredits: Math.round(walletCredits * 100) / 100,
          totalDebits:  Math.round(walletDebits * 100) / 100,
          transactionCount: walletTxns.length,
        },
        summary: {
          ...intelligence.summary,
          statementsCount,
        },
        // Frontend expects categoryBreakdown / incomeBreakdown — provide both names
        categoryBreakdown: intelligence.topCategories,
        incomeBreakdown: intelligence.incomeCategories,
        topCategories: intelligence.topCategories,      // kept for Reports page
        incomeCategories: intelligence.incomeCategories, // kept for Reports page
        topMerchants: intelligence.topMerchants,
        insights: intelligence.insights,
        forecast: intelligence.forecast,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};
