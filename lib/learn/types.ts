/** درسنامه‌های تعاملی («خانهٔ مبحث‌ها»).
 *
 *  هر درسنامه فهرستی از «قدم»هاست که یکی‌یکی باز می‌شوند. قدم‌های سؤالی تا
 *  جواب درست نگیرند، راه را باز نمی‌کنند؛ هر جواب غلط بازخورد خودش را دارد.
 *
 *  متن‌ها با علامت‌گذاری ساده نوشته می‌شوند (components/learn/Rich.tsx):
 *  `==…==` ماژیک، `__…__` زیرخط، `((…))` دایره، `[[…]]` کادر، `**…**` پررنگ،
 *  `<<…>>` کلمهٔ نشان‌دار، `{{…}}` حرف اضافه (کنه).
 *  `%نام%` جای نام کوچکِ کاربرِ واردشده را می‌گیرد. */

export type Mood = "cool" | "happy" | "wow" | "think";

/** شخصیتِ میزبانِ درس. چهره، نشانِ جواب و لحنِ بازخوردهای پیش‌فرض از همین
 *  می‌آید (components/learn/persona.tsx). */
export type CharacterId = "motammam" | "iham" | "tashbih" | "nahad" | "mafool" | "majaz" | "esteare" | "hosnTalil" | "paradox" | "mozafElayh" | "sefat";

