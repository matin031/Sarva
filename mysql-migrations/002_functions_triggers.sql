-- =============================================================================
-- سروا — تریگرها، view و روتین‌های MySQL
-- =============================================================================
-- این فایل دست‌نویس است (برخلاف 001 که تولید می‌شود)، چون هیچ‌کدام از این‌ها
-- ترجمهٔ مکانیکیِ چیزی نیستند؛ هرکدام یک تصمیم دارند.
--
-- ⚠️ DELIMITER اینجا یک دستور *کلاینت* است نه SQL. اجراکنندهٔ ما
-- (scripts/mysql/migrate.mjs) آن را می‌فهمد و به درایور نمی‌فرستد — و همین
-- باعث می‌شود این فایل با `mysql < file` هم قابل اجرا بماند، که برای دیباگ
-- دستی ارزش دارد.
-- =============================================================================


-- =============================================================================
-- بخش ۱ — view
-- =============================================================================
-- مجموع امتیاز parts برای هر سؤال.
--
-- در مبدأ sum(qp.score) روی numeric(5,2) بود و نتیجه‌اش numeric. در MySQL
-- SUM(DECIMAL) هم DECIMAL می‌دهد، پس دقت حفظ می‌شود و چیزی به double تبدیل
-- نمی‌شود. (اگر double می‌شد، ۰٫۱+۰٫۲ در نمرهٔ امتحان دیده می‌شد.)

CREATE OR REPLACE VIEW `exam_question_totals` AS
SELECT
  q.`id`              AS `question_id`,
  q.`exam_section_id` AS `exam_section_id`,
  q.`number`          AS `number`,
  SUM(qp.`score`)     AS `total_score`
FROM `exam_questions` q
JOIN `exam_question_parts` qp ON qp.`question_id` = q.`id`
GROUP BY q.`id`, q.`exam_section_id`, q.`number`;


-- =============================================================================
-- بخش ۲ — updated_at
-- =============================================================================
-- در مبدأ یک تابع touch_updated_at() بود و هفت تریگر صدایش می‌زدند. MySQL
-- تابعِ trigger ندارد، پس بدنه در هر تریگر تکرار می‌شود — هفت بار یک خط.
--
-- چرا تریگر و نه `ON UPDATE CURRENT_TIMESTAMP(6)` روی ستون: با آن ویژگی،
-- ستون در *هر* UPDATE عوض می‌شود و راهی برای خاموش کردنش نیست. ETL باید
-- بتواند updated_at اصلی را بنویسد؛ با تریگر می‌شود موقتاً حذفش کرد
-- (ابزار ETL دقیقاً همین کار را می‌کند)، با ویژگیِ ستون نمی‌شود.

DELIMITER $$

CREATE TRIGGER `users_touch` BEFORE UPDATE ON `users`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `club_posts_touch` BEFORE UPDATE ON `club_posts`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `aruz_bridge_questions_touch` BEFORE UPDATE ON `aruz_bridge_questions`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `grammar_circuit_questions_touch` BEFORE UPDATE ON `grammar_circuit_questions`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `site_announcements_touch` BEFORE UPDATE ON `site_announcements`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `site_supporters_touch` BEFORE UPDATE ON `site_supporters`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$

CREATE TRIGGER `content_reports_touch` BEFORE UPDATE ON `content_reports`
FOR EACH ROW BEGIN SET NEW.`updated_at` = CURRENT_TIMESTAMP(6); END$$


