"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationPrompt() {
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem("csd:notif-dismissed") === "1") return;

    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (Notification.permission === "granted" && existing) return;
      } catch {
        // fall through and show the prompt
      }
      setVisible(true);
    })();
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were not enabled.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!response.ok) throw new Error("Could not save the subscription.");
      toast.success("Notifications enabled.");
      setVisible(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem("csd:notif-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex w-[19rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl print:hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Bell className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Get event alerts</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
          Turn on notifications to receive important announcements.
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <Button size="sm" onClick={enable} disabled={busy}>
            {busy ? "Enabling..." : "Enable"}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-slate-100 hover:text-gray-700"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
