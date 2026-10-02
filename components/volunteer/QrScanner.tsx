"use client";

import * as React from "react";
import jsQR from "jsqr";
import {
  CheckCircle2,
  Info,
  Loader2,
  ScanLine,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import type { EventRecord, UserPosition } from "@/lib/types";

type Phase =
  | "scanning"
  | "loading"
  | "found"
  | "no-registration"
  | "already-checked-in"
  | "checked-in";

const POSITION_LABELS: Record<UserPosition, string> = {
  STUDENT: "Student",
  STAFF: "Staff",
  GUEST: "Guest",
  GUEST_SPEAKER: "Guest Speaker",
};

interface ScannedAttendee {
  id: string;
  name: string;
  position: UserPosition | null;
}

export function QrScanner({
  event,
  volunteerId,
  onClose,
}: {
  event: EventRecord;
  volunteerId: string;
  onClose: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const lockedRef = React.useRef(false);

  const [phase, setPhase] = React.useState<Phase>("scanning");
  const [attendee, setAttendee] = React.useState<ScannedAttendee | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const stopCamera = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const handleDecoded = React.useCallback(
    async (raw: string) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setPhase("loading");
      try {
        const userId = raw.trim();
        const supabase = createClient();
        const [{ data: profile }, { data: registration }] = await Promise.all([
          supabase
            .from("profiles")
            .select("first_name,last_name")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("registrations")
            .select("position, status")
            .eq("event_id", event.id)
            .eq("attendee_id", userId)
            .maybeSingle(),
        ]);

        if (!profile || !registration || registration.status !== "CONFIRMED") {
          setAttendee(
            profile
              ? {
                  id: userId,
                  name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
                  position: (registration?.position as UserPosition) ?? null,
                }
              : null,
          );
          setPhase("no-registration");
          return;
        }

        setAttendee({
          id: userId,
          name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
          position: registration.position as UserPosition,
        });
        setPhase("found");
      } catch (err) {
        console.error(err);
        setError("Could not read that code. Please try again.");
        setPhase("no-registration");
      }
    },
    [event.id],
  );

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = () => {
          if (cancelled) return;
          const v = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (v && canvas && ctx && v.readyState === v.HAVE_ENOUGH_DATA) {
            const width = 320;
            const height =
              Math.round((v.videoHeight / v.videoWidth) * width) || 240;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(v, 0, 0, width, height);
            const image = ctx.getImageData(0, 0, width, height);
            const code = jsQR(image.data, width, height);
            if (code?.data) void handleDecoded(code.data);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error(err);
        setError("Camera access was denied or is unavailable.");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [handleDecoded, stopCamera]);

  function scanNext() {
    lockedRef.current = false;
    setAttendee(null);
    setError(null);
    setPhase("scanning");
  }

  async function checkIn() {
    if (!attendee) return;
    setPhase("loading");
    try {
      const supabase = createClient();

      // Only one check-in per attendee per calendar day. If a record already
      // exists for today, stop and tell the operator.
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: existing, error: checkError } = await supabase
        .from("attendance")
        .select("id")
        .eq("event_id", event.id)
        .eq("attendee_id", attendee.id)
        .gte("created_at", dayStart.toISOString())
        .lt("created_at", dayEnd.toISOString())
        .maybeSingle();
      if (checkError) throw checkError;

      if (existing) {
        setPhase("already-checked-in");
        return;
      }

      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          event_id: event.id,
          volunteer_id: volunteerId,
          attendee_id: attendee.id,
        });
      if (insertError) throw insertError;
      toast.success(`${attendee.name} checked in.`);
      setPhase("checked-in");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not check in attendee.",
      );
      setPhase("found");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 flex flex-col">
        <header className="relative z-10 bg-white/90 px-4 py-3 text-center">
          <p className="text-base font-semibold text-primary">
            {event.title}
          </p>
          <p className="text-xs font-medium uppercase tracking-wider text-primary/70">
            Check-in
          </p>
        </header>

        <div className="relative flex flex-1 items-center justify-center">
          <div className="size-64 rounded-2xl border-4 border-white shadow-[0_0_0_9999px_rgba(255,255,255,0.65)]">
            {phase === "scanning" && (
              <ScanLine className="mx-auto mt-28 size-10 text-primary/50" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/90 text-primary shadow"
          >
            <X className="size-5" />
          </button>
        </div>

        <footer className="relative z-10 space-y-3 bg-white/95 p-4">
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          {phase === "scanning" && (
            <p className="text-center text-sm text-gray-600">
              Point the camera at an attendee&apos;s QR badge.
            </p>
          )}

          {phase === "loading" && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600">
              <Loader2 className="size-4 animate-spin" />
              Checking attendee...
            </div>
          )}

          {phase === "found" && attendee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(
                    attendee.name.split(" ")[0],
                    attendee.name.split(" ")[1],
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-gray-900">
                    {attendee.name || "Attendee"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {attendee.position
                      ? POSITION_LABELS[attendee.position]
                      : "Attendee"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-28"
                  onClick={scanNext}
                >
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={checkIn}
                  className="flex-1 border-transparent bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-5" />
                  Check-in
                </Button>
              </div>
            </div>
          )}

          {phase === "no-registration" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-destructive">
                  <XCircle className="size-6" />
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    No registration found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This attendee is not registered for this event.
                  </p>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={scanNext}>
                <ScanLine className="size-5" />
                Scan next
              </Button>
            </div>
          )}

          {phase === "checked-in" && attendee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {attendee.name || "Attendee"} checked in
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Attendance recorded successfully.
                  </p>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={scanNext}>
                <ScanLine className="size-5" />
                Scan next
              </Button>
            </div>
          )}

          {phase === "already-checked-in" && attendee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Info className="size-6" />
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {attendee.name || "Attendee"} already checked in
                  </p>
                  <p className="text-sm text-muted-foreground">
                    They have already been checked in today.
                  </p>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={scanNext}>
                <ScanLine className="size-5" />
                Scan next
              </Button>
            </div>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            <UserRound className="size-4" />
            Close scanner
          </Button>
        </footer>
      </div>
    </div>
  );
}
