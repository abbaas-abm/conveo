"use client";

import * as React from "react";
import { Bell, BellOff, Share, X } from "lucide-react";
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

type Mode = "hidden" | "enable" | "ios" | "blocked";

function isIos() {
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && "ontouchend" in document)
  );
}

export function NotificationPrompt() {
  const [mode, setMode] = React.useState<Mode>("hidden");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn(
        "[notifications] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set at build time — push opt-in is disabled.",
      );
      return;
    }

    const ios = isIos();
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    (async () => {
      // Already subscribed? stay hidden.
      if (supported) {
        try {
          await navigator.serviceWorker.register("/sw.js");
          const reg = await navigator.serviceWorker.ready;
          const existing = await reg.pushManager.getSubscription();
          if (Notification.permission === "granted" && existing) {
            setMode("hidden");
            return;
          }
        } catch {
          // fall through
        }
      }

      // iOS only supports Web Push from an installed (Home Screen) PWA.
      if (ios && !standalone) {
        setMode("ios");
        return;
      }

      if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setMode("blocked");
        return;
      }

      if (!supported) {
        setMode("hidden");
        return;
      }

      const dismissed = sessionStorage.getItem("csd:notif-dismissed") === "1";
      setMode(dismissed ? "hidden" : "enable");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      if (!VAPID_PUBLIC_KEY) throw new Error("Push is not configured.");
      if (!("Notification" in window)) {
        throw new Error("Notifications aren't supported on this browser.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMode(permission === "denied" ? "blocked" : "enable");
        toast.error("Notifications were not enabled.");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser can't receive push notifications.");
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
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not save the subscription.");
      }

      toast.success("Notifications enabled.");
      setMode("hidden");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not enable notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem("csd:notif-dismissed", "1");
    setMode("hidden");
  }

  if (mode === "hidden") return null;

  return (
    <div className="fixed bottom-24 left-4 z-[45] flex w-[19rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:bottom-4 print:hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        {mode === "blocked" ? (
          <BellOff className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        {mode === "enable" && (
          <>
            <p className="text-sm font-semibold text-gray-900">
              Get event alerts
            </p>
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
          </>
        )}

        {mode === "ios" && (
          <>
            <p className="text-sm font-semibold text-gray-900">
              Get event alerts
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
              On iPhone/iPad, first add this site to your Home Screen: tap the{" "}
              <Share className="inline size-3.5 align-text-bottom" /> Share
              button, then <span className="font-medium">Add to Home Screen</span>.
              Open it from there and enable notifications.
            </p>
          </>
        )}

        {mode === "blocked" && (
          <>
            <p className="text-sm font-semibold text-gray-900">
              Notifications are blocked
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
              Enable notifications for this site in your browser settings, then
              reload.
            </p>
          </>
        )}
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
