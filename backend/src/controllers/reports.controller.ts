import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { analyzeFinancials } from '../services/financial-intelligence.service';

/**
 * GET /api/reports/summary
 * Query params:
 *   month      — "YYYY-MM"  (filter to a single month)
 *   startDate  — "YYYY-MM-DD"
 *   endDate    — "YYYY-MM-DD"
 *   source     — "BANK" | "WALLET" | "ALL" (default ALL)
 */
export const getReportsSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { month, startDate, endDate, source } = req.query as Record<string, string>;

    // ── Build date filter ────────────────────────────────────────────────────
    const dateFilter: any = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      dateFilter.gte = new Date(y, m - 1, 1);
      dateFilter.lte = new Date(y, m, 0, 23, 59, 59);
    } else if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate)   dateFilter.lte = new Date(endDate + 'T23:59:59');
    }

    const whereBase: any = {
      statement: { userId },
      isDuplicate: false,
    };
    if (Object.keys(dateFilter).length) whereBase.date = dateFilter;
    if (source && source !== 'ALL') whereBase.source = source;

    // ── Fetch filtered transactions ──────────────────────────────────────────
    const transactions = await prisma.transaction.findMany({
      where: whereBase,
      orderBy: { date: 'asc' },
      select: {
        id: true, date: true, description: true, amount: true, type: true,
        category: true, subcategory: true, source: true, provider: true,
        transactionType: true, merchantName: true, counterparty: true,
        rawNarration: true,
      },
    });

    // ── Run intelligence engine ──────────────────────────────────────────────
    const intelligence = analyzeFinancials(transactions as any);

    // ── Bank vs Wallet split (from filtered set) ─────────────────────────────
    const bankTxns   = transactions.filter(t => t.source === 'BANK' || !t.source);
    const walletTxns = transactions.filter(t => t.source === 'WALLET');

    const rawSum = (arr: typeof transactions, typ: string) =>
      arr.filter(t => t.type === typ).reduce((s, t) => s + t.amount, 0);

    const bankSummary = {
      totalCredits:     Math.round(rawSum(bankTxns, 'credit') * 100) / 100,
      totalDebits:      Math.round(rawSum(bankTxns, 'debit')  * 100) / 100,
      transactionCount: bankTxns.length,
    };
    const walletSummary = {
      totalCredits:     Math.round(rawSum(walletTxns, 'credit') * 100) / 100,
      totalDebits:      Math.round(rawSum(walletTxns, 'debit')  * 100) / 100,
      transactionCount: walletTxns.length,
    };

    // ── Monthly trend (group by YYYY-MM) ─────────────────────────────────────
    const monthlyMap: Record<string, { income: number; expenses: number; txnCount: number }> = {};
    transactions.forEach(t => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0, txnCount: 0 };
      const txType = t.transactionType || (t.type === 'credit' ? 'Income' : 'Expense');
      if (txType === 'Transfer' || txType === 'P2P') return;
      if (txType === 'Income') monthlyMap[key].income += t.amount;
      else if (txType === 'Expense' || txType === 'EMI/Loan' || txType === 'Investment') monthlyMap[key].expenses += t.amount;
      else if (txType === 'Refund') monthlyMap[key].expenses = Math.max(0, monthlyMap[key].expenses - t.amount);
      monthlyMap[key].txnCount++;
    });
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mo, v]) => ({
        month:    mo,
        income:   Math.round(v.income   * 100) / 100,
        expenses: Math.round(v.expenses * 100) / 100,
        net:      Math.round((v.income - v.expenses) * 100) / 100,
        txnCount: v.txnCount,
      }));

    // ── Recurring payment detection ───────────────────────────────────────────
    const recurringCandidates: Record<string, { name: string; amounts: number[]; dates: Date[]; category: string }> = {};
    transactions.forEach(t => {
      const txType = t.transactionType || (t.type === 'credit' ? 'Income' : 'Expense');
      if (txType === 'Transfer' || txType === 'P2P' || t.type !== 'debit') return;
      const key = (t.merchantName || t.description.slice(0, 40)).toLowerCase().trim();
      if (!recurringCandidates[key]) {
        recurringCandidates[key] = {
          name: t.merchantName || t.description.slice(0, 40),
          amounts: [], dates: [], category: t.category,
        };
      }
      recurringCandidates[key].amounts.push(t.amount);
      recurringCandidates[key].dates.push(new Date(t.date));
    });

    const recurringPayments = Object.values(recurringCandidates)
      .filter(r => {
        if (r.dates.length < 2) return false;
        const distinctMonths = new Set(r.dates.map(d => d.toISOString().slice(0, 7)));
        return distinctMonths.size >= 2;
      })
      .map(r => {
        const avgAmount = Math.round((r.amounts.reduce((s, a) => s + a, 0) / r.amounts.length) * 100) / 100;
        const lastDate = [...r.dates].sort((a, b) => b.getTime() - a.getTime())[0];
        return {
          name: r.name,
          category: r.category,
          occurrences: r.amounts.length,
          avgAmount,
          lastDate: lastDate.toISOString().slice(0, 10),
        };
      })
      .sort((a, b) => b.avgAmount - a.avgAmount)
      .slice(0, 10);

    // ── Available months for filter UI ───────────────────────────────────────
    const allTxnDates = await prisma.transaction.findMany({
      where: { statement: { userId }, isDuplicate: false },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
    const availableMonths = [
      ...new Set(allTxnDates.map(t => new Date(t.date).toISOString().slice(0, 7)))
    ].sort();

    res.json({
      success: true,
      data: {
        filters: { month: month || null, startDate: startDate || null, endDate: endDate || null, source: source || 'ALL' },
        summary: intelligence.summary,
        bankSummary,
        walletSummary,
        topCategories:   intelligence.topCategories,
        incomeCategories: intelligence.incomeCategories,
        topMerchants:    intelligence.topMerchants,
        recurringPayments,
        monthlyTrend,
        availableMonths,
        totalTransactions: transactions.length,
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};
