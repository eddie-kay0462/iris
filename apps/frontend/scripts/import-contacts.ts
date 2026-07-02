/**
 * Import & Normalize Customer Contacts into Supabase
 *
 * Reads a CSV of contacts (First Name, Last Name, Email, Number), normalizes
 * every phone to E.164 (country-aware, not Ghana-by-default), matches each
 * contact against existing `profiles` rows (phone -> email -> safe exact-name),
 * BACKFILLS existing rows without overwriting any non-null data, and CREATES
 * new phone-based customer accounts (auth user + profile) for the rest.
 *
 * New rows are tagged `migrated_from = 'contact-import-2026-07'`.
 *
 * DRY RUN (default): builds the action plan, writes scripts/contact-import-report.json,
 * prints a summary. Writes NOTHING to Supabase.
 *
 *   cd apps/frontend
 *   set -a && source .env.local && set +a && node --no-warnings scripts/import-contacts.ts [path-to-csv]
 *
 * COMMIT: performs the writes. Idempotent (re-running re-matches created rows by phone).
 *
 *   set -a && source .env.local && set +a && node --no-warnings scripts/import-contacts.ts --commit [path-to-csv]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

// Run with plain `node` (Node's native TS type-stripping), NOT tsx — tsx's
// loader mangles libphonenumber-js's internal metadata JSON.
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const COMMIT = process.argv.includes("--commit");
const MIGRATED_FROM = "contact-import-2026-07";
const REPORT_PATH = resolve(__dirname, "contact-import-report.json");
const DEFAULT_CSV = resolve(__dirname, "../../../New Customers - Untitled.csv");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with:  set -a && source .env.local && set +a && npx tsx scripts/import-contacts.ts"
  );
  process.exit(1);
}

const csvPathArg = process.argv
  .slice(2)
  .find((a) => !a.startsWith("--"));
const CSV_PATH = csvPathArg ? resolve(process.cwd(), csvPathArg) : DEFAULT_CSV;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Phone normalization (country-aware) ─────────────────────────────────────
type PhoneResult =
  | { e164: string; country: string | undefined }
  | { e164: null; reason: string };

/**
 * Normalize a raw phone string to E.164, WITHOUT defaulting everything to Ghana.
 * Tries interpretations in priority order; accepts the first that validates.
 * If none validate, or two different countries both validate, returns null with
 * a reason (the number is surfaced for manual review rather than guessed).
 */
function normalizePhone(raw: string | null | undefined): PhoneResult {
  if (!raw) return { e164: null, reason: "empty" };
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return { e164: null, reason: "empty" };

  const digits = cleaned.replace(/\D/g, "");

  type Attempt = { input: string; country?: CountryCode };
  const attempts: Attempt[] = [];

  if (cleaned.startsWith("+")) {
    // Already international — parse as-is, keep its own country code.
    attempts.push({ input: cleaned });
  } else if (cleaned.startsWith("00")) {
    attempts.push({ input: "+" + digits.slice(2) });
  } else {
    // Bare number. Try, in order:
    //  a) with a leading + (covers 233..., 1..., 234..., 44..., etc.)
    attempts.push({ input: "+" + digits });
    //  b) Ghana local (0XXXXXXXXX)
    attempts.push({ input: cleaned, country: "GH" });
    //  c) NANP 10-digit -> +1
    if (digits.length === 10) attempts.push({ input: "+1" + digits });
  }

  const valid: { e164: string; country: string | undefined }[] = [];
  for (const a of attempts) {
    const parsed = a.country
      ? parsePhoneNumberFromString(a.input, a.country)
      : parsePhoneNumberFromString(a.input);
    if (parsed?.isValid()) {
      valid.push({ e164: parsed.number, country: parsed.country });
    }
  }

  if (valid.length === 0) return { e164: null, reason: "invalid/unparseable" };

  // De-dupe by resolved E.164; if they all agree, unambiguous.
  const uniqueNumbers = Array.from(new Set(valid.map((v) => v.e164)));
  if (uniqueNumbers.length > 1) {
    return {
      e164: null,
      reason: `ambiguous (${uniqueNumbers.join(" | ")})`,
    };
  }

  return { e164: valid[0].e164, country: valid[0].country };
}

