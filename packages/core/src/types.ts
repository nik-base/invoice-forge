/**
 * Shared result types for UBLForge conversions.
 * Used by core, api, and mcp packages.
 */

export interface ConversionError {
  /** Human-readable field path (e.g. 'supplier.vatNumber') */
  field: string;
  /** Human-readable error description */
  message: string;
  /**
   * Structured identifier referencing the broken EN16931 / Peppol rule.
   * Examples: 'BT-10', 'BR-CO-25', 'BG-4'
   * Present when the engine can trace the error to a specific standard rule.
   */
  ruleId?: string;
}

export interface ConversionWarning {
  /** Human-readable field path the warning applies to */
  field: string;
  /** Human-readable warning description */
  message: string;
  /** Optional EN16931 / Peppol term reference (e.g. 'BT-83') */
  ruleId?: string;
}

export interface InvoiceTotals {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
}

export interface ConversionSuccess {
  success: true;
  xml: string;
  totals?: InvoiceTotals;
  /** Non-fatal advisory messages (missing optional but recommended fields) */
  warnings?: ConversionWarning[];
}

export interface ConversionFailure {
  success: false;
  errors: ConversionError[];
}

export type ConversionResult = ConversionSuccess | ConversionFailure;
