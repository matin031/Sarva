import { ARKAN, FAM_PAT, METERS } from "@/lib/aruz/meters";
import type { ParsedUnit } from "./units";

/**
 * پیشنهادِ تقطیع برای پنلِ مدیر — نه برای بازی.
 *
 * ⚠️ قاعدهٔ types.ts سر جایش است: بازی خودش تقطیع نمی‌کند و فقط واحدهای
 * ذخیره‌شده را اجرا می‌کند. این ماژول فقط به مدیر یک *پیش‌نویس* می‌دهد که
 * می‌بیند، اصلاح می‌کند و بعد ذخیره می‌کند.
 *
 * ورودی متنِ اعراب‌دار است و خروجی هجاهای «شنیده‌شده»، نه نوشته‌شده:
 *
 *   «بوده است» → بو (بلند) دَس (بلند) ت (کوتاه)       — میانِ مصراع
 *   «دل اگر»   → دِ لَ گَر                              — حذفِ همزه
 *   «جان من»   → جان (بلند)، نه جا+ن                    — نونِ پس از مصوتِ بلند
 *   «دست» میانِ مصراع → دَس (بلند) + ت (کوتاه)          — هجای کشیده
 *   هجای آخرِ مصراع همیشه بلند است.
 *
 * قراردادِ اعراب (همان که در داده‌ها رعایت شده):
 *   حرفِ بی‌حرکت ساکن است · «کِه، خانِه» هِ ناملفوظ · «تُو، چُو، دُو» اُی کوتاه
 *   · «دَولت، نَو، مَی» مصوتِ مرکب · کسرهٔ اضافه همیشه نوشته می‌شود
 *   · «ی» و «و»ی بی‌حرکت پس از حرفِ ساکن مصوتِ بلندند.
 *
 * هر جا زبان دو خوانش مجاز می‌داند (حذف یا نگه‌داشتنِ همزه، کوتاه یا بلندِ
 * «و» و مصوتِ پایانی، تشدید)، هر دو امتحان می‌شود و وزن داوری می‌کند؛
 * خوانشی که کمترین اختیار را به کار ببرد برنده است.
 */

const FATHA = "\u064E";
const DAMMA = "\u064F";
const KASRA = "\u0650";
const SHADDA = "\u0651";
const SUKUN = "\u0652";
const TANWIN = "\u064B";
const HAMZA_ABOVE = "\u0654";
const DAGGER_ALEF = "\u0670";
const SHORT_MARKS = new Set([FATHA, DAMMA, KASRA]);
const MARKS = /[\u064B-\u0655\u0670]/;
const GLOTTAL = new Set(["ع", "ء", "ئ", "أ", "ؤ", "إ"]);
const LETTER = /[ء-يپچژکگیآ]/;

/** یک واج. `s` همان چیزی است که در متنِ هجا دیده می‌شود. */
type Ph = {
  k: "C" | "v" | "V";
  s: string;
  /** همزهٔ آغازِ واژه که می‌تواند حذف شود. */
  hamza?: boolean;
  /** نمایشِ مصوت وقتی همزه‌اش حذف شده: «آن» → «ان». */
  el?: string;
  /** «ه»ی ناملفوظ؛ فقط وقتی هجا همین‌جا تمام شود نوشته می‌شود. */
  tail?: string;
  /** نیمهٔ دومِ تشدید. */
  sh?: boolean;
  /** این واج با اختیارِ شاعری عوض شده (بلند/کوتاه، «و»، تشدید). */
  lic?: boolean;
};

type Word = { text: string; ph: Ph[]; conj: boolean };

type Grapheme = { b: string; m: string[] };

function graphemes(w: string): Grapheme[] {
  const out: Grapheme[] = [];
  for (const ch of w) {
    if (MARKS.test(ch)) {
      if (out.length) out[out.length - 1].m.push(ch);
    } else {
      out.push({ b: ch, m: [] });
    }
  }
  return out;
}

