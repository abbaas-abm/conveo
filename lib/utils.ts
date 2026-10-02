export { cn } from "cn";

export function formatDate(
  value: string | Date,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-ZA", opts).format(date);
}

export function formatTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | Date) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function isWitsEmail(email: string) {
  return /@(students\.)?wits\.ac\.za$/i.test(email.trim());
}

export function initials(first?: string | null, last?: string | null) {
  return (
    `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "CSD"
  );
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function storagePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export function secondsUntil(iso: string | Date): number {
  const target = typeof iso === "string" ? new Date(iso) : iso;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

export function splitDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}