// ── CSV parsing ─────────────────────────────────────────────────────────────
/** Minimal CSV: no quoted fields containing commas expected in this file. */
function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(","));
}

function clean(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  if (!t || t.toLowerCase() === "null") return null;
  return t;
}

// ── Types ───────────────────────────────────────────────────────────────────
interface Contact {
  rowNum: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  rawPhone: string | null;
  phone: string | null; // normalized E.164
  country?: string;
}

interface Profile {
  id: string;
  email: string | null;
  phone_number: string | null;
  first_name: string | null;
  last_name: string | null;
}

type ActionType =
  | "exists-phone"
  | "exists-email"
  | "name-match"
  | "create"
  | "skip";

interface Action {
  type: ActionType;
  contact: Contact;
  profileId?: string;
  reason?: string;
  // Fields we intend to backfill/write (never overwrites non-null existing data).
  updates?: Record<string, unknown>;
}

// ── Load & normalize CSV ────────────────────────────────────────────────────
function loadContacts(): Contact[] {
  const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
  const [header, ...data] = rows;
  const looksLikeHeader =
    header && header[0]?.toLowerCase().includes("first");
  const body = looksLikeHeader ? data : rows;

  return body.map((cols, i) => {
    const firstName = clean(cols[0]);
    const lastName = clean(cols[1]);
    const email = clean(cols[2])?.toLowerCase() ?? null;
    const rawPhone = clean(cols[3]);
    const norm = normalizePhone(rawPhone);
    return {
      rowNum: (looksLikeHeader ? i + 2 : i + 1),
      firstName,
      lastName,
      email,
      rawPhone,
      phone: norm.e164,
      country: "country" in norm ? norm.country : undefined,
    };
  });
}

// ── Dedupe within CSV (by phone, then email) ────────────────────────────────
function fullness(c: Contact): number {
  return (
    (c.firstName ? 1 : 0) +
    (c.lastName ? 1 : 0) +
    (c.email ? 1 : 0) +
    (c.phone ? 1 : 0)
  );
}

function mergeContacts(keep: Contact, drop: Contact): Contact {
  return {
    ...keep,
    firstName: keep.firstName ?? drop.firstName,
    lastName: keep.lastName ?? drop.lastName,
    email: keep.email ?? drop.email,
    phone: keep.phone ?? drop.phone,
    country: keep.country ?? drop.country,
    rawPhone: keep.rawPhone ?? drop.rawPhone,
  };
}

function dedupe(contacts: Contact[]): {
  deduped: Contact[];
  merged: { kept: number; dropped: number; key: string }[];
} {
  const byKey = new Map<string, Contact>();
  const passthrough: Contact[] = [];
  const merged: { kept: number; dropped: number; key: string }[] = [];

  for (const c of contacts) {
    const key = c.phone ? `p:${c.phone}` : c.email ? `e:${c.email}` : null;
    if (!key) {
      passthrough.push(c); // nothing to dedupe on; handled later (likely skip)
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
    } else {
      const [keep, drop] =
        fullness(c) > fullness(existing) ? [c, existing] : [existing, c];
      byKey.set(key, mergeContacts(keep, drop));
      merged.push({ kept: keep.rowNum, dropped: drop.rowNum, key });
    }
  }

  return { deduped: [...byKey.values(), ...passthrough], merged };
}

// ── Load existing profiles ──────────────────────────────────────────────────
async function loadProfiles(): Promise<Profile[]> {
  const all: Profile[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, phone_number, first_name, last_name")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to load profiles: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as Profile[]));
    if (data.length < pageSize) break;
  }
  return all;
}

