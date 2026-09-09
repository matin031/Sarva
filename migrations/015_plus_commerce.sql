-- =============================================================================
-- ۰۱۵ — هستهٔ تجاریِ «سروا پلاس»
-- =============================================================================
--
-- این migration پنج مفهومِ *مستقل* را می‌سازد که در اکثر پروژه‌ها به‌اشتباه یکی
-- می‌شوند و بعداً جدا کردنشان ناممکن است:
--
--   ۱) Plan / Plan Version — «چه چیزی فروخته می‌شود و به چه قیمتی».
--   ۲) Order              — «کاربر برای خرید اقدام کرد؛ نتیجهٔ مالی چه شد».
--   ۳) Payment Attempt    — «یک رفت‌وبرگشت با درگاه». یک سفارش می‌تواند چند
--                            تلاش داشته باشد (کاربر منصرف شد، بانک تایم‌اوت
--                            داد، دوباره زد).
--   ۴) Entitlement        — «آیا کاربر *همین حالا* اجازهٔ استفاده از پلاس را
--                            دارد». تنها منبع حقیقتِ دسترسی.
--   ۵) Ticket             — پشتیبانیِ محصول پولی.
--
-- ⚠️ چرا وجودِ یک سفارشِ موفق جای entitlement را نمی‌گیرد:
-- «دسترسی» یک بازهٔ زمانی است، نه یک رویداد. تمدید، هدیهٔ دستیِ مدیر، دورهٔ
-- آزمایشی و لغو دسترسی هیچ‌کدام سفارش نیستند — ولی همه‌شان دسترسی‌اند. اگر
-- منطقِ دسترسی روی جدولِ سفارش سوار می‌شد، اولین «دسترسی آزمایشی بده» یک
-- سفارشِ جعلی می‌ساخت و از آن لحظه گزارش مالی دروغ می‌گفت.
--
-- ── پول ──────────────────────────────────────────────────────────────────────
-- واحدِ متعارفِ دیتابیس **ریال** است و در `bigint` نگه داشته می‌شود. هیچ ستون
-- پولی float نیست و هیچ‌جای دیتابیس تومان ذخیره نمی‌شود.
--
-- دلیلِ ریال: درگاه‌های ایرانی تاریخاً مبلغ را به ریال می‌گیرند، و تبدیل باید
-- دقیقاً یک بار و در یک نقطه انجام شود. آن نقطه `lib/plus/money.ts` است. رابط
-- کاربری تومان نشان می‌دهد چون کاربر ایرانی با تومان فکر می‌کند.
--
-- ⚠️ نکتهٔ مبدلِ نوع: `lib/db/index.ts` برای `int8` مبدل `Number` نصب کرده
-- (وگرنه `count(*)` رشته برمی‌گشت). یعنی این ستون‌ها به‌صورت `number` به کد
-- می‌رسند. مرزِ امنِ عددِ جاوااسکریپت ۹٫۰۰۷×۱۰¹⁵ است و بزرگ‌ترین مبلغِ
-- قابل‌تصورِ اینجا چند ده میلیون ریال — یعنی ۹ مرتبهٔ بزرگی فاصله. اگر روزی
-- ستون پولیِ انباشته‌ای اضافه شد که می‌تواند از آن مرز رد شود، همان ستون باید
-- مبدل خودش را داشته باشد.
--
-- ── بدونِ RLS ───────────────────────────────────────────────────────────────
-- مثل بقیهٔ اسکیما، هیچ policy ای اینجا نیست. مالکیت (`user_id = $1`) در
-- `lib/plus/*` اعمال می‌شود و اگر یک کوئری فراموشش کند، دیتابیس جلویش را
-- نمی‌گیرد. تنها چیزی که *دیتابیس* تضمین می‌کند، constraint هایی است که
-- پایین می‌آیند — و آن‌ها عمداً روی همان چیزهایی گذاشته شده‌اند که کدِ اشتباه
-- می‌تواند خرابشان کند: مبلغِ منفی، دو entitlement برای یک سفارش، تغییرِ قیمتِ
-- یک نسخهٔ فروخته‌شده.
-- =============================================================================

