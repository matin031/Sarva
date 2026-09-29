import { highlight1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۲ یازدهم — امتحان نهایی خرداد ۱۴۰۴ (کلیهٔ رشته‌ها)
 * تاریخ برگه: ۱۴۰۴/۰۳/۰۳ — ساعت شروع ۷:۳۰ به وقت تهران، ۱۰۰ دقیقه.
 * Source: Farsi2-Khordad1404-[konkur.in].pdf — ۴ صفحه سؤال + ۲ صفحه راهنمای نمره‌گذاری.
 *
 * کنترل سه‌مرحله‌ای:
 * ۱) متن سؤال‌ها، گزینه‌ها، زیرخط‌ها/واژه‌های مشخص‌شده و بارم‌ها با تصاویر صفحات سؤال تطبیق داده شد.
 * ۲) پاسخ هر سؤال، ریزبارم و pageRef با دو صفحهٔ راهنمای نمره‌گذاری تطبیق داده شد.
 * ۳) نوع سؤال، layoutPattern، gradingMode، املای عمدیِ سؤال‌های املایی، جمع بارم‌ها و syntax فایل کنترل شد.
 *
 * بارم‌ها: قلمرو زبانی ۷ + قلمرو ادبی ۵ + قلمرو فکری ۸ = ۲۰.
 *
 * نکتهٔ UI:
 * سؤال ۲۲ در برگه دو انتخاب داخل کمانک دارد، اما کلید صراحتاً می‌گوید فقط با نوشتن هر دو پاسخ
 * نمره تعلق می‌گیرد. برای حفظ همین منطقِ «همه یا هیچ»، به یک MCQ ترکیبی چهارگزینه‌ای تبدیل شده است.
 */
