"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import { X } from "lucide-react";

interface LightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

/** 全屏图片灯箱：点遮罩 / 关闭按钮 / ESC 关闭，打开时锁定页面滚动 */
export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      role="dialog"
      aria-label="查看大图"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="关闭大图"
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={src}
        alt={alt || "作品图片大图预览"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full select-none rounded-lg shadow-dialog"
      />
    </div>
  );
}
