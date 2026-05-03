# InvoiceForge

> Convert clean JSON invoice data to EN 16931-compliant e-invoice XML (XRechnung 3.0 UBL, Peppol BIS 3.0).

This is the monorepo for the InvoiceForge project, managed via `pnpm` workspaces.

## Packages

Currently, the workspace contains the following packages:

| Package | Description | Version |
|---------|-------------|---------|
| [`@invoiceforge/core`](./packages/core/README.md) | The core TypeScript engine for validating and generating XML e-invoices. | [![npm version](https://img.shields.io/npm/v/@invoiceforge/core)](https://www.npmjs.com/package/@invoiceforge/core) |

*For installation instructions and API documentation, please see the [core package README](./packages/core/README.md).*

## Development & Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for information on setting up the repository locally, running the test suite, and our contributor terms.

## License

InvoiceForge is dual-licensed:
- **Free for non-commercial use.**
- **Commercial use requires a license.**

See [LICENSE.md](LICENSE.md) for full terms.