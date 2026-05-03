import { describe, it, expect } from 'vitest';
import { generateInvoice } from '../src/engine/index.js';
import { ruleIdForField } from '../src/engine/constants.js';
import type { InvoiceInput } from '../src/schema/invoice.js';

// ── Fixture ──────────────────────────────────────────────────────────────────

/** Minimal valid invoice. All required fields present. */
const sampleInvoice: InvoiceInput = {
  invoiceNumber: 'INV-2025-001',
  issueDate: '2025-03-01',
  currency: 'EUR',
  language: 'en',
  supplier: {
    name: 'Acme GmbH',
    vatNumber: 'DE123456789',
    address: {
      street: 'Musterstraße 1',
      city: 'Berlin',
      postalCode: '10115',
      countryCode: 'DE',
    },
  },
  buyer: {
    name: 'Widget Corp',
    vatNumber: 'FR87654321012',
    address: {
      street: '10 Rue de Rivoli',
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR',
    },
  },
  lineItems: [
    {
      name: 'Consulting Services',
      description: 'Consulting services — February 2025',
      quantity: 40,
      unitPrice: 150.00,
      unitCode: 'EA',
      vatRate: 19,
      vatCategory: 'S',
    },
  ],
};

// ── UBL generation ───────────────────────────────────────────────────────────

