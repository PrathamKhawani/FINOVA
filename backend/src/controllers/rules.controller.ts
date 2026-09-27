/**
 * FINOVA Rules Controller
 * CRUD endpoints for UserCategorizationRule.
 * 
 * Routes:
 *   GET    /api/rules            — list all rules for current user
 *   POST   /api/rules            — create a new rule
 *   PUT    /api/rules/:id        — update rule (name, signals, category, enable/disable, priority)
 *   DELETE /api/rules/:id        — delete a rule
 *   GET    /api/rules/:id/preview — count how many existing transactions match this rule
 */

import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { countMatchingTransactions, applyRuleToExistingTransactions } from '../services/user-rules.service';

// ── GET /api/rules ─────────────────────────────────────────────────────────────
export const getRules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rules = await prisma.userCategorizationRule.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: { rules } });
  } catch (err: any) {
    console.error('[Rules] getRules error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch rules' });
  }
};

// ── POST /api/rules ────────────────────────────────────────────────────────────
export const createRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const {
      name,
      matchNarration,
      matchMerchant,
      matchVPA,
      matchDirection,
      matchPaymentType,
      category,
      subcategory,
      priority = 0,
    } = req.body;

    if (!name || !category) {
      res.status(400).json({ success: false, message: 'name and category are required' });
      return;
    }

    // Require at least one matching signal to prevent an "always-match" rule
    if (!matchNarration && !matchMerchant && !matchVPA) {
      res.status(400).json({ success: false, message: 'At least one matching signal is required (matchNarration, matchMerchant, or matchVPA)' });
      return;
    }

    const rule = await prisma.userCategorizationRule.create({
      data: {
        userId,
        name,
        matchNarration: matchNarration || null,
        matchMerchant: matchMerchant || null,
        matchVPA: matchVPA || null,
        matchDirection: matchDirection || null,
        matchPaymentType: matchPaymentType || null,
        category,
        subcategory: subcategory || null,
        priority: typeof priority === 'number' ? priority : 0,
      },
    });

    res.status(201).json({ success: true, data: { rule } });
  } catch (err: any) {
    console.error('[Rules] createRule error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
};

// ── PUT /api/rules/:id ─────────────────────────────────────────────────────────
export const updateRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const existing = await prisma.userCategorizationRule.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Rule not found' });
      return;
    }

    const {
      name,
      matchNarration,
      matchMerchant,
      matchVPA,
      matchDirection,
      matchPaymentType,
      category,
      subcategory,
      isEnabled,
      priority,
    } = req.body;

    const updated = await prisma.userCategorizationRule.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        matchNarration: matchNarration !== undefined ? (matchNarration || null) : existing.matchNarration,
        matchMerchant: matchMerchant !== undefined ? (matchMerchant || null) : existing.matchMerchant,
        matchVPA: matchVPA !== undefined ? (matchVPA || null) : existing.matchVPA,
        matchDirection: matchDirection !== undefined ? (matchDirection || null) : existing.matchDirection,
        matchPaymentType: matchPaymentType !== undefined ? (matchPaymentType || null) : existing.matchPaymentType,
        category: category ?? existing.category,
        subcategory: subcategory !== undefined ? (subcategory || null) : existing.subcategory,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled,
        priority: priority !== undefined ? Number(priority) : existing.priority,
      },
    });

    res.json({ success: true, data: { rule: updated } });
  } catch (err: any) {
    console.error('[Rules] updateRule error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update rule' });
  }
};

// ── DELETE /api/rules/:id ──────────────────────────────────────────────────────
export const deleteRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const existing = await prisma.userCategorizationRule.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Rule not found' });
      return;
    }

    await prisma.userCategorizationRule.delete({ where: { id } });
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err: any) {
    console.error('[Rules] deleteRule error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
};

// ── GET /api/rules/:id/preview ─────────────────────────────────────────────────
// Returns count of existing transactions that would match this rule's signals.
export const previewRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const rule = await prisma.userCategorizationRule.findFirst({ where: { id, userId } });
    if (!rule) {
      res.status(404).json({ success: false, message: 'Rule not found' });
      return;
    }

    const count = await countMatchingTransactions(
      userId,
      rule.matchNarration,
      rule.matchMerchant,
      rule.matchVPA,
      rule.matchDirection,
      rule.matchPaymentType,
    );

    res.json({ success: true, data: { matchingCount: count } });
  } catch (err: any) {
    console.error('[Rules] previewRule error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to preview rule' });
  }
};

// ── POST /api/rules/:id/apply-existing ────────────────────────────────────────
// Apply rule to all existing matching transactions (after user confirmation).
export const applyRuleToExisting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    const rule = await prisma.userCategorizationRule.findFirst({ where: { id, userId } });
    if (!rule) {
      res.status(404).json({ success: false, message: 'Rule not found' });
      return;
    }

    const updatedCount = await applyRuleToExistingTransactions(
      userId,
      rule.id,
      rule.category,
      rule.subcategory,
      rule.matchNarration,
      rule.matchMerchant,
      rule.matchVPA,
      rule.matchDirection,
      rule.matchPaymentType,
    );

    res.json({ success: true, data: { updatedCount }, message: `Updated ${updatedCount} matching transaction(s)` });
  } catch (err: any) {
    console.error('[Rules] applyRuleToExisting error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to apply rule to existing transactions' });
  }
};
