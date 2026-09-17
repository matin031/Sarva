import { blank1, highlightThenBlank, poemLines, text } from "@/lib/exam/seed-data/helpers";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";

/**
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  نمونهٔ جامع — امتحان نهاییِ «علوم و فنون ادبی»                        │
 * │  هر ۱۸ نوع سؤال، یک‌بار، در پنج بخشِ همیشگیِ این درس.                   │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * قاعده‌ها و روالِ ساخت، همان است که در `nemoone-farsi.ts` نوشته شده؛
 * اینجا فقط چیزهایی که *مخصوصِ علوم و فنون* است تکرار می‌شود:
 *
 *   • بخش‌ها: تاریخ ادبیات / سبک‌شناسی / موسیقی شعر / زیبایی‌شناسی /
 *     نقد و تحلیل نظم و نثر. `orderIndex` ترتیبِ نمایش است.
 *   • `subject` نامِ کتاب است: olum-fonoon1 (دهم)، olum-fonoon2 (یازدهم)،
 *     olum-fonoon3 (دوازدهم). صفحهٔ /exam با همین پیشوند درس را تشخیص
 *     می‌دهد، پس اگر پیشوند را عوض کنی آزمون زیر «سایر درس‌ها» می‌افتد.
 *   • «نام آرایه / نام قلمرو / نوع وزن» پاسخِ بسته دارند: به‌جای کادرِ
 *     نوشتن، multi-part-inline-tagging یا mcq بگذار تا تصحیح خودکار شود.
 *   • ⚠️ نشانه‌های هجایی («– U – –») را داخلِ گزینه یا متنِ فارسی ننویس:
 *     در محیطِ راست‌به‌چپ وارونه دیده می‌شوند و «U U – –» می‌شود
 *     «– – U U». به‌جایش «بلند، کوتاه، ...» بنویس.
 *   • سؤالی که در راهنمای تصحیح «حذف» شده، اصلاً نوشته نمی‌شود؛ نمره‌اش
 *     را به همان سؤالی بده که راهنما گفته (بارمِ آن جزء را بالا ببر).
 */