-- =============================================================================
-- بخش ۳ — شمارنده‌های کلاب
-- =============================================================================
-- در مبدأ دو تابع بودند که روی «INSERT OR DELETE» و «INSERT OR DELETE OR
-- UPDATE» بسته می‌شدند. MySQL تریگرِ چندرویدادی ندارد، پس هر رویداد تریگر
-- خودش را می‌خواهد: دو تا برای like و سه تا برای comment.
--
-- ⚠️⚠️ تفاوتی که باید بلند گفته شود:
--
--   در PostgreSQL، حذفِ آبشاریِ FK تریگرهای ردیفی را **اجرا می‌کند**.
--   در MySQL، حذفِ آبشاریِ FK تریگرها را **اجرا نمی‌کند**.
--
-- یعنی این سناریو در MySQL بی‌صدا خراب می‌شود:
--
--   کاربر «الف» پستِ کاربر «ب» را لایک کرده. حالا حساب «الف» حذف می‌شود.
--   FK لایک را cascade می‌کند، ولی تریگر اجرا نمی‌شود، پس like_count پستِ
--   «ب» یکی بیشتر از واقعیت می‌ماند — برای همیشه.
--
-- این جای «شاید» ندارد، در مستندات MySQL صریح است، و با تست هم تأیید شد.
-- راه‌حل در تریگر نیست چون تریگر اصلاً صدا زده نمی‌شود؛ راه‌حل این است که
-- مسیرِ حذفِ کاربر خودش شمارنده‌ها را بازسازی کند. رویهٔ زیر همان کار را
-- می‌کند و lib/admin/user-actions.ts داخل تراکنشِ حذف صدایش می‌زند.
--
-- (این رویه برای تعمیرِ دستی هم هست: اگر شمارنده‌ای به هر دلیل کج شد،
--  یک بار صدا زدنش بدون آرگومان همه را از نو می‌سازد.)

CREATE TRIGGER `club_likes_count_ins` AFTER INSERT ON `club_likes`
FOR EACH ROW BEGIN
  UPDATE `club_posts` p
     SET p.`like_count` = (SELECT COUNT(*) FROM `club_likes` l WHERE l.`post_id` = p.`id`)
   WHERE p.`id` = NEW.`post_id`;
END$$

CREATE TRIGGER `club_likes_count_del` AFTER DELETE ON `club_likes`
FOR EACH ROW BEGIN
  UPDATE `club_posts` p
     SET p.`like_count` = (SELECT COUNT(*) FROM `club_likes` l WHERE l.`post_id` = p.`id`)
   WHERE p.`id` = OLD.`post_id`;
END$$

-- شمارشِ دیدگاه فقط approved ها را می‌شمارد — مثل مبدأ. یک دیدگاهِ pending
-- نباید روی عدد بنشیند، وگرنه کاربر عددی می‌بیند که با فهرست نمی‌خواند.
CREATE TRIGGER `club_comments_count_ins` AFTER INSERT ON `club_comments`
FOR EACH ROW BEGIN
  UPDATE `club_posts` p
     SET p.`comment_count` = (
           SELECT COUNT(*) FROM `club_comments` c
            WHERE c.`post_id` = p.`id` AND c.`status` = 'approved')
   WHERE p.`id` = NEW.`post_id`;
END$$

CREATE TRIGGER `club_comments_count_del` AFTER DELETE ON `club_comments`
FOR EACH ROW BEGIN
  UPDATE `club_posts` p
     SET p.`comment_count` = (
           SELECT COUNT(*) FROM `club_comments` c
            WHERE c.`post_id` = p.`id` AND c.`status` = 'approved')
   WHERE p.`id` = OLD.`post_id`;
END$$

-- UPDATE مهم است چون تأیید/رد کردنِ یک دیدگاه عدد را عوض می‌کند.
-- هر دو post_id (قدیم و جدید) به‌روز می‌شوند: post_id عملاً عوض نمی‌شود،
-- ولی اگر روزی شد، تکیه بر یکی از دو طرف یک شمارندهٔ کج به جا می‌گذاشت.
CREATE TRIGGER `club_comments_count_upd` AFTER UPDATE ON `club_comments`
FOR EACH ROW BEGIN
  UPDATE `club_posts` p
     SET p.`comment_count` = (
           SELECT COUNT(*) FROM `club_comments` c
            WHERE c.`post_id` = p.`id` AND c.`status` = 'approved')
   WHERE p.`id` IN (OLD.`post_id`, NEW.`post_id`);
END$$


-- =============================================================================
-- بخش ۴ — بازسازی شمارنده‌ها
-- =============================================================================
-- p_post_id = NULL یعنی «همه». برای:
--   • مسیرِ حذفِ کاربر (چون cascade تریگر را صدا نمی‌زند)
--   • پایانِ ETL (چون داده بدون تریگر بارگذاری می‌شود)
--   • تعمیر دستی

