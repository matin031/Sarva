-- =============================================================================
-- سروا — لاگ فعالیت مدیران و لاگ خطا
-- =============================================================================
-- تا امروز هیچ ردی از کارِ مدیران نگه داشته نمی‌شد. تنها استثنا ستون
-- app_settings.updated_by بود که هیچ‌جا هم نمایش داده نمی‌شد.
--
-- نبودنش دو مشکل عملی می‌سازد که هر دو دیر معلوم می‌شوند:
--
--   ۱) وقتی چیزی خراب شد — یک کاربر بی‌دلیل بن شده، سروده‌ای ناپدید شده، یک
--      تنظیم عوض شده — هیچ راهی برای فهمیدن «چه کسی، کِی» وجود ندارد. با چند
--      مدیر، این یعنی حدس زدن.
--
--   ۲) خطاهای سرور فقط به console می‌روند، یعنی فقط با SSH و
--      `docker compose logs` دیده می‌شوند. برای کسی که با سرور کار نمی‌کند،
--      عملاً یعنی نامرئی. سایت می‌تواند هفته‌ها ایمیل نفرستد بی‌آنکه کسی بفهمد.
--
-- هر دو جدول عمداً «فقط افزودنی» اند: هیچ‌جای کد update یا delete رویشان
-- نمی‌زند. یک لاگ که بشود ویرایشش کرد، لاگ نیست.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- لاگ فعالیت مدیران
-- ---------------------------------------------------------------------------
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),

  -- on delete set null و نه cascade: اگر حساب مدیری حذف شد، تاریخچهٔ کارهایش
  -- نباید با او پاک شود — دقیقاً در همان لحظه‌ای که به آن نیاز داریم.
  actor_id uuid references users (id) on delete set null,

  -- عکس‌برداری از ایمیل در لحظهٔ عمل. بدون آن، ردیفی که actor_id اش null شده
  -- هیچ معنایی ندارد؛ با آن، همچنان می‌گوید کار چه کسی بوده.
  actor_email text not null,

  -- شناسهٔ ماشینی عمل، مثل 'user.ban' یا 'exam.delete'. متن فارسیِ نمایشی در
  -- کد است نه اینجا، تا تغییر عبارت‌ها به migration نیاز نداشته باشد.
  action text not null,

  -- چه چیزی هدف بوده. target_id عمداً text است نه uuid: بعضی هدف‌ها uuid
  -- ندارند (کلید تنظیمات مثل 'sms.api_key').
  target_type text not null,
  target_id text,

  -- خلاصهٔ فارسی و خوانا برای نمایش مستقیم در پنل. اینجا ذخیره می‌شود و نه
  -- در زمان نمایش ساخته می‌شود، چون باید همان چیزی را بگوید که در آن لحظه
  -- درست بوده — عنوان آزمونی که بعداً عوض شده، یا کاربری که حالا حذف شده.
  summary text not null,

  -- جزئیات ساختاریافته برای وقتی که خلاصه کافی نیست (مقدار قبلی و بعدی و…).
  -- ⚠️ هرگز رمز، توکن یا کلید API در این ستون نوشته نمی‌شود؛ lib/admin/audit.ts
  -- مقادیر حساس را قبل از رسیدن به اینجا پاک می‌کند.
  metadata jsonb not null default '{}'::jsonb,

  ip inet,
  created_at timestamptz not null default now()
);

-- نمای پیش‌فرض پنل: تازه‌ترین‌ها اول.
create index admin_audit_created_idx on admin_audit_log (created_at desc);
-- «این مدیر چه کارهایی کرده؟»
create index admin_audit_actor_idx on admin_audit_log (actor_id, created_at desc);
-- «چه کسی این کاربر را بن کرد؟» — فیلتر روی نوع هدف.
create index admin_audit_target_idx on admin_audit_log (target_type, target_id);
-- فیلتر «فقط حذف‌ها» در پنل.
create index admin_audit_action_idx on admin_audit_log (action, created_at desc);

-- ---------------------------------------------------------------------------
-- لاگ خطا
-- ---------------------------------------------------------------------------
create table app_error_log (
  id uuid primary key default gen_random_uuid(),

  -- 'api' | 'action' | 'mail' | 'sms' | 'db' | 'upload' | 'other'
  -- محدودش نمی‌کنیم تا افزودن یک منبع تازه به migration نیاز نداشته باشد.
  source text not null,

  -- پیام خطا. ⚠️ فقط برای چشم مدیر است و هرگز به کاربر عادی نشان داده
  -- نمی‌شود — پیام خام پستگرس نام جدول و ستون را لو می‌دهد.
  message text not null,

  -- کجا رخ داده: مسیر درخواست یا نام اکشن.
  context text,

  -- stack trace، بریده‌شده. برای خطاهای تکراری فقط اولی نگه داشته می‌شود
  -- (پایین‌تر، در fingerprint).
  detail text,

  -- هشِ «همان خطا»: منبع + پیامِ نرمال‌شده. بدون آن، یک خطای تکرارشونده
  -- می‌تواند در چند ساعت هزاران ردیف بسازد و جدول را از کار بیندازد — که
  -- خودش تبدیل به مشکل بعدی می‌شود.
  fingerprint text not null,

  -- چند بار این خطای دقیقاً یکسان تکرار شده.
  occurrences integer not null default 1,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  -- مدیر بعد از رسیدگی می‌تواند علامتش بزند تا از فهرست فعال برود.
  resolved_at timestamptz,
  resolved_by uuid references users (id) on delete set null
);

-- تجمیع بر اساس fingerprint: خطای تکراری ردیف تازه نمی‌سازد، شمارنده‌اش
-- بالا می‌رود. جزئی بودن روی resolved_at عمدی است — یک خطای رسیدگی‌شده که
-- دوباره رخ بدهد باید ردیف تازه‌ای بسازد، نه اینکه ردیف بستهٔ قبلی را زنده کند.
create unique index app_error_fingerprint_idx
  on app_error_log (fingerprint) where resolved_at is null;

create index app_error_recent_idx on app_error_log (last_seen_at desc);
create index app_error_open_idx on app_error_log (last_seen_at desc) where resolved_at is null;
