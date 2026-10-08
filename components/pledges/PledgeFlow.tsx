"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
}

export function PledgeFlow({
  eventId,
  eventTitle,
  eventDescription,
  currentUser,
  alreadyPledged,
}: {
  eventId: string;
  eventTitle: string;
  eventDescription: string | null;
  currentUser: CurrentUser | null;
  alreadyPledged: boolean;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [already, setAlready] = React.useState(alreadyPledged);
  const [submitting, setSubmitting] = React.useState(false);

  const signInHref = `/login?redirectTo=${encodeURIComponent(
    `/pledges/${eventId}`,
  )}`;

  async function confirmPledge() {
    if (!currentUser) {
      router.push(signInHref);
      return;
    }
    const value = text.trim();
    if (!value) {
      toast.error("Please write your pledge first.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, pledgeText: value }),
      });
      if (response.status === 409) {
        setAlready(true);
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not save your pledge.");
      }
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not save your pledge.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary pb-44 text-white sm:pb-16">
      <header className="mx-auto max-w-3xl px-4 py-10 text-center sm:py-14">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C59B27]">
          Take the pledge
        </span>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-balance text-white sm:text-4xl">
          {eventTitle}
        </h1>
        {eventDescription && (
          <p className="mt-4 text-base leading-relaxed text-white/80">
            {eventDescription}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4">
        {already ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/5 px-6 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#C59B27]">
              <CheckCircle2 className="size-8 text-primary" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Pledge already signed
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
              You&apos;ve already signed the pledge for this event. Your official
              certificate was emailed to you, and you can only pledge once.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={`/events/${eventId}`}>Back to event</Link>
            </Button>
          </div>
        ) : submitted ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/5 px-6 py-14 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[#C59B27]">
              <CheckCircle2 className="size-8 text-primary" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              Pledge successfully signed!
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
              Thank you, {currentUser?.firstName || "friend"}. Your official
              pledge certificate is being generated and will be emailed to you
              shortly.
            </p>
            <Button asChild variant="outline" className="mt-6 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href={`/events/${eventId}`}>Back to event</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-10">
            <p className="text-2xl font-medium leading-relaxed sm:text-3xl sm:leading-relaxed">
              I,{" "}
              <span className="font-semibold text-[#C59B27]">
                {currentUser?.name || "[your name]"}
              </span>
              , pledge that{" "}
              <span className="whitespace-pre-line">
                {text.trim() || (
                  <span className="text-white/40">
                    your pledge will appear here as you type...
                  </span>
                )}
              </span>
            </p>
          </div>
        )}
      </main>

      {!submitted && !already && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:static sm:mx-auto sm:mt-8 sm:max-w-3xl sm:p-0">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur sm:p-4">
            {currentUser ? (
              <>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="I will lead with integrity and serve my community..."
                  className="min-h-[52px] resize-none border-0 bg-transparent px-1 text-base text-white placeholder:text-white/40 focus-visible:ring-0 sm:min-h-20"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-white/60">
                    Signing as {currentUser.name}
                  </span>
                  <Button
                    onClick={confirmPledge}
                    disabled={submitting || !text.trim()}
                    className="bg-[#C59B27] text-white hover:bg-[#b08a1f]"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PenLine className="size-4" />
                    )}
                    {submitting ? "Saving..." : "Confirm pledge"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white/80">
                  Sign in to sign the pledge.
                </p>
                <Button asChild className="bg-[#C59B27] text-white hover:bg-[#b08a1f]">
                  <Link href={signInHref}>Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
