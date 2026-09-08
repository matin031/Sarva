# manifest نگاشت اسکیما — PostgreSQL → MySQL 8

⚠️ این فایل تولید شده است (`scripts/mysql/gen-schema.mjs`).

- جدول‌ها: **39**
- ستون‌ها: **346**
- enum ها: `grading_mode` (4 مقدار)، `question_part_type` (18 مقدار)

## ستون‌های UUID بدون DEFAULT

در Postgres این ستون‌ها `gen_random_uuid()` داشتند. MySQL معادلِ «UUID تصادفی
نسخهٔ ۴» به‌صورت DEFAULT ندارد (`UUID()` نسخهٔ ۱ است: مبتنی بر زمان و MAC، و
قابل حدس). پس هیچ DEFAULT ای گذاشته نشده و **اپ باید در هر INSERT شناسه بدهد**
— با `crypto.randomUUID()`.

- `users.id`
- `sessions.id`
- `sessions.family_id`
- `email_otps.id`
- `password_resets.id`
- `user_identities.id`
- `sms_log.id`
- `admin_audit_log.id`
- `app_error_log.id`
- `exams.id`
- `exam_sections.id`
- `exam_questions.id`
- `exam_question_parts.id`
- `exam_question_options.id`
- `exam_attempts.id`
- `questions.id`
- `question_options.id`
- `user_answers.id`
- `quiz_attempts.id`
- `quiz_attempt_answers.id`
- `vocab_words.id`
- `vocab_answers.id`
- `jasoos_suspects.id`
- `jasoos_answers.id`
- `user_bookmarks.id`
- `club_posts.id`
- `club_comments.id`
- `club_reports.id`
- `aruz_bridge_questions.id`
- `grammar_circuit_questions.id`
- `memory_pairs.id`
- `ninja_categories.id`
- `ninja_words.id`
- `site_announcements.id`
- `site_supporters.id`
- `content_reports.id`

## ستون‌هایی که DEFAULT شان عمداً حذف شد

- `club_posts.tags`

## جدول ستون‌به‌ستون

### `users`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `email` | `citext NOT NULL` | `VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci` | `—` | `—` |
| `password_hash` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `full_name` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `role` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'student'::text` | `'student'` |
| `email_verified_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `is_banned` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `sessions`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `refresh_token_hash` | `text NOT NULL` | `VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `user_agent` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `ip` | `inet` | `VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `expires_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `—` | `—` |
| `revoked_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `last_used_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `family_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `rotated_to` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |

### `email_otps`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `email` | `citext NOT NULL` | `VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci` | `—` | `—` |
| `code_hash` | `text NOT NULL` | `VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `purpose` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'signup_verify'::text` | `'signup_verify'` |
| `expires_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `—` | `—` |
| `attempts` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `consumed_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `requested_ip` | `inet` | `VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `password_resets`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `token_hash` | `text NOT NULL` | `VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `expires_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `—` | `—` |
| `consumed_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `requested_ip` | `inet` | `VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `user_identities`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `provider` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `provider_account_id` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `email` | `citext` | `VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `app_settings`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `key` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `value` | `jsonb NOT NULL` | `JSON` | `—` | `—` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |

### `sms_log`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `to_number` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `body` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `provider` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `status` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'queued'::text` | `'queued'` |
| `provider_message_id` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `error` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `rate_limits`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `key` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `count` | `integer NOT NULL` | `INT` | `0` | `0` |
| `reset_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `—` | `—` |

### `admin_audit_log`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `actor_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `actor_email` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `action` | `text NOT NULL` | `VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `target_type` | `text NOT NULL` | `VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `target_id` | `text` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `summary` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `metadata` | `jsonb NOT NULL` | `JSON` | `'{}'::jsonb` | `(_utf8mb4'{}')` |
| `ip` | `inet` | `VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `request_id` | `text` | `VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |

### `app_error_log`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `source` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `message` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `context` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `detail` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `fingerprint` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `occurrences` | `integer NOT NULL` | `INT` | `1` | `1` |
| `first_seen_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `last_seen_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `resolved_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `resolved_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `error_name` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `error_code` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `digest` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `environment` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `release` | `text` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `first_request_id` | `text` | `TEXT CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `last_request_id` | `text` | `VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `metadata` | `jsonb NOT NULL` | `JSON` | `'{}'::jsonb` | `(_utf8mb4'{}')` |
| `fingerprint_open` | `— (ستون محاسباتی، در مبدأ نیست)` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs GENERATED ALWAYS AS (IF(`resolved_at` IS NULL, `fingerprint`, NULL)) VIRTUAL` | `—` | `—` |

### `exams`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `subject` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `grade` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `title` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `exam_session` | `text` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `total_score` | `numeric(5,2) NOT NULL` | `DECIMAL(5,2)` | `20` | `20` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `exam_sections`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `exam_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `title` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `order_index` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `section_score` | `numeric(5,2) NOT NULL` | `DECIMAL(5,2)` | `—` | `—` |

