"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarCheck,
  Check,
  GraduationCap,
  Loader2,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RsvpStatus, UserPosition } from "@/lib/types";

const POSITION_OPTIONS: {
  value: UserPosition;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "STUDENT",
    label: "Student",
    description: "Currently enrolled at Wits",
    icon: GraduationCap,
  },
  {
    value: "STAFF",
    label: "Staff",
    description: "Wits employee or academic",
    icon: Briefcase,
  },
  {
    value: "GUEST_SPEAKER",
    label: "Guest Speaker",
    description: "Invited speaker for this event",
    icon: Mic,
  },
];

interface RsvpButtonProps {
  eventId: string;
  isAuthenticated: boolean;
  initialStatus: RsvpStatus | null;
  eventOpen: boolean;
  profilePosition?: UserPosition | null;
  size?: "default" | "lg";
  className?: string;
}

export function RsvpButton({
  eventId,
  isAuthenticated,
  initialStatus,
  eventOpen,
  profilePosition,
  size = "lg",
  className,
}: RsvpButtonProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<RsvpStatus | null>(initialStatus);
  const [pending, setPending] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [position, setPosition] = React.useState<UserPosition | "">(
    profilePosition ?? "",
  );

  const confirmed = status === "CONFIRMED";

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=/events/${eventId}`);
      return;
    }
    if (confirmed) {
      toast.success("You're confirmed for this event.");
      return;
    }
    setDialogOpen(true);
  }

  async function confirmRsvp() {
    if (!position) {
      toast.error("Please choose how you are attending.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, position }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not confirm RSVP.");
      }
      setStatus("CONFIRMED");
      setDialogOpen(false);
      toast.success("Attendance successfully marked.");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not confirm RSVP.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!eventOpen) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <CalendarCheck className="size-4" />
        Registrations closed
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size={size}
        onClick={handleClick}
        disabled={pending}
        className={cn(
          className,
          confirmed &&
            "border-transparent bg-emerald-600 text-white hover:bg-emerald-700",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : confirmed ? (
          <Check className="size-4" />
        ) : (
          <CalendarCheck className="size-4" />
        )}
        {pending ? "Processing..." : confirmed ? "Confirmed" : "RSVP now"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-xl">
              Are you attending as a...
            </DialogTitle>
            <DialogDescription>
              Choose the option that best describes you for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {POSITION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = position === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPosition(option.value)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-blue-50"
                      : "border-gray-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-gray-600",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium text-gray-900">
                      {option.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-gray-300",
                    )}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRsvp}
              disabled={pending || !position}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarCheck className="size-4" />
              )}
              {pending ? "Confirming..." : "Confirm RSVP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