-- =============================================================================
-- بخش ۱ — محصول: پلن و نسخهٔ پلن
-- =============================================================================

-- یک «پلن» یک گونهٔ فروشِ سروا پلاس است — مثلاً یک‌ماهه و سه‌ماهه.
--
-- ⚠️ اینجا Tier نیست. نقره‌ای/طلایی/VIP ساخته نمی‌شود: محصول یک چیز است
-- («سروا پلاس») و این ردیف‌ها فقط *مدت*های فروشِ همان یک چیزند. اگر روزی
-- سطح‌های واقعیِ متفاوت لازم شد، آن یک تصمیم محصولی تازه است و ستونِ خودش را
-- می‌خواهد؛ سوءاستفاده از این جدول برای آن، فقط قیمت‌ها را به‌هم می‌ریزد.
create table plus_plans (
  id uuid primary key default gen_random_uuid(),

  -- شناسهٔ پایدارِ کد (`plus_1m`). URL و تست‌ها به این می‌چسبند، نه به uuid.
  code text not null unique
    constraint plus_plans_code_check check (code ~ '^[a-z0-9_]{2,40}$'),

  title text not null
    constraint plus_plans_title_check check (length(btrim(title)) between 1 and 120),
  subtitle text,

  -- مدتِ دسترسی که این پلن می‌فروشد. روز است و نه ماه: «یک ماه» در تقویم
  -- شمسی ۲۹ تا ۳۱ روز است و اگر ماه ذخیره می‌شد، محاسبهٔ پایانِ دوره به تقویم
  -- وابسته می‌شد. ۳۰ روز یک قرارداد صریح است که همه‌جا یک معنی دارد.
  duration_days integer not null
    constraint plus_plans_duration_check check (duration_days between 1 and 3650),

  sort_index integer not null default 0,

  -- از کاتالوگ برداشته می‌شود ولی سفارش‌های قدیمی‌اش سر جایشان می‌مانند.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plus_plans_catalog_idx on plus_plans (is_active, sort_index, code);

create trigger plus_plans_touch
  before update on plus_plans
  for each row execute function touch_updated_at();

-- نسخهٔ قیمتیِ یک پلن.
--
-- ⚠️ چرا نسخه‌بندی، به‌جای یک ستونِ `price` روی خودِ پلن:
-- فردا قیمت عوض می‌شود. اگر قیمت روی پلن بود، `update` آن، *گذشته* را هم
-- بازنویسی می‌کرد: هر گزارشِ مالی، هر فاکتور و هر پاسخِ پشتیبانی به کاربری که
-- سه ماه پیش خرید کرده، عددِ امروز را نشان می‌داد. با نسخه، قیمتِ تازه یک
-- ردیفِ تازه است و ردیفِ قدیمی دست‌نخورده می‌ماند.
--
-- سفارش‌ها علاوه بر ارجاع به نسخه، snapshot خودشان را هم دارند (بخش ۲). این
-- «تکرارِ داده» عمدی است: ارجاع می‌گوید *کدام* نسخه فروخته شده، و snapshot
-- تضمین می‌کند حتی اگر روزی ردیفِ نسخه گم شود، فاکتور همچنان خوانا بماند.
create table plus_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plus_plans(id) on delete restrict,

  version integer not null
    constraint plus_plan_versions_version_check check (version >= 1),

  -- snapshot عنوان و مدت در لحظهٔ ساختِ نسخه. اگر مدیر فردا عنوانِ پلن را
  -- عوض کند، فاکتورِ دیروز همان چیزی را نشان می‌دهد که کاربر خریده بود.
  title text not null
    constraint plus_plan_versions_title_check check (length(btrim(title)) between 1 and 120),
  duration_days integer not null
    constraint plus_plan_versions_duration_check check (duration_days between 1 and 3650),

  -- ⚠️ ریال. تومان هرگز در این ستون نمی‌نشیند.
  amount_rials bigint not null
    constraint plus_plan_versions_amount_check check (amount_rials >= 0),

  currency text not null default 'IRR'
    constraint plus_plan_versions_currency_check check (currency in ('IRR')),

  -- «الان قابل فروش است؟» — نسخهٔ قدیمی از فروش خارج می‌شود ولی حذف نمی‌شود.
  is_sellable boolean not null default false,

  note text,

  created_at timestamptz not null default now(),
  created_by uuid references users(id) on delete set null,

  unique (plan_id, version)
);

