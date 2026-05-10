# @invoiceforge/core

> Generate EN 16931-compliant e-invoice XML from a clean, human-friendly JSON schema.

Supports **XRechnung 3.0 UBL** (Germany) and **Peppol BIS Billing 3.0** — the two dominant
e-invoice formats for EU B2B and B2G transactions.

[![npm version](https://img.shields.io/npm/v/@invoiceforge/core)](https://www.npmjs.com/package/@invoiceforge/core)
[![license](https://img.shields.io/badge/license-Free%20in%20Beta-brightgreen)](../../LICENSE.md)

---

## Installation

```bash
npm install @invoiceforge/core
# or
pnpm add @invoiceforge/core
```

**Requires Node.js ≥ 20**

---

## Quick Start

```ts
import { invoiceSchema, generateInvoice } from '@invoiceforge/core';

// 1. Parse & validate your data first
const invoice = invoiceSchema.parse({
  invoiceNumber: 'INV-2025-001',
  issueDate: '2025-03-01',
  currency: 'EUR',
  supplier: {
    name: 'Acme GmbH',
    vatNumber: 'DE123456789',
    address: { street: 'Musterstraße 1', city: 'Berlin', postalCode: '10115', countryCode: 'DE' },
  },
  buyer: {
    name: 'Widget Corp',
    vatNumber: 'FR87654321012',
    address: { street: '10 Rue de Rivoli', city: 'Paris', postalCode: '75001', countryCode: 'FR' },
  },
  lineItems: [
    { name: 'Consulting', quantity: 40, unitPrice: 150, vatRate: 19, vatCategory: 'S' },
  ],
  payment: { iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', meansCode: '30' },
  dueDate: '2025-04-01',
});

// 2. Generate XML
const result = await generateInvoice(invoice, 'UBL');

if (result.success) {
  console.log(result.xml);        // Complete UBL XML string
  console.log(result.totals);     // { netAmount, taxAmount, grossAmount }
  console.log(result.warnings);   // Advisory warnings for missing optional fields
} else {
  console.error(result.errors);   // Structured EN16931 errors with ruleId
}
```

---

## Supported Formats

| Format | Standard | Use Case |
|--------|----------|----------|
| `UBL` | Peppol BIS Billing 3.0 | EU cross-border B2B |
| `XRECHNUNG-UBL` | XRechnung 3.0 | German public sector (B2G) |

More formats (CII, EDIFACT) are planned.

---

## API Reference

### `generateInvoice(invoice, format, options?)`

Generate e-invoice XML.

| Parameter | Type | Description |
|-----------|------|-------------|
| `invoice` | `InvoiceInput` | Validated invoice — parse with `invoiceSchema.parse()` first |
| `format` | `'UBL' \| 'XRECHNUNG-UBL'` | Target output format |
| `options.language` | `string` | Language for validation messages (default: `'en'`) |
| `options.logger` | `Logger` | Custom logger (default: silent) |

**Returns:** `Promise<ConversionResult>`

```ts
type ConversionResult = ConversionSuccess | ConversionFailure;

interface ConversionSuccess {
  success: true;
  xml: string;                   // Complete XML string
  totals?: InvoiceTotals;        // { netAmount, taxAmount, grossAmount }
  warnings?: ConversionWarning[]; // Non-fatal advisory messages
}

interface ConversionFailure {
  success: false;
  errors: ConversionError[];     // Structured errors with EN16931 ruleId
}

interface ConversionError {
  field: string;     // e.g. 'supplier.vatNumber'
  message: string;
  ruleId?: string;   // e.g. 'BT-31', 'BR-CO-25'
}
```

---

### `invoiceSchema`

Zod schema for the simplified invoice input. **Always parse your data before calling `generateInvoice`.**

Available as a subpath export:

```ts
import { invoiceSchema } from '@invoiceforge/core';
// or
import { invoiceSchema } from '@invoiceforge/core/schema';
```

#### Key fields

| Field | Type | Required | EN16931 |
|-------|------|----------|---------|
| `invoiceNumber` | `string` | ✅ | BT-1 |
| `issueDate` | `YYYY-MM-DD` | ✅ | BT-2 |
| `dueDate` | `YYYY-MM-DD` | — | BT-9 |
| `currency` | ISO 4217 (3 chars) | ✅ | BT-5 |
| `buyerReference` | `string` | XRechnung only | BT-10 |
| `supplier` | `PartyInput` | ✅ | BG-4 |
| `buyer` | `PartyInput` | ✅ | BG-7 |
| `lineItems` | `LineItemInput[]` | ✅ min 1 | BG-25 |
| `payment` | `object` (optional) | — | BG-16 |

#### Line item fields

| Field | Type | Required | EN16931 |
|-------|------|----------|---------|
| `name` | `string` | ✅ | BT-153 |
| `description` | `string` | — | BT-154 |
| `quantity` | `number > 0` | ✅ | BT-129 |
| `unitPrice` | `number ≥ 0` | ✅ | BT-146 |
| `unitCode` | `string` (default: `EA`) | — | BT-130 |
| `vatRate` | `0–100` | ✅ | BT-152 |
| `vatCategory` | `S\|Z\|E\|AE\|G\|O\|K` (default: `S`) | — | BT-151 |

---

### `warmupValidatorCache(logger?)`

Pre-warm the AJV validator cache at startup to eliminate first-call latency (~50–200ms).

```ts
import { warmupValidatorCache } from '@invoiceforge/core';
warmupValidatorCache(); // call once at app startup
```

---

### `ruleIdForField(field)`

Resolve an EN16931 Business Term ID from a dot-notation field path.
Useful for building user-facing error messages.

```ts
import { ruleIdForField } from '@invoiceforge/core';

ruleIdForField('supplier.vatNumber');  // → 'BT-31'
ruleIdForField('lineItems[0].name');   // → 'BT-153'
ruleIdForField('buyerReference');      // → 'BT-10'
```

---

## XRechnung Requirements

XRechnung invoices have additional requirements beyond EN16931:

- `buyerReference` (Leitweg-ID) is **required** — generation will fail without it
- `supplier.contactName` is strongly recommended (BR-DE-5)
- Either `deliveryDate` or `invoicePeriod` must be set (BR-DE-TMP-32)

---

## Error Handling

All errors are returned as structured objects — `generateInvoice` never throws.

```ts
const result = await generateInvoice(invoice, 'XRECHNUNG-UBL');

if (!result.success) {
  for (const err of result.errors) {
    console.error(`[${err.ruleId ?? 'N/A'}] ${err.field}: ${err.message}`);
  }
}
```

---

## Performance

After the cache is warmed with `warmupValidatorCache()`:

| Scenario | Typical latency |
|----------|----------------|
| First call (cold AJV compile) | ~150–250ms |
| Subsequent calls (warm cache) | ~5–20ms |

---

## TypeScript

All types are bundled. Import what you need:

```ts
import type {
  InvoiceInput,
  LineItemInput,
  PartyInput,
  ConversionResult,
  ConversionSuccess,
  ConversionFailure,
  ConversionError,
  ConversionWarning,
  InvoiceTotals,
  SupportedFormat,
  GenerateInvoiceOptions,
} from '@invoiceforge/core';
```

---

## Contributing

We welcome contributions! However, because InvoiceForge is dual-licensed and sold commercially, all contributors must agree to grant us the right to distribute your code commercially.

Please see [CONTRIBUTING.md](https://github.com/nik-base/invoice-forge/blob/main/CONTRIBUTING.md) for full details on the development workflow and contributor terms.

---

## License

Free for everyone during the public beta — including commercial use.
After the beta: free for non-commercial use, commercial use requires a license.

See [LICENSE.md](https://github.com/nik-base/invoice-forge/blob/main/LICENSE.md) for full terms.