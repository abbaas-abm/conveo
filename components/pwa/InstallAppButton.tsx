"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosReady, setIosReady] = React.useState(false);
  const [showIosHelp, setShowIosHelp] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari =
      /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    if (isIOS && isSafari) {
      queueMicrotask(() => {
        setIosReady(true);
        setVisible(true);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
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
      setShowIosHelp(false);
      return;
    }
    setShowIosHelp((value) => !value);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
      {showIosHelp && iosReady && (
        <div className="w-72 rounded-xl bg-white p-4 text-sm text-gray-700 shadow-xl ring-1 ring-black/5">
          <p className="font-semibold text-gray-900">Install this app</p>
          <p className="mt-1 leading-relaxed">
            Tap the <Share className="inline size-4 align-text-bottom" /> Share
            button in Safari, then choose{" "}
            <span className="font-medium text-gray-900">
              Add to Home Screen
            </span>
            .
          </p>
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