const vowelMark = (g?: Grapheme) => g?.m.find((c) => SHORT_MARKS.has(c)) ?? "";

function wordPhones(w: string): Ph[] {
  const G = graphemes(w);
  const out: Ph[] = [];
  const last = () => out[out.length - 1];

  for (let i = 0; i < G.length; i++) {
    const { b, m } = G[i];
    const mark = vowelMark(G[i]);
    const shadda = m.includes(SHADDA);
    const sukun = m.includes(SUKUN);
    const first = i === 0;
    const end = i === G.length - 1;
    const next = G[i + 1];

    const cons = (s: string = b) => {
      out.push({ k: "C", s });
      if (shadda) out.push({ k: "C", s, sh: true });
      if (mark) out.push({ k: "v", s: mark });
      if (m.includes(DAGGER_ALEF)) out.push({ k: "V", s: DAGGER_ALEF });
    };

    if (b === "آ") {
      out.push({ k: "C", s: "", hamza: true });
      out.push({ k: "V", s: "آ", el: "ا" });
    } else if (b === "ا") {
      if (m.includes(TANWIN)) {
        out.push({ k: "v", s: "اً" }, { k: "C", s: "" });
      } else if (first) {
        out.push({ k: "C", s: "", hamza: true });
        const n = next && !vowelMark(next) && !next.m.includes(SHADDA) ? next.b : "";
        if (mark) out.push({ k: "v", s: "ا" + mark, el: mark });
        else if (n === "ی" || n === "و") {
          out.push({ k: "V", s: "ا" + n, el: n });
          i++;
        } else out.push({ k: "v", s: "ا" + FATHA, el: FATHA }); // «از» → اَز
      } else if (mark) cons("ا");
      else if (last()?.k === "v" && last().s === FATHA) out[out.length - 1] = { k: "V", s: "ا" }; // رَا → را
      else out.push({ k: "V", s: "ا" });
    } else if (b === "و") {
      const p = last();
      const beforeA = next?.b === "ا" || next?.b === "آ";
      // واوِ معدوله: خواب، خویش — ولی «خوی» (خو+ی) نه.
      const madule =
        G[i - 1]?.b === "خ" &&
        !vowelMark(G[i - 1]) &&
        (next?.b === "ا" || (next?.b === "ی" && G[i + 2] !== undefined && !/[اوی]/.test(G[i + 2].b)));
      if (mark || shadda || first) cons();
      else if (sukun) out.push({ k: "C", s: "و" });
      else if (madule) p.s += "و";
      else if (p?.k === "v" && p.s === DAMMA) p.s += "و"; // تُو، چُو
      else if (p?.k === "C" && !beforeA && !G[i - 1].m.includes(SUKUN)) out.push({ k: "V", s: "و" }); // دَرْویش: پس از ساکنِ صریح، صامت
      else out.push({ k: "C", s: "و" }); // نَتوان، آواز، دَولَت
    } else if (b === "ی") {
      const p = last();
      const beforeA = next?.b === "ا" || next?.b === "آ";
      const beforeVowel = beforeA || next?.b === "و" || next?.b === "ی";
      if (m.includes(DAGGER_ALEF)) {
        out.push({ k: "V", s: "یٰ" }); // اَولیٰ: الفِ مقصوره
      } else if (end && mark === KASRA && !shadda && p?.k === "C") {
        // «شیرینیِ، صوفیِ»: یای پایانی مصوتِ «ای» است و کسرهٔ اضافه با «یِ» می‌آید.
        out.push({ k: "V", s: "ی" }, { k: "C", s: "ی" }, { k: "v", s: KASRA });
      } else if (mark || shadda || first || sukun) cons();
      else if (p?.k === "v" && p.s === KASRA && !beforeVowel) {
        // نِیک → نیک؛ «اِی» آغازی همزه‌اش را نگه می‌دارد
        out[out.length - 1] = p.el !== undefined ? { k: "V", s: p.s + "ی", el: "ی" } : { k: "V", s: "ی" };
      } else if (p?.k === "C" && !beforeA && !G[i - 1].m.includes(SUKUN) && (next?.b !== "ی" || vowelMark(next) !== "")) out.push({ k: "V", s: "ی" }); // تَأیید: یِ دوم مصوت است
      else if (end && p?.k === "V" && p.s.endsWith("ی")) out.push({ k: "C", s: "" }, { k: "V", s: "ی" }); // وادیی
      else out.push({ k: "C", s: "ی" }); // مِیان، اِحیا، پای
    } else if (b === "ه") {
      const p = last();
      if (m.includes(HAMZA_ABOVE)) {
        // «خانهٔ»: هِ ناملفوظ + «یِ» اضافه
        if (p?.k === "v") p.tail = "ه";
        else out.push({ k: "v", s: "", tail: "ه" });
        out.push({ k: "C", s: "ی" }, { k: "v", s: KASRA });
      } else if (mark || shadda || sukun || !end) cons();
      else if (p?.k === "v" && p.s === KASRA) p.tail = "ه";
      else if (p?.k === "C") out.push({ k: "v", s: "", tail: "ه" });
      else cons();
    } else if (GLOTTAL.has(b) || LETTER.test(b)) {
      cons();
    }
  }
  return out;
}

