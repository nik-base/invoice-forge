# Security Policy

## Supported Versions

| Version | Security Fixes |
|---------|---------------|
| 0.1.x   | ✅ Yes        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Please report security vulnerabilities by creating a private advisory in the GitHub Security tab of this repository. Include:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested mitigation

## Scope

In scope:
- Arbitrary code execution via malformed invoice input
- Information disclosure via error messages
- XML External Entity (XXE) injection in generated XML
- Denial of service via crafted inputs

Out of scope:
- Issues in `@e-invoice-eu/core` or other upstream dependencies (report to them directly)
- Issues requiring physical access to the host machine
