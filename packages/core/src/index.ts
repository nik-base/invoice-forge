// @invoiceforge/core — public API

// Schema — parse and validate invoice input before calling generateInvoice
export { invoiceSchema } from './schema/invoice.js';
export type { InvoiceInput, LineItemInput, AddressInput, PartyInput } from './schema/invoice.js';

// Engine — generate e-invoice XML
export {
  generateInvoice,
  SUPPORTED_FORMATS,
  warmupValidatorCache,
  ruleIdForField,
} from './engine/index.js';
export type { SupportedFormat, GenerateInvoiceOptions } from './engine/index.js';

// Result types
export type {
  ConversionResult,
  ConversionError,
  ConversionWarning,
  InvoiceTotals,
  ConversionSuccess,
  ConversionFailure,
} from './types.js';