-- در هر لحظه حداکثر یک نسخهٔ قابلِ فروش برای هر پلن.
--
-- بدون این، دو نسخهٔ فعال یعنی «قیمت این پلن چند است؟» پاسخِ قطعی ندارد و
-- سرور باید بین دو ردیف قرعه بکشد — که یعنی دو کاربر در یک لحظه دو قیمتِ
-- متفاوت می‌بینند.
create unique index plus_plan_versions_one_sellable_idx
  on plus_plan_versions (plan_id) where is_sellable;

create index plus_plan_versions_plan_idx
  on plus_plan_versions (plan_id, version desc);

-- ⚠️ تغییرناپذیریِ نسخهٔ فروخته‌شده — در خودِ دیتابیس و نه در کد.
--
-- دلیلش این است که «کد فراموش نمی‌کند» یک آرزوست: کافی است یک روز کسی برای
-- «اصلاح یک غلط تایپی» روی عنوان، `update` بزند و ناخواسته مبلغ هم در همان
-- دستور باشد. آن لحظه هیچ خطایی نمی‌بینید و فقط ماه‌ها بعد، از روی یک شکایتِ
-- کاربر می‌فهمید گذشته بازنویسی شده.
--
-- تنها چیزی که اجازهٔ تغییر دارد `is_sellable` و `note` است: یعنی می‌شود یک
-- نسخه را از فروش خارج کرد، ولی نمی‌شود چیزی را که فروخته شده عوض کرد.
create function plus_plan_versions_immutable() returns trigger as $$
begin
  if new.plan_id       is distinct from old.plan_id
  or new.version       is distinct from old.version
  or new.title         is distinct from old.title
  or new.duration_days is distinct from old.duration_days
  or new.amount_rials  is distinct from old.amount_rials
  or new.currency      is distinct from old.currency then
    raise exception
      'نسخهٔ پلن پس از ساخته‌شدن تغییر نمی‌کند؛ نسخهٔ تازه بسازید (plan_version %)', old.id
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger plus_plan_versions_immutable_trg
  before update on plus_plan_versions
  for each row execute function plus_plan_versions_immutable();

-- =============================================================================
-- بخش ۲ — سفارش
-- =============================================================================

-- شمارهٔ سفارشِ خوانا. کاربر آن را در تیکت پشتیبانی می‌نویسد و پشتیبان با
-- همان می‌گردد، پس باید کوتاه، بی‌ابهام و بدونِ حرفِ قابلِ‌اشتباه باشد.
-- (uuid برای این کار مناسب نیست: کسی «۳۶ نویسه با خط تیره» را تلفنی
--  نمی‌خواند.)
create sequence plus_order_number_seq start 1001;

