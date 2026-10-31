# Geist Serif — Duzelo typography integration

Source: [Introducing Geist Serif](https://vercel.com/blog/introducing-geist-serif), Vercel, 30 October 2026.

Font family: [Vercel Geist](https://github.com/vercel/geist-font), distributed under SIL Open Font License 1.1 and suitable for commercial use. Install via the pinned `geist@1.9.0` package; no binaries are committed to this repository.

## Visual decision

Duzelo's warm, approachable brand benefits from one editorial contrast to its utilitarian navigation.

- **Body, navigation, buttons, forms, category cards:** Geist Sans via `GeistSans` and `--font-geist-sans`.
- **Display accents inside large headings:** Geist Serif Regular via `GeistSerifRegular` and `--font-geist-serif-regular`.
- Keep existing hierarchy, spacing, semantic emphasis, responsive sizing and Light/Dark/System contrast. Never apply the delicate high-contrast Serif to tiny metadata, status text, form labels or safety instructions.
- First release provides only Regular, not true bold or italics; `<em>` elements retain semantic emphasis but render `font-style: normal; font-weight: 400`. Do not synthesize italic/bold.
- Use the **Regular dot variant** for now; Square/Triangle/Heart are unnecessary for Duzelo's UI. Scoped exports avoid downloading all variants.
- No external browser CDN: the Next.js font integration self-hosts optimised font files. Fall back to Georgia for the Serif if a font fails, and to system sans for body.

## Accessibility / quality

Verify headline wraps at 320px, 390px, 768px and 1440px in both themes. Check no new CLS, missing glyphs, clipped ascenders/descenders, overly tight kerning or hydration warnings. Compare before/after screenshots at mobile and desktop. Test browser computed font-family values and availability through `document.fonts.ready`; do not infer from CSS text alone. Run `npm ci`, lint, TypeScript, unit tests and production build before merging.

Do not copy the original poster art or any other Vercel branding. Only the independently licensed typeface is used.