### `exam_questions`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `exam_section_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `number` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `page_ref` | `smallint` | `SMALLINT` | `—` | `—` |
| `instruction` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `layout_pattern` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `order_index` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |

### `exam_question_parts`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `question_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `part_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `label` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `type` | `question_part_type NOT NULL` | `ENUM('word-meaning-input','mcq-inline','mcq-multi-select','mcq-plus-correction','short-text-answer','true-false','multi-part-inline-tagging','diagram-builder','fill-blank-term','two-answer-text','word-reorder-dnd','verse-completion','matching-pairs-with-distractor','count-answer','paired-list-error-correction','find-n-errors-in-list','open-error-correction-in-passage','mcq-select-line-in-poem')` | `—` | `—` |
| `score` | `numeric(5,2) NOT NULL` | `DECIMAL(5,2)` | `—` | `—` |
| `content` | `jsonb NOT NULL` | `JSON` | `—` | `—` |
| `correct_answer` | `jsonb NOT NULL` | `JSON` | `—` | `—` |
| `accepted_answers` | `jsonb` | `JSON` | `—` | `—` |
| `grading_mode` | `grading_mode NOT NULL` | `ENUM('exact_match','ai_semantic','ai_partial_credit','manual')` | `'exact_match'::grading_mode` | `'exact_match'` |
| `ai_grading_hint` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |

### `exam_question_options`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `question_part_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `option_key` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `order_index` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `text` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |

