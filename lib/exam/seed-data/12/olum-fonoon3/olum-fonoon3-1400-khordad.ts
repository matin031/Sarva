import { blank1, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی خرداد ۱۴۰۰ (انسانی و معارف)
 * Source: Khordad-1400-FonunAdabi3-[www.konkur.in].pdf — ۴ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 *
 * متن سؤال‌ها، گزینه‌ها، بارم‌ها و پاسخ‌ها از روی خودِ برگه و راهنمای رسمی تصحیح رونویسی شده‌اند.
 * نوع هر بخش بر اساس ماهیت پاسخ انتخاب شده تا در آزمون آنلاین سروا رندر مناسب داشته باشد.
 * پاسخ‌های باز فقط بر پایهٔ عبارت‌های پذیرفته‌شده در راهنمای رسمی ثبت شده‌اند.
 *
 * بازبینی نهایی در سه گذر انجام شده است:
 * ۱) متن، ابیات و گزینه‌ها با ۴ صفحهٔ سؤال؛
 * ۲) پاسخ‌ها، بارم‌ها و ارجاع صفحات با ۲ صفحهٔ راهنمای تصحیح؛
 * ۳) شماره‌ها، جمع بارم هر بخش و کل آزمون، نوع رندر و موارد اختلافی سؤال/کلید.
 */