export const nemooneOlumFonoon: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "نمونهٔ الگو — علوم و فنون ادبی۳ دوازدهم",
  examSession: "nemoone-olum-fonoon",
  totalScore: 20,
  sourcePdf: "nemoone.pdf",
  sections: [
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 3,
      questions: [
        {
          number: 1,
          pageRef: 17,
          parts: [
            {
              /* جای خالی با دو گزینهٔ الف/ب — همان «کمانکِ» برگه. */
              type: "mcq-inline",
              score: 1,
              content: {
                type: "mcq-inline",
                questionText: "«فرخی یزدی» تحت تأثیر شاعران گذشته، به‌ویژه ......... بود.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "انوری و حافظ", isCorrect: false },
                { optionKey: "ب", text: "مسعود سعد و سعدی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 2,
          pageRef: 18,
          parts: [
            {
              /* پاسخِ یک‌نامی: کادرِ کوتاه، نه یک سطرِ کامل. */
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "روزنامهٔ «قرن بیستم» توسط چه کسی منتشر می‌شد؟",
              },
              correctAnswer: { accepted: ["میرزادهٔ عشقی", "میرزاده عشقی", "عشقی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          instruction: "ویژگی‌های ستون اول، مربوط به کدام شاعر است؟ [یک نام اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "در طنز، هَجو و هَزل چیره‌دست بود و زبانی ساده و عامیانه داشت." },
                  { id: "ب", text: "بیان روایی و داستانی و حماسی‌بودن زبان از ویژگی‌های سبکی اوست." },
                  { id: "ج", text: "در غزل، از حافظ تأثیر فراوان پذیرفته است." },
                ],
                columnB: [
                  { id: "۱", text: "مهدی اخوان ثالث" },
                  { id: "۲", text: "ایرج میرزا" },
                  { id: "۳", text: "صبای کاشانی" },
                  { id: "۴", text: "شهریار" },
                ],
              },
              correctAnswer: { الف: "۲", ب: "۱", ج: "۴" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "سبک‌شناسی",
      orderIndex: 2,
      sectionScore: 3,
      questions: [
        {
          number: 4,
          layoutPattern: "list-of-parallel-blanks", // فقط برچسبِ چیدمان؛ روی نمایش اثر ندارد
          parts: [
            {
              type: "fill-blank-term",
              score: 1,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "کاربرد واژه‌هایی مثل «بادافره و خلیدن» بیانگر توجه به واژگان ",
                  "b1",
                  " در شعر شاعران دورهٔ بیداری است.",
                ),
              },
              correctAnswer: { accepted: ["کهن", "قدیمی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          layoutPattern: "multi-item-true-false",
          instruction: "«درستی» یا «نادرستی» عبارت زیر را مشخص کنید.",
          parts: [
            {
              type: "true-false",
              score: 1,
              content: {
                type: "true-false",
                statementText:
                  "شعر دورهٔ بیداری به دلیل موقعیت اجتماعی و انقلابی، برای عامهٔ مردم قابل فهم است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 6,
          instruction: "هر توضیح به کدام «قلمرو» مربوط است؟",
          parts: [
            {
              /* الگوی پرکاربردِ علوم و فنون: چند عبارت، و جلوی هرکدام یک
                 فهرستِ بازشو با همان چند گزینه. هر جای‌خالی وزنِ خودش را
                 دارد، پس نمرهٔ جزئی ممکن است. */
              type: "multi-part-inline-tagging",
              score: 1,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["زبانی", "ادبی", "فکری"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "q1",
                        value: "الف) واحد شعر در دورهٔ معاصر بیشتر بند است نه بیت.",
                        options: ["زبانی", "ادبی", "فکری"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "q2",
                        value: "ب) در نثر دوران مشروطه حقوق مدنی زنان مورد توجه بوده است.",
                        options: ["زبانی", "ادبی", "فکری"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { q1: "ادبی", q2: "فکری" },
                weights: { q1: 0.5, q2: 0.5 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "موسیقی شعر",
      orderIndex: 3,
      sectionScore: 6,
      questions: [
        {
          number: 7,
          instruction: "کدام‌یک از بیت‌های زیر، در بحر «رجز مربع سالم» سروده شده است؟",
          parts: [
            {
              type: "mcq-select-line-in-poem",
              score: 1,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "الا تا نخواهی بلا بر حسود / که آن بخت برگشته خود در بلاست",
                  "به سوزی ده کلامم را روایی / کز آن گرمی کند آتش گدایی",
                  "دریای هستی دم به دم / در چرخ و تاب و پیچ و خم",
                ],
              },
              correctAnswer: { correctLineIndex: 2 },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          parts: [
            {
              type: "count-answer",
              score: 1,
              content: {
                type: "count-answer",
                questionText: "شاعر در مصراع اول از چند «اختیار وزنی» استفاده کرده است؟",
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
          number: 9,
          parts: [
            {
              /* دو جای خالیِ یک جمله. برچسبِ خانه‌ها نباید پاسخ را لو بدهد:
                 «جای خالی اول» بنویس و نه «رکن اول». */
              type: "two-answer-text",
              score: 1,
              content: {
                type: "two-answer-text",
                questionText:
                  "«اختیار زبانی امکان حذف همزه» در کدام دو رکن مصراع دوم به کار رفته است؟",
                stimulus: poemLines(
                  "نسیم صبح را گفتم که با او جانبی داری",
                  "کز آن جانب که او باشد، صبا عنبرفشان آید",
                ),
                fields: [
                  { id: "r1", label: "جای خالی اول" },
                  { id: "r2", label: "جای خالی دوم" },
                ],
              },
              correctAnswer: {
                r1: ["رکن اول", "اول", "زان"],
                r2: ["رکن چهارم", "چهارم", "رکن آخر", "آخر", "نا"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          instruction: "ارکان را به ترتیبِ درست بچینید تا وزنِ بیت ساخته شود.",
          parts: [
            {
              type: "word-reorder-dnd",
              score: 1,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["مفاعلن", "فعلاتن", "فعلن", "فعلاتن"],
              },
              correctAnswer: {
                orderedTokens: ["فعلاتن", "مفاعلن", "فعلاتن", "فعلن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          instruction: "شعر حفظی — مصراع دوم را بنویسید.",
          parts: [
            {
              type: "verse-completion",
              score: 1,
              content: {
                type: "verse-completion",
                firstMesra: "آب زنید راه را هین که نگار می‌رسد",
              },
              correctAnswer: { accepted: ["مژده دهید باغ را بوی بهار می‌رسد"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          instruction: "نمودارِ وابستگیِ ارکانِ مصراع را کامل کنید.",
          parts: [
            {
              /* نمودار، در علوم و فنون کم‌کاربردتر است ولی برای نشان‌دادنِ
                 «چه چیزی وابستهٔ چه چیزی است» (پایه/لخت/رکن) به کار می‌آید. */
              type: "diagram-builder",
              score: 1,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: poemLines("لبخند تو خلاصهٔ خوبی‌هاست"),
                nodes: [
                  { id: "n1", label: "خلاصه" },
                  { id: "n2", label: "خوبی‌ها" },
                  { id: "n3", label: "لبخند" },
                ],
              },
              correctAnswer: {
                edges: [
                  { childId: "n2", parentId: "n1", label: "مضاف‌الیه" },
                  { childId: "n3", parentId: "n1", label: "نهاد" },
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "زیبایی‌شناسی",
      orderIndex: 4,
      sectionScore: 5,
      questions: [
        {
          number: 13,
          parts: [
            {
              /* وقتی پاسخ «دو نامِ آرایه» است و ترتیبشان مهم نیست،
                 چندگزینه‌ایِ دوانتخابی بهتر از دو کادرِ متنی است. */
              type: "mcq-multi-select",
              score: 1,
              content: {
                type: "mcq-multi-select",
                questionText: "واژگان مشخص‌شده سبب خلق کدام دو آرایهٔ بدیع معنوی شده‌اند؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "عشرتی دارم به یاد روی آن گل در " },
                      { kind: "highlight", value: "قفس" },
                      { kind: "text", value: " / عشق افکنده است با " },
                      { kind: "highlight", value: "یوسف" },
                      { kind: "text", value: " به یک زندان مرا" },
                    ],
                  ],
                },
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "تلمیح", isCorrect: true },
                { optionKey: "ب", text: "مراعات نظیر (تناسب)", isCorrect: true },
                { optionKey: "ج", text: "تضاد", isCorrect: false },
                { optionKey: "د", text: "حسن تعلیل", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 14,
          parts: [
            {
              /* «معنیِ واژهٔ مشخص‌شده» — واژه سرِ جایش می‌ماند و کادرش
                 زیرِ عبارت می‌آید. */
              type: "word-meaning-input",
              score: 1,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "روی خوبت ",
                  "آیتی",
                  "w1",
                  " از لطف بر ما کشف کرد.",
                ),
              },
              correctAnswer: { w1: ["نشانه", "نشان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          parts: [
            {
              /* «کدام گزینه آرایهٔ نادرست دارد؟ درستش را بنویس» — نیمی از
                 نمره برای انتخاب، نیمی برای اصلاح. */
              type: "mcq-plus-correction",
              score: 1,
              content: {
                type: "mcq-plus-correction",
                questionText: "در کدام بیت، آرایهٔ ذکرشده نادرست است؟",
                correctionPrompt: "نام آرایهٔ درست را بنویسید.",
              },
              correctAnswer: { correctionAnswers: ["حسن تعلیل"] },
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "دل و کشورت جمع و معمور باد / ز مُلکت پراکندگی دور باد (لف و نشر)",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "نرگس همی رکوع کند در میان باغ / زیرا که کرد فاخته بر سرو مؤذّنی (اغراق)",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 16,
          instruction: "درستی یا نادرستیِ آرایهٔ روبه‌روی هر بیت را مشخص کنید و نادرست‌ها را اصلاح کنید.",
          parts: [
            {
              type: "paired-list-error-correction",
              score: 1,
              content: {
                type: "paired-list-error-correction",
                items: [
                  { id: "p1", pairText: "خمیده پشت از آن گشتند پیران جهان‌دیده → حسن تعلیل" },
                  { id: "p2", pairText: "دست غریق، یعنی فریاد بی‌صداییم → اسلوب معادله" },
                  { id: "p3", pairText: "عشق چون آید برد هوش دل فرزانه را → اسلوب معادله" },
                ],
              },
              correctAnswer: {
                p1: { isCorrect: true },
                p2: { isCorrect: false, correctedText: "متناقض‌نما" },
                p3: { isCorrect: true },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          instruction: "در فهرست زیر دو آرایه اشتباه نام‌گذاری شده است؛ درستشان را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 1,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 2,
                items: [
                  { id: "i1", text: "«آغوش سحر» → اضافهٔ استعاری" },
                  { id: "i2", text: "«شکر ایزد که ... گل / ... خار» → حس‌آمیزی" },
                  { id: "i3", text: "«بوی زمستانی که در باغ رخنه کرده است» → تضاد" },
                  { id: "i4", text: "«چیست این سقف بلند سادهٔ بسیار نقش» → متناقض‌نما" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i2", "i3"],
                corrections: { i2: "تضاد", i3: "حس‌آمیزی" },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 3,
      questions: [
        {
          number: 18,
          instruction:
            "متن یک: «...طایر مکاتبات را از آن پر بسته و کلبهٔ مراودات را در بسته...» ▪ متن دو: «تا یک ژاندارم چشمش می‌افتد، رنگش می‌پرد.»",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              /* متنِ بلندِ مشترکِ چند زیرسؤال را در `instruction` بگذار، نه
                 در `stimulus` هر جزء — وگرنه سه بار تکرار می‌شود. */
              label: "الف",
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "یک واژهٔ بیگانه (فرنگی) در متن دوم پیدا کنید.",
              },
              correctAnswer: { accepted: ["ژاندارم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          parts: [
            {
              /* یک غلط در متن، بدون فهرست: دانش‌آموز واژه و شکلِ درستش را
                 می‌نویسد. */
              type: "open-error-correction-in-passage",
              score: 1,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "شعر دورهٔ بیداری، زبانی ساده دارد و شاعرانِ آن بیشتر به قالب‌های قسیده و مثنوی روی آورده‌اند.",
                ),
              },
              correctAnswer: { wrongWord: "قسیده", correctWord: "قصیده" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          parts: [
            {
              /* پاسخِ باز: دو ویژگیِ فکری. تصحیحِ خودکار ندارد — دانش‌آموز
                 پاسخِ درست را می‌بیند و خودش نمره می‌دهد. */
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "دو مورد از ویژگی‌های «فکری» متن بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: ["ایثار و مقاومت در برابر دشمن", "دفاع از وطن و روح حماسی"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "هر دو موردِ درست از این فهرست نمره می‌گیرد: ایثار، مقاومت، روح حماسی، دفاع از وطن، ثبت خاطرات جنگ.",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
