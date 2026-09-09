/**
 * index هایی که ترجمهٔ خودکار ندارند.
 *
 * هر ورودی اینجا یک index از مبدأ است که در MySQL معادل مستقیم ندارد. عمداً
 * دستی نوشته شده‌اند و نه با تبدیل خودکارِ predicate، چون یک مترجمِ عمومیِ
 * partial-index یا خطا می‌دهد یا بدتر: چیزی می‌سازد که شبیه معادل است ولی
 * تضمینِ متفاوتی می‌دهد. اینجا هر تصمیم دیده و امضا می‌شود.
 *
 * هر مورد روی MySQL 8.0.46 آزموده شده است.
 */

/**
 * ستون‌های محاسباتی که فقط برای بازسازی یک partial index وجود دارند.
 * VIRTUAL اند، یعنی جا نمی‌گیرند و فقط در index مادی می‌شوند.
 */
export const GENERATED_COLUMNS = {
  app_error_log: [
    {
      name: "fingerprint_open",
      // partial UNIQUE مبدأ: unique (fingerprint) where resolved_at is null
      //
      // چرا این کار می‌کند: MySQL در UNIQUE چند NULL را مجاز می‌داند. پس
      // ردیف‌های حل‌شده همه NULL می‌گیرند و با هم برخورد نمی‌کنند، ولی دو
      // خطای بازِ هم‌اثرانگشت به یک مقدار می‌رسند و رد می‌شوند.
      //
      // ⚠️ UNIQUE(fingerprint, resolved_at) به‌تنهایی این را نمی‌دهد: آنجا هم
      // دو ردیفِ باز هر دو resolved_at=NULL دارند و چون NULL با NULL برابر
      // نیست، هر دو پذیرفته می‌شوند — یعنی دقیقاً همان چیزی که باید جلویش
      // گرفته شود.
      definition:
        "VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin " +
        "GENERATED ALWAYS AS (IF(`resolved_at` IS NULL, `fingerprint`, NULL)) VIRTUAL",
    },
  ],
  jasoos_suspects: [
    {
      name: "spy_level_id",
      // partial UNIQUE مبدأ: unique (level_id) where is_spy
      // یعنی هر مرحله دقیقاً یک جاسوس دارد.
      definition:
        "INT GENERATED ALWAYS AS (IF(`is_spy` = 1, `level_id`, NULL)) VIRTUAL",
    },
  ],
  club_posts: [
    {
      // برای بازسازی «published_at DESC NULLS LAST».
      //
      // Postgres در DESC پیش‌فرض NULLS FIRST می‌دهد و این index صریحاً
      // NULLS LAST خواسته. MySQL در DESC، NULL ها را آخر می‌گذارد ولی این
      // را در index نمی‌شود اعلام کرد؛ با یک ستونِ صفر/یک، هم index و هم
      // ORDER BY کوئری یک شکل می‌شوند و optimizer می‌تواند index را بخواند.
      name: "published_at_is_null",
      definition: "TINYINT(1) GENERATED ALWAYS AS (`published_at` IS NULL) VIRTUAL",
    },
  ],
};

/**
 * index هایی که به‌جای ترجمهٔ خودکار، متن MySQL شان صریح آمده.
 * کلید = نام index در مبدأ.
 */
