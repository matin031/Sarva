import fs from "node:fs/promises";

const filename = "lib/literary-timeline/portraits.json";
const portraits = JSON.parse(await fs.readFile(filename, "utf8"));
const entries = Object.entries(portraits).filter(([, item]) => item.image && item.imageSource?.startsWith("https://commons.wikimedia.org/wiki/File:"));
const clean = value => (value || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
for (let i = 0; i < entries.length; i += 20) {
  const batch = entries.slice(i, i + 20);
  const titles = batch.map(([, item]) => decodeURIComponent(new URL(item.imageSource).pathname.split("/wiki/")[1]));
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", redirects: "1", prop: "imageinfo", iiprop: "extmetadata", iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|AttributionRequired", titles: titles.join("|") });
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Image credits: HTTP ${response.status}`);
  const data = await response.json();
  for (let n = 0; n < batch.length; n++) {
    let title = titles[n];
    for (const item of [...(data.query.normalized || []), ...(data.query.redirects || [])]) if (item.from === title) title = item.to;
    const page = data.query.pages.find(page => page.title === title);
    const meta = page?.imageinfo?.[0]?.extmetadata;
    if (!meta) continue;
    const [id] = batch[n];
    const artist = clean(meta.Artist?.value);
    portraits[id].artist = /Unknown author|no idea|author is dead/i.test(artist) ? "نامشخص" : artist;
    portraits[id].license = clean(meta.LicenseShortName?.value);
    const licenseUrl = meta.LicenseUrl?.value;
    if (licenseUrl && /^https?:\/\//.test(licenseUrl)) portraits[id].licenseUrl = licenseUrl;
  }
}
await fs.writeFile(filename, JSON.stringify(portraits, null, 2) + "\n");
console.log(`Credits saved for ${Object.values(portraits).filter(p => p.license).length} images.`);
