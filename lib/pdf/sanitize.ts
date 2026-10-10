// pdf-lib's StandardFonts (Helvetica, etc.) use WinAnsi (cp1252) encoding, which
// cannot represent characters above U+00FF (emoji, most symbols). drawText /
// widthOfTextAtSize throw "WinAnsi cannot encode ..." on those. Since our PDFs
// include user-provided text (names, comments, pledges), strip anything the font
// can't encode so generation never crashes.

// Unicode code points that cp1252 maps into its 0x80-0x9F range.
const CP1252_EXTRA = new Set<number>([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

export function sanitizeForPdf(text: string): string {
  let out = "";
  for (const ch of text ?? "") {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0xff || CP1252_EXTRA.has(cp)) out += ch;
  }
  return out;
}

/** Recursively sanitizes every string in a data object. */
export function sanitizeDataForPdf<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeForPdf(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDataForPdf(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDataForPdf(v);
    return out as T;
  }
  return value;
}
