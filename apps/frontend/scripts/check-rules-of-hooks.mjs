#!/usr/bin/env node
/**
 * Fails on any `react-hooks/rules-of-hooks` violation.
 *
 * A hook called below an early return runs only on the renders that get past
 * that return. On the product page this meant a cold load — the first render
 * shows a loading state, the second has data — changed the hook count between
 * renders, so React threw "Rendered more hooks than during the previous
 * render." and the site served its 500 page. Google's indexed product links all
 * land cold, so they all broke, while in-site links (which prefetch) did not.
 *
 * `npm run lint` already reports this, but the repo carries ~74 pre-existing
 * lint errors, so the full run can't gate a merge. This checks the one rule
 * that is clean today and must stay that way.
 */
import { ESLint } from "eslint";

const RULE = "react-hooks/rules-of-hooks";

const results = await new ESLint().lintFiles(["."]);
const violations = results.flatMap((result) =>
  result.messages
    .filter((message) => message.ruleId === RULE)
    .map((message) => `${result.filePath}:${message.line}:${message.column}\n  ${message.message}`),
);

if (violations.length > 0) {
  console.error(`${RULE}: ${violations.length} violation(s)\n`);
  console.error(violations.join("\n\n"));
  process.exit(1);
}

console.log(`${RULE}: clean`);
