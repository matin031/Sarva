// Supplement verified identities with Wikipedia page images, retaining attribution.
// Tombs, group scenes and unrelated page thumbnails are deliberately excluded.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { setTimeout as pause } from "node:timers/promises";
const root = process.cwd();
const source = JSON.parse(await fs.readFile("lib/literary-timeline/source.json", "utf8"));
const metadata = JSON.parse(await fs.readFile("lib/literary-timeline/portraits.json", "utf8"));
const aliases = {
  "سیدعلی موسوی گرمارودی": "علی موسوی گرمارودی", "سیدحسن حسینی": "سید حسن حسینی",
  "سید محمدعلی جمالزاده": "محمدعلی جمال‌زاده", "محمدرضا سرشار (رضا رهگذر)": "محمدرضا سرشار",
  "سید اشرف‌الدین گیلانی (نسیم شمال)": "سید اشرف‌الدین حسینی",
  "خواجه رشیدالدین فضل‌الله همدانی": "رشیدالدین فضل‌الله همدانی",
  "عزیزالدین بن محمد نسفی": "عزیزالدین نسفی", "صبای کاشانی": "فتحعلی‌خان صبا",
  "میرزا یوسف‌خان اعتصامی آشتیانی": "یوسف اعتصامی",
};
const fa = n => n.toLocaleString("fa-IR", { useGrouping: false });
const integer = text => Number(text.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))));
const queue = source.people.filter(person => !metadata[person.id] || metadata[person.id].sourceName === "ویکی‌پدیا");
const images = [];
for (let i = 0; i < queue.length; i += 20) {
  const group = queue.slice(i, i + 20);
  const url = new URL("https://fa.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "pageimages|extracts", piprop: "thumbnail|name", pithumbsize: "600", exintro: "1", explaintext: "1", redirects: "1", titles: group.map(p => aliases[p.name] || p.name).join("|") });
  const data = await fetch(url, { signal: AbortSignal.timeout(20000) }).then(r => r.json());
  for (const person of group) {
    let title = aliases[person.name] || person.name;
    for (const mapping of [...(data.query.normalized || []), ...(data.query.redirects || [])]) {
      if (mapping.from === title) title = mapping.to;
    }
    const page = data.query.pages.find(page => page.title === title && !page.missing);
    if (!page?.extract) continue;
    const item = { source: `https://fa.wikipedia.org/wiki/${encodeURIComponent(page.title)}`, sourceName: "ویکی‌پدیا" };
    // Only reviewed contemporary profiles use solar years; no calendar guessing
    // for older figures whose introductions often mix three calendars.
    if (person.entries.some(e => ["modern", "revolution"].includes(e.era))) {
      const dateParenthesis = page.extract.match(/\([^()]*۱[۲۳۴][۰-۹]{2}[^()]*\)/)?.[0];
      const years = dateParenthesis && !/قمری|ه[‍.\s]*ق|میلادی/.test(dateParenthesis) ? (dateParenthesis.match(/۱[۲۳۴][۰-۹]{2}/g) || []).map(integer) : [];
      if (years.length === 2 && years[1] >= years[0] && years[1] - years[0] < 120) {
        const first = Math.ceil(years[0] / 100), last = Math.ceil(years[1] / 100);
        item.century = first === last ? `قرن ${fa(first)} هجری شمسی` : `قرن‌های ${fa(first)} و ${fa(last)} هجری شمسی`;
        item.dates = `${fa(years[0])} تا ${fa(years[1])} هجری شمسی`;
      } else if (years.length === 1) {
        item.century = `متولد قرن ${fa(Math.ceil(years[0] / 100))} هجری شمسی`;
        item.dates = `زادهٔ ${fa(years[0])} هجری شمسی`;
      }
    }
    metadata[person.id] = { ...metadata[person.id], ...item };
    if (page.thumbnail && !/tomb|mausoleum|dargah|slavery|presentation_of|آرامگاه/i.test(page.pageimage)) {
      const mediaWiki = page.thumbnail.source.includes("/wikipedia/fa/") ? "fa.wikipedia.org" : "commons.wikimedia.org";
      item.imageSource = `https://${mediaWiki}/wiki/File:${encodeURIComponent(page.pageimage)}`;
      images.push({ person, page, item });
    }
  }
}
let cursor = 0;
let rateLimited = false;
await Promise.all(Array.from({ length: 1 }, async () => {
  while (cursor < images.length) {
    const { person, page, item } = images[cursor++];
    if (metadata[person.id]?.image || rateLimited) continue;
    try {
      await pause(1500);
      let response = await fetch(page.thumbnail.source, { signal: AbortSignal.timeout(20000) });
      for (let attempt = 0; response.status === 429 && attempt < 2; attempt++) {
        const retrySeconds = Number(response.headers.get("retry-after"));
        if (!Number.isFinite(retrySeconds) || retrySeconds <= 0 || retrySeconds > 10) break;
        await pause((retrySeconds + 1) * 1000);
        response = await fetch(page.thumbnail.source, { signal: AbortSignal.timeout(20000) });
      }
      if (response.status === 429) {
        rateLimited = true;
        console.error(`Wikimedia rate limit; retry after ${response.headers.get("retry-after") || "the specified delay"} seconds. Existing images preserved.`);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await sharp(Buffer.from(await response.arrayBuffer())).resize(600, 720, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(root, `public/literary-timeline/portraits/${person.id}.webp`));
      metadata[person.id] = { ...metadata[person.id], ...item, image: `/literary-timeline/portraits/${person.id}.webp` };
    } catch (error) { console.error(person.name, error.message); }
  }
}));
await fs.writeFile("lib/literary-timeline/portraits.json", JSON.stringify(metadata, null, 2) + "\n");
console.log(`Total portraits: ${Object.values(metadata).filter(item => item.image).length}`);