CREATE PROCEDURE `club_recount` (IN p_post_id CHAR(36))
BEGIN
  UPDATE `club_posts` p
     SET p.`like_count` = (
           SELECT COUNT(*) FROM `club_likes` l WHERE l.`post_id` = p.`id`),
         p.`comment_count` = (
           SELECT COUNT(*) FROM `club_comments` c
            WHERE c.`post_id` = p.`id` AND c.`status` = 'approved')
   WHERE p_post_id IS NULL OR p.`id` = p_post_id;
END$$


-- =============================================================================
-- بخش ۵ — نگهبانِ «آخرین راه ورود»
-- =============================================================================
-- مبدأ: BEFORE DELETE روی user_identities که اگر کاربر رمز نداشته باشد و این
-- تنها identity اش باشد، exception می‌دهد.
--
-- ⚠️ نکتهٔ ظریف که در MySQL *به نفع ما* تمام می‌شود:
--
--   در PostgreSQL این تریگر هنگام حذفِ خودِ کاربر هم اجرا می‌شد (چون cascade
--   تریگر را صدا می‌زند). آنجا فقط به این دلیل خطا نمی‌داد که ردیف users در
--   همان لحظه رفته بود و زیرکوئری چیزی پیدا نمی‌کرد.
--
--   در MySQL cascade اصلاً تریگر را صدا نمی‌زند، پس حذفِ کاربر هرگز به این
--   نگهبان نمی‌خورد و نگهبان فقط روی حذفِ *مستقیمِ* identity کار می‌کند —
--   یعنی دقیقاً همان چیزی که از اول می‌خواستیم، بدون تکیه بر یک تصادف.
--
-- SIGNAL معادل raise exception است. SQLSTATE '45000' یعنی «خطای
-- تعریف‌شدهٔ کاربر»؛ درایور آن را با errno=1644 می‌دهد و lib/db آن را به
-- خطای معنایی تبدیل می‌کند.

CREATE TRIGGER `user_identities_keep_login_method` BEFORE DELETE ON `user_identities`
FOR EACH ROW BEGIN
  IF EXISTS (
    SELECT 1 FROM `users` u
     WHERE u.`id` = OLD.`user_id`
       AND u.`password_hash` IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM `user_identities` i
          WHERE i.`user_id` = u.`id` AND i.`id` <> OLD.`id`)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'حذف این هویت، کاربر را بدون هیچ راه ورودی می‌گذارد';
  END IF;
END$$

DELIMITER ;


-- =============================================================================
-- بخش ۶ — محدودسازی نرخ
-- =============================================================================
-- ⚠️ عمداً هیچ تابع/رویه‌ای برای rate_limit_hit ساخته نشده.
--
-- در مبدأ یک تابعِ table-returning بود که کل کار را در یک statement انجام
-- می‌داد: INSERT ... ON CONFLICT DO UPDATE ... RETURNING. آن ترکیب در MySQL
-- وجود ندارد — نه RETURNING هست و نه تابع می‌تواند مجموعه برگرداند.
--
-- ترجمهٔ ساده‌لوحانه این می‌شد: یک رویه که upsert کند و بعد SELECT بزند. ولی
-- بدنهٔ رویه در حالت autocommit، دو تراکنشِ جداست؛ قفلِ ردیف بعد از upsert
-- آزاد می‌شود و SELECT می‌تواند مقدارِ کسِ دیگری را بخواند. یعنی همان
-- lost-update ای که کامنتِ lib/api/rate-limit-db.ts می‌گوید باید جلویش گرفته
-- شود، از در پشتی برمی‌گشت.
--
-- پس معادلِ کارکردی در کد است، نه در دیتابیس: upsert و SELECT داخل *یک*
-- تراکنش روی *یک* اتصال. آنجا قفلِ ردیفِ InnoDB تا COMMIT نگه داشته می‌شود،
-- پس هیچ درخواستِ موازی‌ای نمی‌تواند بین این دو بنویسد.
--
-- پیاده‌سازی و آزمونِ موازی‌اش: lib/api/rate-limit-db.ts
