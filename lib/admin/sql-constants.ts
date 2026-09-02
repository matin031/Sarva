/**
 * ثابت‌ها و الگوهای کنسول SQL.
 *
 * جدا از lib/admin/sql-console.ts نگه داشته شده، به همان دلیل همیشگی: یک فایل
 * `"use server"` فقط تابع async می‌تواند export کند و یک آرایهٔ ثابت آنجا
 * build را می‌شکند (همان الگوی lib/admin/log-constants.ts).
 */

export type SqlRunMode = "preview" | "commit";

/** سقف طول متن کوئری. یک insert انبوهِ ۵۰۰ سؤالی راحت زیر این می‌ماند. */
export const MAX_SQL_LENGTH = 200_000;

/** بیشترین ردیفی که به مرورگر فرستاده می‌شود. کوئری کامل اجرا می‌شود؛ فقط
 *  *نمایش* بریده می‌شود، وگرنه یک `select * from users` مرورگر را می‌خواباند. */
export const MAX_RESULT_ROWS = 300;

/** سقف زمان هر اجرا. یک کوئریِ اشتباه نباید دیتابیس را قفل کند. */
export const SQL_STATEMENT_TIMEOUT_MS = 15_000;

/** جدول‌هایی که فقط خواندنی‌اند — دلیلش در lib/admin/sql-console.ts. */
export const PROTECTED_TABLES = ["admin_audit_log", "schema_migrations"] as const;

/** بیشترین طول نمایشِ یک خانه در جدول نتیجه. */
export const MAX_CELL_CHARS = 300;

// ---------------------------------------------------------------------------
// الگوها
// ---------------------------------------------------------------------------

export type SqlSnippet = {
  title: string;
  /** چه‌کاری می‌کند و کِی به دردتان می‌خورد. */
  description: string;
  sql: string;
};

export type SqlSnippetGroup = {
  key: string;
  title: string;
  /** یک جملهٔ راهنما دربارهٔ کلِ این بخش. */
  note?: string;
  snippets: SqlSnippet[];
};

/**
 * الگوهای آمادهٔ نوشتن.
 *
 * هدفشان این است که هیچ‌وقت لازم نباشد نامِ ستون‌ها را از حفظ بدانید: روی
 * الگو کلیک می‌کنید، در ویرایشگر می‌نشیند، مقدارها را عوض می‌کنید، «پیش‌نمایش»
 * می‌زنید و بعد «ثبت».
 *
 * ⚠️ همهٔ این‌ها روی اسکیمای واقعیِ همین پروژه نوشته شده‌اند. اگر روزی ستونی
 * عوض شد، «راهنمای جدول‌ها» — که از خودِ دیتابیس خوانده می‌شود — همیشه راست
 * می‌گوید و این فهرست باید با آن هماهنگ شود.
 */
