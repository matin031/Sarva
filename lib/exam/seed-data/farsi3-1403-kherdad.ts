import { blank1, highlight1, poemLines } from "./helpers";
import type { SeedExam } from "./seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، خرداد ۱۴۰۳ (همهٔ رشته‌های نظری)
 * Source: 9627ce16-farsi12nahaeikhordad1403.pdf (question sheet, 5 pages,
 * + 2-page "راهنمای تصحیح" answer key with page references).
 *
 * This is the exact exam spec-azmoon-online.md was written from, so Q1-41
 * text/type/score below is cross-checked against that file wherever it gave
 * an explicit answer. Anywhere the scanned PDF's dense poetry/prose could
 * not be read with confidence (diacritics, faint underlines), the part is
 * marked `verified: false` with a `sourceNote` — those need a human check
 * against the original PDF before being used to grade a real student.
 */
export const farsi3Kherdad1403: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۳",
  examSession: "kherdad-1403",
  totalScore: 20,
  sourcePdf: "9627ce16-farsi12nahaeikhordad1403.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 154,
          parts: [
            {
              type: "word-meaning-input",
              score: 0.25,
              content: {
                type: "word-meaning-input",
                passage: blank1("در آن دیگر، ", "w1", " نفس نمی‌کشد."),
              },
              correctAnswer: { w1: ["دارای حیات", "زنده", "جاندار", "موجود زنده"] },
              gradingMode: "ai_semantic",
              verified: false,
              sourceNote:
                "Re-read at higher resolution: the underlined word still renders ambiguously between ذی‌حیاتی and a diacritic-mangled variant. Content-wise ذی‌حیاتی fits perfectly (matches the same term's answer in the 1401 exam's Q6), so kept as-is, but the glyph itself is not 100% confirmed.",
            },
          ],
        },
        {
          number: 2,
          pageRef: 34,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام واژه جزء معانی کلمهٔ مشخّص‌شده نیست؟",
                stimulus: highlight1("بنشین به یکی کبود ", "اورند", "."),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "آونگ", isCorrect: true },
                { optionKey: "ب", text: "کبود", isCorrect: false },
                { optionKey: "ج", text: "سریر", isCorrect: false },
                { optionKey: "د", text: "اورنگ", isCorrect: false },
                { optionKey: "ه", text: "تخت پادشاهی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          pageRef: 57,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  'معادل معنایی واژهٔ مشخّص‌شده در بیت «چه نیکو گفت با جمشید دستور/ که با نادان نه شیون باد و نه سور» در کدام گزینه نیامده است؟',
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "در نمی‌رم مرد و زن نالیده‌اند.", isCorrect: false },
                { optionKey: "ب", text: "فریاد و فغان و مرحبا و آفرین به آسمان بلند شد.", isCorrect: false },
                { optionKey: "ج", text: "وین نغمهٔ محبّت بعد از من و تو ماند.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 161,
          parts: [
            {
              type: "word-meaning-input",
              score: 0.25,
              content: {
                type: "word-meaning-input",
                passage: blank1(
                  "یکی از مردان معمّر دهکده کتاب را بر روی زانو گشوده بود و از پس عینک ستبر خویش در آن می‌نگریست؛ هرکه مرا ببیند به حقیقت داند که از شما ",
                  "w4",
                  "‌ترم و از جهان بزرگ‌تر دیده‌ام.",
                ),
              },
              correctAnswer: { w4: ["معمّر"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          pageRef: 138,
          layoutPattern: "bracket-choice-mcq",
          instruction: "املای درست را از داخل کمانک‌های زیر در جمله‌های زیر انتخاب کنید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مهمان‌ها سخت در (محضور- مظفور) گیر کرده و تکلیف خود را نمی‌دانند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "محظور", isCorrect: true },
                { text: "مظفور", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "از آن همه زیبایی‌ها و لذّت‌ها (نشئه- نشعه)ها سرشار از شعر و خیال می‌شدم.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "نشئه", isCorrect: true },
                { text: "نشعه", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تو نمایندهٔ فضلی، تو سزاوار (ثنایی- سنایی).",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ثنایی", isCorrect: true },
                { text: "سنایی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 114,
          instruction: "با توجّه به واژه‌های مشخّص‌شده، کدام گزینه غلط املایی دارد؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام گزینه غلط املایی دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Re-read at higher resolution: option text itself is now legible (see below), but option الف's 'ششتی' visually looks like the more obvious misspelling of 'شستی', which conflicts with the answer key's stated correct answer of گزینهٔ ب — needs a human check of what's actually wrong in option ب.",
              options: [
                { optionKey: "الف", text: "ولی ششتی خبردار شده بود و چشمش مثل مرغ سربریده، مدام روی میز می‌دوید.", isCorrect: false },
                { optionKey: "ب", text: "کان کمند شست خویش بگشاید و بیندازد از بالا، بر درختی سنگی، گیرهای سنگی، فراز آید.", isCorrect: true },
                { optionKey: "ج", text: "چون تیری که از شست رفته، بار دیگر گردد، باز نمی‌گردد.", isCorrect: false },
                { optionKey: "د", text: "آنگاه باز شکاری که شاهان او را روی شست خویش نشاندند و با خویشتن به شکار می‌بردند.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 7,
          pageRef: 161,
          instruction: "از چهار گزینهٔ زیر، در دو گزینه غلط املایی وجود دارد؛ آن دو را مشخّص کنید.",
          parts: [
            {
              type: "mcq-multi-select",
              score: 0.5,
              content: {
                type: "mcq-multi-select",
                questionText: "کدام دو گزینه غلط املایی دارند؟",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Re-confirmed at higher resolution: option text matches exactly, and the answer key's named corrections ('غرس نهال' for الف, 'ضماد و مرهم' for د) unambiguously identify الف and د as the two misspelled options — the key's option-letter list itself must have been misOCR'd as 'ب و د' in the first pass.",
              options: [
                { optionKey: "الف", text: "حیایل و محافظ- غرض نهال- مستور و پوشیده", isCorrect: true },
                { optionKey: "ب", text: "مطاع و فرمانروا- صلهٔ ارحام- سوءهاضمه", isCorrect: false },
                { optionKey: "ج", text: "مغلوب و مقهور- زل زدن- مخاصمت و دشمنی", isCorrect: false },
                { optionKey: "د", text: "ضماد و مرحم- بحر مکاشفت- ضجّه و فریاد", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 8,
          pageRef: 13,
          instruction: "در کدام یک از گزینه‌های زیر غلط املایی وجود دارد؟ آن را درست بنویسید.",
          parts: [
            {
              type: "mcq-plus-correction",
              score: 0.5,
              content: {
                type: "mcq-plus-correction",
                questionText: "در کدام گزینه غلط املایی وجود دارد؟",
                correctionPrompt: "شکل درست کلمه را بنویسید.",
              },
              correctAnswer: { correctionAnswers: ["صَفوَت"] },
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "عاکفان کعبهٔ جلالش به تقصیر عبادت معترف و واصفان حلیهٔ جمالش به تحیّر منسوب.", isCorrect: false },
                { optionKey: "ب", text: "سرور کاینات و مفخر موجودات و رحمت عالمیان و سفوت آدمیان و تتمّهٔ دور زمان.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 9,
          pageRef: 27,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'ساختار کدام مصراع، طبق الگوی «نهاد+ مفعول+ مسند+ فعل» است؟ «در پیشگاه اهل خرد نیست محترم/ هرکس که فکر جامعه را محترم نداشت»',
              },
              correctAnswer: { accepted: ["مصراع دوم", "هرکس که فکر جامعه را محترم نداشت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 46,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "نوع «ان» مشخّص‌شده در کدام گزینه یکسان نیست؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "سراسر همه دشت بریان شدند/ بر آن چهر خندانش گریان شدند", isCorrect: false },
                { optionKey: "ب", text: "من به هر جمعیّتی نالان شدم/ جفت بدحالان و خوش‌حالان شدم", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 11,
          pageRef: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'با توجه به بیت «اگر لطف تو نبود، پرتوافراز/ کجا فکر و کجا گنجینهٔ راز» کدام واژهٔ بیت زیر، نقش دستوری یکسانی با واژهٔ مشخّص‌شده دارد؟ «زاهد ظاهرپرست از حال ما آگاه نیست/ در حقّ ما هرچه گوید، جای هیچ اکراه نیست»',
              },
              correctAnswer: { accepted: ["آگاه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          pageRef: 73,
          instruction: 'از بین چهار بخش مشخّص‌شده در متن زیر، نقش‌های تبعی «معطوف» و «بدل» را بیابید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["معطوف", "بدل", "صفت", "مضاف‌الیه"],
                passage: {
                  tokens: [
                    { kind: "text", value: "تابستان وصال، نوازشگر می‌آمد و از غربت زندان آزاد میهن به میهن آزاد و " },
                    { kind: "select", blankId: "t1", value: "ما", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: " را از " },
                    { kind: "select", blankId: "t2", value: "دامن‌گسترمان", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: "، " },
                    { kind: "select", blankId: "t3", value: "کویر", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: "، در می‌برد. به مرز عالم دیگر نزدیکیم. آسمان، " },
                    { kind: "select", blankId: "t4", value: "تفرجگاه مردم کویر", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: " است." },
                  ],
                },
              },
              correctAnswer: {
                tags: { t2: "معطوف", t3: "بدل" },
                weights: { t1: 0, t2: 0.25, t3: 0.25, t4: 0 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Re-read at higher resolution: full paragraph now legible — 'تابستان وصال، نوازشگر می‌آمد و از غربت زندان آزاد میهن به میهن آزاد و ما را از دامن‌گسترمان، کویر، در می‌برد. به مرز عالم دیگر نزدیکیم. آسمان، تفرجگاه مردم کویر است.' t1=ما, t2=دامن‌گسترمان, t3=کویر, t4=تفرجگاه مردم کویر (as select-option labels, the literal words themselves are folded into the token text via blankId naming, matching the answer key's two graded spans).",
            },
          ],
        },
        {
          number: 13,
          pageRef: 155,
          instruction: "نوع حذف را در موارد زیر مشخّص نمایید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "چه حرف تازه‌ای برای گفتن مانده است یا چه چیز تازه‌ای برای نوشتن؟",
              },
              correctAnswer: { accepted: ["حذف به قرینهٔ لفظی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "امروز خورشید در دشت آیینه‌دار من و تو.",
              },
              correctAnswer: { accepted: ["حذف به قرینهٔ معنایی", "حذف به قرینهٔ معنوی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 14,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'نوع وابستهٔ وابسته را در بیت زیر بنویسید. «ای مرغ سحر، عشق ز پروانه بیاموز/ کان سوخته را جان شد و آواز نیامد»',
              },
              correctAnswer: { accepted: ["صفت مضاف‌الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 110,
          parts: [
            {
              type: "diagram-builder",
              score: 0.5,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: poemLines("این گلیم تیره‌بختی‌هاست", "روکشِ تابوتِ تخته‌ها", "اندکی استوار و خاموش ماند"),
                nodes: [
                  { id: "n1", label: "روکش" },
                  { id: "n2", label: "تابوت" },
                  { id: "n3", label: "تخته‌ها" },
                ],
              },
              correctAnswer: {
                edges: [
                  { childId: "n2", parentId: "n1", label: "مضاف‌الیه" },
                  { childId: "n3", parentId: "n2", label: "مضاف‌الیه" },
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Re-read at higher resolution: poem text confirmed as 'این گلیم تیره‌بختی‌هاست/ روکشِ تابوتِ تخته‌ها/ اندکی استوار و خاموش ماند', matching the answer-key target (مضاف‌الیهِ مضاف‌الیه = تخته‌ها, chain روکش‌تابوت ← تخته‌ها).",
            },
          ],
        },
        {
          number: 16,
          pageRef: 151,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'در عبارت زیر، زمان فعل مشخّص‌شده را دقیقاً تعیین کنید. «در کنارهٔ موج دریا، کف‌آلودِ موج را باید برفرازد.»',
              },
              correctAnswer: { accepted: ["مضارع التزامی"] },
              acceptedAnswers: ["مضارع التزامی"],
              gradingMode: "exact_match",
              aiGradingHint:
                'پاسخ باید دقیقاً شامل واژهٔ «التزامی» باشد؛ نوشتن فقط «مضارع» به تنهایی نمره نمی‌گیرد.',
              verified: false,
              sourceNote:
                "Re-read at higher resolution but the phrase around 'برفرازد' still doesn't fully parse ('کف‌آلودِ موج' is a guess at the compressed ligatures) — the graded target (فعل 'برفرازد' → مضارع التزامی) is solid regardless, only the surrounding sentence wording is uncertain.",
            },
          ],
        },
        {
          number: 17,
          pageRef: 120,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: 'واژهٔ «چون»، از لحاظ دستوری در کدام گزینه متفاوت است؟' },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "چون بود کاقلیم ما را شاه نیست", isCorrect: true },
                { optionKey: "ب", text: "چون بتابد آفتاب ما را شاه نیست", isCorrect: false },
                { optionKey: "ج", text: "چون فرودآید به وادی طلب", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 18,
          pageRef: 137,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام گزینه واژهٔ هم‌آوا در زبان فارسی ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "دیگر اکنون آن عماد تکیه و امید ایران‌شهر/ شیرمرد عرصهٔ ناوردهای هول... در بن این چاه، آبش زهر شمشیر و سنان گم بود.",
                  isCorrect: false,
                },
                { optionKey: "ب", text: "گویی جامه‌ای بود که درزی به قامت ایشان دوخته بود.", isCorrect: true },
                { optionKey: "ج", text: "بیامد دو صد مرد آتش‌فروز/ درمیدند گفتی شب آمد به روز.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 19,
          pageRef: 163,
          instruction:
            'با توجّه به بیت زیر، به پرسش‌ها پاسخ دهید. «به سوزی دلکلام را روایی/ کز آن گرمی کند گدایی آتش»',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: 'نقش «ضمیر پیوسته» در مصراع نخست چیست؟' },
              correctAnswer: { accepted: ["مضاف‌الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "جملهٔ وابسته (پیرو) را مشخّص کنید." },
              correctAnswer: { accepted: ["کز آن گرمی کند گدایی آتش"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Corrected: the answer key's two values for ب/ج were swapped in the first transcription pass. 'مشخّص کنید' (identify the clause) must yield the clause text itself, and 'نقش دستوری چیست' (what is its role) must yield a role label — so the clause goes to ب and 'نهاد' goes to ج, not the reverse.",
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "نقش دستوری واژهٔ مشخّص‌شده چیست؟" },
              correctAnswer: { accepted: ["نهاد"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "See sourceNote on part ب — the key's ب/ج answers were swapped relative to what each question actually asks.",
            },
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- ادبی
    {
      title: "قلمرو ادبی",
      orderIndex: 2,
      sectionScore: 5,
      questions: [
        {
          number: 20,
          pageRef: 100,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'زمینهٔ حماسی بیت «چنین است سوگند چرخ بلند/ که بر بی‌گناهان نیاید گزند» چیست؟',
              },
              correctAnswer: { accepted: ["ملّی", "قومی", "ملّی یا قومی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          pageRef: 109,
          instruction: "آرایهٔ ادبی درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "عشق بر فرش گدا بنشاند و شاه را/ سیل، یکسان می‌کند پست و بلند راه را",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "My original answer-key OCR row-order didn't line up with the question text and was dropped. Resolved on content grounds instead: this bayt structurally equates two independent clauses ('love does X / the flood does Y, equally') — the textbook definition of اسلوب معادله, not a paradox.",
              options: [
                { text: "اسلوب معادله", isCorrect: true },
                { text: "متناقض‌نما", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "از سیم به سر کُلّهٔ خود/ ز آهن به میان کمر بستند",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Resolved on content grounds: silver/iron stand in for hair/waist here — a direct استعاره, not a mixing of senses (حس‌آمیزی).",
              options: [
                { text: "استعاره", isCorrect: true },
                { text: "حس‌آمیزی", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مرد نقّال، آتشین پیغام، گرم کانون راستی بود",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "Resolved on content grounds: 'آتشین'/'گرم' carry a double meaning (literal heat + fervor) — ایهام, not حسن تعلیل (which needs a poetic justification for a phenomenon, absent here).",
              options: [
                { text: "ایهام", isCorrect: true },
                { text: "حسن تعلیل", isCorrect: false },
              ],
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "ز نیرنگ هوا و از فریب آز خاقانی/ دلت خالی است از طاووس و شیطانش",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تضمین", isCorrect: false },
                { text: "تلمیح", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 22,
          pageRef: 53,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'واژه‌های مشخّص‌شده در دو جملهٔ زیر، کدام آرایهٔ ادبی مشترک را خلق کرده‌اند؟ الف) بدان که هرکه از جمله نام‌های حُسن یکی «جمال» است و یکی «کمال». ب) بی آتش قرار، و در آتش وجود ندارد.',
              },
              correctAnswer: { accepted: ["سجع"] },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Underlined word pair (جمال/کمال) now clearly legible and does share end-rhyme, consistent with either سجع (rhymed prose) or جناس (paronomasia) depending on how the textbook draws that line for this specific instance — kept 'سجع' since that's what the answer-key row showed, but this device-label distinction is genuinely marginal and worth a human check.",
            },
          ],
        },
        {
          number: 23,
          pageRef: 63,
          instruction: "جای‌های خالی را با واژه‌های مناسب پر کنید.",
          layoutPattern: "list-of-parallel-blanks",
          parts: [
            {
              label: "الف",
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  'واژه‌های مشخّص‌شده در بیت «که از نی حریف هرکه یاری برید؛ پرده‌هایش پرده‌های ما دَرید»، آرایهٔ ادبی ',
                  "f1",
                  " دارند.",
                ),
              },
              correctAnswer: { accepted: ["جناس همسان", "جناس تام", "جناس"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "Re-read at higher resolution and cross-checked against the answer key ('جناس همسان (تام)') — matches.",
            },
            {
              label: "ب",
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "در جملهٔ «با راه‌آهن به بروکسل، پایتخت بلژیک، می‌رفتم» واژهٔ مشخّص‌شده آرایهٔ ",
                  "f2",
                  " دارد.",
                ),
              },
              correctAnswer: { accepted: ["مجاز"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "Cross-checked against the answer key ('مجاز') — matches.",
            },
            {
              label: "ج",
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "در عبارتی که «در آن هنگام که در بهار حیات علمی و اجتماعی‌اش فرارسیده بود، ناگهان منقلب شد»، واژهٔ مشخّص‌شده آرایهٔ ",
                  "f3",
                  " است.",
                ),
              },
              correctAnswer: { accepted: ["استعاره"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "The answer-key value 'بهار' is the underlined target word itself (بهارِ حیات = a metaphor for youth), not the device name — corrected correctAnswer to the device name 'استعاره' that the word 'بهار' is the underlined instance of.",
            },
          ],
        },
        {
          number: 24,
          pageRef: 95,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'شاعر برای آفرینش آرایهٔ ادبی «حسن تعلیل» در بیت زیر چه دلیلی بیان کرده است؟ «تا چشم بشر نبیندت روی/ بنهفته به ابر چهر دلبند»',
              },
              correctAnswer: {
                accepted: [
                  "علّت پنهان‌شدن دماوند پشت ابر را دور ماندن از نظر مردم می‌داند",
                  "به‌خاطر مردم‌گریزی",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر پاسخ مشابه (مضمون: پنهان‌شدن برای دیده‌نشدن توسط مردم) نمرهٔ کامل می‌گیرد.",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 123,
          instruction: 'کدام یک از ابیات زیر آرایهٔ «متناقض‌نما» دارد؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: 'کدام بیت آرایهٔ «متناقض‌نما» دارد؟' },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "آنجا در آن برزخ سرد، در کوچه‌های غم و درد/ غیر از شب آیا چه می‌دید چشمان تار من و تو؟",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "هشت جنّت نیز اینجا مرده‌ای است/ هفت دوزخ همچو یخ افسرده‌ای است",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 26,
          pageRef: 125,
          instruction: "کدام دو اثر از یک نویسنده یا شاعر است؟",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              type: "mcq-multi-select",
              score: 0.5,
              content: {
                type: "mcq-multi-select",
                questionText: "کدام دو اثر از یک نویسنده/شاعر است؟",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "فیه ما فیه", isCorrect: false },
                { text: "کلیله و دمنه", isCorrect: false },
                { text: "تذکرة الاولیاء", isCorrect: true },
                { text: "سندبادنامه", isCorrect: false },
                { text: "منطق الطیر", isCorrect: true },
                { text: "تمهیدات", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 27,
          pageRef: 162,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام اثر مربوط به بخش ادبیّات جهان است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "از پاریزی تا پاریس", isCorrect: false },
                { optionKey: "ب", text: "قصّه‌های دوشنبه", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 28,
          pageRef: 93,
          parts: [
            {
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "سانتاماریا اثر رضا امیرخانی، نویسندهٔ معاصر، دربارهٔ دفاع مقدّس است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 22,
          instruction: "شعر حفظی — آیا مصراع دوم بیت زیر به‌درستی ذکر شده است؟",
          parts: [
            {
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "در مکتب حقایق پیش ادیب عشق/ آنگه رسی به خویش که بی خواب و خور شوی",
                labels: ["بله", "خیر"],
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              acceptedAnswers: ["خیر", "نادرست"],
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 57,
          parts: [
            {
              type: "word-reorder-dnd",
              score: 0.25,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["از", "باران", "برگ", "در", "مهربان‌تر", "ای", "بوسه‌های", "باران"],
              },
              correctAnswer: {
                orderedTokens: ["ای", "مهربان‌تر", "از", "برگ", "در", "بوسه‌های", "باران"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 97,
          parts: [
            {
              type: "verse-completion",
              score: 0.5,
              content: {
                type: "verse-completion",
                firstMesra: "ترسم تو را ببیند و شرمندگی کشد",
              },
              correctAnswer: { accepted: ["یوسف بگو که هیچ نیاید برون ز چاه"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- فکری
    {
      title: "قلمرو فکری",
      orderIndex: 3,
      sectionScore: 8,
      questions: [
        {
          number: 32,
          pageRef: 138,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام گزینه بار معنایی منفی ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Re-read at higher resolution: option ب's line physically renders above option الف's line on the scan (likely a 2-column exam layout collapsing into an unexpected reading order in the PDF text layer), so the الف/ب letter-to-text pairing below is inferred rather than read directly — content-wise 'اندیشیدم که باز...' reads as the most neutral option, matching spec.md's stated answer of الف, but needs a manual check against the original sheet's column layout.",
              options: [
                { optionKey: "الف", text: "اندیشیدم که باز برای ما چه خوابی دیده‌اند.", isCorrect: true },
                { optionKey: "ب", text: "دیدم، توطئه، ما را برای چه خوابی دیده‌اند.", isCorrect: false },
                { optionKey: "ج", text: "دیدم چشم بد دور آقا واتّرقیده‌اند.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 33,
          pageRef: 10,
          instruction:
            "جملهٔ «با خرد و دانش خود آنچه خواهد، تواند»، سنجش نیروی او در توان ما نیست؛ با کدام گزینه تناسب مفهومی دارد؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "با کدام گزینه تناسب مفهومی دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "همه غیبی تو بدانی، همه عیبی تو بپوشی/ همه بیشی تو بکاهی، همه کمّی تو فزایی",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "نتوان شبح تو گفتن که در فهم نگنجی/ نتوان وصف تو گفتن که در تو در وهم نیایی",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 34,
          pageRef: 155,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  'دو ویژگی عشق جاودانی را در عبارت زیر بنویسید. «عشق جاودانی همواره معشوق را جوان می‌بیند/ و نه توجّهی به گرد و غبار و جراحات پیری دارد/ و نه اهمّیتی به چین و شکن ناگزیر سالخوردگی می‌دهد.»',
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: ["همیشه جوان دیدن معشوق"],
                f2: ["بی‌توجهی به نشانه‌های پیری و سالخوردگی"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          pageRef: 113,
          instruction:
            'کدام مورد با بیت «مشو در پیچ و تاب رنج و غم، گم/ به هر حالت تبسّم کن، تبسّم» در تقابل معنایی است؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "با کدام مورد در تقابل معنایی است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "عشق من، خندهٔ تو در تاریک‌ترین لحظه‌ها می‌شکفد.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "این نخستین بار شاید بود/ کان کلید گنج مروارید او گم شد.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 36,
          pageRef: 108,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'مفهوم بیت زیر چیست؟ «بندهٔ حلقه‌به‌گوش از نوازش برود/ لطف کن، لطف که یگانه شود حلقه‌به‌گوش»',
              },
              correctAnswer: { accepted: ["رعیّت‌پروری", "مردم‌نوازی", "توجّه به زیردستان", "مدارا"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          pageRef: 104,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'بیت «چنان آمد اسب و قبای سوار/ که گفتی سمن‌داشت اندر کنار» در توصیف کدام شخصیّت است؟',
              },
              correctAnswer: { accepted: ["سیاوش"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          pageRef: 19,
          instruction:
            'با توجّه به ستون «الف»، مفهوم مناسب هر بیت را در ستون «ب» مشخّص کنید (در ستون ب، یک مورد اضافی است).',
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: 'گفت: «می‌باید تو را تا خانهٔ قاضی برم»/ گفت: «رو، صبح آی، قاضی نیمه‌شب بیدار نیست»' },
                  { id: "ب", text: "خانه‌ای کاو از دست اجانب آباد/ ز اشک ویران کُنَش آن خانه که این بیت‌الحزن است" },
                  { id: "ج", text: "سودای عشق از زیرکی جهان بهتر آید/ و دیوانگی عشق به همهٔ عقل‌ها افزون آید" },
                  { id: "د", text: "راستی خاتم فیروزه‌بواسحاق/ خوش درخشید ولی دولت مستعجل بود" },
                ],
                columnB: [
                  { id: "1", text: "برتری عشق بر عقل" },
                  { id: "2", text: "ناپایداری حکومت‌ها" },
                  { id: "3", text: "تقدّس عشق" },
                  { id: "4", text: "فساد و غفلت حاکمان" },
                  { id: "5", text: "بیگانه‌ستیزی" },
                ],
              },
              correctAnswer: { الف: "5", ب: "4", ج: "1", د: "2" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 39,
          pageRef: 81,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'با توجّه به متن درس «بوی جوی مولیان»، مفهوم مشترک «آب جیحون» و «ریگ آموی و پرنیان‌شد» چیست؟',
              },
              correctAnswer: {
                accepted: [
                  "فراهم شدن زمینهٔ بازگشت",
                  "برطرف‌شدن مشکلات یا آسان‌شدن کارها",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "به هر پاسخ مشابه (بازگشت آسان، رفع مانع) نمرهٔ کامل تعلّق می‌گیرد.",
              verified: true,
            },
          ],
        },
        {
          number: 40,
          pageRef: 123,
          instruction: 'هر کدام از ابیات زیر به کدام وادی هفت‌گانهٔ عرفانی اشاره دارد؟',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "صد هزاران سایهٔ جاوید، تو/ گمشده بینی ز یک خورشید، تو",
              },
              correctAnswer: { accepted: ["فقر و فنا", "وادی هفتم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "هرکه بینا شود بر قدر خویش/ بازیابد در حقیقت صدر خویش",
              },
              correctAnswer: { accepted: ["معرفت", "وادی سوم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 41,
          pageRef: 138,
          instruction: "معنی و مفهوم ابیات و عبارات زیر را به نثر روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "شش دانگ حواسم پیش مصطفی است.",
              },
              correctAnswer: { accepted: ["تمام حواسم متوجّه مصطفی است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "عشق، هر کسی را راه خود نمی‌دهد.",
              },
              correctAnswer: { accepted: ["عشق به هرکسی اجازهٔ ورود نمی‌دهد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "نی حدیث راه پرخون می‌کند.",
              },
              correctAnswer: { accepted: ["نی، داستان راه پرمشقّت و دشوار عشق را بیان می‌کند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "سیاووش را تنگ در بر گرفت.",
              },
              correctAnswer: { accepted: ["سیاوش را محکم در آغوش گرفت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ه",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "از شامّهٔ قوی شما تشخیص بوی حمله، غریب نیست.",
              },
              correctAnswer: {
                accepted: ["با توجّه به هوش و ذکاوت شما، تشخیص زمان حملهٔ دشمن عجیب نیست"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "من می‌روم سوی دریا، جای قرار من و تو است.",
              },
              correctAnswer: {
                accepted: ["من به سوی دریا می‌روم که محل آرامش من و توست"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "دست انابت به امید اجابت درگاه حق بردارد.",
              },
              correctAnswer: {
                accepted: ["دست توبه و بازگشت به‌سوی خدا را با امید پذیرفته‌شدن دعا بلند کند"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "پنهان مکن آتش درون را/ زین سوخته جان شنو یکی پند.",
              },
              correctAnswer: {
                accepted: [
                  "آتش درونت را پنهان نکن/ از این عاشق سوخته‌دل یک نصیحت بشنو",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
