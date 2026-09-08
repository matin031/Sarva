/**
 * قواعد نگاشت نوع PostgreSQL → MySQL 8 برای سروا.
 *
 * این فایل «تصمیم‌ها» را نگه می‌دارد و gen-schema.mjs فقط اجرایشان می‌کند. هر
 * تصمیمی که اینجا نوشته شده یک دلیل دارد و دلیلش کنارش آمده، چون نیمی از
 * باگ‌های یک مهاجرت از جایی می‌آید که کسی بعداً نمی‌داند چرا ستونی این شکلی شد.
 *
 * ⚠️ این نگاشت روی MySQL 8.0.46 آزموده شده است. رفتار collation ها تجربی
 * سنجیده شد (نه از روی مستندات):
 *
 *   • ی/ي و ک/ك در هیچ‌یک از utf8mb4_0900_{ai_ci,as_ci,as_cs,bin} یکی نمی‌شوند.
 *     نگرانیِ «collation فارسی را خراب می‌کند» برای همین دو جفت بی‌مورد بود.
 *   • ولی ai_ci و as_ci هر دو برای لاتین case-insensitive اند — که برای کلیدهای
 *     محتوا (source_id، key، word) خرابیِ واقعی است.
 *   • همهٔ utf8mb4_0900_* از نوع NO PAD اند، یعنی 'a' <> 'a ' — مثل Postgres.
 *     برعکسِ utf8mb4_general_ci قدیمی که PAD SPACE است و 'a' = 'a ' می‌دهد.
 *
 * و citext در مبدأ این رفتار را دارد (روی همان دیتابیس آزموده شد):
 *
 *     'Ali@X.com' = 'ali@x.com'  → true   (case-insensitive)
 *     'e'         = 'é'          → false  (accent-SENSITIVE)
 *     'a'         = 'a '         → false  (NO PAD)
 *
 * که دقیقاً یعنی utf8mb4_0900_as_ci، نه ai_ci.
 */

// ---------------------------------------------------------------------------
// collation ها
// ---------------------------------------------------------------------------

/** متن عمومی. case و accent هر دو معنادار — نزدیک‌ترین چیز به text در Postgres. */
export const TEXT_COLLATION = "utf8mb4_0900_as_cs";

/** فقط برای سه ستون ایمیل که در مبدأ citext اند. معادل دقیق citext. */
export const CITEXT_COLLATION = "utf8mb4_0900_as_ci";

/**
 * UUID. ascii است نه utf8mb4، به دو دلیل:
 *
 *   ۱) طول index: در utf8mb4 هر نویسه ۴ بایت حساب می‌شود، پس CHAR(36) می‌شود
 *      ۱۴۴ بایت. سقف prefix در InnoDB با row_format=DYNAMIC برابر ۳۰۷۲ بایت
 *      است؛ یک index مرکب چهارستونی از UUID ها همان‌جا رد می‌شود. با ascii
 *      همان ستون ۳۶ بایت است.
 *   ۲) هیچ UUID ای نویسهٔ غیر-ascii ندارد، پس چیزی از دست نمی‌رود.
 *
 * و چرا general_ci و نه bin: در Postgres نوع uuid یک مقدار ۱۲۸بیتی است و
 * 'A2B...' و 'a2b...' *همان* UUID اند — مقایسه‌شان true است. اگر اینجا bin
 * می‌گذاشتیم، رفتار عوض می‌شد. general_ci همان معنا را می‌دهد.
 */
export const UUID_TYPE = "CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci";

/**
 * هش‌ها و توکن‌ها: hex/base64url اند، پس ascii. bin چون این‌ها را باید
 * بایت‌به‌بایت مقایسه کرد؛ یک تطابق case-insensitive روی هش یعنی ضعیف کردن
 * فضای جست‌وجو.
 */
export const HASH_TYPE = (n) => `VARCHAR(${n}) CHARACTER SET ascii COLLATE ascii_bin`;

/**
 * inet. طولانی‌ترین حالت: IPv6 با scope و prefix.
 * '0000:...:0000%4294967295/128' → ۴۹ نویسه کافی است.
 *
 * ⚠️ Postgres inet می‌تواند prefix شبکه داشته باشد ('10.0.0.0/8'). متن canonical
 * همان چیزی است که host() نمی‌دهد — پس در ETL از `text(ip)` استفاده می‌شود نه
 * `host(ip)`، وگرنه prefix بی‌صدا حذف می‌شود.
 */
