-- =============================================================================
-- ۰۰۳ — ایندکس‌های فید سروا کلاب، هم‌شکل با ترتیبی که کوئری واقعاً می‌خواهد
-- =============================================================================
--
-- انگیزه دو چیز است، و هر دو باگ‌اند:
--
-- ۱) **ترتیب فید یک tiebreaker کم داشت.** کوئری فید با
--    `order by featured desc, [like_count|comment_count desc,] published_at desc`
--    مرتب می‌شد و صفحه‌بندی‌اش با offset است. وقتی مدیر چند سروده را پشت سر هم
--    تأیید می‌کند، published_at همه‌شان عملاً یکی می‌شود و بقیهٔ کلیدها هم برای
--    سرودهٔ تازه صفر است — یعنی ردیف‌های کاملاً هم‌ارز. ترتیبِ ردیف‌های هم‌ارز
--    را پستگرس تضمین نمی‌کند، پس صفحهٔ ۲ می‌توانست سروده‌ای را دوباره نشان بدهد
--    و سرودهٔ دیگری را کلاً نشان ندهد. در آزمون با ۶۰ سرودهٔ هم‌زمان دقیقاً همین
--    شد: ۵۹ یکتا از ۶۰، در هر سه مرتب‌سازی. `lib/club/queries.ts` حالا `, id`
--    را به انتهای ترتیب اضافه می‌کند.
--
-- ۲) **ایندکس‌های قبلی هیچ‌وقت با آن ترتیب جور نبودند** — حتی پیش از این تغییر.
--    کوئری `published_at desc nulls last` می‌خواهد، ولی پیش‌فرضِ پستگرس برای
--    `desc` همان `nulls first` است. پس `(status, featured desc, published_at
--    desc)` هرگز نمی‌توانست جای مرتب‌سازی را بگیرد و پلن همیشه یک Sort کامل
--    داشت. با تعداد کم دیده نمی‌شد؛ با چند هزار سروده می‌شد.
--
-- این migration ایندکس‌ها را دقیقاً هم‌شکل ترتیبِ کوئری بازمی‌سازد. فقط ایندکس
-- عوض می‌شود — نه داده، نه ستون — پس برگشت‌پذیر و بی‌خطر است.

drop index if exists club_posts_feed_idx;
drop index if exists club_posts_likes_idx;

-- «تازه‌ترین»
create index club_posts_feed_idx
  on club_posts (status, featured desc, published_at desc nulls last, id);

-- «پرپسندترین»
create index club_posts_likes_idx
  on club_posts (status, featured desc, like_count desc, published_at desc nulls last, id);

-- «پرگفت‌وگوترین» — این یکی از اول وجود نداشت و همیشه Sort کامل می‌خورد
create index club_posts_discussed_idx
  on club_posts (status, featured desc, comment_count desc, published_at desc nulls last, id);
