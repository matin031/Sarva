import { poemLines } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی خرداد ۱۴۰۴ (انسانی و معارف)
 * Source: Khordad-1404-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۳ صفحه راهنمای تصحیح.
 *
 * نکتهٔ مهم دربارهٔ سؤال ۱۲:
 * راهنمای تصحیح، قسمت «ب» را حذف کرده و بارم آن را به قسمت «الف» داده است؛
 * بنابراین در نسخهٔ آنلاین فقط قسمت معتبرِ «الف» با بارم ۰٫۵ نگه داشته شده است.
 *
 * در چند سؤال تشریحی که پاسخ از مجموعهٔ بسته‌ای می‌آید، برای تصحیح خودکار از
 * گزینه/فهرست استفاده شده است. هرجا چنین تبدیلی انجام شده، sourceNote توضیح می‌دهد.
 */
export const olumFonoon3Khordad1404: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۴",
  examSession: "olum-fonoon-1404-khordad",
  totalScore: 20,
  sourcePdf: "Khordad-1404-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          pageRef: 13,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«پرچمدار» سبک بازگشت ادبی کدام شاعر است؟",
              },
              correctAnswer: {
                accepted: ["فتحعلی‌خان صبای کاشانی", "فتحعلی خان صبای کاشانی", "صبای کاشانی", "صبا"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 70,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام مورد دربارهٔ «پروین اعتصامی» نادرست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه سه بخشِ جمله با شماره‌های ۱ تا ۳ مشخص شده‌اند؛ برای نسخهٔ آنلاین همان سه بخش به‌صورت گزینه آمده‌اند. راهنمای تصحیح شمارهٔ ۲ را نادرست می‌داند.",
              options: [
                { optionKey: "۱", text: "پروین در قصیده به سبک ناصر خسرو", isCorrect: false },
                { optionKey: "۲", text: "به روانی و لطافت حافظ شعر می‌سراید.", isCorrect: true },
                { optionKey: "۳", text: "اوج سخن پروین در قطعات اوست.", isCorrect: false },
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
                questionText: "«آینه‌های دردار» از نمونه نثرهای دورهٔ (انقلاب اسلامی - بیداری) است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "انقلاب اسلامی", isCorrect: true },
                { text: "بیداری", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 20,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "از معروف‌ترین نویسندگان و سیاست‌مداران بزرگ دورهٔ بیداری که با تغییر سبک نگارش، تکلّف را در نثر از بین برد: (ادیب‌الممالک فراهانی - قائم‌مقام فراهانی)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ادیب‌الممالک فراهانی", isCorrect: false },
                { text: "قائم‌مقام فراهانی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 4,
          layoutPattern: "multi-item-true-false",
          instruction: "درستی یا نادرستی موارد زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 18,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "روزنامهٔ «نسیم شمال» با مدیریت و نویسندگی میرزا جهانگیرخان صور اسرافیل، اداره می‌شد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 74,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "اولین تجربهٔ داستان‌نویسی «سیمین دانشور» کتاب «سووشون» است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          instruction: "کدام‌یک از موارد ستون «اول» به موارد ستون «دوم» مربوط است؟ [یک مورد اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "دهکدهٔ پرملال" },
                  { id: "ب", text: "داستان باستان" },
                ],
                columnB: [
                  { id: "۱", text: "میرزاحسن‌خان بدیع" },
                  { id: "۲", text: "امین فقیری" },
                  { id: "۳", text: "احمد محمود" },
                ],
              },
              correctAnswer: { الف: "۲", ب: "۱" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: الف←امین فقیری (ص۷۳)، ب←میرزاحسن‌خان بدیع (ص۱۹). احمد محمود مورد اضافی است.",
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
          pageRef: 101,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "گرایش به کدام سبک جدید داستان‌نویسی، بعد از جنگ دیده نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "جریان سیّال ذهن", isCorrect: false },
                { optionKey: "ب", text: "رمان‌نویسی", isCorrect: true },
                { optionKey: "ج", text: "مدرن‌نویسی", isCorrect: false },
                { optionKey: "د", text: "داستانک‌نویسی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 7,
          pageRef: 99,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "در کدام‌یک از بیت‌های زیر «آشنایی‌زدایی زبانی و روی آوردن به ترکیب‌های بدیع» به چشم می‌خورد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "چو گلدان خالی لب پنجره / پر از خاطرات ترک‌خورده‌ایم",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "گواهی بخواهید، اینک گواه / همین زخم‌هایی که نشمرده‌ایم",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 8,
          layoutPattern: "bracket-choice-mcq",
          instruction: "پاسخ درست را از داخل کمانک انتخاب نمایید.",
          parts: [
            {
              label: "الف",
              pageRef: 43,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "(گرایش به قالب‌های کم‌کاربرد - نوآوری در عرصهٔ تخیّل) زمینه را برای ظهور شعر نو فراهم کرد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "گرایش به قالب‌های کم‌کاربرد", isCorrect: true },
                { text: "نوآوری در عرصهٔ تخیّل", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 100,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "تلفیق (تمثیل و مفاهیم انتزاعی - روح حماسه و عرفان) در غزل حماسی انقلاب، دیده می‌شود.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تمثیل و مفاهیم انتزاعی", isCorrect: false },
                { text: "روح حماسه و عرفان", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 9,
          layoutPattern: "multi-subquestion",
          instruction:
            "هر یک از مفاهیم «وطن، توجّه به مردم، بیگانه‌ستیزی» مربوط به کدام‌یک از عبارت‌های زیر است؟",
          parts: [
            {
              label: "الف",
              pageRef: 44,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("یک مرغ گرفتار در این گلشن ویران", "تنها به قفس ماند، هزاران، همه رفتند"),
                questionText: "مفهوم مربوط به این عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["وطن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 46,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چون نگریم ز درد و چون ننالم", "دزد را چو محرم به خانه کردم؟"),
                questionText: "مفهوم مربوط به این عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["وطن", "بیگانه‌ستیزی", "بیگانه ستیزی"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح برای این بیت هم «وطن» و هم «بیگانه‌ستیزی» را می‌پذیرد.",
            },
            {
              label: "ج",
              pageRef: 44,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("در پیشگاه اهل خرد نیست محترم", "هرکس که فکر جامعه را محترم نداشت"),
                questionText: "مفهوم مربوط به این عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["توجّه به مردم", "توجه به مردم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 96,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از عبارت‌های زیر نشان‌دهندهٔ سطح زبانیِ شعرِ دورهٔ معاصر تا انقلاب است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "چشمگیر بودنِ جمله‌بندی‌های ساده", isCorrect: true },
                { optionKey: "ب", text: "گرایش به نماد در تصاویر شعری", isCorrect: false },
                { optionKey: "ج", text: "لحن صمیمانه و متواضعانه", isCorrect: false },
              ],
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
          number: 11,
          instruction:
            "در بیت‌های زیر، انواع وزن «همسان تک‌لختی، همسان دولختی، ناهمسان» را مشخص کنید. [یک وزن اضافی است]",
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
                        value: "الف) بنمای رخ که باغ و گلستانم آرزوست / بگشای لب که قند فراوانم آرزوست",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v2",
                        value: "ب) ز دو دیده خون فشانم ز غمت شب جدایی / چه کنم که هست این‌ها گل باغ آشنایی",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { v1: "ناهمسان", v2: "همسان دولختی" },
                weights: { v1: 0.25, v2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: الف ص۲۵، ب ص۵۵.",
            },
          ],
        },
        {
          number: 12,
          pageRef: 54,
          instruction: "درستی یا نادرستی مورد زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.5,
              content: {
                type: "true-false",
                statementText: "واژهٔ «عامیانه» با الگوی هجایی «ـ U ـ ـ» در هجای دوم و چهارم اختیار زبانی دارد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "قسمت «ب» سؤال ۱۲ در راهنمای تصحیح حذف شده و بارم آن به قسمت «الف» تعلق گرفته است؛ بنابراین قسمت الف ۰٫۵ نمره دارد.",
            },
          ],
        },
        {
          number: 13,
          pageRef: 53,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "اختیار زبانیِ «کوتاه تلفّظ کردن مصوّت بلند» در کدام گزینه به کار نمی‌رود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "جادویی", isCorrect: false },
                { optionKey: "ب", text: "ساقی کوثر", isCorrect: false },
                { optionKey: "ج", text: "مویی‌سپید", isCorrect: true },
                { optionKey: "د", text: "بازی دهر", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 14,
          pageRef: 85,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار وزنیِ مشترکِ دو بیت زیر را بنویسید.",
                stimulus: poemLines(
                  "الف) از خون و گل و شکوفه، تابوت شهید / بر موج بلند دست‌ها رنگین بود",
                  "ب) ای بی‌خبر بکوش که صاحب‌خبر شوی / تا راهرو نباشی کی راهبر شوی؟",
                ),
              },
              correctAnswer: {
                accepted: ["ابدال", "آوردن یک هجای بلند به جای دو هجای کوتاه"],
              },
              gradingMode: "exact_match",
              verified: true,
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
              content: {
                type: "mcq-inline",
                questionText:
                  "بیت «پیش کمان ابرویش لابه همی‌کنم؛ ولی / گوش کشیده‌است از آن گوش به من نمی‌کند» با کدام‌یک از گزینه‌ها از نظر اختیار زبانیِ «تغییر کمیّت مصوّت‌ها» برابر است؟",
              },
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
                  text: "آمد سوی کعبه سینه پرجوش / چون کعبه نهاد حلقه در گوش",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 16,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به بیت «من و تو غافلیم و ماه و خورشید / بر این گردون گردان نیست غافل» به سؤالات پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 49,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "اختیار زبانیِ «امکان حذف همزه» در چندمین رکنِ مصراع دوم، وجود دارد؟",
              },
              correctAnswer: {
                accepted: ["رکن اول", "اول", "هجای دوم", "برین", "بر این"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 50,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "کدام اختیار زبانی در هجای سومِ مصراعِ اول، دیده می‌شود؟",
              },
              correctAnswer: {
                accepted: [
                  "تغییر کمیّت مصوّت‌ها",
                  "تغییر کمیت مصوت‌ها",
                  "بلند تلفّظ کردن مصوّت‌های کوتاه",
                  "بلند تلفظ کردن مصوت‌های کوتاه",
                  "تبدیل مصوت کوتاه به مصوت بلند",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          pageRef: 27,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام بیت را نمی‌توان به شکل «همسان» تقطیع هجایی کرد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "دل نیست کبوتر که چو برخاست نشیند / از گوشهٔ بامی که پریدیم، پریدیم",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "باز این چه شورش است که در خلق عالم است؟ / باز این چه نوحه و چه عزا و چه ماتم است؟",
                  isCorrect: true,
                },
                {
                  optionKey: "ج",
                  text: "تا رفت مرا از نظر آن چشم جهان‌بین / کس واقف ما نیست که از دیده، چه‌ها رفت",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 18,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به بیت «کیست که پیغام من به شهر شروان برد / یک سخن از من بدان مرد سخندان برد» به سؤالات پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 87,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "پایه‌های آواییِ سوم و چهارمِ مصراع اول را بنویسید.",
                fields: [
                  { id: "p3", label: "پایهٔ آوایی سوم" },
                  { id: "p4", label: "پایهٔ آوایی چهارم" },
                ],
              },
              correctAnswer: {
                p3: ["به شَه رِ شَر", "به شه رِ شر", "به شهر شر"],
                p4: ["وان بَ رَد", "وان بَرد", "وان برد"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 86,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام اختیار «وزنی» در مصراع اول وجود دارد؟",
              },
              correctAnswer: { accepted: ["قلب"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 87,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "نشانهٔ هجاییِ رکن اول و چهارم مصراع دوم را مشخص نمایید.",
                fields: [
                  { id: "r1", label: "رکن اول" },
                  { id: "r4", label: "رکن چهارم" },
                ],
              },
              correctAnswer: {
                r1: ["- U U -", "ـ U U ـ", "– U U –"],
                r4: ["- U -", "ـ U ـ", "– U –"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              pageRef: 87,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار زبانی در چندمین پایهٔ آواییِ مصراع دوم، وجود دارد؟",
              },
              correctAnswer: {
                accepted: ["پایهٔ آوایی اول", "پایه آوایی اول", "رکن اول", "اول", "هجای چهارم"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به شعر «می‌تراود مهتاب / می‌درخشد شبتاب / نیست یک دم شکند خواب به چشم کس و لیک / غم این خفتهٔ چند / خواب در چشم ترم می‌شکند» به سؤالات پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 107,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "شعر بالا در بحرِ «رجز» سروده شده است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 105,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این سروده از تکرارِ کدام «وزن‌واژه» ایجاد شده است؟",
              },
              correctAnswer: { accepted: ["فعلاتن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو اختیارِ «وزنی» در مصراع سوم بیابید و نام آن‌ها را بنویسید.",
                fields: [
                  { id: "o1", label: "اختیار وزنی ۱" },
                  { id: "o2", label: "اختیار وزنی ۲" },
                ],
              },
              correctAnswer: {
                o1: ["آوردن فاعلاتن به جای فعلاتن", "فاعلاتن به جای فعلاتن"],
                o2: ["بلند بودن هجای پایان مصراع", "بلند بودن هجای پایانی مصراع", "بلند بودن هجای آخر مصراع"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح برای اختیار اول ص۱۰۵ و برای اختیار دوم ص۵۰ ارجاع داده است.",
            },
          ],
        },
        {
          number: 20,
          instruction: "با توجّه به ستون اول، بیت مناسب را از ستون دوم انتخاب نمایید. [ذکر شمارهٔ بیت کافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.75,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "مستفعل فاعلات مستفعل" },
                  { id: "ب", text: "مستفعل فاعلات فع لن" },
                  { id: "ج", text: "فاعلاتن مفاعلن فعلن" },
                ],
                columnB: [
                  { id: "۱", text: "گشته‌ام در جهان و آخر کار / دلبری برگزیده‌ام که مپرس" },
                  { id: "۲", text: "از کردهٔ خویشتن پشیمانم / جز توبه، ره دگر نمی‌دانم" },
                  { id: "۳", text: "در دام فتاده آهویی چند / محکم شده دست و پای دربند" },
                ],
              },
              correctAnswer: { الف: "۲", ب: "۳", ج: "۱" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "این سؤال سه وزن و سه بیت دارد و مورد اضافی ندارد.",
            },
          ],
        },
        {
          number: 21,
          pageRef: 54,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام بیت در بحر «هزج مسدّس محذوف» سروده شده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "بیا تا قدر یکدیگر بدانیم / که تا ناگه ز یکدیگر نمانیم",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "همه کارم ز خودکامی به بدنامی کشید آخر / نهان کی ماند آن رازی کز او سازند محفل‌ها",
                  isCorrect: false,
                },
              ],
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
          number: 22,
          pageRef: 32,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شخصیّت‌های داستانیِ بیت زیر با کدام‌یک از گزینه‌ها یکسان است؟",
                stimulus: poemLines(
                  "بیت اصلی: گواه رهرو آن باشد که سردش یابی از دوزخ / نشان عاشق آن باشد که خشکش بینی از دریا",
                  "الف) دامن خاک شد ز بسد و لعل / تاج فرعون و گنج دقیانوس",
                  "ب) بمیر ای دوست پیش از مرگ اگر می زندگی خواهی / که ادریس از چنین مردن بهشتی گشت پیش از ما",
                  "ج) جانم ملول گشت ز فرعون و ظلم او / آن نور روی موسی عمرانم آرزوست",
                  "د) یا رب این آتش که بر جان من است / سرد کن زان سان که کردی بر خلیل",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "الف - ب", isCorrect: false },
                { optionKey: "۲", text: "د - الف", isCorrect: false },
                { optionKey: "۳", text: "د - ج", isCorrect: true },
                { optionKey: "۴", text: "ب - ج", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 23,
          pageRef: 88,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شاعر در کدام بیت از آرایهٔ «اغراق» برای «تصویرآفرینی» در حماسه استفاده کرده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "بگذار تا بگریم چون ابر در بهاران / کز سنگ ناله خیزد روز وداع یاران",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "به تنها یکی گور بریان کنی / هوا را به شمشیر گریان کنی",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 24,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "با توجّه به سروده‌های زیر، کدام داستان مشترک در ذهن مخاطب، تداعی می‌شود؟",
                stimulus: poemLines(
                  "الف) گفت آن یار کز او گشت سرِ دار بلند / جرمش این بود که اسرار هویدا می‌کرد",
                  "ب) در آینه دوباره نمایان شد / با ابر گیسوانش در باد / باز آن سرود سرخ اناالحق / ورد زبان اوست",
                ),
              },
              correctAnswer: {
                accepted: [
                  "داستان بر دار کردن حسین بن منصور حلاج",
                  "بر دار کردن حسین بن منصور حلاج",
                  "حسین بن منصور حلاج",
                  "منصور حلاج",
                  "حلاج",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۳۱ و ۳۷ ارجاع داده است.",
            },
          ],
        },
        {
          number: 25,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "واژه‌های «باقی» و «عهد» در مصراع دومِ هر بیت، چه آرایهٔ مشترکی را پدید آورده‌اند؟",
                stimulus: poemLines(
                  "الف) عرضه کردم دو جهان بر دل کارافتاده / به‌جز از عشق تو باقی همه فانی دانست",
                  "ب) عهد کردی که کشی فرصت خود را روزی / فرصت ار یافتی، آن عهد فراموش مکن",
                ),
              },
              correctAnswer: { accepted: ["ایهام"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۹۰ و ۹۲ ارجاع داده است.",
            },
          ],
        },
        {
          number: 26,
          pageRef: 60,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به بیت «چیست این سقفِ بلندِ سادهٔ بسیار نقش / هیچ دانا زین معمّا در جهان آگاه نیست» به سؤالات پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تضاد در یک امر در کدام مصراع وجود دارد؟",
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
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این نوع «تضاد» سبب خلق چه آرایه‌ای شده است؟",
              },
              correctAnswer: { accepted: ["متناقض‌نما", "متناقض نما", "پارادوکس", "تناقض"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 113,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام بیت آرایهٔ «حسن تعلیل» دیده می‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "اینکه گاهی می‌زدم بر آب و آتش خویش را / روشنی در کار مردم بود مقصودم چو شمع",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "فکر شنبه تلخ دارد جمعهٔ اطفال را / عشرت امروز بی‌اندیشهٔ فردا خوش است",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "نرگس همی رکوع کند در میان باغ / زیرا که کرد فاخته بر سرو مؤذّنی",
                  isCorrect: true,
                },
              ],
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
                questionText: "کدام گزینه می‌تواند «لفّ» مناسبی برای «نشر»های مشخص‌شده باشد؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "به روز نبرد آن یل ارجمند / به شمشیر و خنجر به گرز و کمند" },
                    ],
                    [
                      { kind: "text", value: "برید و درید و " },
                      { kind: "highlight", value: "شکست" },
                      { kind: "text", value: " و ببست / یلان را سر و سینه و " },
                      { kind: "highlight", value: "پا" },
                      { kind: "text", value: " و دست" },
                    ],
                  ],
                },
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "شمشیر", isCorrect: false },
                { optionKey: "ب", text: "خنجر", isCorrect: false },
                { optionKey: "ج", text: "گرز", isCorrect: true },
                { optionKey: "د", text: "کمند", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 36,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "آرایه‌های کدام گزینه با توجّه به بیت «شور شیرینِ تو را نازم که بعد از قرن‌ها / هر که الف عشق زد، نامی هم از فرهاد برد» کاملاً صحیح است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ایهام تناسب - مراعات نظیر - تلمیح", isCorrect: true },
                { optionKey: "ب", text: "ایهام - اغراق - لف و نشر", isCorrect: false },
                { optionKey: "ج", text: "ایهام - مراعات نظیر - اسلوب معادله", isCorrect: false },
                { optionKey: "د", text: "ایهام تناسب - حسن تعلیل - حس‌آمیزی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 30,
          pageRef: 113,
          layoutPattern: "multi-subquestion",
          instruction: "کدام بیت «اسلوب معادله» دارد؟ یک دلیل برای آن ذکر کنید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام بیت «اسلوب معادله» دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "سپهر مردم دون را کند خریداری / بخیل سوی متاعی رود که ارزان است",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "تویی بهانهٔ آن ابرها که می‌گریند / بیا که صاف شود این هوای بارانی",
                  isCorrect: false,
                },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "یک دلیل برای پاسخ بالا ذکر کنید.",
              },
              correctAnswer: {
                accepted: [
                  "یکی از مصراع‌ها حکم مصداقی برای مصراع دیگر است",
                  "یکی از طرفین معادلی برای تأیید مصراع دیگر است",
                  "جای دو مصراع را می‌توان عوض کرد",
                  "هر یک از دو مصراع استقلال معنایی و نحوی دارد",
                  "مفهومی ذهنی در یک مصراع و مفهومی محسوس در مصراع دیگر برای تأیید آن می‌آید",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر یک از دلیل‌های صریحِ راهنمای تصحیح یا بیان هم‌معنای آن نمرهٔ کامل دارد: استقلال معنایی و نحوی دو مصراع، امکان جابه‌جایی دو مصراع، مصداق/معادل بودن یکی برای دیگری، یا تأیید مفهوم ذهنی با مفهوم محسوس.",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 114,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "همراه شدنِ واژهٔ ............... و «آبی‌رنگ» در عبارت «آسمان، فریبی آبی‌رنگ شد.» سبب خلق آرایهٔ ............... شده است.",
                fields: [
                  { id: "word", label: "واژهٔ همراه با «آبی‌رنگ»" },
                  { id: "device", label: "نام آرایه" },
                ],
              },
              correctAnswer: {
                word: ["فریب", "آسمان"],
                device: ["حس‌آمیزی", "حس آمیزی", "تناسب", "مراعات نظیر"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "راهنمای تصحیح دو جفت پاسخ معتبر می‌دهد: «فریب + حس‌آمیزی» یا «آسمان + تناسب». هر خانه ۰٫۲۵ نمره دارد. ترکیب ضربدریِ این دو جفت صحیح نیست.",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          instruction: "آرایهٔ مناسب هر یک از بیت‌های ستون «اول» را از ستون «دوم» انتخاب نمایید. [یک مورد اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "ز کوی یار می‌آید نسیم باد نوروزی / از این باد ار مدد خواهی، چراغ دل برافروزی",
                  },
                  {
                    id: "ب",
                    text: "شکر ایزد که به اقبال کُله‌گوشهٔ گل / نخوت باد دی و شوکت خار آخر شد",
                  },
                  {
                    id: "ج",
                    text: "مکن گریه بر گور مقتول دوست / قل الحمدلله که مقبول اوست",
                  },
                  {
                    id: "د",
                    text: "عجب نیست بر خاک اگر گل شکفت / که چندین گل‌اندام در خاک خفت",
                  },
                ],
                columnB: [
                  { id: "۱", text: "حسن تعلیل" },
                  { id: "۲", text: "اغراق" },
                  { id: "۳", text: "تضمین" },
                  { id: "۴", text: "متناقض‌نما" },
                  { id: "۵", text: "تضاد" },
                ],
              },
              correctAnswer: { الف: "۴", ب: "۵", ج: "۳", د: "۱" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای تصحیح: الف متناقض‌نما (ص۶۰)، ب تضاد (ص۵۹)، ج تضمین (ص۳۳)، د حسن تعلیل (ص۱۱۲). «اغراق» مورد اضافی است.",
            },
          ],
        },
        {
          number: 33,
          pageRef: 35,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "تعامل و همنشینیِ کدام واژه‌ها در بیت «باغ باران‌خورده می‌نوشید نور / لرزشی در سبزه‌های تر دوید» سبب «زیبایی‌آفرینی» شده و این کاربرد شاعرانه، کدام آرایهٔ ادبی را خلق کرده است؟",
                fields: [
                  { id: "words", label: "واژه‌ها / ترکیب" },
                  { id: "device", label: "آرایه / توضیح زیبایی‌آفرینی" },
                ],
              },
              correctAnswer: {
                words: ["نور می‌نوشید", "نور می نوشید", "باغ و سبزه", "سبزه و باغ", "تر و باران", "باران و تر"],
                device: [
                  "حس‌آمیزی",
                  "حس آمیزی",
                  "نور مانند مایعی است که نوشیده می‌شود",
                  "نور مانند مایعی است که نوشیده می شود",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "راهنمای تصحیح به‌صراحت «نور می‌نوشید + حس‌آمیزی» و نیز «نور می‌نوشید + نور مانند مایعی است که نوشیده می‌شود» را می‌پذیرد. همچنین برای بخش واژه‌ها «باغ و سبزه» یا «تر و باران» را ذکر می‌کند، امّا در همان سطر نام آرایهٔ متناظر را چاپ نکرده است؛ برای این دو پاسخ فقط مطابق متن رسمی کلید نمره بده و آرایهٔ حذف‌شده را حدس نزن.",
              verified: false,
              sourceNote:
                "ابهام از خودِ راهنمای تصحیح است: در سطر نخستِ پاسخ سؤال ۳۳، «باغ و سبزه یا تر و باران» آمده اما نام آرایهٔ متناظر بعد از خط تیره درج نشده است. پاسخِ کامل و صریحِ «نور می‌نوشید — حس‌آمیزی» در همان کلید وجود دارد.",
            },
          ],
        },
        {
          number: 34,
          instruction: "آرایه‌های «ایهام تناسب، لف و نشر، ایهام» را در بیت‌های زیر مشخص نمایید.",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["ایهام تناسب", "لف و نشر", "ایهام"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "a1",
                        value: "الف) فرورفت و بررفت روز نبرد / به ماهی نم خون و بر ماه گرد",
                        options: ["ایهام تناسب", "لف و نشر", "ایهام"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "a2",
                        value: "ب) بی‌مهر رخت روز مرا نور نمانده است / وز عمر مرا جز شب دیجور نمانده است",
                        options: ["ایهام تناسب", "لف و نشر", "ایهام"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "a3",
                        value: "ج) گر هزار است بلبلِ این باغ / همه را نغمه و ترانه یکی است",
                        options: ["ایهام تناسب", "لف و نشر", "ایهام"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { a1: "لف و نشر", a2: "ایهام", a3: "ایهام تناسب" },
                weights: { a1: 0.25, a2: 0.25, a3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: الف ص۵۷، ب ص۸۹، ج ص۹۱.",
            },
          ],
        },
        {
          number: 35,
          layoutPattern: "bracket-choice-mcq",
          instruction: "آرایهٔ مناسب را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 37,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "عاکفان کعبهٔ جلالش به تقصیر عبادت معترف که: «ما عبدناکَ حقَّ عبادتِک» (تضمین - تلمیح)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تضمین", isCorrect: true },
                { text: "تلمیح", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 60,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "زمین را از آسمان نثار است و آسمان را از زمین غبار (تضاد - اغراق)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تضاد", isCorrect: true },
                { text: "اغراق", isCorrect: false },
              ],
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
          number: 36,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به شعر «پروانه و شمع و گل شبی آشفتند / در طرف چمن؛ وز جور و جفای دهر با هم گفتند / بسیار سخن؛ شد صبح، نه پروانه به جا بود و نه شمع / ناگاه صبا؛ بر گل بوزید و هر دو با هم رفتند / من ماندم و من» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 106,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب شعر چیست؟",
              },
              correctAnswer: { accepted: ["مستزاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 106,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "این قالب در دورهٔ مشروطه ظهور پیدا کرد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 111,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "وز جور و " },
                    { kind: "highlight", value: "جفای دهر" },
                    { kind: "text", value: " با هم گفتند" },
                  ],
                },
                questionText: "یک آرایهٔ ادبی برای ترکیب مشخص‌شده بنویسید.",
              },
              correctAnswer: {
                accepted: ["استعاره", "استعارهٔ مکنیه", "استعاره مکنیه", "اضافهٔ استعاری", "اضافه استعاری", "تشخیص"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به اشعار زیر پاسخ دهید: ۱) «گر این چنین به خاک وطن، شب سحر کنم / خاک وطن چو رفت، چه خاکی به سر کنم؟» — میرزادهٔ عشقی؛ ۲) «آتش حبّ‌الوطن چو شعله فروزد / از دل مؤمن کند به مجمره اسپند» — ادیب‌الممالک فراهانی؛ ۳) «بگشود گره ز زلف زر تار / محبوبهٔ نیلگون عماری» — علی‌اکبر دهخدا؛ ۴) «از خون جوانان وطن لاله دمیده / از ماتم سروقدشان سرو خمیده» — عارف قزوینی.",
          parts: [
            {
              label: "الف",
              pageRef: 37,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "«درون‌مایهٔ» کدام بیت با سایر بیت‌ها متفاوت است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بیت ۱", isCorrect: false },
                { text: "بیت ۲", isCorrect: false },
                { text: "بیت ۳", isCorrect: true },
                { text: "بیت ۴", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 27,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«مشبّه‌به» را در مصراع اولِ بیت شمارهٔ ۲ مشخص کنید.",
              },
              correctAnswer: { accepted: ["آتش"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 18,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک عبارت کنایی در بیت شمارهٔ ۱ بیابید.",
              },
              correctAnswer: {
                accepted: ["چه خاکی به سر کنم", "شب سحر کنم", "خاک وطن چو رفت"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              pageRef: 18,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "شاعرِ بیت ۴ از شاعران وطنی و از موسیقی‌دانان بزرگ عهد مشروطیّت است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "هـ",
              pageRef: 43,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "با توجّه به واژه‌های مشخص‌شده در بیت‌های شمارهٔ ۲ و ۳، کدام ویژگیِ زبانیِ شعرِ «دورهٔ بیداری» دیده می‌شود؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "۲) آتش حبّ‌الوطن چو شعله فروزد / از دل مؤمن کند به " },
                      { kind: "highlight", value: "مجمره اسپند" },
                    ],
                    [
                      { kind: "text", value: "۳) بگشود گره ز زلف زر تار / " },
                      { kind: "highlight", value: "محبوبهٔ نیلگون عماری" },
                    ],
                  ],
                },
              },
              correctAnswer: {
                accepted: ["توجّه به واژگان کهن", "توجه به واژگان کهن", "واژگان کهن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          pageRef: 103,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به متن «این تنگ‌عیشی برای او (مولوی) نوعی ریاضت نفسانی بود؛ ناشی از خشک‌دستی نبود. از زندگی فقط به قدر ضرورت تمتّع می‌برد. بیش از قدر ضرورت را موجب دور افتادن از خط سیر روحانی خویش می‌یافت.» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "مفهوم عبارت کناییِ «خشک‌دستی» چیست؟",
              },
              correctAnswer: { accepted: ["خسیس بودن", "خسّت", "خست", "بخل", "بخیل بودن"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر معنی یا مفهوم هم‌ارزِ «خسیس بودن / خسّت / بخل» مطابق راهنمای تصحیح پذیرفته شود.",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از گزینه‌ها از ویژگی‌های متن بالا است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "وجود واژگان عربی در متن", isCorrect: true },
                { optionKey: "۲", text: "کاربرد مفاهیم انتزاعی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 39,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به متن «توپخانه شروع کرده بود و صدای مهیب آن، صدای کودکانه امّا خشک کلاش را در خود هضم می‌کرد. مسلّم بود که در میان یا پشت نیروها شما را نمی‌شود پیدا کرد.» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 101,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "«استقبال از فرهنگ ایثار و شهادت» از مضامین فکریِ این متن است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 80,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از گزینه‌های زیر از آثار «سیدمهدی شجاعی» نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "دو کبوتر، دو پنجره، یک پرواز", isCorrect: false },
                { optionKey: "۲", text: "ملاقات در شب آفتابی", isCorrect: true },
                { optionKey: "۳", text: "کشتی پهلوگرفته", isCorrect: false },
                { optionKey: "۴", text: "جای پای خون", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 40,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به متن زیر از «دهخدا» پاسخ دهید: «... وای وای! الهی روده‌ات ببره، چقدر حرف می‌زنی؟! حوصلم سر رفت! آفتابه‌لگن شش دست، شام و ناهار هیچی! گفت: نخور، عسل و خربزه با هم نمی‌سازند! نشنید و خورد. یک ساعت دیگر یارو را دید؛ مثل مار به خودش می‌پیچید. گفت: نگفتم نخور، این دو تا با هم نمی‌سازند؟ گفت: حالا که این دو تا خوب با هم ساخته‌اند که من یکی را از میان بردارند!...»",
          parts: [
            {
              label: "الف",
              pageRef: 21,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از ویژگی‌ها در متن بالا نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "عامیانه‌نویسی", isCorrect: false },
                { text: "تکلّف", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 21,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک نمونه ضرب‌المثلِ به‌کاررفته در متن بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "آفتابه لگن شش دست، شام و ناهار هیچی",
                  "آفتابه‌لگن شش دست، شام و ناهار هیچی",
                  "آفتابه لگن شش دست شام و ناهار هیچی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 21,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "مفهومِ «درد شدید داشتن» از کدام عبارت برداشت می‌شود؟",
              },
              correctAnswer: {
                accepted: ["مثل مار به خودش می‌پیچید", "مثل مار به خودش می پیچید"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              pageRef: 20,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "مجموعهٔ نوشته‌های طنزآمیزِ سیاسی - اجتماعیِ این نویسنده چه نام دارد؟",
              },
              correctAnswer: { accepted: ["چرند و پرند", "چرند پرند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
