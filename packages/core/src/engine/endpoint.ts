import type { PartyInput } from '../schema/invoice.js';

/**
 * Maps EU country code prefixes to their ICD (International Code Designator)
 * scheme numbers used in Peppol EndpointID routing.
 *
 * Source: Peppol Policy for use of Identifiers v4.0 — Appendix A.
 *
 * @internal
 */
const ENDPOINT_SCHEME_MAP: Readonly<Record<string, string>> = {
  DE: '9930',
  FR: '9957',
  IT: '9906',
  ES: '9920',
  NL: '0106',
  BE: '0208',
  AT: '9915',
  SE: '9955',
  FI: '0037',
  DK: '0096',
  NO: '0192',
  PT: '9946',
  IE: '9928',
  PL: '9945',
  CZ: '9922',
  HU: '9910',
  LU: '9938',
  GR: '9933',
  RO: '9947',
  BG: '9926',
  HR: '9934',
  SK: '9948',
  SI: '9949',
  LT: '9937',
  LV: '9939',
  EE: '9931',
  CY: '9925',
  MT: '9943',
  GB: '9932',
};

export interface EndpointDetails {
  id: string;
  scheme: string;
}

/**
 * Derive the best available EndpointID and scheme for a party.
 *
 * Priority:
 *   1. VAT number → scheme derived from the ISO 3166-1 alpha-2 country prefix
 *   2. Email address → scheme "EM"
 *   3. undefined if neither is available
 *
 * @internal
 */
export function getEndpointDetails(party: PartyInput): EndpointDetails | undefined {
  if (party.vatNumber !== undefined && party.vatNumber.length >= 2) {
    const prefix = party.vatNumber.substring(0, 2).toUpperCase();
    const scheme = ENDPOINT_SCHEME_MAP[prefix] ?? '9930';
    return { id: party.vatNumber, scheme };
  }
  if (party.email !== undefined) {
    return { id: party.email, scheme: 'EM' };
  }
  return undefined;
}