### `exam_attempts`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `exam_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `total_score` | `numeric(6,2) NOT NULL` | `DECIMAL(6,2)` | `—` | `—` |
| `max_score` | `numeric(6,2) NOT NULL` | `DECIMAL(6,2)` | `—` | `—` |
| `question_results` | `jsonb NOT NULL` | `JSON` | `—` | `—` |
| `answers` | `jsonb NOT NULL` | `JSON` | `'{}'::jsonb` | `(_utf8mb4'{}')` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `questions`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `type` | `text NOT NULL` | `VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `poem` | `text[]` | `JSON` | `—` | `—` |
| `audio_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `difficulty` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'medium'::text` | `'medium'` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `question_options`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `question_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `label` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `poem` | `text[]` | `JSON` | `—` | `—` |
| `audio_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `x` | `integer NOT NULL` | `INT` | `30` | `30` |

### `user_answers`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `question_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `selected_option_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `answered_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `quiz_attempts`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `total` | `integer NOT NULL` | `INT` | `—` | `—` |
| `correct` | `integer NOT NULL` | `INT` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `quiz_attempt_answers`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `attempt_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `question_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `selected_option_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `vocab_words`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `grade` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `lesson` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `word` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `meaning` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `image` | `text NOT NULL` | `VARCHAR(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `''::text` | `''` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `vocab_answers`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `grade` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `lesson` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `word` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `meaning` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `image` | `text NOT NULL` | `VARCHAR(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `''::text` | `''` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `—` | `—` |
| `answered_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `jasoos_levels`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `integer NOT NULL` | `INT` | `—` | `AUTO_INCREMENT` |
| `title` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `category` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `content_type` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `verse_line_1` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `verse_line_2` | `text NOT NULL` | `VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `''::text` | `''` |
| `is_published` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `jasoos_suspects`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `level_id` | `integer NOT NULL` | `INT` | `—` | `—` |
| `role` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_spy` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `evidence` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `word_in_verse` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `''::text` | `''` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `spy_level_id` | `— (ستون محاسباتی، در مبدأ نیست)` | `INT GENERATED ALWAYS AS (IF(`is_spy` = 1, `level_id`, NULL)) VIRTUAL` | `—` | `—` |

### `jasoos_answers`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `level_id` | `integer NOT NULL` | `INT` | `—` | `—` |
| `category` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `verse_line_1` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `verse_line_2` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `chosen_role` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `correct_role` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_correct` | `boolean NOT NULL` | `TINYINT(1)` | `—` | `—` |
| `answered_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `user_bookmarks`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `area` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `ref_id` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `title` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `subtitle` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `payload` | `jsonb NOT NULL` | `JSON` | `'{}'::jsonb` | `(_utf8mb4'{}')` |
| `note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `club_posts`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `author_name` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_anonymous` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `title` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `body` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `form` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'other'::text` | `'other'` |
| `tags` | `text[] NOT NULL` | `JSON` | `'{}'::text[]` | `⚠️ عمداً حذف شد` |
| `meter` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `status` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'pending'::text` | `'pending'` |
| `review_note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `featured` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `like_count` | `integer NOT NULL` | `INT` | `0` | `0` |
| `comment_count` | `integer NOT NULL` | `INT` | `0` | `0` |
| `reviewed_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `reviewed_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `published_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `published_at_is_null` | `— (ستون محاسباتی، در مبدأ نیست)` | `TINYINT(1) GENERATED ALWAYS AS (`published_at` IS NULL) VIRTUAL` | `—` | `—` |

### `club_comments`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `post_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `author_name` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `parent_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `reply_to_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `body` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `status` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'pending'::text` | `'pending'` |
| `review_note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `reviewed_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `reviewed_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `club_likes`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `post_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `user_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `club_reports`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `reporter_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `target_type` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `target_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `reason` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `status` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'open'::text` | `'open'` |
| `resolved_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `resolved_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `aruz_bridge_questions`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `source_id` | `integer NOT NULL` | `INT` | `—` | `—` |
| `phrase` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `correct_pattern` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `wrong_pattern` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `difficulty` | `smallint NOT NULL` | `SMALLINT` | `2` | `2` |
| `explanation` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `audio_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_published` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `sort_index` | `integer NOT NULL` | `INT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `grammar_circuit_questions`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `source_id` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `grade` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `lesson` | `smallint NOT NULL` | `SMALLINT` | `—` | `—` |
| `question_type` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'sentence'::text` | `'sentence'` |
| `payload` | `jsonb NOT NULL` | `JSON` | `—` | `—` |
| `difficulty` | `smallint NOT NULL` | `SMALLINT` | `2` | `2` |
| `explanation` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `attribution` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_published` | `boolean NOT NULL` | `TINYINT(1)` | `false` | `0` |
| `sort_index` | `integer NOT NULL` | `INT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `memory_pairs`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `grade` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `term` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `work` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `author` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `ninja_categories`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `label` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `hint` | `text NOT NULL` | `VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `''::text` | `''` |
| `enabled` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `ninja_words`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `category_id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `word` | `text NOT NULL` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `sort_index` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `site_announcements`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `title` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `body` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `tone` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'info'::text` | `'info'` |
| `link_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `link_label` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_active` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `dismissible` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `priority` | `smallint NOT NULL` | `SMALLINT` | `0` | `0` |
| `starts_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `ends_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `created_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `site_supporters`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `display_name` | `text NOT NULL` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `message` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `tier` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'supporter'::text` | `'supporter'` |
| `amount_label` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `link_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `avatar_url` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `is_visible` | `boolean NOT NULL` | `TINYINT(1)` | `true` | `1` |
| `supported_at` | `date` | `DATE` | `—` | `—` |
| `sort_index` | `integer NOT NULL` | `INT` | `0` | `0` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

### `content_reports`

| ستون | نوع مبدأ | نوع مقصد | DEFAULT مبدأ | DEFAULT مقصد |
|---|---|---|---|---|
| `id` | `uuid NOT NULL` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `gen_random_uuid()` | `⚠️ اپ می‌سازد` |
| `area` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `target_id` | `text` | `VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `target_ref` | `jsonb NOT NULL` | `JSON` | `'{}'::jsonb` | `(_utf8mb4'{}')` |
| `snapshot` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `reason` | `text NOT NULL` | `VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `user_id` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `ip` | `inet` | `VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `user_agent` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `request_id` | `text` | `TEXT CHARACTER SET ascii COLLATE ascii_bin` | `—` | `—` |
| `status` | `text NOT NULL` | `VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `'open'::text` | `'open'` |
| `admin_note` | `text` | `TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs` | `—` | `—` |
| `resolved_at` | `timestamp with time zone` | `DATETIME(6)` | `—` | `—` |
| `resolved_by` | `uuid` | `CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci` | `—` | `—` |
| `created_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |
| `updated_at` | `timestamp with time zone NOT NULL` | `DATETIME(6)` | `now()` | `CURRENT_TIMESTAMP(6)` |

