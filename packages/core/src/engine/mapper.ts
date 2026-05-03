import type { Invoice } from '@e-invoice-eu/core';
import type { InvoiceInput, LineItemInput } from '../schema/invoice.js';
import type { InvoiceTotals } from '../types.js';
import type { VatBreakdownEntry } from './math.js';
import { round2, buildVatBreakdown } from './math.js';
import { getEndpointDetails } from './endpoint.js';
import {
  PEPPOL_CUSTOMIZATION_ID,
  PEPPOL_PROFILE_ID,
  XRECHNUNG_CUSTOMIZATION_ID,
} from './constants.js';
import type { SupportedFormat } from './constants.js';

// ── Type aliases to reduce verbosity ────────────────────────────────────────

type SupplierParty = Invoice['ubl:Invoice']['cac:AccountingSupplierParty']['cac:Party'];
type CustomerParty = Invoice['ubl:Invoice']['cac:AccountingCustomerParty']['cac:Party'];
/** Safely extract the element type of an array without noUncheckedIndexedAccess giving T|undefined. */
type ArrayElement<T> = T extends Array<infer U> ? U : never;
type TaxTotalItem = ArrayElement<Invoice['ubl:Invoice']['cac:TaxTotal']>;

// ── Line item mapping ────────────────────────────────────────────────────────

/**
 * Map a single invoice-forge line item to the @e-invoice-eu/core INVOICELINE format.
 *
 * @internal
 */
export function mapLineItem(
  item: LineItemInput,
  index: number,
  currency: string,
): Invoice['ubl:Invoice']['cac:InvoiceLine'][number] {
  const lineTotal = item.quantity * item.unitPrice;

  return {
    'cbc:ID': String(index + 1),
    'cbc:InvoicedQuantity': String(item.quantity),
    'cbc:InvoicedQuantity@unitCode': item.unitCode ?? 'EA',
    'cbc:LineExtensionAmount': round2(lineTotal),
    'cbc:LineExtensionAmount@currencyID': currency,
    'cac:Item': {
      'cbc:Name': item.name,
      ...(item.description !== undefined ? { 'cbc:Description': item.description } : {}),
      'cac:ClassifiedTaxCategory': {
        'cbc:ID': item.vatCategory ?? 'S',
        'cbc:Percent': item.vatRate.toFixed(2),
        'cac:TaxScheme': { 'cbc:ID': 'VAT' },
      },
    },
    'cac:Price': {
      'cbc:PriceAmount': round2(item.unitPrice),
      'cbc:PriceAmount@currencyID': currency,
    },
  } as Invoice['ubl:Invoice']['cac:InvoiceLine'][number];
}

// ── Party mapping ────────────────────────────────────────────────────────────

/**
 * Build the AccountingSupplierParty (BG-4) structure.
 *
 * @internal
 */
function mapSupplierParty(invoice: InvoiceInput): SupplierParty {
  const endpoint = getEndpointDetails(invoice.supplier);
  const idFallback = invoice.supplier.identifier ?? invoice.supplier.vatNumber;

  const taxSchemes: SupplierParty['cac:PartyTaxScheme'] = invoice.supplier.vatNumber !== undefined
    ? [{ 'cbc:CompanyID': invoice.supplier.vatNumber, 'cac:TaxScheme': { 'cbc:ID': 'VAT' } }]
    : [];

  return {
    ...(endpoint !== undefined
      ? {
          'cbc:EndpointID': endpoint.id,
          'cbc:EndpointID@schemeID': endpoint.scheme as string,
        }
      : {}),
    ...(idFallback !== undefined
      ? { 'cac:PartyIdentification': [{ 'cbc:ID': idFallback }] }
      : {}),
    'cac:PartyName': { 'cbc:Name': invoice.supplier.name },
    'cac:PostalAddress': {
      'cbc:StreetName': invoice.supplier.address.street,
      'cbc:CityName': invoice.supplier.address.city,
      'cbc:PostalZone': invoice.supplier.address.postalCode,
      'cac:Country': {
        'cbc:IdentificationCode': invoice.supplier.address.countryCode as 'BE',
      },
    },
    'cac:PartyTaxScheme': taxSchemes,
    'cac:PartyLegalEntity': {
      'cbc:RegistrationName': invoice.supplier.name,
      ...(invoice.supplier.registrationId !== undefined
        ? { 'cbc:CompanyID': invoice.supplier.registrationId }
        : {}),
    },
    ...(invoice.supplier.contactName !== undefined ||
    invoice.supplier.email !== undefined ||
    invoice.supplier.telephone !== undefined
      ? {
          'cac:Contact': {
            ...(invoice.supplier.contactName !== undefined
              ? { 'cbc:Name': invoice.supplier.contactName }
              : {}),
            ...(invoice.supplier.email !== undefined
              ? { 'cbc:ElectronicMail': invoice.supplier.email }
              : {}),
            ...(invoice.supplier.telephone !== undefined
              ? { 'cbc:Telephone': invoice.supplier.telephone }
              : {}),
          },
        }
      : {}),
  } as SupplierParty;
}