/** «الله» را هیچ قاعدهٔ املاییِ فارسی درست نمی‌خواند: اَل‌لاه. */
const ALLAH = /^[اَ]*لل[\u0651\u0670]*ه$/;
const allah = (): Ph[] => [
  { k: "C", s: "", hamza: true },
  { k: "v", s: "اَ", el: FATHA },
  { k: "C", s: "ل" },
  { k: "C", s: "ل" },
  { k: "V", s: "ا" },
  { k: "C", s: "ه" },
];

/** «نَه» هِ ناملفوظ دارد، هرچند فتحه‌دار است؛ «شَه» و «رَه» هِ ملفوظ. */
const NA = "ن" + FATHA + "ه";
const na = (): Ph[] => [
  { k: "C", s: "ن" },
  { k: "v", s: FATHA, tail: "ه" },
];

/** «کاین» و «کاو» (کِه + این/او) یک هجا خوانده می‌شوند: کین، کو. */
const KE: Record<string, () => Ph[]> = {
  کاین: () => [
    { k: "C", s: "کا" },
    { k: "V", s: "ی" },
    { k: "C", s: "ن" },
  ],
  کاو: () => [
    { k: "C", s: "کا" },
    { k: "V", s: "و" },
  ],
};

const PUNCT = /[^\u0600-\u06FF\u200C\s]/g;

