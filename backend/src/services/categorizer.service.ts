/**
 * FINOVA Categorization Orchestrator v6
 *
 * Thin wrapper over the Entity Resolution pipeline.
 * Preserves the existing categorizeTransaction() API signature so
 * statements.controller.ts requires only additive changes (entityType, businessType).
 *
 * Pipeline (executed by entity-resolver.service.ts):
 *  1. Normalize narration
 *  2. Extract UPI/VPA components
 *  3. Entity KB lookup (350+ entities: alias + VPA match)
 *  4. Direction intelligence (salary/refund/EMI/P2P)
 *  5. Person heuristic (Indian name detection)
 *  6. Keyword/pattern fallback rules
 *  7. Fallback: Needs Review (never blindly "Other")
 */

import { resolveEntity } from './entity-resolver.service';

export interface CategorizationResult {
  category: string;
  subcategory: string;
  merchantName: string;
  counterparty: string;
  channel: string;
  confidence: 'high' | 'medium' | 'low';
  referenceId: string | null;
  needsReview: boolean;
  classificationReason: string;
  // New enriched fields from entity resolver
  entityType: string;
  businessType: string;
  transactionType: string;
  legalName?: string;
  parentCompany?: string;
  extractedVPA?: string;
  matchedAlias?: string;
  matchedBy?: string;
}

/**
 * Main categorization entry point.
 * Called by statements.controller.ts for both bank and wallet transactions.
 */
export function categorizeTransaction(
  rawNarration: string,
  isCredit: boolean,
  source: 'BANK' | 'WALLET' = 'BANK'
): CategorizationResult {
  const resolved = resolveEntity(rawNarration, isCredit, source);

  return {
    category: resolved.category,
    subcategory: resolved.subcategory,
    merchantName: resolved.merchantName,
    counterparty: resolved.counterparty,
    channel: resolved.channel,
    confidence: resolved.confidence,
    referenceId: resolved.referenceId,
    needsReview: resolved.needsReview,
    classificationReason: resolved.classificationReason,
    // New fields
    entityType: resolved.entityType,
    businessType: resolved.businessType,
    transactionType: resolved.transactionType,
    legalName: resolved.legalName,
    parentCompany: resolved.parentCompany,
    extractedVPA: resolved.extractedVPA,
    matchedAlias: resolved.matchedAlias,
    matchedBy: resolved.matchedBy,
  };
}

// ── Legacy helpers (preserved for backward compatibility) ─────────────────────

export function categorize(description: string, isCredit: boolean): string {
  const res = categorizeTransaction(description, isCredit);
  return `${res.category} – ${res.subcategory}`;
}

export function isIncomeCategory(categoryStr: string): boolean {
  return (
    categoryStr.startsWith('Income') ||
    categoryStr.includes('Loan Disbursement') ||
    categoryStr.includes('Salary') ||
    categoryStr.includes('Wallet Top-Up') ||
    categoryStr.includes('Refund')
  );
}

export function isExpenseCategory(categoryStr: string): boolean {
  return (
    !isIncomeCategory(categoryStr) &&
    !categoryStr.includes('P2P Transfer') &&
    !categoryStr.includes('Person-to-Person') &&
    !categoryStr.includes('Own Account Transfer') &&
    !categoryStr.includes('Internal Transfer')
  );
}

// Re-export helpers from resolver for any direct usage
export { extractReferenceId } from './categorizer-helpers';
export { detectPaymentChannel } from './categorizer-helpers';
export { extractCounterparty } from './categorizer-helpers';
export { isLikelyPersonName } from './entity-resolver.service';
