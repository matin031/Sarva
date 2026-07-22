/** URL of a vocab image served through the watermarking proxy. Everything a
 *  student sees should go through this so the file they can download already
 *  carries the سروا watermark. Empty/placeholder values pass through unchanged;
 *  the admin panel keeps using the raw URL so editors see their originals. */
export function vocabImageUrl(src: string): string {
  if (!src || src.startsWith("/api/vocab-image")) return src;
  return `/api/vocab-image?src=${encodeURIComponent(src)}`;
}
