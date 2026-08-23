import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/budget?month=2025-08
export const getBudgets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const monthYear = (req.query.month as string) || getCurrentMonthYear();
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user!.userId, monthYear },
      orderBy: { category: 'asc' },
    });

    // Attach actual spending for each budget category
    const [year, month] = monthYear.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const spending = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        statement: { userId: req.user!.userId },
        type: 'debit',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const spendMap: Record<string, number> = {};
    spending.forEach(s => { spendMap[s.category] = s._sum.amount || 0; });

    const enriched = budgets.map(b => ({
      ...b,
      spent: Math.round((spendMap[b.category] || 0) * 100) / 100,
      remaining: Math.max(0, Math.round((b.limitAmount - (spendMap[b.category] || 0)) * 100) / 100),
      usagePercent: b.limitAmount > 0 ? Math.round(((spendMap[b.category] || 0) / b.limitAmount) * 100) : 0,
    }));

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
