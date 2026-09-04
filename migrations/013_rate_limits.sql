-- محدودسازی نرخ که ری‌استارت را تاب می‌آورد.
--
-- ⚠️ چرا لازم است: شمارنده‌های فعلی در حافظهٔ فرایندند. با یک کانتینر درست
-- کار می‌کنند — تا لحظه‌ای که فرایند ری‌استارت شود. آن‌وقت هر قفلی که روی
-- حدس زدنِ رمز گذاشته‌ایم پاک می‌شود.
--
-- یعنی هر دیپلوی، هر کرش و هر ری‌استارتِ معمولی، سهمیهٔ مهاجم را از نو
-- می‌سازد. مهاجمی که ۸ تلاشِ ناموفق داشته، فقط باید صبر کند تا سرور یک بار
-- بالا و پایین شود.
--
-- محدودیت‌های OTP از قبل به همین دلیل در دیتابیس شمرده می‌شوند
-- (lib/auth/otp.ts). این جدول همان کار را برای بقیهٔ مسیرهای حساس می‌کند.
--
-- عمداً Redis نیست: دیتابیس همین‌جاست، این جدول کوچک است و نوشتنش ارزان.
-- افزودنِ یک سرویسِ تازه برای این، هزینه‌ای است که هنوز لازم نشده.

create table rate_limits (
  -- کلید همان چیزی است که کد می‌سازد: «login:a@b.c» یا «register-ip:1.2.3.4».
  --
  -- ⚠️ ممکن است ایمیل یا IP در خود داشته باشد، پس این جدول دادهٔ شخصی دارد
  -- و مثل بقیهٔ داده‌های شخصی باید پاک شود. ردیف‌های منقضی با جاروی پایین
  -- می‌روند و چیزی برای همیشه نمی‌ماند.
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

-- جارو کردنِ ردیف‌های منقضی. بدون ایندکس، هر جارو یک اسکنِ کامل است.
create index rate_limits_reset_idx on rate_limits (reset_at);

-- افزایشِ اتمیک.
--
-- ⚠️ چرا یک تابع و نه select-then-update در کد: بین خواندن و نوشتن، درخواستِ
-- دیگری می‌تواند همان کلید را بخواند و هر دو «۱» بنویسند. با ترافیکِ موازی —
-- که دقیقاً حالتِ حملهٔ حدسِ رمز است — سقف عملاً چند برابر می‌شود. این تابع
-- در یک statement می‌شمارد و همان‌جا تصمیم می‌گیرد.
--
-- خروجی: تعدادِ فعلی و لحظهٔ پایانِ پنجره.
create or replace function rate_limit_hit(
  p_key text,
  p_window_seconds integer
)
returns table (hits integer, reset_at timestamptz)
language plpgsql
as $$
begin
  return query
  insert into rate_limits as r (key, count, reset_at)
       values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
       -- پنجره تمام شده؟ از نو شروع کن. وگرنه یکی اضافه کن.
       set count = case when r.reset_at <= now() then 1 else r.count + 1 end,
           reset_at = case when r.reset_at <= now()
                           then now() + make_interval(secs => p_window_seconds)
                           else r.reset_at end
    returning r.count, r.reset_at;
end;
$$;

-- آزاد کردنِ یک کلید — برای وقتی که ورود موفق می‌شود و نباید کاربر به‌خاطر
-- چند غلطِ قبلی قفل بماند.
create or replace function rate_limit_reset(p_key text)
returns void
language sql
as $$
  delete from rate_limits where key = p_key;
$$;
