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
  const initial =
    DIAL_CODES.find((d) => d.code === defaultCountry) ?? DIAL_CODES[0];
  const [selected, setSelected] = useState<DialEntry>(initial);

  // When defaultCountry changes (e.g. user changes shipping country), sync selector
  const activeEntry =
    DIAL_CODES.find((d) => d.code === defaultCountry) ?? selected;

  // Strip dial code; re-add trunk prefix (e.g. "0" for Ghana) for display
  const nsn = value.startsWith(activeEntry.dial)
    ? value.slice(activeEntry.dial.length)
    : value.startsWith("+")
    ? value
    : value;
  const displayValue = nsn && activeEntry.trunk && !nsn.startsWith(activeEntry.trunk)
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
    setSelected(entry);
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
          className="rounded-l border border-r-0 border-gray-300 bg-gray-50 px-2 py-3 text-sm text-gray-700 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-white dark:focus:ring-white"
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
          className="flex-1 rounded-r border border-l-0 border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