function words(text: string): Word[] {
  const clean = text
    .normalize("NFC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "هٔ")
    .replace(/ـ/g, "")
    .replace(/[،؛؟«»]/g, " ")
    .replace(PUNCT, " ");
  // «دَرآیَد، دَراُفتاد» مثلِ «دَر آیَد، دَر اُفتاد»: همزهٔ میانی هم حذف‌شدنی است.
  return clean
    .replace(/(?<=\S)(آ|ا[\u064E-\u0650])/g, " $1")
    .split(/[\s\u200C]+/)
    .filter(Boolean)
    .map((w) => ({ text: w, ph: w === "و" ? [] : ALLAH.test(w) ? allah() : w === NA ? na() : (KE[w]?.() ?? wordPhones(w)), conj: w === "و" }))
    .filter((w) => w.conj || w.ph.length > 0);
}

// ───────────────────────── هجابندی ─────────────────────────

type Unit = ParsedUnit;

function unitText(ph: Ph[]): string {
  return ph.map((p, i) => p.s + (p.tail && i === ph.length - 1 ? p.tail : "")).join("");
}

/** توالیِ واج → واحدهای بازی. هجای آخر همیشه بلند و یک‌تکه است. */
function syllabify(ph: Ph[], keepN: boolean): Unit[] {
  const unit = (part: Ph[], length: Unit["length"], lic = part.some((p) => p.lic)): Unit =>
    lic ? { display: unitText(part), length, license: "length" } : { display: unitText(part), length };
  const vowels: number[] = [];
  ph.forEach((p, i) => p.k !== "C" && vowels.push(i));
  if (vowels.length === 0) return [];

  const starts = vowels.map((v) => (v > 0 && ph[v - 1].k === "C" ? v - 1 : v));
  starts[0] = 0;
  const units: Unit[] = [];

  starts.forEach((start, n) => {
    const end = n + 1 < starts.length ? starts[n + 1] : ph.length;
    const v = vowels[n];
    const body = ph.slice(start, end);
    const vi = v - start;
    const coda = body.slice(vi + 1);
    // نونِ ساکن پس از مصوتِ بلند در تقطیع به حساب نمی‌آید: «جان» بلند است، نه کشیده.
    let muted = 0;
    if (!keepN && ph[v].k === "V" && coda[0]?.s === "ن") muted = 1;
    const counted = coda.length - muted;
    const isLast = n === starts.length - 1;

    if (isLast) {
      units.push(unit(body, "long"));
      return;
    }
    const long = ph[v].k === "V";
    if (!long && counted === 0) units.push(unit(body, "short"));
    else if ((!long && counted === 1) || (long && counted === 0)) {
      units.push(unit(body, "long"));
    } else {
      // هجای کشیده = یک بلند + یک کوتاه، و کوتاه همیشه صامتِ آخر است:
      // «دَست» → «دَس» + «ت»، «کار» → «کا» + «ر»، «دوست» → «دوس» + «ت».
      const cut = body.length - 1;
      // «ن»ی پس از مصوتِ بلند که خوانده شده، خودش هجای کوتاهِ اختیاری است.
      const nKept = keepN && long && coda[0]?.s === "ن";
      units.push(unit(body.slice(0, cut), "long"));
      units.push(unit(body.slice(cut), "short", nKept || body.slice(cut).some((p) => p.lic)));
    }
  });
  return units;
}

// ───────────────────────── خوانش‌ها ─────────────────────────

type Reading = { ph: Ph[]; pen: number; notes: string[]; keepN: boolean };

const P = {
  lengthen: 1,
  shorten: 1,
  shortenBeforeEzafe: 1.2,
  keepHamza: 0.01,
  conjLong: 1,
  conjLongAfterVowel: 0.5,
  conjApart: 2,
  dropVowel: 1.2,
  contract: 0.3,
  shaddaDrop: 1.5,
  ainDrop: 1.5,
  keepN: 2,
};
/** سقف‌های پیاپیِ جست‌وجو: اول خوانش‌های بی‌اختیار، بعد کم‌کم پرهزینه‌ترها. */
const BUDGETS = [0, 1, 2, 3, 4.5, 6];

const isVowel = (p?: Ph) => p !== undefined && p.k !== "C";
const withoutHamza = (ph: Ph[]): Ph[] => {
  const [, v, ...rest] = ph;
  return [{ ...v, s: v.el ?? v.s }, ...rest];
};

/** همهٔ خوانش‌های مجاز با هزینهٔ حداکثر `budget`، ارزان‌ترین‌ها اول. */
function readings(ws: Word[], budget: number): Reading[] {
  const out: Reading[] = [];

  const go = (i: number, acc: Ph[], pen: number, notes: string[]) => {
    if (pen > budget) return;
    if (i === ws.length) {
      out.push({ ph: acc, pen, notes, keepN: false });
      if (pen + P.keepN <= budget && acc.some((p, j) => p.k === "V" && acc[j + 1]?.s === "ن")) {
        out.push({ ph: acc, pen: pen + P.keepN, notes: [...notes, "نون پس از مصوت بلند تلفظ شد"], keepN: true });
      }
      return;
    }
    const w = ws[i];
    const prev = acc[acc.length - 1];
    const isLastWord = i === ws.length - 1;

    // هر ادامه‌ای برای واژهٔ i، با همهٔ حالت‌های تشدید و مصوتِ پایانی‌اش.
    const emit = (base: Ph[], head: Ph[], p: number, n: string[]) => {
      for (const body of shaddaVariants(head)) {
        const extra = body.dropped ? P.shaddaDrop : 0;
        const nn = body.dropped ? [...n, `تخفیفِ تشدید در «${w.text}»`] : n;
        for (const v of ezafeVariants(body.ph)) {
          const all = [...base, ...v.ph];
          const p2 = p + extra + (v.short ? P.shortenBeforeEzafe : 0);
          const n2 = v.short ? [...nn, `کوتاه خواندنِ مصوتِ بلند پیش از کسرهٔ «${w.text}»`] : nn;
          go(i + 1, all, p2, n2);
          const tail = all[all.length - 1];
          if (!isLastWord && tail.k === "v" && !w.conj) {
            const longer = [...all.slice(0, -1), { ...tail, k: "V" as const, lic: true }];
            go(i + 1, longer, p2 + P.lengthen, [...n2, `بلند خواندنِ مصوتِ پایانیِ «${w.text}»`]);
          }
        }
      }
    };

    if (w.conj) {
      if (prev && prev.k === "C") {
        emit(acc, [{ k: "v", s: DAMMA }], pen, notes);
        go(i + 1, [...acc, { k: "V", s: "و", lic: true }], pen + P.conjLong, [...notes, "«و» بلند خوانده شد"]);
        // «چَپ و راست»: «و» گاهی به هجای پیش نمی‌چسبد و خودش هجای کوتاهی است.
        go(i + 1, [...acc, { k: "C", s: "و" }, { k: "v", s: DAMMA, lic: true }], pen + P.conjApart, [
          ...notes,
          "«و» جدا (بی‌وصل) خوانده شد",
        ]);
      } else {
        emit(acc, [{ k: "C", s: "و" }, { k: "v", s: DAMMA }], pen, notes);
        go(i + 1, [...acc, { k: "C", s: "" }, { k: "V", s: "و", lic: true }], pen + P.conjLongAfterVowel, [
          ...notes,
          "«و» بلند خوانده شد",
        ]);
        // «اَبرو و» → اَب رُ وُ: مصوتِ بلندِ پیش از «و» هم کوتاه‌شدنی است.
        if (prev?.k === "V") {
          const cut = [...acc.slice(0, -1), shortened(prev)];
          const n = [...notes, "کوتاه خواندنِ مصوتِ بلند پیش از «و»"];
          go(i + 1, [...cut, { k: "C", s: "و" }, { k: "v", s: DAMMA }], pen + P.shorten, n);
          go(i + 1, [...cut, { k: "C", s: "" }, { k: "V", s: "و", lic: true }], pen + P.shorten + P.conjLongAfterVowel, [
            ...n,
            "«و» بلند خوانده شد",
          ]);
        }
      }
      return;
    }

    // «قیامت‌ست» = قیامت + اَست: «ست»ی بی‌الف پس از صامت همان «اَست» است.
    if (w.text === "ست" && prev?.k === "C") {
      emit(acc, [{ k: "v", s: FATHA }, ...w.ph], pen, notes);
      return;
    }

    const startsHamza = w.ph[0]?.hamza === true;
    const startsAin = w.ph[0]?.s === "ع" && isVowel(w.ph[1]);

    // همزه‌ای که می‌تواند حذف شود و نشد، کمی گران‌تر است: وقتی هر دو خوانش با
    // وزن می‌خوانند («مَجنون اَست»)، خوانشِ روان‌تر (مَجنونَست) برنده باشد.
    emit(acc, w.ph, startsHamza && prev?.k === "C" ? pen + P.keepHamza : pen, notes);

    if (!prev || i === 0) return;

    if (startsHamza && prev.k === "C") {
      emit(acc, withoutHamza(w.ph), pen, [...notes, `حذفِ همزهٔ «${w.text}»`]);
    } else if (startsHamza && prev.k === "v") {
      // «بوده است» → «بودست»: مصوتِ پایانی و همزه با هم می‌روند.
      emit(acc.slice(0, -1), withoutHamza(w.ph), pen + P.dropVowel, [
        ...notes,
        `حذفِ مصوتِ پایانی و همزه پیش از «${w.text}»`,
      ]);
    } else if (startsHamza && prev.k === "V") {
      if (/^اَ?ست$/.test(w.text)) {
        // «کجا است» → «کجاست»
        emit(acc, w.ph.slice(2), pen + P.contract, [...notes, `ادغامِ «${w.text}»`]);
      }
      // مصوتِ بلندِ پایانی پیش از مصوت کوتاه می‌شود: «دِهی از» → دِ هـِ اَز
      emit([...acc.slice(0, -1), shortened(prev)], w.ph, pen + P.shorten, [
        ...notes,
        `کوتاه خواندنِ مصوتِ بلند پیش از «${w.text}»`,
      ]);
    } else if (startsAin && prev.k === "C") {
      emit(acc, [{ ...w.ph[1], lic: true }, ...w.ph.slice(2)], pen + P.ainDrop, [...notes, `حذفِ «ع» در «${w.text}»`]);
    }
  };

  go(0, [], 0, []);
  return out.sort((a, b) => a.pen - b.pen);
}

/** مصوتِ بلندی که کوتاه خوانده شده، همان‌طور که شنیده می‌شود نوشته می‌شود: «فی» → «فِ». */
const SHORTENED: Record<string, string> = { ی: KASRA, و: DAMMA, ا: FATHA };
const shortened = (p: Ph): Ph => ({ ...p, k: "v", s: SHORTENED[p.s] ?? p.s, lic: true });

/** «صوفیِ ما» → صو فِ یِ ما: مصوتِ بلندِ پیش از «یِ»ی اضافه می‌تواند کوتاه شود. */
function ezafeVariants(ph: Ph[]): { ph: Ph[]; short: boolean }[] {
  const n = ph.length;
  const [a, b, c] = [ph[n - 3], ph[n - 2], ph[n - 1]];
  if (!a || a.k !== "V" || !/[یو]$/.test(a.s) || b.s !== "ی" || c.k !== "v" || c.s !== KASRA) {
    return [{ ph, short: false }];
  }
  return [
    { ph, short: false },
    { ph: [...ph.slice(0, n - 3), shortened(a), b, c], short: true },
  ];
}

function shaddaVariants(ph: Ph[]): { ph: Ph[]; dropped: boolean }[] {
  const at = ph.findIndex((p) => p.sh);
  if (at < 0) return [{ ph, dropped: false }];
  // هجای پیش از تشدید کوتاه می‌شود («اِل‌لا» → «اِ لا»)؛ اختیار روی همان است.
  let v = at - 1;
  while (v >= 0 && ph[v].k === "C") v--;
  return [
    { ph, dropped: false },
    { ph: ph.flatMap((p, i) => (i === at ? [] : i === v ? [{ ...p, lic: true }] : [p])), dropped: true },
  ];
}

// ───────────────────────── وزن ─────────────────────────

const SHORT = "U";
const LONG = "-";

function meterFeet(meter: string): string[] | null {
  // «فعولن فعولن فعولن فَعَل»: اعرابِ نامِ رکن معنایی ندارد.
  const feet = meter.replace(/[\u064B-\u0652]/g, "").trim().split(/\s+/).filter(Boolean);
  return feet.length > 0 && feet.every((f) => ARKAN[f]) ? feet : null;
}

/** «مفاعلن فعلاتن مفاعلن فعلن» → «U-U-UU--U-U-UU-». رکنِ ناشناخته = null. */
export function meterPattern(meter: string): string | null {
  return meterFeet(meter)?.map((f) => ARKAN[f]).join("") ?? null;
}

/** وزن‌هایی که مدیر از میانشان انتخاب می‌کند — پربسامدها اول. */
export const RAPID_METERS: { name: string; ark: string }[] = METERS.filter(
  (m) => m.freq >= 0.2,
).map((m) => ({ name: m.name, ark: m.ark }));

/** `lic`: جایگاه‌هایی (شمارهٔ هجا) که اختیارِ وزنی دارند. */
type Variant = { pen: number; notes: string[]; lic: number[] };

/* ۲۴ گونهٔ وزنِ رباعی (شجرهٔ اخرب و اخرم). همه وزنِ خودِ رباعی‌اند، نه
   اختیار؛ پس نه جریمه دارند و نه نشان. */
const RUBAI = "مفعول مفاعیل مفاعیل فعل";
const rubaiVariants = (): Map<string, Variant> => {
  const out = new Map<string, Variant>();
  for (const p of Object.keys(FAM_PAT["وزن رباعی"] ?? {})) out.set(p, { pen: 0, notes: [], lic: [] });
  for (const a of ["U--U", "U-U-"]) {
    for (const b of ["U--U", "U-U-"]) {
      for (const t of ["U-", "-"]) out.set("--U" + a + b + t, { pen: 0, notes: [], lic: [] });
    }
  }
  return out;
};

/**
 * گونه‌های مجازِ یک وزن (اختیاراتِ وزنی)، رکن به رکن.
 *
 * ⚠️ اختیار به رکن بسته است، نه به رشتهٔ الگو: «-UU-» در مجتث از مرزِ دو رکن
 * می‌گذرد و قلبش مجاز نیست؛ فقط «مفتعلن»ِ واقعی به «مفاعلن» می‌رود.
 * هجای آخر جدا بررسی نمی‌شود؛ همیشه بلند است.
 */
export function meterVariants(meter: string): Map<string, Variant> {
  const feet = meterFeet(meter);
  if (!feet) return new Map();
  if (feet.join(" ") === RUBAI) return rubaiVariants();

  const perFoot = feet.map((f, i) => {
    const base = ARKAN[f];
    // [الگو، جریمه، یادداشت، جایگاهِ اختیار در همین رکن]
    const opts: [string, number, string?, number?][] = [[base, 0]];
    const lastFoot = i === feet.length - 1;
    if (i === 0 && base === "UU--") opts.push(["-U--", 0.2, "فاعلاتن به‌جای فعلاتن در آغاز مصراع"]);
    if (f === "مفتعلن") opts.push(["U-U-", 0.6, "مفاعلن به‌جای مفتعلن"]);
    if (lastFoot && base === "UU-") opts.push(["--", 0.2, "فع‌لن به‌جای فعلن در پایان مصراع"]);
    else if (base.includes("UU")) {
      opts.push([base.replace("UU", "-"), 1.5, `یک بلند به‌جای دو کوتاه در «${f}»`, base.indexOf("UU")]);
    }
    if (i === 0 && feet.join(" ") === "مفاعیلن مفاعیلن فعولن") {
      opts.push(["----", 1, "هجای نخستِ مصراع بلند (اختیارِ دوبیتی)", 0]);
    }
    return opts;
  });

  let out = new Map<string, Variant>([["", { pen: 0, notes: [], lic: [] }]]);
  for (const opts of perFoot) {
    const next = new Map<string, Variant>();
    for (const [p, v] of out) {
      for (const [fp, pen, note, at] of opts) {
        const key = p + fp;
        const cand = {
          pen: v.pen + pen,
          notes: note ? [...v.notes, note] : v.notes,
          lic: at === undefined ? v.lic : [...v.lic, p.length + at],
        };
        if (!next.has(key) || next.get(key)!.pen > cand.pen) next.set(key, cand);
      }
    }
    out = next;
  }

  // تسکین در هزجِ اخرب: دو کوتاهِ مرزِ «مفاعیلُ مفاعیلُ» یک بلند می‌شود
  // (مفعولُ مفاعیلن مفعولُ …). تنها اختیاری که از مرزِ رکن می‌گذرد.
  if (feet[1] === "مفاعیل" && feet[2] === "مفاعیل") {
    const at = ARKAN[feet[0]].length + ARKAN[feet[1]].length - 1;
    for (const [p, v] of [...out]) {
      if (p.slice(at, at + 2) !== "UU") continue;
      const key = p.slice(0, at) + "-" + p.slice(at + 2);
      const cand = {
        pen: v.pen + 1.5,
        notes: [...v.notes, "یک بلند به‌جای دو کوتاه در «مفاعیلُ مفاعیلُ»"],
        lic: [...v.lic.map((x) => (x > at ? x - 1 : x)), at],
      };
      if (!out.has(key) || out.get(key)!.pen > cand.pen) out.set(key, cand);
    }
  }
  return out;
}

/** آیا الگو با یکی از گونه‌های وزن می‌خواند؟ هجای آخر نادیده. */
export function fitMeter(pattern: string, meter: string): Variant | null {
  const body = pattern.slice(0, -1);
  let best: Variant | null = null;
  for (const [p, v] of meterVariants(meter)) {
    if (p.length === pattern.length && p.slice(0, -1) === body && (!best || v.pen < best.pen)) best = v;
  }
  return best;
}

export type ScanResult =
  | { ok: true; units: ParsedUnit[]; pattern: string; notes: string[] }
  | { ok: false; error: string; units: ParsedUnit[]; pattern: string };

const patternOf = (units: Unit[]) => units.map((u) => (u.length === "short" ? SHORT : LONG)).join("");

/**
 * تقطیعِ پیشنهادیِ یک مصراعِ اعراب‌دار.
 *
 * با وزن: ارزان‌ترین خوانشی که با یکی از گونه‌های وزن بخواند. اگر هیچ‌کدام
 * نخواند، خوانشِ بی‌اختیار برمی‌گردد با پیامِ خطا — مدیر باید یا اعراب را
 * درست کند یا هجاها را دستی.
 * بی‌وزن: همان خوانشِ بی‌اختیار.
 */
export function scanHemistich(text: string, meter?: string): ScanResult {
  const ws = words(text);
  if (ws.length === 0) return { ok: false, error: "متنی برای تقطیع نیست.", units: [], pattern: "" };

  const plain = syllabify(readings(ws, 0)[0].ph, false);

  if (!meter) return { ok: true, units: plain, pattern: patternOf(plain), notes: [] };
  if (!meterPattern(meter)) return { ok: false, error: `وزنِ «${meter}» شناخته نشد.`, units: plain, pattern: patternOf(plain) };

  let best: { units: Unit[]; pen: number; notes: string[]; lic: number[] } | null = null;
  for (const budget of BUDGETS) {
    for (const r of readings(ws, budget)) {
      if (best && r.pen >= best.pen) break;
      const units = syllabify(r.ph, r.keepN);
      const fit = fitMeter(patternOf(units), meter);
      if (!fit) continue;
      const pen = r.pen + fit.pen;
      if (!best || pen < best.pen) best = { units, pen, notes: [...r.notes, ...fit.notes], lic: fit.lic };
    }
    // خوانشی که هنوز دیده نشده هزینه‌اش از budget بیشتر است؛ پس اگر بهترینِ
    // فعلی زیرِ سقف است، بهتر از آن پیدا نمی‌شود.
    if (best && best.pen <= budget) break;
  }

  if (!best) {
    return {
      ok: false,
      error: "با این اعراب، هیچ خوانشی با وزن نمی‌خواند.",
      units: plain,
      pattern: patternOf(plain),
    };
  }
  const lic = new Set(best.lic);
  const units = best.units.map((u, i) => (lic.has(i) && !u.license ? { ...u, license: "meter" as const } : u));
  return { ok: true, units, pattern: patternOf(units), notes: best.notes };
}
