import { blank1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، شهریور ۱۴۰۲ (کلیهٔ رشته‌ها)
 * تاریخ برگه: ۱۴۰۲/۰۶/۰۲ — ساعت شروع ۹ صبح، ۹۰ دقیقه.
 * Source: Shahrivar-1402-Farsi3-_www_konkur_in_.pdf — ۴ صفحه سؤال + ۲ صفحهٔ
 * «راهنمای تصحیح» (کلید، شمارهٔ صفحهٔ کتاب را هم دارد؛ همهٔ pageRefها از آن آمده‌اند).
 *
 * هر صفحه جداگانه با کیفیت بالا رندر و سؤال‌به‌سؤال با کلید تطبیق داده شد؛ زیرخط‌ها از
 * روی تصویر خوانده شدند.
 *
 * نکته‌هایی که موقعِ خواندنِ این فایل لازم است:
 *
 * ۱. **بارم‌ها.** قلمرو زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰ (سؤال ۳۵، «نثر ساده و روان»، ۴ نمره و
 *    هشت زیربخش دارد: ۰٫۲۵ + ۰٫۵×۶ + ۰٫۷۵).
 *
 * ۲. **جایی که برگه «بنویسید» می‌گوید و اینجا چیز دیگری آمده.** هیچ سؤالی به فهرست بازشو
 *    تبدیل نشد. تنها تغییر شکل: سؤال ۲۲ («نام آفرینندگان آثاری که نویسنده‌شان نادرست است») به
 *    یک جوابِ متنی با تصحیح نیمه‌خودکار ماند، نه دو فیلد جدا، چون فیلدِ جدا برای هر اثر لو
 *    می‌داد کدام دو اثر اشتباه‌اند (جزئیات در sourceNote).
 *
 * ۳. **سؤال‌های دوبخشیِ بدون برچسب روی برگه** (۱۰): کلید دو نمرهٔ ۰٫۲۵ جدا می‌دهد (نوع
 *    وابستهٔ وابسته + نمودار پیکانی)، پس دو part «الف/ب» شد؛ برچسب‌ها ساختگی‌اند.
 *
 * ۴. **سؤال ۲۵** روی برگه «ابیات را کامل کنید» است، ولی سه مصراع شماره‌دار (یکی اضافی)
 *    خودِ برگه داده؛ به تطبیق با یک مورد اضافی تبدیل شد (بدون تغییر در کلید).
 *
 * هیچ سؤالی `verified: false` ندارد.
 */
export const farsi3Shahrivar1402: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی شهریور ۱۴۰۲",
  examSession: "farsi-1402-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1402-Farsi3-_www_konkur_in_.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 109,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "واژهٔ «سورت» در مصراع «سورت سرمای دی بیدادها می‌کرد.» در کدام معنا به کار نرفته است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "تندی", isCorrect: false },
                { optionKey: "ب", text: "سرعت", isCorrect: true },
                { optionKey: "ج", text: "شدّت", isCorrect: false },
                { optionKey: "د", text: "حدّت", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 2,
          instruction: "هر یک از واژه‌های مشخّص‌شده را در عبارت زیر معنا کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 35,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("بگرای چو اژدهای ", "گرزه", "w2a", ""),
              },
              correctAnswer: { w2a: ["ویژگی نوعی مار سمی و خطرناک", "مار سمی", "مار سمی و خطرناک"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 110,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("شیرمرد عرصهٔ ناوردهای ", "هول", "w2b", ""),
              },
              correctAnswer: { w2b: ["وحشتناک و ترسناک", "وحشت‌انگیز و ترسناک", "ترسناک", "وحشتناک"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 14,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "یکی از صاحب‌دلان سر به ",
                  "جیب",
                  "w2c",
                  " مراقبت فرو برده بود.",
                ),
              },
              correctAnswer: { w2c: ["گریبان", "یقه", "گریبان، یقه"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          instruction: "در بیت‌های زیر، «غلط‌های املایی» را مشخّص کنید و شکل صحیح آن‌ها را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 36,
              content: {
                type: "open-error-correction-in-passage",
                passage: text("صریر ملک، عطا داد کردگار تو را / به جای خویش دهد هر چه کردگار دهد"),
              },
              correctAnswer: { wrongWord: "صریر", correctWord: "سریر" },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 104,
              content: {
                type: "open-error-correction-in-passage",
                passage: text("چنان آمد اسپ و قبای سوار / که گفتی ثمن داشت اندر کنار"),
              },
              correctAnswer: { wrongWord: "ثمن", correctWord: "سمن" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          pageRef: 128,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام عبارت، «غلط املایی» وجود دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: ج («وجح» به‌جای «وجه»).",
              options: [
                {
                  optionKey: "الف",
                  text: "پادشاهی به درویشی گفت: که مرا آن لحظه که تو را به درگاه حق، تجلّی و قرب باشد، یاد کن.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "یکی از حضّار که کبّادهٔ شعر و ادب می‌کشید، چنان محظوظ گردیده بود که جلو رفته جبههٔ شاعر را بوسید.",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "اشتری و گرگی و روباهی از روی مصاحبت، مسافرت کردند و با ایشان از وجح ذات و توشه، گِرده‌ای بیش نبود.",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "دلم می‌خواهد بر بال‌های باد بنشینم و آنچه را که پروردگار جهان پدید آورده، زیر پا گذارم.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 5,
          instruction: "املای درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 104,
              content: {
                type: "mcq-inline",
                questionText: "چو او را بدیدند (برخاست / برخواست) غو / که آمد ز آتش برون شاه نو",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "برخاست", isCorrect: true },
                { text: "برخواست", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 10,
              content: {
                type: "mcq-inline",
                questionText:
                  "تو حکیمی، تو عظیمی، تو کریمی، تو رحیمی / تو نمایندهٔ فضلی تو سزاوار (ثنایی / سنایی)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ثنایی", isCorrect: true },
                { text: "سنایی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          instruction: "در گروه کلمات زیر، «غلط‌های املایی» را بیابید و شکل صحیح آن‌ها را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 0.75,
              pageRef: 169,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 3,
                items: [
                  { id: "i1", text: "کازیه و جاکاغذی" },
                  { id: "i2", text: "بقولات و حبوبات" },
                  { id: "i3", text: "انضمام و ضمیمه" },
                  { id: "i4", text: "طَبَق و سینی" },
                  { id: "i5", text: "طاق و سقف مُهدّب" },
                  { id: "i6", text: "تطاول و تعدّی" },
                  { id: "i7", text: "خُرد رفتن و ساییده شدن" },
                  { id: "i8", text: "قَلَیان و جوشش" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i5", "i7", "i8"],
                corrections: {
                  i5: "طاق و سقف محدّب",
                  i7: "خورد رفتن و ساییده شدن",
                  i8: "غلیان و جوشش",
                },
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote:
                "کلید: «طاق و سقف محدّب (۰٫۲۵، ص ۱۶۹)»، «خورد رفتن و ساییده شدن (۰٫۲۵، ص ۱۳۳)»، «غلیان و جوشش (۰٫۲۵، ص ۱۴۰)».",
            },
          ],
        },
        {
          number: 7,
          instruction: "در هر یک از ابیات زیر، نوع حذف فعل (قرینهٔ لفظی / معنایی) را مشخّص کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 13,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("کرم بین و لطف خداوندگار", "گنه بنده کرده است و او شرمسار"),
                questionText: "نوع حذف فعل را در بیت بالا مشخّص کنید.",
              },
              correctAnswer: { accepted: ["لفظی", "قرینهٔ لفظی", "به قرینهٔ لفظی", "حذف به قرینهٔ لفظی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 57,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines(
                  "ای جویبار جاری! زین سایه‌برگ مگریز",
                  "کاین‌گونه فرصت از کف دادند بی‌شماران",
                ),
                questionText: "نوع حذف فعل را در بیت بالا مشخّص کنید.",
              },
              correctAnswer: {
                accepted: [
                  "معنایی",
                  "معنوی",
                  "قرینهٔ معنایی",
                  "به قرینهٔ معنایی",
                  "حذف به قرینهٔ معنایی",
                  "به قرینهٔ معنوی",
                  "حذف به قرینهٔ معنوی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          pageRef: 85,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "در کدام بیت، هر دو نوع «و» (عطف و ربط) به کار رفته است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "چون رود امیدوارم بی‌تابم و بی‌قرارم / من می‌روم سوی دریا، جای قرار من و تو",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "ز نیرنگ هوا و از فریب آز خاقانی / دلت خُلد است خالی ساز از طاووس و شیطانش",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 9,
          pageRef: 53,
          instruction: "در عبارت زیر، نقش دستوری کلمات مشخّص‌شده را بنویسید.",
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "«آنگاه که آتش عشق او را " },
                    { kind: "highlight", value: "چنان" },
                    { kind: "text", value: " گرداند که همه " },
                    { kind: "highlight", value: "جهان" },
                    { kind: "text", value: "، آتش بیند.»" },
                  ],
                },
                questionText: "نقش دستوری کلمات مشخّص‌شده را، به ترتیب، بنویسید.",
                fields: [
                  { id: "f1", label: "نقش «چنان»" },
                  { id: "f2", label: "نقش «جهان»" },
                ],
              },
              correctAnswer: { f1: ["مسند"], f2: ["مفعول"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 73,
          instruction: "در جملهٔ زیر، نوعِ «وابستهٔ وابسته» را بنویسید و نمودار پیکانی آن را رسم کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«نگاه‌های مردم آسفالت‌نشین، آن را کهکشان می‌بیند.»"),
                questionText: "نوعِ «وابستهٔ وابسته» را بنویسید.",
              },
              correctAnswer: { accepted: ["صفت مضاف‌الیه", "صفتِ مضاف‌الیه", "صفت مضاف الیه"] },
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
                passage: text("«نگاه‌های مردم آسفالت‌نشین، آن را کهکشان می‌بیند.»"),
                nodes: [
                  { id: "n1", label: "نگاه‌های" },
                  { id: "n2", label: "مردم" },
                  { id: "n3", label: "آسفالت‌نشین" },
                ],
              },
              correctAnswer: {
                edges: [
                  { childId: "n2", parentId: "n1", label: "مضاف‌الیه" },
                  { childId: "n3", parentId: "n2", label: "صفت" },
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: نمودار گروه اسمی «نگاه‌های مردم آسفالت‌نشین» با دو پیکان (مردم ← نگاه‌ها: مضاف‌الیه؛ آسفالت‌نشین ← مردم: صفت).",
            },
          ],
        },
        {
          number: 11,
          pageRef: 139,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: { type: "mcq-inline", questionText: "در کدام گزینه، جملهٔ مرکّب وجود ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "تو که یک غاز بیشتر نیاورده‌ای و به همهٔ دوستانت هم وعدهٔ کباب غاز داده‌ای.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "گردنش مثل همان غاز مادر مرده‌ای بود که در همان ساعت در دیگ مشغول کباب شدن بود.",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "انسان حیوانی است گوشت‌خوار ولی این مخلوقات عجیب گویا استخوان‌خور خلق شده‌اند.",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "به قدری عصبانی شده بودم که چشمم جایی را نمی‌دید. از این بهانه‌تراشی‌هایش داشتم شاخ در می‌آوردم.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 12,
          pageRef: 103,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کاربرد معنایی فعلِ «شد» در کدام بیت متفاوت است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "پُر اندیشه شد جان کاووس کی / ز فرزند و سودابهٔ نیک‌پی",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "بدان گه که شد پیش کاووس باز / فرود آمد از باره، بردش نماز",
                  isCorrect: true,
                },
                {
                  optionKey: "ج",
                  text: "سراسر همه دشت بریان شدند / بر آن چهرِ خندانش گریان شدند",
                  isCorrect: false,
                },
                {
                  optionKey: "د",
                  text: "نخستین دمیدن سیه شد ز دود / زبانه برآمد پس از دود، زود",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 13,
          pageRef: 127,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines("چشم بگشا به گلستان و ببین", "جلوهٔ آبِ صاف در گل و خار"),
                questionText: "در بیت بالا، یک ترکیب «وصفی» و یک ترکیب «اضافی» پیدا کنید.",
                fields: [
                  { id: "f1", label: "ترکیب وصفی" },
                  { id: "f2", label: "ترکیب اضافی" },
                ],
              },
              correctAnswer: {
                f1: ["آب صاف", "آبِ صاف"],
                f2: ["جلوهٔ آب", "جلوه آب"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «جلوه آب: ترکیب اضافی (۰٫۲۵)  آب صاف: ترکیب وصفی (۰٫۲۵)».",
            },
          ],
        },
        {
          number: 14,
          pageRef: 152,
          instruction: "مفهوم نشانهٔ «ان» را در واژه‌های زیر بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "کاویان:" },
              correctAnswer: { accepted: ["صفت نسبی", "نسبت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "بهاران:" },
              correctAnswer: {
                accepted: ["زمان، وقت، هنگام، توقیت", "زمان", "وقت", "هنگام", "توقیت"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "«زمان»، «وقت»، «هنگام» یا «توقیت» نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 113,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines(
                  "بر لب آن چاه",
                  "سایه‌ای را دید",
                  "او شغاد، آن نابرادر بود",
                  "که درون چَه نگه می‌کرد و می‌خندید.",
                ),
                questionText: "در سرودهٔ بالا نوعِ «نقش تبعی» را مشخّص کنید.",
              },
              correctAnswer: { accepted: ["بدل", "بدل (آن نابرادر)"] },
              gradingMode: "exact_match",
              verified: true,
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
          instruction: "آرایهٔ درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 123,
              content: {
                type: "mcq-inline",
                questionText: "هشت جنّت نیز اینجا مرده‌ای است / هفت دوزخ همچو یخ افسرده‌ای است",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حس‌آمیزی", isCorrect: false },
                { text: "پارادوکس", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 47,
              content: {
                type: "mcq-inline",
                questionText: "محرم این هوش جز بی‌هوش نیست / مر زبان را مشتری جز گوش نیست",
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
              type: "mcq-inline",
              score: 0.25,
              pageRef: 34,
              content: {
                type: "mcq-inline",
                questionText: "تو قلب فسردهٔ زمینی / از درد ورم نموده یک چند",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "جناس", isCorrect: false },
                { text: "حسن تعلیل", isCorrect: true },
              ],
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 104,
              content: {
                type: "mcq-inline",
                questionText: "سیاوش سیه را به تندی بتاخت / نشد تنگدل، جنگ آتش بساخت",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مجاز", isCorrect: true },
                { text: "تشخیص", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 17,
          pageRef: 150,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text("«بخند؛ زیرا خندهٔ تو برای دستان من، شمشیری است آخته.»"),
                questionText: "در سرودهٔ بالا، «مشبّه و مشبّهٌبه» را مشخّص کنید.",
                fields: [
                  { id: "f1", label: "مشبّه" },
                  { id: "f2", label: "مشبّهٌبه" },
                ],
              },
              correctAnswer: { f1: ["خنده", "خندهٔ تو"], f2: ["شمشیر", "شمشیر آخته"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 85,
          instruction:
            "آرایه‌های ادبی به کار رفته در ستون «ب» به کدام‌یک از بیت‌های ستون «الف» مربوط می‌شود؟ (در ستون «ب» یک مورد اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.75,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "با این نسیم سحرخیز، برخیز اگر جان سپردیم / در باغ می‌ماند ای دوست، گل یادگار من و تو",
                  },
                  {
                    id: "ب",
                    text: "کاوس کیانی که کی‌اش نام نهادند / کی بود؟ کجا بود؟ کی‌اش نام نهادند",
                  },
                  { id: "ج", text: "نه در شیراز و نه در شهر گنجه / نظامی می‌شوم در قصر شیرین" },
                ],
                columnB: [
                  { id: "1", text: "ایهام" },
                  { id: "2", text: "استعاره" },
                  { id: "3", text: "حس‌آمیزی" },
                  { id: "4", text: "جناس تام" },
                ],
              },
              correctAnswer: { الف: "2", ب: "4", ج: "1" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«حس‌آمیزی» (۳) اضافی است. کلید: الف→استعاره (ص ۸۵)، ب→جناس تام (ص ۶۲)، ج→ایهام (ص ۹۵)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 19,
          pageRef: 115,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "در سرودهٔ «خوان هشتم»، «رستم» و «شغاد»، هریک «نماد» چه کسانی هستند؟",
                fields: [
                  { id: "f1", label: "«رستم» نماد" },
                  { id: "f2", label: "«شغاد» نماد" },
                ],
              },
              correctAnswer: {
                f1: ["آزادگی، اقتدار ملّی و جوانمردی", "آزادگی", "اقتدار ملّی", "جوانمردی"],
                f2: ["فریب، نیرنگ و ناجوانمردی", "فریب", "نیرنگ", "ناجوانمردی"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 150,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "«امّا خنده‌ات که رها می‌شود و پروازکنان در آسمان مرا می‌جوید، تمام " },
                    { kind: "highlight", value: "درهای زندگی را به رویم می‌گشاید" },
                    { kind: "text", value: ".»" },
                  ],
                },
                questionText: "در عبارت بالا، معنای «کنایی» قسمت مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["کنایه از امیدوار نمودن و زندگی بخشیدن"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«امیدوار کردن» و «زندگی بخشیدن» (یا هر مفهوم مشابه) نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          pageRef: 125,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "داستان «سی مرغ و سیمرغ» از کدام اثر ادبی برگرفته شده است؟",
              },
              correctAnswer: { accepted: ["منطق‌الطیر", "منطق الطیر", "منطق‌الطیر عطار"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          instruction: "نام آفرینندگان آثاری که نویسندهٔ آن‌ها نادرست است، بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«سانتاماریا: سیّد مهدی شجاعی – تمهیدات: شهاب‌الدّین سهروردی – سندبادنامه: ظهیری سمرقندی – فیه ما فیه: جامی – دری به خانهٔ خورشید: سلمان هراتی»",
                ),
                questionText:
                  "نام درستِ آفرینندگانِ آثاری را بنویسید که در فهرست بالا نویسنده‌شان نادرست آمده است.",
              },
              correctAnswer: { accepted: ["عین‌القضات همدانی و مولوی"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو مورد، هرکدام ۰٫۲۵ (به هر ترتیب): «عین‌القضات همدانی» (پدیدآورندهٔ تمهیدات) و «مولوی/مولانا» (پدیدآورندهٔ فیه ما فیه).",
              verified: true,
              sourceNote:
                "کلید: «تمهیدات: عین‌القضات همدانی (۰٫۲۵، ص ۱۵۳)  فیه ما فیه: مولوی (۰٫۲۵، ص ۵۱)». به‌جای دو فیلدِ جدا برای هر اثر، یک پاسخ متنی گذاشته شد تا معلوم نکند کدام دو اثر اشتباه‌اند.",
            },
          ],
        },
        {
          number: 23,
          pageRef: 29,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "به غزل‌هایی که محتوای آن‌ها بیشتر مسائل سیاسی و اجتماعی است، ",
                  "b1",
                  " می‌گویند.",
                ),
              },
              correctAnswer: { accepted: ["غزل اجتماعی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 97,
          instruction: "مصراع اوّل بیت زیر را بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "..............................................................." }],
                    [{ kind: "text", value: "در دادگاه عشق، رگ گردنت گواه" }],
                  ],
                },
                questionText: "مصراع اوّل بیت بالا را بنویسید.",
              },
              correctAnswer: { accepted: ["شاهد، نیاز نیست که در محضر آورند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 117,
          instruction: "با توجّه به مصراع‌های داده‌شده، ابیات زیر را کامل کنید.",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "به دشت دل گیاهی جز گل رویت نمی‌روید" },
                  { id: "ب", text: "تو بودم کردی از نابودی و با مهر پروردی" },
                ],
                columnB: [
                  { id: "1", text: "فدای نام تو بود و نبودم؛ میهن ای میهن!" },
                  { id: "2", text: "من این زیبازمین را آزمودم؛ میهن ای میهن!" },
                  { id: "3", text: "به هر حالت که بودم با تو بودم؛ میهن ای میهن!" },
                ],
              },
              correctAnswer: { الف: "2", ب: "1" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "مصراع سوم اضافی است. کلید: الف→۲ (۰٫۲۵) و ب→۱ (۰٫۲۵)، ص ۱۱۷. روی برگه «کامل کنید» با سه مصراعِ شماره‌دار است و بدون تغییر به تطبیق تبدیل شد.",
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
        {
          number: 26,
          pageRef: 101,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("سرانجام گفت ایمن از هر دوان", "نگردد مرا دل نه روشن روان"),
                questionText: "بیتِ بالا از زبان چه کسی بیان شده است؟",
              },
              correctAnswer: { accepted: ["کیکاووس", "کی‌کاووس", "کاووس"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 56,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "صبر بر داغ دل سوخته باید چون شمع",
                  "لایق صحبت بزم تو شدن آسان نیست",
                  "می‌تواند حلقه بر در زد حریم حُسن را",
                  "در رگ جان، هر که را چون زلف، پیچ و تاب هست",
                ),
                questionText: "مفهوم مشترک ابیات بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "تحمّل سختی‌ها و دشواری‌های راه عشق",
                  "شایستهٔ عشق بودن عاشقان دلسوخته",
                  "فقط عاشقان واقعی به حریم حسن معشوق راه می‌یابند",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر یک از سه پاسخ کلید (یا مفهوم مشابه) نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 80,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("«شاهین تیزبال افق‌ها بودم. زنبور طفیلی شدم و به کنجی پناه بردم.»"),
                questionText: "عبارت بالا یادآور کدام «ضرب‌المثل» فارسی است؟",
              },
              correctAnswer: { accepted: ["از عرش به فرش آمدن", "از عرش به فرش افتادن"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«از عرش به فرش آمدن» یا هر ضرب‌المثل درست دیگر نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 84,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "آن‌جا در آن برزخ سرد در کوچه‌های غم و درد",
                  "غیر از شب آیا چه می‌دید چشمان تار من و تو",
                ),
                questionText: "مقصود نهایی شاعر از بیت بالا چیست؟",
              },
              correctAnswer: { accepted: ["شکوه و شکایت از اوضاع نابسامان جامعهٔ قبل از انقلاب اسلامی"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ کلید یا هر پاسخ درست دیگر نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          instruction: "درستی و نادرستی موارد زیر را مشخّص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 47,
              content: {
                type: "true-false",
                statementText:
                  "بیتِ «نی حدیث راه پرخون می‌کند / قصّه‌های عشق مجنون می‌کند»، به مفهوم «دشواری و پرخون بودن راه عشق» اشاره دارد.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 73,
              content: {
                type: "true-false",
                statementText:
                  "مفهوم عبارتِ «آن باغ پر از گل‌های رنگین و معطّر شعر و احساس در سموم سرد این عقل بی‌درد پژمرد و صفای اهورایی آن همه زیبایی‌ها، به این علم عددبین مصلحت‌اندیش آلود.» به برتری عقل بر عشق و احساس تأکید دارد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 134,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("«ستارهٔ ضعیفی در شبستان تیره و تار درونم درخشیدن گرفت.»"),
                questionText: "مفهوم عبارتِ بالا را بنویسید.",
              },
              correctAnswer: { accepted: ["ناامیدی‌ام به امیدواری تبدیل شد، از ناامیدی به امیدواری رسیدن"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید: صص ۱۳۴ و ۱۳۶.",
            },
          ],
        },
        {
          number: 32,
          pageRef: 155,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«این‌گونه است که عشق جاودانی همواره معشوق را جوان می‌بیند و نه توجّهی به گرد و غبار و جراحات پیری دارد.»",
                ),
                questionText: "در عبارت بالا، «عشق جاودانی» چگونه توصیف می‌شود؟",
              },
              correctAnswer: { accepted: ["ظاهربین نبودن عاشق"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«ظاهربین نبودن عاشق» یا هر پاسخ درست دیگر نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          instruction: "هر یک از ابیات زیر، یادآور کدام یک از هفت وادی است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 122,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("مال اینجا بایدت انداختن", "ملک اینجا بایدت درباختن"),
                questionText: "این بیت یادآور کدام وادی است؟",
              },
              correctAnswer: { accepted: ["طلب", "وادی اول", "طلب (وادی اول)"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 125,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("صد هزاران سایهٔ جاوید تو", "گم شده بینی ز یک خورشید تو"),
                questionText: "این بیت یادآور کدام وادی است؟",
              },
              correctAnswer: {
                accepted: ["فقر و فنا", "وادی هفت", "وادی هفتم", "فقر و فنا (وادی هفت)"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 100,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چنین است سوگند چرخ بلند", "که بر بی‌گناهان نیاید گزند"),
                questionText: "بیت بالا بیانگر کدام «زمینهٔ حماسه» است؟",
              },
              correctAnswer: { accepted: ["ملّی", "ملی", "زمینهٔ ملّی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          instruction: "ابیات و عبارات زیر را به نثر ساده و روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 35,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "بنشین به یکی کبود اورند",
              },
              correctAnswer: { accepted: ["بر تخت حکمرانی بنشین (قدرت را به دست بگیر)"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 19,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "گفت: «کار شرع، کار درهم و دینار نیست»",
              },
              correctAnswer: {
                accepted: [
                  "گفت: کار شرع با رشوه‌خواری سازگار نیست / کاری که در شرع حرام است با دادن رشوه حلال نمی‌شود (نکوهش رشوه‌خواری)",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 12,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "هر نفسی که فرو می‌رود مُمِدّ حیات است.",
              },
              correctAnswer: { accepted: ["هر نفسی که می‌کشیم یاری‌دهندهٔ زندگی است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 53,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "در عشق قدم نهادن کسی را مسلّم شود که با خود نباشد.",
              },
              correctAnswer: {
                accepted: [
                  "کسی می‌تواند در راه عشق قدم بگذارد که به تعلّقات ظاهری بی‌توجّه باشد (ترک تعلّقات دنیوی)",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ه",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 133,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "تمام حُسن کباب غاز به این است که سربه‌مُهر روی میز بیاید.",
              },
              correctAnswer: {
                accepted: ["همهٔ خوبیِ کباب غاز در این است که کامل و دست‌نخورده روی میز بیاید"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 159,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "در این اندیشه مستغرق بودم که دیدم مرا به نام خواندند.",
              },
              correctAnswer: { accepted: ["در این فکر فرو رفته بودم که دیدم مرا به اسم صدا زدند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 121,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "هر که داند گفت با خورشید راز / کی تواند ماند از یک ذرّه باز",
              },
              correctAnswer: {
                accepted: [
                  "کسی که می‌تواند به اصل و حقیقت (خداوند) برسد، هرگز از رسیدن به فرعیات عاجز نمی‌شود",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.75,
              pageRef: 104,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "همی‌کند سودابه از خشم موی / همی‌ریخت آب و همی‌خست روی",
              },
              correctAnswer: {
                accepted: [
                  "سودابه از روی خشم موهایش را می‌کند، پیوسته گریه می‌کرد و صورت خود را زخمی می‌نمود",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
