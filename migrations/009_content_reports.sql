-- =============================================================================
-- سروا — گزارشِ محتوا
-- =============================================================================
-- تا امروز وقتی کاربری به سؤالِ غلط برمی‌خورد — پاسخِ نادرست، بیتِ اشتباه،
-- صوتی که با گزینه نمی‌خواند — هیچ راهی برای گفتنش نداشت. تنها بازخوردی که
-- به مدیر می‌رسید، ترک کردنِ بازی بود؛ و آن هم چیزی نمی‌گفت که کدام سؤال.
--
-- این جدول یک صندوقِ گزارش است: کاربر (حتی مهمان) دکمه را می‌زند، دلیل را
-- انتخاب می‌کند، و ردیفی اینجا می‌نشیند که مدیر در /admin/reports می‌بیند.
--
-- سه تصمیمِ ساختاری که ارزشِ توضیح دارند:
--
--   ۱) **`target_id` از نوع text است، نه uuid.** هر بخشِ سایت شناسهٔ خودش را
--      دارد: سؤالِ عروض uuid است، پروندهٔ جاسوس عدد، پرسشِ مدارِ دستور یک
--      `source_id` رشته‌ای، و واژه‌یاب اصلاً ممکن است با «پایه+درس+واژه»
--      شناخته شود. یک ستونِ text همه را می‌گیرد بی‌آنکه لازم باشد ده کلیدِ
--      خارجی بسازیم — و مهم‌تر: گزارش نباید با حذفِ سؤال از بین برود، چون
--      دقیقاً همان‌وقت است که می‌خواهیم بدانیم چه شد.
--
--   ۲) **`snapshot` عکسِ متنِ همان لحظه است.** بدون آن، گزارشِ سؤالی که بعداً
--      ویرایش یا حذف شده فقط یک شناسهٔ بی‌معنی است. با آن، مدیر می‌تواند با
--      جست‌وجوی یک مصراع همان سؤال را پیدا کند — همان کاری که واقعاً
--      می‌خواهد بکند.
--
--   ۳) **گزارش هرگز پاک نمی‌شود، بسته می‌شود.** `status` چرخهٔ رسیدگی است.
--      حذفِ فیزیکی از پنل ممکن است ولی کارِ درست معمولاً «رسیدگی شد» است.
-- =============================================================================

create table content_reports (
  id uuid primary key default gen_random_uuid(),

  -- کدام بخشِ سایت. فهرست عمداً در دیتابیس محدود شده تا یک بخشِ تازه بدون
  -- migration وارد نشود و فیلترِ پنل قابلِ اتکا بماند.
  area text not null check (
    area in (
      'quiz',             -- عروض سماعی
      'exam',             -- امتحانات نهایی
      'vocab',            -- واژه‌یاب
      'grammar_circuit',  -- مدار دستور
      'aruz_rapid',       -- تقطیعِ سریع (کوتاه یا بلند)
      'aruz_bridge',      -- پلِ وزن
      'jasoos',           -- جاسوسِ نقش‌ها
      'ninja',            -- نینجای دستور
      'pairs',            -- جفت‌های ادبی
      'doroos',           -- درسنامه
      'other'
    )
  ),

  -- شناسهٔ محتوا در همان بخش. text است تا با هر شکلی از شناسه کار کند.
  target_id text,
  -- مکان‌یابِ ساختاریافته: پایه، درس، شمارهٔ پرسش و هر چیزی که پیدا کردنِ
  -- محتوا را ممکن کند. ⚠️ هیچ دادهٔ شخصی‌ای اینجا نمی‌نشیند.
  target_ref jsonb not null default '{}'::jsonb,

  -- متنی که کاربر در همان لحظه می‌دید — بیت، عبارت، واژه.
  snapshot text,

  reason text not null check (
    reason in (
      'wrong_answer',   -- پاسخِ درست اشتباه است
      'wrong_content',  -- خودِ محتوا غلط است
      'typo',           -- غلط املایی/نگارشی
      'audio',          -- مشکل صوت
      'image',          -- مشکل تصویر
      'duplicate',      -- تکراری
      'unclear',        -- مبهم یا بد طرح شده
      'other'
    )
  ),
  -- توضیح اختیاریِ کاربر.
  note text,

  -- گزارش‌دهنده. مهمان هم می‌تواند گزارش بدهد، پس nullable است.
  user_id uuid references users (id) on delete set null,
  -- برای تشخیصِ سیلِ گزارشِ خودکار. با همان منطقِ requestMeta پر می‌شود.
  ip inet,
  user_agent text,
  -- پلِ گزارش به لاگ عملیاتی؛ توضیحش در migration ۰۰۷.
  request_id text,

  status text not null default 'open' check (
    status in ('open', 'in_review', 'resolved', 'rejected')
  ),
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid references users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- نمای پیش‌فرضِ پنل: بازها، تازه‌ترین اول.
create index content_reports_open_idx
  on content_reports (created_at desc)
  where status = 'open';

-- فیلترِ «فقط این بخش».
create index content_reports_area_idx on content_reports (area, status, created_at desc);

-- «این سؤال قبلاً گزارش شده؟» — برای گروه کردنِ گزارش‌های تکراری.
create index content_reports_target_idx
  on content_reports (area, target_id)
  where target_id is not null;

create trigger content_reports_touch
  before update on content_reports
  for each row execute function touch_updated_at();