export const farsi2Khordad1404: SeedExam = {
  subject: "farsi2",
  grade: 11,
  title: "فارسی۲ یازدهم — امتحان نهایی خرداد ۱۴۰۴",
  examSession: "farsi2-1404-khordad",
  totalScore: 20,
  sourcePdf: "Farsi2-Khordad1404-[konkur.in].pdf",
  sections: [
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 29,
          instruction: "معنی واژهٔ مشخص‌شده را بنویسید.",
          parts: [
            {
              type: "word-meaning-input",
              score: 0.25,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "به رود سند می‌غلتید بر هم / ز امواج ",
                  "گران",
                  "w1",
                  "، کوه از پی کوه",
                ),
              },
              correctAnswer: { w1: ["سنگین", "عظیم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 81,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1(
                  "زاغی از آنجا که فراغی گزید / رخت خود از باغ به ",
                  "راغی",
                  " کشید",
                ),
                questionText:
                  "در عبارت «شب پیشین برای شست‌وشوی صحرا و بوستان چابک‌دستی کرده، راه باغ را رُفته و گونهٔ گل‌های بنفشه را دُرافشان ساخته بود.» کدام واژه معادل معنایی واژهٔ مشخص‌شده است؟",
              },
              correctAnswer: { accepted: ["صحرا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 86,
          parts: [
            {
              type: "two-answer-text",
              score: 0.25,
              content: {
                type: "two-answer-text",
                stimulus: text(
                  "دریادلان راه سفر در پیش دارند / پا در رکاب راهوار خویش دارند\nوقت است تا برگ سفر بر باره بندیم / دل بر عبور از سدِّ خار و خاره بندیم",
                ),
                questionText: "در ابیات بالا دو واژه بیابید که معنای مشترک دارند.",
                fields: [
                  { id: "f1", label: "واژهٔ اول" },
                  { id: "f2", label: "واژهٔ دوم" },
                ],
              },
              correctAnswer: { f1: ["راهوار"], f2: ["باره"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "طبق راهنمای نمره‌گذاری، فقط با نوشتن هر دو واژه با هم نمره تعلق می‌گیرد.",
            },
          ],
        },
        {
          number: 4,
          pageRef: 118,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: highlight1("جمله به طریق ", "تعاون", " قوّتی کنید تا دام از جای برگیریم."),
                questionText: "کدام گزینه معادل معنایی واژهٔ مشخص‌شده نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مظاهرت", isCorrect: false },
                { optionKey: "ب", text: "التفات", isCorrect: true },
                { optionKey: "ج", text: "معونت", isCorrect: false },
                { optionKey: "د", text: "پشتیبانی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 58,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("شما چه دانید که ما را با این مشتی خاک، چه کارها از ", "ازل", " تا ابد در پیش است؟"),
                questionText: "در عبارت بالا کدام کلمه ارزش املایی بیشتری دارد؟",
              },
              correctAnswer: { accepted: ["ازل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 6,
          instruction: "املای درست واژه را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 49,
              content: {
                type: "mcq-inline",
                questionText: "دوست نداشتم از بچّه‌ها فاصله بگیرند یا احساس (ترد / طرد) شدن کنند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ترد", isCorrect: false },
                { text: "طرد", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 155,
              content: {
                type: "mcq-inline",
                questionText: "به حشرم بده نامه در دست راست / ز (حولم / هولم) در آن روز بی‌باک کن",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حولم", isCorrect: false },
                { text: "هولم", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 7,
          instruction: "تعداد غلط‌های املایی هر گزینه را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "count-answer",
              score: 0.25,
              pageRef: 128,
              content: {
                type: "count-answer",
                questionText:
                  "«مصحور کار خود بودم؛ ابداً توجّهی به ماجرای شروع شده نداشتم. بی‌توجّهی من و اینکه با نگاه‌ها هیچ اظطرابی نشان ندادم، معلم را در ظنِّ خود تقویت کرد.» — تعداد غلط‌های املایی را بنویسید.",
                min: 0,
                max: 10,
              },
              correctAnswer: { value: 2 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای نمره‌گذاری: دو غلط؛ «مصحور ← مسحور» و «اظطراب ← اضطراب».",
            },
            {
              label: "ب",
              type: "count-answer",
              score: 0.25,
              pageRef: 17,
              content: {
                type: "count-answer",
                questionText:
                  "«آنگاه آگاه شدند که غرقه خاست شد. بانگ و هزاحز و غریو خواست. امیر برخاست.» — تعداد غلط‌های املایی را بنویسید.",
                min: 0,
                max: 10,
              },
              correctAnswer: { value: 3 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای نمره‌گذاری سه صورت درست را «خواست، هزاهز، خاست» ذکر کرده است.",
            },
          ],
        },
        {
          number: 8,
          instruction: "در هر گزینه املای یک واژه نادرست است؛ آن مورد را اصلاح کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 145,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "اوست که عادل مطلق است / و خان عدل خود را بر همگان گسترده / باشد که از میان اسمای صدگانه‌اش / او را به همین نام بستاییم، آمین!",
                ),
              },
              correctAnswer: { wrongWord: "خان", correctWord: "خوان" },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 106,
              content: {
                type: "open-error-correction-in-passage",
                passage: text("بدر در میدان او حاللی بودی و رستم به دست او زالی."),
              },
              correctAnswer: { wrongWord: "حاللی", correctWord: "هلالی" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 146,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("او اختران را در آسمان نهاده", "تا به برّ و بحر نشانمان باشند"),
                questionText: "در قسمت اول شعر بالا، نوع رابطهٔ معنایی بین کلمات را بنویسید.",
              },
              correctAnswer: { accepted: ["تضمّن", "تضمن"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "منظور از «قسمت اول» رابطهٔ «اختران / آسمان» است.",
            },
          ],
        },
        {
          number: 10,
          pageRef: 99,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: highlight1("مادر فریدون ", "فرانک", " پسر را به البرزکوه می‌برد و به مردی پاک‌دین می‌سپرد."),
                questionText: "ابتدا نقش تبعی را پیدا کرده و سپس نوع آن را بنویسید.",
                fields: [
                  { id: "f1", label: "نقش تبعی" },
                  { id: "f2", label: "نوع نقش تبعی" },
                ],
              },
              correctAnswer: { f1: ["فرانک"], f2: ["بدل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          instruction: "نوع صفت بیانی موجود در هر گزینه را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 75,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1(
                  "بنابراین خاله‌ام با همه تمکّنی که داشت، به زندگی ",
                  "درویشانه‌ای",
                  " قناعت کرده بود.",
                ),
                questionText: "نوع صفت بیانی مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["نسبی", "صفت نسبی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 29,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("از این سدِّ ", "روان", "، در دیدهٔ شاه / ز هر موجی هزاران نیش می‌رفت"),
                questionText: "نوع صفت بیانی مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["فاعلی", "صفت فاعلی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          pageRef: 12,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "معنای فعل «شد» در کدام گزینه با بقیه متفاوت است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "هنر خوار شد، جادویی ارجمند / نهان راستی، آشکارا گزند", isCorrect: false },
                { optionKey: "ب", text: "از شبنم عشق، خاک آدم گل شد / صد فتنه و شور در جهان حاصل شد", isCorrect: false },
                { optionKey: "ج", text: "یقین، مرد را دیده، بیننده کرد / شد و تکیه بر آفریننده کرد", isCorrect: true },
                { optionKey: "د", text: "چو آتش در سپاه دشمن افتاد / ز آتش هم کمی سوزنده‌تر شد", isCorrect: false },
              ],
              sourceNote: "کلید: گزینهٔ ج؛ «شد» در این گزینه به معنای «رفت» است.",
            },
          ],
        },
        {
          number: 13,
          instruction: "با توجه به عبارت‌های زیر، مورد خواسته‌شده را پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 20,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1(
                  "پس از نماز، کس فرستاد و قاضی ",
                  "بوالحسن",
                  " و پسرش را بخواند و بیامدند، بونصر پیغام امیر به قاضی رساند.",
                ),
                questionText: "نوع وابستهٔ پیشین مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["شاخص"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 112,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("برافراخت پس دستِ ", "خیبرگشا", ""),
                questionText: "نوع وابستهٔ پسین مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["صفت بیانی", "صفت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 140,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: text("گریه کنی اگر / که آفتاب را ندیده‌ای / ستاره‌ها را هم / نمی‌بینی"),
                questionText: "زمان افعال، به ترتیب، در کدام گزینه درست آمده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مضارع التزامی — ماضی بعید — مضارع اخباری", isCorrect: false },
                { optionKey: "ب", text: "مضارع التزامی — ماضی نقلی — مضارع اخباری", isCorrect: true },
                { optionKey: "ج", text: "مضارع اخباری — ماضی نقلی — مضارع اخباری", isCorrect: false },
                { optionKey: "د", text: "ماضی ساده — ماضی نقلی — ماضی استمراری", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 69,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text(
                  "پیش از غیبت شمس، شاگردان به مولانا این‌گونه خبر دادند که شمس کشته شد ولی دلش بر درستی این خبر گواهی نمی‌داد.",
                ),
                questionText: "جملهٔ مجهول را بیابید و آن را به جملهٔ معلوم تبدیل کنید.",
                fields: [
                  { id: "f1", label: "جملهٔ مجهول" },
                  { id: "f2", label: "جملهٔ معلوم" },
                ],
              },
              correctAnswer: { f1: ["شمس کشته شد"], f2: ["شمس را کشتند", "شمس را کشت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          instruction: "نقش دستوری موارد مشخص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 53,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "دریاب که مبتلای عشقم" }],
                    [
                      { kind: "text", value: "آزاد کن از بلای عشق" },
                      { kind: "highlight", value: "م" },
                    ],
                  ],
                },
                questionText: "نقش دستوری ضمیر پیوستهٔ مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مفعول"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "ضمیر پیوستهٔ «م» در «عشقم» طبق کلید، نقش مفعول دارد.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 20,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "آن را امیر" },
                    { kind: "highlight", value: "المؤمنین" },
                    { kind: "text", value: " می‌روا دارد ستدن." },
                  ],
                },
                questionText: "نقش دستوری مورد مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مضاف‌الیه", "مضاف الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          instruction: "برای هر واژهٔ مشخص‌شده، وضعیت آن را در گذر زمان بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 102,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("از آن چرم کآهنگران پشت پای / بپوشند هنگام زخمِ ", "درای", ""),
                questionText: "کدام یک از وضعیت‌های چهارگانه برای این واژه پیش آمده است؟",
              },
              correctAnswer: { accepted: ["وضعیت الف", "از فهرست واژگان حذف شده", "محذوف", "متروک"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 18,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("آن مرد بزرگ و ", "دبیر", " کافی، به نشاط، قلم در نهاد."),
                questionText: "کدام یک از وضعیت‌های چهارگانه برای این واژه پیش آمده است؟",
              },
              correctAnswer: {
                accepted: [
                  "وضعیت ب",
                  "تحول معنایی",
                  "تغییر معنایی",
                  "با از دست دادن معنای پیشین و پذیرفتن معنای جدید به دوران بعد منتقل شده",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          instruction: "با توجه به بیت زیر به سؤال‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 91,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("هلا منکر جان و ", "جانان", " ما / بزن زخم انکار بر جان ما"),
                questionText: "واژهٔ مشخص‌شده چه نقش دستوری دارد؟",
              },
              correctAnswer: { accepted: ["متمم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 91,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text("هلا منکر جان و جانان ما / بزن زخم انکار بر جان ما"),
                questionText: "نوع «و» را مشخص کنید.",
              },
              correctAnswer: { accepted: ["واو عطف", "عطف"] },
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
      sectionScore: 5,
      questions: [
        {
          number: 19,
          pageRef: 30,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چو لشکر گِرد بر گِردش گرفتند", "چو کشتی، بادپا در رود افکند!"),
                questionText: "در بیت بالا «مشبّه» کدام واژه است؟",
              },
              correctAnswer: { accepted: ["بادپا", "اسب"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          instruction: "با توجه به شعر زیر به سؤال‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 140,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "از شعله به خاطر روشنایی‌اش / سپاسگزاری کن / امّا چراغدان را هم / که همیشه صبورانه، در سایه می‌ایستد از یاد مبر",
                ),
                questionText: "«شعله» نماد چیست؟",
              },
              correctAnswer: {
                accepted: ["سود و برخورداری‌ها", "داشته‌های در معرض دید ما", "سود و برخورداری ها"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 140,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text(
                  "از شعله به خاطر روشنایی‌اش / سپاسگزاری کن / امّا چراغدان را هم / که همیشه صبورانه، در سایه می‌ایستد از یاد مبر",
                ),
                questionText: "یک کنایه پیدا کنید.",
              },
              correctAnswer: { accepted: ["در سایه ایستادن", "در سایه می‌ایستد"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          pageRef: 102,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("همی برخروشید و فریاد خواند", "جهان را سراسر، سوی داد خواند"),
                questionText: "«مجاز» به‌کاررفته در بیت بالا چه مفهومی دارد؟",
              },
              correctAnswer: { accepted: ["مردم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 32,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: text(
                  "الف: به یاری خواهم از آن سوی دریا / سوارانی زره‌پوش و (مهیّا / کمان‌گیر)\nب: دمار از جان این غولان کشم سخت / بسوزم خانمان‌هاشان به (شمشیر / بخت)",
                ),
                questionText:
                  "برای ترسیم قالب چهارپاره، کدام ترکیب واژه‌ها برای قافیهٔ هر بیت، به‌ترتیب صحیح است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "الف: مهیّا — ب: شمشیر", isCorrect: false },
                { optionKey: "ب", text: "الف: مهیّا — ب: بخت", isCorrect: false },
                { optionKey: "ج", text: "الف: کمان‌گیر — ب: شمشیر", isCorrect: true },
                { optionKey: "د", text: "الف: کمان‌گیر — ب: بخت", isCorrect: false },
              ],
              sourceNote:
                "برگه دو انتخاب داخل کمانک دارد؛ راهنمای نمره‌گذاری تصریح می‌کند فقط با نوشتن هر دو پاسخ «کمان‌گیر / شمشیر» نمره تعلق می‌گیرد، بنابراین برای حفظ منطق همه‌یا‌هیچ به یک MCQ ترکیبی تبدیل شد.",
            },
          ],
        },
        {
          number: 23,
          pageRef: 57,
          instruction: "آرایهٔ درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "خاک سوگند برداد به عزّت و ذوالجلالی حق که مرا مبر. (تشخیص / سجع)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشخیص", isCorrect: true },
                { text: "سجع", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 24,
          pageRef: 71,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines(
                  "رو، سر بنه به بالین، تنها مرا رها کن",
                  "ترکِ منِ خرابِ شبگردِ مبتلا کن",
                ),
                questionText: "در مصراع دوم، تکرار مصوّت «ـِ» باعث خلق کدام آرایهٔ ادبی شده است؟",
              },
              correctAnswer: { accepted: ["واج‌آرایی", "واج آرایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 77,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text(
                  "خاله‌ام با ذوق لطیفی که داشت، مرا نخستین بار از طریق سعدی با شعر شاهکار آشنا نمود.",
                ),
                questionText: "آرایهٔ «حس‌آمیزی» را در عبارت بالا مشخص کنید.",
              },
              correctAnswer: { accepted: ["ذوق لطیف"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 12,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("شغال نگون‌بخت را شیر خورد", "بماند آنچه روباه از آن سیر خورد"),
                questionText: "واژه‌های قافیه سبب خلق چه آرایهٔ ادبی شده‌اند؟",
              },
              correctAnswer: { accepted: ["جناس ناهمسان", "جناس"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 101,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چو ضحّاک بر تخت شد شهریار", "بر او سالیان انجمن شد هزار"),
                questionText: "کدام‌یک از زمینه‌های حماسه در بیت بالا وجود دارد؟",
              },
              correctAnswer: { accepted: ["خرق عادت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          instruction:
            "برای هر مورد ستون «الف» یک آرایهٔ مناسب از ستون «ب» انتخاب کنید. (یک مورد در ستون «ب» اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "چون او را در بند بلا بسته دید، زهابِ دیدگان بگشاد و بر رخسار، جوی‌ها براند.",
                  },
                  {
                    id: "ب",
                    text: "به رقصی که بی‌پا و سر می‌کنند / چنین نغمهٔ عشق سر می‌کنند",
                  },
                ],
                columnB: [
                  { id: "1", text: "متناقض‌نما" },
                  { id: "2", text: "تضمین" },
                  { id: "3", text: "استعاره" },
                ],
              },
              correctAnswer: { الف: "3", ب: "1" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "مورد ۲ «تضمین» اضافی است. pageRefها: الف ۱۲۰، ب ۹۱.",
            },
          ],
        },
        {
          number: 29,
          instruction: "درستی یا نادرستی موارد زیر را با توجه به آثار و مؤلف آن‌ها مشخص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 63,
              content: {
                type: "true-false",
                statementText: "غزلیات شمس: جلال‌الدّین محمّد مولوی",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 91,
              content: {
                type: "true-false",
                statementText: "همصدا با حلق اسماعیل: حمید سبزواری",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "true-false",
              score: 0.25,
              pageRef: 49,
              content: {
                type: "true-false",
                statementText: "زندان موصل (خاطرات اسیر آزادشده، کامور بخشایش): اصغر رباط جزی",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 99,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "غلامحسین یوسفی در کتاب ................. به تحلیل داستان «کاوهٔ دادخواه» پرداخته است.",
              },
              correctAnswer: { accepted: ["چشمه روشن", "چشمهٔ روشن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 95,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه، مصراع دوم بیت مقابل است؟",
                stimulus: text("خواستم از رنجش دوری بگویم، یادم آمد ..."),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "بی تو حتّی مهربانی حالتی از کینه دارد", isCorrect: false },
                { optionKey: "ب", text: "عشق با آزار خویشاوندی دیرینه دارد", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 32,
          pageRef: 95,
          parts: [
            {
              type: "word-reorder-dnd",
              score: 0.25,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["انکار", "جغد", "اما", "می‌خواند", "به", "ویرانه", "بر", "تو"],
              },
              correctAnswer: {
                orderedTokens: ["جغد", "بر", "ویرانه", "می‌خواند", "به", "انکار", "تو", "اما"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 115,
          parts: [
            {
              type: "verse-completion",
              score: 0.5,
              content: {
                type: "verse-completion",
                firstMesra: "مرا اوج عزّت در افلاک توست",
              },
              correctAnswer: { accepted: ["به چشمان من کیمیا خاک توست"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای نمره‌گذاری: فقط به نوشتن مصراع کامل نمره تعلق می‌گیرد.",
            },
          ],
        },
      ],
    },
    {
      title: "قلمرو فکری",
      orderIndex: 3,
      sectionScore: 8,
      questions: [
        {
          number: 34,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "الف) به فرزندان و یاران گفت چنگیز / که گر فرزند باید، باید این‌سان!" }],
                    [{ kind: "text", value: "ب) دلاوری‌ها و جان‌فشانی‌های سربازان فداکار و شما افسران عزیز علیرغم محرومیّت‌های فراوان تا به آنجا بود که دشمن را هم به تحسین و اعجاب واداشت." }],
                  ],
                },
                questionText: "مفهوم مشترک دو عبارت بالا را بنویسید.",
              },
              correctAnswer: { accepted: ["تحسین دلاوری‌ها و شجاعت‌ها توسط دشمن", "تحسین شجاعت و دلاوری توسط دشمن"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "pageRefها در کلید: ۳۰ و ۴۲.",
            },
          ],
        },
        {
          number: 35,
          pageRef: 154,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("در پرواز هدفی والاتر از پریدن به این سو و آن سو وجود دارد."),
                questionText: "نویسنده در عبارت بالا به چه چیزی اعتقاد دارد؟",
              },
              correctAnswer: { accepted: ["یافتن تکامل", "رشد و پیشرفت", "تکامل و رشد", "رشد، پیشرفت و تکامل"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          pageRef: 10,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: poemLines("کمال عقل آن باشد در این راه", "که گوید نیستم از هیچ آگاه"),
                questionText: "بیت بالا با کدام گزینه تناسب معنایی دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "کمال‌گرایی عقل", isCorrect: false },
                { optionKey: "ب", text: "تقابل همیشگی عقل و عشق", isCorrect: false },
                { optionKey: "ج", text: "اظهار عجز از شناخت خدا", isCorrect: true },
                { optionKey: "د", text: "دشوار بودن راه عشق", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 37,
          instruction: "مفاهیم مرتبط با عبارت‌های ستون «الف» را از ستون «ب» انتخاب کنید. (یک مورد در ستون «ب» اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "چه در کار و چه در کار آزمودن / نباید جز به خود محتاج بودن" },
                  { id: "ب", text: "تو ز قرآن ای پسر، ظاهر مبین / دیو، آدم را نبیند غیر طین" },
                  { id: "ج", text: "زاغ با خود اندیشید که بر اثرِ ایشان بروم و معلوم گردانم فرجام کار ایشان چه باشد که من از مثلِ این واقعه ایمن نتوانم بود." },
                  { id: "د", text: "هزاران سال ما برای پیدا کردن کلّهٔ ماهی‌ها و نان مانده در میان قایق‌ها و صخره‌ها تلاش کرده‌ایم و حالا دلیل دیگری برای زندگی داریم: آموختن، یافتن و آزاد بودن." },
                ],
                columnB: [
                  { id: "1", text: "چه باشی چو روبه به وامانده سیر" },
                  { id: "2", text: "آینده‌نگری" },
                  { id: "3", text: "شما در گِل منگرید، در دل نگرید" },
                  { id: "4", text: "اتّکا به نفس" },
                  { id: "5", text: "فروتنی" },
                ],
              },
              correctAnswer: { الف: "4", ب: "3", ج: "2", د: "1" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "مورد ۵ «فروتنی» اضافی است. pageRefها: الف ۱۹، ب ۶۲، ج ۱۱۹، د ۱۵۲.",
            },
          ],
        },
        {
          number: 38,
          pageRef: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text("و آنچه دارم از اندک‌مایه حُطامِ دنیا حلال است و کفایت است و به هیچ زیادت حاجتمند نیستم."),
                questionText: "عبارت بالا به کدام فضیلت اخلاقی قاضی بُست اشاره دارد؟",
              },
              correctAnswer: { accepted: ["قناعت", "قانع بودن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },

        {
          number: 39,
          pageRef: 70,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "ما به فَلَک بوده‌ایم، یار مَلَک بوده‌ایم",
                  "باز " + "هم" + "ان جا رویم، جمله که آن شهر ماست",
                ),
                questionText: "بیت بالا بیانگر چه دیدگاهی است؟",
              },
              correctAnswer: { accepted: ["بازگشت به اصل خویش", "بازگشت به اصل خود"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },

        {
          number: 40,
          pageRef: 102,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines(
                  "خروشید کای پایمردان دیو / بریده دل از ترسِ گیهان خدیو",
                  "همه سوی دوزخ نهادید روی / سپردید دل‌ها به گفتار اوی",
                ),
                questionText:
                  "کاوه معتقد است که پایمردان دیو از .......... دل بریدند و به .......... دل سپردند.",
                fields: [
                  { id: "f1", label: "از چه کسی دل بریدند؟" },
                  { id: "f2", label: "به چه کسی دل سپردند؟" },
                ],
              },
              correctAnswer: { f1: ["خدا"], f2: ["ضحاک"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 41,
          pageRef: 124,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("در مقابل این قدّ دراز، چشمم سو نداشت."),
                questionText: "مفهوم این عبارت چیست؟",
              },
              correctAnswer: { accepted: ["چشمانم ضعیف بود", "چشم‌هایم ضعیف بود", "چشمم ضعیف بود"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },

        {
          number: 42,
          pageRef: 52,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("در چاره‌گری زبان کشیدند"),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["برای چاره‌جویی به گفتگو پرداختند", "برای چاره جویی به گفتگو پرداختند"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای رساندن مفهوم «برای چاره‌جویی» و ۰٫۲۵ برای «به گفت‌وگو پرداختند» یا تعبیر هم‌معنا.",
              verified: true,
            },
          ],
        },
        {
          number: 43,
          pageRef: 91,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("دف عشق با دست خون می‌زنند"),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["عاشقانه به استقبال شهادت رفتن", "عاشقانه به استقبال شهادت می‌روند"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای مفهوم «عاشقانه» و ۰٫۲۵ برای «به استقبال شهادت رفتن» یا مفهوم مشابه.",
              verified: true,
            },
          ],
        },
        {
          number: 44,
          pageRef: 87,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("فرض است فرمان بردن از حکم جلودار"),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["اطاعت از فرمان رهبر واجب است", "فرمان‌بردن از دستور رهبر واجب است"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای «اطاعت/فرمان‌بردن» و ۰٫۲۵ برای «از فرمان رهبر واجب است» یا تعبیر هم‌معنا.",
              verified: true,
            },
          ],
        },
        {
          number: 45,
          pageRef: 13,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("کسی نیک بیند به هر دو سرای", "که نیکی رساند به خلق خدای"),
                questionText: "معنی و مفهوم بیت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["کسی در هر دو جهان رستگار می‌گردد که به مردم کمک کند"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای «در هر دو جهان رستگار می‌شود» و ۰٫۲۵ برای «به مردم نیکی/کمک می‌کند» یا مفهوم مشابه.",
              verified: true,
            },
          ],
        },
        {
          number: 46,
          pageRef: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("من هیچ مُستحق نشناسم در بُست که زر به ایشان توان داد."),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["من هیچ نیازمند در بُست نمی‌شناسم که بتوانم طلا را به او بدهم", "من هیچ محتاج در بست نمی‌شناسم که بتوانم طلا را به او بدهم"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای «هیچ نیازمند/محتاجی در بُست نمی‌شناسم» و ۰٫۲۵ برای «که بتوانم زر/طلا را به او بدهم».",
              verified: true,
            },
          ],
        },
        {
          number: 47,
          pageRef: 59,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("اگر ما را آفتی رسد از این شخص، از این موضع تواند بود."),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["اگر از این شخص به ما آسیبی برسد، از این جایگاه خواهد بود"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "۰٫۲۵ برای «اگر از این شخص به ما آسیبی برسد» و ۰٫۲۵ برای «از این جایگاه/موضع خواهد بود».",
              verified: true,
            },
          ],
        },
        {
          number: 48,
          pageRef: 120,
          parts: [
            {
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("در وقت فراغ موافقت اولی‌تر، و اِلّا طاعنان مجالِ وقیعت یابند."),
                questionText: "معنی و مفهوم عبارت را به نثر روان بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "در وقت آسایش همراهی بهتر است وگرنه سرزنش‌کنندگان فرصت بدگویی پیدا می‌کنند",
                  "در زمان آسایش همراهی بهتر است وگرنه سرزنشگران فرصت بدگویی می‌یابند",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "طبق کلید چهار جزء ۰٫۲۵ دارد: «در وقت آسایش»، «همراهی بهتر است»، «سرزنش‌کنندگان»، «فرصت بدگویی پیدا می‌کنند».",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