export const INET_TYPE = "VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci";

// ---------------------------------------------------------------------------
// طول ستون‌های متنیِ index دار
// ---------------------------------------------------------------------------

/**
 * در Postgres، text نامحدود است و index هم رویش کار می‌کند. در MySQL یک ستون
 * TEXT فقط با prefix ایندکس می‌شود (`key (col(191))`) و prefix روی UNIQUE یعنی
 * «دو مقدارِ متفاوت که ۱۹۱ نویسهٔ اولشان یکی است، تکراری حساب می‌شوند» — یعنی
 * تغییر رفتار. پس هر ستون متنی که در قید یا index شرکت دارد باید VARCHAR با طول
 * صریح شود.
 *
 * طول‌ها اینجا صریح‌اند و نه یک عدد جادوییِ سراسری، چون انتخابِ ۱۹۱ برای همه
 * دو جور خراب می‌کند: برای email کوتاه است و برای area بیهوده بلند.
 *
 * سقف: با row_format=DYNAMIC هر ستونِ index شده حداکثر ۳۰۷۲ بایت، و مجموع یک
 * index مرکب هم ۳۰۷۲ بایت. gen-schema این را حساب می‌کند و اگر رد شود خطا
 * می‌دهد — نه اینکه بی‌صدا کوتاه کند.
 */
export const TEXT_LENGTHS = {
  // ایمیل — سقف استاندارد RFC 5321 برابر ۳۲۰ است
  "users.email": 320,
  "email_otps.email": 320,
  "user_identities.email": 320,

  // کلیدهای تنظیمات و rate-limit. PK اند، پس باید VARCHAR باشند.
  "app_settings.key": 191,
  "rate_limits.key": 191,
  "schema_migrations.name": 191,

  // هش‌ها: sha256 در hex = ۶۴ نویسه. ۱۲۸ فضای تغییر الگوریتم را می‌دهد.
  "sessions.refresh_token_hash": 128,
  "password_resets.token_hash": 128,
  "email_otps.code_hash": 128,

  // کلیدهای محتوا (unique یا در index)
  "grammar_circuit_questions.source_id": 191,
  "ninja_categories.label": 191,
  "ninja_words.word": 191,
  "memory_pairs.work": 191,
  "user_bookmarks.ref_id": 191,
  "user_identities.provider_account_id": 191,
  "exams.exam_session": 191,

  // مقادیر محدود به CHECK — کوتاه‌اند و کوتاه ماندنشان بی‌خطر است
  "users.role": 16,
  "email_otps.purpose": 32,
  "user_identities.provider": 32,
  "user_bookmarks.area": 32,
  "questions.type": 64,
  "questions.difficulty": 16,
  "club_posts.status": 16,
  "club_posts.form": 32,
  "club_comments.status": 16,
  "club_reports.status": 16,
  "club_reports.target_type": 16,
  "club_reports.reason": 32,
  "content_reports.area": 32,
  "content_reports.status": 16,
  "content_reports.reason": 32,
  "memory_pairs.grade": 16,
  "memory_pairs.term": 16,
  "vocab_words.grade": 16,
  "grammar_circuit_questions.grade": 16,
  "grammar_circuit_questions.question_type": 16,
  "site_announcements.tone": 16,
  "site_supporters.tier": 16,
  "sms_log.status": 16,
  "jasoos_levels.category": 32,
  "jasoos_levels.content_type": 16,

  // ---------------------------------------------------------------------
  // ستون‌های متنیِ NOT NULL با DEFAULT ''
  // ---------------------------------------------------------------------
  // این‌ها در مبدأ text با `default ''` اند. MySQL روی TEXT اجازهٔ DEFAULT
  // نمی‌دهد (خطای ۱۱۰۱)، پس یا باید VARCHAR شوند یا DEFAULT را از دست بدهند.
  //
  // از دست دادن DEFAULT گزینه نیست: ستون NOT NULL است و هر INSERT ای که این
  // ستون را ننویسد — که کدِ فعلی در چند جا می‌کند — با خطا رد می‌شد.
  //
  // پس VARCHAR، با طولی که از معنای ستون می‌آید نه از یک عدد پیش‌فرض.
  // preflight در ابزار ETL طول واقعی داده‌های مبدأ را با همین سقف‌ها مقایسه
  // می‌کند و اگر چیزی رد شود، قبل از انتقال خطا می‌دهد — بریدنِ بی‌صدا نداریم.
  "vocab_words.image": 1024, // مسیر یا URL تصویر
  "vocab_answers.image": 1024, // snapshot همان مسیر
  "jasoos_levels.verse_line_2": 512, // مصرع دوم
  "jasoos_suspects.word_in_verse": 191, // یک واژه
  "ninja_categories.hint": 512, // یک جملهٔ راهنما

  // observability — در index هستند
  "app_error_log.fingerprint": 191,
  "app_error_log.release": 191,
  "app_error_log.last_request_id": 64,
  "admin_audit_log.request_id": 64,
  "admin_audit_log.action": 128,
  "admin_audit_log.target_type": 64,
  "admin_audit_log.target_id": 191,
  "content_reports.target_id": 191,
};

