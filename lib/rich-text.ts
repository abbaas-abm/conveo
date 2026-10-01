const BLOCKED_TAGS = ["script", "style", "iframe", "object", "embed", "link", "meta", "form", "input", "button"];

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let output = html;

  for (const tag of BLOCKED_TAGS) {
    const paired = new RegExp(
      `<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`,
      "gi",
    );
    const selfClosing = new RegExp(`<\\s*${tag}\\b[^>]*\\/?>`, "gi");
    output = output.replace(paired, "").replace(selfClosing, "");
  }

  output = output.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  output = output.replace(
    /(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
    '$1="#"',
  );
  output = output.replace(
    /(href|src)\s*=\s*javascript:[^\s>]*/gi,
    '$1="#"',
  );

  return output.trim();
}

export function hasMarkup(value: string | null | undefined): boolean {
  return Boolean(value && /<[a-z][\s\S]*>/i.test(value));
}

export function richTextToPlain(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
