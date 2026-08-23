import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/loans
export const getLoans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-detect EMI transactions from DB for each active loan
    const emiTxns = await prisma.transaction.findMany({
      where: {
        statement: { userId: req.user!.userId },
        category: { contains: 'EMI' },
        type: 'debit',
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: { loans, detectedEMIs: emiTxns.slice(0, 10) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
};

// POST /api/loans
export const createLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, lenderName, principalAmount, outstandingAmount, emiAmount, interestRate, tenureMonths, startDate, nextDueDate, loanType } = req.body;
    if (!name || !principalAmount || !emiAmount) {
      res.status(400).json({ success: false, message: 'name, principalAmount and emiAmount are required' });
      return;
    }
    const loan = await prisma.loan.create({
      data: {
        userId: req.user!.userId,
        name,
        lenderName: lenderName || null,
        principalAmount: parseFloat(principalAmount),
        outstandingAmount: parseFloat(outstandingAmount || principalAmount),
        emiAmount: parseFloat(emiAmount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        tenureMonths: tenureMonths ? parseInt(tenureMonths) : null,
        startDate: startDate ? new Date(startDate) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        loanType: loanType || 'Personal',
      },
    });
    res.status(201).json({ success: true, data: { loan } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create loan' });
  }
};

// PUT /api/loans/:id
export const updateLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.loan.findFirst({ where: { id, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Loan not found' }); return; }

    const { outstandingAmount, emiAmount, nextDueDate, isActive } = req.body;
    const loan = await prisma.loan.update({
      where: { id },
      data: {
        outstandingAmount: outstandingAmount ? parseFloat(outstandingAmount) : existing.outstandingAmount,
        emiAmount: emiAmount ? parseFloat(emiAmount) : existing.emiAmount,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : existing.nextDueDate,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });
    res.json({ success: true, data: { loan } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update loan' });
  }
};

// DELETE /api/loans/:id
export const deleteLoan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.loan.findFirst({ where: { id, userId: req.user!.userId } });
    if (!existing) { res.status(404).json({ success: false, message: 'Loan not found' }); return; }
    await prisma.loan.delete({ where: { id } });
    res.json({ success: true, message: 'Loan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete loan' });
  }
};