export type Beat =
  /** فصل تازه؛ در نوار پیشرفت هم دیده می‌شود. */
  | { kind: "chapter"; title: string; emoji: string }
  /** حرفِ شخصیت درس. */
  | { kind: "say"; text: string; mood?: Mood; next?: string }
  /** شخصیت می‌پرسد، شاگرد یکی از جواب‌های آماده را می‌زند؛ هر جواب واکنش خودش را دارد. */
  | { kind: "ask"; text: string; mood?: Mood; replies: { label: string; answer: string }[] }
  /** نمایش متحرک چسبیدن حرف اضافه به کلمهٔ بعد. */
  | { kind: "demo"; words: string[]; prep: number; caption: string }
  /** نمایش متحرک دو معنیِ یک کلمه: نقاب اول می‌افتد، نقاب دوم می‌آید، بعد هر دو. */
  | { kind: "duo"; line: string; a: string; b: string; caption: string; src?: string }
  /** کارت‌هایی که با زدن برمی‌گردند؛ برای ادامه باید دست‌کم `need` تا باز شوند. */
  | { kind: "cards"; prompt: string; need: number; cards: Flip[] }
  /** از میان چند کلمه، درست‌ها را پیدا کن. هر غلط توضیح خودش را دارد. */
  | { kind: "catch"; prompt: string; items: { text: string; ok: boolean; why: string }[]; success: string }
  /** روی جواب‌ها بزن. سطرها با علامت‌گذاری lib/learn/line.ts نوشته می‌شوند. */
  | { kind: "tap"; prompt: string; item: Example; success: string }
  /** چند سطر پشت سر هم؛ سطری که اشتباه زده شود، آخر دور دوباره می‌آید. */
  | { kind: "round"; prompt: string; items: Example[]; success: string }
  /** حرف اضافهٔ سطر افتاده؛ `{…}` در سطر جوابِ درست است. */
  | { kind: "fill"; prompt: string; items: (Example & { options: string[]; why: string })[]; success: string }
  /** کلمهٔ `|…|` نقشِ درس را دارد یا نه؟ */
  | { kind: "judge"; prompt: string; items: (Example & { yes: boolean; why: string })[]; success: string }
  /** هر دو نقابِ کلمهٔ `[…]` را از میان معنی‌های ریخته‌شده پیدا کن. */
  | { kind: "masks"; prompt: string; items: MaskItem[]; success: string }
  /** کلمه را به معنیِ پنهانش وصل کن. */
  | { kind: "pair"; prompt: string; rows: { word: string; seen: string; hidden: string }[]; success: string }
  /** رکن‌های سطر را یکی‌یکی بزن: هر گروهِ `[…]` یک رکن است و `roles` به همان ترتیب نامشان را می‌دهد. */
  | { kind: "pillars"; prompt: string; items: PillarItem[]; success: string }
  /** دوراهی: با «نه» یک‌راست به جمع‌بندی می‌پرد، با «آره» قدم‌های بعدی را هم می‌بیند. */
  | { kind: "fork"; text: string; mood?: Mood; yes: string; no: string; yesReply: string; noReply: string }
  /** چندگزینه‌ای؛ هر گزینهٔ غلط `why` خودش را نشان می‌دهد و کنار می‌رود. */
  | { kind: "choice"; prompt: string; stimulus?: string; src?: string; options: { text: string; correct?: true; why: string }[]; success: string }
  /** نکتهٔ طلایی. `lean` خط‌های «گوشت رو بیار جلو…» را با بزرگ‌شدن نشان می‌دهد. */
  | { kind: "tip"; title: string; lean?: string[]; body: string[] }
  /** فهرستِ مرجع ته درس؛ کارت‌های دورو با جست‌وجو. */
  | { kind: "list"; title: string; intro: string; rows: { word: string; a: string; b: string }[] }
  /** میان‌بُر به مبحث دیگر، با یادآوری کوتاه همان‌جا. */
  | { kind: "detour"; text: string; to: string; label: string; recap: { title: string; rows: [string, string][]; example: string } }
  /** سبدها: هر سطر را در سبدِ درستش بینداز. کلمهٔ `|…|` همانی است که سؤال
   *  دربارهٔ آن است و `bin` ایندکسِ سبدِ درست در `bins`. */
  | { kind: "sort"; prompt: string; bins: Bin[]; items: (Example & { bin: number; why: string })[]; success: string }
  /** نمایشِ متحرکِ جابه‌جاییِ معنی (مجاز): کلمهٔ `|…|` اول با معنیِ حقیقی‌اش
   *  می‌آید، `clue` (قرینه) روشن می‌شود و آن معنی خط می‌خورد، بعد معنیِ مقصود
   *  با پلِ `bridge` (علاقه) جایش می‌نشیند. */
  | { kind: "morph"; line: string; said: Sense; meant: Sense; clue: string; bridge: string; caption: string; src?: string;
      /** برچسبِ دو کارت؛ پیش‌فرض «معنیِ حقیقی» و «معنیِ مقصود». */
      labels?: [string, string];
      /** کارتِ اول خط نخورد: در استعارهٔ مکنیه چیزِ گفته‌شده غلط نیست، فقط
       *  همتای پنهانش رو می‌شود. */
      keep?: boolean }
  /** سؤال‌ساز: تکه‌ها را به ترتیبِ `answer` بزن تا پرسشِ تشخیص ساخته شود؛
   *  بعد جوابِ `[…]` از دلِ سطر بیرون می‌پرد. `notes` توضیحِ تکه‌های غلط است. */
  | { kind: "build"; prompt: string; line: string; pieces: string[]; answer: string[]; notes?: Record<string, string>; reveal: string; success: string }
  /** خطِ زمان: دو وصفِ مخالف روی یک خط می‌افتند؛ اگر `at`شان یکی باشد روی
   *  یک نقطه (متناقض‌نما)، وگرنه روی دو نقطهٔ جدا (تضاد). شاگرد پیش از افتادن
   *  حدس می‌زند. */
  | { kind: "timeline"; prompt: string; items: TimelineItem[]; success: string }
  /** گروه‌ساز: هسته وسط است و وابسته‌ها یکی‌یکی می‌آیند؛ شاگرد می‌گوید هر
   *  کدام پیش از هسته (پیشین) می‌نشیند یا پس از آن (پسین)، و گروهِ اسمی جلوی
   *  چشمش ساخته می‌شود. ترتیبِ `parts` همان ترتیبِ نهاییِ هر طرف است. */
  | { kind: "grow"; prompt: string; head: string; parts: GrowPart[]; success: string }
  /** نمایشِ متحرکِ دو خطِ زمان زیرِ هم: اولی تضاد، دومی متناقض‌نما. */
  | { kind: "timelineDemo"; apart: TimelineItem; together: TimelineItem; caption: string }
  | { kind: "finish"; learned: string[] };

