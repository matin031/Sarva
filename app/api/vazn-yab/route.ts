import { crossSiteRejection, fail, isCrossSiteRequest, ok, readJson, requestMeta } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { meterLookupSchema } from "@/lib/aruz/input";
import { findGanjoorMeter } from "@/lib/ganjoor";

export const runtime = "nodejs";

export const POST = withRoute("/api/vazn-yab", async request => {
  if (isCrossSiteRequest(request)) return crossSiteRejection();
  const { ip } = requestMeta(request);
  const limit = rateLimit(`meter-lookup:${ip ?? "unknown"}`, 30, 60);
  if (!limit.allowed) {
    const response = fail("درخواست‌های زیاد؛ کمی بعد دوباره تلاش کنید.", 429);
    response.headers.set("retry-after", String(limit.retryAfterSeconds));
    return response;
  }
  const body = await readJson(request, meterLookupSchema, 4096);
  if (!body.ok) return body.response;
  const { poem1, poem2, poemId } = body.data;
  return ok(await findGanjoorMeter(poem1, poem2, { poemId }));
});
