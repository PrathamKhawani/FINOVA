/**
 * FINOVA User Categorization Rules Service
 *
 * Applies user-defined classification rules BEFORE generic auto-categorization.
 * Rules are matched using: narration, merchant, VPA, direction, and paymentType.
 *
 * Guarantees:
 * - NEVER modifies raw financial values (amount, date, narration).
 * - NEVER applies a rule to unrelated transactions on weak keyword matches.
 * - User manual corrections take highest priority (stored as rules with max priority).
 * - Rules fire in descending priority order; first match wins.
 */

import prisma from '../lib/prisma';

export interface UserRuleMatchResult {
  matched: boolean;
  category: string;
  subcategory: string | null;
  ruleId: string;
  ruleName: string;
}

/**
 * Normalize a narration string for rule matching:
 * - lowercase
 * - remove UPI reference IDs (long numeric tokens)
 * - collapse whitespace
 */
export function normalizeNarration(narration: string): string {
  return narration
    .toLowerCase()
    .replace(/\b\d{8,}\b/g, '') // remove long numeric IDs
    .replace(/[^a-z0-9@.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchRuleSync(
  rules: any[],
  narration: string,
  direction: 'credit' | 'debit',
  paymentType?: string | null,
  merchantName?: string | null,
  vpa?: string | null
): UserRuleMatchResult | null {
  if (!rules || rules.length === 0) return null;

  const normNarration = normalizeNarration(narration);
  const normMerchant  = merchantName ? normalizeNarration(merchantName) : '';
  const normVPA       = vpa ? vpa.toLowerCase().trim() : '';

  for (const rule of rules) {
    if (rule.matchDirection && rule.matchDirection !== direction) continue;

    if (rule.matchPaymentType && paymentType) {
      if (rule.matchPaymentType.toLowerCase() !== paymentType.toLowerCase()) continue;
    }

    if (rule.matchNarration) {
      const normRuleNar = normalizeNarration(rule.matchNarration);
      const escaped = normRuleNar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const narrationRe = new RegExp(`(?:^|[\\s\\W])${escaped}(?:[\\s\\W]|$)`, 'i');
      if (!narrationRe.test(normNarration)) continue;
    }

    if (rule.matchMerchant) {
      const normRuleMerchant = normalizeNarration(rule.matchMerchant);
      if (!normMerchant.includes(normRuleMerchant)) continue;
    }

    if (rule.matchVPA) {
      const normRuleVPA = rule.matchVPA.toLowerCase().trim();
      if (!normVPA || !normVPA.includes(normRuleVPA)) continue;
    }

    return {
      matched: true,
      category: rule.category,
      subcategory: rule.subcategory ?? null,
      ruleId: rule.id,
      ruleName: rule.name,
    };
  }

  return null;
}

/**
 * Try to match a transaction against the user's saved rules.
 * Returns the highest-priority matching rule's classification, or null if no match.
 */
export async function applyUserRules(
  userId: string,
  narration: string,
  direction: 'credit' | 'debit',
  paymentType?: string | null,
  merchantName?: string | null,
  vpa?: string | null
): Promise<UserRuleMatchResult | null> {
  const rules = await prisma.userCategorizationRule.findMany({
    where: { userId, isEnabled: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  return matchRuleSync(rules, narration, direction, paymentType, merchantName, vpa);
}

/**
 * Count how many existing transactions in the user's history would match a given rule config.
 * Used to show the user how many transactions would be affected before they confirm.
 */
export async function countMatchingTransactions(
  userId: string,
  matchNarration?: string | null,
  matchMerchant?: string | null,
  matchVPA?: string | null,
  matchDirection?: string | null,
  matchPaymentType?: string | null,
  excludeTransactionId?: string
): Promise<number> {
  const where: any = {
    statement: { userId },
  };

  if (matchDirection === 'credit' || matchDirection === 'debit') {
    where.type = matchDirection;
  }

  if (matchPaymentType) {
    where.channel = { contains: matchPaymentType, mode: 'insensitive' };
  }

  const candidates = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      rawNarration: true,
      merchantName: true,
      counterparty: true,
      extractedVPA: true,
    },
  });

  let count = 0;
  for (const tx of candidates) {
    if (excludeTransactionId && tx.id === excludeTransactionId) continue;

    const normNar      = normalizeNarration(tx.rawNarration || '');
    const normMerchant = normalizeNarration((tx.merchantName || tx.counterparty) ?? '');
    const normVPA      = (tx.extractedVPA || '').toLowerCase().trim();

    let matches = true;

    if (matchNarration) {
      const normRuleNar = normalizeNarration(matchNarration);
      const escaped = normRuleNar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|[\\s\\W])${escaped}(?:[\\s\\W]|$)`, 'i');
      if (!re.test(normNar)) matches = false;
    }

    if (matches && matchMerchant) {
      const normRuleMer = normalizeNarration(matchMerchant);
      if (!normMerchant.includes(normRuleMer)) matches = false;
    }

    if (matches && matchVPA) {
      const normRuleVPA = matchVPA.toLowerCase().trim();
      if (!normVPA || !normVPA.includes(normRuleVPA)) matches = false;
    }

    if (matches) count++;
  }

  return count;
}

/**
 * Apply a rule to ALL existing matching transactions (called after user confirms).
 * NEVER modifies raw financial values — only updates category/subcategory/appliedRuleId.
 */
export async function applyRuleToExistingTransactions(
  userId: string,
  ruleId: string,
  category: string,
  subcategory: string | null,
  matchNarration?: string | null,
  matchMerchant?: string | null,
  matchVPA?: string | null,
  matchDirection?: string | null,
  matchPaymentType?: string | null,
  excludeTransactionId?: string
): Promise<number> {
  const where: any = {
    statement: { userId },
    // Do NOT overwrite transactions that the user has already manually reviewed
    reviewedAt: null,
  };

  if (matchDirection === 'credit' || matchDirection === 'debit') {
    where.type = matchDirection;
  }

  if (matchPaymentType) {
    where.channel = { contains: matchPaymentType, mode: 'insensitive' };
  }

  const candidates = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      rawNarration: true,
      merchantName: true,
      counterparty: true,
      extractedVPA: true,
    },
  });

  const matchingIds: string[] = [];
  for (const tx of candidates) {
    if (excludeTransactionId && tx.id === excludeTransactionId) continue;

    const normNar      = normalizeNarration(tx.rawNarration || '');
    const normMerchant = normalizeNarration((tx.merchantName || tx.counterparty) ?? '');
    const normVPA      = (tx.extractedVPA || '').toLowerCase().trim();

    let matches = true;

    if (matchNarration) {
      const normRuleNar = normalizeNarration(matchNarration);
      const escaped = normRuleNar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|[\\s\\W])${escaped}(?:[\\s\\W]|$)`, 'i');
      if (!re.test(normNar)) matches = false;
    }

    if (matches && matchMerchant) {
      const normRuleMer = normalizeNarration(matchMerchant);
      if (!normMerchant.includes(normRuleMer)) matches = false;
    }

    if (matches && matchVPA) {
      const normRuleVPA = matchVPA.toLowerCase().trim();
      if (!normVPA || !normVPA.includes(normRuleVPA)) matches = false;
    }

    if (matches) matchingIds.push(tx.id);
  }

  if (matchingIds.length === 0) return 0;

  // Batch update — ONLY classification fields, never raw data
  await prisma.transaction.updateMany({
    where: { id: { in: matchingIds } },
    data: {
      category,
      subcategory: subcategory || null,
      appliedRuleId: ruleId,
      needsReview: false,
    },
  });

  // Increment appliedCount on the rule
  await prisma.userCategorizationRule.update({
    where: { id: ruleId },
    data: { appliedCount: { increment: matchingIds.length } },
  });

  return matchingIds.length;
}
