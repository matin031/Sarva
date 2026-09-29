import { highlight1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۲ یازدهم — آزمون شبه‌نهایی عصر ۱۴۰۳ (همهٔ رشته‌ها)
 * تاریخ برگه: ۱۴۰۳/۰۲/۰۴ — ساعت شروع ۱۴:۰۰، ۹۰ دقیقه.
 * Source: Farsi2-Asr-[konkur.in].pdf — ۴ صفحه سؤال + ۳ صفحهٔ راهنمای تصحیح.
 *
 * سه مرحلهٔ کنترل:
 * ۱) متن و زیرخط‌ها با تصویر چهار صفحهٔ سؤال تطبیق داده شد.
 * ۲) پاسخ‌ها و pageRefها سؤال‌به‌سؤال با راهنمای تصحیح تطبیق داده شد.
 * ۳) نوع سؤال، بارم‌ها، جمع قلمروها، غلط تایپی و ساختار داده کنترل شد.
 *
 * بارم‌ها: زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰.
 *
 * تعارض منبع: در سؤال ۳۱ صورت سؤال فقط دو گزینهٔ الف/ب دارد،
 * اما راهنمای تصحیح «گزینه دال ص ۵۵» نوشته است. جزئیات همان سؤال ثبت شده است.
 */
export const farsi2Asr1403: SeedExam = {
  subject: "farsi2",
  grade: 11,
  title: "فارسی۲ یازدهم — آزمون شبه‌نهایی عصر ۱۴۰۳",
  examSession: "farsi2-1403-shabhe-nahayi-asr",
  totalScore: 20,
  sourcePdf: "Farsi2-Asr-[konkur.in].pdf",
  sections: [
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 165,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: {
                type: "mcq-inline",
                questionText: "در کدام یک از گزینه‌های زیر، معنی همهٔ واژه‌ها درست آمده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "شماتت: ملامت / همگنان: هم‌نبردان", isCorrect: false },
                { optionKey: "ب", text: "سهم: ترس / ژنده: خشمگین", isCorrect: false },
                { optionKey: "ج", text: "کیهان: جهان / یکایک: ناگهان", isCorrect: true },
                { optionKey: "د", text: "صباحت: اوّل صبح / مناسک: اعمال عبادی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 2,
          instruction: "معنی واژه‌های مشخّص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 159,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "نامه‌ها را می‌فرستاد فرود سرای به دست من و من به آغاجی خادم می‌دادم و ",
                  "خیرخیر",
                  "w2a",
                  " جواب می‌آوردم.",
                ),
              },
              correctAnswer: { w2a: ["سریع و آسان"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 161,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "صدا و نالهٔ درهم شترهای حامل ",
                  "زنبورک",
                  "w2b",
                  " با آهنگ شیپور و طبل‌های جنگی درهم می‌آمیخت.",
                ),
              },
              correctAnswer: { w2b: ["نوعی توپ جنگی که روی اسب می‌بستند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          instruction: "املای درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 69,
              content: {
                type: "mcq-inline",
                questionText:
                  "جلال‌الدین محمد به (اصرار / اسرار) مریدان و شاگردان پدر، مجالس درس و وعظ را به عهده گرفت.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: اصرار، ص ۶۹–۷۰.",
              options: [
                { text: "اصرار", isCorrect: true },
                { text: "اسرار", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 41,
              content: {
                type: "mcq-inline",
                questionText: "پرچم روس‌ها در خاک آغشته به خون بی‌گناهان به (احتزاز / اهتزاز) درآمد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "احتزاز", isCorrect: false },
                { text: "اهتزاز", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 57,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در همهٔ گزینه‌ها به جز گزینهٔ .......... غلط املایی وجود دارد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اشتر طلبید و مهمل آراست.", isCorrect: false },
                { optionKey: "ب", text: "من نهایت بُعد اختیار کردم که غُربت را خطر بسیار است.", isCorrect: false },
                {
                  optionKey: "ج",
                  text: "حق تعالی چون اصناف موجودات می‌آفرید، وسایط گوناگون در هر مقام، بر کار کرد.",
                  isCorrect: true,
                },
                { optionKey: "د", text: "سپیدهٔ فردای گنجه با نجیب گلوله‌های توپ روس باز شد.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 165,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "با توجّه به معنی واژه‌ها، املای کلمات کدام گزینه تماماً درست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "خالگیر: آشپز / سروش: فرشته", isCorrect: false },
                { optionKey: "ب", text: "رشحه: قطره / محوطه: پهنه", isCorrect: false },
                { optionKey: "ج", text: "مستحقان: نیازمندان / صفیر: فرستاده", isCorrect: false },
                { optionKey: "د", text: "الحاح: پافشاری / مظاهرت: پشتیبانی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 6,
          instruction: "در گروه کلمات زیر دو غلط املایی بیابید و درست آن را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 1,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 2,
                items: [
                  { id: "i1", text: "اندرز دادن و مناصحت" },
                  { id: "i2", text: "صلت فخر" },
                  { id: "i3", text: "شک و شائبه" },
                  { id: "i4", text: "مطاوعت و فرمانبری" },
                  { id: "i5", text: "مصاحمه و ساده‌انگاری" },
                  { id: "i6", text: "افراط و تفریط" },
                  { id: "i7", text: "مهملی و بیکاری" },
                  { id: "i8", text: "صافی و پاکی" },
                  { id: "i9", text: "خایب و ناامید" },
                  { id: "i10", text: "اذن و رخصت" },
                  { id: "i11", text: "امتناء و سرباز زدن" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i5", "i11"],
                corrections: { i5: "مسامحه و ساده‌انگاری", i11: "امتناع و سرباز زدن" },
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote: "راهنمای تصحیح: «مسامحه» ص ۱۶۸ و «امتناع» ص ۱۶۵.",
            },
          ],
        },
        {
          number: 7,
          pageRef: 114,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چنان دید بر روی دشمن ز خشم", "که شد ساخته کارش از زهر چشم"),
                questionText:
                  "ضمیر «ش» در واژهٔ «کارش» با کدام کلمه در مصراع اوّل، نقش دستوری یکسانی دارد؟",
              },
              correctAnswer: { accepted: ["دشمن"] },
              gradingMode: "exact_match",
              aiGradingHint: "پاسخ کلید: «دشمن»؛ هر دو مضاف‌الیه هستند.",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          instruction: "با توجّه به متن، به سؤال‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 19,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text(
                  "بونصر را بگو که امروز دژشتم و در این دو سه روز، بار داده آید که علت و تب تمامی زایل شد. من بازگشتم و این چه رفت با بوسهل بگفتم. سخت شاد شد و ...",
                ),
                questionText: "معادل امروزی فعل مجهول موجود در متن را بنویسید.",
              },
              correctAnswer: { accepted: ["داده شود"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 19,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نقش دستوری واژهٔ «سخت» چیست؟",
              },
              correctAnswer: { accepted: ["قید"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 19,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "حرف نشانهٔ «را» بعد از «بونصر» بیانگر چه نقش دستوری است؟",
              },
              correctAnswer: { accepted: ["متمم", "نقش‌نمای متمم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 133,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("صیاد شادمان شد و گرازان به تک ایستاد."),
                questionText: "دربارهٔ کاربرد و معنای فعل «ایستاد» در جملهٔ بالا توضیح دهید.",
              },
              correctAnswer: { accepted: ["به معنای شروع کردن است؛ یعنی شروع به دویدن کرد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 132,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("منظرهٔ ", "دیدنی", ""),
                questionText: "واژهٔ مشخّص‌شده چه نوع صفت بیانی است؟",
              },
              correctAnswer: { accepted: ["صفت لیاقت", "لیاقت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 68,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text(
                  "بهاءولد از آنجا که دیار روم از تاخت و تاز سپاه مغول برکنار بود و پادشاهی دانا و صاحب بصیرت داشت، بدان نواحی هجرت کرد. او به همّت یاران نزدیک خود، شیخ صلاح‌الدین زرکوب و حسام‌الدین چلبی، به نشر معارف الهی مشغول بود.",
                ),
                questionText: "دو نقش تبعی متفاوت (غیر تکراری) را در عبارت بالا بیابید و بنویسید.",
                fields: [
                  { id: "f1", label: "نقش تبعی نخست" },
                  { id: "f2", label: "نقش تبعی دوم" },
                ],
              },
              correctAnswer: {
                f1: ["عطف", "معطوف", "صاحب بصیرت معطوف است", "حسام‌الدین معطوف به صلاح‌الدین است"],
                f2: ["بدل", "شیخ صلاح‌الدین زرکوب و حسام‌الدین چلبی بدل از یاران نزدیک خود هستند"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          pageRef: 123,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text("کبوتران اضطرابی می‌کردند و هر یک خود را می‌کوشید."),
                questionText: "حذف و نوع آن را در عبارت بالا مشخص کنید.",
                fields: [
                  { id: "f1", label: "جزء حذف‌شده" },
                  { id: "f2", label: "نوع حذف" },
                ],
              },
              correctAnswer: {
                f1: ["شناسهٔ فعل «ند»", "شناسه فعل ند", "ند"],
                f2: ["حذف به قرینهٔ لفظی", "قرینهٔ لفظی"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          instruction: "با توجّه به بیت، به پرسش‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "به " },
                      { kind: "highlight", value: "فرزندان" },
                      { kind: "text", value: " و یاران گفت چنگیز" },
                    ],
                    [{ kind: "text", value: "که گر فرزند باید، باید این سان!" }],
                  ],
                },
                questionText: "نقش دستوری واژهٔ مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["متمم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "در بیت، مفعول را مشخص کنید.",
              },
              correctAnswer: { accepted: ["که گر فرزند باید، باید این سان!", "مصراع دوم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 43,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "واژهٔ «استاد» در کدام گزینه شاخص است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "استاد معین، فرهنگ فارسی را نوشت.", isCorrect: true },
                { optionKey: "ب", text: "ایشان استاد زبان و ادبیات فارسی هستند.", isCorrect: false },
                { optionKey: "ج", text: "کتاب استاد مطالب مفیدی دارد.", isCorrect: false },
                { optionKey: "د", text: "این استاد از استادان شاخص می‌باشند.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 68,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام گزینه نقش کلمات مشخّص‌شده به ترتیب درست آمده است؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "به دلیل سیر و سفر و " },
                      { kind: "highlight", value: "البته" },
                      { kind: "text", value: " جست و جو و پرواز در عالم " },
                      { kind: "highlight", value: "معنا" },
                      { kind: "text", value: " او " },
                      { kind: "highlight", value: "را" },
                      { kind: "text", value: " شمس پرنده می‌گفتند." },
                    ],
                  ],
                },
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "قید، متمم، مسند", isCorrect: false },
                { optionKey: "ب", text: "معطوف، صفت فاعلی، بدل", isCorrect: false },
                { optionKey: "ج", text: "قید، مضاف‌الیه، متمم", isCorrect: true },
                { optionKey: "د", text: "قید، مضاف‌الیه، مسند", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 16,
          pageRef: 106,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "واژهٔ «شوخ» از نظر وضعیتی که در گذر زمان پیدا کرده، مشابه واژگان کدام گزینه است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "کثیف / سوگند", isCorrect: true },
                { optionKey: "ب", text: "فتراک / برگستوان", isCorrect: false },
                { optionKey: "ج", text: "شادی / پذیرش", isCorrect: false },
                { optionKey: "د", text: "رکاب / یخچال", isCorrect: false },
              ],
              sourceNote: "کلید: گزینهٔ الف؛ از دست دادن معنی پیشین و گرفتن معنی جدید، ص ۱۰۶.",
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
          number: 17,
          pageRef: 120,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "چون او را در بند بلا بسته دید، " },
                      { kind: "highlight", value: "زهاب دیدگان بگشاد" },
                      { kind: "text", value: " و بر رخسار " },
                      { kind: "highlight", value: "جوی‌ها" },
                      { kind: "text", value: " براند و گفت: ای دوست عزیز و رفیق موافق، تو را در این رنج که افکند؟" },
                    ],
                  ],
                },
                questionText: "قسمت‌های مشخّص‌شده در عبارت بالا دارای چه آرایه‌های ادبی هستند؟",
                fields: [
                  { id: "f1", label: "آرایهٔ بخش نخست" },
                  { id: "f2", label: "آرایهٔ بخش دوم" },
                ],
              },
              correctAnswer: {
                f1: ["کنایه", "کنایه از گریه کردن بسیار"],
                f2: ["استعاره", "استعاره از اشک"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          instruction: "با توجّه به بیت زیر، به سؤال‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 120,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("درفشان لاله در وی، چون چراغی", "و لیک از دود او بر جانش داغی"),
                questionText: "وجه شبه تشبیه موجود در بیت را بیابید و بنویسید.",
              },
              correctAnswer: { accepted: ["درفشان", "درخشندگی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 120,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام واژه دلالت بر وجود آرایهٔ تشخیص در بیت دارد؟",
              },
              correctAnswer: { accepted: ["وی"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "راهنمای تصحیح: «جان داشتن مرغزار ـ وجود واژهٔ وی».",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 120,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "در قافیهٔ مصراع دوم چه آرایهٔ ادبی وجود دارد؟",
              },
              correctAnswer: { accepted: ["استعاره", "داغ استعاره از سیاهی وسط گل لاله است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          instruction: "با توجّه به بیت زیر، به پرسش‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 88,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("فرمان رسید این خانه از دشمن بگیرید", "تخت و نگین از دست اهریمن بگیرید"),
                questionText: "تلمیح موجود در بیت را توضیح دهید.",
              },
              correctAnswer: {
                accepted: [
                  "تلمیح به داستان حضرت سلیمان و دیو که انگشتر حضرت را ربود و به جای او بر تخت نشست",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "count-answer",
              score: 0.25,
              pageRef: 88,
              content: {
                type: "count-answer",
                questionText: "در مصراع دوم چند واژه معنی مجازی دارند؟",
                min: 0,
                max: 10,
              },
              correctAnswer: { value: 4 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: ۴ مجاز؛ تخت: مجاز از پادشاهی، نگین: مجاز از انگشتر، دست: مجاز از قدرت و اختیار، اهریمن: مجاز و استعاره از دشمن اسرائیلی.",
            },
          ],
        },
        {
          number: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "بیداری زمانه با من بخوان به فریاد" }],
                    [
                      { kind: "text", value: "ور مرد خواب و خفتی، " },
                      { kind: "highlight", value: "رو سر بنه به بالین تنها مرا رها کن" },
                    ],
                  ],
                },
                questionText: "بخش مشخّص‌شده، بیانگر کاربرد کدام آرایهٔ ادبی به جز کنایه است؟",
              },
              correctAnswer: { accepted: ["تضمین"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: تضمین.",
            },
          ],
        },
        {
          number: 21,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "ولی چندان که " },
                      { kind: "highlight", value: "برگ" },
                      { kind: "text", value: " از " },
                      { kind: "highlight", value: "شاخه" },
                      { kind: "text", value: " می‌ریخت" },
                    ],
                    [{ kind: "text", value: "دو چندان می‌شکفت و برگ می‌کرد" }],
                  ],
                },
                questionText: "در مصراع اوّل، «برگ» و «شاخه» استعاره از چه هستند؟",
                fields: [
                  { id: "f1", label: "استعارهٔ «برگ»" },
                  { id: "f2", label: "استعارهٔ «شاخه»" },
                ],
              },
              correctAnswer: {
                f1: ["هر یک از سربازان لشکر مغول", "سربازان لشکر مغول"],
                f2: ["لشکر مغول", "سپاه مغول"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines("بید مجنون در تمام عمر، سر بالا نکرد", "حاصل بی‌حاصلی نبود به جز شرمندگی"),
                questionText: "دو آرایهٔ موجود در بیت را بنویسید.",
                fields: [
                  { id: "f1", label: "آرایهٔ مصراع اوّل" },
                  { id: "f2", label: "آرایهٔ کل بیت" },
                ],
              },
              correctAnswer: { f1: ["تشخیص", "جان‌بخشی"], f2: ["حسن تعلیل"] },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 23,
          instruction: "در میان آثار زیر، نام پدیدآورندهٔ دو اثر در مقابل آن‌ها نادرست نوشته شده است؛ آن دو را مشخص کنید.",
          parts: [
            {
              type: "mcq-multi-select",
              score: 0.5,
              content: {
                type: "mcq-multi-select",
                questionText: "دو موردی را که پدیدآورندهٔ آن‌ها نادرست نوشته شده است، انتخاب کنید.",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "فرهاد و شیرین: نظامی", isCorrect: true },
                { optionKey: "ب", text: "شلوارهای وصله‌دار: رسول پرویزی", isCorrect: false },
                { optionKey: "ج", text: "مرصادالعباد: نجم‌الدین رازی", isCorrect: false },
                { optionKey: "د", text: "غزلیات شمس: شمس تبریزی", isCorrect: true },
                { optionKey: "ه", text: "جوامع الحکایات و لوامع الروایات: محمد عوفی", isCorrect: false },
              ],
              sourceNote: "کلید: الف ← فرهاد و شیرین از وحشی بافقی؛ د ← غزلیات شمس از مولانا.",
            },
          ],
        },
        {
          number: 24,
          instruction: "درستی یا نادرستی گزاره‌های زیر را تعیین کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 16,
              content: {
                type: "true-false",
                statementText: "لیلی و مجنون اثری دیگر از صاحب کتاب بهارستان می‌باشد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "هر سه شاعرِ فریدون مشیری، ملک‌الشعرای بهار و فریدون توللی، چهارپاره‌سرا هستند.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          instruction: "ابیات زیر را کامل کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "verse-completion",
              score: 0.25,
              content: { type: "verse-completion", firstMesra: "مرا اوج عزت در افلاک توست" },
              correctAnswer: { accepted: ["به چشمان من کیمیا خاک توست"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "verse-completion",
              score: 0.25,
              content: { type: "verse-completion", firstMesra: "ناگهان قفل بزرگی را می‌گشاید" },
              correctAnswer: { accepted: ["آنکه در دستش کلید شهر پرآیینه دارد", "آن که در دستش کلید شهر پرآیینه دارد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "verse-completion",
              score: 0.25,
              content: { type: "verse-completion", firstMesra: "عاقبت از خامی خود سوخته" },
              correctAnswer: { accepted: ["رهروی کبک نیاموخته"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مصراع دوم بیت زیر کدام گزینه است؟",
                stimulus: text("زین همرهان سست عناصر دلم گرفت / ................................."),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "کز دیو و دد ملولم و انسانم آرزوست", isCorrect: false },
                { optionKey: "ب", text: "کان چهرهٔ مشعشع تابانم آرزوست", isCorrect: false },
                { optionKey: "ج", text: "شیر خدا و رستم دستانم آرزوست", isCorrect: true },
                { optionKey: "د", text: "آن آشکار صنعت پنهانم آرزوست", isCorrect: false },
              ],
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
          number: 27,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("بزن زخمی، این مرهم عاشق است", "که بی زخم مردن، غم عاشق است"),
                questionText: "مفهوم مصراع دوم بیت بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "بی‌زخم مردن کنایه از مرگ طبیعی است و شهادت بر مرگ در بستر ترجیح داده شده است",
                  "ترجیح شهادت بر مرگ طبیعی و مرگ در بستر",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          instruction: "مفهوم قسمت مشخّص‌شده در عبارت‌های زیر را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 17,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: highlight1("امیر ", "از آن جهان آمده", "، به خیمه فرود آمد و جامه بگردانید."),
                questionText: "مفهوم بخش مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["از مرگ نجات یافتن", "از مرگ نجات یافت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 61,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: highlight1("شما در این ", "آیینه", "، نقش‌های بوقلمون بینید."),
                questionText: "مفهوم بخش مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["خلقت یا کالبد اولیهٔ آدم", "خلقت اولیه آدم", "کالبد اولیه آدم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 91,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: highlight1("یعنی کلیم آهنگ جان ", "سامری", " کرد."),
                questionText: "مفهوم قسمت مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["دشمن اسرائیلی"] },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "راهنمای تصحیح برای جزء «ج» عیناً پاسخ «دشمن اسرائیلی» و صفحهٔ ۹۱ را داده است.",
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 60,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: highlight1("هر لحظه، از خزاین غیب، ", "گوهری", " در نهاد او تعبیه کرد."),
                questionText: "مفهوم بخش مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["لیاقت، توانایی و استعداد", "توانایی و استعداد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ه",
              type: "two-answer-text",
              score: 0.5,
              pageRef: 44,
              content: {
                type: "two-answer-text",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "مردمی که به " },
                      { kind: "highlight", value: "خانه‌های تاریک و بی‌دریچه" },
                      { kind: "text", value: " عادت کرده‌اند، از " },
                      { kind: "highlight", value: "پنجره‌های باز و نورگیر" },
                      { kind: "text", value: " گریزان هستند." },
                    ],
                  ],
                },
                questionText: "مفهوم دو بخش مشخّص‌شده را، به ترتیب، بنویسید.",
                fields: [
                  { id: "f1", label: "خانه‌های تاریک و بی‌دریچه" },
                  { id: "f2", label: "پنجره‌های باز و نورگیر" },
                ],
              },
              correctAnswer: {
                f1: ["افکار پوسیده و قدیمی", "افکار قدیمی و پوسیده"],
                f2: ["افکار نو و تازه", "افکار تازه"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 73,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("کدام دانه فرو رفت در زمین که نرست؟", "چرا به دانهٔ انسانت این گمان باشد؟"),
                questionText: "بیت بالا بیانگر چه دیدگاهی است؟",
              },
              correctAnswer: { accepted: ["اعتقاد به معاد و حیات بعد از مرگ", "معاد و حیات بعد از مرگ"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 11,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در بیت زیر شاعر «بخشندگی» را حاصل چه می‌داند؟",
                stimulus: poemLines("کرم ورزد آن سر که مغزی در اوست", "که دون همتند بی‌مغز و پوست"),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ثروتمندی", isCorrect: false },
                { optionKey: "ب", text: "مهربانی و عاطفه", isCorrect: false },
                { optionKey: "ج", text: "خردمندی", isCorrect: true },
                { optionKey: "د", text: "دوری از دون‌همتان", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 31,
          pageRef: 55,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه بیانگر سیر فکری پدر مجنون در موضوع عشق مجنون به لیلی نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              options: [
                { optionKey: "الف", text: "عشق‌بازی کار بیکاران بود / عاقلش با کار بیکاران چه کار؟", isCorrect: false },
                { optionKey: "ب", text: "دریاب که مبتلای عشقم / آزاد کن از بلای عشقم", isCorrect: true },
              ],
              sourceNote:
                "تعارض منبع: روی برگهٔ سؤال فقط دو گزینهٔ «الف» و «ب» چاپ شده است، اما راهنمای تصحیح برای سؤال ۳۱ عیناً «گزینه دال ص ۵۵» نوشته. با توجه به خودِ دو گزینه، «ب» بیانِ مجنون است و با سیر فکری پدر مجنون سازگار نیست؛ بنابراین ب به‌صورت استنباطی کلید شده و verified:false مانده است.",
            },
          ],
        },

        {
          number: 32,
          pageRef: 73,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,

              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه با بیت «چنین قفس نه سزای چو من خوش‌الحانی است / روم به گلشن رضوان که مرغ آن چمنم» بیشترین ارتباط معنایی را دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ما به فلک بوده‌ایم، یار ملک بوده‌ایم / باز همان‌جا رویم، جمله که آن شهر ماست", isCorrect: true },
                { optionKey: "ب", text: "مرغ باغ ملکوتم نیم از عالم خاک / چند روزی قفسی ساخته‌اند از بدنم", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 33,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "الف: چو شیر خدا راند بر خصم تیغ / به سر کوفت شیطان دو دست دریغ" }],
                    [{ kind: "text", value: "ب: پرید از رخ کفر در هند رنگ / تپیدند بت‌خانه‌ها در فرنگ" }],
                  ],
                },
                questionText: "پیام هر یک از دو بیت بالا را به صورت جداگانه بنویسید.",
                fields: [
                  { id: "f1", label: "پیام بیت الف" },
                  { id: "f2", label: "پیام بیت ب" },
                ],
              },
              correctAnswer: {
                f1: ["سست و لرزان شدن پایه‌های کفر با کشته شدن یکی از یاران شیطان"],
                f2: ["شرق و غرب جهان از شکست کفر ترسیدند"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote: "راهنمای تصحیح برای جزء ب صفحهٔ ۱۵ را ذکر کرده است.",
            },
          ],
        },
        {
          number: 34,
          pageRef: 89,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines("جانان من برخیز بر جولان برانیم", "زان جا به جولان تا خط لبنان برانیم"),
                questionText: "تفاوت معنایی واژهٔ «جولان» را در دو مصراع بالا توضیح دهید.",
                fields: [
                  { id: "f1", label: "جولانِ نخست" },
                  { id: "f2", label: "جولانِ دوم" },
                ],
              },
              correctAnswer: {
                f1: ["نام منطقه‌ای اشغال‌شده توسط صهیونیست‌ها", "نام منطقهٔ جولان"],
                f2: ["تاخت و تاز", "تاخت‌وتاز"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          instruction: "اشعار و عبارات زیر را به نثر ساده و روان برگردانید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("زنخدان فرو برد چندی به جیب"),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["دست از کار کشید یا تلاشی نکرد و بیکار ماند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("فرض است فرمان بردن از حکم جلو دار"),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["پیروی از دستور پیشوا و فرمانده واجب است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("چو کشتی، بادبان در رود افکند"),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["اسبش را مانند کشتی به آب انداخت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("هر روز خنیده‌نام‌تر گشت"),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["مجنون در عاشقی روز به روز مشهورتر شد و نامش بر سر زبان‌ها افتاد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ه",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("سرایچهٔ ذهنم آماس می‌کرد."),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["معلوماتم زیاد می‌شد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("عشق، حالی دو اسبه می‌آمد."),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["در آن حال عشق به سرعت می‌آمد"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "راهنمای تصحیح: «در آن حال» ۰٫۲۵ و «عشق به سرعت می‌آمد» ۰٫۲۵.",
              verified: true,
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("چو ضحّاک بر تخت شد شهریار", "بر او سالیان انجمن شد هزار"),
                questionText: "معنی بیت را بنویسید.",
              },
              correctAnswer: { accepted: ["وقتی ضحاک پادشاه شد، حکومت او هزار سال طول کشید"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("بر مصطفی بهر رخصت دوید", "ازو خواست دستوری امّا ندید"),
                questionText: "معنی بیت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "حضرت علی برای گرفتن اذن ورود به میدان مبارزه با عمرو نزد پیامبر آمد، اما پیامبر اجازهٔ نبرد نداد",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ط",
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("اختلاف صیادان آن جا متواتر."),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: { accepted: ["صیادان در آن مرغزار مداوم و زیاد رفت‌وآمد می‌کردند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ی",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text("ناگاه، آن دیدند که چون آب نیرو کرده بود و کشتی پر شده، نشستن و دریدن گرفت."),
                questionText: "معنی عبارت را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "ناگهان متوجه شدند که به علت تلاطم و طغیان آب، کشتی از آب پر شد و شروع به غرق شدن و شکستن کرد",
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
