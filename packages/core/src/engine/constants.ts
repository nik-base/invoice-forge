/**
 * Specification constants for supported e-invoice formats.
 *
 * References:
 *   EN 16931-1:2017 (the normative standard)
 *   Peppol BIS Billing 3.0 — https://docs.peppol.eu/poacc/billing/3.0
 *   XRechnung 3.0 — https://xeinkauf.de/xrechnung/
 */

/** Peppol BIS Billing 3.0 customization identifier */
export const PEPPOL_CUSTOMIZATION_ID =
  'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0';

/** Peppol BIS Billing 3.0 profile identifier */
export const PEPPOL_PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';

/**
 * XRechnung 3.0 customization identifier (covers the entire 3.0.x patch series).
 * XRechnung does not use a ProfileID — intentionally omitted.
 */
export const XRECHNUNG_CUSTOMIZATION_ID =
  'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0';

// ── EN16931 / Peppol rule-ID mapping ────────────────────────────
//
// Maps our simplified schema field paths (dot-notation) →
// EN16931 Business Term (BT), Business Group (BG), or Business Rule (BR) identifiers.

export const FIELD_TO_RULE_ID: Readonly<Record<string, string>> = {
  // Invoice header
  invoiceNumber: 'BT-1',
  issueDate: 'BT-2',
  dueDate: 'BT-9',
  currency: 'BT-5',
  buyerReference: 'BT-10',
  note: 'BT-22',
  orderReference: 'BT-13',
  invoicePeriod: 'BG-14',
  'invoicePeriod.startDate': 'BT-73',
  'invoicePeriod.endDate': 'BT-74',
  // Supplier (BG-4)
  supplier: 'BG-4',
  'supplier.name': 'BT-27',
  'supplier.identifier': 'BT-29',
  'supplier.vatNumber': 'BT-31',
  'supplier.registrationId': 'BT-30',
  'supplier.address': 'BG-5',
  'supplier.address.street': 'BT-35',
  'supplier.address.city': 'BT-37',
  'supplier.address.postalCode': 'BT-38',
  'supplier.address.countryCode': 'BT-40',
  'supplier.contactName': 'BT-41',
  'supplier.email': 'BT-43',
  'supplier.telephone': 'BT-42',
  // Buyer (BG-7)
  buyer: 'BG-7',
  'buyer.name': 'BT-44',
  'buyer.identifier': 'BT-46',
  'buyer.vatNumber': 'BT-48',
  'buyer.registrationId': 'BT-47',
  'buyer.address': 'BG-8',
  'buyer.address.street': 'BT-50',
  'buyer.address.city': 'BT-52',
  'buyer.address.postalCode': 'BT-53',
  'buyer.address.countryCode': 'BT-55',
  'buyer.contactName': 'BT-56',
  'buyer.email': 'BT-58',
  'buyer.telephone': 'BT-57',
  // Payment (BG-16)
  payment: 'BG-16',
  'payment.iban': 'BT-84',
  'payment.bic': 'BT-86',
  'payment.reference': 'BT-83',
  'payment.meansCode': 'BT-81',
  'payment.terms': 'BT-20',
  // Line items (BG-25)
  lineItems: 'BG-25',
  'lineItems.name': 'BT-153',
  'lineItems.description': 'BT-154',
  'lineItems.quantity': 'BT-129',
  'lineItems.unitPrice': 'BT-146',
  'lineItems.unitCode': 'BT-130',
  'lineItems.vatRate': 'BT-152',
  'lineItems.vatCategory': 'BT-151',
};

/**
 * Maps AJV instancePath segments (slash-notation UBL keys) → EN16931 rule IDs.
 * These originate from @e-invoice-eu/core validation errors.
 */
export const AJV_PATH_TO_RULE_ID: Readonly<Record<string, string>> = {
  '/cbc:ID': 'BT-1',
  '/cbc:IssueDate': 'BT-2',
  '/cbc:DueDate': 'BT-9',
  '/cbc:DocumentCurrencyCode': 'BT-5',
  '/cbc:BuyerReference': 'BT-10',
  '/cbc:Note': 'BT-22',
  '/cbc:TaxAmount': 'BT-110',
  '/cbc:TaxableAmount': 'BT-116',
  '/cbc:LineExtensionAmount': 'BT-131',
  '/cbc:PayableAmount': 'BT-115',
  '/cbc:TaxExclusiveAmount': 'BT-109',
  '/cbc:TaxInclusiveAmount': 'BT-112',
  '/cbc:InvoicedQuantity': 'BT-129',
  '/cbc:PriceAmount': 'BT-146',
  '/cac:AccountingSupplierParty': 'BG-4',
  '/cac:AccountingCustomerParty': 'BG-7',
  '/cac:TaxTotal': 'BG-23',
  '/cac:LegalMonetaryTotal': 'BG-22',
  '/cac:InvoiceLine': 'BG-25',
  '/cac:PaymentMeans': 'BG-16',
};

/**
 * Resolve an EN16931 rule ID from a simplified schema field path (dot-notation).
 * Array indices are normalized away: `lineItems[0].description` → `lineItems.description`.
 *
 * @public
 */
export function ruleIdForField(field: string): string | undefined {
  const direct = FIELD_TO_RULE_ID[field];
  if (direct !== undefined) return direct;
  // Normalize array indices and retry
  const normalized = field.replace(/\[\d+\]/g, '').replace(/\.+/g, '.');
  return FIELD_TO_RULE_ID[normalized];
}

/**
 * Resolve an EN16931 rule ID from an AJV instancePath (slash-notation UBL keys).
 * Matches the longest prefix found in the map.
 *
 * @internal
 */
// ── Supported formats ───────────────────────────────────────────────────────

export const SUPPORTED_FORMATS = ['UBL', 'XRECHNUNG-UBL'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

// ── Rule ID resolution ───────────────────────────────────────────────────────

export function ruleIdForAjvPath(instancePath: string): string | undefined {
  const segments = instancePath.split('/');
  for (let len = segments.length; len > 0; len--) {
    const candidate = segments.slice(0, len).join('/');
    const match = AJV_PATH_TO_RULE_ID[candidate];
    if (match !== undefined) return match;
  }
  return undefined;
}
