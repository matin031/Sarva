#!/usr/bin/env node
/**
 * دادهٔ نمونه برای *آزمودنِ* ابزار انتقال. این فایل به سایت ربطی ندارد.
 *
 * ⚠️ چرا لازم است: ابزار ETL بدون داده چیزی را ثابت نمی‌کند. و دادهٔ
 * «تمیز» هم چیزی را ثابت نمی‌کند — انتقال روی دادهٔ ساده همیشه کار
 * می‌کند. آنچه می‌شکند این‌هاست، پس عمداً همین‌ها ساخته می‌شود:
 *
 *   • میکروثانیهٔ ناصفر در timestamptz  (تلهٔ Date در جاوااسکریپت)
 *   • عدد اعشاری با دو رقم                (تلهٔ ممیز شناور)
 *   • ایموجی و نویسهٔ چهاربایتی           (تلهٔ utf8 در برابر utf8mb4)
 *   • نیم‌فاصله و «ی» و «ک» عربی           (تلهٔ collation)
 *   • inet با پیشوند شبکه                 (تلهٔ host())
 *   • آرایهٔ متن با کاما و گیومه داخلش     (تلهٔ array_to_string)
 *   • jsonb با عدد بزرگ و کلید یونیکد     (تلهٔ دوباره‌رمزگذاری)
 *   • رشتهٔ خالی در برابر NULL            (دو چیزِ متفاوت)
 *   • ارجاع درون‌جدولیِ زنجیره‌ای            (تلهٔ ترتیبِ درج)
 *   • ردیفی که خودش را ویرایش نکرده        (updated_at باید *نماند*)
 *
 * SOURCE_POSTGRES_URL=… node scripts/mysql/etl/seed-demo.mjs [--rows N]
 */

import { randomUUID } from "node:crypto";
import pg from "pg";

const url = process.env.SOURCE_POSTGRES_URL;
if (!url) {
  console.error("SOURCE_POSTGRES_URL تنظیم نشده است.");
  process.exit(1);
}
const N = Number(process.argv[process.argv.indexOf("--rows") + 1]) || 40;

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("set time zone 'UTC'");

const ids = {};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const uuid = () => randomUUID();

/** زمانی با میکروثانیهٔ ناصفر — عمداً، چون همین‌جا داده گم می‌شود. */
function stamp(daysAgo = 0) {
  const base = Date.UTC(2024, 0, 15, 9, 30, 0) - daysAgo * 86_400_000;
  const micros = String(100000 + Math.floor(Math.random() * 899999));
  return `${new Date(base).toISOString().slice(0, 19).replace("T", " ")}.${micros}+00`;
}

const PERSIAN = [
  "بشنو این نی چون شکایت می‌کند",           // نیم‌فاصله
  "توانا بود هر که دانا بود",
  "ای نام تو بهترین سرآغاز",
  "هزار نکتهٔ باریک‌تر ز مو این‌جاست",         // «ه‍ٔ» و نیم‌فاصله
  "الا یا ایها الساقی ادر کأساً و ناولها",      // همزه روی الف
  "دل می‌رود ز دستم صاحب‌دلان خدا را 🌙",      // ایموجی
  "چو ایران نباشد تن من مباد 🇮🇷",           // پرچم = دو نقطه‌کد
  "نگارِ من که به مکتب نرفت و خط ننوشت",     // کسرهٔ اضافه
];

const say = (t, n) => console.log(`  ${t.padEnd(28)} ${n}`);

/**
 * @param {string} table
 * @param {object[]} rows
 * @param {{overriding?: boolean}} [opts] overriding برای ستون‌های
 *   GENERATED ALWAYS AS IDENTITY لازم است — jasoos_levels.id از این نوع
 *   است و شناسه‌اش باید عیناً همانی بماند که هست.
 */