function nameKey(first: string | null, last: string | null): string | null {
  if (!first || !last) return null;
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`;
}

// ── Classify ────────────────────────────────────────────────────────────────
function classify(contacts: Contact[], profiles: Profile[]): Action[] {
  const byPhone = new Map<string, Profile>();
  const byEmail = new Map<string, Profile>();
  const byName = new Map<string, Profile[]>();
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();

  for (const p of profiles) {
    if (p.phone_number) {
      byPhone.set(p.phone_number, p);
      usedPhones.add(p.phone_number);
    }
    if (p.email) {
      byEmail.set(p.email.toLowerCase(), p);
      usedEmails.add(p.email.toLowerCase());
    }
    const nk = nameKey(p.first_name, p.last_name);
    if (nk) {
      const arr = byName.get(nk) ?? [];
      arr.push(p);
      byName.set(nk, arr);
    }
  }

  const actions: Action[] = [];

  const backfill = (
    profile: Profile,
    contact: Contact,
    opts: { phone?: boolean } = {}
  ): Record<string, unknown> => {
    const updates: Record<string, unknown> = {};
    if (!profile.first_name && contact.firstName)
      updates.first_name = contact.firstName;
    if (!profile.last_name && contact.lastName)
      updates.last_name = contact.lastName;
    if (
      !profile.email &&
      contact.email &&
      !usedEmails.has(contact.email)
    ) {
      updates.email = contact.email;
      usedEmails.add(contact.email);
    }
    if (
      opts.phone &&
      !profile.phone_number &&
      contact.phone &&
      !usedPhones.has(contact.phone)
    ) {
      updates.phone_number = contact.phone;
      usedPhones.add(contact.phone);
    }
    return updates;
  };

  for (const c of contacts) {
    // 1) phone match
    if (c.phone && byPhone.has(c.phone)) {
      const p = byPhone.get(c.phone)!;
      actions.push({
        type: "exists-phone",
        contact: c,
        profileId: p.id,
        updates: backfill(p, c),
      });
      continue;
    }

    // 2) email match
    if (c.email && byEmail.has(c.email)) {
      const p = byEmail.get(c.email)!;
      actions.push({
        type: "exists-email",
        contact: c,
        profileId: p.id,
        updates: backfill(p, c, { phone: true }),
      });
      continue;
    }

    // 3) safe exact-name match onto a phone-less profile (exactly one candidate)
    const nk = nameKey(c.firstName, c.lastName);
    if (c.phone && nk && byName.has(nk)) {
      const candidates = byName
        .get(nk)!
        .filter((p) => !p.phone_number);
      if (candidates.length === 1 && !usedPhones.has(c.phone)) {
        const p = candidates[0];
        actions.push({
          type: "name-match",
          contact: c,
          profileId: p.id,
          updates: backfill(p, c, { phone: true }),
        });
        continue;
      }
    }

    // 4) create new — needs a phone (or at least an email)
    if (c.phone && !usedPhones.has(c.phone)) {
      usedPhones.add(c.phone);
      if (c.email && !usedEmails.has(c.email)) usedEmails.add(c.email);
      actions.push({ type: "create", contact: c });
      continue;
    }
    if (!c.phone && c.email && !usedEmails.has(c.email)) {
      usedEmails.add(c.email);
      actions.push({ type: "create", contact: c });
      continue;
    }

    // 5) skip
    let reason: string;
    if (!c.phone && !c.email) {
      reason = c.rawPhone
        ? `unusable number "${c.rawPhone}" and no email`
        : "no phone and no email";
    } else if (c.phone && usedPhones.has(c.phone)) {
      reason = `phone ${c.phone} already used by another row/profile`;
    } else if (c.email && usedEmails.has(c.email)) {
      reason = `email ${c.email} already used by another row/profile`;
    } else {
      reason = "unmatched";
    }
    actions.push({ type: "skip", contact: c, reason });
  }

  return actions;
}

// ── Split name like popup-sales ─────────────────────────────────────────────
function splitName(first: string | null, last: string | null) {
  const full = [first, last].filter(Boolean).join(" ").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || null,
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

// ── Execute writes (commit mode) ────────────────────────────────────────────
async function applyUpdate(a: Action): Promise<void> {
  if (!a.updates || Object.keys(a.updates).length === 0) return;
  const { error } = await supabase
    .from("profiles")
    .update({ ...a.updates, updated_at: new Date().toISOString() })
    .eq("id", a.profileId!);
  if (error)
    throw new Error(
      `Update profile ${a.profileId} (row ${a.contact.rowNum}) failed: ${error.message}`
    );
}

async function applyCreate(a: Action): Promise<void> {
  const c = a.contact;
  const { first_name, last_name } = splitName(c.firstName, c.lastName);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      ...(c.email ? { email: c.email, email_confirm: true } : {}),
      ...(c.phone ? { phone: c.phone, phone_confirm: true } : {}),
      user_metadata: { first_name, last_name },
    });

  if (authError || !authData?.user) {
    throw new Error(
      `Create auth user (row ${c.rowNum}) failed: ${authError?.message}`
    );
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    email: c.email,
    phone_number: c.phone,
    first_name,
    last_name,
    role: "public",
    migrated_from: MIGRATED_FROM,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphan.
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(
      `Insert profile (row ${c.rowNum}) failed: ${profileError.message}`
    );
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(
    `\n${COMMIT ? "🚀 COMMIT" : "🔍 DRY RUN"} — importing contacts from:\n  ${CSV_PATH}\n`
  );

  const raw = loadContacts();
  const { deduped, merged } = dedupe(raw);
  console.log(
    `Parsed ${raw.length} CSV rows → ${deduped.length} after in-CSV dedupe (${merged.length} merged).`
  );

  const profiles = await loadProfiles();
  console.log(`Loaded ${profiles.length} existing profiles.\n`);

  const actions = classify(deduped, profiles);

  const counts: Record<string, number> = {};
  for (const a of actions) counts[a.type] = (counts[a.type] ?? 0) + 1;

  // Backfills that actually change something
  const backfillActions = actions.filter(
    (a) =>
      (a.type === "exists-phone" ||
        a.type === "exists-email" ||
        a.type === "name-match") &&
      a.updates &&
      Object.keys(a.updates).length > 0
  );

  console.log("── Summary ──────────────────────────────");
  console.log(`  exists (phone match):  ${counts["exists-phone"] ?? 0}`);
  console.log(`  exists (email match):  ${counts["exists-email"] ?? 0}`);
  console.log(`  name match (backfill): ${counts["name-match"] ?? 0}`);
  console.log(`  → of the above, with data to backfill: ${backfillActions.length}`);
  console.log(`  CREATE new customers:  ${counts["create"] ?? 0}`);
  console.log(`  SKIPPED:               ${counts["skip"] ?? 0}`);
  console.log("─────────────────────────────────────────\n");

  // Report artifact
  const report = {
    generatedAt: new Date().toISOString(),
    mode: COMMIT ? "commit" : "dry-run",
    csv: CSV_PATH,
    counts,
    mergedInCsv: merged,
    creates: actions
      .filter((a) => a.type === "create")
      .map((a) => ({
        row: a.contact.rowNum,
        name: [a.contact.firstName, a.contact.lastName]
          .filter(Boolean)
          .join(" "),
        phone: a.contact.phone,
        country: a.contact.country,
        email: a.contact.email,
      })),
    backfills: backfillActions.map((a) => ({
      row: a.contact.rowNum,
      type: a.type,
      profileId: a.profileId,
      updates: a.updates,
    })),
    skipped: actions
      .filter((a) => a.type === "skip")
      .map((a) => ({
        row: a.contact.rowNum,
        name: [a.contact.firstName, a.contact.lastName]
          .filter(Boolean)
          .join(" "),
        rawPhone: a.contact.rawPhone,
        email: a.contact.email,
        reason: a.reason,
      })),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Report written: ${REPORT_PATH}`);

  if (!COMMIT) {
    console.log(
      "\nDry run complete — nothing written to Supabase. Review the report,\n" +
        "then re-run with --commit to apply.\n"
    );
    return;
  }

  // ── Commit ──
  console.log("\nApplying changes…\n");
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const a of backfillActions) {
    try {
      await applyUpdate(a);
      updated++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  for (const a of actions.filter((x) => x.type === "create")) {
    try {
      await applyCreate(a);
      created++;
      if (created % 25 === 0) console.log(`  …created ${created}`);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  console.log(`\n✓ Created ${created} new customers, backfilled ${updated} existing rows.`);
  if (errors.length) {
    console.log(`\n⚠ ${errors.length} errors:`);
    errors.slice(0, 30).forEach((e) => console.log("  - " + e));
    if (errors.length > 30) console.log(`  …and ${errors.length - 30} more`);
  }
}

main().catch((e) => {
  console.error("\nFatal:", e);
  process.exit(1);
});
