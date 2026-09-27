/**
 * FINOVA Review Controller
 * Endpoint for manually reviewing and correcting transaction classifications.
 *
 * Routes:
 *   PATCH /api/transactions/:id/review — save a user correction + optionally create a rule
 *
 * Guarantees:
 * - NEVER modifies the raw financial values (amount, date, rawNarration, debit, credit, balance).
 * - Only updates classification fields: userCategory, userSubcategory, userNote, reviewedAt.
 * - Optionally creates/updates a UserCategorizationRule if "rememberThis" is true.
 * - Optionally applies the rule to existing matching transactions if "applyToExisting" is true.
 * - Recalculation of totals in BankStatement.totalCredits/totalDebits happens automatically
 *   since Dashboard/Reports query fresh from the Transaction table.
 */

import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { countMatchingTransactions, applyRuleToExistingTransactions } from '../services/user-rules.service';

// ── PATCH /api/transactions/:id/review ────────────────────────────────────────
export const reviewTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const {
      category,
      subcategory,
      userNote,
      rememberThis,       // boolean — create a rule for future auto-classification
      applyToExisting,    // boolean — apply rule to existing matching transactions
      ruleName,
      matchNarration,
      matchMerchant,
      matchVPA,
      matchDirection,
      matchPaymentType,
    } = req.body;

    if (!category) {
      res.status(400).json({ success: false, message: 'category is required' });
      return;
    }

    // Verify transaction belongs to this user
    const tx = await prisma.transaction.findFirst({
      where: { id, statement: { userId } },
      include: { statement: { select: { userId: true } } },
    });

    if (!tx) {
      res.status(404).json({ success: false, message: 'Transaction not found' });
      return;
    }

    let ruleId: string | null = null;
    let matchCount = 0;

    // Create/update a rule if the user asked to remember this classification
    if (rememberThis) {
      // Must have at least one matching signal
      if (!matchNarration && !matchMerchant && !matchVPA) {
        res.status(400).json({
          success: false,
          message: 'At least one matching signal (matchNarration, matchMerchant, or matchVPA) is required when rememberThis is true',
        });
        return;
      }

      const name = ruleName || `${(matchMerchant || matchNarration || matchVPA || 'Custom')} → ${category}`;

      const rule = await prisma.userCategorizationRule.create({
        data: {
          userId,
          name,
          matchNarration: matchNarration || null,
          matchMerchant: matchMerchant || null,
          matchVPA: matchVPA || null,
          matchDirection: matchDirection || tx.type || null,
          matchPaymentType: matchPaymentType || null,
          category,
          subcategory: subcategory || null,
          priority: 10, // User-created rules get higher priority than auto-rules
        },
      });

      ruleId = rule.id;

      // Apply to existing matching transactions if requested
      if (applyToExisting) {
        matchCount = await applyRuleToExistingTransactions(
          userId,
          rule.id,
          category,
          subcategory || null,
          typeof matchNarration === 'string' ? matchNarration : undefined,
          typeof matchMerchant === 'string' ? matchMerchant : undefined,
          typeof matchVPA === 'string' ? matchVPA : undefined,
          typeof matchDirection === 'string' ? matchDirection : tx.type,
          typeof matchPaymentType === 'string' ? matchPaymentType : undefined,
          id, // exclude the transaction we're reviewing now (updated below)
        );
      }
    }

    // Update ONLY classification fields — NEVER touch raw financial values
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        // Store user's choice as the canonical category (overrides auto-classification)
        category,
        subcategory: subcategory || null,
        userCategory: category,
        userSubcategory: subcategory || null,
        userNote: userNote || null,
        reviewedAt: new Date(),
        needsReview: false,
        appliedRuleId: ruleId,
        // Confidence and classification reason updated to reflect user override
        confidence: 'high',
        classificationReason: `Manually classified by user${ruleId ? '. Rule created for future auto-classification.' : '.'} Original auto-category preserved in audit.`,
      },
    });

    res.json({
      success: true,
      message: [
        'Transaction classification updated.',
        rememberThis ? `Rule created: "${ruleName || 'Custom Rule'}"` : '',
        applyToExisting && matchCount > 0 ? `Applied to ${matchCount} existing similar transaction(s).` : '',
      ].filter(Boolean).join(' '),
      data: {
        transaction: updated,
        ruleCreated: !!ruleId,
        appliedToCount: matchCount,
      },
    });
  } catch (err: any) {
    console.error('[Review] reviewTransaction error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save review' });
  }
};

// ── GET /api/transactions/:id/review/preview ───────────────────────────────────
// Preview: how many existing transactions would match the proposed rule signals.
export const previewReviewMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const matchNarration = typeof req.query.matchNarration === 'string' ? req.query.matchNarration : null;
    const matchMerchant = typeof req.query.matchMerchant === 'string' ? req.query.matchMerchant : null;
    const matchVPA = typeof req.query.matchVPA === 'string' ? req.query.matchVPA : null;
    const matchDirection = typeof req.query.matchDirection === 'string' ? req.query.matchDirection : null;
    const matchPaymentType = typeof req.query.matchPaymentType === 'string' ? req.query.matchPaymentType : null;

    const count = await countMatchingTransactions(
      userId,
      matchNarration,
      matchMerchant,
      matchVPA,
      matchDirection,
      matchPaymentType,
      id, // exclude the current transaction from count
    );

    res.json({ success: true, data: { matchingCount: count } });
  } catch (err: any) {
    console.error('[Review] previewReviewMatch error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to preview match count' });
  }
};
