-- =============================================================================
-- سروا — اعلان سایت و حامیان
-- =============================================================================
-- دو چیزی که تا امروز فقط با ویرایش کد و deploy دوباره ممکن بودند:
--
--   ۱) «از فردا فلان بخش ۲۴ ساعت در دسترس نیست» — نوار اعلانِ بالای سایت.
--   ۲) فهرست کسانی که از سروا حمایت مالی کرده‌اند.
--
-- هر دو از پنل مدیریت اداره می‌شوند و هیچ‌کدام در کد هاردکد نیست.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- اعلان سایت
-- ---------------------------------------------------------------------------
-- چند ردیف می‌تواند هم‌زمان وجود داشته باشد ولی همیشه فقط **یکی** نمایش داده
-- می‌شود: آنکه اولویتش بالاتر است و بازه‌اش الان فعال است.
--
-- چرا یکی: نوار اعلان بالای همه‌چیز می‌نشیند و صفحه را پایین می‌راند. دو تا
-- نوار یعنی نصف صفحهٔ اول، و سه تا یعنی هیچ‌کس هیچ‌کدام را نمی‌خواند.
create table site_announcements (
  id uuid primary key default gen_random_uuid(),

  -- عنوان اختیاری است. یک اعلانِ کوتاه («فردا از ۲ تا ۴ بامداد سایت در دسترس
  -- نیست») بدون عنوان خواناتر است تا با یک تیترِ زورکی.
  title text,
  body text not null,

  -- لحن، که رنگ و آیکون نوار را تعیین می‌کند:
  --   info     خبر عادی (به‌روزرسانی، قابلیت تازه)
  --   success  خبر خوب
  --   warning  چیزی که باید بدانند (قطعیِ برنامه‌ریزی‌شده)
  --   critical فوری (اختلالِ همین حالا)
  tone text not null default 'info'
    check (tone in ('info', 'success', 'warning', 'critical')),

  -- دکمهٔ اختیاری. هر دو با هم می‌آیند یا هیچ‌کدام — یک لینکِ بی‌برچسب
  -- دکمه‌ای است که کسی نمی‌داند کجا می‌برد.
  link_url text,
  link_label text,
  check ((link_url is null) = (link_label is null)),

  -- کلید اصلیِ خاموش/روشن. جدا از بازهٔ زمانی است تا بشود یک اعلانِ آمادهٔ
  -- زمان‌بندی‌شده را بدون دست زدن به تاریخ‌هایش خاموش کرد.
  is_active boolean not null default true,

  -- کاربر می‌تواند ببندش؟ برای یک اختلالِ در جریان، نه.
  dismissible boolean not null default true,

  -- وقتی چند اعلان هم‌زمان فعالند، بزرگ‌ترین اولویت برنده است.
  priority smallint not null default 0,

  -- بازهٔ نمایش. null یعنی «از همین حالا» و «تا وقتی خاموشش کنید».
  -- ⚠️ ends_at همان چیزی است که «از فردا ۲۴ ساعت» را ممکن می‌کند: تاریخ را
  -- می‌گذارید و دیگر لازم نیست یادتان بماند خاموشش کنید.
  starts_at timestamptz,
  ends_at timestamptz,
  check (ends_at is null or starts_at is null or ends_at > starts_at),

  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- کوئریِ همیشگیِ سایت: «فعال‌ترین اعلانِ همین لحظه». ایندکس جزئی، چون
-- اعلان‌های خاموش هیچ‌وقت خوانده نمی‌شوند.
create index site_announcements_live_idx
  on site_announcements (priority desc, created_at desc)
  where is_active;

create trigger site_announcements_touch
  before update on site_announcements
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- حامیان
-- ---------------------------------------------------------------------------
create table site_supporters (
  id uuid primary key default gen_random_uuid(),

  -- نامی که خودِ حامی خواسته دیده شود. عمداً به users وصل نیست: بیشترِ
  -- حمایت‌ها از کسانی می‌آید که اصلاً حساب ندارند، و آن‌که حساب دارد هم شاید
  -- بخواهد با نام دیگری (یا «ناشناس») دیده شود.
  display_name text not null,

  -- یک جملهٔ کوتاه از خودش، اگر خواست.
  message text,

  -- رتبه، که فقط ظاهرِ کارت را عوض می‌کند. مبلغ عمداً *عدد* نیست:
  -- نگه داشتن مبلغِ واقعی در جدولی که روی صفحهٔ اصلی خوانده می‌شود، دادهٔ
  -- مالیِ بی‌دلیل است. اگر خواستید چیزی نشان بدهید، amount_label یک متنِ
  -- دلخواه است («حامی طلایی»، «۵۰۰ هزار تومان»).
  tier text not null default 'supporter'
    check (tier in ('gold', 'silver', 'bronze', 'supporter')),
  amount_label text,

  link_url text,
  avatar_url text,

  -- نمایش داده شود؟ حذف نکنید — خاموشش کنید. سابقهٔ حمایت چیزی نیست که
  -- بخواهید از دست بدهید.
  is_visible boolean not null default true,

  supported_at date,
  sort_index integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ترتیبِ نمایش در اسلایدر صفحهٔ اصلی.
create index site_supporters_order_idx
  on site_supporters (sort_index, created_at desc)
  where is_visible;

create trigger site_supporters_touch
  before update on site_supporters
  for each row execute function touch_updated_at();
