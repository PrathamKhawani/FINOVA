import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { analyzeFinancials } from '../services/financial-intelligence.service';

// GET /api/dashboard/summary
export const getDashboardSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get all transactions for user via their statements
    const transactions = await prisma.transaction.findMany({
      where: { statement: { userId } },
      orderBy: { date: 'asc' },
    });

    // Run Financial Intelligence Analysis Engine
    const analysis = analyzeFinancials(transactions);

    // Get statement count
    const statementsCount = await prisma.bankStatement.count({ where: { userId } });

    // Recent transactions (last 10 desc)
    const recentTransactions = [...transactions]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          ...analysis.summary,
          statementsCount,
        },
        categoryBreakdown: analysis.topCategories,
        incomeBreakdown: analysis.incomeCategories,
        topMerchants: analysis.topMerchants,
        insights: analysis.insights,
        forecast: analysis.forecast,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
};