export const SQL_SNIPPETS: SqlSnippetGroup[] = [
  {
    key: "read",
    title: "گزارش‌های آماده",
    note: "این‌ها فقط می‌خوانند و هیچ چیزی را عوض نمی‌کنند — بی‌خطرترین جای شروع.",
    snippets: [
      {
        title: "تعداد ردیف هر جدول",
        description: "برای فهمیدن اینکه کجا داده هست و کجا خالی است.",
        sql: `select relname as جدول, n_live_tup as ردیف
  from pg_stat_user_tables
 order by n_live_tup desc;`,
      },
      {
        title: "کاربران تازه",
        description: "بیست حساب آخر، با وضعیت تأیید ایمیل.",
        sql: `select email,
       full_name,
       role,
       (email_verified_at is not null) as ایمیل_تأیید_شده,
       is_banned,
       created_at
  from users
 order by created_at desc
 limit 20;`,
      },
      {
        title: "فعالیت هفتهٔ گذشته",
        description: "چند کاربر تازه، چند آزمون، چند سرودهٔ کلاب.",
        sql: `select
  (select count(*) from users        where created_at > now() - interval '7 days') as کاربر_تازه,
  (select count(*) from quiz_attempts where created_at > now() - interval '7 days') as آزمون_عروض,
  (select count(*) from exam_attempts where created_at > now() - interval '7 days') as امتحان,
  (select count(*) from club_posts    where created_at > now() - interval '7 days') as سروده;`,
      },
      {
        title: "سؤال‌های عروض سماعی",
        description: "هر سؤال با تعداد گزینه‌ها — برای پیدا کردن سؤال ناقص.",
        sql: `select q.id,
       q.type,
       q.difficulty,
       left(array_to_string(q.poem, ' / '), 60) as بیت,
       count(o.id)                              as گزینه,
       count(*) filter (where o.is_correct)     as پاسخ_درست
  from questions q
  left join question_options o on o.question_id = q.id
 group by q.id
 having count(*) filter (where o.is_correct) <> 1
 order by q.created_at desc;`,
      },
    ],
  },

  {
    key: "quiz",
    title: "عروض سماعی",
    note:
      "هر سؤال یک ردیف در questions دارد و چند ردیف در question_options. دقیقاً یکی از گزینه‌ها باید is_correct باشد. " +
      "⚠️ هر سه نوع سؤال به فایل صوتی نیاز دارند، و فایل باید از قبل آپلود شده باشد (پنل ← عروض سماعی) — SQL فایل نمی‌سازد، فقط آدرسش را ذخیره می‌کند.",
    snippets: [
      {
        title: "افزودن یک سؤال «بیت ← صوت»",
        description:
          "صورت سؤال یک بیت است و گزینه‌ها فایل صوتی. با CTE نوشته شده تا شناسهٔ سؤال بدون کپی‌کردنِ دستی به گزینه‌ها برسد.",
        sql: `with q as (
  insert into questions (type, poem, difficulty)
  values (
    'poem-to-audio',                      -- poem-to-audio | audio-to-poem | weight-to-audio
    array['مصراع اول', 'مصراع دوم'],       -- بیت سؤال
    'medium'                              -- easy | medium | hard
  )
  returning id
)
insert into question_options (question_id, audio_url, is_correct, x)
select q.id, v.url, v.correct, v.x
  from q,
       (values
         ('/uploads/quiz-audio/الف.mp3', true , -40),
         ('/uploads/quiz-audio/ب.mp3',   false,  40),
         ('/uploads/quiz-audio/ج.mp3',   false, -40),
         ('/uploads/quiz-audio/د.mp3',   false,  40)
       ) as v(url, correct, x);`,
      },
      {
        title: "افزودن یک سؤال «وزن ← صوت»",
        description:
          "صورت سؤال الگوی وزن است (در poem[1] می‌نشیند) و گزینه‌ها فایل صوتی.",
        sql: `with q as (
  insert into questions (type, poem, difficulty)
  values ('weight-to-audio', array['فاعلاتن فاعلاتن فاعلاتن فاعلن'], 'medium')
  returning id
)
insert into question_options (question_id, audio_url, is_correct, x)
select q.id, v.url, v.correct, v.x
  from q,
       (values
         ('/uploads/quiz-audio/الف.mp3', true , -40),
         ('/uploads/quiz-audio/ب.mp3',   false,  40)
       ) as v(url, correct, x);`,
      },
      {
        title: "افزودن یک سؤال «صوت ← بیت»",
        description: "صورت سؤال یک فایل صوتی است و گزینه‌ها بیت‌اند. تنها نوعی که برای ورود انبوه با SQL مناسب است، چون فقط یک فایل صوتی لازم دارد.",
        sql: `with q as (
  insert into questions (type, audio_url, difficulty)
  values ('audio-to-poem', '/uploads/quiz-audio/سؤال.mp3', 'medium')
  returning id
)
insert into question_options (question_id, poem, is_correct, x)
select q.id, v.poem, v.correct, v.x
  from q,
       (values
         (array['مصراع اول درست', 'مصراع دوم درست'], true , -40),
         (array['مصراع اول غلط ۱', 'مصراع دوم غلط ۱'], false,  40),
         (array['مصراع اول غلط ۲', 'مصراع دوم غلط ۲'], false, -40)
       ) as v(poem, correct, x);`,
      },
      {
        title: "سؤال‌های ناقص را پیدا کن",
        description:
          "سؤالی که پاسخ درست ندارد یا دو پاسخ درست دارد، در بازی خراب دیده می‌شود. این کوئری همه‌شان را می‌آورد.",
        sql: `select q.id, q.type, count(o.id) as گزینه,
       count(*) filter (where o.is_correct) as پاسخ_درست
  from questions q
  left join question_options o on o.question_id = q.id
 group by q.id
having count(*) filter (where o.is_correct) <> 1
    or count(o.id) < 2
 order by q.created_at desc;`,
      },
      {
        title: "حذف یک سؤال",
        description: "گزینه‌ها با on delete cascade خودشان می‌روند. شناسه را از کوئری بالا بردارید.",
        sql: `delete from questions
 where id = '00000000-0000-0000-0000-000000000000';`,
      },
      {
        title: "تغییر درجهٔ سختی چند سؤال",
        description: "مثال: همهٔ سؤال‌های «صوت ← بیت» را «سخت» کن.",
        sql: `update questions
   set difficulty = 'hard'
 where type = 'audio-to-poem'
   and difficulty <> 'hard';`,
      },
    ],
  },

  {
    key: "vocab",
    title: "واژه‌یاب",
    note:
      "⚠️ grade با حروف لاتین ذخیره می‌شود: dahom | yazdahom | davazdahom (یعنی دهم، یازدهم، دوازدهم). " +
      "lesson باید بین ۱ تا ۱۸ باشد. هر دو با check constraint در دیتابیس محدود شده‌اند، پس مقدار غلط همان لحظه رد می‌شود.",
    snippets: [
      {
        title: "افزودن انبوه واژه",
        description: "ساده‌ترین جدول سایت — هر سطر یک واژه. برای وارد کردن یک درس کامل، سطرها را ادامه بدهید.",
        sql: `insert into vocab_words (grade, lesson, word, meaning, image, sort_index)
values
  ('dahom', 1, 'واژهٔ یک', 'معنی واژهٔ یک', '', 0),
  ('dahom', 1, 'واژهٔ دو', 'معنی واژهٔ دو', '', 1),
  ('dahom', 2, 'واژهٔ سه', 'معنی واژهٔ سه', '', 0);`,
      },
      {
        title: "حذف همهٔ واژه‌های یک درس",
        description:
          "قبل از وارد کردن دوبارهٔ یک درس، برای اینکه تکراری نشود. اول با پیش‌نمایش ببینید چند ردیف است.",
        sql: `delete from vocab_words
 where grade = 'dahom'
   and lesson = 1;`,
      },
      {
        title: "اصلاح معنی یک واژه",
        description: "برای وقتی یک غلط تایپی دیده‌اید و نمی‌خواهید دنبالش در پنل بگردید.",
        sql: `update vocab_words
   set meaning = 'معنی درست'
 where grade = 'dahom'
   and lesson = 1
   and word = 'واژهٔ یک';`,
      },
      {
        title: "شمارِ واژه در هر درس",
        description: "برای دیدن اینکه کدام درس هنوز خالی است.",
        sql: `select grade, lesson, count(*) as واژه
  from vocab_words
 group by grade, lesson
 order by grade, lesson;`,
      },
    ],
  },

  {
    key: "users",
    title: "کاربران",
    note: "⚠️ رمز عبور با argon2 هش می‌شود و در SQL قابل ساختن نیست. برای ساخت مدیر از «npm run db:seed-admin» استفاده کنید؛ برای کاربر عادی، خودش ثبت‌نام کند یا از «رمز را فراموش کرده‌ام» رد شود.",
    snippets: [
      {
        title: "مدیر کردن یک کاربر",
        description: "امن‌ترین راهِ ساختِ مدیر تازه: حساب را خودش بسازد، شما نقشش را بالا ببرید.",
        sql: `update users
   set role = 'admin'
 where email = 'someone@example.com';`,
      },
      {
        title: "تأیید دستی ایمیل",
        description: "وقتی ایمیل تأیید به دست کاربر نمی‌رسد و می‌خواهید دستی بازش کنید.",
        sql: `update users
   set email_verified_at = now()
 where email = 'someone@example.com'
   and email_verified_at is null;`,
      },
      {
        title: "مسدود کردن / رفع مسدودی",
        description: "مسدود شدن حداکثر به اندازهٔ عمر توکن دسترسی (۱۵ دقیقه) طول می‌کشد تا کامل اثر کند.",
        sql: `update users set is_banned = true  where email = 'someone@example.com';
-- برای رفع مسدودی:
-- update users set is_banned = false where email = 'someone@example.com';`,
      },
      {
        title: "خروج اجباری از همهٔ دستگاه‌ها",
        description: "همهٔ سشن‌های یک کاربر باطل می‌شوند؛ دفعهٔ بعد باید دوباره وارد شود.",
        sql: `update sessions
   set revoked_at = now()
 where revoked_at is null
   and user_id = (select id from users where email = 'someone@example.com');`,
      },
      {
        title: "حذف کامل یک کاربر",
        description:
          "⚠️ برگشت‌ناپذیر. پاسخ‌ها، آزمون‌ها و سروده‌هایش هم با cascade می‌روند. ابتدا با پیش‌نمایش ببینید چند ردیف است.",
        sql: `delete from users
 where email = 'someone@example.com';`,
      },
    ],
  },

  {
    key: "games",
    title: "بازی‌ها",
    note: "محتوای هر بازی جدول خودش را دارد. تا وقتی جدولی خالی است، بازی با محتوای پیش‌فرضِ داخل کد کار می‌کند و اولین ردیف جای کلِ آن را می‌گیرد.",
    snippets: [
      {
        title: "پلِ وزن — افزودن انبوه",
        description: "هر ردیف یک عبارت با الگوی درست و غلط.",
        sql: `insert into aruz_bridge_questions
  (source_id, phrase, correct_pattern, wrong_pattern, difficulty, explanation, is_published, sort_index)
values
  (1001, 'عبارت نمونهٔ یک', 'U - - ', 'U U - ', 2, 'توضیح کوتاه', true, 0),
  (1002, 'عبارت نمونهٔ دو', '- U - ', '- - U ', 3, null,          true, 1)
on conflict (source_id) do update
  set phrase          = excluded.phrase,
      correct_pattern = excluded.correct_pattern,
      wrong_pattern   = excluded.wrong_pattern,
      difficulty      = excluded.difficulty,
      explanation     = excluded.explanation,
      is_published    = excluded.is_published;`,
      },
      {
        title: "جفت‌های ادبی — افزودن انبوه",
        description:
          "grade: dahom | yazdahom | davazdahom — term: dey (دی) | khordad (خرداد). «اثر» در هر دسته یکتاست، پس on conflict می‌گذارد دوباره اجرا کنید بی‌آنکه تکراری بسازد.",
        sql: `insert into memory_pairs (grade, term, work, author, sort_index)
values
  ('dahom', 'dey', 'نام اثر یک', 'نام پدیدآورنده', 0),
  ('dahom', 'dey', 'نام اثر دو', 'نام پدیدآورنده', 1)
on conflict (grade, term, work) do update
  set author = excluded.author,
      sort_index = excluded.sort_index;`,
      },
      {
        title: "نینجای دستور — نقش تازه با کلماتش",
        description: "نقش و کلماتش با هم، بدون کپی کردنِ دستیِ شناسه.",
        sql: `with c as (
  insert into ninja_categories (label, hint, enabled, sort_index)
  values ('نهاد', 'کننده یا پذیرندهٔ کار', true, 0)
  returning id
)
insert into ninja_words (category_id, word, sort_index)
select c.id, w.word, w.i
  from c, (values ('کلمهٔ یک', 0), ('کلمهٔ دو', 1), ('کلمهٔ سه', 2)) as w(word, i)
on conflict (category_id, word) do nothing;`,
      },
      {
        title: "جاسوسِ نقش‌ها — یک پرونده با مظنون‌هایش",
        description:
          "دقیقاً یکی از مظنون‌ها باید is_spy باشد. category: «دستوری» یا «آرایه» — content_type: «poem» یا «prose».",
        sql: `with l as (
  insert into jasoos_levels
    (id, title, category, content_type, verse_line_1, verse_line_2, is_published, sort_index)
  values (101, 'عنوان پرونده', 'دستوری', 'poem',
          'مصراع اول', 'مصراع دوم', true, 0)
  returning id
)
insert into jasoos_suspects (level_id, role, is_spy, evidence, word_in_verse, sort_index)
select l.id, s.role, s.is_spy, s.evidence, s.word, s.i
  from l, (values
    ('نهاد',  false, 'دلیل بی‌گناهی', 'واژه', 0),
    ('مفعول', true , 'دلیلِ مجرم بودن', 'واژه', 1),
    ('قید',   false, 'دلیل بی‌گناهی', 'واژه', 2)
  ) as s(role, is_spy, evidence, word, i);`,
      },
      {
        title: "مدار دستور — انتشار / لغو انتشار",
        description:
          "⚠️ ستون payload یک jsonb با ساختار دقیق است و موقع خواندن اعتبارسنجی می‌شود؛ ساختنش با دست عملاً ناممکن است. برای *افزودن* پرسش از پنل یا «npm run db:seed-grammar-circuit» استفاده کنید. این الگو فقط انتشار را عوض می‌کند.",
        sql: `update grammar_circuit_questions
   set is_published = true
 where grade = 'davazdahom'   -- dahom | yazdahom | davazdahom
   and lesson = 3
   and is_published = false;`,
      },
    ],
  },

  {
    key: "exam",
    title: "امتحانات نهایی",
    note: "چهار سطح تودرتو دارد: exams ← exam_sections ← exam_questions ← exam_question_parts (و گزینه‌ها). ساختنِ کاملِ یک امتحان با SQL شدنی ولی طولانی است؛ برای یک امتحان تازه پنل ساده‌تر است.",
    snippets: [
      {
        title: "ساخت امتحان و بخش اولش",
        description: "اسکلتِ خالی، تا بعد سؤال‌هایش را از پنل بنویسید.",
        sql: `with e as (
  insert into exams (subject, grade, title, exam_session, total_score)
  values ('فارسی', 12, 'فارسی ۳ — خرداد ۱۴۰۴', 'خرداد ۱۴۰۴', 20)
  returning id
)
insert into exam_sections (exam_id, title, order_index, section_score)
select e.id, s.title, s.i, s.score
  from e, (values
    ('قلمرو زبانی', 0, 7.0),
    ('قلمرو ادبی',  1, 6.0),
    ('قلمرو فکری',  2, 7.0)
  ) as s(title, i, score);`,
      },
      {
        title: "نمرهٔ کاربران یک امتحان",
        description: "برای دیدن اینکه یک امتحان چقدر سخت از آب درآمده.",
        sql: `select u.email,
       a.total_score,
       a.max_score,
       round(100 * a.total_score / nullif(a.max_score, 0), 1) as درصد,
       a.created_at
  from exam_attempts a
  join users u on u.id = a.user_id
  join exams e on e.id = a.exam_id
 where e.title = 'فارسی ۳ — خرداد ۱۴۰۴'
 order by a.total_score desc;`,
      },
      {
        title: "حذف کامل یک امتحان",
        description: "⚠️ بخش‌ها، سؤال‌ها و پاسخ‌های کاربران هم با cascade می‌روند.",
        sql: `delete from exams
 where id = '00000000-0000-0000-0000-000000000000';`,
      },
    ],
  },

  {
    key: "club",
    title: "سروا کلاب",
    note: "status سروده و دیدگاه یکی از «pending»، «approved» یا «rejected» است. فقط approved در سایت دیده می‌شود.",
    snippets: [
      {
        title: "تأیید انبوه سروده‌های در صف",
        description: "همهٔ سروده‌های در انتظار را یکجا تأیید می‌کند.",
        sql: `update club_posts
   set status = 'approved',
       published_at = coalesce(published_at, now()),
       reviewed_at = now()
 where status = 'pending';`,
      },
      {
        title: "سروده‌های منتظر بررسی",
        description: "چه چیزی در صف مانده و از کِی.",
        sql: `select id, author_name, coalesce(title, '—') as عنوان,
       left(body, 60) as آغاز_متن, created_at
  from club_posts
 where status = 'pending'
 order by created_at;`,
      },
    ],
  },

  {
    key: "site",
    title: "اعلان و حامیان",
    note: "این دو از صفحه‌های اختصاصی خودشان هم اداره می‌شوند؛ الگوهای اینجا برای وارد کردنِ انبوه است.",
    snippets: [
      {
        title: "اعلانِ زمان‌بندی‌شده",
        description:
          "tone یکی از info | success | warning | critical است. با ends_at لازم نیست یادتان بماند خاموشش کنید.",
        sql: `insert into site_announcements
  (title, body, tone, link_url, link_label, is_active, dismissible, priority, starts_at, ends_at)
values (
  'قطعی برنامه‌ریزی‌شده',
  'فردا از ساعت ۲ تا ۴ بامداد، بخش آزمون‌ها در دسترس نخواهد بود.',
  'warning',
  null, null,
  true, true, 10,
  now() + interval '6 hours',
  now() + interval '30 hours'
);`,
      },
      {
        title: "خاموش کردن همهٔ اعلان‌ها",
        description: "دکمهٔ اضطراری، وقتی می‌خواهید نوار بالای سایت فوراً برود.",
        sql: `update site_announcements
   set is_active = false
 where is_active;`,
      },
      {
        title: "افزودن انبوه حامیان",
        description: "tier یکی از gold | silver | bronze | supporter است.",
        sql: `insert into site_supporters
  (display_name, message, tier, amount_label, link_url, is_visible, supported_at, sort_index)
values
  ('نام حامی یک', 'جمله‌ای کوتاه از او', 'gold',   'حامی طلایی', null, true, current_date, 0),
  ('نام حامی دو', null,                  'silver', null,         null, true, current_date, 1);`,
      },
    ],
  },

  {
    key: "maintenance",
    title: "نگهداری",
    note: "کارهایی که هر چند ماه یک بار به درد می‌خورند.",
    snippets: [
      {
        title: "پاک کردن خطاهای رسیدگی‌شدهٔ قدیمی",
        description: "اول با پیش‌نمایش ببینید چند ردیف است؛ لاگ ممیزی هرگز پاک نمی‌شود.",
        sql: `delete from app_error_log
 where resolved_at is not null
   and last_seen_at < now() - interval '90 days';`,
      },
      {
        title: "پاک کردن سشن‌های منقضی",
        description: "ردیف‌هایی که دیگر هیچ کاری نمی‌کنند و فقط جا می‌گیرند.",
        sql: `delete from sessions
 where expires_at < now() - interval '30 days';`,
      },
      {
        title: "بزرگ‌ترین جدول‌ها",
        description: "وقتی می‌خواهید بدانید فضای دیسک کجا رفته.",
        sql: `select relname as جدول,
       pg_size_pretty(pg_total_relation_size(relid)) as حجم
  from pg_catalog.pg_statio_user_tables
 order by pg_total_relation_size(relid) desc
 limit 15;`,
      },
    ],
  },
];
