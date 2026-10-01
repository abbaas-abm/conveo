"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createClient } from "@/lib/supabase/client";
import { storagePathFromPublicUrl } from "@/lib/utils";
import {
  EVENT_IMAGE_BUCKET,
  removeEventImage,
  uploadEventImage,
} from "@/lib/storage";
import type { EventRecord, EventGalleryImage } from "@/lib/types";

export function EventMediaTab({ event }: { event: EventRecord }) {
  const [coverUrl, setCoverUrl] = React.useState<string | null>(
    event.cover_image_url,
  );
  const [featuredUrl, setFeaturedUrl] = React.useState<string | null>(
    event.featured_image_url,
  );
  const [gallery, setGallery] = React.useState<EventGalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = React.useState(true);
  const [uploadingGallery, setUploadingGallery] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("event_gallery_images")
        .select("*")
        .eq("event_id", event.id)
        .order("display_order", { ascending: true });
      if (active) {
        setGallery((data ?? []) as EventGalleryImage[]);
        setLoadingGallery(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [event.id]);

  async function updateEventImage(
    field: "cover" | "featured",
    url: string | null,
  ) {
    const key = storagePathFromPublicUrl(url, EVENT_IMAGE_BUCKET);
    if (field === "cover") setCoverUrl(url);
    else setFeaturedUrl(url);

    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update(
        field === "cover"
          ? { cover_image_url: url, cover_image_key: key }
          : { featured_image_url: url, featured_image_key: key },
      )
      .eq("id", event.id);
    if (error) {
      toast.error(error.message);
    }
  }

  async function handleGalleryUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      const supabase = createClient();
      const startOrder = gallery.length;
      const created: EventGalleryImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url, path } = await uploadEventImage(
          file,
          `events/${event.id}/gallery`,
        );
        const { data, error } = await supabase
          .from("event_gallery_images")
          .insert({
            event_id: event.id,
            file_name: file.name,
            image_url: url,
            object_key: path,
            display_order: startOrder + i,
          })
          .select("*")
          .single();
        if (error) throw error;
        created.push(data as EventGalleryImage);
      }

      setGallery((prev) => [...prev, ...created]);
      toast.success(
        `${created.length} image${created.length > 1 ? "s" : ""} added.`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Could not upload images.",
      );
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handleGalleryDelete(image: EventGalleryImage) {
    if (!window.confirm("Remove this gallery image?")) return;
    setDeletingId(image.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("event_gallery_images")
        .delete()
        .eq("id", image.id);
      if (error) throw error;
      await removeEventImage(image.object_key);
      setGallery((prev) => prev.filter((item) => item.id !== image.id));
      toast.success("Image removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove image.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Cover image
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The wide banner shown at the top of the public event page.
          </p>
        </div>
        <ImageUploader
          label="Cover banner"
          recommended="1400 × 560 px"
          aspect="aspect-[5/2]"
          folder={`events/${event.id}/cover`}
          value={coverUrl}
          onChange={(url) => updateEventImage("cover", url)}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Featured image
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A square image used on event cards and listings.
          </p>
        </div>
        <div className="max-w-xs">
          <ImageUploader
            label="Featured image"
            recommended="600 × 600 px"
            aspect="aspect-square"
            folder={`events/${event.id}/featured`}
            value={featuredUrl}
            onChange={(url) => updateEventImage("featured", url)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Gallery
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Post-event photos and highlights.
            </p>
          </div>
          <Button
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadingGallery}
          >
            {uploadingGallery ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploadingGallery ? "Uploading..." : "Add images"}
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGalleryUpload}
          />
        </div>

        {loadingGallery ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : gallery.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <ImagePlus className="size-6 text-gray-400" />
            <h4 className="mt-3 text-sm font-semibold text-gray-900">
              No gallery images yet
            </h4>
            <p className="mt-1 text-sm text-gray-600">
              Add photos to showcase this event.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {gallery.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                <img
                  src={image.image_url}
                  alt={image.file_name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleGalleryDelete(image)}
                  disabled={deletingId === image.id}
                  aria-label="Remove image"
                  className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-destructive opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 disabled:opacity-100"
                >
                  {deletingId === image.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
