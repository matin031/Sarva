-- ورود با گوگل: هویت‌های بیرونی، و رمزِ اختیاری.
--
-- دو تغییر، و دلیلِ هرکدام:
--
-- ۱) password_hash دیگر not null نیست.
--
--    کاربری که فقط با گوگل می‌آید هیچ رمزی ندارد. راه دیگر این بود که یک هشِ
--    تصادفیِ غیرقابل‌استفاده بنویسیم، ولی آن یعنی دیتابیس دروغ می‌گوید: ستون
--    می‌گوید «این آدم رمز دارد» در حالی که هیچ رمزی وجود ندارد که با آن
--    بخواند. آن دروغ بعداً به کدِ «فراموشی رمز» و «تغییر رمز» می‌رسد و آنجا
--    باید دوباره حدس بزنند. null یعنی همان چیزی که هست: رمزی در کار نیست.
--
--    قیدِ پایین تضمین می‌کند هیچ کاربری بدونِ *هیچ* راهِ ورود نماند: یا رمز
--    دارد، یا دستِ‌کم یک هویتِ بیرونی.
--
-- ۲) جدولِ user_identities.
--
--    چرا جدولِ جدا و نه یک ستونِ google_id روی users: یک حساب می‌تواند بیش از
--    یک راهِ ورود داشته باشد، و روزی ممکن است ارائه‌دهندهٔ دیگری اضافه شود.
--    با ستون، هر ارائه‌دهنده یک ALTER TABLE می‌خواهد و کوئری‌ها پر از
--    coalesce می‌شوند.

alter table users alter column password_hash drop not null;

create table user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- 'google' فعلاً تنها مقدار است؛ قید باز گذاشته شده تا افزودنِ بعدی فقط یک
  -- سطر تغییر باشد.
  provider text not null
    constraint user_identities_provider_check check (provider in ('google')),
  -- شناسهٔ پایدارِ کاربر نزدِ ارائه‌دهنده (`sub` در گوگل).
  --
  -- ⚠️ عمداً `sub` و نه ایمیل. ایمیلِ گوگل عوض می‌شود و — مهم‌تر — یک آدرسِ
  --  رهاشده می‌تواند به شخصِ دیگری برسد. اگر کلیدِ ما ایمیل بود، آن شخص به
  --  حسابِ قبلی وارد می‌شد. `sub` هرگز بازاستفاده نمی‌شود.
  provider_account_id text not null,
  -- ایمیلی که ارائه‌دهنده در زمانِ اتصال گزارش کرده — فقط برای نمایش و
  -- پشتیبانی. هیچ تصمیمِ امنیتی روی این ستون گرفته نمی‌شود.
  email citext,
  created_at timestamptz not null default now(),

  -- یک حسابِ گوگل فقط به یک کاربر وصل می‌شود.
  constraint user_identities_provider_account_unique
    unique (provider, provider_account_id)
);

-- «کدام راه‌های ورود را این کاربر دارد؟» — پرسشِ صفحهٔ تنظیمات.
create index user_identities_user_idx on user_identities (user_id);

-- هیچ کاربری بدونِ راهِ ورود نماند.
--
-- ⚠️ چرا trigger و نه check: یک check constraint نمی‌تواند جدولِ دیگری را
-- ببیند. این تابع هنگامِ حذفِ آخرین هویتِ بیرونیِ کاربری که رمز هم ندارد
-- جلویش را می‌گیرد.
create or replace function assert_user_has_login_method()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from users u
     where u.id = old.user_id
       and u.password_hash is null
       and not exists (
         select 1 from user_identities i
          where i.user_id = u.id and i.id <> old.id
       )
  ) then
    raise exception 'حذف این هویت، کاربر را بدون هیچ راه ورودی می‌گذارد';
  end if;
  return old;
end;
$$;

create trigger user_identities_keep_login_method
  before delete on user_identities
  for each row execute function assert_user_has_login_method();