/** ستون‌هایی که باید ascii باشند (هش/شناسه)، نه utf8mb4. */
export const ASCII_COLUMNS = new Set([
  "sessions.refresh_token_hash",
  "password_resets.token_hash",
  "email_otps.code_hash",
  "app_error_log.last_request_id",
  "app_error_log.first_request_id",
  "admin_audit_log.request_id",
  "content_reports.request_id",
]);

/** ستون‌های citext در مبدأ. */
export const CITEXT_COLUMNS = new Set([
  "users.email",
  "email_otps.email",
  "user_identities.email",
]);

// ---------------------------------------------------------------------------
// ترتیب جدول‌ها برای FK
// ---------------------------------------------------------------------------

/**
 * ترتیبی که هم برای CREATE TABLE و هم برای بارگذاری داده در ETL کار می‌کند:
 * هر جدول بعد از جدول‌هایی می‌آید که به آن‌ها ارجاع دارد.
 *
 * دو خودارجاعی اینجا حل نمی‌شوند و در ETL دو مرحله‌ای‌اند:
 *   • sessions.rotated_to → sessions
 *   • club_comments.parent_id / reply_to_id → club_comments
 */
export const TABLE_ORDER = [
  "schema_migrations",
  "users",
  "sessions",
  "email_otps",
  "password_resets",
  "user_identities",
  "app_settings",
  "sms_log",
  "rate_limits",
  "admin_audit_log",
  "app_error_log",
  "exams",
  "exam_sections",
  "exam_questions",
  "exam_question_parts",
  "exam_question_options",
  "exam_attempts",
  "questions",
  "question_options",
  "user_answers",
  "quiz_attempts",
  "quiz_attempt_answers",
  "vocab_words",
  "vocab_answers",
  "jasoos_levels",
  "jasoos_suspects",
  "jasoos_answers",
  "user_bookmarks",
  "club_posts",
  "club_comments",
  "club_likes",
  "club_reports",
  "aruz_bridge_questions",
  "grammar_circuit_questions",
  "memory_pairs",
  "ninja_categories",
  "ninja_words",
  "site_announcements",
  "site_supporters",
  "content_reports",
];

/**
 * جدول‌هایی که کنسول SQL مدیر هرگز نباید بنویسدشان.
 * (اینجا نگه داشته می‌شود تا هم DDL و هم guard از یک منبع بخوانند.)
 */
export const PROTECTED_TABLES = ["admin_audit_log", "schema_migrations"];

// ---------------------------------------------------------------------------
// نگاشت پایه
// ---------------------------------------------------------------------------

/**
 * نوع MySQL برای یک ستون.
 *
 * @param {string} table
 * @param {string} column
 * @param {string} pgType  خروجی format_type()
 * @param {boolean} indexed  آیا ستون در هیچ index/قیدی هست؟
 * @param {boolean} hasDefault  آیا ستون DEFAULT دارد؟ (TEXT در MySQL نمی‌تواند)
 * @param {Map<string,string[]>} enums  نام enum → مقادیر
 */
