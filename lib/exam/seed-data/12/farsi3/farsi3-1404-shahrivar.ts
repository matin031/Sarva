import { blank1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، شهریور ۱۴۰۴ (کلیهٔ رشته‌ها، نوبت تابستان)
 * تاریخ برگه: ۱۴۰۴/۰۶/۰۶ — کد درس ۱۲۰۳۱.
 * Source: Shahrivar-1404-Farsi3-_www_konkur_in_.pdf — ۴ صفحه سؤال + ۲ صفحهٔ
 * «راهنمای نمره‌گذاری» (کلید، شمارهٔ صفحهٔ کتاب را هم دارد؛ همهٔ pageRefها از آن آمده‌اند).
 *
 * هر صفحه جداگانه با کیفیت بالا رندر و سؤال‌به‌سؤال با کلید تطبیق داده شد؛ زیرخط‌ها از
 * روی تصویر خوانده شدند نه فقط متنِ OCR (که در این PDF جاهایی شکسته و بی‌نقطه بود).
 *
 * نکته‌هایی که موقعِ خواندنِ این فایل لازم است:
 *
 * ۱. **بارم‌ها.** قلمرو زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰. بخش «الف) درک مطلب» (سؤال ۲۸–۳۴،
 *    ۴ نمره) و «ب) معنی و مفهوم شعر و نثر» (سؤال ۳۵–۴۲، ۴ نمره) دو زیربخشِ قلمرو فکری‌اند و
 *    مثل seedهای دیگر فارسی۳ در یک section نگه داشته شده‌اند.
 *
 * ۲. **جایی که برگه «بنویسید» می‌گوید و اینجا فهرست بازشو آمده.** فقط سؤال ۲۹ (مخاطب شاعر:
 *    حاکمان یا مردم): برگه دو گزینه را در کمانک می‌دهد، پس به دو فهرست بازشو تبدیل شد. کلید
 *    تغییر نکرده.
 *
 * ۳. **سؤال ۱۱** یک صورت سؤال دارد ولی کلید دو نمرهٔ ۰٫۲۵ جدا می‌دهد (نوع وابستهٔ وابسته +
 *    نمودار پیکانی)، پس به دو part (الف و ب) شکسته شد؛ برچسب‌ها ساختگی‌اند و روی برگه نیستند.
 *
 * ۴. **سؤال ۴۰** در کلید «ص۲ ۱۹» چاپ شده (شکسته)؛ همان بیتِ سؤال ۱۰ (ص ۱۹) است و pageRef ۱۹ گرفت.
 *
 * هیچ سؤالی `verified: false` ندارد.
 */
