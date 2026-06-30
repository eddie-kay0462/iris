# Project Instructions

## Team progress log

`FOR_THE_TEAM.md` (repo root) is a casual, plain-language changelog read by non-engineer teammates.

**Whenever the user signals that a major feature is finished** — e.g. "done with X", "that feature's complete", "wrapped up X", "ship-ready" — update `FOR_THE_TEAM.md` as part of that turn by following the `/update-team` command flow:

- Base the entry on the actual changes (`git diff --stat`, recent commits, and what was built this session), not memory.
- Append ONE new section at the end of the file: `## <Feature Name> (<Current Month Year>)`, a short plain-language what/why, a **Files changed** table, and optional **Heads-up** / **How to test** subsections — matching the format of the existing entries.
- Plain language, skimmable, honest about anything partial. Do not commit or push unless asked.

Only do this for *major* features the user calls done — not small tweaks or every turn. If unsure whether something qualifies, ask.
