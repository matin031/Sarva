import "server-only";
import { query, queryOne } from "@/lib/db";
import { quizQuestionWeight } from "@/lib/quiz/weight";
import {
  bucketize,
  roleBucketFor,
  roleLabelForKey,
  type RawAnswer,
  type SkillAnalysis,
} from "./skill-buckets";

export type { SkillAnalysis, SkillBucket } from "./skill-buckets";
export { MIN_EVIDENCE_PER_BUCKET, MIN_EVIDENCE_TOTAL } from "./skill-buckets";

/**
 * تحلیلِ آموزشیِ سروا پلاس — «چه چیزی را باید مرور کنم؟»
 *
 * ⚠️ این فایل مهم‌ترین بخشِ *ارزشِ* پلاس است، نه نشانِ کنارِ لوگو. اگر پلاس
 * فقط یک نشان و چند قفل باشد، یک محدودیتِ پولی است؛ چیزی که آن را به یک
 * محصول تبدیل می‌کند این است که به دانش‌آموز بگوید کجا ضعیف است و بعد
 * نشانش بدهد که تمرینش نتیجه داده یا نه.
 *
 * ── منابعِ شواهد ────────────────────────────────────────────────────────────
 * تحلیلِ وزن از **سه** بازی می‌آید و نه یکی:
 *
 *   • عروضِ سماعی (`user_answers` + `questions`) — تشخیصِ وزن از روی صدا
 *   • پلِ وزن     (`aruz_bridge_answers`)        — تشخیصِ وزن از روی متن
 *   • کیمیای وزن  (`kimia_rounds`)               — *ساختنِ* ارکانِ وزن
 *
 * ⚠️ و سومی جنسِ متفاوتی از شاهد می‌دهد: دو تای اول «شناختن» را می‌سنجند
 * (از میانِ چند گزینه) و سومی «ساختن» را. دانش‌آموزی که «مفاعیلن مفاعیلن
 * فعولن» را از روی فهرست می‌شناسد ولی خودش نمی‌تواند بچیندش، در دو منبعِ
 * اول سالم به نظر می‌رسد. برای همین در یک سطل می‌نشینند — سطل، *وزن* است
 * و نه بازی — و تفکیکِ منبع (`bySource`) نشان می‌دهد ضعف از کدام جنس است.
 *
 * تحلیلِ نقشِ دستوری هم از سه جا:
 *
 *   • جاسوس        (`jasoos_answers`)             — تشخیصِ نقشِ یک واژه در بیت
 *   • مدارِ دستور   (`grammar_circuit_answers`)     — چیدنِ نقش‌ها در جمله
 *   • شکار نقش‌ها  (`role_hunt_answers`)           — یافتنِ واژهٔ یک نقش در مصراع
 *
 * ⚠️ و سطلِ تحلیل **نقش** است و نه بازی. اگر دانش‌آموز «مسند» را در هر سه
 * بازی غلط بزند، در پنل یک سطر می‌بیند — «مسند، ۳ غلط» — و نه سه سطرِ
 * جدا که هیچ‌کدامشان شواهدِ کافی ندارند. بازی فقط *منبع* است؛ مفهومِ
 * یادگیری نقشِ دستوری است. تفکیکِ منبع داخلِ همان سطل می‌ماند
 * (`bySource`) تا کاربر بداند عدد از کجا آمده.
 *
 * ⚠️ چرا این ترکیب اهمیت دارد: دانش‌آموزی که در عروضِ سماعی خوب است ولی در
 * پلِ وزن روی «مفاعیلن» می‌افتد، مشکلش شنیدن نیست — تشخیصِ نوشتاری است. اگر
 * تحلیل فقط یکی از دو منبع را می‌دید، یا مشکل را نمی‌دید یا اشتباه
 * تشخیصش می‌داد. برای همین `aruz_bridge_answers` و
 * `grammar_circuit_answers` در migration ۰۱۶ ساخته شدند: پیش از آن، نصفِ
 * شواهد اصلاً ثبت نمی‌شد.
 *
 * ── قاعدهٔ «داده کافی» ─────────────────────────────────────────────────────
 * ⚠️ تحلیلی که با سه پاسخ نتیجه بگیرد، حدس است نه تحلیل. و بدتر: دانش‌آموز
 * به آن اعتماد می‌کند. پس هر سطلی که شواهدِ کافی ندارد کنار گذاشته می‌شود، و
 * اگر هیچ سطلی نماند، رابط کاربری صریحاً می‌گوید «هنوز داده کافی نداریم» —
 * نه اینکه یک پیشنهادِ ساختگی بسازد.
 */

