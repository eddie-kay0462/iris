---
description: Append a plain-language changelog entry to FOR_THE_TEAM.md for the feature just completed
argument-hint: [optional feature name / short context]
---

You are updating the team progress log at the repo root: `FOR_THE_TEAM.md`.

Your job: append ONE new section describing the major feature that was just finished, written for non-engineer teammates.

## Steps

1. **Figure out what changed.** Use, in order of preference:
   - `$ARGUMENTS` if provided — treat it as the feature name / context.
   - What we just built in this conversation.
   - `git status` + `git diff` (uncommitted work) and `git log --oneline -15` (recent commits) to see what's new since the last entry. Run `git diff --stat` to get the real list of touched files — base the "Files changed" table on this, not memory.
   - If after all that the scope is genuinely ambiguous (e.g. several unrelated changes are in flight), ask the user one short question to confirm which feature to log. Otherwise just write it.

2. **Match the existing format exactly.** Open the END of `FOR_THE_TEAM.md` and copy the shape of the most recent `##` sections. Each entry is:
   - A header: `## <Feature Name> (<Current Month Year>)` — use today's real month and year.
   - A short plain-language paragraph or two: what got done and why it matters. No jargon; if a technical term is unavoidable, explain it in parentheses.
   - A **Files changed** table with two columns (`File` | `What changed`), listing the actually-touched files from `git diff --stat`.
   - Optional **Heads-up / action required** blockquote if a migration must be run, an env var added, etc.
   - Optional **How to test** numbered list if it's user-testable.

3. **Append at the very end of the file** (newest entries go last), preceded by a `---` separator and a blank line if the file doesn't already end with one.

4. **Keep it skimmable and honest.** Match the casual tone of the existing log. Don't invent files or steps. Don't overstate — if something is partial or needs follow-up, say so.

5. **Do NOT commit or push** unless the user explicitly asks. Just write the file and give a one-line summary of the entry you added.
