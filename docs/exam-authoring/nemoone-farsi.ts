import { blank1, highlight1, highlightThenBlank, poemLines, text } from "@/lib/exam/seed-data/helpers";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";

/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  نمونهٔ جامع — امتحان نهاییِ «فارسی»                                   │
 * │  هر ۱۸ نوع سؤال، یک‌بار، با محتوای واقعیِ فارسی.                        │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * این فایل «آزمونِ واقعی» نیست؛ الگوست. برای ساختن یک آزمونِ تازه:
 *
 *   ۱. کپی کن به `lib/exam/seed-data/<subject><grade>-<year>-<month>.ts`
 *   ۲. نامِ ثابت (`export const ...`) و مقدارهای بالای فایل را عوض کن.
 *   ۳. سؤال‌ها را از روی برگه بنویس و کلیدِ پاسخ را از «راهنمای تصحیح».
 *   ۴. فایل را در `scripts/seed-exams.ts` و `scripts/validate-exam-seeds.ts`
 *      اضافه کن، بعد:
 *          npx tsx scripts/validate-exam-seeds.ts   ← بارم و شکلِ داده
 *          npm run db:seed-exams                    ← وارد کردن به دیتابیس
 *
 * قاعده‌های سخت (validateSeedExam همه را می‌سنجد):
 *   • جمعِ `score` جزءهای هر بخش = `sectionScore` آن بخش.
 *   • جمعِ `sectionScore`ها = `totalScore`.
 *   • `score` هر جزء باید > 0 باشد (CHECK دیتابیس). سؤالِ حذف‌شده را
 *     اصلاً ننویس؛ نمره‌اش را طبق راهنمای تصحیح به سؤال دیگری بده.
 *   • `content.type` باید دقیقاً با `type` همان جزء یکی باشد.
 *   • انواعِ گزینه‌ای (mcq-inline / mcq-multi-select / mcq-plus-correction)
 *     دست‌کم دو `option` و دست‌کم یک `isCorrect: true` می‌خواهند.
 *
 * دو نکتهٔ تصحیح که زیاد اشتباه می‌شود:
 *   • `gradingMode: "exact_match"` یعنی همان‌جا خودکار تصحیح می‌شود.
 *     هر چیز دیگری (`ai_semantic` / `ai_partial_credit` / `manual`) یعنی
 *     «خودارزیابی»: دانش‌آموز پاسخِ درست را می‌بیند و خودش نمره می‌دهد.
 *     پس هرجا پاسخ بسته است، exact_match بگذار.
 *   • مقایسه‌ی پاسخ، نیم‌فاصله/فاصله، «ي/ك» عربی، اعراب، همزهٔ روی «ه» و
 *     نشانه‌گذاری را نادیده می‌گیرد؛ ولی مترادف را نه. هر صورتِ نوشتاریِ
 *     محتمل را در `accepted` بیاور.
 */
