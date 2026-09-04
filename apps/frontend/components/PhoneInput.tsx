"use client";
import { useState } from "react";

const DIAL_CODES = [
  { code: "GH", dial: "+233", flag: "🇬🇭", trunk: "0" },
  { code: "US", dial: "+1",   flag: "🇺🇸", trunk: ""  },
  { code: "CA", dial: "+1",   flag: "🇨🇦", trunk: ""  },
  { code: "GB", dial: "+44",  flag: "🇬🇧", trunk: "0" },
  { code: "NL", dial: "+31",  flag: "🇳🇱", trunk: "0" },
] as const;

type DialEntry = (typeof DIAL_CODES)[number];

interface PhoneInputProps {
  value: string;              // E.164 in parent state, or ""
  onChange: (e164: string) => void;
  defaultCountry?: string;    // ISO-2 country code, defaults to "GH"
  required?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({
  value,
  onChange,
  defaultCountry = "GH",
  required,
  error,
  placeholder = "024 123 4567",
  className = "",
}: PhoneInputProps) {
  // Null until the shopper picks a country themselves.
  const [picked, setPicked] = useState<DialEntry | null>(null);

  // The country the current value actually belongs to. Longest dial code first,
  // so a longer code always beats a shorter one that prefixes it.
  const fromValue = value.startsWith("+")
    ? [...DIAL_CODES]
        .sort((a, b) => b.dial.length - a.dial.length)
        .find((d) => value.startsWith(d.dial))
    : undefined;

  // An explicit pick wins; failing that the value's own dial code, so a stored
  // number is never shown under the wrong country. `defaultCountry` (which
  // follows the shipping country at checkout) is the fallback for an empty
  // field.
  const activeEntry =
    picked ??
    fromValue ??
    DIAL_CODES.find((d) => d.code === defaultCountry) ??
    DIAL_CODES[0];

  // Strip dial code; re-add trunk prefix (e.g. "0" for Ghana) for display. A
  // value carrying an unrecognised dial code is shown as-is rather than having
  // a trunk prefix bolted onto the front of it.
  const hasKnownDial = value.startsWith(activeEntry.dial);
  const nsn = hasKnownDial ? value.slice(activeEntry.dial.length) : value;
  const displayValue =
    hasKnownDial && nsn && activeEntry.trunk && !nsn.startsWith(activeEntry.trunk)
      ? activeEntry.trunk + nsn
      : nsn;

  function handleChange(raw: string) {
    let digits = raw.replace(/\D/g, "");
    if (!digits) { onChange(""); return; }
    // Strip trunk prefix before combining with dial code
    if (activeEntry.trunk && digits.startsWith(activeEntry.trunk)) {
      digits = digits.slice(activeEntry.trunk.length);
    }
    onChange(`${activeEntry.dial}${digits}`);
  }

  function handleCountryChange(code: string) {
    const entry = DIAL_CODES.find((d) => d.code === code) ?? DIAL_CODES[0];
    setPicked(entry);
    // Re-use the raw NSN digits (without trunk prefix)
    const localDigits = nsn.replace(/\D/g, "").replace(new RegExp(`^${entry.trunk}`), "");
    onChange(localDigits ? `${entry.dial}${localDigits}` : "");
  }

  return (
    <div className={className}>
      <div className="flex">
        <select
          value={activeEntry.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          aria-label="Country dial code"
          className="rounded-l border border-r-0 border-line-strong bg-fill px-2 py-3 text-sm text-text-secondary outline-none transition focus:border-invert-bg focus:ring-1 focus:ring-invert-bg"
        >
          {DIAL_CODES.map((d) => (
            <option key={`${d.code}-${d.dial}`} value={d.code}>
              {d.flag} {d.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 rounded-r border ps-2 border-l-0 border-line-strong px-4 py-3 text-sm outline-none transition focus:border-invert-bg focus:ring-1 focus:ring-invert-bg bg-surface text-text"
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