/** سقفِ ردیف‌هایی که از هر منبع خوانده می‌شود — کوئری‌ها باید کران‌دار بمانند. */
const SOURCE_ROW_CAP = 4000;

/* ──────────────────────────── تحلیلِ وزن ────────────────────────────────── */

/**
 * «در کدام وزن ضعیف است؟» — ردیف‌های خام، پیش از سطل‌بندی.
 *
 * ⚠️ عمداً از `getWeightAnalysis` جدا شد و عمومی است: `lib/plus/insights.ts`
 * همین ردیف‌ها را با `answered_at`شان می‌خواهد تا «این مبحث بهتر شده؟» را
 * حساب کند. گرفتنِ دوبارهٔ همین سه کوئری با فیلترِ تاریخ، هم سه کوئریِ
 * اضافه بود و هم دو تعریفِ متفاوت از «شاهد» می‌ساخت — که روزی با هم اختلاف
 * پیدا می‌کنند و آن روز هیچ‌کس نمی‌داند کدام درست است.
 *
 * سه کوئری، چون سه جدولِ کاملاً متفاوت‌اند و union کردنشان فقط یک کوئریِ
 * ناخوانا می‌ساخت که پلنش هم بدتر بود.
 */
export async function collectWeightRows(userId: string): Promise<RawAnswer[]> {
  const rows: RawAnswer[] = [];

  /* منبع ۱ — عروضِ سماعی.
     وزنِ هر نوعِ سؤال جای خودش را دارد؛ هر چهارتا در `quizQuestionWeight`
     (`lib/quiz/weight.ts`) — همان تابعی که پنلِ عروض و آزمون‌سازِ دبیر هم
     صدا می‌زنند، تا سه صفحه سه تعریف از «وزنِ این سؤال» نداشته باشند. */
  const quizRows = await query<{
    is_correct: boolean;
    answered_at: string;
    type: string | null;
    poem: unknown;
    audio_url: string | null;
    correct_label: string | null;
    correct_audio: string | null;
  }>(
    `select ua.is_correct, ua.answered_at, q.type, q.poem, q.audio_url,
            o.label as correct_label, o.audio_url as correct_audio
       from user_answers ua
       join questions q on q.id = ua.question_id
       left join question_options o
         on o.id = (select o2.id from question_options o2
                     where o2.question_id = q.id and o2.is_correct limit 1)
      where ua.user_id = ?
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of quizRows) {
    const weight = quizQuestionWeight({
      type: r.type,
      poem: r.poem,
      audioUrl: r.audio_url,
      correctLabel: r.correct_label,
      correctAudioUrl: r.correct_audio,
    });
    if (!weight) continue;
    rows.push({
      key: weight,
      label: weight,
      correct: r.is_correct,
      source: "عروض سماعی",
      at: r.answered_at,
    });
  }

  /* منبع ۲ — پلِ وزن. وزنِ درست به‌صورت snapshot در خودِ ردیف است، پس هیچ
     join ای لازم نیست و حذفِ یک پرسش هم تاریخچه را خراب نمی‌کند. */
  const bridgeRows = await query<{
    correct_pattern: string;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select correct_pattern, is_correct, answered_at
       from aruz_bridge_answers
      where user_id = ?
      order by answered_at desc
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of bridgeRows) {
    const weight = r.correct_pattern.trim();
    if (!weight) continue;
    rows.push({
      key: weight,
      label: weight,
      correct: r.is_correct,
      source: "پل وزن",
      at: r.answered_at,
    });
  }

  /* منبع ۳ — کیمیای وزن.
     ⚠️ `first_correct` و نه `last_correct`: در آن بازی بازیکن می‌تواند
     اصلاح کند و دوباره آزمایش کند، و این *هدفِ* بازی است. اگر نتیجهٔ
     نهایی شمرده می‌شد، هر دورِ سخت هم «درست» ثبت می‌شد و تحلیل هیچ‌وقت
     ضعفی نمی‌دید. شاهدِ یادگیری همان تلاشِ اول است.

     ⚠️ و `answered_at is not null`: دوری که رها شده و هیچ‌وقت آزمایش نشده
     شاهد نیست، نه درست و نه غلط.

     ⚠️ `meter_ark` عمداً همان شکلِ رشته‌ایِ `aruz_bridge_answers
     .correct_pattern` است («فاعلاتن فاعلاتن فاعلن»)، پس هر سه منبع در یک
     سطل می‌نشینند و نه سه جزیرهٔ جدا با شواهدِ ناکافی. */
  const kimiaRows = await query<{
    meter_ark: string;
    first_correct: boolean;
    answered_at: string;
  }>(
    `select meter_ark, first_correct, answered_at
       from kimia_rounds
      where user_id = ? and answered_at is not null
      order by answered_at desc
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of kimiaRows) {
    const weight = r.meter_ark.trim();
    if (!weight) continue;
    rows.push({
      key: weight,
      label: weight,
      correct: r.first_correct,
      source: "کیمیای وزن",
      at: r.answered_at,
    });
  }

  return rows;
}

