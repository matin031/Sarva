import { hasAudioFor } from "@/lib/audioManifest";
import { normalizeFoot } from "@/lib/kimia/catalog";
import { arkFromAudioUrl } from "@/lib/kimia/pool";

/**
 * وزنِ یک سؤالِ عروضِ سماعی — منطقِ خالص، بدونِ دیتابیس.
 *
 * هر چهار نوعِ سؤال وزن را جایی دارند، فقط جایش فرق می‌کند:
 *
 *   • `weight-to-audio` → متنِ سؤال (`poem[0]`) خودِ ارکان است.
 *   • `audio-to-weight` → برچسبِ گزینهٔ درست.
 *   • `audio-to-poem`   → نامِ فایلِ صوتیِ خودِ سؤال.
 *   • `poem-to-audio`   → نامِ فایلِ صوتیِ گزینهٔ درست.
 *
 * ⚠️ دو نوعِ آخر تا پیش از این «بی‌وزن» شمرده می‌شدند، در حالی که همهٔ
 * بانکِ seed از همین دو نوع است. نامِ فایل (`/audio/مفاعیلن-مفاعیلن-فعولن.mp3`)
 * همان قراردادی است که «کیمیای وزن» هم رویش کار می‌کند (`lib/kimia/pool.ts`).
 *
 * ⚠️ و فقط وقتی پذیرفته می‌شود که همان ارکان در `AVAILABLE_AUDIO_ARKAN` باشد.
 * مدیر می‌تواند هر صدایی آپلود کند؛ نامِ فایلِ دلخواه (`/uploads/x1.mp3`) وزن
 * نیست و `null` می‌گیرد، نه یک سطلِ بی‌معنی.
 */

export type QuizWeightSource = {
  type: string | null;
  /** `questions.poem` — در MariaDB رشتهٔ JSON برمی‌گردد و در MySQL آرایه. */
  poem: unknown;
  audioUrl: string | null;
  correctLabel: string | null;
  correctAudioUrl: string | null;
};

function firstLine(poem: unknown): string | null {
  let raw = poem;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return Array.isArray(raw) && typeof raw[0] === "string" ? raw[0] : null;
}

function clean(text: string | null): string | null {
  const t = text ? normalizeFoot(text) : "";
  return t.length > 0 ? t : null;
}

function fromAudio(url: string | null): string | null {
  const ark = arkFromAudioUrl(url);
  return ark && hasAudioFor(ark) ? ark : null;
}

export function quizQuestionWeight(q: QuizWeightSource): string | null {
  switch (q.type) {
    case "weight-to-audio":
      return clean(firstLine(q.poem));
    case "audio-to-weight":
      return clean(q.correctLabel);
    case "audio-to-poem":
      return fromAudio(q.audioUrl);
    case "poem-to-audio":
      return fromAudio(q.correctAudioUrl);
    default:
      return null;
  }
}