create table plus_orders (
  id uuid primary key default gen_random_uuid(),

  order_number text not null unique
    default 'SRV-' || lpad(nextval('plus_order_number_seq')::text, 6, '0'),

  -- ⚠️ cascade: حذفِ حساب، سفارش‌هایش را هم می‌برد. این با بقیهٔ اسکیما
  -- هماهنگ است (همه‌چیزِ کاربر با حسابش می‌رود) ولی یک انتخاب است نه یک
  -- بدیهیات: اگر روزی نگه‌داشتنِ سابقهٔ مالیِ حسابِ حذف‌شده لازم شد، راهش
  -- `on delete restrict` به‌علاوهٔ یک مرحلهٔ ناشناس‌سازی است، نه ترمیمِ بعدی.
  user_id uuid not null references users(id) on delete cascade,

  plan_id uuid not null references plus_plans(id) on delete restrict,
  plan_version_id uuid not null references plus_plan_versions(id) on delete restrict,

  -- snapshot: همان چیزی که در لحظهٔ خرید به کاربر نشان داده شد.
  plan_code text not null,
  plan_title text not null,
  plan_version integer not null,
  duration_days integer not null
    constraint plus_orders_duration_check check (duration_days between 1 and 3650),
  amount_rials bigint not null
    constraint plus_orders_amount_check check (amount_rials >= 0),
  currency text not null default 'IRR'
    constraint plus_orders_currency_check check (currency in ('IRR')),

  status text not null default 'pending'
    constraint plus_orders_status_check
      check (status in ('pending', 'paid', 'cancelled', 'expired', 'refunded')),

  paid_at timestamptz,
  cancelled_at timestamptz,

  -- سفارشِ رهاشده تا ابد «در انتظار پرداخت» نمی‌ماند؛ بعد از این لحظه
  -- می‌شود منقضی‌اش کرد. خودِ ستون هیچ کاری نمی‌کند — سیاستش در
  -- `lib/plus/orders.ts` است.
  pending_expires_at timestamptz,

  -- کلیدِ idempotency ای که کلاینت می‌سازد؛ جزئیاتش پایینِ همین جدول.
  idempotency_key text
    constraint plus_orders_idempotency_check
      check (idempotency_key is null or length(idempotency_key) between 8 and 80),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ⚠️ نظمِ حالت‌ها: سفارشِ paid باید زمانِ پرداخت داشته باشد و برعکس.
  -- بدون این، یک باگ می‌تواند سفارشی بسازد که «پرداخت‌شده» است ولی هیچ‌کس
  -- نمی‌داند کِی — و آن‌وقت گزارشِ مالی و بازهٔ دسترسی با هم نمی‌خوانند.
  constraint plus_orders_paid_has_time
    check ((status = 'paid') = (paid_at is not null))
);

create index plus_orders_user_idx on plus_orders (user_id, created_at desc, id);
create index plus_orders_status_idx on plus_orders (status, created_at desc);
create index plus_orders_plan_version_idx on plus_orders (plan_version_id);

-- ⚠️ ستونِ اصلیِ idempotency خرید.
--
-- سناریوی واقعی: کاربر روی «پرداخت» دوبار کلیک می‌کند، یا صفحه را رفرش
-- می‌کند، یا در دو تب باز می‌کند. بدون این ایندکس، هر کدام یک سفارشِ تازه
-- می‌سازد و کاربر در «خریدهای من» سه سفارشِ در انتظار پرداخت می‌بیند و
-- نمی‌داند کدام را باید بپردازد.
--
-- قاعده: در هر لحظه حداکثر **یک** سفارشِ باز برای هر (کاربر، نسخهٔ پلن).
-- کدِ ساختِ سفارش وقتی به این می‌خورد، سفارشِ موجود را برمی‌گرداند — یعنی
-- محافظت سمتِ سرور است و نه صرفاً `disabled` کردنِ دکمه.
create unique index plus_orders_one_open_idx
  on plus_orders (user_id, plan_version_id) where status = 'pending';

-- کلیدِ idempotency ای که خودِ کلاینت می‌فرستد (هر بار که دکمه *رندر* می‌شود
-- یکی ساخته می‌شود، نه هر بار که کلیک می‌شود). لایهٔ دومِ همان محافظت، برای
-- وقتی که کاربر عمداً دو پلنِ متفاوت را هم‌زمان باز کرده.
create unique index plus_orders_idempotency_idx
  on plus_orders (user_id, idempotency_key) where idempotency_key is not null;

create trigger plus_orders_touch
  before update on plus_orders
  for each row execute function touch_updated_at();

-- =============================================================================
-- بخش ۳ — تلاشِ پرداخت
-- =============================================================================