export async function getWeightAnalysis(userId: string): Promise<SkillAnalysis> {
  return bucketize(await collectWeightRows(userId));
}

/* ──────────────────────── تحلیلِ نقشِ دستوری ────────────────────────────── */

/** ردیف‌های خامِ نقش — به همان دلیلِ `collectWeightRows` عمومی است. */
export async function collectRoleRows(userId: string): Promise<RawAnswer[]> {
  const rows: RawAnswer[] = [];

  /* منبع ۱ — جاسوس. نقشِ درست به‌صورت برچسبِ فارسی ذخیره شده.
     ⚠️ پرونده‌های «آرایه» (تشبیه، کنایه، …) نقشِ دستوری نیستند و بدونِ این
     شرط هر کدام یک سطلِ «نقش» می‌ساختند. */
  const jasoosRows = await query<{
    correct_role: string;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select correct_role, is_correct, answered_at
       from jasoos_answers
      where user_id = ? and category <> 'آرایه'
      order by answered_at desc
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of jasoosRows) {
    const bucket = roleBucketFor(r.correct_role ?? "");
    if (!bucket) continue;
    rows.push({ ...bucket, correct: r.is_correct, source: "جاسوس", at: r.answered_at });
  }

  /* منبع ۲ — مدارِ دستور. کلیدِ نقش مستقیم ذخیره شده. */
  const circuitRows = await query<{
    role_key: string;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select role_key, is_correct, answered_at
       from grammar_circuit_answers
      where user_id = ?
      order by answered_at desc
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of circuitRows) {
    const key = r.role_key?.trim();
    if (!key) continue;
    rows.push({
      key,
      label: roleLabelForKey(key) ?? key,
      correct: r.is_correct,
      source: "مدار دستور",
      at: r.answered_at,
    });
  }

  /* منبع ۳ — شکارِ نقش‌ها. همان کلیدِ متعارف، از همان کاتالوگ. */
  const huntRows = await query<{
    role_key: string;
    is_correct: boolean;
    answered_at: string;
  }>(
    `select role_key, is_correct, answered_at
       from role_hunt_answers
      where user_id = ?
      order by answered_at desc
      limit ?`,
    [userId, SOURCE_ROW_CAP],
  );

  for (const r of huntRows) {
    const key = r.role_key?.trim();
    if (!key) continue;
    rows.push({
      key,
      label: roleLabelForKey(key) ?? key,
      correct: r.is_correct,
      source: "شکار نقش‌ها",
      at: r.answered_at,
    });
  }

  return rows;
}

export async function getRoleAnalysis(userId: string): Promise<SkillAnalysis> {
  return bucketize(await collectRoleRows(userId));
}

/* ────────────────────────── دفترِ اشتباه‌ها ─────────────────────────────── */

export type MistakeArea =
  | "aruz"
  | "bridge"
  | "vocab"
  | "jasoos"
  | "circuit"
  | "roleHunt"
  | "kimia";

export type MistakeEntry = {
  area: MistakeArea;
  areaLabel: string;
  title: string;
  subtitle: string | null;
  at: string;
  /** جایی که می‌شود همان مهارت را دوباره تمرین کرد. */
  practiceHref: string;
};

const AREA_LABEL: Record<MistakeArea, string> = {
  aruz: "عروض سماعی",
  bridge: "پل وزن",
  vocab: "واژه‌یاب",
  jasoos: "جاسوس",
  circuit: "مدار دستور",
  roleHunt: "شکار نقش‌ها",
  kimia: "کیمیای وزن",
};