/**
 * Build the AccountingCustomerParty (BG-7) structure.
 *
 * @internal
 */
function mapBuyerParty(invoice: InvoiceInput): CustomerParty {
  const endpoint = getEndpointDetails(invoice.buyer);
  const idFallback = invoice.buyer.identifier ?? invoice.buyer.vatNumber;

  const taxScheme: CustomerParty['cac:PartyTaxScheme'] =
    invoice.buyer.vatNumber !== undefined
      ? { 'cbc:CompanyID': invoice.buyer.vatNumber, 'cac:TaxScheme': { 'cbc:ID': 'VAT' } }
      : undefined;

  return {
    ...(endpoint !== undefined
      ? {
          'cbc:EndpointID': endpoint.id,
          'cbc:EndpointID@schemeID': endpoint.scheme as string,
        }
      : {}),
    ...(idFallback !== undefined
      ? { 'cac:PartyIdentification': { 'cbc:ID': idFallback } }
      : {}),
    'cac:PartyName': { 'cbc:Name': invoice.buyer.name },
    'cac:PostalAddress': {
      'cbc:StreetName': invoice.buyer.address.street,
      'cbc:CityName': invoice.buyer.address.city,
      'cbc:PostalZone': invoice.buyer.address.postalCode,
      'cac:Country': {
        'cbc:IdentificationCode': invoice.buyer.address.countryCode as 'BE',
      },
    },
    ...(taxScheme !== undefined ? { 'cac:PartyTaxScheme': taxScheme } : {}),
    'cac:PartyLegalEntity': {
      'cbc:RegistrationName': invoice.buyer.name,
    },
    ...(invoice.buyer.contactName !== undefined ||
    invoice.buyer.email !== undefined ||
    invoice.buyer.telephone !== undefined
      ? {
          'cac:Contact': {
            ...(invoice.buyer.contactName !== undefined
              ? { 'cbc:Name': invoice.buyer.contactName }
              : {}),
            ...(invoice.buyer.email !== undefined
              ? { 'cbc:ElectronicMail': invoice.buyer.email }
              : {}),
            ...(invoice.buyer.telephone !== undefined
              ? { 'cbc:Telephone': invoice.buyer.telephone }
              : {}),
          },
        }
      : {}),
  } as CustomerParty;
}

// ── Invoice mapping ──────────────────────────────────────────────────────────

export interface MappedInvoiceResult {
  invoice: Invoice;
  totals: InvoiceTotals;
  /** Pre-computed VAT breakdown — pass to cac:TaxTotal to avoid recomputing. */
  vatBreakdown: VatBreakdownEntry[];
}

/**
 * Map a invoice-forge simplified invoice to the @e-invoice-eu/core Invoice format.
 *
 * Throws if lineItems is empty (EN16931 BG-25 requires at least one line).
 *
 * The returned vatBreakdown is pre-computed once and should be reused by the
 * caller when building cac:TaxTotal — do NOT call buildVatBreakdown again.
 *
 * @internal
 */
