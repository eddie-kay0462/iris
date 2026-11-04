// Type declarations for static image imports (`import hero from "./x.jpg"`).
//
// Next normally provides these through `next-env.d.ts`, but that file is
// generated on `next dev`/`next build` and is gitignored, so it doesn't exist
// in CI where `tsc --noEmit` runs on a fresh checkout. Referencing the same
// types here keeps the typecheck independent of a prior Next run.
/// <reference types="next/image-types/global" />
