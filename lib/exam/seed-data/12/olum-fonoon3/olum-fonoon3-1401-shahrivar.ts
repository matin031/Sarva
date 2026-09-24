import { blank1, poemLines, text, ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی شهریور ۱۴۰۱ (انسانی و معارف)
 * Source: Shahrivar-1401-FonunAdabi3-[www.konkur.in].pdf — ۴ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 * تاریخ درج‌شده روی برگه: ۱۴۰۱/۰۶/۰۱.
 *
 * متن سؤال‌ها، ابیات، گزینه‌ها، بارم‌ها و پاسخ‌ها از برگهٔ آزمون و راهنمای رسمی تصحیح استخراج شده‌اند.
 * سؤال‌های بسته با exact_match و پاسخ‌های بازِ دارای چند بیان پذیرفتنی با ai_semantic / ai_partial_credit تعریف شده‌اند.
 * برای بخش‌های جدولیِ تقطیع و نشانه‌های هجایی سؤال ۱۶، به‌منظور جلوگیری از تبدیل خطاپذیر جدول به متن، تصحیح manual است.
 *
 * بازبینی نهایی در سه گذر انجام شده است:
 * ۱) متن، ابیات و گزینه‌ها با ۴ صفحهٔ سؤال؛
 * ۲) پاسخ‌ها، بارم‌ها و ارجاع صفحات با ۲ صفحهٔ راهنمای تصحیح؛
 * ۳) شماره‌ها، جمع بارم هر بخش و کل آزمون و نوع رندر هر سؤال.
 */
