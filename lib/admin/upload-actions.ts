"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const QUIZ_AUDIO_BUCKET = "quiz-audio";

/** Uploads an admin-picked audio file to Supabase Storage and returns its
 *  public URL. This is an interim storage backend — swapping to
 *  Cloudflare R2 or a self-hosted server later only means changing this
 *  one function; nothing in the quiz schema or the forms cares where the
 *  URL points, they just store/play whatever string comes back. */
export async function adminUploadQuizAudio(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: ["فایلی انتخاب نشده."] };
  }
  if (!file.type.startsWith("audio/")) {
    return { ok: false, errors: ["فقط فایل صوتی مجاز است."] };
  }
  const MAX_BYTES = 15 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return { ok: false, errors: ["حجم فایل نباید بیشتر از ۱۵ مگابایت باشد."] };
  }

  const supabase = createSupabaseAdmin();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error } = await supabase.storage.from(QUIZ_AUDIO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) {
    return {
      ok: false,
      errors: [
        error.message.includes("Bucket not found")
          ? `باکت «${QUIZ_AUDIO_BUCKET}» هنوز در Supabase ساخته نشده — از داشبورد Supabase → Storage → New bucket بسازید (عمومی/Public).`
          : error.message,
      ],
    };
  }

  const { data } = supabase.storage.from(QUIZ_AUDIO_BUCKET).getPublicUrl(path);
  return { ok: true, data: { url: data.publicUrl } };
}
