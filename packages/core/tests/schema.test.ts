import { describe, it, expect } from 'vitest';
import { invoiceSchema } from '../src/schema/invoice.js';

/** Minimal valid invoice fixture */
const validInvoice = {
  invoiceNumber: 'INV-2025-001',
  issueDate: '2025-03-01',
  currency: 'EUR',
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
      name: 'Consulting services',
      description: 'Consulting services — February 2025',
      quantity: 40,
      unitPrice: 150.00,
      vatRate: 19,
      vatCategory: 'S' as const,
    },
  ],
};

describe('invoiceSchema', () => {
  it('accepts a valid invoice', () => {
    const result = invoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('rejects empty invoiceNumber', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      invoiceNumber: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Invoice number');
    }
  });

  it('rejects invalid date format', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      issueDate: '01/03/2025',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('YYYY-MM-DD');
    }
  });

  it('rejects invalid currency length', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      currency: 'EURO',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty lineItems array', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('At least one');
    }
  });

  it('rejects negative quantity', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      lineItems: [{ ...validInvoice.lineItems[0], quantity: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid country code length', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      supplier: {
        ...validInvoice.supplier,
        address: { ...validInvoice.supplier.address, countryCode: 'DEU' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('applies default unitCode = EA', () => {
    const result = invoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lineItems[0].unitCode).toBe('EA');
    }
  });

  it('applies default vatCategory = S', () => {
    const invoice = {
      ...validInvoice,
      lineItems: [{
        name: 'Test item',
        description: 'Test item',
        quantity: 1,
        unitPrice: 100,
        vatRate: 21,
      }],
    };
    const result = invoiceSchema.safeParse(invoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lineItems[0].vatCategory).toBe('S');
    }
  });

  it('accepts optional fields', () => {
    const result = invoiceSchema.safeParse({
      ...validInvoice,
      dueDate: '2025-04-01',
      buyerReference: 'PO-12345',
      note: 'Thank you for your business',
      payment: {
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        reference: 'INV-2025-001',
      },
    });
    expect(result.success).toBe(true);
  });
});
