import { bench, describe } from 'vitest';
import { generateInvoice, warmupValidatorCache } from '../src/engine/index.js';
import type { InvoiceInput } from '../src/schema/invoice.js';

const testInvoice: InvoiceInput = {
  invoiceNumber: 'BENCH-001',
  issueDate: '2025-03-20',
  currency: 'EUR',
  language: 'en',
  supplier: {
    name: 'Bench Supplier GmbH',
    vatNumber: 'DE123456789',
    address: {
      street: 'Benchstraße 1',
      city: 'Berlin',
      postalCode: '10115',
      countryCode: 'DE',
    },
  },
  buyer: {
    name: 'Bench Buyer Ltd',
    vatNumber: 'FR12345678901',
    address: {
      street: '1 Bench Street',
      city: 'Paris',
      postalCode: '75001',
      countryCode: 'FR',
    },
  },
  lineItems: [
    {
      name: 'Benchmark Service',
      quantity: 1,
      unitPrice: 100,
      unitCode: 'EA',
      vatRate: 19,
      vatCategory: 'S',
    },
  ],
};

// Warm the cache before benchmarks run so we measure steady-state throughput,
// not AJV compilation overhead.
warmupValidatorCache();

describe('generateInvoice throughput', () => {
  bench('UBL — warm cache', async () => {
    await generateInvoice(testInvoice, 'UBL');
  });

  bench('XRECHNUNG-UBL — warm cache', async () => {
    await generateInvoice({ ...testInvoice, buyerReference: '12345-67' }, 'XRECHNUNG-UBL');
  });
});
