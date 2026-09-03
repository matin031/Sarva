/** خواندنِ سقف‌دارِ بدنه — جدا از lib/api/http.ts چون آن فایل
 *  `server-only` را import می‌کند و بیرون از باندل Next بار نمی‌شود؛
 *  این منطق باید در تستِ خام نود هم اجرا شود.
 */

/**
 * سقفِ پیش‌فرضِ بدنهٔ JSON.
 *
 * ۱۶ کیلوبایت برای هر چیزی که این پروژه از مرورگر می‌گیرد فراوان است:
 * بزرگ‌ترین بدنهٔ واقعی، یک دورِ کوییز با ۲۰۰ پاسخ است که حدود ۲۰ کیلوبایت
 * می‌شود — و همان یکی سقفِ خودش را جدا می‌گیرد.
 */
export const DEFAULT_MAX_JSON_BYTES = 16 * 1024;

/**
 * بدنه را با سقف می‌خواند.
 *
 * ⚠️ چرا نه `request.json()`:
 *
 * آن تابع کلِ بدنه را بی‌قید در حافظه می‌ریزد و بعد parse می‌کند. یعنی یک
 * درخواستِ POST با بدنهٔ چندصد مگابایتی — که ساختنش یک خط curl است — پیش از
 * آنکه هیچ اعتبارسنجی‌ای اجرا شود، همان‌قدر RAM از فرایند می‌گیرد. با چند
 * درخواست هم‌زمان، کانتینر OOM می‌شود.
 *
 * اینجا دو سد هست، و دومی مهم‌تر است:
 *
 *   ۱) `Content-Length` اگر باشد و از سقف بیشتر باشد، بدنه اصلاً خوانده
 *      نمی‌شود.
 *   ۲) ولی این هدر اختیاری است: با `Transfer-Encoding: chunked` اصلاً
 *      نمی‌آید، و اگر بیاید هم می‌تواند دروغ باشد. پس بدنه تکه‌تکه خوانده و
 *      بایت‌ها شمرده می‌شوند؛ به‌محض عبور از سقف، جریان لغو می‌شود و بقیه
 *      هرگز خوانده نمی‌شود.
 *
 * `null` یعنی «از سقف رد شد».
 */
export async function readCappedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  const body = request.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      // بقیهٔ بدنه هرگز خوانده نمی‌شود.
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(buf);
}
