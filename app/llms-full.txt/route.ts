import { buildLlmsFullTxt } from "@/lib/seo/llms";
import { readBrandProfile } from "@/lib/seo/settings";
import { isNoindexEnvironment } from "@/lib/seo/site";

/** `/llms-full.txt` — همان نقشه، با معرفی و مفهومِ هر درس. lib/seo/llms.ts */
export const revalidate = 3600;

export async function GET() {
  if (isNoindexEnvironment()) return new Response("Not found", { status: 404 });

  const body = await buildLlmsFullTxt(await readBrandProfile());
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "noindex",
    },
  });
}