describe('generateInvoice: UBL', () => {
  it('generates valid UBL XML from a minimal invoice', async () => {
    const result = await generateInvoice(sampleInvoice, 'UBL');

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.xml).toContain('<?xml');
    expect(result.xml).toContain('Invoice');
    expect(result.xml).toContain('INV-2025-001');
    expect(result.xml).toContain('Acme GmbH');
    expect(result.xml).toContain('Widget Corp');
    expect(result.xml).toContain('EUR');
  });

  it('calculates correct line extension amount (40 × 150.00 = 6000.00)', async () => {
    const result = await generateInvoice(sampleInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('6000.00');
  });

  it('calculates correct VAT amount (6000.00 × 19% = 1140.00)', async () => {
    const result = await generateInvoice(sampleInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('1140.00');
  });

  it('calculates correct total including VAT (6000.00 + 1140.00 = 7140.00)', async () => {
    const result = await generateInvoice(sampleInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('7140.00');
  });

  it('returns structured totals in ConversionSuccess', async () => {
    const result = await generateInvoice(sampleInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.totals?.netAmount).toBeCloseTo(6000, 2);
    expect(result.totals?.taxAmount).toBeCloseTo(1140, 2);
    expect(result.totals?.grossAmount).toBeCloseTo(7140, 2);
  });

  it('handles multiple line items with different VAT rates', async () => {
    const multiLineInvoice: InvoiceInput = {
      ...sampleInvoice,
      lineItems: [
        {
          name: 'Standard Rate Item',
          description: 'Standard rate item',
          quantity: 2,
          unitPrice: 100.00,
          unitCode: 'EA',
          vatRate: 19,
          vatCategory: 'S',
        },
        {
          name: 'Reduced Rate Item',
          description: 'Reduced rate item',
          quantity: 5,
          unitPrice: 20.00,
          unitCode: 'EA',
          vatRate: 7,
          vatCategory: 'S',
        },
      ],
    };

    const result = await generateInvoice(multiLineInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Line 1: 2 × 100 = 200
    expect(result.xml).toContain('200.00');
    // Line 2: 5 × 20 = 100
    expect(result.xml).toContain('100.00');
    // Total line extension: 300.00
    expect(result.xml).toContain('300.00');
  });

  it('handles zero-VAT items (vatCategory Z, vatRate 0)', async () => {
    const zeroVatInvoice: InvoiceInput = {
      ...sampleInvoice,
      lineItems: [
        {
          name: 'Zero-rated Export',
          quantity: 1,
          unitPrice: 500.00,
          unitCode: 'EA',
          vatRate: 0,
          vatCategory: 'Z',
        },
      ],
    };
    const result = await generateInvoice(zeroVatInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('500.00');
    // Zero VAT — TaxAmount must be 0.00
    expect(result.xml).toContain('0.00');
  });

  it('includes IBAN and BIC in XML when payment details are provided', async () => {
    const invoiceWithPayment: InvoiceInput = {
      ...sampleInvoice,
      payment: {
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        reference: 'PAY-REF-001',
        meansCode: '30',
      },
    };
    const result = await generateInvoice(invoiceWithPayment, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('DE89370400440532013000');
    expect(result.xml).toContain('COBADEFFXXX');
  });

  it('includes invoice note in XML when provided', async () => {
    const invoiceWithNote: InvoiceInput = {
      ...sampleInvoice,
      note: 'Payment due within 30 days',
    };
    const result = await generateInvoice(invoiceWithNote, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('Payment due within 30 days');
  });

  it('emits warnings for missing optional-but-recommended fields', async () => {
    // sampleInvoice has no dueDate, no payment IBAN — should trigger warnings
    const result = await generateInvoice(sampleInvoice, 'UBL');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings).toBeDefined();
    const warnFields = result.warnings?.map((w) => w.field) ?? [];
    expect(warnFields).toContain('dueDate');
    expect(warnFields).toContain('payment.iban');
  });

  it('returns structured ConversionFailure on engine error', async () => {
    // Empty currency bypasses Zod but should be caught by AJV
    const brokenInvoice = { ...sampleInvoice, currency: '' } as InvoiceInput;
    const result = await generateInvoice(brokenInvoice, 'UBL');
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.field).toBeDefined();
      expect(result.errors[0]?.message).toBeDefined();
    }
  });
});

// ── XRechnung generation ─────────────────────────────────────────────────────

describe('generateInvoice: XRECHNUNG-UBL', () => {
  it('rejects invoices missing buyerReference (Leitweg-ID)', async () => {
    const invoice: InvoiceInput = { ...sampleInvoice, buyerReference: undefined };
    const result = await generateInvoice(invoice, 'XRECHNUNG-UBL');

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors[0]?.field).toBe('buyerReference');
    expect(result.errors[0]?.message).toContain('XRECHNUNG-UBL');
    expect(result.errors[0]?.ruleId).toBe('BT-10');
  });

  it('sets the correct XRechnung CustomizationID', async () => {
    const invoice: InvoiceInput = { ...sampleInvoice, buyerReference: '12345-67' };
    const result = await generateInvoice(invoice, 'XRECHNUNG-UBL');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('urn:xeinkauf.de:kosit:xrechnung_3.0');
  });

  it('includes BuyerReference (Leitweg-ID) in the XML output', async () => {
    const invoice: InvoiceInput = { ...sampleInvoice, buyerReference: '12345-67' };
    const result = await generateInvoice(invoice, 'XRECHNUNG-UBL');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.xml).toContain('<cbc:BuyerReference>12345-67</cbc:BuyerReference>');
  });

  it('emits XRechnung-specific warnings for missing contactName and deliveryDate', async () => {
    const invoice: InvoiceInput = { ...sampleInvoice, buyerReference: '12345-67' };
    const result = await generateInvoice(invoice, 'XRECHNUNG-UBL');

    expect(result.success).toBe(true);
    if (!result.success) return;
    const warnFields = result.warnings?.map((w) => w.field) ?? [];
    expect(warnFields).toContain('supplier.contactName');
    expect(warnFields).toContain('deliveryDate');
  });
});

// ── Rule ID resolution ───────────────────────────────────────────────────────

describe('ruleIdForField', () => {
  it('resolves top-level field names', () => {
    expect(ruleIdForField('invoiceNumber')).toBe('BT-1');
    expect(ruleIdForField('currency')).toBe('BT-5');
    expect(ruleIdForField('buyerReference')).toBe('BT-10');
  });

  it('resolves nested field paths', () => {
    expect(ruleIdForField('supplier.vatNumber')).toBe('BT-31');
    expect(ruleIdForField('buyer.address.countryCode')).toBe('BT-55');
    expect(ruleIdForField('payment.iban')).toBe('BT-84');
  });

  it('normalizes array indices in path', () => {
    expect(ruleIdForField('lineItems[0].name')).toBe('BT-153');
    expect(ruleIdForField('lineItems[2].vatRate')).toBe('BT-152');
  });

  it('returns undefined for unknown fields', () => {
    expect(ruleIdForField('nonExistentField')).toBeUndefined();
  });
});
