"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// ── Currencies ────────────────────────────────────────────
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: "GHS", name: "Ghana Cedi",        symbol: "₵"  },
  { code: "USD", name: "US Dollar",          symbol: "$"  },
  { code: "EUR", name: "Euro",               symbol: "€"  },
  { code: "GBP", name: "British Pound",      symbol: "£"  },
  { code: "NGN", name: "Nigerian Naira",     symbol: "₦"  },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar",    symbol: "C$" },
];

// ── Region detection (VPN-resistant: uses OS timezone) ────
export interface Region {
  country: string;
  countryCode: string;
  flag: string;
}

const TZ_MAP: Record<string, Region> = {
  "Africa/Accra":            { country: "Ghana",         countryCode: "GH", flag: "🇬🇭" },
  "Africa/Lagos":            { country: "Nigeria",       countryCode: "NG", flag: "🇳🇬" },
  "Africa/Abuja":            { country: "Nigeria",       countryCode: "NG", flag: "🇳🇬" },
  "Africa/Johannesburg":     { country: "South Africa",  countryCode: "ZA", flag: "🇿🇦" },
  "Africa/Nairobi":          { country: "Kenya",         countryCode: "KE", flag: "🇰🇪" },
  "Africa/Cairo":            { country: "Egypt",         countryCode: "EG", flag: "🇪🇬" },
  "Europe/London":           { country: "United Kingdom",countryCode: "GB", flag: "🇬🇧" },
  "Europe/Berlin":           { country: "Germany",       countryCode: "DE", flag: "🇩🇪" },
  "Europe/Paris":            { country: "France",        countryCode: "FR", flag: "🇫🇷" },
  "Europe/Rome":             { country: "Italy",         countryCode: "IT", flag: "🇮🇹" },
  "Europe/Madrid":           { country: "Spain",         countryCode: "ES", flag: "🇪🇸" },
  "Europe/Amsterdam":        { country: "Netherlands",   countryCode: "NL", flag: "🇳🇱" },
  "America/New_York":        { country: "United States", countryCode: "US", flag: "🇺🇸" },
  "America/Chicago":         { country: "United States", countryCode: "US", flag: "🇺🇸" },
  "America/Denver":          { country: "United States", countryCode: "US", flag: "🇺🇸" },
  "America/Los_Angeles":     { country: "United States", countryCode: "US", flag: "🇺🇸" },
  "America/Toronto":         { country: "Canada",        countryCode: "CA", flag: "🇨🇦" },
  "America/Vancouver":       { country: "Canada",        countryCode: "CA", flag: "🇨🇦" },
  "Australia/Sydney":        { country: "Australia",     countryCode: "AU", flag: "🇦🇺" },
  "Australia/Melbourne":     { country: "Australia",     countryCode: "AU", flag: "🇦🇺" },
  "Australia/Brisbane":      { country: "Australia",     countryCode: "AU", flag: "🇦🇺" },
  "Asia/Dubai":              { country: "UAE",           countryCode: "AE", flag: "🇦🇪" },
  "Asia/Singapore":          { country: "Singapore",     countryCode: "SG", flag: "🇸🇬" },
  "Asia/Tokyo":              { country: "Japan",         countryCode: "JP", flag: "🇯🇵" },
  "Asia/Kolkata":            { country: "India",         countryCode: "IN", flag: "🇮🇳" },
};

const FALLBACK_REGION: Region = { country: "Global", countryCode: "GL", flag: "🌐" };

function detectRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_MAP[tz] ?? FALLBACK_REGION;
  } catch {
    return FALLBACK_REGION;
  }
}

// ── Exchange rates ─────────────────────────────────────────
const FX_CACHE_KEY = "iris_fx_rates";
const FX_TTL_MS = 60 * 60 * 1000; // 1 hour

interface FxCache {
  rates: Record<string, number>;
  ts: number;
}

function loadCachedRates(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed: FxCache = JSON.parse(raw);
    if (Date.now() - parsed.ts > FX_TTL_MS) return null;
    return parsed.rates;
  } catch {
    return null;
  }
}

function saveCachedRates(rates: Record<string, number>) {
  try {
    const cache: FxCache = { rates, ts: Date.now() };
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ── Context ────────────────────────────────────────────────
interface LocaleContextValue {
  region: Region;
  currency: string;
  rates: Record<string, number>;
  setCurrency: (code: string) => void;
  formatPrice: (ghsAmount: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [region] = useState<Region>(() => {
    if (typeof window === "undefined") return FALLBACK_REGION;
    return detectRegion();
  });

  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window === "undefined") return "GHS";
    return localStorage.getItem("iris_currency") ?? "GHS";
  });

  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const cached = loadCachedRates();
    if (cached) { setRates(cached); return; }
    fetch("https://open.er-api.com/v6/latest/GHS")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) {
          setRates(data.rates);
          saveCachedRates(data.rates);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    try { localStorage.setItem("iris_currency", code); } catch {}
  }, []);

  const formatPrice = useCallback(
    (ghsAmount: number): string => {
      const cur = CURRENCIES.find((c) => c.code === currency);
      const sym = cur?.symbol ?? "₵";
      if (currency === "GHS" || !rates[currency]) {
        return `${sym}${ghsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      const converted = ghsAmount * rates[currency];
      return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [currency, rates],
  );

  const value = useMemo(
    () => ({ region, currency, rates, setCurrency, formatPrice }),
    [region, currency, rates, setCurrency, formatPrice],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}