export function mysqlType(table, column, pgType, indexed, enums, hasDefault = false) {
  const key = `${table}.${column}`;

  if (pgType === "uuid") return UUID_TYPE;
  if (pgType === "inet") return INET_TYPE;
  if (pgType === "jsonb" || pgType === "json") return "JSON";
  // آرایهٔ متن → آرایهٔ JSON. ترتیب در JSON array حفظ می‌شود، برخلاف
  // آنچه دربارهٔ کلیدهای object صادق است.
  if (pgType === "text[]") return "JSON";
  if (pgType === "date") return "DATE";
  if (pgType === "boolean") return "TINYINT(1)";
  if (pgType === "smallint") return "SMALLINT";
  if (pgType === "integer") return "INT";
  if (pgType === "bigint") return "BIGINT";
  if (pgType === "double precision") return "DOUBLE";
  if (pgType === "real") return "FLOAT";

  // timestamptz → DATETIME(6) با قرارداد «همیشه UTC».
  //
  // چرا DATETIME و نه TIMESTAMP: TIMESTAMP در MySQL فقط تا ۲۰۳۸ می‌رود و
  // مقدارش را بر اساس time_zone نشست تبدیل می‌کند — یعنی همان ستون از دو
  // اتصال با tz متفاوت، دو مقدار می‌دهد. DATETIME مقدار را دست‌نخورده نگه
  // می‌دارد و ما تضمین می‌کنیم که چیزی که داخلش می‌رود UTC است.
  //
  // (6) چون timestamptz دقت میکروثانیه دارد. با (3) میکروثانیه‌ها بی‌صدا
  // گرد می‌شدند.
  if (pgType.startsWith("timestamp")) return "DATETIME(6)";

  const numeric = /^numeric\((\d+),(\d+)\)$/.exec(pgType);
  if (numeric) return `DECIMAL(${numeric[1]},${numeric[2]})`;
  if (pgType === "numeric") return "DECIMAL(20,6)";

  if (enums.has(pgType)) {
    const values = enums.get(pgType).map((v) => `'${v.replace(/'/g, "''")}'`);
    return `ENUM(${values.join(",")})`;
  }

  if (pgType === "citext") {
    const n = TEXT_LENGTHS[key] ?? 320;
    return `VARCHAR(${n}) CHARACTER SET utf8mb4 COLLATE ${CITEXT_COLLATION}`;
  }

  if (pgType === "text" || pgType.startsWith("character varying")) {
    const n = TEXT_LENGTHS[key];
    if (n !== undefined) {
      if (ASCII_COLUMNS.has(key)) return HASH_TYPE(n);
      return `VARCHAR(${n}) CHARACTER SET utf8mb4 COLLATE ${TEXT_COLLATION}`;
    }
    if (indexed) {
      throw new Error(
        `ستون متنیِ index دار بدون طول صریح: ${key}. ` +
          `یک مقدار در TEXT_LENGTHS بگذار — prefix index روی UNIQUE رفتار را عوض می‌کند.`,
      );
    }
    if (hasDefault) {
      throw new Error(
        `ستون متنی با DEFAULT بدون طول صریح: ${key}. ` +
          `MySQL روی TEXT اجازهٔ DEFAULT نمی‌دهد (خطای ۱۱۰۱)؛ یک طول در ` +
          `TEXT_LENGTHS بگذار تا VARCHAR شود.`,
      );
    }
    if (ASCII_COLUMNS.has(key)) return "TEXT CHARACTER SET ascii COLLATE ascii_bin";
    return `TEXT CHARACTER SET utf8mb4 COLLATE ${TEXT_COLLATION}`;
  }

  throw new Error(`نوع نگاشت‌نشده: ${key} :: ${pgType}`);
}

