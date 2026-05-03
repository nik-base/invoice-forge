import { FormatFactoryService, ValidationService, invoiceSchema as ublCoreInvoiceSchema } from '@e-invoice-eu/core';
import type { Logger } from '@e-invoice-eu/core';
import type { ValidateFunction } from 'ajv';
import Ajv2019 from 'ajv/dist/2019.js';

/**
 * Silent logger — prevents @e-invoice-eu/core from writing to stdout.
 * This is critical for MCP stdio transport (JSON-RPC over stdout) and
 * clean library behaviour (a library should never write to stdout uninvited).
 *
 * @internal
 */
export const silentLogger: Logger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Singleton FormatFactoryService shared across all validation and generation calls.
 * Creating one per call is expensive — this avoids repeated initialisation cost.
 *
 * @internal
 */
export const formatFactory = new FormatFactoryService();

/**
 * Per-format AJV validator cache.
 * AJV compilation is the dominant cold-start cost; caching eliminates it for
 * subsequent calls with the same format.
 *
 * @internal
 */
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Retrieve (or compile and cache) a typed AJV validator for the given format.
 *
 * @internal
 */
export function getCachedValidator(
  format: string,
  logger: Logger = silentLogger,
): ValidateFunction {
  const normalized = formatFactory.normalizeFormat(format);

  if (!validatorCache.has(normalized)) {
    const ajv = new (Ajv2019 as unknown as new (opts: object) => { compile: (s: any) => ValidateFunction })(
      { strict: true, allErrors: true, useDefaults: true },
    );
    // Deep-clone the schema before patching so that each format gets an
    // independent copy — FormatService.patchSchema mutates the object in place.
    const schema = structuredClone(ublCoreInvoiceSchema);
    formatFactory.createFormatService(normalized, logger).patchSchema(schema as any);
    validatorCache.set(normalized, ajv.compile(schema));
  }

  // Map.get is always defined here — we just set it above if absent.
  return validatorCache.get(normalized) as ValidateFunction;
}

/**
 * Pre-warm the validator cache for all supported formats.
 * Call this at application startup to eliminate first-call latency.
 *
 * @public
 */
export function warmupValidatorCache(
  formats: readonly string[],
  logger: Logger = silentLogger,
): void {
  for (const format of formats) {
    getCachedValidator(format, logger);
  }
}
