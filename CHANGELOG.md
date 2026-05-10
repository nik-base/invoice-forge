# Changelog

All notable changes to `@invoiceforge/core` will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-10

### Added

- Initial public beta release of `@invoiceforge/core`.
- `generateInvoice(invoice, format, options?)` — generate EN 16931-compliant e-invoice XML from a simplified JSON schema. Returns a discriminated `ConversionResult` union; never throws.
- Supported output formats: `UBL` (Peppol BIS Billing 3.0) and `XRECHNUNG-UBL` (XRechnung 3.0).
- `invoiceSchema` — Zod schema for validating invoice input before generation. Available at `@invoiceforge/core` and `@invoiceforge/core/schema`.
- `warmupValidatorCache(logger?)` — pre-warm AJV validator cache at startup to eliminate first-call compilation latency (~150–250ms cold; ~5–20ms warm).
- `ruleIdForField(field)` — resolve EN16931 Business Term IDs (e.g. `BT-31`) from dot-notation field paths, including array index normalisation.
- Structured `ConversionError` and `ConversionWarning` types, each carrying an optional `ruleId` referencing the broken or missing EN16931/Peppol rule.
- `InvoiceTotals` — pre-computed `{ netAmount, taxAmount, grossAmount }` returned on success.
- Advisory warnings for missing-but-recommended fields: `dueDate`, `supplier.vatNumber`, `buyer.vatNumber`, `payment.iban`, and XRechnung-specific rules (`supplier.contactName`, `deliveryDate`/`invoicePeriod`, `supplier.registrationId`).
- XRechnung pre-validation: rejects invoices missing `buyerReference` (Leitweg-ID, BT-10) before any XML generation attempt.
- Peppol EndpointID routing — derives `EndpointID` and ICD scheme from VAT number country prefix (all EU member states + NO, GB) with email fallback.
- VAT breakdown grouped by category + rate following EN16931 BT-116/BT-117 rounding rules.
- Silent default logger — library never writes to stdout, safe for MCP stdio transport.
- npm provenance attestation enabled.
- CI matrix across Node.js 20 and 22.

[0.1.0]: https://github.com/invoiceforge/invoice-forge/releases/tag/v0.1.0