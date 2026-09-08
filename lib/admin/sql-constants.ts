/**
 * ثابت‌ها و الگوهای کنسول SQL.
 *
 * جدا از lib/admin/sql-console.ts نگه داشته شده، به همان دلیل همیشگی: یک فایل
 * \`"use server"\` فقط تابع async می‌تواند export کند و یک آرایهٔ ثابت آنجا
 * build را می‌شکند (همان الگوی lib/admin/log-constants.ts).
 */

export type SqlRunMode = "preview" | "commit";

/** سقف طول متن کوئری. یک insert انبوهِ ۵۰۰ سؤالی راحت زیر این می‌ماند. */
export const MAX_SQL_LENGTH = 200_000;

/** بیشترین ردیفی که به مرورگر فرستاده می‌شود. کوئری کامل اجرا می‌شود؛ فقط
 *  *نمایش* بریده می‌شود، وگرنه یک \`select * from users\` مرورگر را می‌خواباند. */
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
/**
 * یادداشتِ مشترکِ الگوهایی که در PostgreSQL با CTEِ نویسنده نوشته شده بودند.
 */
const CTE_NOTE =
  "⚠️ در MySQL نمی‌شود INSERT را داخل CTE گذاشت و شناسه را با RETURNING گرفت. جایش یک متغیر نشست است: اول شناسه ساخته و در @qid نگه داشته می‌شود، بعد هر دو درج از آن استفاده می‌کنند. هر سه دستور را با هم اجرا کنید. (uuid() نسخهٔ ۱ می‌سازد و نه ۴ — برای شناسهٔ محتوا که عمومی است اشکالی ندارد و یکتاست.)";