/**
 * دفترِ اشتباه — تازه‌ترین پاسخ‌های نادرست از همهٔ تمرین‌ها.
 *
 * ⚠️ کوئری‌ها به‌جای یک `union all`ِ بزرگ، جدا نوشته شده‌اند و هرکدام سقفِ
 * خودشان را دارند. دلیلش خوانایی نیست، پلنِ اجراست: هر جدول ایندکسِ
 * `(user_id, answered_at desc)` خودش را دارد و جداگانه از آن سود می‌برد،
 * در حالی که union با مرتب‌سازیِ سراسری، پنج اسکن را به یک Sort بزرگ
 * می‌رساند.
 */
export async function getMistakeBook(
  userId: string,
  limitPerArea = 8,
): Promise<MistakeEntry[]> {
  const cap = Math.min(Math.max(limitPerArea, 1), 25);

  const [aruz, bridge, vocab, jasoos, circuit, roleHunt, kimia] = await Promise.all([
    query<{ poem: string[] | null; answered_at: string }>(
      `select q.poem, ua.answered_at
         from user_answers ua
         join questions q on q.id = ua.question_id
        where ua.user_id = ? and ua.is_correct = 0
        order by ua.answered_at desc
        limit ?`,
      [userId, cap],
    ),
    query<{ phrase: string; correct_pattern: string; answered_at: string }>(
      `select phrase, correct_pattern, answered_at
         from aruz_bridge_answers
        where user_id = ? and is_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
    query<{ word: string; meaning: string; answered_at: string }>(
      `select word, meaning, answered_at
         from vocab_answers
        where user_id = ? and is_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
    query<{ verse_line_1: string; correct_role: string; answered_at: string }>(
      `select verse_line_1, correct_role, answered_at
         from jasoos_answers
        where user_id = ? and is_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
    query<{ token_text: string; role_key: string; answered_at: string }>(
      `select token_text, role_key, answered_at
         from grammar_circuit_answers
        where user_id = ? and is_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
    query<{ verse: string; role_key: string; correct_token_text: string; answered_at: string }>(
      `select verse, role_key, correct_token_text, answered_at
         from role_hunt_answers
        where user_id = ? and is_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
    /* ⚠️ «اشتباه» در کیمیای وزن یعنی *تلاشِ اول* غلط بوده — حتی اگر
       بازیکن بعداً خودش درستش کرده باشد. دقیقاً همان دوری که ارزشِ مرور
       کردن دارد. */
    query<{ verse: string; meter_ark: string; answered_at: string }>(
      `select verse, meter_ark, answered_at
         from kimia_rounds
        where user_id = ? and first_correct = 0
        order by answered_at desc
        limit ?`,
      [userId, cap],
    ),
  ]);

  const entries: MistakeEntry[] = [
    ...aruz.map((r) => ({
      area: "aruz" as const,
      areaLabel: AREA_LABEL.aruz,
      title: r.poem?.[0]?.trim() || "سؤال عروض",
      subtitle: null,
      at: r.answered_at,
      practiceHref: "/quiz",
    })),
    ...bridge.map((r) => ({
      area: "bridge" as const,
      areaLabel: AREA_LABEL.bridge,
      title: r.phrase,
      subtitle: `وزن درست: ${r.correct_pattern}`,
      at: r.answered_at,
      practiceHref: "/game/aruz-bridge",
    })),
    ...vocab.map((r) => ({
      area: "vocab" as const,
      areaLabel: AREA_LABEL.vocab,
      title: r.word,
      subtitle: r.meaning,
      at: r.answered_at,
      practiceHref: "/game/vocab",
    })),
    ...jasoos.map((r) => ({
      area: "jasoos" as const,
      areaLabel: AREA_LABEL.jasoos,
      title: r.verse_line_1,
      subtitle: `نقش درست: ${r.correct_role}`,
      at: r.answered_at,
      practiceHref: "/game/jasoos",
    })),
    ...circuit.map((r) => ({
      area: "circuit" as const,
      areaLabel: AREA_LABEL.circuit,
      title: r.token_text,
      subtitle: `نقش درست: ${roleLabelForKey(r.role_key) ?? r.role_key}`,
      at: r.answered_at,
      practiceHref: "/game/grammar-circuit",
    })),
    ...roleHunt.map((r) => ({
      area: "roleHunt" as const,
      areaLabel: AREA_LABEL.roleHunt,
      /* ⚠️ عنوان، خودِ مصراع است و نه واژهٔ درست: بدونِ مصراع، «بود» هیچ
         چیزی به دانش‌آموز یادآوری نمی‌کند. واژه در زیرنویس می‌آید. */
      title: r.verse,
      subtitle: `${roleLabelForKey(r.role_key) ?? r.role_key}: «${r.correct_token_text}»`,
      at: r.answered_at,
      practiceHref: "/game/role-hunt",
    })),
    ...kimia.map((r) => ({
      area: "kimia" as const,
      areaLabel: AREA_LABEL.kimia,
      /* متنِ بیت با جداکنندهٔ «¶» ذخیره شده تا دو مصراع از هم پیدا باشند؛
         در دفترِ اشتباه یک خط کافی است. */
      title: r.verse.replace(" ¶ ", " / "),
      subtitle: `وزن درست: ${r.meter_ark}`,
      at: r.answered_at,
      practiceHref: "/game/kimia",
    })),
  ];

  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/* ───────────────────────── «امروز برای تو» ─────────────────────────────── */

export type TodayItem = {
  kind: "weak_weight" | "weak_role" | "review_mistakes" | "keep_streak";
  title: string;
  detail: string;
  /** تخمینِ زمان بر حسب دقیقه — از تعدادِ آیتم، نه از هوا. */
  minutes: number;
  href: string;
};

export type TodayPlan = {
  items: TodayItem[];
  hasEnoughEvidence: boolean;
  /** جمله‌ای که وقتی داده کافی نیست نمایش داده می‌شود. */
  emptyReason: string | null;
};

/**
 * برنامهٔ امروز — بالاترین بخشِ تجربهٔ پلاس.
 *
 * ⚠️ اینجا حق نداریم چیزی از خودمان دربیاوریم. هر آیتم باید از یک عددِ واقعی
 * بیاید، و اگر عددی نیست، جای پیشنهاد را یک جملهٔ صادقانه می‌گیرد:
 * «هنوز داده کافی برای پیشنهاد دقیق نداریم». پیشنهادِ ساختگی بدترین حالت
 * است: دانش‌آموز وقتش را روی چیزی می‌گذارد که مشکلش نبوده و بعد به کلِ
 * تحلیل بی‌اعتماد می‌شود.
 */
export async function getTodayPlan(userId: string): Promise<TodayPlan> {
  const [weights, roles, mistakes] = await Promise.all([
    getWeightAnalysis(userId),
    getRoleAnalysis(userId),
    countRecentMistakes(userId),
  ]);

  const items: TodayItem[] = [];

  const weakWeight = weights.buckets[0];
  if (weights.hasEnoughEvidence && weakWeight && weakWeight.accuracy < 0.75) {
    items.push({
      kind: "weak_weight",
      title: `تمرین وزن «${weakWeight.label}»`,
      detail: `از ${weakWeight.total.toLocaleString("fa-IR")} تمرین این وزن، ${weakWeight.correct.toLocaleString("fa-IR")} تا درست بوده.`,
      minutes: 6,
      href: "/game/aruz-bridge",
    });
  }

  const weakRole = roles.buckets[0];
  if (roles.hasEnoughEvidence && weakRole && weakRole.accuracy < 0.75) {
    items.push({
      kind: "weak_role",
      title: `تمرین نقش «${weakRole.label}»`,
      detail: `دقت تو در این نقش ${Math.round(weakRole.accuracy * 100).toLocaleString("fa-IR")}٪ است.`,
      minutes: 7,
      href: "/game/grammar-circuit",
    });
  }

  if (mistakes > 0) {
    items.push({
      kind: "review_mistakes",
      title: "مرور دفتر اشتباه‌ها",
      detail: `${mistakes.toLocaleString("fa-IR")} اشتباه ثبت‌شده در یک ماه اخیر، آمادهٔ مرور است.`,
      // تخمینِ زمان از تعدادِ واقعیِ آیتم می‌آید و نه یک عددِ ثابتِ دلپذیر.
      minutes: Math.min(20, Math.max(3, Math.round(mistakes * 0.4))),
      href: "/panel/analysis#mistakes",
    });
  }

  const hasEnough = items.length > 0;

  return {
    items,
    hasEnoughEvidence: hasEnough,
    emptyReason: hasEnough
      ? null
      : "هنوز داده کافی برای پیشنهاد دقیق نداریم. چند دور تمرین کن تا تحلیل معنی‌دار شود.",
  };
}

/** اشتباه‌های یک ماه اخیر در همهٔ تمرین‌ها — فقط یک عدد، بدونِ کشیدنِ ردیف‌ها. */
async function countRecentMistakes(userId: string): Promise<number> {
  // ⚠️ هفت زیرکوئری و هفت بار `?`: در MySQL هر `?` پارامترِ بعدی را مصرف
  // می‌کند، پس شناسهٔ کاربر هفت بار فرستاده می‌شود. (در Postgres `$1` هفت بار
  // نوشته می‌شد و یک بار فرستاده — `lib/db` عمداً این تفاوت را پنهان نمی‌کند.)
  const row = await queryOne<{ n: number }>(
    `select
       (select count(*) from user_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from aruz_bridge_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from vocab_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from jasoos_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from grammar_circuit_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from role_hunt_answers
         where user_id = ? and is_correct = 0 and answered_at > now(6) - interval 30 day)
     + (select count(*) from kimia_rounds
         where user_id = ? and first_correct = 0 and answered_at > now(6) - interval 30 day)
       as n`,
    [userId, userId, userId, userId, userId, userId, userId],
  );
  return row?.n ?? 0;
}

/* ───────────────────────────── روندِ پیشرفت ─────────────────────────────── */

export type ProgressPoint = { week: string; total: number; correct: number };

/**
 * «تمرینِ من نتیجه داد؟»
 *
 * ⚠️ بدونِ این، تحلیل نصفه است: به دانش‌آموز می‌گوییم کجا ضعیف است و او
 * تمرین می‌کند، ولی هیچ‌وقت نمی‌بیند که بهتر شده یا نه. حلقه وقتی کامل است
 * که سنجش به اقدام و اقدام دوباره به سنجش وصل شود.
 *
 * گروه‌بندی هفتگی است و نه روزانه: نمودارِ روزانه برای دانش‌آموزی که هفته‌ای
 * سه بار تمرین می‌کند، بیشتر نویز است تا روند.
 */
export async function getProgressTrend(userId: string, weeks = 8): Promise<ProgressPoint[]> {
  const span = Math.min(Math.max(weeks, 2), 26);

  const rows = await query<{ week_start: string; total: number; correct: number }>(
    // ⚠️ سه چیزِ Postgres اینجا معادلِ MySQL گرفته‌اند:
    //   • `date_trunc('week', …)` نیست → `weekday()` شمارهٔ روز از دوشنبه
    //     می‌دهد، پس کم‌کردنش تاریخ را به ابتدای هفته می‌برد.
    //   • `count(*) filter (where …)` نیست → `sum(shart)` که در MySQL روی
    //     ۰/۱ جمع می‌زند و همان عدد را می‌دهد.
    //   • `make_interval(weeks => …)` نیست → `interval ? week`.
    //
    // هشت بار `?` : هفت تا برای شناسهٔ کاربر در هفت جدول، یکی برای بازهٔ هفته.
    //
    // ⚠️ از «کیمیای وزن» تلاشِ *اول* می‌آید و نه نتیجهٔ نهایی، و دورهای
    // رهاشده اصلاً نمی‌آیند. روندِ پیشرفت باید همان چیزی را نشان بدهد که
    // تحلیلِ وزن می‌شمارد، وگرنه دو عددِ ناسازگار به کاربر داده‌ایم.
    `with answers as (
       select answered_at, is_correct from user_answers where user_id = ?
       union all
       select answered_at, is_correct from aruz_bridge_answers where user_id = ?
       union all
       select answered_at, is_correct from jasoos_answers where user_id = ?
       union all
       select answered_at, is_correct from grammar_circuit_answers where user_id = ?
       union all
       select answered_at, is_correct from vocab_answers where user_id = ?
       union all
       select answered_at, is_correct from role_hunt_answers where user_id = ?
       union all
       select answered_at, first_correct from kimia_rounds
        where user_id = ? and answered_at is not null
     )
     select date_sub(date(answered_at), interval weekday(answered_at) day) as week_start,
            count(*) as total,
            sum(is_correct = 1) as correct
       from answers
      where answered_at > now(6) - interval ? week
      group by week_start
      order by week_start`,
    [userId, userId, userId, userId, userId, userId, userId, span],
  );

  return rows.map((r) => ({ week: r.week_start, total: Number(r.total), correct: Number(r.correct) }));
}
