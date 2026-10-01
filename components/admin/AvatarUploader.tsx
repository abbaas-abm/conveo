"use client";

import * as React from "react";
import { Check, ImagePlus, Loader2, Move, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWPORT = 224;
const OUTPUT = 512;

interface AvatarUploaderProps {
  initialUrl?: string | null;
  onFileChange: (file: File | null) => void;
  className?: string;
}

interface Natural {
  w: number;
  h: number;
}

export function AvatarUploader({
  initialUrl,
  onFileChange,
  className,
}: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const [src, setSrc] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);
  const [natural, setNatural] = React.useState<Natural | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [generating, setGenerating] = React.useState(false);

  const drag = React.useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const baseScale = natural ? VIEWPORT / Math.min(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;
  const dw = (natural?.w ?? 1) * scale;
  const dh = (natural?.h ?? 1) * scale;

  function clamp(x: number, y: number, w: number, h: number) {
    const minX = Math.min(0, VIEWPORT - w);
    const minY = Math.min(0, VIEWPORT - h);
    return {
      x: Math.max(minX, Math.min(0, x)),
      y: Math.max(minY, Math.min(0, y)),
    };
  }

  const produce = React.useCallback(
    async (nat: Natural, z: number, off: { x: number; y: number }) => {
      const img = imgRef.current;
      if (!img) return;
      setGenerating(true);
      try {
        const ratio = OUTPUT / VIEWPORT;
        const s = (VIEWPORT / Math.min(nat.w, nat.h)) * z;
        const w = nat.w * s;
        const h = nat.h * s;
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT;
        canvas.height = OUTPUT;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(
          img,
          off.x * ratio,
          off.y * ratio,
          w * ratio,
          h * ratio,
        );
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png", 0.92),
        );
        if (!blob) return;
        onFileChange(
          new File([blob], "speaker-avatar.png", { type: "image/png" }),
        );
        setResult(canvas.toDataURL("image/png"));
      } finally {
        setGenerating(false);
      }
    },
    [onFileChange],
  );

  function pickFile() {
    inputRef.current?.click();
  }

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(file));
    setResult(null);
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    onFileChange(null);
    event.target.value = "";
  }

  function onImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const nat: Natural = { w: img.naturalWidth, h: img.naturalHeight };
    const s = VIEWPORT / Math.min(nat.w, nat.h);
    const initial = {
      x: (VIEWPORT - nat.w * s) / 2,
      y: (VIEWPORT - nat.h * s) / 2,
    };
    setNatural(nat);
    setZoom(1);
    setOffset(initial);
    void produce(nat, 1, initial);
  }

  function onZoomChange(nextZoom: number) {
    if (!natural) return;
    const ratio = nextZoom / zoom;
    const nextW = natural.w * baseScale * nextZoom;
    const nextH = natural.h * baseScale * nextZoom;
    const next = clamp(
      VIEWPORT / 2 - (VIEWPORT / 2 - offset.x) * ratio,
      VIEWPORT / 2 - (VIEWPORT / 2 - offset.y) * ratio,
      nextW,
      nextH,
    );
    setZoom(nextZoom);
    setOffset(next);
    void produce(natural, nextZoom, next);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!natural) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    setOffset(
      clamp(drag.current.originX + dx, drag.current.originY + dy, dw, dh),
    );
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current.active && natural) {
      void produce(natural, zoom, offset);
    }
    drag.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function confirmCrop() {
    setSrc(null);
    setNatural(null);
  }

  const preview = result ?? initialUrl ?? null;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelect}
      />

      {src ? (
        <div className="w-full max-w-xs space-y-4">
          <div
            className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-full border border-gray-200 bg-slate-100 active:cursor-grabbing"
            style={{ width: VIEWPORT, height: VIEWPORT }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- crop canvas needs the raw element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              draggable={false}
              onLoad={onImageLoad}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: dw,
                height: dh,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                userSelect: "none",
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70" />
          </div>

          <div className="flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#003366]"
              aria-label="Zoom"
            />
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Move className="size-3.5" />
            Drag to reposition, slide to zoom.
          </p>

          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={pickFile}>
              Change
            </Button>
            <Button
              type="button"
              onClick={confirmCrop}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Use photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative size-28 overflow-hidden rounded-full border border-gray-200 bg-slate-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL preview
              <img
                src={preview}
                alt="Speaker avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <ImagePlus className="size-7" />
              </div>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={pickFile}>
            <ImagePlus className="size-4" />
            {preview ? "Change photo" : "Upload photo"}
          </Button>
        </div>
      )}
    </div>
  );
}
