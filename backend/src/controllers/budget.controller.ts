import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/budget?month=2025-08
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const monthYear = (req.query.month as string) || getCurrentMonthYear();
    let budgets = await prisma.budget.findMany({
      where: { userId: req.user!.userId, monthYear },
      orderBy: { category: 'asc' },
    });

    // Auto-rollover: if no budgets exist for this month, copy from the most recent month
    if (budgets.length === 0) {
      const lastMonthBudget = await prisma.budget.findFirst({
        where: { userId: req.user!.userId },
        orderBy: { monthYear: 'desc' },
      });

      if (lastMonthBudget && lastMonthBudget.monthYear !== monthYear) {
        const pastBudgets = await prisma.budget.findMany({
          where: { userId: req.user!.userId, monthYear: lastMonthBudget.monthYear },
        });

        if (pastBudgets.length > 0) {
          await prisma.budget.createMany({
            data: pastBudgets.map(b => ({
              userId: b.userId,
              category: b.category,
              subcategory: b.subcategory,
              monthYear: monthYear,
              limitAmount: b.limitAmount,
            })),
          });

          // Fetch the newly created budgets
          budgets = await prisma.budget.findMany({
            where: { userId: req.user!.userId, monthYear },
            orderBy: { category: 'asc' },
          });
        }
      }
    }

    // Attach actual spending for each budget category
    const [year, month] = monthYear.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        statement: { userId: req.user!.userId },
        date: { gte: startDate, lte: endDate },
        isDuplicate: false,
      },
      select: { amount: true, category: true, userCategory: true, type: true, transactionType: true },
    });

    const spendMap: Record<string, number> = {};
    transactions.forEach(t => {
      const cat = t.userCategory || t.category;
      const txType = t.transactionType || (t.type === 'credit' ? 'Income' : 'Expense');
      
      // Do not count transfers/refunds/P2P/internal transfers as category spending
      if (txType === 'Transfer' || txType === 'P2P' || cat.includes('P2P') || cat.includes('Transfer') || cat.includes('Income')) return;
      
      if (txType === 'Refund') {
        if (!spendMap[cat]) spendMap[cat] = 0;
        spendMap[cat] -= t.amount;
      } else if (txType === 'Expense' || txType === 'EMI/Loan' || txType === 'Investment' || t.type === 'debit') {
        if (!spendMap[cat]) spendMap[cat] = 0;
        spendMap[cat] += t.amount;
      }
    });

    // Prevent negative spending values from standalone refunds
    Object.keys(spendMap).forEach(k => {
      if (spendMap[k] < 0) spendMap[k] = 0;
    });

    const enriched = budgets.map(b => {
      const spent = Math.round((spendMap[b.category] || 0) * 100) / 100;
      const remaining = Math.round((b.limitAmount - spent) * 100) / 100;
      const usagePercent = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0;

      return {
        ...b,
        spent,
        remaining,
        usagePercent,
      };
    });

    res.json({ success: true, data: { budgets: enriched, monthYear } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch budgets' });
  }
};

// POST /api/budget
export const createBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, subcategory, monthYear, limitAmount } = req.body;
    if (!category || !limitAmount) {
      res.status(400).json({ success: false, message: 'category and limitAmount are required' });
      return;
    }

    const budget = await prisma.budget.create({
      data: {
        userId: req.user!.userId,
        category,
        subcategory: subcategory || null,
        monthYear: monthYear || getCurrentMonthYear(),
        limitAmount: parseFloat(limitAmount),
      },
    });
    res.status(201).json({ success: true, data: { budget } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create budget' });
  }
};

// PUT /api/budget/:id
export const updateBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    const { limitAmount, category, subcategory } = req.body;
    const existing = await prisma.budget.findFirst({ where: { id: idStr, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Budget not found' }); return; }

    const budget = await prisma.budget.update({
      where: { id: idStr },
      data: {
        limitAmount: limitAmount ? parseFloat(limitAmount) : existing.limitAmount,
        category: category || existing.category,
        subcategory: subcategory !== undefined ? subcategory : existing.subcategory,
      },
    });
    res.json({ success: true, data: { budget } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
};

// DELETE /api/budget/:id
export const deleteBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const idStr = String(id);
    const existing = await prisma.budget.findFirst({ where: { id: idStr, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Budget not found' }); return; }
    await prisma.budget.delete({ where: { id: idStr } });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete budget' });
  }
};

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
