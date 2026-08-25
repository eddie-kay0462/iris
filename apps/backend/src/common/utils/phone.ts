import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { registerDecorator, ValidationOptions } from 'class-validator';

/** A phone number resolved to E.164 plus the country it belongs to. */
export type ParsedPhone = { e164: string; country: CountryCode | null };

/**
 * Parse any phone input once, resolving local formats like "0241234567" against
 * defaultCountry. Non-digit noise (spaces, the leading "'" left by spreadsheet
 * exports) is stripped first. Returns null if the input is not a valid number.
 */
export function parsePhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = 'GH',
): ParsedPhone | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed?.isValid()) return null;
  return { e164: parsed.number, country: parsed.country ?? null };
}

/**
 * Convert any phone input to E.164 format (+[country][number]).
 * defaultCountry is required to resolve local formats like "0241234567" → "+233241234567".
 * Returns null if the input is unparseable or not a valid phone number.
 */
export function toE164(
  raw: string | null | undefined,
  defaultCountry: CountryCode = 'GH',
): string | null {
  return parsePhone(raw, defaultCountry)?.e164 ?? null;
}

/**
 * Country of a phone number, resolving local formats against defaultCountry
 * (e.g. "0241234567" → GH). Returns null if the input is unparseable or invalid.
 */
export function getPhoneCountry(
  raw: string | null | undefined,
  defaultCountry: CountryCode = 'GH',
): CountryCode | null {
  return parsePhone(raw, defaultCountry)?.country ?? null;
}

/** True only for numbers that parse as valid Ghanaian (+233) numbers. */
export function isGhanaianPhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = 'GH',
): boolean {
  return getPhoneCountry(raw, defaultCountry) === 'GH';
}

/** E.164 → LetsFish SMS API format: strip leading + (e.g. "+233241234567" → "233241234567") */
export function toLetsFishFormat(e164: string): string {
  return e164.replace(/^\+/, '');
}

/** E.164 Ghana → Paystack Ghana MoMo format: "+233241234567" → "0241234567" */
export function toPaystackMomoFormat(e164: string): string {
  return '0' + e164.slice(4);
}

/** class-validator decorator — accepts any internationally valid phone number */
export function IsPhoneNumber(opts?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid phone number (e.g. +233241234567 or 0241234567)`,
        ...opts,
      },
      validator: {
        validate(value: any) {
          if (!value) return true; // use @IsNotEmpty() separately when the field is required
          return toE164(value) !== null;
        },
      },
    });
  };
}