export const INDEX_OVERRIDES = {
  // --- partial UNIQUE ها ---------------------------------------------------

  // unique (exam_session) where exam_session is not null
  //
  // اینجا override لازم است ولی نه برای ساختن چیز تازه: در MySQL یک UNIQUE
  // معمولی چند NULL را می‌پذیرد، پس `unique (exam_session)` *دقیقاً* همان
  // partial unique مبدأ است. صریح نوشته شده تا کسی بعداً فکر نکند از قلم افتاده.
  exams_session_idx: "UNIQUE KEY `exams_session_idx` (`exam_session`)",

  app_error_fingerprint_idx: "UNIQUE KEY `app_error_fingerprint_idx` (`fingerprint_open`)",

  jasoos_suspects_one_spy: "UNIQUE KEY `jasoos_suspects_one_spy` (`spy_level_id`)",

  // --- partial index های غیر-unique ---------------------------------------
  //
  // الگو: ستون‌های predicate جلوی index می‌آیند. index بزرگ‌تر از partial
  // می‌شود (ردیف‌های بی‌ربط هم داخلش‌اند) ولی همان کوئری‌ها را پوشش می‌دهد،
  // چون شرطِ predicate روی ستون پیشرو یک جست‌وجوی برابری/بازه است.

  sessions_expires_idx: "KEY `sessions_expires_idx` (`revoked_at`, `expires_at`)",
  sessions_family_idx: "KEY `sessions_family_idx` (`revoked_at`, `family_id`)",
  app_error_open_idx: "KEY `app_error_open_idx` (`resolved_at`, `last_seen_at` DESC)",
  app_error_release_idx: "KEY `app_error_release_idx` (`release`, `last_seen_at` DESC)",
  app_error_last_request_idx: "KEY `app_error_last_request_idx` (`last_request_id`)",
  admin_audit_request_idx: "KEY `admin_audit_request_idx` (`request_id`)",
  content_reports_open_idx: "KEY `content_reports_open_idx` (`status`, `created_at` DESC)",
  content_reports_target_idx: "KEY `content_reports_target_idx` (`area`, `target_id`)",
  site_announcements_live_idx:
    "KEY `site_announcements_live_idx` (`is_active`, `priority` DESC, `created_at` DESC)",
  site_supporters_order_idx:
    "KEY `site_supporters_order_idx` (`is_visible`, `sort_index`, `created_at` DESC)",

  // --- GIN → multi-valued index -------------------------------------------

  // gin(tags) برای عملگر containment آرایه.
  //
  // معادل MySQL یک multi-valued index روی JSON است و با
  // `? MEMBER OF (tags)` واقعاً استفاده می‌شود (با EXPLAIN تأیید شد:
  // «Index lookup on club_posts using club_posts_tags_idx»).
  //
  // CHAR(64): سقف طول یک برچسب. برچسبِ بلندتر از این در زمان INSERT خطا
  // می‌دهد و ساکت بریده نمی‌شود.
  club_posts_tags_idx:
    "KEY `club_posts_tags_idx` ( (CAST(`tags` AS CHAR(64) ARRAY)) )",

  // --- NULLS LAST ----------------------------------------------------------
  //
  // ستون published_at_is_null جای «NULLS LAST» را می‌گیرد و کوئری‌های فید هم
  // با همین ترتیب مرتب می‌شوند (lib/club/queries.ts).

  club_posts_feed_idx:
    "KEY `club_posts_feed_idx` (`status`, `featured` DESC, `published_at_is_null`, " +
    "`published_at` DESC, `id`)",
  club_posts_likes_idx:
    "KEY `club_posts_likes_idx` (`status`, `featured` DESC, `like_count` DESC, " +
    "`published_at_is_null`, `published_at` DESC, `id`)",
  club_posts_discussed_idx:
    "KEY `club_posts_discussed_idx` (`status`, `featured` DESC, `comment_count` DESC, " +
    "`published_at_is_null`, `published_at` DESC, `id`)",
};

/**
 * جدول‌هایی که AUTO_INCREMENT دارند و مقدار شروعشان معنادار است.
 *
 * jasoos_levels در مبدأ `generated always as identity (start with 1000)` است.
 * شناسه‌های زیر ۱۰۰۰ در محتوای بازی معنای دیگری دارند، پس شروع باید حفظ شود.
 *
 * ⚠️ تفاوت معنایی که در manifest هم آمده: `generated always` در Postgres جلوی
 * INSERT با مقدار صریح را می‌گیرد (مگر با OVERRIDING SYSTEM VALUE)، ولی
 * AUTO_INCREMENT در MySQL مقدار صریح را می‌پذیرد. برای ETL این کمک است؛ برای
 * کد اپ یعنی یک گاردِ کمتر. کد نویسنده هیچ‌جا id صریح نمی‌دهد.
 */
export const AUTO_INCREMENT_START = {
  jasoos_levels: 1000,
};

/**
 * ستون‌هایی که DEFAULT شان عمداً حذف می‌شود.
 *
 * `club_posts.tags` در مبدأ `default '{}'::text[]` دارد و در مقصد یک
 * multi-valued index رویش هست (معادل GIN).
 *
 * این دو در MySQL 8.0.46 با هم جمع نمی‌شوند. هر INSERT ای که ستون را ننویسد و
 * به DEFAULT تکیه کند، با این خطا رد می‌شود:
 *
 *     ERROR 3903 (22018): Invalid JSON value for CAST for functional index
 *
 * و این به شکلِ DEFAULT ربطی ندارد — هر چهار حالت آزموده شد و همه شکستند:
 *     (_utf8mb4'[]')، (JSON_ARRAY())، (CAST(_utf8mb4'[]' AS JSON))،
 *     (JSON_EXTRACT(_utf8mb4'[]','$'))
 * حتی بردنِ index روی یک ستون محاسباتی هم فرقی نکرد.
 *
 * پس یکی از دو طرف باید برود:
 *
 *   • حذف index → فیلترِ برچسب در فید کلاب full scan می‌شود، روی جدولی که
 *     محتوای کاربران است و رشد می‌کند.
 *   • حذف DEFAULT → هر INSERT باید tags بدهد.
 *
 * دومی انتخاب شد چون تنها مسیرِ نوشتنِ پست در کل پروژه یکی است
 * (lib/club/actions.ts) و همان‌جا هم tags را صریح می‌دهد. ستون NOT NULL
 * می‌ماند، پس اگر روزی کسی INSERT ای بدون tags اضافه کند، MySQL با پیام
 * روشنِ «Field 'tags' doesn't have a default value» ردش می‌کند — نه بی‌صدا.
 */
export const DROP_DEFAULT = new Set(["club_posts.tags"]);
