import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/savings/goals
export const getSavingsGoals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { goals } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch savings goals' });
  }
};

// POST /api/savings/goals
export const createSavingsGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, targetAmount, savedAmount, targetDate, emoji } = req.body;
    if (!name || !targetAmount) {
      res.status(400).json({ success: false, message: 'name and targetAmount are required' });
      return;
    }
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.user!.userId,
        name,
        targetAmount: parseFloat(targetAmount),
        savedAmount: savedAmount ? parseFloat(savedAmount) : 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        emoji: emoji || '🎯',
      },
    });
    res.status(201).json({ success: true, data: { goal } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create savings goal' });
  }
};

// PUT /api/savings/goals/:id
export const updateSavingsGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Goal not found' }); return; }

    const { name, targetAmount, savedAmount, targetDate, emoji, isCompleted } = req.body;
    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        targetAmount: targetAmount ? parseFloat(targetAmount) : existing.targetAmount,
        savedAmount: savedAmount !== undefined ? parseFloat(savedAmount) : existing.savedAmount,
        targetDate: targetDate ? new Date(targetDate) : existing.targetDate,
        emoji: emoji ?? existing.emoji,
        isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
      },
    });
    res.json({ success: true, data: { goal } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update savings goal' });
  }
};

// DELETE /api/savings/goals/:id
export const deleteSavingsGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.savingsGoal.findFirst({ where: { id, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Goal not found' }); return; }
    await prisma.savingsGoal.delete({ where: { id } });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete savings goal' });
  }
};
