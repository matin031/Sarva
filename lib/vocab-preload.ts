/** Image preloading for واژه‌یاب.
 *
 *  Every picture is served through `/api/vocab-image`, which watermarks on the
 *  fly — so each request costs the server real work. That rules out firing a
 *  whole run's worth of images at once, and it is why concurrency is capped.
 *
 *  The strategy the game uses:
 *    1. a warm-up batch before the first question, so play starts on a picture
 *       that is already decoded;
 *    2. a rolling prefetch of the next few questions during play;
 *    3. a per-question guard, so a slow picture costs a spinner rather than a
 *       broken round.
 *
 *  Results are cached per URL for the lifetime of the tab, so warm-up and
 *  rolling prefetch never fetch the same picture twice. */

const inflight = new Map<string, Promise<boolean>>();
const succeeded = new Set<string>();
const failed = new Set<string>();

/** How many pictures may be in flight at once. Low on purpose: the watermark
 *  proxy is doing per-request image work. */
const CONCURRENCY = 4;

/** Attempts per picture, including the first. */
const ATTEMPTS = 3;

function load(url: string, attemptsLeft: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    img.onload = () => done(true);
    img.onerror = () => {
      if (attemptsLeft > 1) {
        // linear backoff: a transient failure is usually over within a moment,
        // and we do not want a retry storm against the proxy
        const delay = (ATTEMPTS - attemptsLeft + 1) * 400;
        window.setTimeout(() => {
          load(url, attemptsLeft - 1).then(done);
        }, delay);
        return;
      }
      done(false);
    };
    img.decoding = "async";
    img.src = url;
  });
}

/** Warm one picture. Repeat calls for the same URL share one request. */
export function preloadImage(url: string): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (succeeded.has(url)) return Promise.resolve(true);
  if (failed.has(url)) return Promise.resolve(false);
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = load(url, ATTEMPTS).then((ok) => {
    inflight.delete(url);
    (ok ? succeeded : failed).add(url);
    return ok;
  });
  inflight.set(url, p);
  return p;
}

/** Already decoded and known good — a synchronous check the render path can use
 *  to decide between the picture and a spinner. */
export function isPreloaded(url: string): boolean {
  return succeeded.has(url);
}

/** Tried the full retry budget and never arrived. */
export function hasFailed(url: string): boolean {
  return failed.has(url);
}

/** Forget a failure so the reader can ask for another try. */
export function resetFailure(url: string): void {
  failed.delete(url);
}

/** Warm a list of pictures with capped concurrency, reporting progress as each
 *  one settles. Resolves with which URLs made it. */
export async function preloadBatch(
  urls: string[],
  opts: {
    onProgress?: (done: number, total: number) => void;
    cancelled?: () => boolean;
  } = {},
): Promise<{ ok: string[]; bad: string[] }> {
  const unique = [...new Set(urls.filter(Boolean))];
  const total = unique.length;
  const ok: string[] = [];
  const bad: string[] = [];
  let settled = 0;
  let cursor = 0;

  opts.onProgress?.(0, total);

  const worker = async () => {
    while (cursor < unique.length) {
      if (opts.cancelled?.()) return;
      const url = unique[cursor++];
      const good = await preloadImage(url);
      (good ? ok : bad).push(url);
      settled++;
      opts.onProgress?.(settled, total);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, worker),
  );
  return { ok, bad };
}
