-- =============================================================================
-- ۰۰۴ — تریگرهای «سروا پلاس»
-- =============================================================================
-- سه تریگر، و هر سه یک کار می‌کنند: قاعده‌ای را که در PostgreSQL یک خط
-- اسکیما بود، در MySQL/MariaDB هم *در دیتابیس* نگه دارند و نه در کدِ برنامه.
--
-- ⚠️ چرا مهم است که در دیتابیس بمانند: هر سه قاعده جلوی خرابیِ *پول* را
-- می‌گیرند. قاعده‌ای که فقط در کد باشد، اولین باری که کسی از مسیرِ دیگری
-- (اسکریپت، کنسول SQL، کدِ فردا) بنویسد، بی‌سروصدا رد می‌شود.
--
-- چهار تریگرِ اول یک‌خطی‌اند و DELIMITER نمی‌خواهند؛ پنجمی BEGIN/END دارد و
-- مثل ۰۰۲ داخل یک بلوکِ DELIMITER نوشته شده.
-- =============================================================================


-- ── ۱ و ۲: نگهدارندهٔ «حداکثر یک نسخهٔ فروشی برای هر پلن» ────────────────────
--
-- ستونِ `sellable_plan_id` فقط برای ردیفِ فروشی مقدار می‌گیرد، و چون در
-- ایندکس یکتا NULL ها متمایزند، همان معنیِ ایندکسِ جزئیِ Postgres را می‌دهد.
--
-- (چرا ستونِ تولیدشده نشد: MariaDB اجازهٔ IF/CASE در GENERATED ALWAYS AS
--  نمی‌دهد — خطای ۱۹۰۱ — هرچند MySQL 8 می‌دهد.)

CREATE TRIGGER `plus_plan_versions_sellable_bi` BEFORE INSERT ON `plus_plan_versions`
FOR EACH ROW SET NEW.`sellable_plan_id` = IF(NEW.`is_sellable` = 1, NEW.`plan_id`, NULL);

CREATE TRIGGER `plus_plan_versions_sellable_bu` BEFORE UPDATE ON `plus_plan_versions`
FOR EACH ROW SET NEW.`sellable_plan_id` = IF(NEW.`is_sellable` = 1, NEW.`plan_id`, NULL);


-- ── ۳ و ۴: نگهدارندهٔ «حداکثر یک سفارشِ باز برای هر (کاربر، نسخهٔ پلن)» ──────
--
-- قلبِ idempotency خرید. دوبار کلیک، رفرش، دکمهٔ back و دو تبِ باز همگی به
-- همین ایندکس می‌خورند و کدِ بالادست سفارشِ موجود را برمی‌گرداند.

CREATE TRIGGER `plus_orders_open_key_bi` BEFORE INSERT ON `plus_orders`
FOR EACH ROW SET NEW.`open_plan_version_id` = IF(NEW.`status` = 'pending', NEW.`plan_version_id`, NULL);

CREATE TRIGGER `plus_orders_open_key_bu` BEFORE UPDATE ON `plus_orders`
FOR EACH ROW SET NEW.`open_plan_version_id` = IF(NEW.`status` = 'pending', NEW.`plan_version_id`, NULL);


-- ── ۵: تغییرناپذیریِ نسخهٔ فروخته‌شده ────────────────────────────────────────
--
-- ⚠️ چرا در دیتابیس و نه در کد: «کد فراموش نمی‌کند» یک آرزوست. کافی است یک
-- روز کسی برای «اصلاح یک غلط تایپی» روی عنوان `UPDATE` بزند و ناخواسته مبلغ
-- هم در همان دستور باشد. آن لحظه هیچ خطایی نمی‌بینید و فقط ماه‌ها بعد، از
-- روی شکایتِ یک کاربر می‌فهمید که گذشته بازنویسی شده.
--
-- تنها چیزهایی که اجازهٔ تغییر دارند `is_sellable` و `note` اند: یعنی می‌شود
-- یک نسخه را از فروش خارج کرد، ولی نمی‌شود چیزی را که فروخته شده عوض کرد.
--
-- SIGNAL با SQLSTATE '45000' به errno 1644 می‌رسد، که `lib/db` با
-- `isTriggerAssertion()` می‌شناسدش.

DELIMITER $$
CREATE TRIGGER `plus_plan_versions_immutable_bu` BEFORE UPDATE ON `plus_plan_versions`
FOR EACH ROW
BEGIN
  IF NEW.`plan_id`       <> OLD.`plan_id`
  OR NEW.`version`       <> OLD.`version`
  OR NEW.`title`         <> OLD.`title`
  OR NEW.`duration_days` <> OLD.`duration_days`
  OR NEW.`amount_rials`  <> OLD.`amount_rials`
  OR NEW.`currency`      <> OLD.`currency` THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'نسخهٔ پلن پس از ساخته‌شدن تغییر نمی‌کند؛ نسخهٔ تازه بسازید.';
  END IF;
END$$
DELIMITER ;
