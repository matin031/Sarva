import { blank1, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی خرداد ۱۴۰۲ (انسانی و معارف)
 * Source: Khordad-1402-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 *
 * متن سؤال‌ها، بارم‌ها و پاسخ‌ها از روی خودِ برگه و راهنمای تصحیح رونویسی شده‌اند.
 * برای سؤال‌های دارای پاسخ بسته، رندر تعاملی متناسب با ماهیت سؤال انتخاب شده و
 * پاسخ‌های تشریحی نیز فقط بر پایهٔ پاسخ‌های رسمی راهنمای تصحیح ثبت شده‌اند.
 */
export const olumFonoon3Khordad1402: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۲",
  examSession: "olum-fonoon-1402-khordad",
  totalScore: 20,
  sourcePdf: "Khordad-1402-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          pageRef: 17,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام عبارت معرّف «فرّخی یزدی» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "وی توانست با اشعار ساده و عامیانه‌اش که طنزآمیز هم بود، در میان مردم جایگاه مناسبی پیدا کند.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "تحت تأثیر شاعران گذشته، به‌ویژه مسعود سعد و سعدی بود و آشنایی با سعدی طبع وی را شکوفا ساخت.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 2,
          layoutPattern: "multi-subquestion",
          instruction: "شاعران زیر، سردبیری کدام‌یک از «روزنامه‌های دورهٔ بیداری» را بر عهده داشتند؟",
          parts: [
            {
              label: "الف",
              pageRef: 16,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "ادیب‌الممالک فراهانی",
              },
              correctAnswer: { accepted: ["روزنامهٔ مجلس", "روزنامه مجلس", "مجلس"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 18,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "میرزادهٔ عشقی",
              },
              correctAnswer: { accepted: ["روزنامهٔ قرن بیستم", "روزنامه قرن بیستم", "قرن بیستم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 69,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از گزینه‌های زیر دربارهٔ «نیما یوشیج» و تحوّل‌آفرینی او در شعر معاصر، درست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح برای این سؤال به صفحات ۶۹، ۷۱ و ۷۲ کتاب ارجاع داده است.",
              options: [
                {
                  optionKey: "الف",
                  text: "تصرّف نیما در ماهیّت شعر نو و ارائهٔ ماهیّتی تازه از آن، به تغییر در قالب و ویژگی‌های سخن شاعران قدیم انجامید.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "نیما در ۱۳۱۶ منظومهٔ «افسانه» را به‌عنوان بیانیهٔ شعر نو منتشر کرد که نزدیکی به ادبیّات نمایشی، از ویژگی‌های آن است.",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "نیما در مسیر بنیان‌گذاری شعر نو تلاش کرد تا واژگان نو به کار برد و از به‌کارگیری واژگان روزمرّه و عامیانه پرهیز کند.",
                  isCorrect: false,
                },
                {
                  optionKey: "د",
                  text: "جریان نوگرایی نیما با سرایش «ققنوس» تثبیت شد. او در این منظومه، تغییراتی در اصول و ضوابط شعر سنّتی ایجاد کرد.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 72,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "سرودهٔ زیر از کدام اثر «مهدی اخوان ثالث» برگزیده شده است؟",
                stimulus: text(
                  "«سلامت را نمی‌خواهند پاسخ گفت / سرها در گریبان است / کسی سر برنیارد کرد پاسخ گفتن و دیدار یاران را / نگه جز پیش پا را دید نتواند / که ره تاریک و لغزان است.»",
                ),
              },
              correctAnswer: { accepted: ["زمستان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          layoutPattern: "multi-item-true-false",
          instruction: "درستی یا نادرستی گزاره‌های زیر را تعیین کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 82,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "کتاب «دو کبوتر، دو پنجره، یک پرواز» از آثار داستانی «سید مهدی شجاعی» در زمینهٔ ادبیّات عاشورایی است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 69,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "دورهٔ اوّل ادبیّات معاصر (از ۱۳۰۴ تا شهریور ۱۳۲۰) را دورهٔ درخشش نیما و جدال بر سر شعر کهنه و نو می‌دانند.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 6,
          pageRef: 73,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1("داستان‌نویسی نوین با افرادی مانند ", "q6", "، نویسندهٔ «سگ ولگرد»، گسترش یافت."),
              },
              correctAnswer: { accepted: ["صادق هدایت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },

    // --------------------------------------------------------- سبک‌شناسی
    {
      title: "سبک‌شناسی",
      orderIndex: 2,
      sectionScore: 2,
      questions: [
        {
          number: 7,
          pageRef: 42,
          instruction:
            "کدام بیت مصداق توضیح زیر است؟ «گروهی از شاعران دورهٔ بیداری با آگاهی از سنّت‌های ادبی، به زبان پرصلابت گذشته وفادار ماندند.»",
          parts: [
            {
              type: "mcq-select-line-in-poem",
              score: 0.25,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "برکش ز سر این سپیدمعجر / بنشین به یکی کبوداورند",
                  "چون نگریم ز درد و چون ننالم / دزد را چو محرم به خانه کردم؟",
                ],
              },
              correctAnswer: { correctLineIndex: 0 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "صورت سؤال: «گروهی از شاعران دورهٔ بیداری با آگاهی از سنّت‌های ادبی، به زبان پرصلابت گذشته وفادار ماندند.» بیت مصداق را انتخاب کنید.",
            },
          ],
        },
        {
          number: 8,
          pageRef: 44,
          instruction: "مفهوم کدام بیت با مفهوم «آزادی» در دورهٔ بیداری، متفاوت است؟",
          parts: [
            {
              type: "mcq-select-line-in-poem",
              score: 0.25,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "در محیط طوفان‌زا ماهرانه در جنگ است / ناخدای استبداد با خدای آزادی",
                  "اسیری هیچ آزادی نجوید / چو دل در بند گیسوی تو دارد",
                ],
              },
              correctAnswer: { correctLineIndex: 1 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "صورت سؤال می‌پرسد مفهوم کدام بیت با مفهوم «آزادی» در دورهٔ بیداری متفاوت است.",
            },
          ],
        },
        {
          number: 9,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به نوشتهٔ زیر، دو مورد از ویژگی‌های «زبانی» نثر دورهٔ معاصر تا انقلاب را بنویسید: «به قدری عصبانی شده بودم که چشمم جایی را نمی‌دید. از این بهانه‌تراشی‌هایش داشتم شاخ درمی‌آوردم. بی‌اختیار در خانه را باز کرده و این جوان نمک‌نشناس را مانند موشی که از خمرهٔ روغن بیرون کشیده باشند، بیرون انداختم.» — جمال‌زاده",
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو ویژگی زبانی موجود در همین متن را بنویسید.",
                fields: [
                  { id: "f1", label: "ویژگی زبانی ۱" },
                  { id: "f2", label: "ویژگی زبانی ۲" },
                ],
              },
              correctAnswer: {
                f1: [
                  "کاهش واژه‌های عربی نسبت به گذشته",
                  "کاهش واژه های عربی نسبت به گذشته",
                  "کاربرد واژه‌ها، کنایات و اصطلاحات عامیانه",
                  "کاربرد واژه ها، کنایات و اصطلاحات عامیانه",
                ],
                f2: [
                  "کاهش واژه‌های عربی نسبت به گذشته",
                  "کاهش واژه های عربی نسبت به گذشته",
                  "کاربرد واژه‌ها، کنایات و اصطلاحات عامیانه",
                  "کاربرد واژه ها، کنایات و اصطلاحات عامیانه",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو پاسخ متفاوت لازم است. راهنمای تصحیح فقط این دو ویژگی را برای متن سؤال پذیرفته است: ۱) کاهش واژه‌های عربی نسبت به گذشته؛ ۲) کاربرد واژه‌ها، کنایات و اصطلاحات عامیانه. ویژگی دیگری از نثر این دوره برای این سؤال پذیرفته نشود.",
              verified: true,
              sourceNote: "راهنمای تصحیح: ویژگی نخست صفحهٔ ۹۷ و ویژگی دوم صفحهٔ ۹۸؛ سایر ویژگی‌های زبانی این دوره در متن سؤال وجود ندارد.",
            },
          ],
        },
        {
          number: 10,
          layoutPattern: "multi-item-true-false",
          instruction: "درستی یا نادرستی عبارت‌های زیر را تعیین کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 97,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "یکی از ویژگی‌های فکری ادبیّات معاصر تا انقلاب اسلامی، فراوانی مدح، ذم و هجو در شعر است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 43,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "عدم تسلّط کافی شاعران دورهٔ بیداری بر ادبیّات کهن، موجب کم‌توجّهی در کاربرد جمله‌ها و ترکیب‌های زبانی بود.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 99,
          layoutPattern: "multi-subquestion",
          instruction:
            "در بررسی سبک‌شناسی شعر «سراپا اگر زرد و پژمرده‌ایم / ولی دل به پاییز نسپرده‌ایم / چو گلدان خالی لب پنجره / پر از خاطرات ترک‌خورده‌ایم» (قیصر امین‌پور)، هر گزاره مربوط به کدام‌یک از سطوح «زبانی، ادبی یا فکری» ادبیّات انقلاب اسلامی است؟",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "«خاطرات ترک‌خورده»، یک ترکیب بدیع و بی‌سابقه است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: true },
                { text: "ادبی", isCorrect: false },
                { text: "فکری", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شاعر در این سروده از واژه‌های نمادین مانند «پاییز» بهره برده است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: false },
                { text: "ادبی", isCorrect: true },
                { text: "فکری", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },

    // --------------------------------------------------------- موسیقی شعر
    {
      title: "موسیقی شعر",
      orderIndex: 3,
      sectionScore: 6,
      questions: [
        {
          number: 12,
          pageRef: 22,
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "w1",
                        value: "الف) گر این چنین به خاک وطن شب سحر کنم / خاک وطن چو رفت، چه خاکی به سر کنم؟",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "w2",
                        value: "ب) هوای خود چو نهادم رضای او چو گزیدم / جهان و هر چه در او جز به کام خویش ندیدم",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "w3",
                        value: "ج) فصل گل می‌گذرد هم‌نفسان بهر خدا / بنشینید به باغی و مرا یاد کنید",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { w1: "ناهمسان", w2: "همسان دولختی", w3: "همسان تک‌لختی" },
                weights: { w1: 0.25, w2: 0.25, w3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح برای این سؤال به صفحات ۲۲ تا ۲۸ درس دوم ارجاع داده است.",
            },
          ],
        },
        {
          number: 13,
          pageRef: 22,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "وزن کدام مصراع در مقابل آن درست نوشته شده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: گزینهٔ الف؛ ارجاع به درس دوم، صفحات ۲۲ تا ۲۸.",
              options: [
                {
                  optionKey: "الف",
                  text: "دریاب که مبتلای عشقم — مفعولُ مفاعلن فعولن",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "لختی بخند خندهٔ گل زیباست — مفعولُ فاعلاتُ مفاعیلُ فاعلن",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 14,
          layoutPattern: "multi-subquestion",
          instruction: "تقطیع هجایی نمونه‌های زیر، با کدام اختیار شاعری مطابقت دارد؟",
          parts: [
            {
              label: "الف",
              pageRef: 52,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "گیسوی او (ـ U U ـ)",
              },
              correctAnswer: {
                accepted: [
                  "کوتاه تلفّظ کردن مصوّت بلند",
                  "کوتاه تلفظ کردن مصوت بلند",
                  "کوتاه تلفظ کردن مصوّت بلند",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 49,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "سرافرازی (U ـ ـ ـ)",
              },
              correctAnswer: { accepted: ["حذف همزه", "امکان حذف همزه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به بیت «گر برگ گل سرخ کنی پیرهنش را / از نازکی آزار رساند بدنش را» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "مصراع اوّل بیت را تقطیع هجایی کنید.",
              },
              correctAnswer: {
                accepted: [
                  "گر بر گِ / گُ لِ سر خ کُ / نی پی ر هَ / نش را",
                  "گر بر گِ | گُ لِ سر خ کُ | نی پی ر هَ | نش را",
                  "گَر بَر گِ / گُ لِ سَر خ کُ / نی پی ر هَ / نِش را",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "پاسخ را با تقطیع رسمی راهنمای تصحیح مقایسه کن: چهار پایهٔ آواییِ مصراع اول مطابق جدول کلید، با مرزهای «گر بر گِ | گُلِ سرخ کُ | نی پی رَهَ | نش را». تفاوت جزئی در فاصله‌گذاری یا اعراب را نادیده بگیر، اما توالی هجاها و مرز پایه‌ها باید همان باشد.",
              verified: true,
              sourceNote: "راهنمای تصحیح این قسمت را به‌صورت جدول پایه‌های آوایی در درس پنجم آورده است.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "ارکان معادل بیت را به گونه‌ای بنویسید که «همسان» باشد.",
              },
              correctAnswer: {
                accepted: [
                  "مستفعلُ مستفعلُ مستفعلُ مستف (فع لن)",
                  "مستفعل مستفعل مستفعل مستف (فع لن)",
                  "مستفعل مستفعل مستفعل فع لن",
                  "مستفعلُ مستفعلُ مستفعلُ فع لن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "در هر یک از مصراع‌ها، یک اختیار شاعری زبانی مشخص کنید.",
                fields: [
                  { id: "m1", label: "مصراع اوّل" },
                  { id: "m2", label: "مصراع دوم" },
                ],
              },
              correctAnswer: {
                m1: [
                  "بلند تلفّظ کردن مصوّت کوتاه در هجای پنجم",
                  "بلند تلفظ کردن مصوت کوتاه در هجای پنجم",
                  "بلند تلفظ کردن مصوت کوتاه",
                ],
                m2: [
                  "کوتاه تلفّظ کردن مصوّت بلند در هجای چهارم",
                  "کوتاه تلفظ کردن مصوت بلند در هجای چهارم",
                  "حذف همزه در هجای پنجم",
                  "کوتاه تلفظ کردن مصوت بلند یا حذف همزه",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          pageRef: 52,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مصوّت بلند «ی» در کدام مصراع به کوتاه تبدیل نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "یارب قبول کن به بزرگی و فضل خویش", isCorrect: true },
                { optionKey: "ب", text: "ای گنبد گیتی ای دماوند", isCorrect: false },
                { optionKey: "ج", text: "پیش از تو آب معنی دریا شدن نداشت", isCorrect: false },
                { optionKey: "د", text: "آن نور روی موسی عمرانم آرزوست", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 17,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به بیت «مرا بسود و فرو ریخت هرچه دندان بود / نبود دندان لابل چراغ تابان بود» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 93,
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                questionText: "وزن بیت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "مفاعلن فعلاتن مفاعلن فع لن",
                  "مفاعلن فعلاتن مفاعلن فعلن",
                  "مفاعلن فعلاتن مفاعلن فع‌لن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 85,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در رکن دوم مصراع دوم، کدام اختیار وزنی به کار رفته است؟",
              },
              correctAnswer: { accepted: ["ابدال"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 110,
          layoutPattern: "multi-subquestion",
          instruction:
            "با مقایسهٔ دو شعر زیر به پرسش‌ها پاسخ دهید: ۱) «میان مشرق و مغرب ندای محتضری‌ست / که گاه می‌گوید / من از ستارهٔ دنباله‌دار می‌ترسم.» ۲) «چون درختی در صمیم سرد و بی‌ابر زمستانی / هر چه برگم بود و بارم بود / ... ریخته‌است.»",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "وزن کدام شعر «ناهمسان» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "شعر ۱", isCorrect: true },
                { optionKey: "۲", text: "شعر ۲", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "مصراع اوّل شعر دوم چند رکن دارد؟",
              },
              correctAnswer: { accepted: ["پنج رکن", "پنج", "۵", "5"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "وزن‌واژهٔ معادل پایه‌های آوایی مصراع «که گاه می‌گوید» را بنویسید.",
              },
              correctAnswer: { accepted: ["مفاعلن فع لن", "مفاعلن فعلن", "مفاعلن فع‌لن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          pageRef: 107,
          instruction: "نام وزن متناسب با هر بیت را از ستون مقابل بیابید و بنویسید. [نام یک وزن اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "محمّد کافرینش هست خاکش / هزاران آفرین بر جان پاکش" },
                  { id: "ب", text: "چنان سایه گسترد بر عالمی / که زالی نیندیشد از رستمی" },
                ],
                columnB: [
                  { id: "۱", text: "رمل مثمّن محذوف" },
                  { id: "۲", text: "هزج مسدّس محذوف" },
                  { id: "۳", text: "متقارب مثمّن محذوف" },
                ],
              },
              correctAnswer: { الف: "۲", ب: "۳" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },

    // --------------------------------------------------------- زیبایی‌شناسی
    {
      title: "زیبایی‌شناسی",
      orderIndex: 4,
      sectionScore: 6,
      questions: [
        {
          number: 20,
          pageRef: 113,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "همهٔ آرایه‌های ادبی کدام گزینه در بیت زیر دیده می‌شود؟",
                stimulus: poemLines("نرگس همی رکوع کند در میان باغ", "زیرا که کرد فاخته بر سرو مؤذنی"),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "حسن تعلیل، تناسب، تلمیح، استعاره", isCorrect: true },
                { optionKey: "ب", text: "تشخیص، اسلوب معادله، تلمیح، کنایه", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 21,
          pageRef: 24,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به سرودهٔ «چه زنم چو نای هردم ز نوای شوق او دم / که لسان غیب خوشتر بنوازد این نوا را / همه شب در این امیدم که نسیم صبحگاهی / به پیام آشنایی بنوازد آشنا را» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "چگونه درمی‌یابیم بخشی از این سروده از «حافظ» است؟",
              },
              correctAnswer: {
                accepted: [
                  "از ترکیب لسان غیب که لقب حافظ است",
                  "از ترکیب «لسان غیب» که لقب حافظ است",
                  "لسان غیب لقب حافظ است",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ باید به ترکیب «لسان غیب» و این‌که لقب حافظ است اشاره کند.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این کاربرد باعث پیدایی کدام آرایه شده است؟",
              },
              correctAnswer: { accepted: ["تضمین"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          layoutPattern: "bracket-choice-mcq",
          instruction: "آرایهٔ مناسب هر بیت را از کمانک مقابل آن انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 30,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شب تاریک و بیم موج و گردابی چنین هایل / کجا دانند حال ما سبکباران ساحل‌ها؟ (تلمیح / مراعات نظیر)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: false },
                { text: "مراعات نظیر", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 117,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "به یک کرشمه که در کار آسمان کردی / هنوز می‌پرد از شوق چشم کوکب‌ها (حسن تعلیل / لف و نشر)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حسن تعلیل", isCorrect: true },
                { text: "لف و نشر", isCorrect: false },
              ],
            },
            {
              label: "ج",
              pageRef: 86,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "دست در دامن مولا زد در / که علی بگذر و از ما مگذر (ایهام / اغراق)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ایهام", isCorrect: true },
                { text: "اغراق", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 23,
          layoutPattern: "multi-subquestion",
          instruction:
            "در کدام بخش‌های سرودهٔ زیر آرایهٔ «پارادوکس» دیده می‌شود؟ «ما / در عصر احتمال به‌سر می‌بریم / در عصر شک و شاید / در عصر پیش‌بینی وضع هوا / از هر طرف که باد بیاید / در عصر قاطعیت تردید / عصر جدید / عصری که هیچ اصلی / جز اصل احتمال، یقینی نیست.»",
          parts: [
            {
              label: "الف",
              pageRef: 61,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "نخستین بخش دارای پارادوکس را بنویسید." },
              correctAnswer: { accepted: ["قاطعیت تردید"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 62,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "بخش دیگر دارای پارادوکس را بنویسید." },
              correctAnswer: {
                accepted: ["جز اصل احتمال، یقینی نیست", "جز اصل احتمال یقینی نیست"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 90,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "با توجّه به آرایهٔ «ایهام»، مصراع دوم بیت «چون جام شفق موج زند خون به دل من / با این همه دور از تو مرا چهرهٔ زردی است» را به دو شکل معنی کنید.",
                fields: [
                  { id: "m1", label: "معنی ۱" },
                  { id: "m2", label: "معنی ۲" },
                ],
              },
              correctAnswer: {
                m1: [
                  "به دلیل دوری از تو چهره‌ام زرد و بیمار است",
                  "به دلیل دوری از تو چهره ام زرد و بیمار است",
                ],
                m2: [
                  "دور باد از تو! چهرهٔ من زرد و بیمار است",
                  "دور باد از تو، چهرهٔ من زرد و بیمار است",
                  "دور باد از تو چهره من زرد و بیمار است",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو معنای رسمی باید جداگانه تشخیص داده شوند: ۱) به سبب دوری از تو، چهرهٔ من زرد و بیمار است؛ ۲) «دور باد از تو!» یعنی این زردی و بیماری از تو دور باشد. تفاوت طبیعی در جمله‌بندی پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 91,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «گر هزار است بلبل این باغ / همه را نغمه و ترانه یکی است» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "واژهٔ «هزار» علاوه بر عدد، چه معنایی را در ذهن خواننده تداعی می‌کند؟",
              },
              correctAnswer: { accepted: ["بلبل"] },
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
                questionText: "توهّم در معنی دیگر این واژه، کدام آرایهٔ ادبی را پدید آورده است؟",
              },
              correctAnswer: { accepted: ["ایهام تناسب"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 59,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به بیت «از عفو و خشم تو دو نمونه است روز و شب / وز مهر و کین تو دو نمونه است شهد و سم» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "لف‌های مصراع دوم را بنویسید.",
              },
              correctAnswer: { accepted: ["مهر و کین", "مهر، کین", "مهر کین"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نوع لف و نشر در مصراع اوّل، مرتّب است یا مشوّش؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مرتّب", isCorrect: true },
                { text: "مشوّش", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "اوّلین و سومین جفت‌واژه‌های متضاد را بیابید و بنویسید.",
                fields: [
                  { id: "p1", label: "جفت‌واژهٔ اوّل" },
                  { id: "p3", label: "جفت‌واژهٔ سوم" },
                ],
              },
              correctAnswer: {
                p1: ["عفو و خشم", "عفو، خشم", "عفو خشم"],
                p3: ["مهر و کین", "مهر، کین", "مهر کین"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 36,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "«تلمیح» بیت زیر را در یک سطر توضیح دهید.",
                stimulus: poemLines("چون خضر دید آن لب جانبخش دلفریب", "گفتا که آب چشمهٔ حیوان دهان توست"),
              },
              correctAnswer: {
                accepted: [
                  "اشاره به داستان خضر نبی که به چشمهٔ آب حیات دست یافت و به جاودانگی رسید",
                  "داستان خضر نبی و چشمهٔ آب حیات و جاودانگی",
                  "اشاره به داستان خضر و آب حیات",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "پاسخ باید به داستان خضر نبی، دستیابی او به چشمهٔ آب حیات و جاودانگی اشاره کند؛ پاسخ‌های نزدیک به همین مفهوم پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 115,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "با ذکر دو دلیل، وجود آرایهٔ «اسلوب معادله» را در بیت «چشم عاشق نتوان دوخت که معشوق نبیند / پای بلبل نتوان بست که بر گل نسراید» توضیح دهید.",
                fields: [
                  { id: "r1", label: "دلیل ۱" },
                  { id: "r2", label: "دلیل ۲" },
                ],
              },
              correctAnswer: {
                r1: [
                  "مصراع دوم، مصداق یا نمونه‌ای برای مصراع اول است",
                  "مصراع دوم مصداق یا نمونه‌ای برای مصراع اول است",
                  "رابطهٔ دو مصراع بر پایهٔ شباهت است",
                  "هر دو مصراع استقلال نحوی و معنایی دارند",
                ],
                r2: [
                  "مصراع دوم، مصداق یا نمونه‌ای برای مصراع اول است",
                  "مصراع دوم مصداق یا نمونه‌ای برای مصراع اول است",
                  "رابطهٔ دو مصراع بر پایهٔ شباهت است",
                  "هر دو مصراع استقلال نحوی و معنایی دارند",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو دلیل متفاوت لازم است. فقط سه دلیل رسمی راهنما مبناست: ۱) مصراع دوم مصداق/نمونهٔ مصراع اول است؛ ۲) رابطهٔ دو مصراع بر پایهٔ شباهت است؛ ۳) هر دو مصراع استقلال نحوی و معنایی دارند.",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 89,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "در بیت زیر، دلیل وجود آرایهٔ «اغراق» را توضیح دهید.",
                stimulus: poemLines("دلم گرفته از این روزها دلم تنگ است", "میان ما و رسیدن هزار فرسنگ است"),
              },
              correctAnswer: {
                accepted: [
                  "شاعر در توصیف فاصله بزرگ‌نمایی کرده است؛ هزار فرسنگ برای فاصله بسیار دور از ذهن است",
                  "بزرگ‌نمایی فاصله با تعبیر هزار فرسنگ",
                  "هزار فرسنگ برای فاصله بسیار دور از ذهن است",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "مطابق راهنمای تصحیح، باید به بزرگ‌نمایی فاصله و دور از ذهن بودنِ «هزار فرسنگ» برای بیان فاصله اشاره شود.",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 116,
          instruction:
            "شاعر در کدام بیت، برای آفرینش «حس‌آمیزی» از آمیختگی حواسّ ظاهری با امور ذهنی و انتزاعی بهره برده است؟",
          parts: [
            {
              type: "mcq-select-line-in-poem",
              score: 0.25,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "از این شعر ترِ شیرین ز شاهنشه عجب دارم / که سرتاپای حافظ را چرا در زر نمی‌گیرد؟",
                  "نیست پروا تلخ‌کامان را ز تلخی‌های عشق / آب دریا در مذاق ماهی دریا خوش است",
                ],
              },
              correctAnswer: { correctLineIndex: 1 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "صورت سؤال می‌پرسد شاعر در کدام بیت برای آفرینش حس‌آمیزی، از آمیختگی حواس ظاهری با امور ذهنی و انتزاعی بهره برده است.",
            },
          ],
        },
      ],
    },

    // ------------------------------------------------ نقد و تحلیل نظم و نثر
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 4,
      questions: [
        {
          number: 31,
          pageRef: 17,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "همهٔ بیت‌های زیر به جز کدام گزینه دربردارندهٔ مفاهیم شعر دورهٔ بیداری است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "جنگ ننگ است در شریعت من / جز پی پاس دین و حفظ وطن",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "غلغلی انداختی در شهر تهران ای قلم / خوش حمایت می‌کنی از شرع قرآن ای قلم",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "داد معشوقه به عاشق پیغام / که کند مادر تو با من جنگ",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "آن زمان که بنهادم سر به پای آزادی / دست خود ز جان شستم از برای آزادی",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 32,
          pageRef: 37,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به سرودهٔ «در آینه دوباره نمایان شد / با ابر گیسوانش در باد / باز آن سرود سرخ اناالحق / ورد زبان اوست» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب شعر را بنویسید.",
              },
              correctAnswer: { accepted: ["شعر نو", "شعر نو (نیمایی)", "نیمایی", "شعر نیمایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک تشبیه فشردهٔ اضافی (اضافهٔ تشبیهی) بیابید.",
              },
              correctAnswer: { accepted: ["ابر گیسوان", "سرود اناالحق", "سرود انالحق"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "واژهٔ «اناالحق» نشانگر کدام آرایهٔ بدیع معنوی است؟",
              },
              correctAnswer: { accepted: ["تلمیح"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          layoutPattern: "multi-subquestion",
          instruction:
            "در نوشتهٔ «فردای آن روز به خاطرم آمد که دیروز یک دست از بهترین لباس‌های نودوز خود را با کلیّهٔ متفرّعات به انضمام مایحتوی، به دست چلاق‌شدهٔ خودم از خانه بیرون انداخته‌ام، ولی چون تیری که از شست رفته بازنمی‌گردد، یک بار دیگر به کلام بلندپایهٔ از ماست که بر ماست، ایمان آوردم و پشت دستم را داغ کردم که تا من باشم دیگر پیرامون ترفیع رتبه نگردم» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "مفهوم کنایی «پشت دست داغ کردن» چیست؟",
              },
              correctAnswer: {
                accepted: ["عبرت گرفتن و اظهار پشیمانی", "عبرت گرفتن", "اظهار پشیمانی", "پشیمان شدن و عبرت گرفتن"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "مطابق راهنمای تصحیح، پاسخ باید مفهوم «عبرت گرفتن و اظهار پشیمانی» را برساند.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "بیت «سخن گفته دگر بازنیاید به دهن / اوّل اندیشه کند مرد که عاقل باشد» با کدام ضرب‌المثل این نوشته، مفهوم مشترکی دارد؟",
              },
              correctAnswer: {
                accepted: ["تیری که از شست رفته بازنمی‌گردد", "تیری که از شست رفته باز نمی‌گردد"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 106,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به سرودهٔ زیر، به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب شعر را بنویسید.",
                stimulus: poemLines("هر که گدای در مشکوی توست / پادشاست", "شه که به همسایگی کوی توست / چون گداست"),
              },
              correctAnswer: { accepted: ["مستزاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "چرا این نوع شعر را الهام‌بخش «نیما یوشیج» در آفرینش شعر نو دانسته‌اند؟",
              },
              correctAnswer: {
                accepted: [
                  "به دلیل کوتاه و بلند بودن مصراع‌های این نوع شعر",
                  "کوتاه و بلند بودن مصراع‌های این نوع شعر",
                  "به دلیل کوتاه و بلند بودن مصراع‌ها",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ رسمی: به دلیل کوتاه و بلند بودن مصراع‌های این نوع شعر.",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «گویند: روی سرخ تو سعدی، که زرد کرد؟ / اکسیر عشق بر مسم افتاد و زر شدم» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 94,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام واژه آرایهٔ «ایهام تناسب» را پدید آورده است؟",
              },
              correctAnswer: { accepted: ["روی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "اگر هجاهای بیت را به شکل «سه‌تا، چهارتا، چهارتا، سه‌تا» جدا کنیم، وزن پایه‌های آوایی دوم و چهارم را بنویسید.",
                fields: [
                  { id: "p2", label: "پایهٔ آوایی دوم" },
                  { id: "p4", label: "پایهٔ آوایی چهارم" },
                ],
              },
              correctAnswer: {
                p2: ["فاعلاتُ", "فاعلات"],
                p4: ["فاعلن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به سرودهٔ موسوی گرمارودی «در فکر آن گودالم / که خون تو را مکیده‌است / هیچ گودالی چنین رفیع ندیده بودم / در حضیض هم می‌توان عزیز بود» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "آرایهٔ پارادوکس را نشان دهید.",
              },
              correctAnswer: { accepted: ["گودال رفیع"] },
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
                questionText: "این سروده به کدام واقعه در تاریخ اسلام اشاره دارد؟",
              },
              correctAnswer: { accepted: ["واقعهٔ عاشورا", "واقعه عاشورا", "عاشورا"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 76,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "شاعر این سروده، در کدام‌یک از سه شاخهٔ ادبیات معاصر در عصر انقلاب اسلامی قرار می‌گیرد؟",
              },
              correctAnswer: { accepted: ["شاخهٔ نخست", "شاخه نخست", "نخست"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
