-- =============================================================================
-- ۰۱۱ — هر سؤال یک بار در هر دورِ عروض سماعی
-- =============================================================================
--
-- تا امروز `/api/v1/quiz/attempt` آرایهٔ پاسخ‌ها را همان‌طور که رسیده بود ثبت
-- می‌کرد. فرستادن *یک* سؤالِ درست به‌صورت ۲۰۰ ردیفِ تکراری، یک دورِ
-- «۲۰۰ از ۲۰۰» می‌ساخت — و آمار پنل از همین ردیف‌ها ساخته می‌شود.
--
-- خودِ endpoint حالا تکرار را رد می‌کند. این ایندکس لایهٔ دوم است: اگر روزی
-- مسیر دیگری برای نوشتن در این جدول باز شد، دیتابیس خودش جلویش را می‌گیرد.
--
-- ⚠️ اگر ردیف‌های تکراریِ قدیمی وجود داشته باشند، ساختِ ایندکس شکست می‌خورد.
--    عمدی است: بهتر است migration سر و صدا کند تا کسی آن دورها را ببیند.
--    برای دیدنشان پیش از اجرا:
--      select attempt_id, question_id, count(*)
--        from quiz_attempt_answers group by 1,2 having count(*) > 1;
--
--    و برای پاک کردنشان (فقط اگر تصمیم گرفتید):
--      delete from quiz_attempt_answers a using quiz_attempt_answers b
--       where a.ctid > b.ctid and a.attempt_id = b.attempt_id
--         and a.question_id = b.question_id;

create unique index quiz_attempt_answers_unique_question
  on quiz_attempt_answers (attempt_id, question_id);
