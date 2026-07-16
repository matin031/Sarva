"use client";

import { useState } from "react";
import { adminUploadQuizAudio } from "@/lib/admin/upload-actions";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
};

/** File picker that uploads to Supabase Storage and fills `value` with the
 *  resulting public URL — plus a manual URL field underneath for anyone
 *  who already has the file hosted somewhere else. Both write to the same
 *  `value`, so the form itself doesn't need to know which path was used. */
export default function AudioUploadField({ label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await adminUploadQuizAudio(formData);
    setUploading(false);
    if (!result.ok) {
      setError(result.errors.join("\n"));
      return;
    }
    onChange(result.data.url);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-muted-foreground">{label}</label>

      <label
        className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm transition-colors ${
          uploading ? "border-border text-muted-foreground" : "border-primary/50 text-primary hover:bg-primary/5"
        }`}
      >
        <input
          type="file"
          accept="audio/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
        {uploading ? "در حال آپلود..." : "انتخاب فایل صوتی از سیستم"}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {value && <audio controls src={value} className="w-full" />}

      <input
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="یا لینک مستقیم فایل را بگذارید..."
        className="min-h-9 rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
      />
    </div>
  );
}
