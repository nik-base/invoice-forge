import type { InvoiceInput } from '../schema/invoice.js';
import type { ConversionWarning } from '../types.js';
import type { SupportedFormat } from './constants.js';

/**
 * Inspect a invoice-forge invoice and emit advisory warnings for important
 * optional fields that are absent but strongly recommended by the standard.
 *
 * These are non-fatal — generation still succeeds. Returned warnings should
 * be surfaced to the caller so they can improve their invoice data.
 *
 * @internal
 */
export function buildWarnings(
  invoice: InvoiceInput,
  format: SupportedFormat,
): ConversionWarning[] {
  const warnings: ConversionWarning[] = [];

  if (invoice.dueDate === undefined && invoice.payment?.reference === undefined) {
    warnings.push({
      field: 'dueDate',
      ruleId: 'BT-9',
      message:
        'No due date (BT-9) or payment reference set; buyers may be unable to schedule payment automatically.',
    });
  }

  if (invoice.supplier.vatNumber === undefined) {
    warnings.push({
      field: 'supplier.vatNumber',
      ruleId: 'BT-31',
      message: 'Supplier VAT number (BT-31) is missing; required for intra-EU B2B invoicing.',
    });
  }

  if (invoice.buyer.vatNumber === undefined) {
    warnings.push({
      field: 'buyer.vatNumber',
      ruleId: 'BT-48',
      message: 'Buyer VAT number (BT-48) is missing; recommended for B2B invoicing.',
    });
  }

  if (invoice.payment?.iban === undefined) {
    warnings.push({
      field: 'payment.iban',
      ruleId: 'BT-84',
      message:
        'No IBAN (BT-84) provided; buyers cannot make direct bank transfers without payment details.',
    });
  }

  if (format === 'XRECHNUNG-UBL') {
    if (invoice.supplier.registrationId === undefined) {
      warnings.push({
        field: 'supplier.registrationId',
        ruleId: 'BT-30',
        message: 'Supplier legal registration ID (BT-30) is recommended for XRechnung invoices.',
      });
    }

    if (invoice.deliveryDate === undefined && invoice.invoicePeriod === undefined) {
      warnings.push({
        field: 'deliveryDate',
        ruleId: 'BR-DE-TMP-32',
        message:
          'XRechnung requires either a delivery date (BT-72) or an invoice period (BG-14) (BR-DE-TMP-32).',
      });
    }

    if (invoice.supplier.contactName === undefined) {
      warnings.push({
        field: 'supplier.contactName',
        ruleId: 'BR-DE-5',
        message: 'XRechnung requires a seller contact point name (BT-41) (BR-DE-5).',
      });
    }
  }

  return warnings;
}