export const SQL_SNIPPETS: SqlSnippetGroup[] = [
  {
    key: "read",
    title: "گزارش‌های آماده",
    note: "این‌ها فقط می‌خوانند و هیچ چیزی را عوض نمی‌کنند — بی‌خطرترین جای شروع.",
    snippets: [
      {
        title: "تعداد ردیف هر جدول",
        description:
          "برای فهمیدن اینکه کجا داده هست و کجا خالی است. ⚠️ عددِ InnoDB تخمینی است " +
          "(مثل n_live_tup در PostgreSQL)؛ برای «خالی هست یا نه» دقیق است، برای گزارش نه.",
        sql: `select table_name as جدول, table_rows as ردیف_تخمینی
  from information_schema.tables
 where table_schema = database() and table_type = 'BASE TABLE'
 order by table_rows desc;`,
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
  (select count(*) from users        where created_at > now(6) - interval 7 day) as کاربر_تازه,
  (select count(*) from quiz_attempts where created_at > now(6) - interval 7 day) as آزمون_عروض,
  (select count(*) from exam_attempts where created_at > now(6) - interval 7 day) as امتحان,
  (select count(*) from club_posts    where created_at > now(6) - interval 7 day) as سروده;`,
      },
      {
        title: "سؤال‌های عروض سماعی",
        description: "هر سؤال با تعداد گزینه‌ها — برای پیدا کردن سؤال ناقص.",
        sql: `select q.id,
       q.type,
       q.difficulty,
       left(coalesce((select group_concat(jt.v order by jt.ord separator ' / ')
                -- ⚠️ coalesce داخلِ json_table لازم است: poem می‌تواند NULL
                -- باشد (سؤالِ صوتی) و JSON_TABLE با NULL خطای ۱۲۱۰ می‌دهد.
                from json_table(coalesce(q.poem, cast('[]' as json)), '$[*]'
                     columns (ord for ordinality, v text path '$')) jt), ''), 60) as بیت,
       count(o.id)                              as گزینه,
       count(case when o.is_correct then 1 end)     as پاسخ_درست
  from questions q
  left join question_options o on o.question_id = q.id
 group by q.id
 having count(case when o.is_correct then 1 end) <> 1
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
          "صورت سؤال یک بیت است و گزینه‌ها فایل صوتی. " + CTE_NOTE,
        sql: `set @qid = uuid();

insert into questions (id, type, poem, difficulty)
values (
  @qid,
  'poem-to-audio',                      -- poem-to-audio | audio-to-poem | weight-to-audio
  json_array('مصراع اول', 'مصراع دوم'),       -- بیت سؤال
  'medium'                              -- easy | medium | hard
);

insert into question_options (id, question_id, audio_url, is_correct, x)
values (uuid(), @qid, '/uploads/quiz-audio/الف.mp3', true , -40),
       (uuid(), @qid, '/uploads/quiz-audio/ب.mp3',   false,  40),
       (uuid(), @qid, '/uploads/quiz-audio/ج.mp3',   false, -40),
       (uuid(), @qid, '/uploads/quiz-audio/د.mp3',   false,  40);`,
      },
      {
        title: "افزودن یک سؤال «وزن ← صوت»",
        description:
          "صورت سؤال الگوی وزن است (در عضو اول poem می‌نشیند) و گزینه‌ها فایل صوتی. " +
          CTE_NOTE,
        sql: `set @qid = uuid();

insert into questions (id, type, poem, difficulty)
values (@qid, 'weight-to-audio', json_array('فاعلاتن فاعلاتن فاعلاتن فاعلن'), 'medium');

insert into question_options (id, question_id, audio_url, is_correct, x)
values (uuid(), @qid, '/uploads/quiz-audio/الف.mp3', true , -40),
       (uuid(), @qid, '/uploads/quiz-audio/ب.mp3',   false,  40);`,
      },
      {
        title: "افزودن یک سؤال «صوت ← بیت»",
        description:
          "صورت سؤال یک فایل صوتی است و گزینه‌ها بیت‌اند. تنها نوعی که برای ورود " +
          "انبوه با SQL مناسب است، چون فقط یک فایل صوتی لازم دارد. " + CTE_NOTE,
        sql: `set @qid = uuid();

insert into questions (id, type, audio_url, difficulty)
values (@qid, 'audio-to-poem', '/uploads/quiz-audio/سؤال.mp3', 'medium');

insert into question_options (id, question_id, poem, is_correct, x)
values (uuid(), @qid, json_array('مصراع اول درست', 'مصراع دوم درست'), true , -40),
       (uuid(), @qid, json_array('مصراع اول غلط ۱', 'مصراع دوم غلط ۱'), false,  40),
       (uuid(), @qid, json_array('مصراع اول غلط ۲', 'مصراع دوم غلط ۲'), false, -40);`,
      },
      {
        title: "سؤال‌های ناقص را پیدا کن",
        description:
          "سؤالی که پاسخ درست ندارد یا دو پاسخ درست دارد، در بازی خراب دیده می‌شود. این کوئری همه‌شان را می‌آورد.",
        sql: `select q.id, q.type, count(o.id) as گزینه,
       count(case when o.is_correct then 1 end) as پاسخ_درست
  from questions q
  left join question_options o on o.question_id = q.id
 group by q.id
having count(case when o.is_correct then 1 end) <> 1
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
   set email_verified_at = now(6)
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
   set revoked_at = now(6)
 where revoked_at is null
   and user_id = (select id from users where email = 'someone@example.com');`,
      },
      {
        title: "دستگاه‌های فعالِ یک کاربر",
        description:
          "هر ردیف یک دستگاه است، نه یک بار تازه‌سازی. سشن‌هایی که چرخیده‌اند باطل‌اند و اینجا نمی‌آیند.",
        sql: `select s.created_at as \`ورود\`,
       s.last_used_at as \`آخرین استفاده\`,
       s.user_agent as \`مرورگر\`,
       s.ip as \`آی‌پی\`
  from sessions s
  join users u on u.id = s.user_id
 where u.email = 'someone@example.com'
   and s.revoked_at is null
   and s.expires_at > now(6)
 order by coalesce(s.last_used_at, s.created_at) desc;`,
      },
      {
        title: "تاریخچهٔ کاملِ یک دستگاه",
        description:
          "هر بار تازه‌سازی یک ردیف تازه می‌سازد و قبلی را می‌سوزاند (rotated_to). زنجیره را از پایین به بالا بخوانید. اگر زنجیره‌ای ناگهان کامل باطل شده باشد، یعنی توکنِ سوخته‌ای دوباره استفاده شده — خودِ رویداد در لاگ با نام auth.refresh.reuse_detected ثبت می‌شود.",
        sql: `select s.created_at as \`ورود\`,
       s.last_used_at as \`استفاده\`,
       s.revoked_at as \`باطل شد\`,
       case when s.rotated_to is not null then 'چرخید' else '—' end as \`سرنوشت\`,
       s.user_agent as \`مرورگر\`
  from sessions s
  join users u on u.id = s.user_id
 where u.email = 'someone@example.com'
   -- ⚠️ ستونِ family_id از نوع CHAR(36) با collation اسکی است و رشتهٔ
   --    نوشته‌شده در ویرایشگر utf8mb4. بدون collate صریح، MySQL با
   --    «Illegal mix of collations» رد می‌کند.
   and s.family_id = convert('00000000-0000-0000-0000-000000000000' using ascii)
 order by s.created_at;`,
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
  (id, source_id, phrase, correct_pattern, wrong_pattern, difficulty, explanation, is_published, sort_index)
values
  (uuid(), 1001, 'عبارت نمونهٔ یک', 'U - - ', 'U U - ', 2, 'توضیح کوتاه', true, 0),
  (uuid(), 1002, 'عبارت نمونهٔ دو', '- U - ', '- - U ', 3, null,          true, 1)
as new
on duplicate key update
  phrase          = new.phrase,
  correct_pattern = new.correct_pattern,
  wrong_pattern   = new.wrong_pattern,
  difficulty      = new.difficulty,
  explanation     = new.explanation,
  is_published    = new.is_published;`,
      },
      {
        title: "جفت‌های ادبی — افزودن انبوه",
        description:
          "grade: dahom | yazdahom | davazdahom — term: dey (دی) | khordad (خرداد). «اثر» در هر دسته یکتاست، پس on conflict می‌گذارد دوباره اجرا کنید بی‌آنکه تکراری بسازد.",
        sql: `insert into memory_pairs (id, grade, term, work, author, sort_index)
values
  (uuid(), 'dahom', 'dey', 'نام اثر یک', 'نام پدیدآورنده', 0),
  (uuid(), 'dahom', 'dey', 'نام اثر دو', 'نام پدیدآورنده', 1)
as new
on duplicate key update
  author     = new.author,
  sort_index = new.sort_index;`,
      },
      {
        title: "نینجای دستور — نقش تازه با کلماتش",
        description: "نقش و کلماتش با هم، بدون کپی کردنِ دستیِ شناسه. " + CTE_NOTE,
        sql: `set @cid = uuid();

insert into ninja_categories (id, label, hint, enabled, sort_index)
values (@cid, 'نهاد', 'کننده یا پذیرندهٔ کار', true, 0);

-- «word = word» یعنی هیچ کاری نکن: معادلِ do nothing، ولی بر خلاف
-- INSERT IGNORE فقط نقضِ کلید یکتا را می‌بلعد و بقیهٔ خطاها را بالا می‌دهد.
insert into ninja_words (id, category_id, word, sort_index)
values (uuid(), @cid, 'کلمهٔ یک', 0),
       (uuid(), @cid, 'کلمهٔ دو', 1),
       (uuid(), @cid, 'کلمهٔ سه', 2)
on duplicate key update word = word;`,
      },
      {
        title: "جاسوسِ نقش‌ها — یک پرونده با مظنون‌هایش",
        description:
          "دقیقاً یکی از مظنون‌ها باید is_spy باشد. category: «دستوری» یا «آرایه» — content_type: «poem» یا «prose».",
        sql: `-- ⚠️ jasoos_levels تنها جدولی است که شناسه‌اش عددی و AUTO_INCREMENT
-- است. اینجا id نوشته نمی‌شود تا خودِ دیتابیس بدهد، و بعد با
-- LAST_INSERT_ID خوانده می‌شود. هر دو دستور را با هم اجرا کنید — آن تابع
-- مقدارش را برای هر اتصال جدا نگه می‌دارد.
insert into jasoos_levels
  (title, category, content_type, verse_line_1, verse_line_2, is_published, sort_index)
values ('عنوان پرونده', 'دستوری', 'poem',
        'مصراع اول', 'مصراع دوم', true, 0);

insert into jasoos_suspects
  (id, level_id, role, is_spy, evidence, word_in_verse, sort_index)
values (uuid(), last_insert_id(), 'نهاد',  false, 'دلیل بی‌گناهی',   'واژه', 0),
       (uuid(), last_insert_id(), 'مفعول', true , 'دلیلِ مجرم بودن', 'واژه', 1),
       (uuid(), last_insert_id(), 'قید',   false, 'دلیل بی‌گناهی',   'واژه', 2);`,
      },
      {
        title: "مدار دستور — چه چیزی داریم؟",
        description:
          "اول این را بزنید. شمارِ پرسشِ منتشرشده و منتشرنشده به تفکیکِ پایه و درس — تا بدانید کجا کم دارید و کجا چیزی منتظرِ انتشار مانده.",
        sql: `select grade, lesson,
       count(*)                                as همه,
       count(case when is_published then 1 end)    as منتشرشده,
       count(case when not is_published then 1 end) as پیش‌نویس
  from grammar_circuit_questions
 group by grade, lesson
 order by grade, lesson;`,
      },
      {
        title: "مدار دستور — دیدنِ یک پرسش",
        description:
          "متنِ جمله از داخلِ payload بیرون کشیده می‌شود، پس لازم نیست jsonb را با چشم بخوانید. برای پیدا کردنِ پرسشی که می‌خواهید عوضش کنید.",
        sql: `select source_id, grade, lesson, question_type, difficulty, is_published,
       -- معادلِ jsonb_array_elements + string_agg: JSON_TABLE آرایه را به
       -- ردیف باز می‌کند و GROUP_CONCAT دوباره جمعشان می‌کند. «for ordinality»
       -- و «order by» اختیاری نیستند — بدونشان ترتیبِ واژه‌ها تضمین ندارد.
       (select group_concat(x.txt order by x.ord separator ' ')
          from json_table(payload, '$.tokens[*]'
               columns (ord for ordinality, txt text path '$.text')) x)
         as جمله
  from grammar_circuit_questions
 where grade = 'yazdahom'      -- dahom | yazdahom | davazdahom
   and lesson = 1
 order by sort_index, source_id;`,
      },
      {
        title: "مدار دستور — انتشار / لغو انتشار",
        description:
          "امن‌ترین تغییر. با is_published = false پرسش از بازی کنار می‌رود بی‌آنکه پاک شود — برای وقتی به ایرادی مشکوکید ولی نمی‌خواهید از دستش بدهید.",
        sql: `update grammar_circuit_questions
   set is_published = true
 where grade = 'davazdahom'   -- dahom | yazdahom | davazdahom
   and lesson = 3
   and is_published = false;`,
      },
      {
        title: "مدار دستور — حذف",
        description:
          "⚠️ برگشت‌ناپذیر. اول همان where را با یک select امتحان کنید تا ببینید چند ردیف می‌گیرد. اگر فقط می‌خواهید پرسش از بازی برود، «لغو انتشار» بهتر است.",
        sql: `-- گامِ اول: ببینید چه چیزی پاک می‌شود
select source_id, grade, lesson from grammar_circuit_questions
 where source_id = 'gc-y11-l1-b01-1-1';

-- گامِ دوم: اگر درست بود، همان where را اینجا بگذارید
-- delete from grammar_circuit_questions
--  where source_id = 'gc-y11-l1-b01-1-1';`,
      },
      {
        title: "مدار دستور — جابه‌جایی درس و ترتیب",
        description:
          "پرسشی که اشتباه در درسِ دیگری نشسته، یا باید بالاتر بیاید. هیچ‌کدامِ این‌ها به payload دست نمی‌زنند، پس بی‌خطرند.",
        sql: `-- بردنِ چند پرسش به درسِ دیگر
update grammar_circuit_questions
   set lesson = 4
 where grade = 'yazdahom' and source_id in ('gc-y11-l1-b01-1-1');

-- بالا بردنِ یک پرسش در ترتیبِ همان درس
-- update grammar_circuit_questions set sort_index = 0
--  where source_id = 'gc-y11-l1-b01-1-1';`,
      },
      {
        title: "مدار دستور — سختی و توضیح",
        description:
          "difficulty عددی از ۱ تا ۵ است و explanation متنی است که بعد از پاسخ نشان داده می‌شود. هر دو متنِ ساده‌اند و اعتبارسنجی نمی‌خواهند.",
        sql: `update grammar_circuit_questions
   set difficulty = 3,
       explanation = 'توضیحِ تازه'
 where source_id = 'gc-y11-l1-b01-1-1';`,
      },
      {
        title: "مدار دستور — افزودنِ پرسشِ تازه",
        description:
          "⚠️ این یکی را با SQL نزنید. ستونِ payload یک jsonb با ساختارِ دقیق است (roleDefinitions و tokens و pieces و circuitOrder) و پیش از نمایش اعتبارسنجی می‌شود — از جمله آزمونِ اینکه پرسش اصلاً حل‌شدنی هست یا در بن‌بست می‌افتد. یک payloadِ دست‌نویس که از آن آزمون رد نشود، بی‌صدا از بازی کنار می‌رود: در جدول هست ولی هیچ‌وقت دیده نمی‌شود. دو راهِ درست پایین آمده.",
        sql: `-- راهِ یک: پنل مدیریت ← بازی‌ها ← مدار دستور ← «پرسشِ تازه»
--   فرم همان اعتبارسنج را قبل از ذخیره اجرا می‌کند.
--
-- راهِ دو (برای افزودنِ انبوه): یک فایل JSON در
--   lib/grammar-circuit/seed-data/ بگذارید و بزنید
--     npm run db:seed-grammar-circuit
--   هر پرسش پیش از نوشتن اعتبارسنجی می‌شود و source_id یکتاست،
--   پس اجرای دوباره ردیف‌ها را *به‌روز* می‌کند نه تکراری.
--   شکلِ فایل در lib/grammar-circuit/seed-data/README.md است.
--
-- بعد از هر افزودن، این را بزنید تا مطمئن شوید بازی می‌بیندشان:
select grade, lesson, count(*) from grammar_circuit_questions
 where is_published group by grade, lesson order by grade, lesson;`,
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
        description: "اسکلتِ خالی، تا بعد سؤال‌هایش را از پنل بنویسید. " + CTE_NOTE,
        sql: `set @eid = uuid();

insert into exams (id, subject, grade, title, exam_session, total_score)
values (@eid, 'فارسی', 12, 'فارسی ۳ — خرداد ۱۴۰۴', 'خرداد ۱۴۰۴', 20);

insert into exam_sections (id, exam_id, title, order_index, section_score)
values (uuid(), @eid, 'قلمرو زبانی', 0, 7.0),
       (uuid(), @eid, 'قلمرو ادبی',  1, 6.0),
       (uuid(), @eid, 'قلمرو فکری',  2, 7.0);`,
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
       published_at = coalesce(published_at, now(6)),
       reviewed_at = now(6)
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
  now(6) + interval 6 hour,
  now(6) + interval 30 hour
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
   and last_seen_at < now(6) - interval 90 day;`,
      },
      {
        title: "پاک کردن سشن‌های منقضی",
        description:
          "ردیف‌هایی که دیگر هیچ کاری نمی‌کنند و فقط جا می‌گیرند. حلقه‌های سوختهٔ چرخش هم همین‌جا می‌روند: هر تازه‌سازی یک ردیف تازه می‌سازد، پس یک کاربرِ همیشه‌آنلاین در ماه چند هزار ردیف به جا می‌گذارد. نگه داشتنشان تا انقضای خانواده عمدی است — همان‌هاست که استفادهٔ مجدد را قابل تشخیص می‌کند.",
        sql: `delete from sessions
 where expires_at < now(6) - interval 30 day;`,
      },
      {
        title: "بزرگ‌ترین جدول‌ها",
        description:
          "وقتی می‌خواهید بدانید فضای دیسک کجا رفته. داده و index جدا آمده‌اند، چون " +
          "گاهی index از خودِ جدول بزرگ‌تر است.",
        sql: `select table_name as جدول,
       round((data_length + index_length) / 1024 / 1024, 1) as کل_مگابایت,
       round(data_length  / 1024 / 1024, 1)                 as داده,
       round(index_length / 1024 / 1024, 1)                 as ایندکس
  from information_schema.tables
 where table_schema = database() and table_type = 'BASE TABLE'
 order by data_length + index_length desc
 limit 15;`,
      },
    ],
  },
];
