import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی شهریور ۱۴۰۲ (انسانی و معارف)
 * Source: Shahrivar-1402-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 * تاریخ درج‌شده روی برگه: ۱۴۰۲/۰۶/۰۴.
 *
 * متن سؤال‌ها از برگهٔ آزمون و پاسخ‌ها/بارم‌ها از راهنمای رسمی تصحیح استخراج شده‌اند.
 * سؤال‌های بسته exact_match و پاسخ‌های تشریحیِ دارای چند بیان پذیرفتنی ai_semantic هستند.
 */
export const olumFonoon3Shahrivar1402: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی شهریور ۱۴۰۲",
  examSession: "olum-fonoon-1402-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1402-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          pageRef: 12,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "انجمن ادبی خاقان برای رسیدن به هدف رهایی بخشیدن شعر فارسی از تباهی و انحطاط اواخر دورهٔ صفوی و دوره‌های بعد از آن، چه راهی را در پیش گرفت؟",
              },
              correctAnswer: {
                accepted: ["تقلید از آثار پیشینیان", "تقلید از پیشینیان", "تقلید"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 16,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: {
                  tokens: [
                    { kind: "text", value: "در دورهٔ بیداری، سیداشرف‌الدین گیلانی به " },
                    { kind: "blank", blankId: "b1" },
                    { kind: "text", value: " مشهور بود." },
                  ],
                },
              },
              correctAnswer: { accepted: ["نسیم شمال"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 17,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText:
                  "عبارت زیر معرّف کدام شخصیت ادبی دورهٔ بیداری است؟ «وی از شعرهای غربی نیز ترجمه‌هایی منظوم پدید آورده است که در نوع خود ابتکاری محسوب می‌شود. قطعهٔ «قلب مادر» یکی از آن نمونه‌هاست.»",
              },
              correctAnswer: { accepted: ["ایرج میرزا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 68,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "منظور از ادبیات معاصر، آثار ادبی هستند که پیش از مشروطه پدید آمده‌اند.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 70,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "شاعران این دوره، بهتر و هنری‌تر از گذشته به جوهر شعر دست یافتند.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 5,
          pageRef: 16,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "همهٔ گزینه‌ها، به جز کدام گزینه، از «آثار پژوهشی» محمدتقی بهار است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "تاریخ تطور نظم فارسی", isCorrect: false },
                { optionKey: "ب", text: "سبک‌شناسی", isCorrect: false },
                { optionKey: "پ", text: "تاریخ بیداری ایرانیان", isCorrect: true },
                { optionKey: "ت", text: "تاریخ مختصر احزاب سیاسی ایرانیان", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 70,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«پروین اعتصامی» در قصیده به سبک کدام شاعر، شعر می‌سراید؟",
              },
              correctAnswer: { accepted: ["ناصر خسرو", "ناصرخسرو"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          pageRef: 73,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "نثر داستانی معاصر در سال ۱۳۰۱ با کدام مجموعه داستان کوتاه آغاز شد؟",
              },
              correctAnswer: { accepted: ["یکی بود یکی نبود", "یکی بود، یکی نبود"] },
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
          number: 8,
          pageRef: 44,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه دربردارندهٔ «سطح فکری» شعر در دورهٔ بیداری نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای رسمی تصحیح، گزینهٔ ب را پاسخ اعلام کرده است؛ پاسخ دقیقاً مطابق کلید رسمی ثبت شده است.",
              options: [
                {
                  optionKey: "الف",
                  text: "نگرش شاعران و نویسندگان نسبت به جهان بیرون، از کلی‌نگری و ذهنیت‌گرایی به جزئی‌نگری و عینیت‌گرایی تغییر کرد.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "مفهوم آزادی در سخن شاعران و نویسندگان، بنیادی‌ترین تفکر و خواست مشروطه‌خواهان گردید.",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 9,
          pageRef: 46,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه یکی از ضعف‌های تکنیکی در اغلب داستان‌های دوران مشروطه به شمار می‌آید؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "گسترش یافتن نوگرایی و تجددخواهی", isCorrect: false },
                { optionKey: "ب", text: "تنفر از خرافات در نثر داستانی", isCorrect: false },
                { optionKey: "پ", text: "توجه به حقوق مدنی زنان", isCorrect: false },
                {
                  optionKey: "ت",
                  text: "حضور راوی سوم شخص و سخن گفتن او با خواننده در بعضی از صحنه‌ها",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 42,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه بیانگر «سطح ادبی» شعر در قرن‌های دوازدهم و سیزدهم است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "گرایش به قالب‌های کم‌کاربرد یا نوین به‌تدریج زمینه را برای ظهور شعر نو فراهم کرد.",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "شعر به عنوان زبان بُرندهٔ نهضت در اختیار روزنامه‌ها قرار گرفت.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 11,
          pageRef: 96,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "دربارهٔ سبک شعر دورهٔ معاصر تا انقلاب اسلامی، کدام گزینه نادرست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "تفکر شاعر، بیشتر زمینی و پیرامون امور دنیوی است.", isCorrect: false },
                { optionKey: "ب", text: "دست شاعر برای استفاده از همهٔ واژه‌ها بسته است.", isCorrect: true },
                { optionKey: "پ", text: "معنی‌گریزی، از ویژگی‌های شعر این دوره است.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 12,
          pageRef: 99,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "در شعر سنتی دورهٔ انقلاب اسلامی، تقلید از کدام دو سبک و تمایل به آن‌ها زیاد است؟",
                fields: [
                  { id: "s1", label: "سبک اول" },
                  { id: "s2", label: "سبک دوم" },
                ],
              },
              correctAnswer: {
                s1: ["عراقی", "سبک عراقی"],
                s2: ["خراسانی", "سبک خراسانی"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید رسمی پاسخ را به ترتیب «عراقی و خراسانی» ثبت کرده است.",
            },
          ],
        },
        {
          number: 13,
          pageRef: 100,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  "در سرودهٔ «اگر دشنهٔ دشمنان، گردنیم / اگر خنجر دوستان، گُرده‌ایم / گواهی بخواهید، اینک گواه / همین زخم‌هایی که نشمرده‌ایم» شاعر به کدام ویژگی «سطح فکری» شعر دورهٔ انقلاب اسلامی پرداخته است؟",
              },
              correctAnswer: {
                accepted: [
                  "پرداختن به فرهنگ دفاع مقدس",
                  "فرهنگ دفاع مقدس",
                  "دفاع مقدس",
                  "مقاومت و دفاع مقدس",
                  "ایثار و مقاومت",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 101,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام گزینه درست است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "تفکر انسان‌گرایانه، گاهی در برخی از آثار بعد از انقلاب به گونه‌ای کم‌رنگ مشاهده می‌شود.",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "اندیشهٔ حاکم بر داستان‌های دههٔ اول پس از پیروزی انقلاب، ابتدا اجتماعی و در مرحلهٔ بعد، سیاسی است.",
                  isCorrect: false,
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
          number: 15,
          pageRef: 23,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزن سومین پایهٔ آوایی در بیت «اگر چه حسن‌فروشان به جلوه آمده‌اند / کسی به حسن و ملاحت به یار ما نرسد» چیست؟",
              },
              correctAnswer: { accepted: ["مفاعلن", "مَفاعِلُن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          pageRef: 25,
          instruction: "نشانه‌های هجایی کدام گزینه را می‌توان به دوگونه، جدا و سازمان‌دهی کرد؟ وزن هر دو گونهٔ آن را بنویسید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "بیت درست را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "هر که تأمل نکند در جواب / بیشتر آید سخنش، ناصواب",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "زین خلق پرشکایت گریان شدم ملول / آن های هوی و نعرهٔ مستانم آرزوست",
                  isCorrect: true,
                },
              ],
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو وزنِ ممکنِ بیت انتخاب‌شده را بنویسید.",
                fields: [
                  { id: "w1", label: "وزن اول" },
                  { id: "w2", label: "وزن دوم" },
                ],
              },
              correctAnswer: {
                w1: ["مستفعلن مفاعل مستفعلن فعل", "مستفعلن مفاعل مستفعلن فعلْ"],
                w2: ["مفعول فاعلات مفاعیل فاعلن", "مفعولُ فاعلاتُ مفاعیلُ فاعلن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          pageRef: 22,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام‌یک از واژگان زیر با واژهٔ «چاهسار» هم‌وزن است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مردستان", isCorrect: false },
                { optionKey: "ب", text: "سکه‌زن", isCorrect: false },
                { optionKey: "پ", text: "زادسرو", isCorrect: true },
                { optionKey: "ت", text: "جوانمرد", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 18,
          pageRef: 49,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "چرا در خوانش مصراع «سعدی نظر از رویت کوته نکند هرگز» همزهٔ آغاز هجا حذف می‌شود؟",
              },
              correctAnswer: {
                accepted: [
                  "زیرا قبل از همزهٔ آغاز هجا، صامت ر آمده است.",
                  "زیرا همزه بین یک صامت و مصوت قرار گرفته است.",
                  "همزه بین صامت و مصوت قرار گرفته است.",
                  "قبل از همزه صامت ر آمده است.",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          instruction: "با توجه به بیت «سوی لشکر آفریدون شدند / ز نزدیک ضحاک بیرون شدند» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 53,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "به چه دلیل واژهٔ «سو» به شکل «سُ» تلفظ می‌شود؟" },
              correctAnswer: {
                accepted: [
                  "زیرا واژهٔ سو به واژهٔ لشکر اضافه شده است.",
                  "به دلیل اضافه شدن سو به لشکر",
                  "سو به لشکر اضافه شده است",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 50,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در پایه‌های آوایی اول و دوم مصراع نخست، چه نوع اختیار شاعری زبانی یکسانی به کار رفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "بلند تلفظ کردن مصوت کوتاه",
                  "تبدیل مصوت کوتاه به بلند",
                  "کسرهٔ اضافهٔ پایان واژهٔ سوی و لشکر بلند تلفظ شده است",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 50,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در مصراع «من و تو غافلیم و ماه و خورشید» کدام «واو» مصوت بلند به حساب نیامده است؟",
              },
              correctAnswer: {
                accepted: [
                  "واو سوم",
                  "سومین واو",
                  "آخرین واو",
                  "واو بعد از ماه",
                  "واو قبل از خورشید",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          instruction: "با در نظر گرفتن بیت «همین حکایت، روزی به دوستان برسد / که سعدی از پی جانان برفت و جان انداخت» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "مصراع دوم را تقطیع هجایی کنید." },
              correctAnswer: {
                accepted: [
                  "ک / سَع / د / یَز / پ / ی / جا / نان / ب / رَف / تُ / جا / نَن / داخت",
                  "ک سَع د یَز پ ی جا نان ب رَف تُ جا نَن داخت",
                  "که سعدی از پی جانان برفت و جان انداخت",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "تقسیم هجاها مطابق سطر پاسخِ راهنمای رسمی ثبت شده است.",
            },
            {
              label: "ب",
              pageRef: 83,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "در آخرین هجای بیت، کدام نوع اختیار شاعری به کار رفته است؟" },
              correctAnswer: {
                accepted: ["بلند بودن هجای پایانی مصراع", "هجای پایانی مصراع بلند است", "اختیار وزنی بلند بودن هجای پایانی مصراع"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "پ",
              pageRef: 85,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "اختیار شاعری وزنی مشترک هر دو مصراع را بنویسید." },
              correctAnswer: { accepted: ["ابدال"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 84,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام بیت، اختیار وزنی «آوردن فاعلاتن به جای فعلاتن» به کار رفته است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "یاد باد آن که ز ما وقت سفر یاد نکرد / به وداعی دل غمدیدهٔ ما شاد نکرد",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "یوسف گمگشته بازآید به کنعان غم مخور / کلبهٔ احزان شود روزی گلستان غم مخور",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 23,
          pageRef: 85,
          instruction: "شاعر در کدام رکن از مصراع‌های بیت «خسروان قبلهٔ حاجات جهانند ولی / سببش بندگی حضرت درویشان است» از اختیار وزنی «ابدال» استفاده کرده است؟",
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "رکنِ دارای «ابدال» را در هر مصراع بنویسید.",
                fields: [
                  { id: "m1", label: "مصراع اول" },
                  { id: "m2", label: "مصراع دوم" },
                ],
              },
              correctAnswer: {
                m1: ["رکن آخر مصراع اول", "رکن پایانی مصراع اول", "آخرین رکن مصراع اول"],
                m2: ["رکن آخر مصراع دوم", "رکن پایانی مصراع دوم", "آخرین رکن مصراع دوم"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 86,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "کاربرد قابلیت وزنی «قلب» بسیار کم است و تنها در کدام دو وزن رخ می‌دهد؟",
                fields: [
                  { id: "w1", label: "وزن اول" },
                  { id: "w2", label: "وزن دوم" },
                ],
              },
              correctAnswer: {
                w1: ["مفتعلن", "مُفتَعِلُن"],
                w2: ["مفاعلن", "مَفاعِلُن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          instruction: "با توجه به بیت «یاری اندر کس نمی‌بینیم یاران را چه شد؟ / دوستی کی آخر آمد، دوستداران را چه شد؟» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "مصراع اول را تقطیع هجایی کنید." },
              correctAnswer: {
                accepted: [
                  "یا / ر / یَن / دَر / کَس / نَ / می / بی / نیم / یا / ران / را / چ / شُد",
                  "یا ر یَن دَر کَس نَ می بی نیم یا ران را چ شُد",
                  "یاری اندر کس نمی‌بینیم یاران را چه شد",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 107,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "نام بحر عروضی بیت را بنویسید." },
              correctAnswer: { accepted: ["رمل مثمن محذوف", "بحر رمل مثمن محذوف"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 104,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "نیما یوشیج برای رهایی از تنگناهای عروضی، چگونه دست شاعر را در سرودن شعر بازگذاشت؟",
              },
              correctAnswer: {
                accepted: [
                  "قید تساوی هجاهای دو مصراع را برداشت.",
                  "تساوی هجاهای دو مصراع را برداشت",
                  "قید برابر بودن تعداد هجاهای دو مصراع را برداشت",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 108,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                questionText: "نشانه‌های هجایی مصراع دوم بیت «دریای هستی دم به دم / در چرخ و تاب و پیچ و خم» را بنویسید.",
              },
              correctAnswer: {
                accepted: ["--U-/--U-", "--u-/--u-", "– – U – / – – U –", "مستفعلن مستفعلن"],
              },
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
          number: 28,
          pageRef: 32,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بیت «یار بی‌پرده از در و دیوار / در تجلی است یا اولی‌الابصار» به کدام گزینه تلمیح دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "فَأَینَما تُوَلّوا فَثَمَّ وَجهُ اللهِ", isCorrect: true },
                { optionKey: "ب", text: "کُلُّ یَومٍ هُوَ فی شَأنٍ", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 33,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام بیت آرایهٔ ادبی «تضمین» به کار رفته است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "بیستون بر سر راه است مباد از شیرین خبری / گفته و غمگین دل فرهاد کنید",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "حافظ از جور تو حاشا که بگرداند روی / من از آن روز که در بند توام آزادم",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 30,
          pageRef: 62,
          instruction: "در بیت «دل و کشورت جمع و معمور باد / ز مُلکت پراکندگی دور باد» لف‌ها و نشرها را بیابید.",
          parts: [
            {
              label: "لف ۱",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "لف ۱ را بنویسید." },
              correctAnswer: { accepted: ["دل"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "لف ۲",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "لف ۲ را بنویسید." },
              correctAnswer: { accepted: ["کشور", "کشورت"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "نشر ۱",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نشر ۱ را بنویسید." },
              correctAnswer: { accepted: ["جمع"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "نشر ۲",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نشر ۲ را بنویسید." },
              correctAnswer: { accepted: ["معمور"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 63,
          parts: [
            {
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                questionText:
                  "در بیت «ز کوی یار می‌آید نسیم باد نوروزی / از این باد ار مدد خواهی چراغ دل برافروزی» به چه دلیل آرایهٔ ادبی «متناقض‌نما» دیده می‌شود؟",
              },
              correctAnswer: {
                accepted: [
                  "شاعر در مصراع دوم مدعی است با مدد گرفتن از باد نوروزی می‌توان چراغ دل را روشن کرد، در حالی که باد چراغ را خاموش می‌کند نه روشن.",
                  "باد معمولاً چراغ را خاموش می‌کند، اما شاعر آن را سبب روشن شدن چراغ دل دانسته است.",
                  "روشن کردن چراغ با باد امری محال و متناقض است.",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },

        {
          number: 32,
          pageRef: 31,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "مولانا در بیت «دی شیخ با چراغ همی‌گشت گرد شهر / کز دیو و دد ملولم و انسانم آرزوست» با کاربرد کدام آرایهٔ ادبی، معانی بسیاری را در کمترین واژه‌ها جای داده است؟",
              },
              correctAnswer: { accepted: ["تلمیح"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 94,
          parts: [
            {
              type: "short-text-answer",
              score: 0.75,
              content: { type: "short-text-answer", questionText: "در بیت «گویند روی سرخ تو سعدی که زرد کرد؟ / اکسیر عشق بر مسم افتاد و زر شدم» «ایهام تناسب» به‌کاررفته را توضیح دهید." },
              correctAnswer: { accepted: ["واژهٔ «روی» دو معنی «چهره» و «نوعی فلز» دارد؛ در بیت معنی «چهره» پذیرفتنی است و معنی «فلز» با «مس» و «زر» تناسب دارد.", "روی به معنی چهره در بیت آمده و معنی دیگر آن فلز است که با مس و زر تناسب دارد."] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 89,
          instruction: "با توجه به بیت «ارغوان جام عقیقی به سمن خواهد داد / چشم نرگس به شقایق نگران خواهد شد» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "کدام واژه ایهام دارد؟" },
              correctAnswer: { accepted: ["نگران"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: { type: "two-answer-text", questionText: "دو معنی واژهٔ «نگران» را بنویسید.", fields: [{ id: "m1", label: "معنی اول" }, { id: "m2", label: "معنی دوم" }] },
              correctAnswer: { m1: ["نگاه‌کننده", "نگرنده"], m2: ["دلواپس", "مضطرب", "آشفته"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          pageRef: 89,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "سعدی در بیت «بگذار تا بگریم چون ابر در بهاران / کز سنگ ناله خیزد روز وداع یاران» با کاربرد کدام آرایهٔ ادبی برای بزرگ‌نمایی در توصیف روز وداع یار، اوج احساسات و عواطف درونی خود را نشان داده است؟" },
              correctAnswer: { accepted: ["اغراق"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          instruction: "آرایه‌های «حسن تعلیل، حس‌آمیزی، اسلوب معادله و ایهام تناسب» را به ترتیب در بیت‌های داده‌شده مشخص کنید.",
          parts: [
            {
              label: "حسن تعلیل",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت دارای آرایهٔ «حسن تعلیل» است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "لب و دندان سنایی همه توحید تو گوید / مگر از آتش دوزخ بودش روی رهایی", isCorrect: false },
                { optionKey: "ب", text: "دخل بیجا همه جا در سخنم می‌آید / این مگس لازم شیرینی گفتار من است", isCorrect: false },
                { optionKey: "پ", text: "گریهٔ دائم سیاهی را نبرد از بخت من / زاغ را بسیاری باران نسازد پر سپید", isCorrect: false },
                { optionKey: "ت", text: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از روی لطیف تو حیا کرد", isCorrect: true },
              ],
            },
            {
              label: "حس‌آمیزی",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت دارای آرایهٔ «حس‌آمیزی» است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "لب و دندان سنایی همه توحید تو گوید / مگر از آتش دوزخ بودش روی رهایی", isCorrect: false },
                { optionKey: "ب", text: "دخل بیجا همه جا در سخنم می‌آید / این مگس لازم شیرینی گفتار من است", isCorrect: true },
                { optionKey: "پ", text: "گریهٔ دائم سیاهی را نبرد از بخت من / زاغ را بسیاری باران نسازد پر سپید", isCorrect: false },
                { optionKey: "ت", text: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از روی لطیف تو حیا کرد", isCorrect: false },
              ],
            },
            {
              label: "اسلوب معادله",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت دارای آرایهٔ «اسلوب معادله» است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "لب و دندان سنایی همه توحید تو گوید / مگر از آتش دوزخ بودش روی رهایی", isCorrect: false },
                { optionKey: "ب", text: "دخل بیجا همه جا در سخنم می‌آید / این مگس لازم شیرینی گفتار من است", isCorrect: false },
                { optionKey: "پ", text: "گریهٔ دائم سیاهی را نبرد از بخت من / زاغ را بسیاری باران نسازد پر سپید", isCorrect: true },
                { optionKey: "ت", text: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از روی لطیف تو حیا کرد", isCorrect: false },
              ],
            },
            {
              label: "ایهام تناسب",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت دارای آرایهٔ «ایهام تناسب» است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "لب و دندان سنایی همه توحید تو گوید / مگر از آتش دوزخ بودش روی رهایی", isCorrect: true },
                { optionKey: "ب", text: "دخل بیجا همه جا در سخنم می‌آید / این مگس لازم شیرینی گفتار من است", isCorrect: false },
                { optionKey: "پ", text: "گریهٔ دائم سیاهی را نبرد از بخت من / زاغ را بسیاری باران نسازد پر سپید", isCorrect: false },
                { optionKey: "ت", text: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از روی لطیف تو حیا کرد", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 37,
          instruction: "آرایهٔ مناسب هر بیت را از کمانک مقابل آن انتخاب کنید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "زمانه از ورق گل، مثال روی تو بست / ولی ز شرم تو در غنچه کرد پنهانش" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ایهام تناسب", isCorrect: false },
                { text: "حسن تعلیل", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "از صدای سخن عشق ندیدم خوشتر / یادگاری که در این گنبد دوّار بماند" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حس‌آمیزی", isCorrect: true },
                { text: "ایهام", isCorrect: false },
              ],
            },
            {
              label: "پ",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "سفر برون کند ز مرد، خامی‌ها / کباب، پخته نگردد مگر به گردیدن" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تضمین", isCorrect: false },
                { text: "اسلوب معادله", isCorrect: true },
              ],
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
          number: 38,
          pageRef: 16,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت را می‌توان نمونهٔ سرودهٔ انتقادی دورهٔ بیداری به شمار آورد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "پرستش به مستی است در کیش مهر / بروناند زین جرگه، هشیارها", isCorrect: false },
                { optionKey: "ب", text: "غلغلی انداختی در شهر تهران ای قلم / خوش حمایت می‌کنی از شرع قرآن ای قلم", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 39,
          pageRef: 20,
          instruction: "با توجه به متن زیر به پرسش‌ها پاسخ دهید: «... مخدوم مهربان من! از آن زمان که رشتهٔ مراودت حضوری گسسته و شیشهٔ شکیبایی از سنگ تفرقه و دوری شکسته، اکنون مدت دو سال افزون است که نه از آن طرف بَریدی و سلامی و نه از این جانب قاصدی و پیامی. طایر مکاتبات را پر بسته و کلبهٔ مراودات را در بسته ...»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "محوری‌ترین پیام متن چیست؟" },
              correctAnswer: { accepted: ["شکایت از دوری و عدم ارتباط با محبوب خود", "شکایت از دوری و عدم ارتباط با محبوب", "شکایت از دوری"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نوع ترکیب «کلبهٔ مراودات» را بنویسید." },
              correctAnswer: { accepted: ["ترکیب اضافی", "اضافهٔ تشبیهی", "اضافه تشبیهی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "پ",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "نمونه‌ای از «سجع» در متن بیابید و بنویسید." },
              correctAnswer: { accepted: ["گسسته و شکسته", "بَریدی و سلامی / قاصدی و پیامی", "پر بسته و در بسته"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ت",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "چند «اضافهٔ تشبیهی» در متن به کار رفته است؟" },
              correctAnswer: { accepted: ["۶", "6", "شش"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 40,
          instruction: "شعر زیر را بخوانید و به پرسش‌ها پاسخ دهید: من نمازم را وقتی می‌خوانم / که اذانش را باد گفته باشد / سر گلدستهٔ سرو / من نمازم را پی تکبیرةالاحرام علف می‌خوانم / پی قد قامت موج / کعبه‌ام بر لب آب / کعبه‌ام زیر اقاقی‌هاست ...",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "درونمایهٔ منظومهٔ بالا چیست؟" },
              correctAnswer: { accepted: ["همهٔ موجودات تسبیح خداوند را می‌گویند", "تسبیح خداوند توسط همهٔ موجودات", "تسبیح موجودات"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "یک استعارهٔ مکنیّه (بالکنایه) در شعر بالا بیابید و بنویسید." },
              correctAnswer: { accepted: ["باد اذان می‌گوید", "اذان گفتن باد", "تکبیرةالاحرام علف", "قد قامت موج"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "پ",
              pageRef: 107,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "اولین رکن عروضی منظومهٔ بالا چیست؟" },
              correctAnswer: { accepted: ["فاعلاتن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 41,
          instruction: "در منظومهٔ «ققنوس، مرغ خوش‌خوان، آوازهٔ جهان / آواره مانده از وزش بادهای سرد / بر شاخ خیزران / بنشسته است فرد / بر گرد او به هر سر شاخی پرندگان / او ناله‌های گمشده ترکیب می‌کند...»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              content: { type: "short-text-answer", questionText: "دو ویژگی ادبی این سروده را بنویسید." },
              correctAnswer: { accepted: ["استفاده از نماد و کاربرد مراعات نظیر", "کاربرد نماد و مراعات نظیر", "استفاده از نماد و عدم تساوی طول مصراع‌ها", "مراعات نظیر و عدم تساوی طول مصراع‌ها"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "قالب این شعر چیست؟" },
              correctAnswer: { accepted: ["نیمایی", "شعر نو", "شعر نو نیمایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 42,
          instruction: "با خواندن دو منظومهٔ زیر به پرسش‌ها پاسخ دهید. ۱) به سان رهنوردانی که در افسانه‌ها گویند / گرفته کوله‌بار زاد ره بر دوش / فشرده چوب‌دست خیزران در مشت / گهی پرگوی و گه خاموش / در آن مه‌گون فضای خلوت افسانه‌گیشان راه می‌پویند / ما هم راه خود را می‌کنیم آغاز / سه ره پیداست ... من اینجا بس دلم تنگ است / و هر سازی که می‌بینم بدآهنگ است / بیا ره‌توشه برداریم / قدم در راه بی‌برگشت بگذاریم / ببینیم آسمان هر کجا آیا همین رنگ است؟ ۲) قایقی خواهم ساخت / خواهم انداخت به آب / دور خواهم شد از این خاک غریب / که در آن هیچ کسی نیست که در بیشهٔ عشق / قهرمانان را بیدار کند / قایق از تور تهی / و دل از آرزوی مروارید / همچنان خواهم راند ...",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "هر دو شاعر، از نظر قلمرو فکری، به طرح چه موضوع مشترکی پرداخته‌اند؟" },
              correctAnswer: { accepted: ["سفر به آرمان‌شهر", "سفر به مدینهٔ فاضله", "آرمان‌شهر", "مدینهٔ فاضله"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 107,
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "نام بحر عروضی منظومهٔ شمارهٔ یک چیست؟" },
              correctAnswer: { accepted: ["هزج", "بحر هزج"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 43,
          pageRef: 121,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "زاویهٔ دید نوشتهٔ زیر چیست؟ مینی‌بوس با سرعت نه چندان زیاد پیش می‌رفت. نگاه کردم به مناظر اطراف جاده و مزارع و خانه‌های روستایی، شکل و شمایل خانه‌های آنجا هم شبیه روستای خودمان بود و این تشابه مرا دلتنگ می‌کرد. کاش می‌شد گوشه‌ای بایستیم..." },
              correctAnswer: { accepted: ["اول شخص مفرد", "من راوی", "اول شخص"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