export const nemooneFarsi: SeedExam = {
  subject: "farsi3", // farsi1 = دهم، farsi2 = یازدهم، farsi3 = دوازدهم
  grade: 12,
  title: "نمونهٔ الگو — فارسی۳ دوازدهم",
  examSession: "nemoone-farsi", // همین رشته در آدرس /exam/<examSession> می‌آید
  totalScore: 20,
  sourcePdf: "nemoone.pdf",
  sections: [
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 154, // شمارهٔ صفحهٔ کتاب درسی از راهنمای تصحیح (اختیاری)
          parts: [
            {
              /* «معنی واژهٔ مشخص‌شده را بنویسید.»
                 واژه زیرخط‌دار سرِ جایش می‌ماند و کادرِ پاسخ کنارش می‌آید. */
              type: "word-meaning-input",
              score: 1,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("در آن دیگر، ", "ذی‌حیاتی", "w1", " نفس نمی‌کشد."),
              },
              // کلیدِ پاسخ با blankId کلید می‌خورد، نه با شمارهٔ جزء.
              correctAnswer: { w1: ["دارای حیات", "زنده", "جاندار"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          parts: [
            {
              /* تستِ چهارگزینه‌ای. `stimulus` بیت/عبارتِ بالای سؤال است و
                 `highlight1` واژهٔ زیرخط‌دارِ آن. */
              type: "mcq-inline",
              score: 1,
              content: {
                type: "mcq-inline",
                questionText: "کدام واژه جزء معانی کلمهٔ مشخّص‌شده نیست؟",
                stimulus: highlight1("بنشین به یکی کبود ", "اورند", "."),
              },
              correctAnswer: {}, // درستی روی خودِ گزینه‌ها است
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "آونگ", isCorrect: true },
                { optionKey: "ب", text: "سریر", isCorrect: false },
                { optionKey: "ج", text: "اورنگ", isCorrect: false },
                { optionKey: "د", text: "تخت پادشاهی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          instruction: "از چهار گزینهٔ زیر، در دو گزینه غلط املایی وجود دارد؛ آن دو را مشخص کنید.",
          parts: [
            {
              /* «دو مورد را انتخاب کن.» تصحیح همه‌یا‌هیچ است: مجموعهٔ
                 انتخاب‌شده باید دقیقاً با مجموعهٔ درست یکی باشد. */
              type: "mcq-multi-select",
              score: 1,
              content: {
                type: "mcq-multi-select",
                questionText: "کدام دو گزینه غلط املایی دارند؟",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "حیایل و محافظ — غرض نهال", isCorrect: true },
                { optionKey: "ب", text: "مطاع و فرمانروا — صلهٔ ارحام", isCorrect: false },
                { optionKey: "ج", text: "مغلوب و مقهور — زل زدن", isCorrect: false },
                { optionKey: "د", text: "ضماد و مرحم — بحر مکاشفت", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 4,
          parts: [
            {
              /* «کدام گزینه غلط املایی دارد؟ شکل درست را بنویسید.»
                 نیمی از نمره برای گزینه، نیمی برای املای درست. */
              type: "mcq-plus-correction",
              score: 1,
              content: {
                type: "mcq-plus-correction",
                questionText: "در کدام گزینه غلط املایی وجود دارد؟",
                correctionPrompt: "شکل درست کلمه را بنویسید.",
              },
              correctAnswer: { correctionAnswers: ["صَفوَت"] },
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "عاکفان کعبهٔ جلالش به تقصیر عبادت معترف.", isCorrect: false },
                { optionKey: "ب", text: "رحمت عالمیان و سفوت آدمیان و تتمّهٔ دور زمان.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 5,
          instruction: "در گروه کلمات زیر، سه نادرستی املایی وجود دارد؛ شکل درست هریک را بنویسید.",
          parts: [
            {
              /* فهرستِ چندموردی: دانش‌آموز غلط‌ها را علامت می‌زند و برای هر
                 کدام شکل درست را می‌نویسد. نمره به نسبتِ موردهای درست. */
              type: "find-n-errors-in-list",
              score: 1,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 3,
                items: [
                  { id: "i1", text: "حزین و غم‌انگیز" },
                  { id: "i2", text: "زی‌حیات و جان‌دار" },
                  { id: "i3", text: "ضماد و محرم" },
                  { id: "i4", text: "غرس و نشاندن" },
                  { id: "i5", text: "معلوف و ترسناک" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i2", "i3", "i5"],
                corrections: {
                  i2: "ذی‌حیات و جان‌دار",
                  i3: "ضماد و مرهم",
                  i5: "مألوف و ترسناک",
                },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 6,
          parts: [
            {
              /* «در متن زیر یک غلط املایی هست؛ آن را بیاب و درستش را بنویس.»
                 برخلاف نوع بالا، هیچ فهرستی نیست و خودِ متن جست‌وجو می‌شود. */
              type: "open-error-correction-in-passage",
              score: 1,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "یکی از حضّار که محظوظ گردیده بود، تصدیق کرد. در این اثنا صدای زنگ تلفن از سرسرای امارت بلند شد.",
                ),
              },
              correctAnswer: { wrongWord: "امارت", correctWord: "عمارت" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          instruction: "نقش‌های تبعی «معطوف» و «بدل» را در متن زیر بیابید.",
          parts: [
            {
              /* چند فهرستِ بازشو *داخلِ* متن: هر واژهٔ زیرخط‌دار یک انتخاب
                 دارد. `weights` می‌گوید کدام جای‌خالی نمره دارد — جاهایی که
                 وزنشان صفر است، فریب‌اند و روی نمره اثر ندارند. */
              type: "multi-part-inline-tagging",
              score: 1,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["معطوف", "بدل", "صفت", "مضاف‌الیه"],
                passage: {
                  tokens: [
                    { kind: "text", value: "تابستان وصال نوازشگر می‌آمد و " },
                    { kind: "select", blankId: "t1", value: "ما", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: " را به میهن آزاد و " },
                    { kind: "select", blankId: "t2", value: "دامن‌گسترمان", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: "، " },
                    { kind: "select", blankId: "t3", value: "کویر", options: ["معطوف", "بدل", "صفت", "مضاف‌الیه"] },
                    { kind: "text", value: "، می‌برد." },
                  ],
                },
              },
              correctAnswer: {
                tags: { t2: "معطوف", t3: "بدل" },
                weights: { t1: 0, t2: 0.5, t3: 0.5 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "قلمرو ادبی",
      orderIndex: 2,
      sectionScore: 7,
      questions: [
        {
          number: 8,
          instruction: "ساختار کدام مصراع، طبق الگوی «نهاد + مفعول + مسند + فعل» است؟",
          parts: [
            {
              /* وقتی گزینه‌ها خودِ مصراع‌اند و برچسبِ الف/ب/ج ندارند.
                 پاسخ، شمارهٔ خطّ درست است (از صفر). */
              type: "mcq-select-line-in-poem",
              score: 1,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "در پیشگاه اهل خرد نیست محترم",
                  "هرکس که فکر جامعه را محترم نداشت",
                ],
              },
              correctAnswer: { correctLineIndex: 1 },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          instruction: "شعر حفظی — مصراع دوم را بنویسید.",
          parts: [
            {
              /* مصراع اول داده می‌شود، مصراع دوم نوشته. اگر املای دقیق مهم
                 نیست، exact_match با چند صورتِ پذیرفته کافی است. */
              type: "verse-completion",
              score: 1,
              content: {
                type: "verse-completion",
                firstMesra: "ترسم تو را ببیند و شرمندگی کشد",
              },
              correctAnswer: { accepted: ["یوسف بگو که هیچ نیاید برون ز چاه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          instruction: "کلمات زیر را به ترتیب درست بچینید تا مصراع کامل شود.",
          parts: [
            {
              /* کشیدن‌ورهاکردن. `scrambledTokens` ترتیبِ به‌هم‌ریخته است و
                 `orderedTokens` ترتیبِ درست؛ واژه‌های اضافی هم می‌شود گذاشت. */
              type: "word-reorder-dnd",
              score: 1,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["از", "باران", "برگ", "در", "مهربان‌تر", "ای", "بوسه‌های"],
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
          number: 11,
          instruction: "مفهوم مناسب هر بیت را از ستون «ب» انتخاب کنید (یک مورد اضافی است).",
          parts: [
            {
              /* جدولِ «ستون الف ← ستون ب». نمره به نسبتِ جفت‌های درست.
                 توصیه: columnB یک مورد بیشتر از columnA داشته باشد. */
              type: "matching-pairs-with-distractor",
              score: 1.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "خانه‌ای کاو از دست اجانب آباد / ز اشک ویران کُنَش" },
                  { id: "ب", text: "سودای عشق از زیرکی جهان بهتر آید" },
                  { id: "ج", text: "خوش درخشید ولی دولت مستعجل بود" },
                ],
                columnB: [
                  { id: "۱", text: "برتری عشق بر عقل" },
                  { id: "۲", text: "ناپایداری حکومت‌ها" },
                  { id: "۳", text: "بیگانه‌ستیزی" },
                  { id: "۴", text: "تقدّس عشق" },
                ],
              },
              correctAnswer: { الف: "۳", ب: "۱", ج: "۲" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          instruction: "نمودار پیکانی گروه اسمی زیر را کامل کنید.",
          parts: [
            {
              /* نمودار وابستگی: دانش‌آموز برای هر واژه، «وابستهٔ کدام است» را
                 انتخاب می‌کند. نمره به نسبتِ پیکان‌های درست. */
              type: "diagram-builder",
              score: 1.5,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: poemLines("روکشِ تابوتِ تخته‌ها"),
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
            },
          ],
        },
        {
          number: 13,
          instruction: "درستی یا نادرستیِ برابرنهادِ هر جفت را مشخص کنید و نادرست‌ها را اصلاح کنید.",
          parts: [
            {
              /* فهرستِ جفت‌ها: هر سطر یا درست است یا باید اصلاح شود.
                 برای سطرِ نادرست، `correctedText` هم لازم است. */
              type: "paired-list-error-correction",
              score: 1,
              content: {
                type: "paired-list-error-correction",
                items: [
                  { id: "p1", pairText: "صبا: باد ملایم صبحگاهی" },
                  { id: "p2", pairText: "غبغب: زیرِ چانه" },
                  { id: "p3", pairText: "مهجور: دورافتاده و تنها" },
                  { id: "p4", pairText: "نغمه: بوی خوش" },
                ],
              },
              correctAnswer: {
                p1: { isCorrect: true },
                p2: { isCorrect: true },
                p3: { isCorrect: true },
                p4: { isCorrect: false, correctedText: "آواز" },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "قلمرو فکری",
      orderIndex: 3,
      sectionScore: 6,
      questions: [
        {
          number: 14,
          parts: [
            {
              /* پاسخِ یک‌واژه‌ای: `inputVariant: "word"` کادرِ کوتاه می‌دهد،
                 یعنی خودِ کادر می‌گوید «یک واژه بنویس». */
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نوع وابستهٔ وابسته را در بیت زیر بنویسید.",
                stimulus: poemLines(
                  "ای مرغ سحر، عشق ز پروانه بیاموز",
                  "کان سوخته را جان شد و آواز نیامد",
                ),
              },
              correctAnswer: { accepted: ["صفت مضاف‌الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          parts: [
            {
              /* پاسخِ باز (مفهوم‌نویسی): `textarea` + تصحیحِ غیرخودکار.
                 دانش‌آموز پاسخِ درست را می‌بیند و خودش نمره می‌دهد. */
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "مفهوم «آب جیحون فرونشست و ریگ آموی پرنیان شد» چیست؟",
              },
              correctAnswer: {
                accepted: ["فراهم شدن زمینهٔ بازگشت", "برطرف شدن مشکلات و آسان شدن کارها"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر پاسخِ هم‌معنا (بازگشتِ آسان، رفعِ مانع) نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          parts: [
            {
              /* دو (یا سه) پاسخِ کوتاه در یک سؤال. هر خانه کلیدِ خودش را
                 دارد و نمره به نسبتِ خانه‌های درست داده می‌شود.
                 ⚠️ ترتیب مهم است: اگر پاسخ‌ها جابه‌جاشدنی‌اند، به‌جای این،
                 mcq-multi-select بگذار. */
              type: "two-answer-text",
              score: 1,
              content: {
                type: "two-answer-text",
                questionText: "دو ویژگی «عشق جاودانی» را در عبارت زیر بنویسید.",
                stimulus: text(
                  "عشق جاودانی همواره معشوق را جوان می‌بیند و نه توجّهی به گرد و غبار پیری دارد.",
                ),
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: ["همیشه جوان دیدن معشوق"],
                f2: ["بی‌توجهی به نشانه‌های پیری"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          parts: [
            {
              /* درست/نادرست. با `labels` می‌شود «بله/خیر» هم گذاشت. */
              type: "true-false",
              score: 1,
              content: {
                type: "true-false",
                statementText: "«سانتاماریا» اثر رضا امیرخانی دربارهٔ دفاع مقدّس است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          parts: [
            {
              /* پاسخ یک عدد است: «چند آرایه؟»، «چند تشبیه؟» */
              type: "count-answer",
              score: 1,
              content: {
                type: "count-answer",
                questionText: "در بیت زیر چند آرایهٔ «حس‌آمیزی» به کار رفته است؟",
                min: 0,
                max: 9,
              },
              correctAnswer: { value: 3 },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          parts: [
            {
              /* جای خالی *داخلِ* جمله برای یک اصطلاح. اگر پاسخ «معنیِ واژه»
                 است از word-meaning-input استفاده کن، نه از این. */
              type: "fill-blank-term",
              score: 1,
              content: {
                type: "fill-blank-term",
                passage: blank1("زبان و واژگان شعری در قصاید دورهٔ انقلاب به سبک ", "b1", " نزدیک است."),
              },
              correctAnswer: { accepted: ["خراسانی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