/** تعداد بایتی که یک ستون در index می‌گیرد — برای بررسی سقف ۳۰۷۲ بایت. */
export function indexBytes(mysqlTypeStr) {
  const varchar = /^VARCHAR\((\d+)\)/.exec(mysqlTypeStr);
  if (varchar) {
    const chars = Number(varchar[1]);
    return /CHARACTER SET ascii/.test(mysqlTypeStr) ? chars : chars * 4;
  }
  const char = /^CHAR\((\d+)\)/.exec(mysqlTypeStr);
  if (char) {
    const chars = Number(char[1]);
    return /CHARACTER SET ascii/.test(mysqlTypeStr) ? chars : chars * 4;
  }
  if (mysqlTypeStr.startsWith("TEXT")) return 3072; // فقط با prefix
  if (mysqlTypeStr.startsWith("DATETIME")) return 8;
  if (mysqlTypeStr.startsWith("DATE")) return 3;
  if (mysqlTypeStr.startsWith("TINYINT")) return 1;
  if (mysqlTypeStr.startsWith("SMALLINT")) return 2;
  if (mysqlTypeStr.startsWith("INT")) return 4;
  if (mysqlTypeStr.startsWith("BIGINT")) return 8;
  if (mysqlTypeStr.startsWith("DOUBLE")) return 8;
  if (mysqlTypeStr.startsWith("FLOAT")) return 4;
  if (mysqlTypeStr.startsWith("DECIMAL")) return 16;
  if (mysqlTypeStr.startsWith("ENUM")) return 2;
  if (mysqlTypeStr === "JSON") return 3072;
  return 3072;
}

/** DEFAULT معادل، یا null اگر نباید default داشته باشد. */
export function mysqlDefault(table, column, pgDefault, mysqlTypeStr) {
  if (!pgDefault || pgDefault === "-") return null;

  // gen_random_uuid(): در MySQL معادل مستقیم ندارد (UUID() نسخهٔ ۱ است و
  // ترتیبی/مبتنی بر MAC، نه تصادفی). به‌جای ساختن یک default نادرست، UUID را
  // اپ می‌سازد — crypto.randomUUID() که همان نسخهٔ ۴ است.
  //
  // این یعنی هر INSERT باید id بدهد. gen-schema این ستون‌ها را در manifest
  // علامت می‌زند تا هیچ‌کدام از قلم نیفتند.
  if (/gen_random_uuid\(\)/.test(pgDefault)) return null;

  if (/^now\(\)$/.test(pgDefault)) return "CURRENT_TIMESTAMP(6)";

  // '{}'::jsonb → در MySQL default برای JSON باید پرانتزدار باشد
  const jsonLit = /^'(.*)'::jsonb$/.exec(pgDefault);
  if (jsonLit) return `(_utf8mb4'${jsonLit[1].replace(/'/g, "''")}')`;

  // ⚠️ '{}'::text[] یک آرایهٔ **خالی** است، نه یک object خالی. نگاشتش `[]` است
  // و نه `{}`. اگر `{}` می‌شد، JSON_LENGTH صفر می‌داد و ظاهراً درست به نظر
  // می‌رسید، ولی `JSON_TYPE` می‌شد OBJECT و هر کدی که آرایه انتظار دارد —
  // از جمله فیلترِ tag در فید کلاب — بی‌صدا هیچ نتیجه‌ای نمی‌داد.
  const arrLit = /^'(.*)'::(?:text|character varying)\[\]$/.exec(pgDefault);
  if (arrLit) {
    if (arrLit[1] !== "{}") {
      throw new Error(
        `آرایهٔ ناتهی به‌عنوان DEFAULT در ${table}.${column}: ${pgDefault} — ` +
          `دستی نگاشتش کن.`,
      );
    }
    return "(_utf8mb4'[]')";
  }

  const strLit = /^'(.*)'::(text|citext|character varying)$/.exec(pgDefault);
  if (strLit) return `'${strLit[1].replace(/'/g, "''")}'`;

  // '...'::question_part_type و مانندش
  const enumLit = /^'(.*)'::[a-z_]+$/.exec(pgDefault);
  if (enumLit && mysqlTypeStr.startsWith("ENUM")) return `'${enumLit[1]}'`;

  if (pgDefault === "true") return "1";
  if (pgDefault === "false") return "0";
  if (/^-?\d+$/.test(pgDefault)) return pgDefault;
  if (/^-?\d+\.\d+$/.test(pgDefault)) return pgDefault;

  // (0)::numeric و مانندش
  const numCast = /^\(?(-?\d+(?:\.\d+)?)\)?::(numeric|integer|smallint|bigint)$/.exec(pgDefault);
  if (numCast) return numCast[1];

  const plainStr = /^'(.*)'$/.exec(pgDefault);
  if (plainStr) return `'${plainStr[1].replace(/'/g, "''")}'`;

  throw new Error(`DEFAULT نگاشت‌نشده: ${table}.${column} = ${pgDefault}`);
}
