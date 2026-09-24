-- =============================================================================
-- ۰۲۱ — پلنِ تستِ درگاه: ۱۰٬۰۰۰ تومان، یک روز
-- =============================================================================
--
-- برای امتحانِ درگاهِ واقعی با کمترین مبلغ. بعد از تست از «پنل مدیریت ← سروا
-- پلاس» غیرفعالش کنید؛ حذف نمی‌شود تا سفارش‌هایش سر جایشان بمانند.
--
-- اجرای دوباره بی‌اثر است: اگر پلنِ `plus_test` از قبل باشد دست نمی‌خورد.

INSERT INTO `plus_plans` (`id`, `code`, `title`, `subtitle`, `duration_days`, `sort_index`, `is_active`)
SELECT UUID(), 'plus_test', 'پلن تست پرداخت', 'فقط برای تست درگاه', 1, 99, 1
 WHERE NOT EXISTS (SELECT 1 FROM `plus_plans` WHERE `code` = 'plus_test');

INSERT INTO `plus_plan_versions`
  (`id`, `plan_id`, `version`, `title`, `duration_days`, `amount_rials`, `is_sellable`, `note`)
SELECT UUID(), p.`id`, 1, p.`title`, p.`duration_days`, 100000, 1, 'پلن تست درگاه'
  FROM `plus_plans` p
 WHERE p.`code` = 'plus_test'
   AND NOT EXISTS (SELECT 1 FROM `plus_plan_versions` v WHERE v.`plan_id` = p.`id`);