export const farsi3Shahrivar1404: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی شهریور ۱۴۰۴",
  examSession: "farsi-1404-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1404-Farsi3-_www_konkur_in_.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 37,
          instruction: "معنی واژهٔ «معجر» را در مصراع زیر بنویسید.",
          parts: [
            {
              type: "word-meaning-input",
              score: 0.25,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("برکش ز سر این سپید ", "معجر", "w1", ""),
              },
              correctAnswer: { w1: ["سرپوش", "روسری"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 75,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: text("«خسته از نشئهٔ خوب و پاک آن «اسرا» در بستر خویش به خواب رفتم»"),
                questionText: "با توجّه به عبارت بالا، کدام یک از معانی زیر از واژهٔ «نشئه» دریافت نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "حالت سرخوشی", isCorrect: false },
                { optionKey: "ب", text: "کیفوری", isCorrect: false },
                { optionKey: "ج", text: "سرمستی", isCorrect: false },
                { optionKey: "د", text: "شیدایی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 3,
          instruction: "درستی یا نادرستی هریک از موارد زیر را مشخص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 163,
              content: {
                type: "true-false",
                statementText:
                  "«معمار» مترادف واژهٔ «معمّر» در عبارت «یکی از مردان معمّر دهکده کتاب را بر روی زانو گشوده بود»، است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 140,
              content: {
                type: "true-false",
                statementText:
                  "«سفله» متضاد واژهٔ «شخیص» در جملهٔ «در مقابل تظاهرات شخص شخیصی چون آقای استاد، دو دل مانده بودند» است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          pageRef: 12,
          parts: [
            {
              type: "mcq-plus-correction",
              score: 0.5,
              content: {
                type: "mcq-plus-correction",
                questionText: "در کدام عبارت نادرستی املایی وجود دارد؟",
                correctionPrompt: "شکل درست آن را بنویسید.",
              },
              correctAnswer: { correctionAnswers: ["صبا"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «ب (۰٫۲۵) صبا (۰٫۲۵) (به واژهٔ درست نمرهٔ کامل تعلق می‌گیرد)».",
              options: [
                {
                  optionKey: "الف",
                  text: "بدان گلشن خرّم باز گردم و در آن گلزار باصفا بیاسایم. مرا از این سفر معذور دارید که مرا با سیمرغ کاری نیست.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "فرّاشِ بادِ سبا را گفته تا فرشِ زمرّدین بگسترد و دایهٔ ابرِ بهاری را فرموده تا بناتِ نبات در مهدِ زمین بپرورد.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 5,
          instruction: "املای درست واژه را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 161,
              content: {
                type: "mcq-inline",
                questionText:
                  "از او به سبب چهل سال رنج شبانه‌روزی و مدرسه‌داری و (خدمت‌گزاری - خدمت‌گذاری) قدردانی کنند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "خدمت‌گزاری", isCorrect: true },
                { text: "خدمت‌گذاری", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 63,
              content: {
                type: "mcq-inline",
                questionText: "توقّف ما در (عمّان - امّان) و آتن بیش از نیم ساعت طول نکشید.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "عمّان", isCorrect: false },
                { text: "امّان", isCorrect: true },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 103,
              content: {
                type: "mcq-inline",
                questionText: "سیاوش چنین گفت کای شهریار / که دوزخ مرا زین سخن گشت (خار - خوار)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "خار", isCorrect: false },
                { text: "خوار", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 6,
          instruction: "در هر عبارت یک نادرستی املایی وجود دارد، درست آن را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 94,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "توپخانه شروع کرده بود و صدای محیب آن، صدای کودکانه امّا خشک کلاش را در خود هضم می‌کرد.",
                ),
              },
              correctAnswer: { wrongWord: "محیب", correctWord: "مهیب" },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 141,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "در کمرکش دوازده حلقوم و کتل و گردنهٔ یک دوجین شکم و روده مراحل مضق و بلع و هضم و تحلیل را پیموده.",
                ),
              },
              correctAnswer: { wrongWord: "مضق", correctWord: "مضغ" },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 75,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "غرق در این دریای سبزه معلّقی که بر آن مرغان الماس پرَ، ستارگان زیبا و خاموش، تک تک از غیب سر می‌زنند.",
                ),
              },
              correctAnswer: { wrongWord: "سبزه", correctWord: "سبز" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          pageRef: 105,
          instruction: "تفاوت معنایی فعل «شد» را در ابیات زیر بررسی کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "نخستین دمیدن سیه " },
                      { kind: "highlight", value: "شد" },
                      { kind: "text", value: " ز دود" },
                    ],
                    [{ kind: "text", value: "زبانه برآمد پس از دود، زود" }],
                  ],
                },
                questionText: "معنای فعل «شد» را در بیت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["گشت", "اسنادی", "گشت (اسنادی)"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«گشت» یا «اسنادی» (یا هر دو) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "زیرخطِ «شد» روی اسکن دیده نمی‌شد و بر اساس صورت سؤال اضافه شده؛ فقط نمایشی است.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "بدان گه که " },
                      { kind: "highlight", value: "شد" },
                      { kind: "text", value: " پیش کاووس باز" },
                    ],
                    [{ kind: "text", value: "فرودآمد از باره، بردش نماز" }],
                  ],
                },
                questionText: "معنای فعل «شد» را در بیت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["رفت", "غیراسنادی", "رفت (غیراسنادی)"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«رفت» یا «غیراسنادی» (یا هر دو) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "زیرخطِ «شد» نمایشی است (مثل الف).",
            },
          ],
        },
        {
          number: 8,
          pageRef: 48,
          instruction: "با توجّه به بیت زیر، موارد خواسته‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines("من به هر جمعیّتی نالان شدم", "جفت بدحالان و خوش‌حالان شدم"),
                questionText: "ترکیب اضافی را بنویسید.",
              },
              correctAnswer: { accepted: ["جفت بدحالان", "جفت خوش‌حالان", "جفت بدحالان و خوش‌حالان"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «جفت بدحالان / جفت خوش‌حالان».",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines("من به هر جمعیّتی نالان شدم", "جفت بدحالان و خوش‌حالان شدم"),
                questionText: "ترکیب وصفی را بنویسید.",
              },
              correctAnswer: { accepted: ["هر جمعیّتی", "هر جمعیتی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 13,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "نقش ضمیر پیوسته در کدام گزینه متفاوت است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: ب (ضمیر پیوستهٔ «دیگرش»).",
              options: [
                {
                  optionKey: "الف",
                  text: "رخ شاه کاووس پرشرم دید / سخن‌گفتنش با پسر نرم دید",
                  isCorrect: false,
                },
                { optionKey: "ب", text: "باز اعراض فرماید. بار دیگرش به تضرّع و زاری بخواند.", isCorrect: true },
                { optionKey: "ج", text: "تا چشم بشر نبیندت روی / بنهفته به ابر چهر دلبند", isCorrect: false },
                {
                  optionKey: "د",
                  text: "آن شب نیز ماه با تألّؤ پرشکوهش از راه رسید و گل‌های الماس شکفتند.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 19,
          instruction:
            "با توجّه به ابیات زیر به پرسش‌ها پاسخ دهید. بیت نخست: «گفت: «تا داروغه را گوییم در مسجد بخواب» / گفت: «مسجد خوابگاه مردم بدکار نیست»». بیت دوم: «گفت: «از بهر غرامت جامه‌ات بیرون کنم» / گفت: «پوسیده است، جز نقشی ز پود و تار نیست»».",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در بیت نخست، مفعول مصراع اول را بیابید.",
              },
              correctAnswer: {
                accepted: ["تا داروغه را گوییم در مسجد بخواب", "«تا داروغه را گوییم در مسجد بخواب»"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "مرجع ضمیر را در بیت دوم مشخص کنید.",
              },
              correctAnswer: { accepted: ["مست"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 122,
          instruction: "نوع وابستهٔ وابسته را بنویسید و نمودار پیکانی آن را رسم کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text(
                  "سنجش نیروی او در توان ما نیست. چه کسی تواند ذرّه‌ای از خرد و شکوه و زیبایی او را دریابد؟",
                ),
                questionText: "نوع وابستهٔ وابسته را بنویسید.",
              },
              correctAnswer: { accepted: ["مضاف‌الیه مضاف‌الیه", "مضاف‌الیهِ مضاف‌الیه", "مضاف الیه مضاف الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "diagram-builder",
              score: 0.25,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: text(
                  "سنجش نیروی او در توان ما نیست. چه کسی تواند ذرّه‌ای از خرد و شکوه و زیبایی او را دریابد؟",
                ),
                nodes: [
                  { id: "n1", label: "سنجش" },
                  { id: "n2", label: "نیروی" },
                  { id: "n3", label: "او" },
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
                "کلید: نمودار گروه اسمی «سنجش نیروی او» با دو پیکان (او ← نیروی، نیروی ← سنجش)؛ هر دو مضاف‌الیه.",
            },
          ],
        },
        {
          number: 12,
          pageRef: 26,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "الگوی جملهٔ «آن کسی را که در این ملک، سلیمان کردیم» «نهاد + مفعول + ",
                  "b1",
                  " + فعل» است.",
                ),
              },
              correctAnswer: { accepted: ["مسند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          instruction: "با توجّه به هر عبارت، جاهای خالی را تکمیل کنید.",
          layoutPattern: "list-of-parallel-blanks",
          parts: [
            {
              label: "الف",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 87,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "در مصراع «چون رود امیدوارم، بی‌تابم و بی‌قرارم» نقش دستوری واژهٔ «رود» ",
                  "f1",
                  " است.",
                ),
              },
              correctAnswer: { accepted: ["متمم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 54,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "در عبارت «عشق خاصّ‌تر از محبّت است؛ زیرا که همه عشقی محبّت باشد امّا همه محبّتی عشق نباشد»، ",
                  "f2",
                  " پیوند هم‌پایه‌ساز است.",
                ),
              },
              correctAnswer: { accepted: ["امّا", "اما"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 135,
              content: {
                type: "fill-blank-term",
                passage: blank1("در جملهٔ «عیالم هراسان وارد شد»، مفهوم «ان» ", "f3", " است."),
              },
              correctAnswer: { accepted: ["فاعلی", "صفت فاعلی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          instruction: "درستی یا نادرستی هریک از موارد زیر را مشخص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 65,
              content: {
                type: "true-false",
                statementText:
                  "در عبارت «در جای دیگر، سپاهیان دشمن و بالاخره ناپلئون در آن دور دست بر اسب سفید، متفکّر، به دورنمای جنگ می‌نگرد»، هردو نقش تبعی بدل و معطوف دیده می‌شود.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 111,
              content: {
                type: "true-false",
                statementText:
                  "در شعر «سورتِ سرمای دی بیدادها می‌کرد. / و چه سرمایی، چه سرمایی! / بادبرف و سوز وحشتناک / لیک، خوشبختانه آخر، سرپناهی یافتم جایی»، واژه و ترکیب نوساخته به کار رفته است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 153,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines(
                  "و در بهاران، عشق من!",
                  "خنده‌ات را می‌خواهم",
                  "چون گلی که در انتظارش بودم",
                ),
                questionText: "نوع حذف فعل را در شعر بالا مشخص کنید.",
              },
              correctAnswer: {
                accepted: [
                  "معنایی",
                  "معنوی",
                  "به قرینهٔ معنایی",
                  "به قرینهٔ معنوی",
                  "حذف به قرینهٔ معنایی",
                  "حذف به قرینهٔ معنوی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «معنایی (معنوی)».",
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
          number: 16,
          instruction: "برای هر یک از نویسندگان زیر یک اثر نام ببرید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 45,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "احمد عربلو:" },
              correctAnswer: { accepted: ["قصّهٔ شیرین فرهاد", "قصه شیرین فرهاد", "شیرین فرهاد"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "اثر درسی «قصّهٔ شیرین فرهاد» (یا هر اثر درست دیگر از او) نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 130,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "ظهیری سمرقندی:" },
              correctAnswer: { accepted: ["سندبادنامه", "سندباد نامه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          instruction: "مورد درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 164,
              content: {
                type: "mcq-inline",
                questionText: "مترجم قصّه‌های دوشنبه (محمدابراهیم باستانی پاریزی - عبدالحسین زرین‌کوب) است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "محمدابراهیم باستانی پاریزی", isCorrect: false },
                { text: "عبدالحسین زرین‌کوب", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 55,
              content: {
                type: "mcq-inline",
                questionText: "تمهیدات نوشتهٔ (عین‌القضات همدانی - شهاب‌الدین سهروردی) است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "عین‌القضات همدانی", isCorrect: true },
                { text: "شهاب‌الدین سهروردی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 18,
          pageRef: 119,
          instruction: "مصراع دوم بیت زیر را بنویسید.",
          parts: [
            {
              type: "verse-completion",
              score: 0.5,
              content: { type: "verse-completion", firstMesra: "به دشت دل گیاهی جز گل رویت نمی‌روید" },
              correctAnswer: { accepted: ["من این زیبازمین را آزمودم، میهن ای میهن!"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید: به مصراع کامل نمره تعلّق می‌گیرد.",
            },
          ],
        },
        {
          number: 19,
          pageRef: 99,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "................................................................." }],
                    [{ kind: "text", value: "آورده مرگ، گرم به آغوش تو پناه" }],
                  ],
                },
                questionText: "مصراع نخست بیت بالا، کدام است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "شاهد، نیاز نیست که در محضر آورند", isCorrect: false },
                { optionKey: "ب", text: "لبریز زندگی است نفس‌های آخرت", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 20,
          pageRef: 98,
          instruction:
            "مصراع دوم بیت زیر را مرتّب کنید. (مصراع اول: «آه این سر بریدهٔ ماه است در پگاه؟»)",
          parts: [
            {
              type: "word-reorder-dnd",
              score: 0.25,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["خورشید", "نه", "شامگاه", "یا", "بریدهٔ", "سر"],
              },
              correctAnswer: {
                orderedTokens: ["یا", "نه", "سر", "بریدهٔ", "خورشید", "شامگاه"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: «یا نه! سر بریدهٔ خورشید شامگاه؟». مصراع اول بیت به instruction رفت چون content این نوع در نمونه‌ها stimulus نداشت.",
            },
          ],
        },
        {
          number: 21,
          instruction: "آرایهٔ درست را از داخل کمانک برگزینید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 27,
              content: {
                type: "mcq-inline",
                questionText:
                  "با آنکه جیب و جام من از مال و می تهی است / ما را فراغتی است که جمشید جم نداشت",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: true },
                { text: "تضمین", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 86,
              content: {
                type: "mcq-inline",
                questionText:
                  "آن‌جا در آن برزخ سرد، در کوچه‌های غم و درد / غیر از شب آیا چه می‌دید چشمان تار من و تو؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشخیص", isCorrect: false },
                { text: "جناس", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 22,
          pageRef: 125,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines("هر یکی بینا شود بر قدر خویش", "باز یابد در حقیقت صدر خویش"),
                questionText: "قافیه‌های بیت بالا کدام آرایهٔ ادبی را ایجاد کرده‌اند؟",
              },
              correctAnswer: { accepted: ["جناس", "جناس ناهمسان", "جناس ناقص"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «جناس (جناس ناهمسان / جناس ناقص)».",
            },
          ],
        },
        {
          number: 23,
          pageRef: 103,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام گزینه از پرسش (استفهام) انکاری استفاده نشده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "همچو نی زهری و تریاقی که دید؟ / همچو نی دمساز و مشتاقی که دید؟",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "به پور جوان گفت شاه زمین / که رایت چه بیند کنون اندرین؟",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 24,
          pageRef: 135,
          instruction: "مفهوم کنایی بخش‌های مشخص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "highlight", value: "به من دخلی ندارد" },
                    { kind: "text", value: "! ماشاءالله هفت قرآن به میان پسرعموی خودت است." },
                  ],
                },
                questionText: "مفهوم کنایی بخش مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["به من ربطی ندارد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 75,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "دیدارها همه بر خاک و " },
                    { kind: "highlight", value: "سخن‌ها همه از خاک" },
                    { kind: "text", value: "!" },
                  ],
                },
                questionText: "مفهوم کنایی بخش مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مادّی‌گرایی", "مادی گرایی", "مادّی‌گرا بودن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 115,
          instruction: "آرایهٔ متناسب با هر مورد را از ستون «ب» انتخاب کنید. (یک آرایه در ستون ب اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.75,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "سایه‌ای را دید / او شغاد، آن نابرادر بود / که درون چَه نگه می‌کرد و می‌خندید",
                  },
                  {
                    id: "ب",
                    text: "چه غم دیوارِ امّت را که دارد چون تو پشتیبان؟ / چه باک از موجِ بحر آن را که باشد نوح کشتیبان؟",
                  },
                  { id: "ج", text: "آتش عشق است کاندر نی فتاد / جوشش عشق است کاندر می فتاد" },
                ],
                columnB: [
                  { id: "1", text: "اسلوب معادله" },
                  { id: "2", text: "حسن تعلیل" },
                  { id: "3", text: "متناقض‌نما" },
                  { id: "4", text: "ایهام" },
                ],
              },
              correctAnswer: { الف: "4", ب: "1", ج: "2" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«متناقض‌نما» (۳) اضافی است. کلید: الف→ایهام (ص ۱۱۵)، ب→اسلوب معادله (ص ۱۳)، ج→حسن تعلیل (ص ۴۹)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 26,
          pageRef: 114,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: poemLines(
                  "آری اکنون شیر ایران‌شهر",
                  "تهمتن، گُرد سجستانی",
                  "کوهِ کوهان، مردِ مردستان",
                  "رستمِ دستان،",
                  "در تگِ تاریکْ ژرفِ چاه پهناور",
                ),
                questionText: "در شعر بالا، کدام زمینهٔ حماسه به کار نرفته است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "داستانی", isCorrect: false },
                { optionKey: "ب", text: "ملّی", isCorrect: false },
                { optionKey: "ج", text: "خرق عادت", isCorrect: true },
                { optionKey: "د", text: "قهرمانی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 27,
          pageRef: 64,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                stimulus: text(
                  "یک روز دنیایی به روم چشم داشت و از آن چشم می‌زد امّا امروز به جای همهٔ آن حرف‌ها وقتی اعتصاب کارگران فقیر ماهیگیر و کشتی‌ساز ایتالیا را می‌بینیم...",
                ),
                questionText: "عبارت بالا یادآور کدام ضرب‌المثل است؟",
              },
              correctAnswer: { accepted: ["از عرش به فرش افتادن"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«از عرش به فرش افتادن» یا هر ضرب‌المثل مشابه نمرهٔ کامل دارد.",
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
        // ---- الف) درک مطلب (۴ نمره)
        {
          number: 28,
          pageRef: 22,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "در مکتب حقایق پیش ادیب عشق",
                  "هان ای پسر، بکوش که روزی پدر شوی",
                  "آیین طریق از نفس پیر مغان یافت",
                  "آن خضر که فرخنده‌پی‌اش نام نهادند",
                ),
                questionText: "ابیات بالا بر کدام مفهوم عرفانی یکسان تأکید دارند؟",
              },
              correctAnswer: { accepted: ["لزوم هدایت به‌وسیلهٔ پیر (مرشد / راهنما / مراد)"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید: صص ۲۲ و ۶۴.",
            },
          ],
        },
        {
          number: 29,
          instruction: "با توجّه به واژه‌های (حاکمان - مردم)، مخاطب شاعر در هر یک از ابیات زیر کیست؟",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["حاکمان", "مردم"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "t1",
                        value: "الف) جامه‌ای کاو نشود غرقه به خون بهر وطن / بدر آن جامه که ننگ تن و کم از کفن است",
                        options: ["حاکمان", "مردم"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "t2",
                        value: "ب) در پیشگاه اهل خرد نیست محترم / هرکس که فکر جامعه را محترم نداشت",
                        options: ["حاکمان", "مردم"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { t1: "مردم", t2: "حاکمان" },
                weights: { t1: 0.25, t2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه پاسخِ نوشتنی است و دو گزینه در کمانک آمده؛ به دو فهرست بازشو با همان دو گزینه تبدیل شد. کلید: «الف) مردم (۰٫۲۵، ص ۲۶)  ب) حاکمان (۰٫۲۵، ص ۲۷)».",
            },
          ],
        },
        {
          number: 30,
          instruction: "مقصود از بخش‌های مشخص‌شده چیست؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 87,
              content: {
                type: "short-text-answer",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "با این " },
                      { kind: "highlight", value: "نسیم سحرخیز" },
                      { kind: "text", value: "، برخیز اگر جان سپردیم" },
                    ],
                    [{ kind: "text", value: "در باغ می‌ماندَ ای دوست، گل یادگار من و تو" }],
                  ],
                },
                questionText: "مقصود از بخش مشخص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["انقلاب اسلامی", "جنبش‌های انقلابی", "انقلاب اسلامی یا جنبش‌های انقلابی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 49,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "محرم این " },
                      { kind: "highlight", value: "هوش" },
                      { kind: "text", value: " جز بی‌هوش نیست" },
                    ],
                    [{ kind: "text", value: "مر زبان را مشتری جز گوش نیست" }],
                  ],
                },
                questionText: "مقصود از بخش مشخص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["عشق"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 26,
              content: {
                type: "short-text-answer",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "همّت از باد سحر می‌طلبم گر ببرد" }],
                    [
                      { kind: "text", value: "خبر از من به " },
                      { kind: "highlight", value: "رفیقی که به طرف چمن" },
                      { kind: "text", value: " است" },
                    ],
                  ],
                },
                questionText: "مقصود از بخش مشخص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["دوستان آزادی‌خواه", "آزادی‌خواهان"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 153,
              content: {
                type: "short-text-answer",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "خنده‌ات را می‌خواهم" }],
                    [{ kind: "text", value: "چون گلی که در انتظارش بودم،" }],
                    [
                      { kind: "highlight", value: "گل آبی، گل سرخ" },
                      { kind: "text", value: " کشورم که مرا می‌خواند." },
                    ],
                  ],
                },
                questionText: "مقصود از بخش مشخص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["پرچم", "پرچم شیلی", "پرچم کشور"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 89,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text(
                  "تو اگر آن مایه کرامت را از مادر به میراث می‌داشتی، می‌بایست همانند با درختان بارور، بخشندگی و ایثار را سراپا دست باشی.",
                ),
                questionText: "در عبارت بالا، بخشندگی به پیروی از چه کسی/چیزی توصیه شده است؟",
              },
              correctAnswer: { accepted: ["طبیعت", "زمین", "هستی"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید: «طبیعت یا زمین یا هستی».",
            },
          ],
        },
        {
          number: 32,
          instruction:
            "هر یک از مفاهیم «برتری عشق حقیقی، پیروی از معبود، از خودگذشتگی عاشق، زندگی‌بخشی عشق، قدرت معبود» با کدام بیت تناسب دارد؟ (یک مفهوم اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              pageRef: 10,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "ملکا ذکر تو گویم که تو پاکی و خدایی / نروم جز به همان ره که تواَم راه نمایی",
                  },
                  { id: "ب", text: "هر آن دل را که سوزی نیست دل نیست / دل افسرده، غیر از آب و گل نیست" },
                  { id: "ج", text: "در عشق کسی قدم نهد کش جان نیست / با جان بودن به عشق در سامان نیست" },
                  { id: "د", text: "هر که داند گفت با خورشید راز / کی تواند ماند با یک ذرّه باز؟" },
                ],
                columnB: [
                  { id: "1", text: "برتری عشق حقیقی" },
                  { id: "2", text: "پیروی از معبود" },
                  { id: "3", text: "از خودگذشتگی عاشق" },
                  { id: "4", text: "زندگی‌بخشی عشق" },
                  { id: "5", text: "قدرت معبود" },
                ],
              },
              correctAnswer: { الف: "2", ب: "4", ج: "3", د: "1" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«قدرت معبود» (۵) اضافی است. کلید: الف→پیروی از معبود (ص ۱۰)، ب→زندگی‌بخشی عشق (ص ۱۶۵)، ج→از خودگذشتگی عاشق (ص ۵۵)، د→برتری عشق حقیقی (ص ۱۲۳)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 33,
          instruction: "هر یک از عبارات زیر، نشان‌دهندهٔ کدام وادی عرفانی است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 16,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("گر کسی وصف او ز من پرسد", "بی‌دل از بی‌نشان چه گوید باز؟"),
                questionText: "این بیت نشان‌دهندهٔ کدام وادی عرفانی است؟",
              },
              correctAnswer: { accepted: ["حیرت"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 49,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("آتش است این بانگ نای و نیست باد", "هر که این آتش ندارد نیست باد"),
                questionText: "این بیت نشان‌دهندهٔ کدام وادی عرفانی است؟",
              },
              correctAnswer: { accepted: ["عشق"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 164,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "«صدا در گلو شکست» در عبارت «بغض و اندوه، صدا را در گلویش شکست، نتوانست سخن خود را تمام کند» مفهوم ",
                  "b1",
                  " دارد.",
                ),
              },
              correctAnswer: { accepted: ["بغض کرد", "گریه کرد", "بغض کردن", "گریه کردن"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«بغض کرد» یا «گریه کرد» (یا مفهوم مشابه) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "کلید: «بغض کرد (گریه کرد)».",
            },
          ],
        },
        // ---- ب) معنی و مفهوم شعر و نثر (۴ نمره)
        {
          number: 35,
          pageRef: 157,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "نخستین باری که نام زیبای تو را تلاوت کردم.",
              },
              correctAnswer: { accepted: ["نخستین باری که نام زیبای تو را صدا زدم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          pageRef: 27,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "در دفتر زمانه فتد نامش از قلم",
              },
              correctAnswer: { accepted: ["در گذر روزگار فراموش می‌شود"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «در گذر روزگار» و «فراموش می‌شود».",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          pageRef: 55,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "هر جا که رسد، سوزد و به رنگ خود گرداند.",
              },
              correctAnswer: { accepted: ["به هر کجا که برسد، آن را نابود می‌کند و مانند خود می‌کند"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «به هر کجا که برسد، آن را نابود می‌کند» و «مانند خود می‌کند».",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          pageRef: 72,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "بهار حیات علمی و اجتماعی‌اش فرا رسیده بود.",
              },
              correctAnswer: { accepted: ["دوران شکوفایی زندگی علمی و اجتماعی‌اش بود"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «دوران شکوفایی» و «زندگی علمی و اجتماعی‌اش بود».",
              verified: true,
            },
          ],
        },
        {
          number: 39,
          pageRef: 102,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "جهاندار سودابه را پیش خواند",
              },
              correctAnswer: { accepted: ["کاووس‌شاه سودابه را فراخواند"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «کاووس‌شاه» و «سودابه را فراخواند».",
              verified: true,
            },
          ],
        },
        {
          number: 40,
          pageRef: 19,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "گفت: «دیناری بده پنهان و خود را وارهان»",
              },
              correctAnswer: { accepted: ["گفت: «پنهانی به من پولی (رشوه‌ای) بده و خود را خلاص کن»"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «پنهانی به من پولی (رشوه‌ای) بده» و «و خود را خلاص کن».",
              verified: true,
              sourceNote: "شمارهٔ صفحه در کلید شکسته چاپ شده («ص۲ ۱۹»)؛ همان متن سؤال ۱۰ (ص ۱۹) است.",
            },
          ],
        },
        {
          number: 41,
          pageRef: 152,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("عشق من، خندهٔ تو", "در تاریک‌ترین لحظه‌ها می‌شکفد."),
                questionText: "معنی و مفهوم را به نثر روان بنویسید.",
              },
              correctAnswer: {
                accepted: ["عشق من، خندهٔ تو، در لحظه‌های ناامیدی، مرا امیدوار می‌کند"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «عشق من، خندهٔ تو، در لحظه‌های ناامیدی» و «مرا امیدوار می‌کند».",
              verified: true,
            },
          ],
        },
        {
          number: 42,
          pageRef: 92,
          instruction: "معنی و مفهوم اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  "میانهٔ دو تپّه‌ای که در کنار هم برآمده بود، جای دنجی بود برای خلوت کردن با خدا.",
              },
              correctAnswer: {
                accepted: [
                  "میانهٔ دو تپّه‌ای که در کنار هم بالا آمده بودند، برای مناجات با خدا جای خلوتی بود",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "سه جزء، هرکدام ۰٫۲۵: «میانهٔ دو تپّه‌ای که در کنار هم بالا آمده بودند»، «برای مناجات با خدا» و «جای خلوتی بود».",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
