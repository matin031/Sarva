"use client";

import { useState } from "react";
import { adminUploadImage } from "@/lib/admin/upload-actions";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** یک خط توضیح زیرِ برچسب — مثلاً «بهتر است پس‌زمینه‌اش شفاف باشد». */
  hint?: string;
};

/**
 * انتخابِ فایل → آپلود → پر شدنِ `value` با نشانیِ نتیجه، به‌علاوهٔ یک فیلدِ
 * دستی برای نگاره‌ای که جای دیگری میزبانی می‌شود.
 *
 * همان الگوی AudioUploadField و عمداً هم‌شکلِ آن: هر دو راه به *یک* مقدار
 * می‌نویسند، پس فرمِ بالادست نمی‌داند کدام مسیر طی شده.
 */
export default function ImageUploadField({ label, value, onChange, hint }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* تصویری که بارگذاری نمی‌شود باید *دیده* شود. بدون این، یک نشانیِ غلط در
     پنل یک کادرِ خالی است و مدیر تازه در خودِ بازی می‌فهمد. */
  const [broken, setBroken] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await adminUploadImage(formData);
    setUploading(false);
    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }
    setBroken(false);
    onChange(result.data.url);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm text-muted-foreground">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => {
              setBroken(false);
              onChange("");
            }}
            className="text-xs text-destructive hover:underline"
          >
            برداشتن تصویر
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}

      <div className="flex items-start gap-3">
        <label
          className={`flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-3 text-center text-sm transition-colors ${
            uploading
              ? "border-border text-muted-foreground"
              : "border-primary/50 text-primary hover:bg-primary/5"
          }`}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          <span className="text-lg" aria-hidden>
            {uploading ? "⏳" : "🖼️"}
          </span>
          <span>{uploading ? "در حال آپلود…" : "انتخاب تصویر از سیستم"}</span>
          <span className="text-[11px] text-muted-foreground">
            png، jpg، webp، gif یا avif — تا ۸ مگابایت
          </span>
        </label>

        {/* پیش‌نمایش با همان چیدمانی که در بازی دیده می‌شود: تصویر بریده
            نمی‌شود، پس نگارهٔ بلند هم درست دیده می‌شود. */}
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
          {value && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
              className="absolute inset-0 size-full object-contain p-1"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
              {broken ? "باز نشد" : "بدون تصویر"}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-xs whitespace-pre-line text-destructive">{error}</p>}

      <input
        dir="ltr"
        value={value}
        onChange={(e) => {
          setBroken(false);
          onChange(e.target.value);
        }}
        placeholder="یا نشانی مستقیم تصویر را بگذارید…"
        className="min-h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
      />
    </div>
  );
}
