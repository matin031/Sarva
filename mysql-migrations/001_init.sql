-- =============================================================================
-- سروا — اسکیمای MySQL 8
-- =============================================================================
-- ⚠️ این فایل تولید شده است. دستی ویرایشش نکن.
--
--     SOURCE_POSTGRES_URL=... node scripts/mysql/gen-schema.mjs
--
-- منبع: کاتالوگ زندهٔ PostgreSQL بعد از اعمال migrations/001..014.
-- تصمیم‌های نگاشت در scripts/mysql/type-map.mjs و index-overrides.mjs اند و
-- جدول کامل ستون‌به‌ستون در docs/mysql-schema-manifest.md.
--
-- تریگرها، view و روتین‌ها در 002_functions_triggers.sql اند — نه اینجا، چون
-- MySQL برای CREATE TRIGGER و CREATE FUNCTION جداکنندهٔ دستور دیگری می‌خواهد.
-- =============================================================================


CREATE TABLE `users` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `email` VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
  `password_hash` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `full_name` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `role` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'student',
  `email_verified_at` DATETIME(6) NULL,
  `is_banned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  CONSTRAINT `users_role_check` CHECK (`role` IN ('student', 'admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `sessions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `refresh_token_hash` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_agent` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `revoked_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_used_at` DATETIME(6) NULL,
  `family_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `rotated_to` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_refresh_token_hash_key` (`refresh_token_hash`),
  KEY `sessions_expires_idx` (`revoked_at`, `expires_at`),
  KEY `sessions_family_idx` (`revoked_at`, `family_id`),
  KEY `sessions_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `sessions_rotated_to_fkey` FOREIGN KEY (`rotated_to`) REFERENCES `sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `email_otps` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `email` VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
  `code_hash` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `purpose` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'signup_verify',
  `expires_at` DATETIME(6) NOT NULL,
  `attempts` SMALLINT NOT NULL DEFAULT 0,
  `consumed_at` DATETIME(6) NULL,
  `requested_ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `email_otps_ip_idx` (`requested_ip`, `created_at` DESC),
  KEY `email_otps_lookup_idx` (`email`, `purpose`, `created_at` DESC),
  CONSTRAINT `email_otps_purpose_check` CHECK (`purpose` IN ('signup_verify', 'email_change'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `password_resets` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `token_hash` VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  `consumed_at` DATETIME(6) NULL,
  `requested_ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_resets_token_hash_key` (`token_hash`),
  KEY `password_resets_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `password_resets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `user_identities` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `provider` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `provider_account_id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `email` VARCHAR(320) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_identities_provider_account_unique` (`provider`, `provider_account_id`),
  KEY `user_identities_user_idx` (`user_id`),
  CONSTRAINT `user_identities_provider_check` CHECK (provider = 'google'),
  CONSTRAINT `user_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `app_settings` (
  `key` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `value` JSON NOT NULL,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  PRIMARY KEY (`key`),
  CONSTRAINT `app_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `sms_log` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `to_number` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `provider` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `status` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'queued',
  `provider_message_id` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `error` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `sms_log_created_idx` (`created_at` DESC),
  CONSTRAINT `sms_log_status_check` CHECK (`status` IN ('queued', 'sent', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `rate_limits` (
  `key` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `count` INT NOT NULL DEFAULT 0,
  `reset_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`key`),
  KEY `rate_limits_reset_idx` (`reset_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `admin_audit_log` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `actor_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `actor_email` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `action` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_type` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `summary` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `metadata` JSON NOT NULL DEFAULT (_utf8mb4'{}'),
  `ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `request_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`id`),
  KEY `admin_audit_action_idx` (`action`, `created_at` DESC),
  KEY `admin_audit_actor_idx` (`actor_id`, `created_at` DESC),
  KEY `admin_audit_created_idx` (`created_at` DESC),
  KEY `admin_audit_request_idx` (`request_id`),
  KEY `admin_audit_target_idx` (`target_type`, `target_id`),
  CONSTRAINT `admin_audit_log_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `app_error_log` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `source` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `message` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `context` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `detail` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `fingerprint` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `occurrences` INT NOT NULL DEFAULT 1,
  `first_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_seen_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `resolved_at` DATETIME(6) NULL,
  `resolved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `error_name` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `error_code` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `digest` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `environment` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `release` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `first_request_id` TEXT CHARACTER SET ascii COLLATE ascii_bin NULL,
  `last_request_id` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `metadata` JSON NOT NULL DEFAULT (_utf8mb4'{}'),
  `fingerprint_open` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs GENERATED ALWAYS AS (IF(`resolved_at` IS NULL, `fingerprint`, NULL)) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_error_fingerprint_idx` (`fingerprint_open`),
  KEY `app_error_last_request_idx` (`last_request_id`),
  KEY `app_error_open_idx` (`resolved_at`, `last_seen_at` DESC),
  KEY `app_error_recent_idx` (`last_seen_at` DESC),
  KEY `app_error_release_idx` (`release`, `last_seen_at` DESC),
  CONSTRAINT `app_error_log_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exams` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `subject` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `grade` SMALLINT NOT NULL,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `exam_session` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `total_score` DECIMAL(5,2) NOT NULL DEFAULT 20,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `exams_session_idx` (`exam_session`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exam_sections` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `exam_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `order_index` SMALLINT NOT NULL,
  `section_score` DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_sections_exam_id_order_index_key` (`exam_id`, `order_index`),
  CONSTRAINT `exam_sections_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exam_questions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `exam_section_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `number` SMALLINT NOT NULL,
  `page_ref` SMALLINT NULL,
  `instruction` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `layout_pattern` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `order_index` SMALLINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_questions_exam_section_id_number_key` (`exam_section_id`, `number`),
  KEY `exam_questions_section_idx` (`exam_section_id`),
  CONSTRAINT `exam_questions_layout_pattern_check` CHECK ((layout_pattern IS NULL) OR `layout_pattern` IN ('multi-subquestion', 'bracket-choice-mcq', 'multi-item-true-false', 'multi-paraphrase-block', 'list-of-parallel-blanks')),
  CONSTRAINT `exam_questions_exam_section_id_fkey` FOREIGN KEY (`exam_section_id`) REFERENCES `exam_sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exam_question_parts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `part_index` SMALLINT NOT NULL DEFAULT 0,
  `label` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `type` ENUM('word-meaning-input','mcq-inline','mcq-multi-select','mcq-plus-correction','short-text-answer','true-false','multi-part-inline-tagging','diagram-builder','fill-blank-term','two-answer-text','word-reorder-dnd','verse-completion','matching-pairs-with-distractor','count-answer','paired-list-error-correction','find-n-errors-in-list','open-error-correction-in-passage','mcq-select-line-in-poem') NOT NULL,
  `score` DECIMAL(5,2) NOT NULL,
  `content` JSON NOT NULL,
  `correct_answer` JSON NOT NULL,
  `accepted_answers` JSON NULL,
  `grading_mode` ENUM('exact_match','ai_semantic','ai_partial_credit','manual') NOT NULL DEFAULT 'exact_match',
  `ai_grading_hint` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_question_parts_question_id_part_index_key` (`question_id`, `part_index`),
  KEY `exam_question_parts_question_idx` (`question_id`),
  CONSTRAINT `exam_question_parts_score_check` CHECK (score > 0),
  CONSTRAINT `exam_question_parts_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exam_question_options` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_part_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `option_key` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `order_index` SMALLINT NOT NULL,
  `text` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exam_question_options_question_part_id_order_index_key` (`question_part_id`, `order_index`),
  KEY `exam_question_options_part_idx` (`question_part_id`),
  CONSTRAINT `exam_question_options_question_part_id_fkey` FOREIGN KEY (`question_part_id`) REFERENCES `exam_question_parts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `exam_attempts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `exam_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `total_score` DECIMAL(6,2) NOT NULL,
  `max_score` DECIMAL(6,2) NOT NULL,
  `question_results` JSON NOT NULL,
  `answers` JSON NOT NULL DEFAULT (_utf8mb4'{}'),
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `exam_attempts_exam_idx` (`exam_id`),
  KEY `exam_attempts_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `exam_attempts_max_score_positive` CHECK (max_score > 0),
  CONSTRAINT `exam_attempts_score_within_max` CHECK (total_score <= max_score),
  CONSTRAINT `exam_attempts_total_score_nonneg` CHECK (total_score >= 0),
  CONSTRAINT `exam_attempts_exam_id_fkey` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exam_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `questions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `type` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `poem` JSON NULL,
  `audio_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `difficulty` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'medium',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `questions_type_difficulty_idx` (`type`, `difficulty`),
  CONSTRAINT `questions_difficulty_check` CHECK (`difficulty` IN ('easy', 'medium', 'hard'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `question_options` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `label` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `poem` JSON NULL,
  `audio_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `x` INT NOT NULL DEFAULT 30,
  PRIMARY KEY (`id`),
  KEY `question_options_question_idx` (`question_id`),
  CONSTRAINT `question_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `user_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `selected_option_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_answers_user_id_question_id_key` (`user_id`, `question_id`),
  KEY `user_answers_user_idx` (`user_id`, `answered_at` DESC),
  CONSTRAINT `user_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_answers_selected_option_id_fkey` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_answers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `quiz_attempts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `total` INT NOT NULL,
  `correct` INT NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `quiz_attempts_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `quiz_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `quiz_attempt_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `attempt_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `question_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `selected_option_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `is_correct` TINYINT(1) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `quiz_attempt_answers_attempt_idx` (`attempt_id`),
  UNIQUE KEY `quiz_attempt_answers_unique_question` (`attempt_id`, `question_id`),
  CONSTRAINT `quiz_attempt_answers_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `quiz_attempts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quiz_attempt_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quiz_attempt_answers_selected_option_id_fkey` FOREIGN KEY (`selected_option_id`) REFERENCES `question_options` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `vocab_words` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `grade` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `lesson` SMALLINT NOT NULL,
  `word` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `meaning` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `image` VARCHAR(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT '',
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `vocab_words_grade_lesson_idx` (`grade`, `lesson`, `sort_index`),
  CONSTRAINT `vocab_words_grade_check` CHECK (`grade` IN ('dahom', 'yazdahom', 'davazdahom')),
  CONSTRAINT `vocab_words_lesson_check` CHECK ((lesson >= 1) AND (lesson <= 18))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `vocab_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `grade` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `lesson` SMALLINT NOT NULL,
  `word` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `meaning` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `image` VARCHAR(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT '',
  `is_correct` TINYINT(1) NOT NULL,
  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `vocab_answers_user_idx` (`user_id`, `answered_at` DESC),
  CONSTRAINT `vocab_answers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `jasoos_levels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `category` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `content_type` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `verse_line_1` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `verse_line_2` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT '',
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `jasoos_levels_order_idx` (`sort_index`, `id`),
  CONSTRAINT `jasoos_levels_category_check` CHECK (`category` IN ('دستوری', 'آرایه')),
  CONSTRAINT `jasoos_levels_content_type_check` CHECK (`content_type` IN ('poem', 'prose'))
) AUTO_INCREMENT=1000 ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `jasoos_suspects` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `level_id` INT NOT NULL,
  `role` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `is_spy` TINYINT(1) NOT NULL DEFAULT 0,
  `evidence` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `word_in_verse` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT '',
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `spy_level_id` INT GENERATED ALWAYS AS (IF(`is_spy` = 1, `level_id`, NULL)) VIRTUAL,
  PRIMARY KEY (`id`),
  KEY `jasoos_suspects_level_idx` (`level_id`, `sort_index`),
  UNIQUE KEY `jasoos_suspects_one_spy` (`spy_level_id`),
  CONSTRAINT `jasoos_suspects_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `jasoos_levels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `jasoos_answers` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `level_id` INT NOT NULL,
  `category` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `verse_line_1` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `verse_line_2` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `chosen_role` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `correct_role` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `is_correct` TINYINT(1) NOT NULL,
  `answered_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `jasoos_answers_user_idx` (`user_id`, `answered_at` DESC),
  CONSTRAINT `jasoos_answers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `user_bookmarks` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `area` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `ref_id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `subtitle` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `payload` JSON NOT NULL DEFAULT (_utf8mb4'{}'),
  `note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_bookmarks_user_id_area_ref_id_key` (`user_id`, `area`, `ref_id`),
  KEY `user_bookmarks_user_area_idx` (`user_id`, `area`, `created_at` DESC),
  KEY `user_bookmarks_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `user_bookmarks_area_check` CHECK (`area` IN ('aruz', 'vocab', 'exam', 'jasoos')),
  CONSTRAINT `user_bookmarks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `club_posts` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `author_name` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `form` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'other',
  `tags` JSON NOT NULL,
  `meter` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `status` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'pending',
  `review_note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `like_count` INT NOT NULL DEFAULT 0,
  `comment_count` INT NOT NULL DEFAULT 0,
  `reviewed_at` DATETIME(6) NULL,
  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `published_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `published_at_is_null` TINYINT(1) GENERATED ALWAYS AS (`published_at` IS NULL) VIRTUAL,
  PRIMARY KEY (`id`),
  KEY `club_posts_discussed_idx` (`status`, `featured` DESC, `comment_count` DESC, `published_at_is_null`, `published_at` DESC, `id`),
  KEY `club_posts_feed_idx` (`status`, `featured` DESC, `published_at_is_null`, `published_at` DESC, `id`),
  KEY `club_posts_likes_idx` (`status`, `featured` DESC, `like_count` DESC, `published_at_is_null`, `published_at` DESC, `id`),
  KEY `club_posts_status_idx` (`status`, `created_at` DESC),
  KEY `club_posts_tags_idx` ( (CAST(`tags` AS CHAR(64) ARRAY)) ),
  KEY `club_posts_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `club_posts_body_len` CHECK ((CHAR_LENGTH(body) >= 5) AND (CHAR_LENGTH(body) <= 4000)),
  CONSTRAINT `club_posts_form_check` CHECK (`form` IN ('ghazal', 'ghaside', 'masnavi', 'robaee', 'dobeyti', 'chaharpare', 'ghete', 'nimaei', 'sepid', 'other')),
  CONSTRAINT `club_posts_status_check` CHECK (`status` IN ('pending', 'approved', 'rejected')),
  CONSTRAINT `club_posts_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `club_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `club_comments` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `post_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `author_name` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `parent_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `reply_to_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `status` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'pending',
  `review_note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `reviewed_at` DATETIME(6) NULL,
  `reviewed_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `club_comments_post_idx` (`post_id`, `status`, `created_at`),
  KEY `club_comments_reply_to_idx` (`reply_to_id`),
  KEY `club_comments_status_idx` (`status`, `created_at` DESC),
  KEY `club_comments_user_idx` (`user_id`, `created_at` DESC),
  CONSTRAINT `club_comments_body_len` CHECK ((CHAR_LENGTH(body) >= 2) AND (CHAR_LENGTH(body) <= 1500)),
  CONSTRAINT `club_comments_status_check` CHECK (`status` IN ('pending', 'approved', 'rejected')),
  CONSTRAINT `club_comments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `club_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `club_comments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `club_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `club_comments_reply_to_id_fkey` FOREIGN KEY (`reply_to_id`) REFERENCES `club_comments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `club_comments_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `club_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `club_likes` (
  `post_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`post_id`, `user_id`),
  KEY `club_likes_user_idx` (`user_id`),
  CONSTRAINT `club_likes_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `club_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `club_likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `club_reports` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `reporter_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `target_type` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `reason` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `status` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'open',
  `resolved_at` DATETIME(6) NULL,
  `resolved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `club_reports_reporter_id_target_type_target_id_key` (`reporter_id`, `target_type`, `target_id`),
  KEY `club_reports_status_idx` (`status`, `created_at` DESC),
  CONSTRAINT `club_reports_reason_check` CHECK (`reason` IN ('plagiarism', 'offensive', 'spam', 'off_topic', 'other')),
  CONSTRAINT `club_reports_status_check` CHECK (`status` IN ('open', 'resolved', 'dismissed')),
  CONSTRAINT `club_reports_target_check` CHECK (`target_type` IN ('post', 'comment')),
  CONSTRAINT `club_reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `club_reports_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `aruz_bridge_questions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `source_id` INT NOT NULL,
  `phrase` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `correct_pattern` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `wrong_pattern` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `difficulty` SMALLINT NOT NULL DEFAULT 2,
  `explanation` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `audio_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `aruz_bridge_questions_source_id_key` (`source_id`),
  KEY `aruz_bridge_questions_published_idx` (`is_published`, `difficulty`, `sort_index`, `source_id`),
  CONSTRAINT `aruz_bridge_questions_correct_check` CHECK (CHAR_LENGTH(TRIM(correct_pattern)) > 0),
  CONSTRAINT `aruz_bridge_questions_difficulty_check` CHECK ((difficulty >= 1) AND (difficulty <= 3)),
  CONSTRAINT `aruz_bridge_questions_options_differ` CHECK (correct_pattern <> wrong_pattern),
  CONSTRAINT `aruz_bridge_questions_phrase_check` CHECK (CHAR_LENGTH(TRIM(phrase)) > 0),
  CONSTRAINT `aruz_bridge_questions_wrong_check` CHECK (CHAR_LENGTH(TRIM(wrong_pattern)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `grammar_circuit_questions` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `source_id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `grade` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `lesson` SMALLINT NOT NULL,
  `question_type` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'sentence',
  `payload` JSON NOT NULL,
  `difficulty` SMALLINT NOT NULL DEFAULT 2,
  `explanation` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `attribution` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `grammar_circuit_questions_source_id_key` (`source_id`),
  KEY `grammar_circuit_questions_public_idx` (`is_published`, `grade`, `lesson`, `sort_index`, `source_id`),
  CONSTRAINT `grammar_circuit_questions_difficulty_check` CHECK ((difficulty >= 1) AND (difficulty <= 3)),
  CONSTRAINT `grammar_circuit_questions_grade_check` CHECK (`grade` IN ('dahom', 'yazdahom', 'davazdahom')),
  CONSTRAINT `grammar_circuit_questions_lesson_check` CHECK ((lesson >= 1) AND (lesson <= 18)),
  CONSTRAINT `grammar_circuit_questions_payload_check` CHECK (JSON_TYPE(payload) = 'OBJECT'),
  CONSTRAINT `grammar_circuit_questions_source_id_check` CHECK (CHAR_LENGTH(TRIM(source_id)) > 0),
  CONSTRAINT `grammar_circuit_questions_type_check` CHECK (`question_type` IN ('sentence', 'hemistich', 'verse'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `memory_pairs` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `grade` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `term` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `work` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `author` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `memory_pairs_deck_idx` (`grade`, `term`, `sort_index`),
  UNIQUE KEY `memory_pairs_unique_work` (`grade`, `term`, `work`),
  CONSTRAINT `memory_pairs_grade_check` CHECK (`grade` IN ('dahom', 'yazdahom', 'davazdahom')),
  CONSTRAINT `memory_pairs_term_check` CHECK (`term` IN ('dey', 'khordad'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `ninja_categories` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `label` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `hint` VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT '',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ninja_categories_label_key` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `ninja_words` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `category_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `word` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `sort_index` SMALLINT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ninja_words_category_idx` (`category_id`, `sort_index`),
  UNIQUE KEY `ninja_words_unique` (`category_id`, `word`),
  CONSTRAINT `ninja_words_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `ninja_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `site_announcements` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `title` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `body` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `tone` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'info',
  `link_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `link_label` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `dismissible` TINYINT(1) NOT NULL DEFAULT 1,
  `priority` SMALLINT NOT NULL DEFAULT 0,
  `starts_at` DATETIME(6) NULL,
  `ends_at` DATETIME(6) NULL,
  `created_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `site_announcements_live_idx` (`is_active`, `priority` DESC, `created_at` DESC),
  CONSTRAINT `site_announcements_check` CHECK ((link_url IS NULL) = (link_label IS NULL)),
  CONSTRAINT `site_announcements_check1` CHECK ((ends_at IS NULL) OR (starts_at IS NULL) OR (ends_at > starts_at)),
  CONSTRAINT `site_announcements_tone_check` CHECK (`tone` IN ('info', 'success', 'warning', 'critical')),
  CONSTRAINT `site_announcements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `site_supporters` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `display_name` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `message` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `tier` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'supporter',
  `amount_label` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `link_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `avatar_url` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `supported_at` DATE NULL,
  `sort_index` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `site_supporters_order_idx` (`is_visible`, `sort_index`, `created_at` DESC),
  CONSTRAINT `site_supporters_tier_check` CHECK (`tier` IN ('gold', 'silver', 'bronze', 'supporter'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;

CREATE TABLE `content_reports` (
  `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `area` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `target_id` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `target_ref` JSON NOT NULL DEFAULT (_utf8mb4'{}'),
  `snapshot` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `reason` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL,
  `note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `user_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `ip` VARCHAR(49) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `user_agent` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `request_id` TEXT CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL DEFAULT 'open',
  `admin_note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NULL,
  `resolved_at` DATETIME(6) NULL,
  `resolved_by` CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `content_reports_area_idx` (`area`, `status`, `created_at` DESC),
  KEY `content_reports_open_idx` (`status`, `created_at` DESC),
  KEY `content_reports_target_idx` (`area`, `target_id`),
  CONSTRAINT `content_reports_area_check` CHECK (`area` IN ('quiz', 'exam', 'vocab', 'grammar_circuit', 'aruz_rapid', 'aruz_bridge', 'jasoos', 'ninja', 'pairs', 'doroos', 'other')),
  CONSTRAINT `content_reports_reason_check` CHECK (`reason` IN ('wrong_answer', 'wrong_content', 'typo', 'audio', 'image', 'duplicate', 'unclear', 'other')),
  CONSTRAINT `content_reports_status_check` CHECK (`status` IN ('open', 'in_review', 'resolved', 'rejected')),
  CONSTRAINT `content_reports_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `content_reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs ROW_FORMAT=DYNAMIC;
