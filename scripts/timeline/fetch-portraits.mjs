// Optional asset refresh. Curricular text stays in source.json; only portraits
// and explicitly attributed lunar lifespans come from the public Ganjoor API.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = process.cwd();
const source = JSON.parse(await fs.readFile(path.join(root, "lib/literary-timeline/source.json"), "utf8"));
const poets = await fetch("https://api.ganjoor.net/api/ganjoor/poets", { signal: AbortSignal.timeout(20000) }).then(r => r.json());
const mapping = {
  "حنظله بادغیسی": 200, "رودکی": 12, "فردوسی": 4, "عنصری": 62, "فرخی سیستانی": 15,
  "منوچهری": 14, "شهید بلخی": 207, "کسایی مروزی": 45, "ناصرخسرو": 13, "قطران": 142,
  "دقیقی": 112, "ابوعلی بلعمی": 217, "کیکاووس": 82, "سنایی": 10, "انوری": 18,
  "خاقانی": 16, "نظامی": 6, "جمال‌الدین عبدالرزاق اصفهانی": 107, "عطار": 9, "مولوی": 5,
  "خواجه عبدالله انصاری": 72, "ابوالفضل میبدی": 60, "ابوالمعالی نصرالله منشی": 49,
  "کمال‌الدین اسماعیل": 67, "سعدی": 7, "فخرالدین عراقی": 21, "نجم‌الدین رازی (نجم دایه)": 102,
  "خواجوی کرمانی": 20, "ابن یمین": 106, "حافظ": 2, "سلمان ساوجی": 40, "عبید زاکانی": 33,
  "جامی": 24, "شاه نعمت‌الله ولی": 51, "امیرعلیشیر نوایی": 151, "سیف فرغانی": 31,
  "بابافغانی شیرازی": 115, "وحشی بافقی": 11, "محتشم کاشانی": 29, "کلیم کاشانی": 100,
  "صائب تبریزی": 22, "بیدل دهلوی": 43, "شیخ بهایی": 30, "وحید قزوینی": 165, "عرفی شیرازی": 46,
  "مشتاق اصفهانی": 154, "هاتف اصفهانی": 25, "قاآنی شیرازی": 44, "نشاط اصفهانی": 149,
  "فروغی بسطامی": 32, "ملک‌الشعرا بهار": 27, "ادیب‌الممالک فراهانی": 147, "ایرج میرزا": 88,
  "عارف قزوینی": 68, "فرخی یزدی": 134, "میرزاده عشقی": 153, "قائم‌مقام فراهانی": 98,
  "میرزا آقاخان کرمانی": 139, "پروین اعتصامی": 8, "محمدحسین شهریار": 35,
};
const folder = path.join(root, "public/literary-timeline/portraits");
await fs.mkdir(folder, { recursive: true });
const metadata = JSON.parse(await fs.readFile(path.join(root, "lib/literary-timeline/portraits.json"), "utf8"));
const fa = n => n.toLocaleString("fa-IR", { useGrouping: false });
const queue = source.people.filter(p => mapping[p.name]);
let position = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (position < queue.length) {
    const person = queue[position++];
    const poet = poets.find(p => p.id === mapping[person.name]);
    if (!poet?.imageUrl) continue;
    try {
      const response = await fetch(new URL(poet.imageUrl, "https://api.ganjoor.net"), { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const info = await sharp(bytes).metadata();
      // A tiny generic placeholder is not a portrait.
      if (info.width < 50 || info.height < 50) continue;
      await sharp(bytes).resize(480, 600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toFile(path.join(folder, `${person.id}.webp`));
      const item = { image: `/literary-timeline/portraits/${person.id}.webp`, source: `https://ganjoor.net${poet.fullUrl}`, sourceName: "گنجور" };
      if (poet.birthYearInLHijri > 0 && poet.deathYearInLHijri >= poet.birthYearInLHijri) {
        const birth = Math.ceil(poet.birthYearInLHijri / 100), death = Math.ceil(poet.deathYearInLHijri / 100);
        const exact = poet.validBirthDate && poet.validDeathDate;
        item.century = (exact ? "" : "حدود ") + (birth === death ? `قرن ${fa(birth)} هجری قمری` : `قرن‌های ${fa(birth)} تا ${fa(death)} هجری قمری`);
        item.dates = `${exact ? "" : "تقریبی؛ "}${fa(poet.birthYearInLHijri)} تا ${fa(poet.deathYearInLHijri)} هجری قمری`;
      }
      metadata[person.id] = item;
    } catch (error) { console.error(person.name, error.message); }
  }
}));
await fs.writeFile(path.join(root, "lib/literary-timeline/portraits.json"), JSON.stringify(metadata, null, 2) + "\n");
console.log(`Saved ${Object.keys(metadata).length} attributed portraits.`);