-- یک رفت‌وبرگشت با درگاه.
--
-- ⚠️ چرا جدا از سفارش: چون یک سفارش می‌تواند چند بار پرداخت شود و *نتیجهٔ
-- هیچ‌کدام قطعی نیست*. مهم‌ترین حالت‌ها آن‌هایی‌اند که اکثر پیاده‌سازی‌ها
-- ندارند:
--
--   • `pending` — درگاه گفته «هنوز تمام نشده».
--   • `unknown` — ما نمی‌دانیم. تایم‌اوت شبکه، پاسخِ نامفهوم، قطعیِ وسطِ
--     verify. این حالت **شکست نیست** و هرگز نباید به کاربر «پرداخت ناموفق»
--     نشان داده شود؛ پولش ممکن است کم شده باشد.
--
-- اگر این دو حالت وجود نداشتند، هر ابهامی به «ناموفق» تبدیل می‌شد و کاربر
-- دوباره پول می‌داد.
create table plus_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references plus_orders(id) on delete cascade,

  -- نامِ آداپتور (`test`، بعداً نام درگاه واقعی). هرگز کلید یا رازِ درگاه
  -- اینجا نمی‌نشیند.
  provider text not null
    constraint plus_payment_attempts_provider_check check (length(btrim(provider)) between 1 and 40),

  state text not null default 'created'
    constraint plus_payment_attempts_state_check
      check (state in ('created', 'redirected', 'pending', 'verified', 'failed', 'cancelled', 'unknown')),

  amount_rials bigint not null
    constraint plus_payment_attempts_amount_check check (amount_rials >= 0),

  -- شناسهٔ درگاه برای این تلاش (authority/token). با آن می‌شود بعداً وضعیت را
  -- پرسید — همان چیزی که «کاربر وسطِ پرداخت اینترنتش قطع شد» را قابلِ ترمیم
  -- می‌کند.
  provider_ref text,
  -- شمارهٔ پیگیریِ قابلِ نمایش به کاربر (بعد از تأیید).
  provider_tracking_id text,

  -- ⚠️ فقط کدِ خطا و پیامِ کوتاهِ درگاه. بدنهٔ خامِ پاسخ اینجا نمی‌نشیند: در
  -- آن بدنه ممکن است هدر، توکن یا شناسهٔ پذیرنده باشد.
  error_code text,
  error_message text,

  redirected_at timestamptz,
  verified_at timestamptz,
  failed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plus_payment_attempts_order_idx
  on plus_payment_attempts (order_id, created_at desc);
create index plus_payment_attempts_state_idx
  on plus_payment_attempts (state, created_at desc);

-- شناسهٔ درگاه در هر درگاه یکتاست. این ایندکس یعنی callbackِ تکراری نمی‌تواند
-- تلاشِ دوم بسازد — و چون entitlement از تلاشِ *تأییدشده* می‌آید و آن هم
-- (پایین) روی سفارش قفل است، زنجیرهٔ idempotency کامل می‌شود.
create unique index plus_payment_attempts_ref_idx
  on plus_payment_attempts (provider, provider_ref) where provider_ref is not null;

create trigger plus_payment_attempts_touch
  before update on plus_payment_attempts
  for each row execute function touch_updated_at();

-- =============================================================================
-- بخش ۴ — Entitlement: تنها منبعِ حقیقتِ دسترسی
-- =============================================================================