export const olumFonoon3Shahrivar1401: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی شهریور ۱۴۰۱",
  examSession: "olum-fonoon-1401-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1401-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          layoutPattern: "list-of-parallel-blanks",
          instruction: "در جاهای خالی واژه‌هایی مناسب بنویسید.",
          parts: [
            {
              label: "الف",
              pageRef: 18,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1("مهم‌ترین اثر «میرزاده عشقی» نمایشنامهٔ منظوم «", "q1a", "» است. (ذکر نام اثر)"),
              },
              correctAnswer: { accepted: ["ایده‌آل", "ایده آل", "سه تابلوی مریم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 16,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1("شعر «ای قلم» نمونه‌ای از اشعار انتقادیِ ", "q1b", " است. (ذکر نام نویسنده)"),
              },
              correctAnswer: {
                accepted: ["سید اشرف‌الدین گیلانی", "سید اشرف الدین گیلانی", "نسیم شمال"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 79,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "عبارت زیر چه کسی را معرفی می‌کند؟ «او از نویسندگان مشهور معاصر در حوزهٔ نویسندگی کودکان و نوجوانان است. محورهایی مثل قصه‌نویسی و قصه‌گویی از مهم‌ترین حوزه‌های فعالیت اوست. کتاب «مهاجر کوچک» از آثار او در حوزهٔ قصه‌های کودک و نوجوان است.»",
              },
              correctAnswer: { accepted: ["محمدرضا سرشار", "محمد رضا سرشار", "رضا رهگذر"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 74,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "موضوع کتاب «خسی در میقات» چیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مقاله‌نویسی", isCorrect: false },
                { optionKey: "ب", text: "تک‌نگاری", isCorrect: false },
                { optionKey: "ج", text: "ترجمه", isCorrect: false },
                { optionKey: "د", text: "سفرنامه", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 80,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "کتاب «ملاقات در شب آفتابی» اثر «علی مؤذنی» در کدام یک از حوزه‌های ادبیات جای می‌گیرد؟",
              },
              correctAnswer: {
                accepted: ["دفاع مقدس", "ادبیات دفاع مقدس", "حوزه دفاع مقدس", "حوزهٔ دفاع مقدس"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          pageRef: 73,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "اولین نمایشنامه‌ای که هم‌زمان با کتاب «یکی بود، یکی نبود» اثر «جمال‌زاده» نوشته شده است؛ چه نام دارد؟",
              },
              correctAnswer: { accepted: ["جعفرخان از فرنگ برگشته", "جعفر خان از فرنگ برگشته"] },
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
          number: 6,
          layoutPattern: "multi-item-true-false",
          instruction: "درستی و نادرستی عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 101,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "در نثر دورهٔ انقلاب اسلامی، گرایش به برخی قالب‌ها مانند خاطره، قطعهٔ ادبی و سفرنامه از رواج افتاد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 45,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "در نثر دورهٔ بازگشت و بیداری، عبارت‌های وصفی دور و دراز و لفظ‌پردازی‌های بی‌جا در نامه‌ها و نوشته‌ها، افزایشی آشکار می‌یابد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 97,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "ابهام در شعر معاصر پسندیده است و معنی‌گریزی از ویژگی‌های شعر این دوره است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              pageRef: 102,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "تفکر «اومانیسم» که در آثار قبل از انقلاب وجود داشت، گاهی در برخی از آثار بعد از انقلاب به گونه‌ای کم‌رنگ مشاهده می‌شود.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          pageRef: 43,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "کاربرد واژهٔ «خلید» در بیت «خلید خار درشتی به پای طفلی خُرد / به هم برآمد و از پویه باز ماند و گریست» در کدام سطح از سبک شعر دورهٔ «بیداری» بررسی می‌شود؟",
              },
              correctAnswer: { accepted: ["زبانی", "سطح زبانی"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۴۲ و ۴۳ ارجاع داده است.",
            },
          ],
        },
        {
          number: 8,
          layoutPattern: "multi-subquestion",
          instruction: "هر یک از جمله‌های زیر، مربوط به کدام یک از ویژگی‌های «فکری ـ ادبی» است؟",
          parts: [
            {
              label: "الف",
              pageRef: 98,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در نثر دورهٔ معاصر، سبک‌های متفاوتی در داستان‌نویسی بر اساس «نام نویسنده» وجود دارد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "فکری", isCorrect: false },
                { text: "ادبی", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 100,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تلفیق حماسه و عرفان را در غزل حماسی انقلاب می‌توان دید.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "فکری", isCorrect: true },
                { text: "ادبی", isCorrect: false },
              ],
            },
            {
              label: "ج",
              pageRef: 99,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "شعر دورهٔ انقلاب اسلامی بهره‌گیری کمتری از تمثیل دارد و شاعران به صراحت بیان روی آوردند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "فکری", isCorrect: false },
                { text: "ادبی", isCorrect: true },
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
          number: 9,
          pageRef: 27,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از بیت‌های زیر «دو برش آوایی» دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۲۷ و ۲۸ ارجاع داده است.",
              options: [
                {
                  optionKey: "الف",
                  text: "شفای این دل بیمار جز لقای تو نیست / طبیب جان خرابم کسی ورای تو نیست",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "ای سرو بلند قامت دوست / وه وه که شمایلت چه نیکوست!",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 55,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "در بیت «ز دو دیده خون فشانم ز غمت شب جدایی / چه کنم که هست این‌ها گل باغ آشنایی» کدام یک از انواع «تغییر کمیت مصوت‌ها» دیده نمی‌شود؟",
              },
              correctAnswer: {
                accepted: ["کوتاه تلفظ کردن مصوت بلند", "کوتاه تلفظ کردن مصوّت بلند", "کوتاه شدن مصوت بلند"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 22,
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["همسان دولختی", "همسان تک‌لختی", "ناهمسان"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "w1",
                        value: "الف) نشود فاش کسی آنچه میان من و توست / تا اشارات نظر نامه‌رسان من و توست",
                        options: ["همسان دولختی", "همسان تک‌لختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "w2",
                        value: "ب) ما سرخوشان مست دل از دست داده‌ایم / همراز عشق و هم‌نفس جام باده‌ایم",
                        options: ["همسان دولختی", "همسان تک‌لختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "w3",
                        value: "ج) ای صبح شب‌نشینان جانم به طاقت آمد / از بس که دیر ماندی چون شام روزه‌داران",
                        options: ["همسان دولختی", "همسان تک‌لختی", "ناهمسان"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { w1: "همسان تک‌لختی", w2: "ناهمسان", w3: "همسان دولختی" },
                weights: { w1: 0.25, w2: 0.25, w3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "«وزن‌واژهٔ» هر یک از مصراع‌های زیر را بنویسید.",
                fields: [
                  { id: "a", label: "الف) نسیم صبح را گفتم که با او جانبی داری" },
                  { id: "b", label: "ب) با من بگو تا کیستی، مهری بگو، ماهی بگو" },
                ],
              },
              correctAnswer: {
                a: ["مفاعیلن"],
                b: ["مستفعلن"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح برای الف به صفحهٔ ۱۰۴ و برای ب به صفحهٔ ۱۰۸ ارجاع داده است.",
            },
          ],
        },
        {
          number: 13,
          pageRef: 85,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "در رکن آخر مصراع «چو بشنوی سخن اهل دل، مگو که خطاست» کدام اختیار «وزنی» به کار رفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "هجای کشیده در پایان مصراع تبدیل به هجای بلند می‌شود",
                  "تبدیل هجای کشیده پایان مصراع به هجای بلند",
                  "هجای کشیده در پایان مصراع بلند می‌شود",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 107,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "نام «بحر» کدام یک از بیت‌های زیر با بقیه متفاوت است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۱۰۷ و ۱۰۸ ارجاع داده است.",
              options: [
                {
                  optionKey: "الف",
                  text: "هر که چیزی دوست دارد جان و دل بر وی گمارد / هر که محرابش تو باشی، سر ز خلوت برنیارد",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "غمش در نهان‌خانهٔ دل نشیند / به نازی که لیلی به محمل نشیند",
                  isCorrect: true,
                },
                {
                  optionKey: "ج",
                  text: "عمر گویندم که ضایع می‌کنی با خوب‌رویان / وان که منظوری ندارد، عمر ضایع می‌گذارد!",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 109,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "پایه‌های آوایی مصراع آخر شعر «هست شب یک شب دم‌کرده و خاک / رنگ رخ باخته است / باد، نوباوهٔ ابر از بر کوه / سوی من تاخته است» را بنویسید.",
              },
              correctAnswer: {
                accepted: ["سوی من تا | خته است", "سویِ من تا | خته است", "سوی من تا / خته است"],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید رسمی پایه‌ها را به صورت «سویِ من تا | خ تِ است» نمایش داده است.",
            },
          ],
        },
        {
          number: 16,
          layoutPattern: "multi-subquestion",
          instruction: "با توجه به بیت «تو با خدای خود انداز کار و دل خوش دار / که رحم اگر نکند مدّعی، خدا بکند» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                questionText: "بیت را تقطیع هجایی کنید.",
              },
              correctAnswer: { accepted: ["پاسخ مطابق جدول تقطیع هجایی راهنمای رسمی تصحیح"] },
              gradingMode: "manual",
              verified: true,
              sourceNote:
                "راهنمای رسمی پاسخ را برای هر دو مصراع به صورت جدول تقطیع هجایی ارائه کرده است؛ برای حفظ دقت، این قسمت manual است.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                questionText: "نشانه‌های هجایی آن را بگذارید.",
              },
              correctAnswer: { accepted: ["پاسخ مطابق جدول نشانه‌های هجایی راهنمای رسمی تصحیح"] },
              gradingMode: "manual",
              verified: true,
              sourceNote:
                "نشانه‌های هجایی در کلید رسمی به صورت جدول درج شده‌اند؛ برای جلوگیری از تبدیل خطاپذیر جدول به رشتهٔ متنی، این قسمت manual است.",
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "وزن این بیت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "مفاعلن فعلاتن مفاعلن فعلن",
                  "مفاعلن فعلاتن مفاعلن فع لن",
                  "مفاعلن فعلاتن مفاعلن فَعِلن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              pageRef: 87,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "یک اختیار «وزنی» این بیت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "ابدال",
                  "کاربرد یک هجای بلند به جای دو هجای کوتاه در رکن پایانی",
                  "تبدیل هجای کشیده پایان مصراع به یک هجای بلند",
                  "تبدیل هجای کشیده پایان مصراع به هجای بلند",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote:
                "کلید رسمی دو پاسخ پذیرفتنی آورده است: ابدال در رکن پایانی و تبدیل هجای کشیدهٔ پایان مصراع به هجای بلند؛ ذکر یک مورد کافی است.",
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
          number: 17,
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1.25,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "یک روز که خسرو زنگ قرآن در شهناز شوری به پا کرده بود، مدیر مدرسه آواز او را شنید.",
                  },
                  {
                    id: "ب",
                    text: "سپهبد پرستنده را گفت گرم / سخن‌های شیرین به آوای نرم",
                  },
                  {
                    id: "ج",
                    text: "حافظ از جور تو، حاشا که بگرداند روی / «من از آن روز که در بند توأم، آزادم»",
                  },
                  {
                    id: "د",
                    text: "فرو رفت و بررفت روز نبرد / به ماهی نم خون و بر ماه گرد",
                  },
                  {
                    id: "هـ",
                    text: "از اسب پیاده شو، بر نطع زمین رخ نه / زیر پی پیلش بین شهمات شده نعمان",
                  },
                ],
                columnB: [
                  { id: "۱", text: "مراعات نظیر" },
                  { id: "۲", text: "لف و نشر" },
                  { id: "۳", text: "ایهام تناسب" },
                  { id: "۴", text: "اسلوب معادله" },
                  { id: "۵", text: "تضمین" },
                  { id: "۶", text: "حس‌آمیزی" },
                ],
              },
              correctAnswer: {
                الف: "۳",
                ب: "۶",
                ج: "۵",
                د: "۲",
                هـ: "۱",
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای تصحیح: الف ایهام تناسب، ب حس‌آمیزی، ج تضمین، د لف و نشر، هـ مراعات نظیر؛ «اسلوب معادله» مورد اضافی است.",
            },
          ],
        },
        {
          number: 18,
          pageRef: 36,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "یکی از تلمیحات بیت «گواه رهرو آن باشد که سردش یابی از دوزخ / نشان عاشق آن باشد که خشکش بینی از دریا» را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "گلستان شدن آتش بر حضرت ابراهیم",
                  "داستان گلستان شدن آتش بر حضرت ابراهیم",
                  "حضرت ابراهیم و گلستان شدن آتش",
                  "عبور حضرت موسی از رود نیل",
                  "حضرت موسی و عبور از رود نیل",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید رسمی تصریح کرده است ذکر یکی از دو تلمیح کافی است.",
            },
          ],
        },
        {
          number: 19,
          pageRef: 91,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "چگونه به وجود آرایهٔ «ایهام تناسب» در واژهٔ «هزار» در بیت «گر هزار است بلبل این باغ / همه را نغمه و ترانه یکی است» پی می‌بریم؟",
              },
              correctAnswer: {
                accepted: [
                  "هزار در معنی عدد هزار است و در معنی دیگر با بلبل، باغ، نغمه و ترانه تناسب دارد",
                  "واژه هزار یک معنی عدد هزار دارد و معنی دیگر آن با بلبل و باغ و نغمه و ترانه تناسب دارد",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "با توجه به دو بیت داده‌شده، یک تفاوت «متناقض‌نما» با «تضاد» را ذکر کنید: الف) «ما با توایم و با تو نه‌ایم؛ اینت بوالعجب / در حلقه‌ایم با تو و چون حلقه بر دریم» ب) «اینکه گاهی می‌زدم بر آب و آتش خویش را / روشنی در کار مردم بود مقصودم چو شمع».",
              },
              correctAnswer: {
                accepted: [
                  "تضاد آوردن دو امر متضاد است بی آنکه متناقض هم باشند اما متناقض‌نما تضاد در یک امر است نه دو امر",
                  "در تضاد دو امر متضاد می‌آید اما در متناقض‌نما تناقض در یک امر است",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۵۹ و ۶۱ ارجاع داده است.",
            },
          ],
        },
        {
          number: 21,
          layoutPattern: "bracket-choice-mcq",
          instruction: "برای هر یک از بیت‌ها و عبارت‌های زیر، یکی از آرایه‌های داخل کمانک را انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 113,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از دست کریم تو حیا کرد",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ایهام", isCorrect: false },
                { text: "حسن تعلیل", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 117,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "سپهر مردم دون را کند خریداری / بخیل سوی متاعی رود که ارزان است",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اسلوب معادله", isCorrect: true },
                { text: "تلمیح", isCorrect: false },
              ],
            },
            {
              label: "ج",
              pageRef: 116,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "خداوند لباس هراس و گرسنگی را به آن‌ها چشاند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حس‌آمیزی", isCorrect: true },
                { text: "متناقض‌نما", isCorrect: false },
              ],
            },
            {
              label: "د",
              pageRef: 65,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "گر ندیدی قبض و بسط عشق را در یک بساط / گریهٔ مینا نگر، خندیدن ساغر ببین",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اغراق", isCorrect: false },
                { text: "لف و نشر", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 22,
          pageRef: 89,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "مناسب‌ترین آرایه برای «تصویرآفرینی» بیت فردوسی «یکی تازی‌ای برنشسته سیاه / همی خاک نعلش برآمد به ماه» چیست؟",
              },
              correctAnswer: { accepted: ["اغراق"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 23,
          layoutPattern: "multi-subquestion",
          instruction:
            "در شعر «نگران با من ایستاده سحر / صبح می‌خواهد از من / کز مبارک دم او آورم این قوم به جان باخته را / بلکه خبر» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 92,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام واژه آرایهٔ «ایهام» را پدید آورده است؟",
              },
              correctAnswer: { accepted: ["نگران"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 92,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو معنی این واژه را بنویسید.",
                fields: [
                  { id: "m1", label: "معنی ۱" },
                  { id: "m2", label: "معنی ۲" },
                ],
              },
              correctAnswer: {
                m1: ["نگاه کردن", "نگاه‌کننده", "نگرنده", "دلواپسی", "دلواپس", "نگران بودن"],
                m2: ["نگاه کردن", "نگاه‌کننده", "نگرنده", "دلواپسی", "دلواپس", "نگران بودن"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو معنی متفاوت لازم است: یکی مربوط به نگاه/نگریستن و دیگری مربوط به دلواپسی/دلواپس بودن.",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 116,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "برای بیت «فکر شنبه تلخ دارد جمعهٔ اطفال را / عشرت امروز بی اندیشهٔ فردا، خوش است» دو آرایهٔ ادبی بنویسید.",
                fields: [
                  { id: "a1", label: "آرایهٔ ۱" },
                  { id: "a2", label: "آرایهٔ ۲" },
                ],
              },
              correctAnswer: {
                a1: ["تضاد", "اسلوب معادله", "حس‌آمیزی", "حس آمیزی"],
                a2: ["تضاد", "اسلوب معادله", "حس‌آمیزی", "حس آمیزی"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو آرایهٔ متفاوت از پاسخ‌های رسمی پذیرفته شود: تضادِ امروز و فردا، اسلوب معادله، حس‌آمیزیِ «تلخ بودن جمعه».",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 112,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام آرایه در بیت «تویی بهانهٔ آن ابرها که می‌گریند / بیا که صاف شود این هوای بارانی» وجود ندارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "تشخیص", isCorrect: false },
                { optionKey: "ب", text: "حسن تعلیل", isCorrect: false },
                { optionKey: "ج", text: "لف و نشر", isCorrect: true },
                { optionKey: "د", text: "مراعات نظیر", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 26,
          pageRef: 114,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "در شعر «رود می‌نالد / جغد می‌خواند / غم بیاویخته با رنگ غروب / می‌تراود ز لبم قصهٔ سرد / دلم افسرده در این تنگ غروب» آرایه‌ای بیابید که با یکی از انواع «موسیقی معنوی» ایجاد شده باشد.",
              },
              correctAnswer: { accepted: ["حس‌آمیزی", "حس آمیزی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },

    // --------------------------------------------------------- نقد و تحلیل نظم و نثر
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 4,
      questions: [
        {
          number: 27,
          pageRef: 17,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "بیت‌های زیر سرودهٔ «عارف قزوینی» است؛ دو مضمون سرودهٔ او را بنویسید: «فکری ای هم‌وطنان، در ره آزادی خویش ... / خانه‌ای کاو شود از دست اجانب، آباد ... / جامه‌ای کاو نشود غرق به خون بهر وطن ...»",
                fields: [
                  { id: "t1", label: "مضمون ۱" },
                  { id: "t2", label: "مضمون ۲" },
                ],
              },
              correctAnswer: {
                t1: ["وطن‌پرستی", "وطن پرستی", "ستیز با نادانی", "آزادی‌خواهی", "آزادی خواهی", "دردمندی", "عشق به میهن"],
                t2: ["وطن‌پرستی", "وطن پرستی", "ستیز با نادانی", "آزادی‌خواهی", "آزادی خواهی", "دردمندی", "عشق به میهن"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو مضمون متفاوت از پاسخ‌های رسمی یا مفهوم مشابه پذیرفته شود: وطن‌پرستی، ستیز با نادانی، آزادی‌خواهی، دردمندی، عشق به میهن.",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 40,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "سرودهٔ داده‌شده از «دهخدا» شاعر «عصر بیداری» است؛ دو دلیل برای «سادگی و روانی» زبان شعر این دوره بنویسید.",
                stimulus: poemLines(
                  "ای مرغ سحر چو این شب تار / بگذاشت ز سر سیاه‌کاری",
                  "وز نفحهٔ روح‌بخش اسحار / رفت از سر خفتگان خماری",
                  "یزدان به کمال شد پدیدار / و اهریمن زشت‌خو حصاری",
                  "یاد آر ز شمع مرده یاد آر",
                ),
                fields: [
                  { id: "r1", label: "دلیل ۱" },
                  { id: "r2", label: "دلیل ۲" },
                ],
              },
              correctAnswer: {
                r1: ["موقعیت اجتماعی و انقلابی", "توجه به مردم", "استفاده از شعر برای آگاه‌سازی مردم", "استفاده از شعر برای آگاه سازی مردم"],
                r2: ["موقعیت اجتماعی و انقلابی", "توجه به مردم", "استفاده از شعر برای آگاه‌سازی مردم", "استفاده از شعر برای آگاه سازی مردم"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو نکتهٔ متفاوت از مضمون کلید یا پاسخ مشابه پذیرفته شود: موقعیت اجتماعی و انقلابی، توجه به مردم، استفاده از شعر برای آگاه‌سازی آنان.",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به شعر «در شب تیره دیوانه‌ای کاو / دل به رنگی گریزان سپرده / در درهٔ سرد و خلوت نشسته / همچو ساقهٔ گیاهی فسرده / می‌کند داستانی غم‌آور...» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 71,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این سروده، از کدام منظومه به عنوان «بیانیهٔ شعر نو» است؟",
              },
              correctAnswer: { accepted: ["افسانه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "یک ویژگی «ادبی» این شعر را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "تغییر در جایگاه قافیه",
                  "نگاه نو و نگرش عاطفی به واقعیات ملموس",
                  "سیر آزاد تخیل",
                  "نزدیکی به ادبیات نمایشی",
                  "مصراع‌ها کوتاه و بلند هستند",
                  "تعداد نشانه‌های هجایی یک مصراع با مصراع دیگر برابر نیست",
                  "وزن‌واژه‌های یک مصراع با مصراع دیگر برابر نیست",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۷۱ و ۱۰۶ ارجاع داده و ذکر یک مورد را کافی دانسته است.",
            },
          ],
        },
        {
          number: 30,
          layoutPattern: "multi-subquestion",
          instruction: "به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 74,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "اوج نویسندگی «سیمین دانشور» در کدام اثر او نمایان است؟",
              },
              correctAnswer: { accepted: ["سووشون"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 74,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "موضوع این اثر را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "داستان زندگی زری و یوسف و اوضاع اجتماعی مردم فارس در خلال جنگ جهانی دوم",
                  "زندگی زری و یوسف و اوضاع اجتماعی مردم فارس در خلال جنگ جهانی دوم",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به شعر «آن کیست که تقریر کند حال گدا را / در حضرت شاهی؟ / کز غلغل بلبل چه خبر باد صبا را / جز ناله و آهی؟» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 120,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در چه «قالبی» سروده شده است؟",
              },
              correctAnswer: { accepted: ["مستزاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 120,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "این قالب شعری با کدام یک از قالب‌های شعر فارسی شباهت دارد؟",
              },
              correctAnswer: { accepted: ["شعر نو", "شعر نو نیمایی", "نیمایی", "شعر نیمایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          pageRef: 120,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "یک ویژگی «فکری» شعر «آغوش سحر تشنهٔ دیدار شماست / مهتاب، خجل ز نور رخسار شماست / خورشید که در اوج فلک، خانهٔ اوست / همسایهٔ دیوار به دیوار شماست» را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "توصیف عظمت مقام شهیدان",
                  "عظمت مقام شهیدان",
                  "ارزش‌های انقلابی",
                  "ارزشهای انقلابی",
                  "رخدادهای دفاع مقدس",
                  "دفاع مقدس",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح ذکر یک مورد را کافی دانسته است.",
            },
          ],
        },
        {
          number: 33,
          layoutPattern: "multi-subquestion",
          instruction: "قسمت‌های مشخص‌شده در بیت‌های زیر چه آرایه‌ای را پدید آورده‌اند؟",
          parts: [
            {
              label: "الف",
              pageRef: 61,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: `گوش ترحمی کو کز ما نظر نپوشد / دست غریق یعنی ${ul("فریاد بی‌صداییم")}`,
              },
              correctAnswer: { accepted: ["پارادوکس", "متناقض‌نما", "متناقض نما"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 117,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: `ما گرچه مرد ${ul("تلخ‌شنیدن")} نه‌ایم؛ لیک / تلخی که از زبان تو آید، شنیدنی است`,
              },
              correctAnswer: { accepted: ["حس‌آمیزی", "حس آمیزی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