export function mapToEInvoiceFormat(
  invoice: InvoiceInput,
  format: SupportedFormat,
): MappedInvoiceResult {
  if (invoice.lineItems.length === 0) {
    throw new Error('Invoice must contain at least one line item (EN16931 BG-25).');
  }

  const currency = invoice.currency as Invoice['ubl:Invoice']['cbc:DocumentCurrencyCode'];

  // Compute totals
  const taxExclusiveAmount = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  // Compute VAT breakdown ONCE — reused both for totals and for cac:TaxTotal
  const vatBreakdown = buildVatBreakdown(invoice.lineItems, invoice.currency);
  const taxAmount = vatBreakdown.reduce((sum, b) => sum + parseFloat(b['cbc:TaxAmount']), 0);
  const taxInclusiveAmount = taxExclusiveAmount + taxAmount;

  // Build payment means
  const paymentMeans = invoice.payment !== undefined
    ? [
        {
          'cbc:PaymentMeansCode': (invoice.payment.meansCode ?? '30') as '30',
          ...(invoice.payment.reference !== undefined
            ? { 'cbc:PaymentID': invoice.payment.reference }
            : {}),
          ...(invoice.payment.iban !== undefined
            ? {
                'cac:PayeeFinancialAccount': {
                  'cbc:ID': invoice.payment.iban,
                  ...(invoice.payment.bic !== undefined
                    ? {
                        'cac:FinancialInstitutionBranch': { 'cbc:ID': invoice.payment.bic },
                      }
                    : {}),
                },
              }
            : {}),
        },
      ]
    : undefined;

  const mappedInvoice: Invoice = {
    'ubl:Invoice': {
      'cbc:CustomizationID':
        format === 'XRECHNUNG-UBL' ? XRECHNUNG_CUSTOMIZATION_ID : PEPPOL_CUSTOMIZATION_ID,
      ...(format !== 'XRECHNUNG-UBL' ? { 'cbc:ProfileID': PEPPOL_PROFILE_ID } : {}),
      'cbc:ID': invoice.invoiceNumber,
      'cbc:IssueDate': invoice.issueDate,
      ...(invoice.dueDate !== undefined ? { 'cbc:DueDate': invoice.dueDate } : {}),
      'cbc:InvoiceTypeCode': '380', // Standard commercial invoice
      ...(invoice.note !== undefined ? { 'cbc:Note': [invoice.note] } : {}),
      'cbc:DocumentCurrencyCode': currency,
      ...(invoice.buyerReference !== undefined
        ? { 'cbc:BuyerReference': invoice.buyerReference }
        : {}),
      ...(invoice.invoicePeriod !== undefined
        ? {
            'cac:InvoicePeriod': {
              ...(invoice.invoicePeriod.startDate !== undefined
                ? { 'cbc:StartDate': invoice.invoicePeriod.startDate }
                : {}),
              ...(invoice.invoicePeriod.endDate !== undefined
                ? { 'cbc:EndDate': invoice.invoicePeriod.endDate }
                : {}),
            },
          }
        : {}),
      ...(invoice.orderReference !== undefined
        ? { 'cac:OrderReference': { 'cbc:ID': invoice.orderReference } }
        : {}),
      ...(invoice.deliveryDate !== undefined
        ? { 'cac:Delivery': { 'cbc:ActualDeliveryDate': invoice.deliveryDate } }
        : {}),
      'cac:AccountingSupplierParty': { 'cac:Party': mapSupplierParty(invoice) },
      'cac:AccountingCustomerParty': { 'cac:Party': mapBuyerParty(invoice) },
      ...(paymentMeans !== undefined
        ? {
            'cac:PaymentMeans': paymentMeans as NonNullable<Invoice['ubl:Invoice']['cac:PaymentMeans']>,
          }
        : {}),
      ...(invoice.payment?.terms !== undefined
        ? { 'cac:PaymentTerms': { 'cbc:Note': invoice.payment.terms } }
        : {}),
      'cac:TaxTotal': [
        {
          'cbc:TaxAmount': round2(taxAmount),
          'cbc:TaxAmount@currencyID': currency,
          'cac:TaxSubtotal': vatBreakdown as NonNullable<TaxTotalItem['cac:TaxSubtotal']>,
        },
      ],
      'cac:LegalMonetaryTotal': {
        'cbc:LineExtensionAmount': round2(taxExclusiveAmount),
        'cbc:LineExtensionAmount@currencyID': currency,
        'cbc:TaxExclusiveAmount': round2(taxExclusiveAmount),
        'cbc:TaxExclusiveAmount@currencyID': currency,
        'cbc:TaxInclusiveAmount': round2(taxInclusiveAmount),
        'cbc:TaxInclusiveAmount@currencyID': currency,
        'cbc:PayableAmount': round2(taxInclusiveAmount),
        'cbc:PayableAmount@currencyID': currency,
      },
      'cac:InvoiceLine': invoice.lineItems.map((item, i) =>
        mapLineItem(item, i, invoice.currency),
      ) as Invoice['ubl:Invoice']['cac:InvoiceLine'],
    },
  };

  return {
    invoice: mappedInvoice,
    totals: { netAmount: taxExclusiveAmount, taxAmount, grossAmount: taxInclusiveAmount },
    vatBreakdown,
  };
}
