# Contributing to InvoiceForge

Thank you for your interest in contributing to InvoiceForge!

InvoiceForge is dual-licensed: it is free for non-commercial use, but requires a paid license for commercial use. To maintain this business model and legally distribute the software to our commercial customers, we require all contributors to sign a Contributor License Agreement (CLA).

## Contributor Agreement

To keep things simple, we do not require you to sign a formal document or use a bot. Instead, **by submitting a Pull Request to this repository, you explicitly agree that:**

1. You grant InvoiceForge a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contribution.
2. You grant InvoiceForge the right to re-license your contribution to our commercial customers.

You still retain ownership and the original copyright of your code; you are simply granting us the necessary rights to maintain our dual-licensed business model.

## Development Workflow

1. **Fork & Clone:** Fork the repository and clone it locally.
2. **Install Dependencies:** We use `pnpm` for package management.
   ```bash
   pnpm install
   ```
3. **Create a Branch:** Create a branch for your feature or bug fix.
4. **Make Changes:** Keep your changes focused and atomic.
5. **Testing:** Ensure your code is thoroughly tested.
   ```bash
   pnpm test
   ```
6. **Typechecking:** Ensure there are no TypeScript errors.
   ```bash
   pnpm -r run typecheck
   ```
7. **Submit a PR:** Push your branch and open a Pull Request against the `main` branch.

## Reporting Bugs and Requesting Features

If you aren't ready to contribute code but have found a bug or have a feature request, please open an issue in the GitHub issue tracker.

**For bugs, please provide:**
- A clear description of the issue.
- Steps to reproduce.
- Expected behavior vs. actual behavior.
- Relevant system information (Node version, OS).

**For security vulnerabilities:**
Please refer to our [SECURITY.md](SECURITY.md) policy. Do not report security vulnerabilities in public issues.

Thank you for helping make InvoiceForge better!
