/**
 * categorizer-helpers.ts
 *
 * Legacy helper functions preserved for backward compatibility.
 * These are thin wrappers around the new entity-resolver functions.
 */

import { extractUPIComponents, extractCounterpartyName, detectChannel } from './entity-resolver.service';

export function extractReferenceId(description: string): string | null {
  const { utrRef } = extractUPIComponents(description);
  return utrRef || null;
}

export function detectPaymentChannel(description: string): string {
  return detectChannel(description);
}

export function extractCounterparty(description: string): { counterparty: string; merchantName: string } {
  const { payerName, vpa } = extractUPIComponents(description);
  const name = extractCounterpartyName(description, payerName);
  return { counterparty: name, merchantName: name };
}
