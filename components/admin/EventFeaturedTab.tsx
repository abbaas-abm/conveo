"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageCropUploader } from "@/components/admin/ImageCropUploader";
import { createClient } from "@/lib/supabase/client";
import { revalidateEvents } from "@/lib/cache-actions";
import { EVENT_IMAGE_BUCKET, removeEventImage, uploadEventImage } from "@/lib/storage";
import { storagePathFromPublicUrl } from "@/lib/utils";
import type { EventFeatured, EventRecord } from "@/lib/types";

interface Draft {
  id?: string;
  title: string;
  description: string;
  image_url: string | null;
  file: File | null;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  image_url: null,
  file: null,
};

export function EventFeaturedTab({ event }: { event: EventRecord }) {
  const [items, setItems] = React.useState<EventFeatured[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_featured")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as EventFeatured[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  }

  function openEdit(item: EventFeatured) {
    setDraft({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      image_url: item.image_url,
      file: null,
    });
    setOpen(true);
  }

  async function handleSave() {
    const title = draft.title.trim();
    if (!title) {
      toast.error("A title is required.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      let imageUrl = draft.image_url;
      if (draft.file) {
        const { url } = await uploadEventImage(
          draft.file,
          `events/${event.id}/featured`,
        );
        imageUrl = url;
      }
      if (!imageUrl) {
        toast.error("An image is required.");
        return;
      }

      const payload = {
        event_id: event.id,
        title,
        description: draft.description.trim() || null,
        image_url: imageUrl,
      };

      if (draft.id) {
        const { data, error } = await supabase
          .from("event_featured")
          .update(payload)
          .eq("id", draft.id)
          .select("*")
          .single();
        if (error) throw error;
        setItems((prev) =>
          prev.map((item) =>
            item.id === draft.id ? (data as EventFeatured) : item,
          ),
        );
        toast.success("Featured moment updated.");
      } else {
        const { data, error } = await supabase
          .from("event_featured")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        setItems((prev) => [...prev, data as EventFeatured]);
        toast.success("Featured moment added.");
      }
      void revalidateEvents();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: EventFeatured) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setDeletingId(item.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("event_featured")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      const path = storagePathFromPublicUrl(item.image_url, EVENT_IMAGE_BUCKET);
      if (path) await removeEventImage(path);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      toast.success("Featured moment deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Featured moments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Highlights shown on the public event page. One item shows statically;
            multiple items cycle in a slider.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Add featured
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Sparkles className="size-6 text-gray-400" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">
            No featured moments yet
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Add a highlight with a title, description and image.
          </p>
          <Button className="mt-5" onClick={openNew}>
            <Plus className="size-4" />
            Add featured
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="flex items-center gap-4 border-gray-200 p-4"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit featured moment"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete featured moment"
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {draft.id ? "Edit featured moment" : "Add featured moment"}
            </DialogTitle>
            <DialogDescription>
              A title, optional description and an image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="featured-title">Title</Label>
              <Input
                id="featured-title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Opening keynote highlights"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="featured-description">Description</Label>
              <Textarea
                id="featured-description"
                value={draft.description}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="A short summary shown in the slider."
              />
            </div>
            <div className="space-y-2">
              <ImageCropUploader
                label="Featured image"
                recommended="1200 × 800 px"
                ratio={3 / 2}
                initialUrl={draft.image_url}
                onFileChange={(file) =>
                  setDraft((prev) => ({ ...prev, file }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {draft.id ? "Save changes" : "Add featured"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
