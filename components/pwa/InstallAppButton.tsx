"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

declare global {
  interface Window {
    __csdInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && "ontouchend" in document)
  ) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

export function InstallAppButton() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = React.useState<Platform>("desktop");
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Already installed → nothing to offer.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    // Show on every platform (some have no native prompt, so we show a hint).
    const detected = detectPlatform();
    const existing = window.__csdInstallPrompt ?? null;
    queueMicrotask(() => {
      setPlatform(detected);
      setVisible(true);
      if (existing) setDeferredPrompt(existing);
    });

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function onPromptReady() {
      if (window.__csdInstallPrompt) {
        setDeferredPrompt(window.__csdInstallPrompt);
      }
    }

    function onInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("csd:installprompt", onPromptReady);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("csd:installprompt", onPromptReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (pathname?.startsWith("/admin") || !visible || dismissed) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
      window.__csdInstallPrompt = null;
      setHelpOpen(false);
      return;
    }
    setHelpOpen((value) => !value);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
      {helpOpen && (
        <div className="w-72 rounded-xl bg-white p-4 text-sm text-gray-700 shadow-xl ring-1 ring-black/5">
          <p className="font-semibold text-gray-900">Install this app</p>
          {platform === "ios" ? (
            <p className="mt-1 leading-relaxed">
              Tap the <Share className="inline size-4 align-text-bottom" />{" "}
              Share button, then choose{" "}
              <span className="font-medium text-gray-900">
                Add to Home Screen
              </span>
              .
            </p>
          ) : platform === "android" ? (
            <p className="mt-1 leading-relaxed">
              Open your browser menu (the <span className="font-medium">⋮</span>{" "}
              icon) and tap{" "}
              <span className="font-medium text-gray-900">
                Install app
              </span>{" "}
              or{" "}
              <span className="font-medium text-gray-900">
                Add to Home screen
              </span>
              .
            </p>
          ) : (
            <p className="mt-1 leading-relaxed">
              Look for the{" "}
              <span className="font-medium text-gray-900">install</span> icon in
              your browser&apos;s address bar, or open the browser menu and
              choose <span className="font-medium text-gray-900">Install</span>.
              Chrome or Edge works best.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-full bg-primary p-1 pl-3 text-white shadow-lg">
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-2 py-1 text-sm font-medium"
        >
          <Download className="size-4" />
          Install app
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
          className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
