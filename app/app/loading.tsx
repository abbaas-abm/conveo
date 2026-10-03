export default function AppEntryLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-4">
        <span className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-[#d9b45b]" />
        <p className="text-sm font-medium text-white/70">Loading Wits CSD…</p>
      </div>
    </div>
  );
}