-- «کاربر از این لحظه تا آن لحظه پلاس دارد.»
--
-- ⚠️ `ends_at` می‌تواند null باشد و معنایش «دائمی» است. مالک صریحاً خواسته
-- بتواند حسابی را «همیشگی» پلاس کند. null بهتر از یک تاریخِ خیلی دور است
-- چون در کوئری صادق است و در رابط کاربری هم می‌شود صریح نوشت «دائمی» — به‌جای
-- «تا سال ۲۵۰۰» که مثل یک باگ به‌نظر می‌رسد.
--
-- ⚠️ مرزِ بازه عمداً نیم‌باز است: `starts_at <= now < ends_at`.
-- یعنی لحظهٔ `ends_at` دیگر دسترسی نیست. با این قرارداد، تمدیدی که از
-- `ends_at` قبلی شروع می‌شود هیچ همپوشانی و هیچ شکافی ندارد.
create table plus_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  source text not null
    constraint plus_entitlements_source_check check (source in ('purchase', 'manual_grant')),

  -- سفارشی که این دسترسی از آن آمده. برای هدیهٔ دستی null است.
  source_order_id uuid references plus_orders(id) on delete set null,

  starts_at timestamptz not null default now(),
  ends_at timestamptz,

  revoked_at timestamptz,

  -- برای هدیهٔ دستی اجباری است (در کد)، برای خرید توضیحِ اختیاری.
  reason text,
  granted_by uuid references users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plus_entitlements_range_check
    check (ends_at is null or ends_at > starts_at),

  -- منبع و ارجاع باید با هم بخوانند: یک دسترسیِ «خریداری‌شده» بدون سفارش
  -- یعنی جایی در کد سفارش را گم کرده‌ایم.
  constraint plus_entitlements_purchase_has_order
    check (source <> 'purchase' or source_order_id is not null)
);

-- ⚠️ **ستونِ فقراتِ idempotency پرداخت.**
--
-- یک سفارش حداکثر یک دسترسی می‌سازد. یعنی:
--   • callback درگاه دوبار برسد → ردیفِ دوم نوشته نمی‌شود.
--   • کاربر صفحهٔ نتیجه را سه بار رفرش کند → همان یک ردیف.
--   • دو تب هم‌زمان verify کنند → یکی برنده می‌شود، دیگری خطای یکتایی
--     می‌گیرد و کدِ بالادست آن را «قبلاً فعال شده» می‌فهمد.
--
-- این تضمین در *دیتابیس* است و نه در کد، چون تنها جایی که می‌تواند دو
-- درخواستِ هم‌زمان را داور باشد همین‌جاست.
create unique index plus_entitlements_order_idx
  on plus_entitlements (source_order_id) where source_order_id is not null;

-- کوئریِ داغِ سایت: «این کاربر همین حالا پلاس دارد؟» و «تازه‌ترین پایانِ
-- دسترسیِ فعالش کِی است؟». هر دو از همین ایندکس جواب می‌گیرند.
-- (`nulls first` چون دسترسیِ دائمی از هر تاریخی جلوتر است.)
create index plus_entitlements_active_idx
  on plus_entitlements (user_id, ends_at desc nulls first)
  where revoked_at is null;

create index plus_entitlements_expiry_idx
  on plus_entitlements (ends_at)
  where revoked_at is null and ends_at is not null;

create trigger plus_entitlements_touch
  before update on plus_entitlements
  for each row execute function touch_updated_at();

-- =============================================================================
-- بخش ۵ — اعلان‌های درون‌سایتی
-- =============================================================================

-- کوچک و عمدی: این یک «سامانهٔ نوتیفیکیشن» نیست. فقط چند رویدادِ مشخص
-- (فعال‌شدن پلاس، نزدیکِ پایان، پاسخ تیکت، پرداختی که تکلیفش روشن نیست) باید
-- جایی دیده شوند که کاربر بعداً هم پیدایشان کند — نه فقط یک toast که رد شد.
--
-- ایمیل و پیامک عمداً اینجا نیست: بدون رضایتِ کاربر و بدون provider، پیامِ
-- خارجی نباید فرستاده شود.
create table plus_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  kind text not null
    constraint plus_notifications_kind_check
      check (kind in ('plus_activated', 'plus_renewed', 'plus_expiring', 'plus_expired',
                      'plus_revoked', 'ticket_reply', 'payment_action_needed')),

  title text not null
    constraint plus_notifications_title_check check (length(btrim(title)) between 1 and 160),
  body text
    constraint plus_notifications_body_check check (body is null or length(body) <= 600),

  -- مسیرِ داخلیِ سایت. هرگز آدرس بیرونی — وگرنه اعلان می‌شود یک بردارِ
  -- فیشینگ که خودِ سایت نمایشش می‌دهد.
  href text
    constraint plus_notifications_href_check check (href is null or href ~ '^/[^/\\]'),

  -- «این اعلان قبلاً برای این کاربر ساخته شده؟» — تا هشدارِ «نزدیک پایان»
  -- هر بار که کاربر صفحه را باز می‌کند دوباره ساخته نشود.
  dedupe_key text,

  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index plus_notifications_user_idx
  on plus_notifications (user_id, created_at desc);
