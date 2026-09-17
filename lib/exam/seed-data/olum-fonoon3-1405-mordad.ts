import { blank1, poemLines } from "./helpers";
import type { SeedExam } from "./seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی ۱۴۰۵/۰۵/۱۲ (انسانی و معارف)
 * Source: fonon-12th-khordad1405.pdf — ۵ صفحه سؤال + ۲ صفحه «راهنمای نمره‌گذاری».
 *
 * دو نکته که موقعِ خواندنِ این فایل لازم است:
 *
 * ۱. **سؤال ۱۲ اینجا نیست.** راهنمای تصحیح می‌گوید «این سؤال حذف و نمرهٔ آن
 *    به سؤال ۱۵ تعلق گرفت»، پس بارمِ سؤال ۱۵ اینجا ۰٫۵ است و نه ۰٫۲۵.
 *    حذف‌شده را با نمرهٔ صفر نگه نداشتیم چون جدولِ exam_question_parts یک
 *    CHECK دارد: `score > 0`. شماره‌ها همان شماره‌های برگه‌اند، یعنی از ۱۱
 *    مستقیم به ۱۳ می‌رسند — این عمدی است و همان چیزی است که دانش‌آموز روی
 *    برگهٔ چاپی هم دیده.
 *
 * ۲. **جایی که برگه «بنویسید» می‌گوید و اینجا گزینه آمده.** چند سؤال روی
 *    کاغذ پاسخِ تشریحیِ کوتاه می‌خواهند ولی پاسخشان از یک مجموعهٔ بسته
 *    می‌آید (نام آرایه، نام قلمرو، واژه‌ای از خودِ بیت). آن‌ها به گزینه/
 *    فهرست تبدیل شده‌اند تا تصحیح خودکار باشد و نه «خودارزیابی». هرجا این
 *    کار شده، `sourceNote` می‌گوید گزینه‌ها از کجا آمده‌اند؛ کلیدِ پاسخ در
 *    هیچ‌کدام تغییر نکرده است.
 *
 * بارم‌ها: تاریخ ادبیات ۲ + سبک‌شناسی ۲ + موسیقی شعر ۶ + زیبایی‌شناسی ۶ +
 * نقد و تحلیل ۴ = ۲۰. (scripts/validate-exam-seeds.ts همین را می‌سنجد.)
 */
