"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn, storagePathFromPublicUrl } from "@/lib/utils";
import {
  EVENT_IMAGE_BUCKET,
  removeEventImage,
  uploadEventImage,
} from "@/lib/storage";

interface ImageUploaderProps {
  label: string;
  recommended: string;
  aspect: string;
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  className?: string;
}

export function ImageUploader({
  label,
  recommended,
  aspect,
  folder,
  value,
  onChange,
  className,
}: ImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadEventImage(file, folder);
      onChange(url);
      toast.success(`${label} updated.`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(event: React.MouseEvent) {
    event.stopPropagation();
    if (!value) return;
    const path = storagePathFromPublicUrl(value, EVENT_IMAGE_BUCKET);
    onChange(null);
    await removeEventImage(path);
    toast.success(`${label} removed.`);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
          >
            <X className="size-3" />
            Remove
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "relative block w-full overflow-hidden rounded-xl border border-dashed border-gray-300 bg-slate-50 text-center transition-colors hover:border-primary/40 hover:bg-slate-100",
          aspect,
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
            <img
              src={value}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors hover:bg-black/40 hover:text-white">
              <span className="text-sm font-medium">Change image</span>
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4">
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : (
              <ImagePlus className="size-6 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {uploading ? "Uploading..." : "Click to upload"}
            </span>
            <span className="text-xs text-muted-foreground">
              Recommended {recommended}
            </span>
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