export const olumFonoon3Khordad1400: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۰",
  examSession: "olum-fonoon-1400-khordad",
  totalScore: 20,
  sourcePdf: "Khordad-1400-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          layoutPattern: "bracket-choice-mcq",
          instruction: "واژهٔ مناسب را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 19,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "اوّلین کسی که در ایران به نوشتن نمایشنامهٔ فارسی پرداخت، (میرزا آقا تبریزی – میرزا جهانگیرخان صور اسرافیل) بوده است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "میرزا آقا تبریزی", isCorrect: true },
                { text: "میرزا جهانگیرخان صور اسرافیل", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 73,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "اوّلین رمان اجتماعی را «مرتضی مشفق کاظمی» در سال ۱۳۰۱ با نام (شمس و طغرا – تهران مخوف) منتشر کرد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "شمس و طغرا", isCorrect: false },
                { text: "تهران مخوف", isCorrect: true },
              ],
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
                questionText: "کدام‌یک از جملات زیر، درست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "شاعران جریان «سمبولیسم اجتماعی» یا «شعر نو حماسی» بیشتر به مسائل سیاسی، اجتماعی، مشکلات و آرمان‌های مردم توجّه دارند.",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "«سید محمّدعلی جمال‌زاده» را با مجموعه داستان «تلخ و شیرین» آغازگر داستان‌نویسی فارسی به شیوهٔ نوین می‌دانند.",
                  isCorrect: false,
                },
              ],
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
                questionText: "نثر پرشتاب و بریده‌بریدهٔ کدام نویسنده را با عنوان «نثر تلگرافی» یاد می‌کنند؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اسماعیل فصیح", isCorrect: false },
                { optionKey: "ب", text: "جلال آل احمد", isCorrect: true },
                { optionKey: "ج", text: "محمود دولت‌آبادی", isCorrect: false },
                { optionKey: "د", text: "هوشنگ گلشیری", isCorrect: false },
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
                questionText: "یک اثر از «مهدی اخوان ثالث» نام ببرید.",
              },
              correctAnswer: {
                accepted: [
                  "آخر شاهنامه",
                  "زمستان",
                  "از این اوستا",
                  "در حیاط کوچک پاییز در زندان",
                  "ارغنون",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای رسمی «آخر شاهنامه»، «زمستان» و «از این اوستا» را ذکر کرده و تصریح کرده است که «در حیاط کوچک پاییز در زندان» یا «ارغنون» نیز پذیرفته می‌شود.",
            },
          ],
        },
        {
          number: 5,
          instruction: "کدام‌یک از موارد ستون «ب» به جمله‌های ستون «الف» مربوط است؟ [یک مورد در ستون «ب» اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "۱",
                    text: "روح حماسی اشعار دوران مقاومت که با موجی از عرفان آمیخته شده است، موجب تحوّل و دگرگونی زبان و ............... می‌شود.",
                  },
                  {
                    id: "۲",
                    text: "سال‌های پس از جنگ، دوران اوج شکوفایی ............... در ایران بود.",
                  },
                ],
                columnB: [
                  { id: "الف", text: "رمان‌نویسی" },
                  { id: "ب", text: "ترجمهٔ داستان" },
                  { id: "ج", text: "محتوای شعر" },
                ],
              },
              correctAnswer: { "۱": "ج", "۲": "الف" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: ۱) محتوای شعر، ص ۷۶؛ ۲) رمان‌نویسی، ص ۷۹.",
            },
          ],
        },
        {
          number: 6,
          pageRef: 17,
          parts: [
            {
              type: "open-error-correction-in-passage",
              score: 0.25,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "عرصهٔ هنر «عارف قزوینی» تصنیف‌ها و ترانه‌های میهنی‌ای بود که در برانگیختن مردم و آزادی‌خواهی نقش بسیار مؤثّری داشت. او مضامین طنز و ستیز با نادانی را با آوازی زیبا و پرشور می‌خواند.",
                ),
              },
              correctAnswer: { wrongWord: "طنز", correctWord: "وطن‌دوستی" },
              acceptedAnswers: { correctWord: ["وطن‌دوستی", "وطن دوستی"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: به جای «طنز»، واژهٔ «وطن‌دوستی» درست است.",
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
          pageRef: 43,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "در بیت زیر از «ملک‌الشعرای بهار»، کاربرد واژهٔ مشخّص‌شده، جزء کدام سطح از سبک شعر در «دورهٔ بازگشت و بیداری» است؟",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "بشکن در دوزخ و برون ریز " },
                    { kind: "highlight", value: "بادافره" },
                    { kind: "text", value: " کفر کافری چند" },
                  ],
                },
              },
              correctAnswer: { accepted: ["زبانی", "سطح زبانی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          layoutPattern: "list-of-parallel-blanks",
          instruction: "در جاهای خالی، کلمات مناسب بنویسید.",
          parts: [
            {
              label: "الف",
              pageRef: 101,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "اندیشهٔ حاکم بر داستان‌های دههٔ اوّل پس از پیروزی انقلاب، ابتدا سیاسی و در مرحلهٔ بعد، ",
                  "q8a",
                  " است.",
                ),
              },
              correctAnswer: { accepted: ["اجتماعی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 99,
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "در شعر سنّتی دورهٔ انقلاب اسلامی تقلید از سبک عراقی و ",
                  "q8b",
                  " و تمایل به آن‌ها زیاد است.",
                ),
              },
              correctAnswer: { accepted: ["خراسانی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 96,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "کدام‌یک از ویژگی‌های زیر، «وجه اشتراک» سطح زبانی شعر «دورهٔ بازگشت و بیداری» و «دورهٔ معاصر تا انقلاب اسلامی» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "کم‌توجّهی به کاربرد جمله‌ها و ترکیبات زبانی در شعر", isCorrect: false },
                { optionKey: "ب", text: "آشنایی‌زدایی زبانی و روی آوردن به ترکیبات بدیع", isCorrect: false },
                { optionKey: "ج", text: "سادگی و روانی زبان شعر", isCorrect: true },
              ],
              sourceNote: "راهنمای تصحیح برای این پاسخ به صفحات ۹۶ و ۴۲ کتاب ارجاع داده است.",
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
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از عبارت‌های زیر بیانگر ویژگی «سطح ادبی» سبک نثر دورهٔ بیداری است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "یکی از ضعف‌های تکنیکی در اغلب داستان‌های دوران مشروطه، حضور راوی سوم شخص در بعضی صحنه‌های داستان است.",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "بسیاری از نثرهای دورهٔ بیداری به‌ویژه نثر داستانی به موضوع تنفّر از خرافات می‌پردازد.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 11,
          layoutPattern: "multi-subquestion",
          instruction: "هر یک از جملات زیر، مربوط به کدام‌یک از ویژگی‌های «زبانی، ادبی، فکری» است؟",
          parts: [
            {
              label: "الف",
              pageRef: 101,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در دههٔ هشتاد شاهد داستانک‌نویسی (مینی‌مال) و مدرن‌نویسی هستیم.",
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
            {
              label: "ب",
              pageRef: 97,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "موضوع شعر در ادبیات معاصر، محدود نیست و بسیار تنوّع دارد و شاعر برای انتخاب موضوع آزاد است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: false },
                { text: "ادبی", isCorrect: false },
                { text: "فکری", isCorrect: true },
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
          pageRef: 24,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از ابیات زیر، دو برش آوایی دارد (با دو وزن خوانده می‌شود)؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "ماه فرو ماند از جمال محمّد / سرو نباشد به اعتدال محمّد",
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
          number: 13,
          layoutPattern: "multi-subquestion",
          instruction: "برای هر یک از ابیات زیر، یکی از وزن‌های «ناهمسان، همسان یک‌پایه‌ای، همسان دولختی» را انتخاب کنید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بی تو در کلبهٔ گدایی خویش / رنج‌هایی کشیده‌ام که مپرس",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ناهمسان", isCorrect: true },
                { text: "همسان یک‌پایه‌ای", isCorrect: false },
                { text: "همسان دولختی", isCorrect: false },
              ],
              sourceNote: "راهنمای تصحیح برای این بیت به ادامهٔ غزل در صفحهٔ ۲۲ کتاب اشاره کرده است.",
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "گفتی به غمم بنشین یا از سر جان برخیز / فرمان برمت جانا، بنشینم و برخیزم",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ناهمسان", isCorrect: false },
                { text: "همسان یک‌پایه‌ای", isCorrect: false },
                { text: "همسان دولختی", isCorrect: true },
              ],
            },
            {
              label: "ج",
              pageRef: 50,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نسیم صبح را گفتم که با او جانبی داری / کز آن جانب که او باشد، صبا عنبرفشان آید",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ناهمسان", isCorrect: false },
                { text: "همسان یک‌پایه‌ای", isCorrect: true },
                { text: "همسان دولختی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 14,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «در دام فتاده آهویی چند / محکم شده دست و پای در بند» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 52,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "چرا مصوّت بلند /و/ در کلمهٔ «آهو» کوتاه تلفّظ شده است؟",
              },
              correctAnswer: {
                accepted: [
                  "چون بعد از مصوت بلند و مصوت آمده است",
                  "چون بعد از مصوّت بلند و، مصوّت آمده است",
                  "به دلیل آمدن مصوت بعد از مصوت بلند و",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ باید همان علت رسمی را برساند: بعد از مصوّت بلند /و/، مصوّت آمده است.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 52,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شاعر در واژهٔ «آهو» از کدام اختیار شاعری استفاده کرده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "وزنی", isCorrect: false },
                { text: "زبانی", isCorrect: true },
              ],
            },
            {
              label: "ج",
              pageRef: 52,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "چند هجای کشیده (بدون توجّه به اختیارات شاعری) در بیت وجود دارد؟",
              },
              correctAnswer: { accepted: ["۴", "4", "چهار"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 54,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در کدام واژهٔ بیت زیر، مصوّت بلند «ی» همواره کوتاه است؟",
                stimulus: poemLines(
                  "به دشت دل گیاهی جز گل رویت نمی‌روید",
                  "من این زیبا زمین را آزمودم میهن ای میهن!",
                ),
              },
              correctAnswer: { accepted: ["گیاه", "گیاهی"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای رسمی پاسخ را «گیاه» آورده است.",
            },
          ],
        },
        {
          number: 16,
          pageRef: 26,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "برای بیت زیر کدام وزن ترجیح ندارد؟",
                stimulus: poemLines(
                  "دل گفت وصالش به دعا باز توان یافت",
                  "عمری است که عمرم همه در کار دعا رفت",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مفعولُ مفاعیلُ مفاعیلُ فعولن", isCorrect: true },
                { optionKey: "ب", text: "مستفعلُ مستفعلُ مستفعلُ مستف", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 17,
          pageRef: 85,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText:
                  "در کدام رکن از بیت «چو بشنوی سخن اهل دل مگو که خطاست / سخن‌شناس نه‌ای جان من خطا اینجاست» اختیار شاعری «ابدال» به کار رفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "رکن پایانی مصراع دوم",
                  "رکن آخر مصراع دوم",
                  "آخرین رکن مصراع دوم",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 107,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نام بحر کدام‌یک از ابیات زیر، «رمل مثمّن سالم» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "هر که چیزی دوست دارد، جان و دل بر وی گمارد / هر که محرابش تو باشی، سر ز خلوت برنیارد",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "شیرمردی باید این ره را شگرف / زان که ره دور است و دریا ژرف ژرف",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 19,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به بیت «یاد باد آنکه ز ما وقت سفر یاد نکرد / به وداعی دل غمدیدهٔ ما شاد نکرد» پاسخ دهید.",
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
                "راهنمای رسمی، تقطیع هجایی هر دو مصراع را به‌صورت جدول آورده است؛ برای جلوگیری از خطای تبدیل جدول عروضی به متن، این قسمت manual نگه داشته شده است.",
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
                "راهنمای رسمی نشانه‌های هجایی هر دو مصراع را در جدول پاسخ سؤال ۱۹ نمایش داده است؛ برای حفظ دقّت، این قسمت manual است.",
            },
            {
              label: "ج",
              pageRef: 84,
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                questionText: "وزن بیت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "فاعلاتن فعلاتن فعلاتن فعلن",
                  "فعلاتن فعلاتن فعلاتن فعلن",
                  "فاعلاتن (فعلاتن) فعلاتن فعلاتن فعلن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای رسمی وزن را «فاعلاتن (فعلاتن) فعلاتن فعلاتن فعلن» ثبت کرده است.",
            },
          ],
        },
        {
          number: 20,
          layoutPattern: "multi-subquestion",
          instruction: "نام «قالب» هر یک از اشعار زیر را بنویسید.",
          parts: [
            {
              label: "الف",
              pageRef: 104,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب شعر زیر چیست؟",
                stimulus: text(
                  "«می‌تراود مهتاب / می‌درخشد شب‌تاب / نیست یک دم شکند خواب به چشم کس و لیک / غم این خفتهٔ چند / خواب در چشم ترم می‌شکند»",
                ),
              },
              correctAnswer: { accepted: ["شعر نو", "شعر نو نیمایی", "شعر نو (نیمایی)", "نیمایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 106,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب شعر زیر چیست؟",
                stimulus: poemLines(
                  "هر لحظه به شکلی بت عیّار برآمد / دل برد و نهان شد",
                  "هر دم به لباسی دگر آن یار برآمد / گه پیر و جوان شد",
                ),
              },
              correctAnswer: { accepted: ["مستزاد"] },
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
          number: 21,
          instruction: "در هر یک از بیت‌های گروه «الف»، کدام آرایهٔ ادبی گروه «ب» به کار رفته است؟ [در ستون «ب» یک مورد اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "۱",
                    text: "حافظ از جور تو، حاشا که بگرداند روی / «من از آن روز که در بند توام آزادم»",
                  },
                  {
                    id: "۲",
                    text: "موج ز خود رفته‌ای نیز خرامید و گفت / هستم اگر می‌روم گر نروم نیستم",
                  },
                  {
                    id: "۳",
                    text: "برهنه چو تیغ تو بیند عقاب / نیارد به نخجیر کردن شتاب",
                  },
                  {
                    id: "۴",
                    text: "عشق چون آید برد هوش دل فرزانه را / دزد دانا می‌کشد اول چراغ خانه را",
                  },
                ],
                columnB: [
                  { id: "الف", text: "تضاد" },
                  { id: "ب", text: "تضمین" },
                  { id: "ج", text: "اسلوب معادله" },
                  { id: "د", text: "لف و نشر" },
                  { id: "هـ", text: "اغراق" },
                ],
              },
              correctAnswer: { "۱": "ب", "۲": "الف", "۳": "هـ", "۴": "ج" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای رسمی: ۱) تضمین، ۲) تضاد، ۳) اغراق، ۴) اسلوب معادله؛ «لف و نشر» مورد اضافی است.",
            },
          ],
        },
        {
          number: 22,
          layoutPattern: "bracket-choice-mcq",
          instruction: "برای هر یک از ابیات زیر، آرایهٔ مناسب را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 32,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "چون جواب احمق آمد خامشی / این درازی در سخن چون می‌کشی",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: true },
                { text: "حسن تعلیل", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 30,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "من مسلمانم، قبله‌ام یک گل سرخ / جانمازم چشمه، مهرم نور / دشت سجادهٔ من",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "متناقض‌نما", isCorrect: false },
                { text: "مراعات نظیر", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 23,
          pageRef: 113,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به بیت «نرگس همی رکوع کند در میان باغ / زیرا که کرد فاخته بر سرو مؤذّنی» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "شاعر چه دلیلی برای «رکوع گل نرگس» بیان کرده است؟",
              },
              correctAnswer: {
                accepted: [
                  "اذان گفتن فاخته بر روی سرو",
                  "شاعر علت رکوع گل نرگس را اذان گفتن فاخته بر روی سرو دانسته است",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ باید علت ادعایی شاعر را بیان کند: فاخته بر روی سرو اذان گفته است.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این آرایه و هنر شاعرانه چه نام دارد؟",
              },
              correctAnswer: { accepted: ["حسن تعلیل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 58,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «افروختن و سوختن و جامه دریدن / پروانه ز من، شمع ز من، گل ز من آموخت» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«لفّ اوّل» را بیابید.",
              },
              correctAnswer: { accepted: ["افروختن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نوع این «لف و نشر» را مشخص کنید.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مرتّب", isCorrect: false },
                { text: "نامرتّب (مشوّش)", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 25,
          pageRef: 61,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "با ذکر دلیل ثابت کنید در بیت زیر آرایهٔ «متناقض‌نما» به کار رفته است.",
                stimulus: poemLines(
                  "می‌خورم جام غمی هر دم به شادی رخت",
                  "خرّم آن کس کاو بدین غم شادمانی می‌کند",
                ),
              },
              correctAnswer: {
                accepted: [
                  "با غم شادمانی کردن تناقض دارد",
                  "نمی‌توان با غم شادمانی کرد",
                  "غم و شادمانی در این کاربرد با هم تناقض دارند",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "راهنمای رسمی دلیل را این می‌داند که «با غم شادمانی کردن» به شکل ادبی و هنرمندانه تناقض دارد و در واقعیت ناممکن است.",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 91,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «روی خوبت آیتی از لطف بر ما کشف کرد / زان زمان جز لطف و خوبی نیست در تفسیر ما» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام واژه، آرایهٔ «ایهام تناسب» را به وجود آورده است؟",
              },
              correctAnswer: { accepted: ["آیت", "آیتی"] },
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
                questionText: "این واژه با کدام کلمه در بیت، «تناسب» برقرار کرده است؟",
              },
              correctAnswer: { accepted: ["تفسیر"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 115,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به دو بیت زیر پاسخ دهید: ۱) «از صدای سخن عشق ندیدم خوش‌تر / یادگاری که در این گنبد دوّار بماند» ۲) «دل چو غافل شد ز حق، فرمان‌پذیر تن بود / می‌برد هر جا که خواهد اسب، خواب‌آلوده را»",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام بیت آرایهٔ «اسلوب معادله» وجود دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "بیت ۱", isCorrect: false },
                { optionKey: "۲", text: "بیت ۲", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "چگونه به وجود این آرایه در بیت پی برده‌اید؟ [ذکر یک دلیل کافی است]",
              },
              correctAnswer: {
                accepted: [
                  "هر یک از دو مصراع استقلال نحوی و معنایی دارند",
                  "مصراع دوم در حکم مصداق و تأییدی برای مصراع اول است",
                  "رابطه دو مصراع بر پایه تشبیه است",
                  "شاعر بر پایه تشبیه بین دو مصراع ارتباط معنایی برقرار کرده است",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "ذکر یکی از دلایل رسمی کافی است: استقلال نحوی و معنایی دو مصراع؛ مصداق/تأیید بودن مصراع دوم برای اول؛ یا برقرار بودن رابطهٔ معنایی بر پایهٔ تشبیه.",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 90,
          layoutPattern: "multi-subquestion",
          instruction: "در بیت «خانه زندان است و تنهایی ضلال / هر که چون سعدی گلستانیش نیست» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در کدام واژه، آرایهٔ «ایهام» به کار رفته است؟",
              },
              correctAnswer: { accepted: ["گلستان", "گلستانش", "گلستانیش"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "معانی مختلف این واژه را بنویسید.",
                fields: [
                  { id: "m1", label: "معنی ۱" },
                  { id: "m2", label: "معنی ۲" },
                ],
              },
              correctAnswer: {
                m1: ["باغ و گلزار", "باغ", "گلزار", "کتاب گلستان سعدی", "کتاب گلستان"],
                m2: ["باغ و گلزار", "باغ", "گلزار", "کتاب گلستان سعدی", "کتاب گلستان"],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "دو معنی متفاوت لازم است: «باغ و گلزار» و «کتاب گلستان سعدی». ترتیب مهم نیست.",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 114,
          layoutPattern: "multi-subquestion",
          instruction: "در سرودهٔ «با من بیا به خیابان / تا بشنوی بوی زمستانی که در باغ رخنه کرده است» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "آرایهٔ قسمت «بشنوی بوی زمستانی» چه نام دارد؟",
              },
              correctAnswer: { accepted: ["حس‌آمیزی", "حس آمیزی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "دلیل خود را برای وجود این آرایه بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "آمیختن حس بویایی و شنوایی",
                  "شاعر دو حس بویایی و شنوایی را آمیخته کرده است",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ باید به آمیختگی دو حس بویایی و شنوایی اشاره کند.",
              verified: true,
              sourceNote:
                "راهنمای تصحیح در متن پاسخ جزء «ب» عدد ۰٫۷۵ چاپ کرده، اما بارم کل سؤال در برگه و ستون نمرهٔ کلید ۰٫۷۵ است؛ بنابراین جزء ب = ۰٫۵ و جزء الف = ۰٫۲۵ در نظر گرفته شده است.",
            },
          ],
        },
      ],
    },

    // -------------------------------------------------- نقد و تحلیل نظم و نثر
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 4,
      questions: [
        {
          number: 30,
          layoutPattern: "multi-subquestion",
          instruction: "با توجّه به شعر زیر از «قیصر امین‌پور» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 100,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "یک مورد از ویژگی‌های «فکری» این سروده را بیان کنید.",
                stimulus: text(
                  "«سراپا اگر زرد و پژمرده‌ایم، ولی دل به پاییز نسپرده‌ایم / چو گلدان خالی لب پنجره، پر از خاطرات ترک‌خورده‌ایم / اگر داغ دل بود، ما دیده‌ایم؛ اگر خون دل بود، ما خورده‌ایم / اگر دل دلیل است، آورده‌ایم؛ اگر داغ شرط است، ما برده‌ایم»",
                ),
              },
              correctAnswer: {
                accepted: [
                  "استقامت و پایداری در دوران دفاع مقدس",
                  "سربلندی و افتخار",
                  "زنده نگه داشتن خاطرات دفاع مقدس",
                  "حفظ ارزش‌های دفاع مقدس",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "ذکر یکی از موارد رسمی کافی است: استقامت و پایداری در دفاع مقدس؛ سربلندی و افتخار؛ زنده نگه‌داشتن خاطرات؛ حفظ ارزش‌های دفاع مقدس.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 100,
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "مفهوم کنایی مصراع «اگر خون دل بود، ما خورده‌ایم» چیست؟",
              },
              correctAnswer: {
                accepted: ["غصّه خوردن", "غصه خوردن", "ناراحتی دیدن", "غم و ناراحتی دیدن"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "راهنمای رسمی: «خون دل خوردن» به مفهوم غصّه خوردن و ناراحتی دیدن است.",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به متن زیر از «سید مهدی شجاعی» پاسخ دهید: «وقتی بچّه‌هایی که می‌افتادند، خوابیده به سمت خاکریز نشانه می‌رفتند و آخرین رمق‌هایشان را در آخرین فشنگ‌هایشان می‌ریختند و شلیک می‌کردند. جایز نبود که من همچنان بی‌حرکت بمانم و فقط دنبال شما بگردم. آن قسمت خاکریز را که بیشتر آتش به پا می‌کرد، نشانه رفتم و یک خشاب فشنگم را درست در همان نقطهٔ آتش، خالی کردم و با خاموش شدن آن آتش که تیربار به نظر می‌آمد، نیرو گرفتم...»",
          parts: [
            {
              label: "الف",
              pageRef: 100,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو ویژگی «زبانی» برای این متن بنویسید.",
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: [
                  "بهره‌گیری از ساده‌نویسی",
                  "ساده‌نویسی",
                  "زبان داستان‌ها به ویژه در زمان جنگ بیشتر عامیانه است",
                  "زبان عامیانه",
                  "ورود واژه‌های مربوط به فرهنگ ایثار و شهادت و مبارزه و مقاومت",
                  "واژه‌های فرهنگ ایثار و شهادت و مبارزه و مقاومت",
                ],
                f2: [
                  "بهره‌گیری از ساده‌نویسی",
                  "ساده‌نویسی",
                  "زبان داستان‌ها به ویژه در زمان جنگ بیشتر عامیانه است",
                  "زبان عامیانه",
                  "ورود واژه‌های مربوط به فرهنگ ایثار و شهادت و مبارزه و مقاومت",
                  "واژه‌های فرهنگ ایثار و شهادت و مبارزه و مقاومت",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو ویژگی متفاوت از سه مورد رسمی لازم است: ساده‌نویسی؛ عامیانه‌تر شدن زبان داستان‌های زمان جنگ؛ ورود واژه‌های فرهنگ ایثار، شهادت، مبارزه و مقاومت.",
              verified: true,
              sourceNote: "راهنمای تصحیح: ذکر دو مورد کافی است؛ صفحات ۱۰۰ و ۱۰۱.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نویسنده، این متن را در چه قالبی نوشته است؟",
              },
              correctAnswer: { accepted: ["خاطره‌نویسی", "خاطره نویسی", "خاطره"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          pageRef: 71,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "شعر زیر سرودهٔ «نیما یوشیج» است؛ یک ویژگی برای آن ذکر کنید.",
                stimulus: text(
                  "«در شب تیره دیوانه‌ای کاو / دل به رنگی گریزان سپرده / در درّهٔ سرد و خلوت نشسته / همچو ساقهٔ گیاهی فسرده / می‌کند داستانی غم‌آور...»",
                ),
              },
              correctAnswer: {
                accepted: [
                  "تغییر در جایگاه قافیه",
                  "کوتاهی و بلندی مصراع‌ها",
                  "نگاه نو و نگرش عاطفی به واقعیات ملموس",
                  "سیر آزاد تخیل",
                  "نزدیکی به ادبیات نمایشی",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "ذکر یکی از ویژگی‌های رسمی شعر نیما در راهنمای تصحیح کافی است.",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 60,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "در سرودهٔ زیر کدام آرایه به کار نرفته است؟",
                stimulus: text(
                  "«رود می‌نالد / جغد می‌خواند / غم بیاویخته با رنگ غروب / می‌تراود ز لبم قصّهٔ سرد / دلم افسرده در این تنگ غروب»",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "برگهٔ سؤال و ستون نمرهٔ راهنمای تصحیح برای سؤال ۳۳ بارم ۰٫۵ دارند؛ در متن پاسخِ کلید کنار «گزینهٔ ج» عدد ۰٫۲۵ چاپ شده که با جمع بخش ۴ نمره‌ای سازگار نیست. بارم ۰٫۵ مطابق برگه و ستون نمره ثبت شده است.",
              options: [
                { optionKey: "الف", text: "استعارهٔ مکنیه", isCorrect: false },
                { optionKey: "ب", text: "حس‌آمیزی", isCorrect: false },
                { optionKey: "ج", text: "متناقض‌نما", isCorrect: true },
                { optionKey: "د", text: "جناس", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 34,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "متن زیر از «علی‌اکبر دهخدا» است؛ دو ویژگی «زبانی» آن را بیان کنید.",
                stimulus: text(
                  "«ننه، هان! این زمین روی چیه؟ روی شاخ گاو، گاو روی چیه؟ روی ماهی، ماهی روی چیه؟ روی آب، آب روی چیه؟ وای وای! الهی روده‌ات ببره، چقدر حرف می‌زنی؟! حوصلم سر رفت! آفتابه لگن شش دست، شام و ناهار هیچی! گفت نخور، عسل و خربزه با هم نمی‌سازند.»",
                ),
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: [
                  "ساده و قابل فهم بودن نثر",
                  "سادگی نثر",
                  "استفاده از عبارات عامیانه",
                  "عبارات عامیانه",
                  "کم بودن لغات و ترکیبات ناآشنای عربی",
                ],
                f2: [
                  "ساده و قابل فهم بودن نثر",
                  "سادگی نثر",
                  "استفاده از عبارات عامیانه",
                  "عبارات عامیانه",
                  "کم بودن لغات و ترکیبات ناآشنای عربی",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو ویژگی متفاوت از موارد رسمی لازم است: ساده و قابل فهم بودن نثر؛ استفاده از عبارات عامیانه؛ کم بودن لغات و ترکیبات ناآشنای عربی.",
              verified: true,
              sourceNote: "راهنمای تصحیح به صفحات ۲۱ و ۴۵ کتاب ارجاع داده است.",
            },
          ],
        },
        {
          number: 35,
          pageRef: 98,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو مورد از ویژگی‌های متن زیر از «جمال‌زاده» را بنویسید.",
                stimulus: text(
                  "«گفتم ای بابا، خدا را خوش نمی‌آید. این بدبخت‌ها سال آزگار یک‌بار برایشان چنین پایی می‌افتد و شکم‌ها را مدتی است صابون زده‌اند که کباب غاز بخورند و ساعت‌شماری می‌کنند. چطور است از منزل یکی از دوستان و آشنایان یک‌دست دیگر ظرف و لوازم عاریه بگیریم؟»",
                ),
                fields: [
                  { id: "f1", label: "ویژگی ۱" },
                  { id: "f2", label: "ویژگی ۲" },
                ],
              },
              correctAnswer: {
                f1: [
                  "بسیاری از واژه‌ها، کنایات و اصطلاحات عامیانه در آن به کار رفته است",
                  "کاربرد واژه‌ها، کنایات و اصطلاحات عامیانه",
                  "نثر داستانی تحت تأثیر زبان گفتار و محاوره است",
                  "زبان گفتار و محاوره",
                  "کوتاهی جملات و کاربرد افعال فراوان",
                  "کوتاهی جمله‌ها و فراوانی فعل",
                  "گونه‌های نثر فنی و مصنوع در آن جایگاهی ندارند",
                  "نبود نثر فنی و مصنوع",
                ],
                f2: [
                  "بسیاری از واژه‌ها، کنایات و اصطلاحات عامیانه در آن به کار رفته است",
                  "کاربرد واژه‌ها، کنایات و اصطلاحات عامیانه",
                  "نثر داستانی تحت تأثیر زبان گفتار و محاوره است",
                  "زبان گفتار و محاوره",
                  "کوتاهی جملات و کاربرد افعال فراوان",
                  "کوتاهی جمله‌ها و فراوانی فعل",
                  "گونه‌های نثر فنی و مصنوع در آن جایگاهی ندارند",
                  "نبود نثر فنی و مصنوع",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو ویژگی متفاوت از موارد رسمی لازم است: کاربرد واژه‌ها/کنایات/اصطلاحات عامیانه؛ تأثیر زبان گفتار و محاوره؛ کوتاهی جمله‌ها و فراوانی فعل؛ نبود گونه‌های نثر فنی و مصنوع.",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