export const olumFonoon3Mordad1405: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی مرداد ۱۴۰۵",
  examSession: "olum-fonoon-1405-mordad",
  totalScore: 20,
  sourcePdf: "fonon-12th-khordad1405.pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          pageRef: 18,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                // پاسخ یک نام است، پس جعبهٔ یک‌واژه‌ای و نه یک سطرِ کامل.
                inputVariant: "word",
                questionText: "روزنامهٔ «قرن بیستم» توسط چه کسی منتشر می‌شد؟",
              },
              correctAnswer: {
                accepted: ["میرزادهٔ عشقی", "میرزاده عشقی", "عشقی", "میرزاده‌ی عشقی"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 17,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "«فرخی یزدی» تحت تأثیر شاعران گذشته، به‌ویژه ......................... بود.",
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
          number: 3,
          layoutPattern: "bracket-choice-mcq",
          instruction: "پاسخ درست را از داخل کمانک انتخاب نمایید.",
          parts: [
            {
              label: "الف",
              pageRef: 78,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "رمان «مدار صفر درجه» اثر احمد محمود مربوط به دورهٔ (بیداری – انقلاب اسلامی) است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بیداری", isCorrect: false },
                { text: "انقلاب اسلامی", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 74,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "کتاب (سووشون – شهری چون بهشت) دربرگیرندهٔ داستان زندگی زری و یوسف و اوضاع اجتماعی مردم فارس در خلال جنگ جهانی دوم است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "سووشون", isCorrect: true },
                { text: "شهری چون بهشت", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 20,
          instruction:
            "کدام‌یک از جمله‌های مشخص‌شده در مورد فن ترجمه، در دورهٔ بیداری نادرست است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام جمله نادرست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: گزینهٔ ج. توضیح راهنمای تصحیح («سرگذشت حاجی‌بابای اصفهانی» اثر جیمز موریه / «تاریخ بیداری ایرانیان» اثر ناظم‌الاسلام کرمانی) نشان می‌دهد جملهٔ نادرست همان است که تاریخ بیداری ایرانیان را به جیمز موریه نسبت می‌دهد.",
              options: [
                {
                  optionKey: "الف",
                  text: "فن ترجمه از عوامل مؤثر در رشد آگاهی و تحول اندیشهٔ ایرانیان در سال‌های قبل از مشروطه بود.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "ترجمهٔ آثار اروپایی در ایران با تأسیس چاپخانه در زمان فتحعلی‌شاه آغاز شد.",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "از میان مهم‌ترین آثار ترجمه‌شده در این دوره می‌توان از «تاریخ بیداری ایرانیان» اثر جیمز موریه نام برد.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 17,
          instruction:
            "ویژگی‌های ذکرشده در ستون اول، مربوط به کدام شاعر است؟ [نام یک شاعر اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.75,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "در به‌کارگیری تعبیرات عامیانه و آفریدن اشعاری ساده و روان مهارت بسیار داشت. در طنز، هَجو و هَزل چیره‌دست بود.",
                  },
                  {
                    id: "ب",
                    text: "بیان روایی و داستانی، حماسی بودن زبان، به‌کارگیری ترکیبات زیبا و خوش‌آهنگ و برخی از کاربردهای نحوی از ویژگی‌های سبکی شعر اوست.",
                  },
                  {
                    id: "ج",
                    text: "در غزل طبعی لطیف و احساسی رقیق داشت و از غزل‌سرایان نامی ایران، به‌ویژه از حافظ تأثیر فراوان پذیرفته است.",
                  },
                ],
                columnB: [
                  { id: "۱", text: "مهدی اخوان ثالث" },
                  { id: "۲", text: "ایرج میرزا" },
                  { id: "۳", text: "صبای کاشانی" },
                  { id: "۴", text: "شهریار" },
                ],
              },
              // صبای کاشانی همان نامِ اضافیِ برگه است.
              correctAnswer: { الف: "۲", ب: "۱", ج: "۴" },
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
          layoutPattern: "list-of-parallel-blanks",
          instruction: "جاهای خالی را با واژه‌های مناسب کامل کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 99,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "زبان و واژگان شعری در قصاید دورهٔ انقلاب به سبک ",
                  "b1",
                  " نزدیک است.",
                ),
              },
              correctAnswer: { accepted: ["خراسانی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 43,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "کاربرد واژه‌هایی مثل «بادافره و خلیدن» بیانگر توجه به واژگان ",
                  "b1",
                  " در شعر شاعران دورهٔ بیداری است.",
                ),
              },
              correctAnswer: { accepted: ["کهن", "قدیمی", "کهن و قدیمی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          layoutPattern: "multi-item-true-false",
          instruction: "«درستی» یا «نادرستی» عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 42,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "شعر دورهٔ بیداری به دلیل موقعیت اجتماعی و انقلابی، برای عامهٔ مردم قابل فهم است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 102,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "تفکر انسان‌گرایانه گاهی در برخی از آثار بعد از انقلاب به‌گونه‌ای کم‌رنگ مشاهده می‌شود.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          pageRef: 43,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "توجه به قالب‌های قصیده و مثنوی در شعر کدام‌یک از شاعران عصر بیداری بیشتر است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "عارف قزوینی، سید اشرف‌الدین گیلانی", isCorrect: false },
                { optionKey: "ب", text: "ملک‌الشعرای بهار، ادیب‌الممالک فراهانی", isCorrect: true },
                { optionKey: "ج", text: "دهخدا، ملک‌الشعرای بهار", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 9,
          pageRef: 97,
          instruction:
            "هر توضیح، به کدام «قلمرو» مربوط است؟ برای هر عبارت، قلمرو مناسب را انتخاب کنید.",
          parts: [
            {
              // جدولِ «ستون اول ← ستون دوم» برگه، اینجا سه فهرستِ بازشو کنارِ
              // خودِ عبارت است: همان کاری که دانش‌آموز روی کاغذ می‌کند، بدون
              // نوشتنِ دوبارهٔ شماره‌ها.
              type: "multi-part-inline-tagging",
              score: 0.75,
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
                        value: "ب) در نثر دوران مشروطه حقوق مدنی زنان مورد توجه نویسندگان بوده است.",
                        options: ["زبانی", "ادبی", "فکری"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "q3",
                        value:
                          "ج) روی آوردن به ترکیب‌های بدیع یکی از مشخصه‌های شعر دورهٔ انقلاب اسلامی است.",
                        options: ["زبانی", "ادبی", "فکری"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { q1: "ادبی", q2: "فکری", q3: "زبانی" },
                weights: { q1: 0.25, q2: 0.25, q3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------- موسیقی شعر
    {
      title: "موسیقی شعر",
      orderIndex: 3,
      sectionScore: 6,
      questions: [
        {
          number: 10,
          pageRef: 55,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در کدام واژه از بیت زیر، مصوّت بلند، همواره کوتاه است؟",
                stimulus: poemLines(
                  "من نمی‌گویم زیان کن یا به فکر سود باش",
                  "ای ز فرصت بی‌خبر در هر چه هستی، زود باش",
                ),
              },
              correctAnswer: { accepted: ["زیان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 87,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار وزنی مشترک واژه‌های مشخص‌شده در دو بیت زیر را بنویسید.",
                stimulus: {
                  lines: [
                    [
                      {
                        kind: "text",
                        value: "الف) دیگر دلم هوای سرودن نمی‌کند / تنها بهانهٔ دل ما در گلو ",
                      },
                      { kind: "highlight", value: "شکست" },
                    ],
                    [
                      { kind: "text", value: "ب) من به زبان اشک خود می‌دهمت سلام و " },
                      { kind: "highlight", value: "تو" },
                      { kind: "text", value: " / بر سر آتش دلم همچو زبانه می‌روی" },
                    ],
                  ],
                },
              },
              correctAnswer: {
                accepted: [
                  "بلند بودن هجای پایان مصراع",
                  "بلند بودن هجای پایانی مصراع",
                  "بلند بودن هجای آخر مصراع",
                  "بلندبودن هجای پایان مصراع",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        // سؤال ۱۲ برگه حذف شده است (بالای فایل توضیح داده شد) و نمره‌اش به ۱۵ رفت.
        {
          number: 13,
          pageRef: 26,
          instruction:
            "در بیت‌های زیر، نوع وزن را مشخص کنید: «همسان تک‌لختی»، «همسان دولختی» یا «ناهمسان».",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "v1",
                        value:
                          "الف) آب زنید راه را هین که نگار می‌رسد / مژده دهید باغ را بوی بهار می‌رسد",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v2",
                        value: "ب) گشته‌ام در جهان و آخر کار / دلبری برگزیده‌ام که مپرس",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { v1: "همسان دولختی", v2: "ناهمسان" },
                weights: { v1: 0.25, v2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 28,
          instruction:
            "با توجه به بیت‌های ستون اول، وزن مناسب را از ستون دوم انتخاب نمایید. [یک وزن در ستون دوم اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "لبخند تو خلاصهٔ خوبی‌هاست / لَختی بخند، خندهٔ گل زیباست",
                  },
                  {
                    id: "ب",
                    text: "جانا نظری که ناتوانم / بخشا که به لب رسید جانم",
                  },
                ],
                columnB: [
                  { id: "۱", text: "مستفعلُ، فاعلاتُ، مستف (فعلن)" },
                  { id: "۲", text: "مستفعلُ، فاعلاتُ، مستفعلْ (مفعولن)" },
                  { id: "۳", text: "مستفعلُن، مفاعلُ، مستفعلْ (مفعولن)" },
                ],
              },
              correctAnswer: { الف: "۳", ب: "۱" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 27,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "این بیت با کدام بیت، وزن مشترک دارد؟",
                stimulus: poemLines(
                  "تا رفت مرا از نظر آن چشم جهان‌بین",
                  "کس واقف ما نیست که از دیده چه‌ها رفت",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "بارم ۰٫۵ است و نه ۰٫۲۵: راهنمای تصحیح نمرهٔ سؤالِ حذف‌شدهٔ ۱۲ را به این سؤال اضافه کرده است.",
              options: [
                {
                  optionKey: "الف",
                  text: "دل نیست کبوتر که چو برخاست نشیند / از گوشهٔ بامی که پریدیم، پریدیم",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "با آنکه جیب و جام من از مال و می تهی است / ما را فراغتی است که جمشید جم نداشت",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 16,
          pageRef: 50,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به بیت «نسیم صبح را گفتم که با او جانبی داری / کز آن جانب که او باشد، صبا عنبرفشان آید» به سؤال‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در هجای سوم مصراع اول، کدام «اختیار زبانی» به کار رفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "بلند تلفظ کردن مصوت کوتاه",
                  "بلند تلفظ کردن مصوت‌های کوتاه",
                  "تغییر کمیت مصوت‌ها",
                  "تغییر کمیت مصوت",
                  "بلند تلفظ کردن کسرهٔ اضافه",
                  "بلند تلفظ کردن کسرهٔ اضافهٔ پایان واژه",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای تصحیح هر سه صورت را می‌پذیرد؛ هر سه در accepted آمده‌اند تا تصحیح خودکار بماند.",
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "«اختیار زبانی امکان حذف همزه» در کدام دو رکن مصراع دوم به کار رفته است؟",
                fields: [
                  { id: "r1", label: "رکنِ اول (جای خالی نخست)" },
                  { id: "r2", label: "رکنِ دوم (جای خالی دوم)" },
                ],
              },
              correctAnswer: {
                r1: ["رکن اول", "اول", "زان", "کزان جانب", "ک زان جا نب"],
                r2: [
                  "رکن چهارم",
                  "چهارم",
                  "رکن آخر",
                  "آخر",
                  "رکن پایانی",
                  "پایانی",
                  "نا",
                  "فشان آید",
                  "ف شا نا ید",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          pageRef: 55,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "«اختیار زبانی» مشترک دو بیت زیر، در کدام گزینه آمده است؟",
                stimulus: poemLines(
                  "خَلَد گر به پا خاری آسان برآید / چه سازم به خاری که در دل نشیند؟",
                  "سوی چاره گشتم ز بیچارگی / ندادم بدو سر به یکبارگی",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "بلند تلفّظ کردن مصوّت‌های کوتاه", isCorrect: false },
                { optionKey: "ب", text: "کوتاه تلفّظ کردن مصوّت‌های بلند", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 18,
          pageRef: 39,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تقطیع کدام بیت با «دو برش آوایی» امکان‌پذیر است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "توضیح راهنمای تصحیح: بیت ج را می‌توان هم «مفعول، فاعلات، مفاعیل، فاعلن» و هم «مستفعلن، مفاعل، مستفعلن، فعل» تقطیع کرد.",
              options: [
                {
                  optionKey: "الف",
                  text: "به حُسن خُلق و وفا کس به یار ما نرسد / تو را در این سخن انکار کار ما نرسد",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "آتش حُبّ‌الوطن چو شعله فروزد / از دل مؤمن کند به مجمره اسپند",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "دی شیخ با چراغ همی گشت گرد شهر / کز دیو و دد ملولم و انسانم آرزوست",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 19,
          pageRef: 87,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "شاعر در کدام بیت، بنا به ضرورت وزن، یک هجای بلند و یک هجای کوتاه کنار هم را جابه‌جا کرده است و نام این اختیار چیست؟",
                stimulus: poemLines(
                  "الف) کیست که پیغام من به شهر شروان برد / یک سخن از من بدان مرد سخندان برد",
                  "ب) مرا بِسود و فروریخت هرچه دندان بود / نبود دندان، لا بل چراغ تابان بود",
                ),
                fields: [
                  { id: "beyt", label: "بیت (الف یا ب)" },
                  { id: "name", label: "نام اختیار" },
                ],
              },
              correctAnswer: {
                beyt: ["الف", "بیت الف", "اول", "بیت اول"],
                name: ["قلب"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 87,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به بیت «با که گویم به جهان، محرم کو؟ / چه خبر گویم با بی‌خبران؟» به سؤال‌های زیر پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "اختیار وزنی «ابدال» در کدام رکن مصراع اول و کدام رکن مصراع دوم وجود دارد؟",
                fields: [
                  { id: "m1", label: "رکنِ مصراع اول" },
                  { id: "m2", label: "رکنِ مصراع دوم" },
                ],
              },
              correctAnswer: {
                m1: [
                  "سوم",
                  "رکن سوم",
                  "آخر",
                  "رکن آخر",
                  "پایانی",
                  "رکن پایانی",
                  "رم کو",
                  "رم",
                  "هجای ماقبل آخر",
                ],
                m2: ["دوم", "رکن دوم", "یم با بی", "یم"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "اختیار وزنی «آوردن فاعلاتن به جای فعلاتن» در کدام مصراع به کار رفته است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مصراع اول", isCorrect: true },
                { text: "مصراع دوم", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزن رکن پایانی مصراع دوم را بنویسید.",
              },
              correctAnswer: { accepted: ["فَعِلُن", "فعلن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          pageRef: 108,
          instruction: "کدام‌یک از بیت‌های زیر، در بحر «رجز مربع سالم» سروده شده است؟",
          parts: [
            {
              // بیت‌ها خودشان گزینه‌اند؛ برچسبِ الف/ب/ج اضافه است.
              type: "mcq-select-line-in-poem",
              score: 0.25,
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
          number: 22,
          pageRef: 119,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به شعر «قایقی خواهم ساخت / خواهم انداخت به آب / دور خواهم شد از این خاک غریب...» به سؤال‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                // ⚠️ نشانه‌های هجایی با واژه آمده‌اند و نه با «–» و «U».
                //
                // علامت‌ها چپ‌به‌راست‌اند و داخل یک <option> فارسی، ترتیبشان
                // وارونه دیده می‌شود: «U U – –» می‌شود «– – U U» که پاسخِ
                // دیگری است. «کوتاه/بلند» همان اطلاعات را بدون این خطر
                // می‌دهد.
                tagOptions: [
                  "بلند، کوتاه، بلند، بلند",
                  "کوتاه، کوتاه، بلند، بلند",
                  "بلند، بلند، کوتاه، بلند",
                  "کوتاه، بلند، کوتاه، بلند",
                ],
                passage: {
                  lines: [
                    [
                      { kind: "text", value: "مصراع آخر: «دور خواهم شد از این خاک غریب» — " },
                      {
                        kind: "select",
                        blankId: "r1",
                        value: "رکن اول",
                        options: [
                          "بلند، کوتاه، بلند، بلند",
                          "کوتاه، کوتاه، بلند، بلند",
                          "بلند، بلند، کوتاه، بلند",
                          "کوتاه، بلند، کوتاه، بلند",
                        ],
                      },
                      {
                        kind: "select",
                        blankId: "r2",
                        value: "رکن دوم",
                        options: [
                          "بلند، کوتاه، بلند، بلند",
                          "کوتاه، کوتاه، بلند، بلند",
                          "بلند، بلند، کوتاه، بلند",
                          "کوتاه، بلند، کوتاه، بلند",
                        ],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                // رکن اول: فاعلاتن (– U – –)، رکن دوم: فعلاتن (U U – –)
                tags: { r1: "بلند، کوتاه، بلند، بلند", r2: "کوتاه، کوتاه، بلند، بلند" },
                weights: { r1: 0.25, r2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "پاسخ از کلید (– U – – و U U – –) گرفته شده ولی دو گزینهٔ نادرست را ما افزوده‌ایم تا سؤال به‌جای نوشتنِ علامت، انتخابی باشد. اگر ترجیح می‌دهید عیناً مثل برگه «نوشتنی» باشد، این جزء را به short-text-answer تبدیل کنید.",
            },
            {
              label: "ب",
              type: "count-answer",
              score: 0.25,
              content: {
                type: "count-answer",
                questionText: "شاعر در مصراع اول از چند «اختیار وزنی» استفاده کرده است؟",
                min: 0,
                max: 9,
              },
              correctAnswer: { value: 3 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: ۳ اختیار — آوردن فاعلاتن به جای فعلاتن، ابدال، و بلند بودن هجای پایان مصراع.",
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "شاعر در مصراع دوم از کدام «اختیار زبانی» استفاده کرده است؟",
              },
              correctAnswer: { accepted: ["امکان حذف همزه", "حذف همزه"] },
              gradingMode: "exact_match",
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
          pageRef: 32,
          instruction: "«شخصیت‌های داستانی» کدام بیت‌ها با یکدیگر یکسان هستند؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام دو بیت؟",
                stimulus: poemLines(
                  "۱) گفت آن یار کز او گشت سرِ دار بلند / جرمش این بود که اسرار هویدا می‌کرد",
                  "۲) این مه که چون منیژه لب چاه می‌نشست / گریان به تازیانهٔ افراسیاب رفت",
                  "۳) گواه رهرو آن باشد که سردش یابی از دوزخ / نشان عاشق آن باشد که خشکش بینی از دریا",
                  "۴) یا رب این آتش که بر جان من است / سرد کن زان سان که کردی بر خلیل",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: گزینهٔ ب (بیت‌های ۳ و ۴) — هر دو به داستان حضرت ابراهیم خلیل و گلستان‌شدن آتش اشاره دارند.",
              options: [
                { optionKey: "الف", text: "۱ و ۴", isCorrect: false },
                { optionKey: "ب", text: "۳ و ۴", isCorrect: true },
                { optionKey: "ج", text: "۳ و ۱", isCorrect: false },
                { optionKey: "د", text: "۲ و ۱", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 24,
          pageRef: 32,
          parts: [
            {
              type: "mcq-multi-select",
              score: 0.5,
              content: {
                type: "mcq-multi-select",
                questionText:
                  "واژگان مشخص‌شده سبب خلق کدام دو آرایهٔ بدیع معنوی شده‌اند؟ (دو مورد را انتخاب کنید)",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "عشرتی دارم به یاد روی آن گل در " },
                      { kind: "highlight", value: "قفس" },
                      { kind: "text", value: " / عشق افکنده است با " },
                      { kind: "highlight", value: "یوسف" },
                      { kind: "text", value: " به یک " },
                      { kind: "highlight", value: "زندان" },
                      { kind: "text", value: " مرا" },
                    ],
                  ],
                },
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه دو جای خالی است؛ کلید «مراعات نظیر (تناسب)» و «تلمیح» را می‌خواهد. سه گزینهٔ نادرست را ما افزوده‌ایم تا ترتیبِ نوشتنِ دو نام، نمرهٔ کسی را نبرد.",
              options: [
                { optionKey: "الف", text: "تلمیح", isCorrect: true },
                { optionKey: "ب", text: "مراعات نظیر (تناسب)", isCorrect: true },
                { optionKey: "ج", text: "تضاد", isCorrect: false },
                { optionKey: "د", text: "حسن تعلیل", isCorrect: false },
                { optionKey: "ه", text: "اسلوب معادله", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 25,
          instruction: "آرایهٔ نادرست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              pageRef: 59,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام آرایه در این بیت وجود ندارد؟ (لف و نشر، تضاد، تلمیح)",
                stimulus: poemLines(
                  "از عفو و خشم تو دو نمونه است روز و شب",
                  "وز مهر و کین تو دو نمونه است شهد و سم",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "لف و نشر", isCorrect: false },
                { text: "تضاد", isCorrect: false },
                { text: "تلمیح", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 92,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "کدام آرایه در این بیت نادرست است؟ (ایهام، تلمیح، تضمین) — نام آرایه را بنویسید.",
                stimulus: poemLines(
                  "بگفتا عشق شیرین بر تو چون است",
                  "بگفت از جان شیرینم فزون است",
                ),
              },
              correctAnswer: {
                accepted: [
                  "تضمین",
                  "تلمیح",
                  "تضمین و تلمیح",
                  "تلمیح و تضمین",
                  "هر دو",
                  "هردو",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "این جزء عمداً گزینه‌ای نشد: راهنمای تصحیح «تضمین یا تلمیح یا هر دو» را نمرهٔ کامل می‌دهد و یک گزینهٔ درستِ واحد چنین چیزی را نمی‌پذیرد.",
            },
          ],
        },
        {
          number: 26,
          pageRef: 33,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "در کدام‌یک از بیت‌های زیر، شاعر یک مصراع از «رودکی» را تضمین کرده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "حافظ از جور تو، حاشا که بگرداند روی / «من از آن روز که در بند توام، آزادم»",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "خیز تا خاطر بدان ترک سمرقندی دهیم / کز نسیمش «بوی جوی مولیان آید همی»",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 27,
          pageRef: 91,
          parts: [
            {
              type: "two-answer-text",
              score: 0.75,
              content: {
                type: "two-answer-text",
                questionText:
                  "«آیت» در این بیت به معنای ......... است، معنای دیگر آن با واژهٔ ......... تناسب دارد و سبب خلق آرایهٔ ......... شده است.",
                stimulus: poemLines(
                  "روی خوبت آیتی از لطف بر ما کشف کرد",
                  "زان زمان جز لطف و خوبی نیست در تفسیر ما",
                ),
                fields: [
                  { id: "m1", label: "معنای «آیت» در بیت" },
                  { id: "m2", label: "واژهٔ متناسب با معنای دیگرش" },
                  { id: "m3", label: "نام آرایه" },
                ],
              },
              correctAnswer: {
                m1: ["نشانه", "نشان"],
                m2: ["تفسیر"],
                m3: ["ایهام تناسب"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 58,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "کدام‌یک از واژگان مشخص‌شده می‌تواند «نشر» مناسبی برای واژهٔ «سوختن» باشد؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "افروختن و سوختن و جامه دریدن / " },
                      { kind: "highlight", value: "پروانه" },
                      { kind: "text", value: " ز من، " },
                      { kind: "highlight", value: "شمع" },
                      { kind: "text", value: " ز من، " },
                      { kind: "highlight", value: "گل" },
                      { kind: "text", value: " ز من آموخت" },
                    ],
                  ],
                },
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              // لف و نشر مشوش است: افروختن←شمع، سوختن←پروانه، جامه دریدن←گل.
              options: [
                { text: "پروانه", isCorrect: true },
                { text: "شمع", isCorrect: false },
                { text: "گل", isCorrect: false },
              ],
              acceptedAnswers: ["پروانه"],
            },
          ],
        },
        {
          number: 29,
          pageRef: 88,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تصویرآفرینی آرایهٔ «اغراق» در کدام گزینه مفهومی «عاشقانه» ندارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "می‌شناسمت / چشم‌های تو میزبان آفتاب صبح سبز باغ‌هاست / می‌شناسمت",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "دلم گرفته از این روزها دلم تنگ است / میان ما و رسیدن هزار فرسنگ است",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "به تنها یکی گور بریان کنی / هوا را به شمشیر گریان کنی",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 30,
          pageRef: 114,
          instruction: "آرایهٔ مناسب هر یک از بیت‌های «ستون اول» را از «ستون دوم» انتخاب کنید.",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "چیست این سقف بلند سادهٔ بسیار نقش / هیچ دانا زین معمّا در جهان آگاه نیست",
                  },
                  {
                    id: "ب",
                    text: "با من بیا به خیابان / تا بشنوی بوی زمستانی که در باغ رخنه کرده است",
                  },
                  {
                    id: "ج",
                    text: "خمیده پشت از آن گشتند پیران جهان‌دیده / که اندر خاک می‌جویند ایام جوانی را",
                  },
                  {
                    id: "د",
                    text: "عشق چون آید برد هوش دل فرزانه را / دزد دانا می‌کشد اول چراغ خانه را",
                  },
                ],
                columnB: [
                  { id: "۱", text: "حسن تعلیل" },
                  { id: "۲", text: "اسلوب معادله" },
                  { id: "۳", text: "متناقض‌نما" },
                  { id: "۴", text: "حس‌آمیزی" },
                ],
              },
              correctAnswer: { الف: "۳", ب: "۴", ج: "۱", د: "۲" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "این سؤال، برخلاف سؤال‌های ۵ و ۱۴، موردِ اضافی ندارد: چهار بیت و چهار آرایه.",
            },
          ],
        },
        {
          number: 31,
          pageRef: 63,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجه به بیت «شکر ایزد که به اقبال کُله‌گوشهٔ گل / نخوت باد دی و شوکت خار آخر شد» به سؤال‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "mcq-multi-select",
              score: 0.25,
              content: {
                type: "mcq-multi-select",
                questionText:
                  "کدام دو واژه از نظر معنی با یکدیگر در «تقابل» هستند؟ (دو مورد را انتخاب کنید)",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "گزینه‌ها همگی واژه‌های خودِ بیت‌اند، پس چیزی به صورت سؤال اضافه نشده؛ فقط به‌جای نوشتن، انتخاب می‌شوند. کلید: گل و خار.",
              options: [
                { text: "اقبال", isCorrect: false },
                { text: "گل", isCorrect: true },
                { text: "باد دی", isCorrect: false },
                { text: "شوکت", isCorrect: false },
                { text: "خار", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این «تقابل معنایی» سبب خلق کدام آرایهٔ ادبی شده است؟",
              },
              correctAnswer: { accepted: ["تضاد", "طباق"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          pageRef: 113,
          instruction:
            "آرایه‌های «متناقض‌نما، حسن تعلیل، لف و نشر» را در بیت‌های زیر مشخص کنید.",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["متناقض‌نما", "حسن تعلیل", "لف و نشر"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "a1",
                        value:
                          "الف) نرگس همی رکوع کند در میان باغ / زیرا که کرد فاخته بر سرو مؤذّنی",
                        options: ["متناقض‌نما", "حسن تعلیل", "لف و نشر"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "a2",
                        value:
                          "ب) گوش ترحّمی کو کز ما نظر نپوشد / دست غریق، یعنی فریاد بی‌صداییم",
                        options: ["متناقض‌نما", "حسن تعلیل", "لف و نشر"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "a3",
                        value: "ج) دل و کشورت جمع و معمور باد! / ز مُلکت پراکندگی دور باد!",
                        options: ["متناقض‌نما", "حسن تعلیل", "لف و نشر"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { a1: "حسن تعلیل", a2: "متناقض‌نما", a3: "لف و نشر" },
                weights: { a1: 0.25, a2: 0.25, a3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 90,
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در بیت زیر، کدام واژه آرایهٔ «ایهام» دارد؟",
                stimulus: poemLines(
                  "خانه زندان است و تنهایی ضَلال",
                  "هر که چون سعدی گلستانیش نیست",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "گزینه‌ها واژه‌های خودِ بیت‌اند؛ روی برگه پاسخ نوشتنی است. کلید: گلستان.",
              options: [
                { text: "خانه", isCorrect: false },
                { text: "زندان", isCorrect: false },
                { text: "ضَلال", isCorrect: false },
                { text: "گلستان", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 113,
              type: "count-answer",
              score: 0.25,
              content: {
                type: "count-answer",
                questionText:
                  "تعداد آرایهٔ «حس‌آمیزی» را در بیت «سپهبد پرستنده را گفت گرم / سخن‌های شیرین به آوای نرم» بنویسید.",
                min: 0,
                max: 9,
              },
              correctAnswer: { value: 3 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: ۳ مورد — «گفت گرم» (شنوایی و لامسه)، «سخن‌های شیرین» (شنوایی و چشایی)، «آوای نرم» (شنوایی و لامسه).",
            },
          ],
        },
        {
          number: 34,
          pageRef: 115,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "زیبایی‌آفرینی بیت زیر بر پایهٔ ......... است که سبب خلق آرایهٔ ......... شده است.",
                stimulus: poemLines(
                  "در گران‌جان نکند پند و نصیحت تأثیر",
                  "پای خوابیده به فریاد نگردد بیدار",
                ),
                fields: [
                  { id: "base", label: "بر پایهٔ ..." },
                  { id: "name", label: "نام آرایه" },
                ],
              },
              correctAnswer: {
                base: ["شباهت", "تشبیه"],
                name: ["اسلوب معادله"],
              },
              gradingMode: "exact_match",
              verified: true,
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
          number: 35,
          pageRef: 40,
          layoutPattern: "multi-subquestion",
          instruction:
            "شعر زیر سرودهٔ «علی‌اکبر دهخدا» است (در قالب مسمّط، در رثای میرزا جهانگیرخان صور اسرافیل). با توجه به آن پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "mcq-select-line-in-poem",
              score: 0.25,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "ای مرغ سحر چو این شب تار / بگذاشت ز سر سیاه‌کاری",
                  "بگشود گره ز زلف زر تار / محبوبهٔ نیلگون عماری",
                  "یزدان به کمال شد پدیدار / و اهریمن زشت‌خو حصاری",
                ],
              },
              correctAnswer: { correctLineIndex: 1 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "صورت سؤال: شاعر در کدام بیت طلوع خورشید را به زیبایی به تصویر کشیده است؟",
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "منظور از واژهٔ شمارهٔ ......... «دهخدا» است و مراد از واژهٔ شمارهٔ ......... «میرزا جهانگیرخان صور اسرافیل» است.",
                stimulus: poemLines(
                  "ای مرغ(۱) سحر چو این شب تار / بگذاشت ز سر سیاه‌کاری",
                  "بگشود گره ز زلف زر تار / محبوبهٔ(۲) نیلگون عماری",
                  "یزدان به کمال شد پدیدار / و اهریمن زشت‌خو حصاری",
                  "یاد آر ز شمع(۳) مرده یاد آر",
                ),
                fields: [
                  { id: "n1", label: "شمارهٔ واژه‌ای که «دهخدا» است" },
                  { id: "n2", label: "شمارهٔ واژه‌ای که «میرزا جهانگیرخان» است" },
                ],
              },
              correctAnswer: {
                n1: ["۱", "1", "مرغ", "مرغ سحر"],
                n2: ["۳", "3", "شمع", "شمع مرده"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 20,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "مجموعهٔ نوشته‌های طنزآمیز سیاسی – اجتماعی دهخدا با عنوان ",
                  "t1",
                  " در روزنامهٔ «صور اسرافیل» منتشر می‌شد.",
                ),
              },
              correctAnswer: { accepted: ["چرند و پرند", "چرند پرند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          pageRef: 65,
          layoutPattern: "multi-subquestion",
          instruction:
            "متن یک: «...اکنون مدت دو سال افزون است که نه از آن طرف بَریدی و سلامی و نه از این جانب قاصدی و پیامی، طایر مکاتبات را از آن پر بسته و کلبهٔ مراودات را در بسته...» ▪ متن دو: «تا یک فرّاش قرمزپوش می‌بیند، دلش می‌تپد. تا به یک ژاندارم چشمش می‌افتد، رنگش می‌پرد. هی می‌گوید: امان از همنشین بد.»",
          parts: [
            {
              label: "الف",
              pageRef: 20,
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام متن، نثر «موزون و مسجع» دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "متن یک", isCorrect: true },
                { text: "متن دو", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "هر دو متن، دارای ویژگی‌های زبانی و ادبی آثار دورهٔ بیداری است.",
              },
              correctAnswer: { value: true },
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
                questionText: "یک واژهٔ بیگانه (فرنگی) در متن دوم پیدا کنید.",
              },
              correctAnswer: { accepted: ["ژاندارم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "«عامیانه‌نویسی» در کدام متن دیده می‌شود؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "متن یک", isCorrect: false },
                { text: "متن دو", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 37,
          pageRef: 111,
          layoutPattern: "multi-subquestion",
          instruction:
            "شعر یک: «پروانه و شمع و گل شبی آشفتند / در طرف چمن ؛ وز جور و جفای دهر با هم گفتند / بسیار سخن» ▪ شعر دو: «آغوش سحر تشنهٔ دیدار شماست / مهتاب خجل ز نور رخسار شماست ؛ خورشید که در اوج فلک خانه اوست / همسایهٔ دیوار به دیوار شماست»",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام شعر در قالب «مستزاد» سروده شده است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "شعر یک", isCorrect: true },
                { text: "شعر دو", isCorrect: false },
              ],
            },
            {
              label: "الف (دلیل)",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "یک دلیل برای پاسخ بالا بیاورید.",
              },
              correctAnswer: {
                accepted: [
                  "کوتاهی و بلندی مصراع‌ها",
                  "کوتاهی مصراع دوم",
                  "برابر نبودن تعداد هجاها",
                  "برابر نبودن ارکان مصراع دوم با مصراع اول",
                ],
              },
              // پاسخِ باز است: دانش‌آموز پاسخِ درست را می‌بیند و خودش نمره می‌دهد.
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر پاسخی که به نابرابریِ مصراع‌ها اشاره کند نمرهٔ کامل دارد: کوتاهی و بلندی مصراع‌ها، کوتاه‌بودن مصراع دوم، برابر نبودن تعداد هجاها یا ارکان، یا هر بیان مشابه.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 120,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "آغوش سحر تشنهٔ دیدار شماست / مهتاب خجل ز نور رخسار شماست" },
                    ],
                    [
                      { kind: "highlight", value: "خورشید" },
                      { kind: "text", value: " که در اوج " },
                      { kind: "highlight", value: "فلک" },
                      { kind: "text", value: " خانه اوست / همسایهٔ دیوار به دیوار شماست" },
                    ],
                  ],
                },
                passage: blank1(
                  "ارتباط معنایی واژگان مشخص‌شده، باعث ایجاد آرایهٔ ",
                  "b1",
                  " شده است.",
                ),
              },
              correctAnswer: { accepted: ["مراعات نظیر", "تناسب", "مراعات‌النظیر"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "آرایهٔ مشترک ترکیب‌های «جفای دهر» و «آغوش سحر» را بنویسید. (یک مورد کافی است)",
              },
              correctAnswer: {
                accepted: [
                  "اضافه استعاری",
                  "اضافهٔ استعاری",
                  "استعاره",
                  "تشخیص",
                  "جان‌بخشی",
                  "تشخیص (جان‌بخشی)",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          pageRef: 80,
          layoutPattern: "multi-subquestion",
          instruction:
            "متن زیر از «سید مهدی شجاعی» انتخاب شده است: «دو سال مانده بود هنوز به گرفتن دیپلم و وقت سربازی؛ اما طاقتم نمی‌توانستیم آورد. اول تابستان بود، کارنامه‌ها را با معدلی همسان گرفتیم و راهی خانه شدیم. با پیشنهادی که تو می‌خواستی بکنی و هنوز نکرده بودی، من موافق بودم، قبل از اینکه بگویی، گفتم: پدر رضایت می‌دهد، با مادر چه کنیم؟ گفتی: رضایت پدر شرط است؛ اما رضایت مادر را هم می‌گیریم... رفتن هر دومان را با هم قبول نمی‌کرد؛ می‌گفت رائد برود؛ وقتی برگشت، نوبت حامد. و ما که گفتیم ـ مثل همیشه ـ یا هر دو یا هیچ‌کدام. پدر پاسخ داد که: پس هیچ‌کدام...»",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام گزینه، از آثار نویسندهٔ متن بالا است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "ظهور", isCorrect: false },
                { optionKey: "۲", text: "ضیافت", isCorrect: true },
                { optionKey: "۳", text: "مهاجر کوچک", isCorrect: false },
                { optionKey: "۴", text: "دری به خانهٔ خورشید", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 82,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1("زبان این داستان بیشتر ", "b1", " است."),
              },
              correctAnswer: {
                accepted: ["ساده", "روان", "عامیانه", "ساده و روان", "ساده و عامیانه"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 82,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو مورد از ویژگی‌های «فکری» متن بالا را بنویسید.",
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: ["ایثار", "مبارزه", "مقاومت در برابر دشمن", "داشتن روح حماسی"],
                f2: [
                  "دفاع از وطن",
                  "دعوت به اخلاقیات (جلب رضایت پدر)",
                  "ثبت خاطرات حماسه‌ها و دلاوری‌های دوران جنگ",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "هر دو موردِ درست از این فهرست نمره می‌گیرد: ایثار، مبارزه، مقاومت در برابر دشمن، داشتن روح حماسی، دفاع از وطن، دعوت به اخلاقیات (جلب رضایت پدر)، ثبت خاطرات حماسه‌ها و دلاوری‌های دوران جنگ، یا هر ویژگی مشابه.",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