/** یک سطر روی خطِ زمان. `at` برچسبِ نقطه است: زمان، و اگر لازم شد صاحبِ
 *  وصف («سارا · الان»). دو `at`ِ یکسان یعنی یک نقطه. */
export type TimelineItem = { line: string; src?: string; a: Sense & { at: string }; b: Sense & { at: string }; why: string };

/** یک وابسته در قدمِ `grow`. */
export type GrowPart = { text: string; side: "pre" | "post"; label: string; why: string };
/** یک سبد در قدمِ `sort`. */
export type Bin = { label: string; emoji: string };
/** یک معنی در نمایشِ `morph`: شکلک و نوشته. */
export type Sense = { emoji: string; text: string };

/** یک روی کارتِ برگردان: یا سطری از کتاب، یا دو معنیِ یک کلمه. */
export type Flip = { front: string; src?: string } & ({ example: string; meanings?: never } | { meanings: [string, string]; example?: never });

/** یک سطر با رکن‌های نام‌دار. شمارهٔ هر گروهِ `[…]` در `line` ایندکسِ
 *  همان رکن در `roles` است؛ پس ترتیبِ `roles` = ترتیبِ کروشه‌ها در سطر، نه
 *  ترتیبی که از شاگرد پرسیده می‌شود (`ask`). */
export type PillarItem = Example & {
  roles: string[];
  /** ترتیبِ پرسیدن؛ ایندکس در `roles`. نباشد یعنی همان ترتیبِ `roles`. */
  ask?: number[];
  why: string;
};

/** یک کلمهٔ دونقابه. `meanings` دو جوابِ درست است و `decoys` معنی‌هایی که
 *  کنارشان ریخته می‌شوند؛ شاگرد باید هر دو نقاب را پیدا کند. */
export type MaskItem = Example & { meanings: [string, string]; decoys: string[]; why: string };

/** یک سطر تمرینی. `src` جای سطر در کتاب است («یازدهم · بانگ جرس»)؛
 *  `notes` توضیح اختصاصی برای کلمه‌هایی که ممکن است اشتباه زده شوند. */
export type Example = { line: string; src?: string; notes?: Record<string, string> };

export type Lesson = {
  slug: string;
  title: string;
  /** نام شخصیت درس، که در حباب‌ها نوشته می‌شود */
  host: string;
  /** چهره و لحنِ میزبان. */
  character: CharacterId;
  description: string;
  /** قفسه‌اش در فهرستِ `/learn`: دستورِ زبان یا آرایه‌های ادبی. */
  group: "grammar" | "figures";
  /** یک جملهٔ کوتاه برای کارتِ فهرست؛ `description` برای متای صفحه است و
   *  روی کارت بلند می‌افتد. */
  tagline: string;
  /** درس‌هایی که در متنشان `%نام%` دارند بدون ورود بی‌معنی‌اند. */
  needsName?: boolean;
  beats: Beat[];
};

/** قدم‌هایی که بدون جواب درست رد نمی‌شوند. */
export const isGate = (beat: Beat) => ["ask", "fork", "cards", "catch", "tap", "round", "fill", "judge", "masks", "pair", "pillars", "choice", "sort", "build", "timeline", "grow"].includes(beat.kind);
/** قدم‌هایی که جواب درستِ بار اول ستاره می‌گیرد. */
export const isScored = (beat: Beat) => ["catch", "tap", "round", "fill", "judge", "masks", "pair", "pillars", "choice", "sort", "build", "timeline", "grow"].includes(beat.kind);
