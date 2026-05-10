import type { LineItemInput } from '../schema/invoice.js';

/**
 * Half-up rounding to 2 decimal places (standard financial arithmetic).
 * Safe against standard IEEE 754 floating-point drift.
 *
 * @internal
 */
export function round2(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

export interface VatBreakdownEntry {
  'cbc:TaxableAmount': string;
  'cbc:TaxableAmount@currencyID': string;
  'cbc:TaxAmount': string;
  'cbc:TaxAmount@currencyID': string;
  'cac:TaxCategory': {
    'cbc:ID': string;
    'cbc:Percent': string;
    'cac:TaxScheme': { 'cbc:ID': 'VAT' };
  };
}

/**
 * Build VAT breakdown subtotals grouped by category + rate.
 *
 * Follows EN16931 rules:
 *   BT-116: Sum of line extension amounts per VAT category (taxable base).
 *   BT-117: Calculated VAT amount per category.
 *
 * Returns a single computed array — callers should pass it through rather
 * than invoking this function multiple times for the same invoice.
 *
 * @internal
 */
export function buildVatBreakdown(
  items: readonly LineItemInput[],
  currency: string,
): VatBreakdownEntry[] {
  const groups = new Map<string, { taxable: number; rate: number; category: string }>();

  for (const item of items) {
    const lineTotal = Math.round((item.quantity * item.unitPrice + Number.EPSILON) * 100) / 100;
    const key = `${item.vatCategory ?? 'S'}-${item.vatRate}`;
    const existing = groups.get(key);
    if (existing !== undefined) {
      existing.taxable += lineTotal;
    } else {
      groups.set(key, {
        taxable: lineTotal,
        rate: item.vatRate,
        category: item.vatCategory ?? 'S',
      });
    }
  }

  return Array.from(groups.values()).map((g) => {
    // EN16931 BT-116: round the category taxable base first
    const categoryTaxableRound = Math.round((g.taxable + Number.EPSILON) * 100) / 100;
    // EN16931 BT-117: apply rate to the rounded base
    const categoryTaxAmount =
      Math.round((categoryTaxableRound * (g.rate / 100) + Number.EPSILON) * 100) / 100;

    return {
      'cbc:TaxableAmount': categoryTaxableRound.toFixed(2),
      'cbc:TaxableAmount@currencyID': currency,
      'cbc:TaxAmount': categoryTaxAmount.toFixed(2),
      'cbc:TaxAmount@currencyID': currency,
      'cac:TaxCategory': {
        'cbc:ID': g.category,
        'cbc:Percent': g.rate.toFixed(2),
        'cac:TaxScheme': { 'cbc:ID': 'VAT' as const },
      },
    };
  });
}
