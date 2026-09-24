import { ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی تابستان/شهریور ۱۴۰۳ (انسانی و معارف)
 * Source: Shahrivar-1403-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۳ صفحه راهنمای تصحیح.
 * تاریخ درج‌شده روی برگه: ۱۴۰۳/۰۵/۱۵.
 *
 * متن سؤال‌ها و گزینه‌ها از خود برگهٔ آزمون و پاسخ‌ها و بارم‌ها از راهنمای رسمی تصحیح
 * استخراج و سؤال‌به‌سؤال تطبیق داده شده‌اند. سؤال‌های تشریحی با چند بیان پذیرفتنی،
 * با ai_semantic مدل شده‌اند و سؤال‌های بسته exact_match هستند.
 */
export const olumFonoon3Shahrivar1403: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی تابستان (شهریور) ۱۴۰۳",
  examSession: "olum-fonoon-1403-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1403-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          instruction: "کدام‌یک از موارد ستون «ب» به جمله‌های ستون «الف» مربوط است؟ [یک مورد اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "در به‌کارگیری تعبیرات عامیانه و آفریدن اشعاری ساده و روان مهارت بسیار داشت. قطعهٔ «قلب مادر» از ترجمه‌های منظوم او محسوب می‌شود.",
                  },
                  {
                    id: "ب",
                    text: "در قصیده به سبک ناصرخسرو، به روانی و لطافت سعدی شعر می‌سراید. اوج سخن وی در قطعات اوست که در آن‌ها به شیوهٔ انوری و سنایی توجه دارد.",
                  },
                ],
                columnB: [
                  { id: "۱", text: "پروین اعتصامی" },
                  { id: "۲", text: "ادیب‌الممالک فراهانی" },
                  { id: "۳", text: "ایرج میرزا" },
                ],
              },
              correctAnswer: { الف: "۳", ب: "۱" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: الف) ایرج میرزا، ب) پروین اعتصامی؛ ادیب‌الممالک فراهانی مورد اضافی است.",
            },
          ],
        },
        {
          number: 2,
          pageRef: 13,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تمام شاعران به جز ......................... از شاعران قصیده‌سرای دورهٔ بازگشت محسوب می‌شوند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "نشاط اصفهانی", isCorrect: true },
                { optionKey: "ب", text: "صبای کاشانی", isCorrect: false },
                { optionKey: "ج", text: "قاآنی شیرازی", isCorrect: false },
                { optionKey: "د", text: "سروش اصفهانی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن موارد زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 18,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "در سال‌های اول مشروطه، بیشتر نویسندگان مطالب خود را در قالب داستان در روزنامه‌ها منتشر می‌کردند.",
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
                statementText: "«شعر نو تغزلی» از گسترده‌ترین جریان‌های دورهٔ سوم شعر معاصر است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          instruction: "هریک از پدیدآورندگان آثار زیر، به ترتیب، خالق کدام آثار هستند؟ «مدیر مدرسه — راه آب‌نامه — آخر شاهنامه — گوشوارهٔ عرش»",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "ترتیب درست آثار دیگرِ پدیدآورندگانِ آثار داده‌شده کدام است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "خسی در میقات — چشم‌هایش — زمستان — دستور زبان عشق",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "ارزیابی شتابزده — تلخ و شیرین — زمستان — صدای سبز",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 80,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "قالب کدام گزینه متفاوت است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ضیافت", isCorrect: false },
                { optionKey: "ب", text: "جای پای خون", isCorrect: false },
                { optionKey: "ج", text: "بدوک", isCorrect: true },
                { optionKey: "د", text: "کشتی پهلوگرفته", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 19,
          instruction: "کدام جمله دربارهٔ نمایشنامه‌نویسی در دورهٔ بیداری نادرست است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "جملهٔ نادرست را مشخص کنید.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "نمایشنامه‌نویسی در ایران نوع ادبی جدیدی به شمار می‌رود.", isCorrect: false },
                { optionKey: "۲", text: "نمایشنامه‌نویسی با این شکل غربی‌اش در ادب کهن سابقه دارد.", isCorrect: true },
                { optionKey: "۳", text: "در دورهٔ ناصرالدین‌شاه رواج یافت.", isCorrect: false },
                { optionKey: "۴", text: "اولین کسی که در ایران به نوشتن نمایشنامهٔ فارسی پرداخت، میرزا آقا تبریزی بود.", isCorrect: false },
              ],
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
          layoutPattern: "bracket-choice-mcq",
          instruction: "با توجه به واژه‌های داخل کمانک پاسخ درست را انتخاب نمایید.",
          parts: [
            {
              label: "الف",
              pageRef: 44,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بنیادی‌ترین تفکر و خواست مشروطه‌خواهان (قانون — آزادی) بود.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "قانون", isCorrect: true },
                { text: "آزادی", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 46,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بسیاری از نثرهای دورهٔ بیداری به‌ویژه نثر داستانی به موضوع (حقوق مدنی زنان — تنفر از خرافات) می‌پردازد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حقوق مدنی زنان", isCorrect: false },
                { text: "تنفر از خرافات", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 8,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن موارد زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 97,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "در شعر دورهٔ معاصر، صور خیال جدید و نو هستند و تکرار تصاویر شاعران دوره‌های قبل نیستند.",
              },
              correctAnswer: { value: true },
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
                statementText: "در دورهٔ بیداری، شاعرانی که مطابق زبان کوچه و بازار شعر می‌سرودند، به سنت‌های ادبی بسیار پایبند بودند.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          instruction: "هریک از عبارت‌های زیر بیانگر کدام‌یک از سطوح «زبانی، ادبی و فکری» دورهٔ معاصر و ادبیات انقلاب اسلامی است؟",
          parts: [
            {
              label: "الف",
              pageRef: 97,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "مخاطب شعر، عامهٔ مردم هستند." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: false },
                { text: "ادبی", isCorrect: false },
                { text: "فکری", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 98,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "توصیف پدیده‌ها و شخصیت‌ها در نثر این دوره عینی، کوتاه، بیرونی و مشخص است.",
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
        {
          number: 10,
          pageRef: 97,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: {
                  tokens: [
                    { kind: "text", value: "معشوق در ادبیات معاصر مانند دوره‌های آغازین شعر فارسی " },
                    { kind: "blank", blankId: "b1" },
                    { kind: "text", value: " است." },
                  ],
                },
              },
              correctAnswer: { accepted: ["زمینی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 47,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "ویژگی‌های فکری سبک دورهٔ بیداری در همهٔ ابیات زیر مشهود است به جز کدام؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "یک مرغ گرفتار در این گلشن ویران / تنها به قفس مانند هزاران همه رفتند",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "جامه‌ای کاو نشود غرقه به خون بهر وطن / بدر آن جامه که ننگ تن و کم از کفن است",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "اینکه گاهی می‌زدم بر آب و آتش خویش را / روشنی در کار مردم بود مقصودم چو شمع",
                  isCorrect: true,
                },
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
          pageRef: 54,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در بیت «بیا به خانهٔ آلاله‌ها سری بزنیم / ز داغ با دل خود حرف دیگری بزنیم» واژه‌ای را مشخص کنید که مصوت بلند «ی» در آن همواره کوتاه تلفظ می‌شود.",
              },
              correctAnswer: { accepted: ["بیا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          instruction: "در ابیات زیر انواع وزن «ناهمسان، همسان تک‌لختی و همسان دولختی» را مشخص کنید.",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["ناهمسان", "همسان تک‌لختی", "همسان دولختی"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "v1",
                        value: "الف) کشتی‌شکستگانیم، ای باد شرطه برخیز / باشد که بازبینیم دیدار آشنا را",
                        options: ["ناهمسان", "همسان تک‌لختی", "همسان دولختی"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v2",
                        value: "ب) در دام فتاده آهویی چند / محکم شده دست و پای در بند",
                        options: ["ناهمسان", "همسان تک‌لختی", "همسان دولختی"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v3",
                        value: "ج) خلد گر به پا خاری آسان برآید / چه سازم به خاری که در دل نشیند؟",
                        options: ["ناهمسان", "همسان تک‌لختی", "همسان دولختی"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { v1: "همسان دولختی", v2: "ناهمسان", v3: "همسان تک‌لختی" },
                weights: { v1: 0.25, v2: 0.25, v3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 24,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "پایه‌های آوایی کدام‌یک از ابیات زیر را می‌توان به دو صورت برش زد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "سرو را مانی ولیکن سرو را رفتار نه / ماه را مانی ولیکن ماه را گفتار نیست",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "بنمای رخ که باغ و گلستانم آرزوست / بگشای لب که قند فراوانم آرزوست",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 53,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام بیت تمام اختیارات زبانی «حذف همزه و تغییر کمیت مصوت‌ها» وجود دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "پس سوی کاری فرستاد آن دگر / تا از این دیگر شود او با خبر",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "گفت ای پسر این نه جای بازی است / بشتاب که جای چاره‌سازی است",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 16,
          pageRef: 27,
          instruction: "کدام‌یک از بیت‌های زیر با بیت «دلا بسوز که سوز تو کارها بکند / نیاز نیم‌شبی دفع صد بلا بکند» هم‌وزن است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "بیت هم‌وزن را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "شفای این دل بیمار جز لقای تو نیست / طبیب جان خرابم کسی ورای تو نیست",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "ملکا ذکر تو گویم که تو پاکی و خدایی / نروم جز به همان ره که توام راه نمایی",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 17,
          pageRef: 27,
          instruction: "با توجه به بیت «دل نیست کبوتر که چو برخاست نشیند / از گوشهٔ بامی که پریدیم، پریدیم» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف-۱",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "پایهٔ آوایی اول و چهارم مصراع اول را بنویسید.",
                fields: [
                  { id: "p1", label: "پایهٔ اول" },
                  { id: "p4", label: "پایهٔ چهارم" },
                ],
              },
              correctAnswer: {
                p1: ["دل نیست ک", "دل نیست کَ", "دل‌نیست‌ک"],
                p4: ["شی ند", "شی‌ند", "شینَد"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "پاسخ‌ها عین صورتِ جدولِ راهنمای تصحیح ثبت شده‌اند.",
            },
            {
              label: "الف-۲",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "نشانه‌های هجایی پایهٔ اول و چهارم را بنویسید.",
                fields: [
                  { id: "s1", label: "نشانه‌های پایهٔ اول" },
                  { id: "s4", label: "نشانه‌های پایهٔ چهارم" },
                ],
              },
              correctAnswer: {
                s1: ["--UU", "- - U U", "– – U U"],
                s4: ["--", "- -", "– –"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "وزن بیت بالا به صورت ناهمسان چیست؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "مفعول مفاعیل مفاعیل فعولن", isCorrect: true },
                { optionKey: "۲", text: "مفعول فعلات مفاعیل فاعلن", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 18,
          instruction: "با توجه به بیت «هر چه داری اگر به عشق دهی / کافرم گر جوی زیان بینی» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 93,
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                questionText: "مصراع اول بیت را تقطیع هجایی کنید و مرز آوایی هر پایه را مشخص کنید.",
              },
              correctAnswer: {
                accepted: [
                  "هر / چه / دا / ری | ا / گر / ب / عشق | د / هی",
                  "هر چه دا ری / ا گر ب عشق / د هی",
                  "هر/چه/دا/ری | ا/گر/ب/عشق | د/هی",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح، مصراع را در سه پایهٔ آوایی با بارم ۰٫۲۵ برای هر پایه نشان داده است.",
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "نوع اختیار وزنی را در رکن اول و سوم مصراع دوم بنویسید.",
                fields: [
                  { id: "r1", label: "رکن اول" },
                  { id: "r3", label: "رکن سوم" },
                ],
              },
              correctAnswer: {
                r1: ["آوردن فاعلاتن به جای فعلاتن", "فاعلاتن به جای فعلاتن"],
                r3: ["ابدال"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          pageRef: 83,
          instruction: "واژه‌های «گه» (U) و «گشت» (-U) در کجای مصراع با کلمهٔ «کش» (-) برابر است؟ این اختیار زبانی است یا وزنی؟",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "این برابری در کجای مصراع رخ می‌دهد؟" },
              correctAnswer: {
                accepted: ["پایان مصراع", "هجای پایانی مصراع", "هجای پایانی نیم‌مصراع در اوزان دوری", "پایان نیم‌مصراع در اوزان دوری"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "این اختیار زبانی است یا وزنی؟" },
              correctAnswer: { accepted: ["وزنی", "اختیار وزنی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 87,
          instruction: "در بیت «کیست که پیغام من به شهر شروان برد / یک سخن از من بدان مرد سخندان برد» کدام رکن دارای اختیار وزنی «قلب» است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "رکن درست را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "رکن اول مصراع اول", isCorrect: false },
                { optionKey: "ب", text: "رکن سوم مصراع اول", isCorrect: true },
                { optionKey: "ج", text: "رکن اول مصراع دوم", isCorrect: false },
                { optionKey: "د", text: "رکن سوم مصراع دوم", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 21,
          pageRef: 108,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "بیت «دریای هستی دم به دم / در چرخ و تاب و پیچ و خم» در چه بحری سروده شده است؟ نام کامل بحر را بنویسید.",
              },
              correctAnswer: { accepted: ["رجز مربع سالم", "بحر رجز مربع سالم", "رجز، مربع سالم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 106,
          instruction: "کدام‌یک از قالب‌های زیر الهام‌بخش نیما برای سرودن «شعر نو» بوده است؟ ویژگی مشترک این دو قالب را بنویسید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "نمونهٔ درست را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "ای مهربان تو ابر برگ در بوته‌های باران / بیداری ستاره در چشم جویباران",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "هر لحظه به شکلی بت عیار برآمد / دل برد و نهان شد",
                  isCorrect: true,
                },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "ویژگی مشترک این قالب با شعر نو چیست؟" },
              correctAnswer: { accepted: ["کوتاهی و بلندی مصراع‌ها", "کوتاه و بلند بودن مصراع‌ها", "کوتاهی و بلندی مصراع"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------- زیبایی‌شناسی
    {
      title: "زیبایی‌شناسی",
      orderIndex: 4,
      sectionScore: 6,
      questions: [
        {
          number: 23,
          pageRef: 35,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: `در بیت «از ${ul("اسب")} ${ul("پیاده")} شو، بر نطع زمین ${ul("رخ")} نه / زیر پی ${ul("پیل")}ش ${ul("شه")} ${ul("مات")} شده نعمان» واژه‌های مشخص‌شده کدام آرایهٔ ادبی را ایجاد نموده‌اند؟`,
              },
              correctAnswer: { accepted: ["مراعات نظیر", "تناسب", "مراعات نظیر (تناسب)"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          instruction: "موضوع «تلمیح» در کدام بیت‌های زیر مشترک است و به چه داستانی اشاره دارد؟",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.25,
              content: {
                type: "two-answer-text",
                questionText: "دو بیت دارای تلمیح مشترک را مشخص کنید.",
                fields: [
                  { id: "v1", label: "بیت اول" },
                  { id: "v2", label: "بیت دوم" },
                ],
              },
              correctAnswer: {
                v1: ["الف", "بیت الف"],
                v2: ["ج", "بیت ج"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "ابیات برگه: الف) «در آینه دوباره نمایان شد... باز آن سرود سرخ اناالحق...»؛ ب) «نه خدا توانمش خواند...»؛ ج) «گفت آن یار کزو گشت سر دار بلند...».",
            },
            {
              label: "ب",
              pageRef: 31,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "تلمیح مشترک به چه داستانی اشاره دارد؟",
              },
              correctAnswer: {
                accepted: ["داستان بر دار کردن حسین بن منصور", "بر دار کردن حسین بن منصور حلاج", "داستان منصور حلاج", "حسین بن منصور حلاج"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 39,
          instruction: "استاد «شفیعی کدکنی» در سرودهٔ «بیداری زمان را با من بخوان به فریاد / ور مرد خواب و خفتی / رو سر بنه به بالین تنها مرا رها کن» از مولانا استفاده کرده است.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "کدام مصراع را از مولانا آورده است؟" },
              correctAnswer: { accepted: ["رو سر بنه به بالین تنها مرا رها کن", "رو سر بنه به بالین، تنها مرا رها کن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "این کاربرد شاعرانه کدام آرایهٔ ادبی را خلق کرده است؟" },
              correctAnswer: { accepted: ["تضمین"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 62,
          instruction: "با توجه به بیت «فرو رفت و بر رفت روز نبرد / به ماهی نمِ خون و بر ماه گرد» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "«لف ۱» و «نشر ۲» را مشخص کنید.",
                fields: [
                  { id: "laf1", label: "لف ۱" },
                  { id: "nashr2", label: "نشر ۲" },
                ],
              },
              correctAnswer: {
                laf1: ["فرو رفت"],
                nashr2: ["بر ماه گرد"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نوع لف و نشر را بنویسید." },
              correctAnswer: { accepted: ["مرتب", "لف و نشر مرتب"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          instruction: "با توجه به بیت‌های زیر پاسخ دهید: ۱) «گوش ترحمی کو کز ما نظر نپوشد / دست غریق یعنی فریاد بی‌صداییم» ۲) «دل و گنجورت جمع و معمور باد / ز مملکت پراکندگی دور باد!»",
          parts: [
            {
              label: "الف",
              pageRef: 61,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "«متناقض‌نما» را در بیت اول مشخص کنید." },
              correctAnswer: { accepted: ["فریاد بی‌صدا", "فریاد بی صداییم", "فریاد بی‌صداییم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 62,
              type: "two-answer-text",
              score: 0.25,
              content: {
                type: "two-answer-text",
                questionText: "در بیت دوم، ارتباط معنایی کدام دو واژه موجب آفرینش آرایهٔ «تضاد» شده است؟",
                fields: [
                  { id: "w1", label: "واژهٔ اول" },
                  { id: "w2", label: "واژهٔ دوم" },
                ],
              },
              correctAnswer: { w1: ["جمع"], w2: ["پراکندگی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 61,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "متناقض‌نما، تضاد در یک امر است یا دو امر؟" },
              correctAnswer: { accepted: ["در یک امر", "یک امر"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          instruction: "آرایهٔ درست را انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 94,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "چندین که برشمردم از ماجرای عشقت / اندوه دل نگفتم الا یک از هزاران" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اغراق", isCorrect: true },
                { text: "ایهام تناسب", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 90,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "اگر سنت اوست نوآوری / نگاهی هم از نو به سنت کنیم" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: false },
                { text: "ایهام", isCorrect: true },
              ],
            },
            {
              label: "ج",
              pageRef: 115,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "سعدی از سرزنش خلق نترسد، هیهات / غرقه در نیل چه اندیشه کند باران را" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اسلوب معادله", isCorrect: true },
                { text: "حسن تعلیل", isCorrect: false },
              ],
            },
            {
              label: "د",
              pageRef: 117,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "خط شکسته را محکم‌تر و بامزه‌تر از دیگران می‌نوشت." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حس‌آمیزی", isCorrect: true },
                { text: "تضاد", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 117,
          instruction: "کدام بیت «حسن تعلیل» دارد؟ دلیل خود را بنویسید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "بیت دارای حسن تعلیل را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "با کمال احتیاج از خلق استغنا خوش است / با دهان تشنه مردن بر لب دریا خوش است",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "عجب نیست بر خاک اگر گل شکفت / که چندین گل‌اندام در خاک خفت",
                  isCorrect: true,
                },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "دلیل وجود حسن تعلیل را بنویسید." },
              correctAnswer: {
                accepted: [
                  "شاعر دلیلی هنری و غیرواقعی برای شکفتن گل‌ها آورده است",
                  "برای شکفتن گل‌ها دلیل هنری و غیرواقعی آورده شده است",
                  "شکفتن گل‌ها به خفتن گل‌اندامان در خاک نسبت داده شده است",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "آرایه‌های «ایهام تناسب — اسلوب معادله — متناقض‌نما — حس‌آمیزی» به ترتیب در کدام گزینه آمده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "ابیات برگه: الف) «فلک در خاک می‌غلتید از شرم سرافرازی...»؛ ب) «روی خوبت آیتی از لطف بر ما کشف کرد...»؛ ج) «ما گرچه مرد تلخ‌نشین نه‌ایم، لیک...»؛ د) «گریه دام سیاهی را نبرد از بخت من...».",
              options: [
                { optionKey: "۱", text: "الف — ب — د — ج", isCorrect: false },
                { optionKey: "۲", text: "ج — الف — د — ب", isCorrect: false },
                { optionKey: "۳", text: "ب — د — ج — الف", isCorrect: false },
                { optionKey: "۴", text: "ب — د — الف — ج", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 31,
          pageRef: 90,
          instruction: "با توجه به بیت «خانه زندان است و تنهایی ضلال / هر که چون سعدی گلستانیش نیست» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "کدام واژه موجب پیدایش آرایهٔ «ایهام» شده است؟" },
              correctAnswer: { accepted: ["گلستان"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو معنی متفاوت این واژه را بنویسید.",
                fields: [
                  { id: "m1", label: "معنی اول" },
                  { id: "m2", label: "معنی دوم" },
                ],
              },
              correctAnswer: {
                m1: ["باغ و گلزار", "باغ", "گلزار"],
                m2: ["کتاب گلستان سعدی", "گلستان سعدی", "کتاب گلستان"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },

    // ---------------------------------------------- نقد و تحلیل نظم و نثر
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 4,
      questions: [
        {
          number: 32,
          instruction:
            "متن زیر را بخوانید و به سؤال‌ها پاسخ دهید: «... همین گمان مرا به سوی آن دو تل خاک کشانید. پیدا بود که پیش از این، سنگر دیده‌بانی یا انفرادی دشمن بوده است. زمزمهٔ لطیف شما گمان مرا تأیید کرد. می‌بایست هرچه زودتر مخفیگاهی پیدا کنم که از هر دیدرسی در امان بمانم؛ جز گودالی که از کنجکاوی گلولهٔ توپ فراهم آمده بود کجا می‌توانست مخفیگاه من باشد؟»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "یک مورد از ویژگی‌های زبانی متن بالا را بنویسید." },
              correctAnswer: {
                accepted: ["عامیانه", "زبان عامیانه", "ساده", "ساده‌نویسی", "روان", "زبان روان", "استفاده از واژه‌های فرهنگ ایثار و شهادت"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "دو ویژگی ادبی از متن بالا مشخص کنید." },
              correctAnswer: {
                accepted: ["تشخیص و استعاره", "تشخیص و حس‌آمیزی", "تشخیص و تناسب", "استعاره و حس‌آمیزی", "استعاره و تناسب", "حس‌آمیزی و تناسب"],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح برای این بخش «تشخیص / استعاره / حس‌آمیزی / تناسب» را پذیرفته و ذکر دو مورد را کافی دانسته است.",
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "یک مورد از ویژگی‌های فکری متن بالا را بنویسید." },
              correctAnswer: {
                accepted: ["مقاومت هشت‌ساله", "دفاع مقدس", "شهادت‌طلبی", "ایثار", "دفاع از وطن", "فرهنگ مقاومت"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          instruction:
            "متن زیر از کتاب «چرند و پرند» است. با توجه به متن پاسخ دهید: «باری، چه دردسر بدهم؟ آن‌قدر گفت و گفت و گفت تا ما را به این کار واداشت. حالا که می‌بینید آن روی کار بالاست، دست و پایش را گم کرده، و تمام آن حرف‌ها یادش رفته، تا یک قرانش قرض پیش می‌بندد، دلش می‌تپد، تا به یک ژاندارم چشمش می‌افتد، رنگش می‌پرد. هی می‌گوید: امان از همنشین بد!»",
          parts: [
            {
              label: "الف",
              pageRef: 45,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "کاربرد واژهٔ «ژاندارم» بیانگر کدام ویژگی زبانی متن بالاست؟" },
              correctAnswer: { accepted: ["به‌کارگیری واژه‌های غیر فارسی", "به کارگیری واژه‌های غیرفارسی", "کاربرد واژه‌های بیگانه", "واژه‌های غیرفارسی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "در متن بالا دو «کنایه» پیدا کنید که مفهومی نزدیک به هم دارند.",
                fields: [
                  { id: "k1", label: "کنایهٔ اول" },
                  { id: "k2", label: "کنایهٔ دوم" },
                ],
              },
              correctAnswer: {
                k1: ["رنگش می‌پرد", "رنگش می پرد"],
                k2: ["دلش می‌تپد", "دلش می تپد"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نویسندهٔ متن بالا کیست؟" },
              correctAnswer: { accepted: ["دهخدا", "علی‌اکبر دهخدا", "علی اکبر دهخدا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          instruction:
            "با توجه به شعر زیر به پرسش‌ها پاسخ دهید: «دیروز اگر سوخت ای دوست، غم برگ و بار من و تو / امروز می‌آید از باغ، بوی بهار من و تو / آنجا در آن برزخ سرد، در کوچه‌های غم و درد / غیر از شب آیا چه می‌دید چشمان تار من و تو؟ / دیروز در غربت باغ من بودم و یک چمن داغ / امروز خورشید در دشت، آیینه‌دار من و تو...»",
          parts: [
            {
              label: "الف",
              pageRef: 99,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "یک مورد آشنایی‌زدایی (روی آوردن به ترکیب‌های بدیع و بی‌سابقه) را در ابیات بالا بنویسید." },
              correctAnswer: { accepted: ["یک چمن داغ", "چمن داغ"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "دو واژهٔ نمادین در شعر بالا پیدا کنید." },
              correctAnswer: {
                accepted: ["باغ و شب", "باغ و برزخ سرد", "باغ و دشت", "باغ و خورشید", "شب و خورشید", "شب و دشت", "برزخ سرد و خورشید", "دشت و خورشید", "آینه‌دار و خورشید"],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح واژه‌های «باغ / شب / برزخ سرد / دشت / خورشید / آینه‌دار» را به‌عنوان پاسخ‌های پذیرفتنی آورده است.",
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در بیت اول، تمام آرایه‌های زیر به جز کدام آرایه مشهود است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "استعاره", isCorrect: false },
                { optionKey: "۲", text: "متناقض‌نما", isCorrect: true },
                { optionKey: "۳", text: "مجاز", isCorrect: false },
                { optionKey: "۴", text: "مراعات نظیر", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 35,
          instruction:
            "با توجه به سرودهٔ زیر که از «عارف قزوینی» است به سؤال‌ها پاسخ دهید: «گریه را به مستی بهانه کردم / شکوه‌ها ز دست زمانه کردم / آستین چو از چشم برگرفتم / سیل خون به دامان روانه کردم / از چه روی چون ارغنون ننالم؟ / از جفایت ای چرخ دون ننالم / چون نگریم ز درد و چون ننالم / دزد را چو محرم به خانه کردم؟»",
          parts: [
            {
              label: "الف",
              pageRef: 47,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "آرایهٔ مشترک بیت اول و سوم را بنویسید." },
              correctAnswer: { accepted: ["استعاره", "تشخیص", "استعاره مکنیه", "استعارهٔ مکنیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 47,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "در بیت دوم آرایهٔ تشبیه را مشخص نمایید." },
              correctAnswer: { accepted: ["سیل خون"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 17,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "با توجه به سرودهٔ بالا، عرصهٔ هنر عارف قزوینی ..................... و .......................... است.",
                fields: [
                  { id: "a1", label: "عرصهٔ اول" },
                  { id: "a2", label: "عرصهٔ دوم" },
                ],
              },
              correctAnswer: {
                a1: ["تصنیف", "تصنیف‌ها", "تصنیف ها"],
                a2: ["ترانه‌های میهنی", "ترانه های میهنی", "ترانهٔ میهنی"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
