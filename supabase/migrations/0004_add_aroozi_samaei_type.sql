-- New question_part_type: عروض سماعی (match rhythm by ear). Stem is one of
-- audio / verse / a written meter pattern; options are always the other
-- modality. See lib/exam/content-schemas.ts's aroozSamaei schema for the
-- content shape — same table structure as mcq-inline otherwise (options in
-- question_options, correctness on is_correct).
alter type question_part_type add value 'aroozi-samaei';
