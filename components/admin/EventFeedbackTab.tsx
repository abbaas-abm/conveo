"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Loader2,
  MessageSquareHeart,
  Share2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Feedback } from "@/lib/types";

const GOLD = "#d9b45b";

function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(size)}
          style={{
            color: i < rating ? GOLD : "rgba(107,114,128,0.35)",
            fill: i < rating ? GOLD : "transparent",
          }}
        />
      ))}
    </div>
  );
}

export function EventFeedbackTab({ event }: { event: { id: string } }) {
  const [feedback, setFeedback] = React.useState<Feedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const [shareUrl, setShareUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setFeedback((data ?? []) as Feedback[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  async function openShare() {
    setCopied(false);
    setShareOpen(true);
    const url = `${window.location.origin}/feedback/${event.id}`;
    setShareUrl(url);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 720,
        margin: 2,
        color: { dark: "#003366", light: "#ffffff" },
      });
      setQr(dataUrl);
    } catch (error) {
      console.error(error);
      toast.error("Could not generate the QR code.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Please copy it manually.");
    }
  }

  const total = feedback.length;
  const sum = feedback.reduce((acc, item) => acc + item.rating, 0);
  const average = total > 0 ? sum / total : 0;

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: feedback.filter((f) => f.rating === stars).length,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feedback</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Anonymous responses collected from the feedback form.
          </p>
        </div>
        <Button onClick={openShare}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : total === 0 ? (
        <Card className="mx-auto flex max-w-2xl flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <MessageSquareHeart className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            No feedback yet
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Share the feedback form to start collecting responses.
          </p>
          <Button className="mt-5" onClick={openShare}>
            <Share2 className="size-4" />
            Share feedback form
          </Button>
        </Card>
      ) : (
        <>
          <Card className="border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Average rating
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <span
                    className="text-5xl font-semibold leading-none"
                    style={{ color: "#003366" }}
                  >
                    {average.toFixed(1)}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">
                    / 5 · {total} {total === 1 ? "response" : "responses"}
                  </span>
                </div>
                <div className="mt-3">
                  <Stars rating={Math.round(average)} />
                </div>
              </div>

              <div className="w-full max-w-xs space-y-2">
                {distribution.map(({ stars, count }) => {
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={stars}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="flex w-8 items-center gap-1 text-gray-600">
                        {stars}
                        <Star
                          className="size-3"
                          style={{ color: GOLD, fill: GOLD }}
                        />
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: GOLD }}
                        />
                      </div>
                      <span className="w-6 text-right text-gray-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {feedback.map((item) => (
              <Card key={item.id} className="border-gray-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <Stars rating={item.rating} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)} · {formatTime(item.created_at)}
                  </span>
                </div>
                {item.comment ? (
                  <p className="mt-3 text-sm leading-relaxed text-gray-700">
                    {item.comment}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-muted-foreground">
                    No comment provided.
                  </p>
                )}
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Anonymous
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="overflow-x-hidden sm:max-w-lg">
          <DialogHeader className="min-w-0 items-center space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b08a3e]">
              Feedback
            </p>
            <DialogTitle className="text-2xl">Feedback Form</DialogTitle>
            <DialogDescription className="text-center">
              Scan the QR code or copy the link to share.
            </DialogDescription>
          </DialogHeader>

          <div className="flex w-full min-w-0 flex-col items-center gap-5">
            <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-xl border border-gray-200 bg-white p-4">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL QR
                <img
                  src={qr}
                  alt="Feedback form QR code"
                  className="h-full w-full"
                />
              ) : (
                <Loader2 className="size-8 animate-spin text-primary" />
              )}
            </div>

            <div className="flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-slate-50 p-2">
              <span className="min-w-0 flex-1 truncate text-center text-xs text-gray-600">
                {shareUrl}
              </span>
              <Button size="sm" onClick={copyLink} className="shrink-0">
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
