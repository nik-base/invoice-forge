import { z } from 'zod';

/**
 * Simplified, agent-friendly invoice schema for invoice-forge.
 *
 * This is the public API that AI agents interact with.
 * The engine maps this to @e-invoice-eu/core's verbose Peppol UBL JSON format.
 *
 * Covers: Peppol BIS Billing 3.0, Invoice Type 380 (Standard Commercial Invoice).
 */

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  countryCode: z.string().length(2, 'Country code must be ISO 3166-1 alpha-2 (2 letters)'),
});

const partySchema = z.object({
  name: z.string().min(1, 'Party name is required'),
  identifier: z.string().optional(),
  vatNumber: z.string().optional(),
  address: addressSchema,
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
  registrationId: z.string().optional(),
});

const lineItemSchema = z.object({
  name: z.string().min(1, 'Item name is required (BT-153)'),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  unitCode: z.string().default('EA'),
  vatRate: z.number().min(0).max(100, 'VAT rate must be between 0 and 100'),
  vatCategory: z.enum(['S', 'Z', 'E', 'AE', 'G', 'O', 'K']).default('S'),
});

const paymentSchema = z.object({
  iban: z.string().optional(),
  bic: z.string().optional(),
  reference: z.string().optional(),
  meansCode: z.string().default('30'), // 30 = credit transfer (most common)
  terms: z.string().optional(),
}).optional();

const invoicePeriodSchema = z.object({
  startDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Start date must be in YYYY-MM-DD format',
  ).optional(),
  endDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'End date must be in YYYY-MM-DD format',
  ).optional(),
}).optional();

export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  issueDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Issue date must be in YYYY-MM-DD format',
  ),
  dueDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Due date must be in YYYY-MM-DD format',
  ).optional(),
  deliveryDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Delivery date must be in YYYY-MM-DD format',
  ).optional(),
  currency: z.string().length(3, 'Currency must be ISO 4217 (3 letters, e.g. EUR)'),
  buyerReference: z.string().optional(),
  note: z.string().optional(),
  supplier: partySchema,
  buyer: partySchema,
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  payment: paymentSchema,
  invoicePeriod: invoicePeriodSchema,
  orderReference: z.string().optional(),
  language: z.string().default('en'),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type PartyInput = z.infer<typeof partySchema>;
