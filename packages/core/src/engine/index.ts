import { ValidationService } from '@e-invoice-eu/core';
import type { Invoice, InvoiceServiceOptions } from '@e-invoice-eu/core';
import type { Logger } from '@e-invoice-eu/core';
import type { InvoiceInput } from '../schema/invoice.js';
import type { ConversionResult } from '../types.js';
import {
  ruleIdForAjvPath,
  ruleIdForField,
  SUPPORTED_FORMATS,
} from './constants.js';
import type { SupportedFormat } from './constants.js';
import { mapToEInvoiceFormat } from './mapper.js';
import { buildWarnings } from './warnings.js';
import {
  silentLogger,
  formatFactory,
  getCachedValidator,
  warmupValidatorCache as _warmupValidatorCache,
} from './validator.js';

// ── Public format registry ───────────────────────────────────────────────────

export { SUPPORTED_FORMATS } from './constants.js';
export type { SupportedFormat } from './constants.js';

// ── Public option types ──────────────────────────────────────────────────────

export interface GenerateInvoiceOptions {
  /** Language code for validation messages (default: 'en'). Does not affect XML content. */
  language?: string;
  /** Custom logger. Default: silent (required for stdio transport). */
  logger?: Logger;
}

// ── Cache warm-up ────────────────────────────────────────────────────────────

/**
 * Pre-warm the AJV validator cache for all supported formats.
 * Call this at application startup to eliminate first-call compilation latency.
 *
 * @public
 */
export function warmupValidatorCache(logger: Logger = silentLogger): void {
  _warmupValidatorCache(SUPPORTED_FORMATS, logger);
}

// ── Core generation pipeline ─────────────────────────────────────────────────

/**
 * Internal orchestrator: validates the mapped Invoice via AJV, fills defaults,
 * and delegates to @e-invoice-eu/core for XML serialisation.
 *
 * @internal
 */
async function runGeneration(
  input: Invoice,
  options: InvoiceServiceOptions,
  logger: Logger,
): Promise<string | Uint8Array> {
  const patched = structuredClone(input);

  const normalized = formatFactory.normalizeFormat(options.format);
  const formatter = formatFactory.createFormatService(normalized, logger);
  const validationService = new ValidationService(logger);

  const validated = validationService.validate(
    'invoice data',
    getCachedValidator(normalized, logger),
    patched,
  ) as Invoice;

  formatter.fillInvoiceDefaults(validated);
  return formatter.generate(validated, { ...options, format: normalized });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate an e-invoice in the specified format from a validated invoice-forge invoice.
 *
 * Performs format-specific pre-validation (e.g. XRechnung requires buyerReference),
 * maps the simplified schema to the @e-invoice-eu/core Invoice format, and delegates
 * to AJV + @e-invoice-eu/core for full EN16931 schema validation before XML output.
 *
 * @param invoice - Validated invoice data (parse first with `invoiceSchema.parse()`)
 * @param format  - Target output format; must be one of `SUPPORTED_FORMATS`
 * @param options - Optional generation options (language, logger)
 * @returns A discriminated union: `ConversionResult` with `.success` true/false
 *
 * @public
 */
export async function generateInvoice(
  invoice: InvoiceInput,
  format: SupportedFormat,
  options?: GenerateInvoiceOptions,
): Promise<ConversionResult> {
  // XRechnung B2G invoices legally require buyerReference (Leitweg-ID, EN16931 BT-10)
  if (format === 'XRECHNUNG-UBL' && invoice.buyerReference === undefined) {
    return {
      success: false,
      errors: [
        {
          field: 'buyerReference',
          ruleId: 'BT-10',
          message: 'buyerReference (Leitweg-ID) is required for XRECHNUNG-UBL invoices (EN 16931 BT-10)',
        },
      ],
    };
  }

  const logger = options?.logger ?? silentLogger;

  try {
    const { invoice: eInvoiceData, totals, vatBreakdown: _vatBreakdown } = mapToEInvoiceFormat(invoice, format);

    const raw = await runGeneration(
      eInvoiceData,
      { format, lang: options?.language ?? 'en' },
      logger,
    );

    const xml = raw instanceof Uint8Array ? new TextDecoder().decode(raw) : raw;
    const warnings = buildWarnings(invoice, format);

    return {
      success: true,
      xml,
      totals,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (err: unknown) {
    // AJV ValidationError from @e-invoice-eu/core — structured error array
    if (
      err !== null &&
      typeof err === 'object' &&
      'errors' in err &&
      Array.isArray((err as { errors: unknown }).errors)
    ) {
      return {
        success: false,
        errors: (err as { errors: Array<{ instancePath?: string; message?: string }> }).errors.map(
          (e): import('../types.js').ConversionError => {
            const resolvedRuleId = ruleIdForAjvPath(e.instancePath ?? '');
            return {
              field: e.instancePath ?? 'root',
              ...(resolvedRuleId !== undefined ? { ruleId: resolvedRuleId } : {}),
              message: e.message ?? 'Validation failed',
            };
          },
        ),
      };
    }

    // Fallback: extract rule ID from error message when possible
    const message = err instanceof Error ? err.message : String(err);
    const ruleIdMatch = message.match(/\b(B[TGR]-[A-Z0-9-]+)\b/i);
    return {
      success: false,
      errors: [
        {
          field: 'root',
          ...(ruleIdMatch?.[1] !== undefined ? { ruleId: ruleIdMatch[1].toUpperCase() } : {}),
          message: `Invoice generation failed: ${message}`,
        },
      ],
    };
  }
}

// Re-export for consumers who need it without importing from constants directly
export { ruleIdForField };