create index plus_notifications_unread_idx
  on plus_notifications (user_id, created_at desc) where read_at is null;

create unique index plus_notifications_dedupe_idx
  on plus_notifications (user_id, dedupe_key) where dedupe_key is not null;

-- =============================================================================
-- بخش ۶ — پشتیبانی
-- =============================================================================

-- ⚠️ این جدول جایگزینِ `content_reports` نیست و نباید بشود.
--
-- تفکیک عمدی است:
--   • `content_reports` = «این سؤال/بیت غلط است» — دربارهٔ یک محتوای مشخص،
--     بی‌نامِ کاربر هم ممکن است، و جریانِ کاریِ ویراستاری دارد.
--   • `plus_tickets`    = «مشکلِ من با حساب/پرداخت/اشتراک» — گفت‌وگوی
--     دوطرفهٔ کاربرِ مشخص با پشتیبانی.
--
-- اگر این دو یکی می‌شدند، صفِ ویراستار پر می‌شد از سؤالِ پرداخت.
create sequence plus_ticket_number_seq start 1001;

create table plus_tickets (
  id uuid primary key default gen_random_uuid(),

  ticket_number text not null unique
    default 'TK-' || lpad(nextval('plus_ticket_number_seq')::text, 6, '0'),

  user_id uuid not null references users(id) on delete cascade,

  category text not null
    constraint plus_tickets_category_check
      check (category in ('payment', 'plus', 'account', 'technical', 'content', 'other')),

  subject text not null
    constraint plus_tickets_subject_check check (length(btrim(subject)) between 3 and 160),

  status text not null default 'open'
    constraint plus_tickets_status_check
      check (status in ('open', 'waiting_for_support', 'waiting_for_user', 'resolved', 'closed')),

  -- سفارشِ مرتبط، اگر کاربر یکی را ضمیمه کرده باشد.
  -- ⚠️ مالکیتِ این سفارش در کد بررسی می‌شود: بدون آن، کاربر می‌توانست شناسهٔ
  -- سفارشِ کسِ دیگری را ضمیمه کند و پشتیبان — با حسن‌نیت — اطلاعاتِ مالیِ یک
  -- نفرِ سوم را در پاسخ بنویسد.
  order_id uuid references plus_orders(id) on delete set null,

  -- برای مرتب‌سازیِ صف و نشانِ «پاسخ تازه». به‌روزرسانی‌شان کارِ کد است.
  last_activity_at timestamptz not null default now(),
  user_unread boolean not null default false,
  admin_unread boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plus_tickets_user_idx on plus_tickets (user_id, last_activity_at desc, id);
create index plus_tickets_queue_idx on plus_tickets (status, last_activity_at desc, id);
create index plus_tickets_admin_unread_idx
  on plus_tickets (last_activity_at desc) where admin_unread;

create trigger plus_tickets_touch
  before update on plus_tickets
  for each row execute function touch_updated_at();

create table plus_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references plus_tickets(id) on delete cascade,

  -- null یعنی نویسنده حذف شده؛ متن پیام می‌ماند چون رشتهٔ گفت‌وگو بدونِ آن
  -- بی‌معنی می‌شود.
  author_id uuid references users(id) on delete set null,
  author_role text not null
    constraint plus_ticket_messages_role_check check (author_role in ('user', 'admin')),

  body text not null
    constraint plus_ticket_messages_body_check check (length(btrim(body)) between 1 and 4000),

  created_at timestamptz not null default now()
);

create index plus_ticket_messages_thread_idx
  on plus_ticket_messages (ticket_id, created_at, id);
