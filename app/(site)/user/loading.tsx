export default function Loading() {
  // Neutral loader: intentionally does NOT resemble the dashboard, so a
  // signed-out visitor (e.g. opening the PWA on a protected route) never sees
  // dashboard-shaped content before being redirected to sign in.
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <span className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
    </div>
  );
}