async function ins(table, rows, opts = {}) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const values = [];
  const tuples = rows.map((r) => {
    const ph = cols.map((c) => {
      values.push(r[c]);
      return `$${values.length}`;
    });
    return `(${ph.join(", ")})`;
  });
  const overriding = opts.overriding ? "overriding system value " : "";
  await client.query(
    `insert into "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
      `${overriding}values ${tuples.join(", ")}`,
    values,
  );
  say(table, rows.length);
}

try {
  await client.query("begin");

  // --- کاربران ------------------------------------------------------------
  ids.users = Array.from({ length: N }, () => uuid());
  await ins(
    "users",
    ids.users.map((id, i) => ({
      id,
      // ⚠️ ایمیل‌ها عمداً با بزرگی و کوچکیِ متفاوت — citext در مبدأ و
      // utf8mb4_0900_as_ci در مقصد باید *یک‌جور* رفتار کنند.
      email: i % 5 === 0 ? `Kaveh.Ahangar+${i}@Example.COM` : `user${i}@example.com`,
      // نمونهٔ Argon2id واقعی از نظر شکل. هرگز از دادهٔ واقعی نیست.
      password_hash:
        i % 7 === 0
          ? null // کاربرِ فقط-گوگل: این ستون باید nullable بماند
          : "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$SGVyZUlzQVRlc3RIYXNoVmFsdWVYWFhY",
      full_name: i % 11 === 0 ? null : pick(["کاوه آهنگر", "رودابهٔ زابلی", "آرش کمان‌گیر", ""]),
      role: i === 0 ? "admin" : "student",
      email_verified_at: i % 3 === 0 ? null : stamp(200 - i),
      is_banned: i % 17 === 0,
      created_at: stamp(300 - i),
      updated_at: stamp(300 - i),
    })),
  );

  // --- هویت گوگل ----------------------------------------------------------
  await ins(
    "user_identities",
    ids.users.slice(0, 8).map((uid, i) => ({
      id: uuid(),
      user_id: uid,
      provider: "google",
      provider_account_id: `1${String(i).padStart(20, "0")}`,
      email: i % 2 ? null : `google${i}@Gmail.com`,
      created_at: stamp(100),
    })),
  );

  // --- تنظیمات ------------------------------------------------------------
  //
  // ⚠️ عمداً شکل‌های مختلف JSON: رشته، عدد، بولین، شیء، آرایه، و null.
  // ستون مقصد JSON است و باید هر شش را نگه دارد.
  await ins("app_settings", [
    { key: "site_title", value: '"سروا | سامانهٔ ادبیات"', updated_at: stamp(5), updated_by: ids.users[0] },
    { key: "club_open", value: "true", updated_at: stamp(5), updated_by: null },
    { key: "max_daily", value: "9007199254740993", updated_at: stamp(5), updated_by: null },
    { key: "banner", value: 'null', updated_at: stamp(5), updated_by: null },
    { key: "themes", value: '["شب","روز","سپیده‌دم 🌅"]', updated_at: stamp(5), updated_by: null },
    {
      key: "smtp",
      value: '{"host":"mail.example.com","port":587,"از":"سروا","tls":true,"ratio":0.125}',
      updated_at: stamp(5),
      updated_by: ids.users[0],
    },
  ]);

  // --- سشن‌ها با زنجیرهٔ چرخش ------------------------------------------------
  //
  // ⚠️ rotated_to زنجیره می‌سازد: هر سشن به سشنِ بعدیِ خودش اشاره می‌کند.
  // این دقیقاً همان چیزی است که درجِ تک‌مرحله‌ای را می‌شکند، چون ردیفِ
  // هدف هنوز درج نشده.
  ids.sessions = Array.from({ length: N }, () => uuid());
  const family = uuid();
  await ins(
    "sessions",
    ids.sessions.map((id, i) => ({
      id,
      user_id: ids.users[i % ids.users.length],
      refresh_token_hash: Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""),
      user_agent: i % 4 === 0 ? null : "Mozilla/5.0 (X11; Linux x86_64) «مرورگر» 🦊",
      // ⚠️ هم IPv4، هم IPv6، هم *با پیشوند شبکه*. آخری چیزی است که
      // host() از بین می‌برد.
      ip: pick(["192.168.1.34", "2001:db8:85a3::8a2e:370:7334", "10.0.0.0/8", null]),
      expires_at: stamp(-30),
      revoked_at: i % 6 === 0 ? stamp(2) : null,
      created_at: stamp(60 - (i % 60)),
      last_used_at: i % 5 === 0 ? null : stamp(1),
      family_id: i < 10 ? family : uuid(),
      // زنجیره فقط در ده‌تای اول؛ آخری تهی می‌ماند.
      rotated_to: i < 9 ? ids.sessions[i + 1] : null,
    })),
  );

  // --- کدهای یک‌بارمصرف و بازیابی گذرواژه ------------------------------------
  await ins(
    "email_otps",
    Array.from({ length: 12 }, (_, i) => ({
      id: uuid(),
      email: i % 3 ? `otp${i}@example.com` : `OTP${i}@Example.Com`,
      code_hash: "$argon2id$v=19$m=19456,t=2,p=1$b3Rwc2FsdA$T1RQSGFzaFZhbHVlSGVyZVhYWFhYWFhY",
      purpose: i % 4 === 0 ? "email_change" : "signup_verify",
      expires_at: stamp(-1),
      attempts: i % 6,
      consumed_at: i % 5 === 0 ? stamp(1) : null,
      requested_ip: pick(["185.55.226.1", null, "::1"]),
      created_at: stamp(1),
    })),
  );
  await ins(
    "password_resets",
    Array.from({ length: 8 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i],
      token_hash: `reset${i}`.padEnd(64, "0"),
      expires_at: stamp(-1),
      consumed_at: i % 3 === 0 ? stamp(0) : null,
      requested_ip: i % 2 ? null : "203.0.113.7",
      created_at: stamp(1),
    })),
  );

  // --- محدودیت نرخ --------------------------------------------------------
  await ins(
    "rate_limits",
    Array.from({ length: 15 }, (_, i) => ({
      key: `login:user${i}@example.com`,
      count: i * 3,
      reset_at: stamp(-1),
    })),
  );

  // --- کلاب ---------------------------------------------------------------
  ids.posts = Array.from({ length: N }, () => uuid());
  await ins(
    "club_posts",
    ids.posts.map((id, i) => ({
      id,
      user_id: ids.users[i % ids.users.length],
      author_name: pick(["کاوه", "ناشناس", "رودابه 🌸"]),
      is_anonymous: i % 9 === 0,
      title: i % 6 === 0 ? null : `سرودهٔ ${i} — «${pick(PERSIAN).slice(0, 20)}»`,
      body: `${pick(PERSIAN)}\n${pick(PERSIAN)}\n${pick(PERSIAN)}`,
      form: pick(["ghazal", "masnavi", "robaee", "sepid", "other"]),
      // ⚠️ برچسب‌ها با کاما و گیومه *داخل* خودشان — دقیقاً چیزی که
      // به‌هم‌چسباندن با کاما خرابش می‌کند.
      tags: i % 4 === 0 ? [] : [pick(["عاشقانه", 'با "گیومه"', "یک, دو", "🌙 شبانه"]), "کهن"],
      meter: i % 3 === 0 ? null : "فاعلاتن فاعلاتن فاعلاتن فاعلن",
      status: i % 10 === 0 ? "rejected" : i % 3 === 0 ? "pending" : "approved",
      review_note: i % 10 === 0 ? "خارج از موضوع" : null,
      featured: i % 13 === 0,
      like_count: 0,
      comment_count: 0,
      reviewed_at: i % 3 === 0 ? null : stamp(20),
      reviewed_by: i % 3 === 0 ? null : ids.users[0],
      published_at: i % 3 === 0 ? null : stamp(20),
      created_at: stamp(90 - (i % 90)),
      // ⚠️ updated_at عمداً *برابرِ* created_at نیست و عمداً قدیمی است.
      // اگر تریگرِ updated_at در حین انتقال روشن بماند، این عدد به روزِ
      // مهاجرت پرش می‌کند و آزمون همان‌جا می‌گیردش.
      updated_at: stamp(45 - (i % 45)),
    })),
  );

  const approved = ids.posts.filter((_, i) => i % 10 !== 0 && i % 3 !== 0);
  ids.comments = Array.from({ length: N * 2 }, () => uuid());
  const commentRows = ids.comments.map((id, i) => {
    const post = approved[i % approved.length];
    return {
      id,
      post_id: post,
      user_id: ids.users[(i * 3) % ids.users.length],
      author_name: pick(["آرش", "ناشناس"]),
      // ⚠️ پاسخ به دیدگاهِ *قبلی* — دوباره ارجاع درون‌جدولی.
      parent_id: i > 5 && i % 4 === 0 ? ids.comments[i - 5] : null,
      reply_to_id: i > 5 && i % 4 === 0 ? ids.comments[i - 5] : null,
      body: `${pick(PERSIAN)} — ${i}`,
      status: i % 7 === 0 ? "pending" : i % 11 === 0 ? "rejected" : "approved",
      review_note: null,
      reviewed_at: i % 7 === 0 ? null : stamp(10),
      reviewed_by: i % 7 === 0 ? null : ids.users[0],
      created_at: stamp(30 - (i % 30)),
    };
  });
  // ⚠️ parent_id باید بعد از خودِ ردیف درج شود، پس دو مرحله در خودِ seed هم.
  await ins("club_comments", commentRows.map((r) => ({ ...r, parent_id: null, reply_to_id: null })));
  for (const r of commentRows.filter((r) => r.parent_id)) {
    await client.query(`update club_comments set parent_id=$1, reply_to_id=$2 where id=$3`, [
      r.parent_id,
      r.reply_to_id,
      r.id,
    ]);
  }

  const likes = [];
  const seen = new Set();
  for (let i = 0; i < N * 3; i++) {
    const key = `${approved[i % approved.length]}|${ids.users[(i * 7) % ids.users.length]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    likes.push({
      post_id: approved[i % approved.length],
      user_id: ids.users[(i * 7) % ids.users.length],
      created_at: stamp(15),
    });
  }
  await ins("club_likes", likes);

  await ins(
    "club_reports",
    Array.from({ length: 10 }, (_, i) => ({
      id: uuid(),
      reporter_id: ids.users[i],
      target_type: i % 2 ? "post" : "comment",
      target_id: i % 2 ? ids.posts[i] : ids.comments[i],
      reason: pick(["plagiarism", "offensive", "spam", "off_topic", "other"]),
      note: i % 3 ? null : "بیت دوم از حافظ است.",
      status: pick(["open", "resolved", "dismissed"]),
      resolved_at: i % 2 ? stamp(3) : null,
      resolved_by: i % 2 ? ids.users[0] : null,
      created_at: stamp(8),
    })),
  );

  // --- آزمون --------------------------------------------------------------
  ids.exams = Array.from({ length: 4 }, () => uuid());
  await ins(
    "exams",
    ids.exams.map((id, i) => ({
      id,
      subject: "فارسی",
      grade: 10 + (i % 3),
      title: `امتحان نوبت ${i % 2 ? "دوم" : "اول"} — ${i}`,
      exam_session: i % 2 ? null : `خرداد ۱۴۰${i}`,
      // ⚠️ عدد اعشاری با دو رقم. اگر از ممیز شناور رد شود، ۲۰٫۰۰ می‌تواند
      // ۱۹٫۹۹۹۹۹۹۹۹۹۹ شود.
      total_score: "20.00",
      created_at: stamp(120),
    })),
  );
  ids.sections = [];
  const sectionRows = [];
  for (const exam of ids.exams) {
    for (let s = 0; s < 3; s++) {
      const id = uuid();
      ids.sections.push(id);
      sectionRows.push({
        id,
        exam_id: exam,
        title: pick(["واژگان", "آرایه‌های ادبی", "درک متن", "دستور زبان"]),
        order_index: s,
        section_score: ["6.50", "7.25", "6.25"][s],
      });
    }
  }
  await ins("exam_sections", sectionRows);

  ids.questions = [];
  const qRows = [];
  for (const [si, sec] of ids.sections.entries()) {
    for (let q = 0; q < 3; q++) {
      const id = uuid();
      ids.questions.push(id);
      qRows.push({
        id,
        exam_section_id: sec,
        number: si * 3 + q + 1,
        page_ref: q === 0 ? null : q + 1,
        instruction: q % 2 ? null : "معنای واژه‌های زیر را بنویسید.",
        layout_pattern: q === 1 ? "multi-subquestion" : null,
        order_index: q,
      });
    }
  }
  await ins("exam_questions", qRows);

  ids.parts = [];
  const partRows = [];
  for (const q of ids.questions) {
    for (let p = 0; p < 2; p++) {
      const id = uuid();
      ids.parts.push(id);
      partRows.push({
        id,
        question_id: q,
        part_index: p,
        label: p === 0 ? "الف" : "ب",
        type: pick(["word-meaning-input", "mcq-inline", "true-false", "fill-blank-term"]),
        score: ["0.25", "1.50"][p],
        content: JSON.stringify({ متن: pick(PERSIAN), blanks: p, "n": 1.5 }),
        correct_answer: JSON.stringify(p === 0 ? { key: "الف" } : ["پاسخ ۱", "پاسخ ۲"]),
        accepted_answers: p === 0 ? null : JSON.stringify(["پاسخ 1", "پاسخ۱"]),
        grading_mode: pick(["exact_match", "ai_semantic", "ai_partial_credit", "manual"]),
        ai_grading_hint: p === 0 ? null : "به املای «ی» سخت نگیر.",
      });
    }
  }
  await ins("exam_question_parts", partRows);

  await ins(
    "exam_question_options",
    ids.parts.flatMap((part, i) =>
      Array.from({ length: 4 }, (_, o) => ({
        id: uuid(),
        question_part_id: part,
        option_key: ["۱", "۲", "۳", "۴"][o],
        order_index: o,
        text: pick(PERSIAN).slice(0, 40),
        is_correct: o === i % 4,
      })),
    ),
  );

  await ins(
    "exam_attempts",
    Array.from({ length: 20 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i % ids.users.length],
      exam_id: ids.exams[i % ids.exams.length],
      total_score: (i * 0.75).toFixed(2),
      max_score: "20.00",
      question_results: JSON.stringify([{ q: 1, s: 0.25 }, { q: 2, s: 1.5 }]),
      answers: JSON.stringify({ "1": "پاسخ", "2": ["الف", "ب"] }),
      created_at: stamp(40 - i),
    })),
  );

  // --- آزمون چهارگزینه‌ای ---------------------------------------------------
  ids.qz = Array.from({ length: 15 }, () => uuid());
  await ins(
    "questions",
    ids.qz.map((id, i) => ({
      id,
      type: pick(["aruz", "arayeh", "lexicon"]),
      // ⚠️ آرایهٔ متن با NULL داخلش ممکن نیست ولی آرایهٔ تهی ممکن است.
      poem: i % 5 === 0 ? null : i % 4 === 0 ? [] : [pick(PERSIAN), pick(PERSIAN)],
      audio_url: i % 3 ? null : "/audio/x.mp3",
      difficulty: pick(["easy", "medium", "hard"]),
      created_at: stamp(150),
    })),
  );
  ids.opts = [];
  const optRows = ids.qz.flatMap((q, i) =>
    Array.from({ length: 4 }, (_, o) => {
      const id = uuid();
      ids.opts.push(id);
      return {
        id,
        question_id: q,
        label: o === 3 ? null : `گزینهٔ ${o + 1}`,
        poem: o % 2 ? null : [pick(PERSIAN)],
        audio_url: null,
        is_correct: o === i % 4,
        x: 30 + o,
      };
    }),
  );
  await ins("question_options", optRows);

  ids.attempts = Array.from({ length: 18 }, () => uuid());
  await ins(
    "quiz_attempts",
    ids.attempts.map((id, i) => ({
      id,
      user_id: ids.users[i % ids.users.length],
      total: 10,
      correct: i % 11,
      created_at: stamp(25 - (i % 25)),
    })),
  );
  await ins(
    "quiz_attempt_answers",
    ids.attempts.flatMap((a, i) =>
      Array.from({ length: 3 }, (_, k) => ({
        id: uuid(),
        attempt_id: a,
        question_id: ids.qz[(i + k) % ids.qz.length],
        selected_option_id: k === 2 ? null : ids.opts[(i * 4 + k) % ids.opts.length],
        is_correct: k === 0,
        created_at: stamp(25 - (i % 25)),
      })),
    ),
  );
  await ins(
    "user_answers",
    Array.from({ length: 30 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i % ids.users.length],
      question_id: ids.qz[i % ids.qz.length],
      selected_option_id: i % 6 === 0 ? null : ids.opts[i % ids.opts.length],
      is_correct: i % 3 === 0,
      answered_at: stamp(20),
    })),
  );

  // --- واژگان -------------------------------------------------------------
  await ins(
    "vocab_words",
    Array.from({ length: 25 }, (_, i) => ({
      id: uuid(),
      grade: pick(["dahom", "yazdahom", "davazdahom"]),
      lesson: (i % 18) + 1,
      word: pick(["سِتُرگ", "فَرَه", "دژم", "بیغوله", "خِنگ"]),
      meaning: pick(["بزرگ", "شکوه", "اندوهگین", "جای دورافتاده", "اسب سفید"]),
      // ⚠️ رشتهٔ خالی، نه NULL. این دو در مقصد هم باید دو چیز بمانند.
      image: i % 3 === 0 ? "" : `/img/vocab/${i}.webp`,
      sort_index: i,
      created_at: stamp(200),
    })),
  );
  await ins(
    "vocab_answers",
    Array.from({ length: 30 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i % ids.users.length],
      grade: pick(["dahom", "yazdahom", "davazdahom"]),
      lesson: (i % 18) + 1,
      word: "سِتُرگ",
      meaning: "بزرگ",
      image: "",
      is_correct: i % 2 === 0,
      answered_at: stamp(12),
    })),
  );

  // --- جاسوس --------------------------------------------------------------
  //
  // ⚠️ شناسهٔ عددی و دستی. مقصد AUTO_INCREMENT دارد و باید بعد از انتقال
  // از بزرگ‌ترین شناسه جلوتر باشد.
  const levelIds = Array.from({ length: 12 }, (_, i) => 1000 + i * 3);
  await ins(
    "jasoos_levels",
    levelIds.map((id, i) => ({
      id,
      title: `مرحلهٔ ${i + 1}`,
      category: pick(["دستوری", "آرایه"]),
      content_type: pick(["poem", "prose"]),
      verse_line_1: pick(PERSIAN),
      verse_line_2: i % 4 === 0 ? "" : pick(PERSIAN),
      is_published: i % 5 !== 0,
      sort_index: i,
      created_at: stamp(180),
    })),
    { overriding: true },
  );
  await ins(
    "jasoos_suspects",
    levelIds.flatMap((lid, i) =>
      Array.from({ length: 4 }, (_, s) => ({
        id: uuid(),
        level_id: lid,
        role: pick(["نهاد", "مفعول", "متمم", "قید"]),
        is_spy: s === i % 4,
        evidence: "این واژه نقشِ ادعایی را ندارد.",
        word_in_verse: s % 3 === 0 ? "" : pick(["نی", "دانا", "نام"]),
        sort_index: s,
      })),
    ),
  );
  await ins(
    "jasoos_answers",
    Array.from({ length: 25 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i % ids.users.length],
      level_id: levelIds[i % levelIds.length],
      category: pick(["دستوری", "آرایه"]),
      verse_line_1: pick(PERSIAN),
      verse_line_2: pick(PERSIAN),
      chosen_role: "نهاد",
      correct_role: "مفعول",
      is_correct: i % 4 === 0,
      answered_at: stamp(9),
    })),
  );

  // --- نینجا و جفت‌ها --------------------------------------------------------
  ids.cats = Array.from({ length: 5 }, () => uuid());
  await ins(
    "ninja_categories",
    ids.cats.map((id, i) => ({
      id,
      label: pick(["آرایه", "دستور", "واژگان", "تاریخ ادبیات"]) + ` ${i}`,
      hint: i % 2 === 0 ? "" : "به پایانِ واژه دقت کن.",
      enabled: i !== 4,
      sort_index: i,
      created_at: stamp(160),
    })),
  );
  await ins(
    "ninja_words",
    ids.cats.flatMap((c) =>
      Array.from({ length: 6 }, (_, w) => ({
        id: uuid(),
        category_id: c,
        word: pick(["تشبیه", "استعاره", "کنایه", "مجاز", "جناس"]) + `‌${w}`,
        sort_index: w,
        created_at: stamp(160),
      })),
    ),
  );
  await ins(
    "memory_pairs",
    Array.from({ length: 20 }, (_, i) => ({
      id: uuid(),
      grade: pick(["dahom", "yazdahom", "davazdahom"]),
      term: pick(["dey", "khordad"]),
      work: `${pick(["شاهنامه", "گلستان", "مثنوی معنوی", "دیوان حافظ"])} ${i}`,
      author: pick(["فردوسی", "سعدی", "مولوی", "حافظ"]),
      sort_index: i,
      created_at: stamp(170),
    })),
  );

  // --- محتوای عروض و دستور --------------------------------------------------
  await ins(
    "aruz_bridge_questions",
    Array.from({ length: 15 }, (_, i) => ({
      id: uuid(),
      source_id: i + 1,
      phrase: pick(PERSIAN),
      correct_pattern: "فاعلاتن فاعلاتن فاعلن",
      wrong_pattern: "مفاعیلن مفاعیلن فعولن",
      difficulty: (i % 3) + 1,
      explanation: i % 3 ? null : "هجای بلندِ پایانی.",
      audio_url: null,
      is_published: i % 4 !== 0,
      sort_index: i,
      created_at: stamp(140),
      updated_at: stamp(70),
    })),
  );
  await ins(
    "grammar_circuit_questions",
    Array.from({ length: 15 }, (_, i) => ({
      id: uuid(),
      source_id: `gc-${i}`,
      grade: pick(["dahom", "yazdahom", "davazdahom"]),
      lesson: (i % 18) + 1,
      question_type: pick(["sentence", "hemistich", "verse"]),
      payload: JSON.stringify({ متن: pick(PERSIAN), نقش‌ها: ["نهاد", "گزاره"], امتیاز: 1.25 }),
      difficulty: (i % 3) + 1,
      explanation: i % 2 ? null : "فعل مرکب است.",
      attribution: i % 3 ? null : "فردوسی",
      is_published: i % 3 !== 0,
      sort_index: i,
      created_at: stamp(130),
      updated_at: stamp(65),
    })),
  );

  // --- اعلان و حامیان -------------------------------------------------------
  await ins(
    "site_announcements",
    Array.from({ length: 6 }, (_, i) => ({
      id: uuid(),
      title: i % 2 ? null : "خبر تازه",
      body: "امتحانات نوبت دوم از ۱۵ خرداد آغاز می‌شود. 📚",
      tone: pick(["info", "success", "warning", "critical"]),
      // ⚠️ قید می‌گوید این دو با هم NULL یا با هم غیر-NULL اند.
      link_url: i % 2 ? null : "https://example.com/news",
      link_label: i % 2 ? null : "بیشتر",
      is_active: i !== 5,
      dismissible: i % 3 !== 0,
      priority: i,
      starts_at: i % 2 ? null : stamp(10),
      ends_at: i % 2 ? null : stamp(-10),
      created_by: ids.users[0],
      created_at: stamp(15),
      updated_at: stamp(12),
    })),
  );
  await ins(
    "site_supporters",
    Array.from({ length: 8 }, (_, i) => ({
      id: uuid(),
      display_name: pick(["ناشناس", "کاوه آهنگر", "یک دوست 💚"]),
      message: i % 3 ? null : "سپاس از سروا.",
      tier: pick(["gold", "silver", "bronze", "supporter"]),
      amount_label: i % 2 ? null : "۵۰ هزار تومان",
      link_url: null,
      avatar_url: null,
      is_visible: i !== 7,
      // ⚠️ date و نه timestamptz — نباید در انتقال یک روز جابه‌جا شود.
      supported_at: i % 4 === 0 ? null : `2024-03-2${i % 9}`,
      sort_index: i,
      created_at: stamp(20),
      updated_at: stamp(20),
    })),
  );

  // --- گزارش‌ها و نشان‌ها ------------------------------------------------------
  await ins(
    "content_reports",
    Array.from({ length: 12 }, (_, i) => ({
      id: uuid(),
      area: pick(["quiz", "exam", "vocab", "jasoos", "other"]),
      target_id: i % 4 === 0 ? null : `q-${i}`,
      target_ref: JSON.stringify({ kind: "question", n: i }),
      snapshot: i % 3 ? null : pick(PERSIAN),
      reason: pick(["wrong_answer", "typo", "unclear", "other"]),
      note: i % 2 ? null : "گزینهٔ ۳ هم درست است.",
      user_id: i % 5 === 0 ? null : ids.users[i % ids.users.length],
      ip: pick(["198.51.100.5", null, "2001:db8::1/64"]),
      user_agent: i % 3 ? null : "Mozilla/5.0",
      request_id: `req-${i}`,
      status: pick(["open", "in_review", "resolved", "rejected"]),
      admin_note: null,
      resolved_at: i % 2 ? null : stamp(4),
      resolved_by: i % 2 ? null : ids.users[0],
      created_at: stamp(11),
      updated_at: stamp(6),
    })),
  );
  await ins(
    "user_bookmarks",
    Array.from({ length: 20 }, (_, i) => ({
      id: uuid(),
      user_id: ids.users[i % ids.users.length],
      area: pick(["aruz", "vocab", "exam", "jasoos"]),
      ref_id: `ref-${i}`,
      title: pick(PERSIAN).slice(0, 30),
      subtitle: i % 3 ? null : "درس ۵",
      payload: JSON.stringify({ note: "🌙", score: 0.5 }),
      note: i % 4 ? null : "دوباره بخوان",
      created_at: stamp(7),
    })),
  );

  // --- لاگ‌ها --------------------------------------------------------------
  await ins(
    "admin_audit_log",
    Array.from({ length: 20 }, (_, i) => ({
      id: uuid(),
      actor_id: i % 6 === 0 ? null : ids.users[0],
      actor_email: "Admin@Sarva.Example",
      action: pick(["club.post.approve", "user.ban", "settings.update"]),
      target_type: pick(["club_post", "user", "setting"]),
      target_id: i % 3 ? ids.posts[i % ids.posts.length] : null,
      summary: `سرودهٔ «${pick(PERSIAN).slice(0, 15)}» تأیید شد.`,
      metadata: JSON.stringify({ before: { status: "pending" }, after: { status: "approved" } }),
      ip: pick(["10.0.0.0/8", "192.0.2.44", null]),
      created_at: stamp(5 - (i % 5)),
      request_id: i % 2 ? null : `req-audit-${i}`,
    })),
  );
  await ins(
    "app_error_log",
    Array.from({ length: 14 }, (_, i) => ({
      id: uuid(),
      source: pick(["server", "client", "edge"]),
      message: "TypeError: cannot read properties of undefined",
      context: i % 3 ? null : "/api/v1/club/posts",
      detail: i % 2 ? null : "at handler (/app/route.js:12:5)\n  at run (…)",
      // ⚠️ نمایهٔ یکتاییِ جزئی: fingerprint فقط میان ردیف‌های *حل‌نشده*
      // یکتاست. پس ردیف‌های حل‌شده عمداً اثرِ انگشتِ مشترک دارند — همان
      // چیزی که ستون تولیدشدهٔ fingerprint_open در مقصد باید نگه دارد.
      fingerprint: i % 5 === 0 ? "fp-shared-resolved" : `fp-${i}`,
      occurrences: i + 1,
      first_seen_at: stamp(30),
      last_seen_at: stamp(1),
      // ⚠️ ستون تولیدشدهٔ fingerprint_open در مقصد به همین وابسته است:
      // فقط ردیف‌های حل‌نشده باید یکتا باشند.
      resolved_at: i % 5 === 0 ? stamp(0) : null,
      resolved_by: i % 5 === 0 ? ids.users[0] : null,
      error_name: "TypeError",
      error_code: i % 2 ? null : "E_UNDEF",
      digest: `d${i}`,
      environment: "production",
      release: "2024.05.1",
      first_request_id: `req-${i}a`,
      last_request_id: `req-${i}b`,
      metadata: JSON.stringify({ url: "/club", ua: "Firefox 🦊" }),
    })),
  );
  await ins(
    "sms_log",
    Array.from({ length: 10 }, (_, i) => ({
      id: uuid(),
      to_number: `+9891234567${i}`,
      body: "کد ورود شما: ۱۲۳۴۵۶",
      provider: pick(["kavenegar", "console"]),
      status: pick(["queued", "sent", "failed"]),
      provider_message_id: i % 3 ? null : `msg-${i}`,
      error: i % 4 === 0 ? "اعتبار کافی نیست" : null,
      created_at: stamp(2),
    })),
  );

  await client.query("commit");
} catch (e) {
  await client.query("rollback");
  console.error("\nشکست:", e.message);
  await client.end();
  process.exit(1);
}

// ⚠️ حالا که تریگرهای شمارنده در مبدأ کار کرده‌اند، شمارنده‌ها درست‌اند.
// عمداً یکی را دستی خراب می‌کنیم تا verify نشان دهد که *مقصد* را از روی
// ردیف‌های واقعی می‌سازد و شمارندهٔ خرابِ مبدأ را کورکورانه کپی نمی‌کند.
const { rows } = await client.query(
  `select like_count, comment_count from club_posts order by created_at limit 1`,
);
console.log(`\nنمونهٔ شمارنده: like=${rows[0]?.like_count} comment=${rows[0]?.comment_count}`);

await client.end();
console.log("دادهٔ نمونه ساخته شد.");
