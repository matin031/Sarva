import { blank1, highlight1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، خرداد ۱۴۰۴ (همهٔ رشته‌ها)
 * Source: farsi12-nahayi1404.pdf — ۵ صفحه سؤال + ۲ صفحه «راهنمای نمره‌گذاری»
 * (کلید، شمارهٔ صفحهٔ کتاب را هم دارد؛ همهٔ pageRefها از آن آمده‌اند).
 *
 * چند نکته موقعِ خواندنِ این فایل:
 *
 * ۱. **تاریخ.** برگه در سرصفحه «خرداد ۱۴۰۴» نوشته ولی «تاریخ آزمون» ۱۴۰۴/۰۲/۳۰
 *    (۳۰ اردیبهشت) است. examSession را از عنوان برگه (خرداد) گرفتیم.
 *
 * ۲. **بارم‌ها.** قلمرو زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰. بخش «الف) درک مطلب»
 *    (۴ نمره) و «ب) معنی و مفهوم شعر و نثر» (۴ نمره) روی برگه دو زیربخشِ
 *    قلمرو فکری‌اند؛ مثل بقیهٔ seedهای فارسی۳ در یک section نگه داشته شده‌اند
 *    (سؤال‌های ۳۲–۴۰ و ۴۱–۴۸).
 *
 * ۳. **جایی که برگه «بنویسید» می‌گوید و اینجا گزینه آمده.** فقط سؤال ۳۵ (تطبیق
 *    ابراهیم/نمرود با شخصیت‌های گذر سیاوش از آتش): برگه چهار نام را در کمانک
 *    می‌دهد، پس به دو فهرست بازشو تبدیل شد تا تصحیح خودکار باشد. کلید تغییر نکرده.
 *
 * ۴. **سؤالِ ۶** روی برگه «کدام گزینه‌ها» می‌گوید و کلید دو گزینه (ب و د) را
 *    نادرست می‌داند؛ پس mcq-multi-select با minSelect = maxSelect = 2.
 *
 * ۵. **سؤال ۲۲.** ستون «ب» (آرایه‌ها) پنج مورد دارد و ستون «الف» (ابیات) چهار مورد؛
 *    «تلمیح» اضافی است. جهتِ تطبیق (برای هر بیت یک آرایه) همان کلید است.
 *
 * دو مورد `verified: false` دارند (سؤال ۱۳ و ۳۸ ب)؛ دلیل در sourceNote آمده.
 */
export const farsi3Khordad1404: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۴",
  examSession: "farsi-1404-khordad",
  totalScore: 20,
  sourcePdf: "farsi12-nahayi1404.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          pageRef: 139,
          instruction: "معنی واژهٔ مشخّص‌شده را بنویسید.",
          parts: [
            {
              type: "word-meaning-input",
              score: 0.25,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "چنان ",
                  "محظوظ",
                  "w1",
                  " گردیده بود که جلو رفته، جبههٔ شاعر را بوسیده گفت: «ای والله»",
                ),
              },
              correctAnswer: { w1: ["بهره‌ور", "بهره‌مند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 82,
          instruction: "کدام واژه، جزءِ معانی کلمهٔ مشخّص‌شده نیست؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام واژه جزءِ معانی کلمهٔ مشخّص‌شده نیست؟",
                stimulus: highlight1("چرا در ایل مانده‌ای و عمر را به ", "بطالت", " می‌گذرانی؟"),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بیهودگی", isCorrect: false },
                { text: "سرگردانی", isCorrect: true },
                { text: "بیکاری", isCorrect: false },
                { text: "کاهلی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          pageRef: 12,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text(
                  "«مفخر موجودات و رحمت عالمیان و صفوت آدمیان و تتمّهٔ دور زمان، محمد مصطفی (ص) ...»",
                ),
                questionText:
                  "مترادف واژهٔ «فایق» در عبارت «عصارهٔ تاکی به قدرت او شهد فایق شده» کدام کلمه در متن بالا است؟",
              },
              correctAnswer: { accepted: ["صفوت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          pageRef: 107,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "معنای واژهٔ «اندیشه» در بیت زیر با کدام گزینه یکسان است؟",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "و زین دختر شاه هاماوران" }],
                    [
                      { kind: "text", value: "پر " },
                      { kind: "highlight", value: "اندیشه" },
                      { kind: "text", value: " گشتی به دیگر کران" },
                    ],
                  ],
                },
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "چو شب تیره گردد شبیخون کنیم / ز دل ترس و اندیشه بیرون کنیم", isCorrect: false },
                { optionKey: "ب", text: "چو بشنید خسرو از آن شاد گشت / روانش ز اندیشه آزاد گشت", isCorrect: true },
                { optionKey: "ج", text: "غلام عشق شو کاندیشه این است / همه صاحب‌دلان را پیشه این است", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 5,
          instruction: "املای صحیح را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 40,
              content: {
                type: "mcq-inline",
                questionText: "دشمن (عنقریب / عنغریب) است که توی این دشت وسیع عملیات کند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "عنقریب", isCorrect: true },
                { text: "عنغریب", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 112,
              content: {
                type: "mcq-inline",
                questionText: "شیرمرد عرصهٔ ناوردهای (حول / هول)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "هول", isCorrect: true },
                { text: "حول", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 160,
              content: {
                type: "mcq-inline",
                questionText: "کدخدا و (مأمور / معمور) نامه رسانی و چند تن دیگر از اشخاص معروف در آن میان جای داشتند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مأمور", isCorrect: true },
                { text: "معمور", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 75,
          instruction: "در کدام گزینه‌ها غلط املایی دیده می‌شود؟",
          parts: [
            {
              type: "mcq-multi-select",
              score: 0.5,
              content: {
                type: "mcq-multi-select",
                questionText: "در کدام گزینه‌ها غلط املایی دیده می‌شود؟",
                minSelect: 2,
                maxSelect: 2,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: «ب یا نشعه (ص ۷۵)» و «د یا بگزارم (ص ۱۲۳)» — یعنی دو گزینهٔ نادرست ب و د؛ هر کدام ۰٫۲۵. pageRef سؤال ۷۵ است و صفحهٔ گزینهٔ د ۱۲۳.",
              options: [
                {
                  optionKey: "الف",
                  text: "آن وقت من هرچه اصرار و تعارف می‌کنم، تو بیشتر ابا و امتناع می‌ورزی.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "بر روی بام خانه، خسته از نشعهٔ خوب و پاک آن «اسرا» در بستر خویش به خواب رفتم.",
                  isCorrect: true,
                },
                {
                  optionKey: "ج",
                  text: "صبح، هنگام «چریغ آفتاب» کنار «قنات حسنی» در شهر سیرجان اتراق می‌کردیم.",
                  isCorrect: false,
                },
                { optionKey: "د", text: "چه جای آن است که من دست شاهان بگزارم.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 7,
          pageRef: 92,
          instruction: "در متن زیر، واژهٔ نادرست به کار رفته است، درست آن را بنویسید.",
          parts: [
            {
              type: "open-error-correction-in-passage",
              score: 0.25,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "بی آنکه بدانید تعقیبتان کردم؛ چون شما معلّمم بودید و از آموختن هیچ چیز به شاگردانتان دریغ نداشتید، تنها و تنها برای تعلیم گرفتن، شبه شما را در میان تاریکی تعقیب می‌کردم.",
                ),
              },
              correctAnswer: { wrongWord: "شبه", correctWord: "شبح" },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          instruction: "در گروه کلمات زیر دو نادرستی املایی به کار رفته‌است، درست آن‌ها را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 0.5,
              pageRef: 65,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 2,
                items: [
                  { id: "i1", text: "طیلسان و ردا" },
                  { id: "i2", text: "محظور و مانع" },
                  { id: "i3", text: "تبق و سینی" },
                  { id: "i4", text: "شیهه و آواز اسب" },
                  { id: "i5", text: "منقلب و دگرگون" },
                  { id: "i6", text: "سنا و ستایش" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i3", "i6"],
                corrections: { i3: "طبق و سینی", i6: "ثنا و ستایش" },
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote: "کلید: «طبق (۰٫۲۵، ص ۶۵)» و «ثنا (۰٫۲۵، ص ۱۰)».",
            },
          ],
        },
        {
          number: 9,
          instruction: "درستی یا نادرستی عبارت‌های زیر را مشخّص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 95,
              content: {
                type: "true-false",
                statementText:
                  "نقش ضمیر پیوسته در عبارت «وقتی که تعلّل کردند، موظّفشان کردید.» با عبارت «هم بر انگارهٔ عشق‌آبادش ساخته‌اند.» یکسان است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 115,
              content: {
                type: "true-false",
                statementText:
                  "در عبارت «و صدای شوم و نامردانه‌اش در چاه‌سار گوش می‌پیچید» یک ترکیب وصفی و دو ترکیب اضافی وجود دارد.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 123,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه «ممیّز» وجود ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "نهادند بر دشت هیزم دو کوه / جهانی نظاره شده هم گروه", isCorrect: false },
                { optionKey: "ب", text: "اینجا ... می‌توان چند حلقه چاه عمیق زد.", isCorrect: false },
                { optionKey: "ج", text: "هرکه داند گفت با خورشید راز / کی تواند ماند با یک ذرّه باز؟", isCorrect: true },
                { optionKey: "د", text: "بردن سیصد تومان پول تا تهران همراه یک محصّل، خطرناک است!", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 11,
          pageRef: 138,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«این بروز محبّت و دلبستگیِ غیرمترقّبهٔ هرگز ندیده و نشنیده»"),
                questionText: "در گروه اسمی بالا، نوع دومین وابستهٔ وابسته را بنویسید.",
              },
              correctAnswer: { accepted: ["قید صفت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          instruction: "جای خالی را با کلمات مناسب پر کنید.",
          layoutPattern: "list-of-parallel-blanks",
          parts: [
            {
              label: "الف",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 57,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "الگوی جملهٔ «مردم به او دهقان فداکار می‌گفتند»، نهاد + متمّم + ",
                  "f1",
                  " + فعل است.",
                ),
              },
              correctAnswer: { accepted: ["مسند"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 12,
              content: {
                type: "fill-blank-term",
                stimulus: poemLines("بنده همان به که ز تقصیر خویش", "عذر به درگاه خدای آورد"),
                passage: blank1("نوع حذف در بیت بالا ", "f2", " است."),
              },
              correctAnswer: {
                accepted: [
                  "معنوی",
                  "معنایی",
                  "به قرینهٔ معنوی",
                  "به قرینهٔ معنایی",
                  "حذف به قرینهٔ معنوی",
                  "حذف به قرینهٔ معنایی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید فقط «معنوی» را نوشته؛ «معنایی» و صورت‌های «به قرینهٔ …» را هم پذیرفتیم (مثل خرداد ۱۴۰۳ سؤال ۱۳).",
            },
            {
              label: "ج",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 123,
              content: {
                type: "fill-blank-term",
                passage: {
                  tokens: [
                    { kind: "text", value: "در بیت «بعد از آن مرغان دیگر سر به سر / عذرها گفتند " },
                    { kind: "highlight", value: "مشتی بی‌خبر" },
                    { kind: "text", value: "»، بخش مشخّص‌شده، نقش " },
                    { kind: "blank", blankId: "f3" },
                    { kind: "text", value: " دارد." },
                  ],
                },
              },
              correctAnswer: { accepted: ["بدل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          pageRef: 48,
          instruction: "نمودار پیکانی وابستهٔ وابسته را در بیت زیر رسم کنید.",
          parts: [
            {
              type: "diagram-builder",
              score: 0.25,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: poemLines("سینه خواهم شرحه شرحه از فراق", "تا بگویم شرح درد اشتیاق"),
                nodes: [
                  { id: "n1", label: "شرح" },
                  { id: "n2", label: "درد" },
                  { id: "n3", label: "اشتیاق" },
                ],
              },
              correctAnswer: {
                edges: [
                  { childId: "n2", parentId: "n1", label: "مضاف‌الیه" },
                  { childId: "n3", parentId: "n2", label: "مضاف‌الیه" },
                ],
              },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "کلید فقط «شرح درد اشتیاق (ص ۴۸)» را به‌صورت یک نمودار دست‌کشیده نشان می‌دهد؛ تعداد و جهت دقیق پیکان‌ها از روی همان تصویر کوچک خوانده شد. بر اساس ساختار «شرح ← درد ← اشتیاق» (مضاف‌الیه و مضاف‌الیهِ مضاف‌الیه) هر دو یال آمده است، مثل خرداد ۱۴۰۳ سؤال ۱۵. یک نفر با کلیدِ چاپی مقایسه کند.",
            },
          ],
        },
        {
          number: 14,
          pageRef: 72,
          instruction: "در عبارت زیر نوع «و» مشخّص‌شده را بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "همهٔ چشم‌ها به او بود که حوزهٔ حکمت را او گرم " },
                    { kind: "highlight", value: "و" },
                    {
                      kind: "text",
                      value: " چراغ علم و فلسفه و کلام را او که جانشین شایستهٔ وی بود، روشن نگاه دارد.",
                    },
                  ],
                },
                questionText: "نوع «و» مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["ربط", "پیوند", "حرف ربط", "حرف پیوند", "ربط یا پیوند"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «ربط یا پیوند».",
            },
          ],
        },
        {
          number: 15,
          pageRef: 13,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "زمان فعل مشخّص‌شده در بیت زیر با فعل کدام عبارت متفاوت است؟",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "گر کسی وصف او ز من " },
                      { kind: "highlight", value: "پرسد" },
                    ],
                    [{ kind: "text", value: "بی دل از بی‌نشان چه گوید باز؟" }],
                  ],
                },
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: الف («بار دیگرش به تضرّع و زاری بخواند»).",
              options: [
                { optionKey: "الف", text: "بار دیگرش به تضرّع و زاری بخواند.", isCorrect: true },
                { optionKey: "ب", text: "خانه‌ای کاو شود از دست اجانب آباد", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 16,
          pageRef: 103,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  "نقش واژه‌های «قصّه» و «سخت» در شعر «قصّه می‌گوید: / این برایش سخت آسان بود» با کدام واژه‌های بیت «مگر کآتش تیز پیدا کند / گنه کرده را زود رسوا کند» به ترتیب یکسان است؟",
                fields: [
                  { id: "f1", label: "واژهٔ هم‌نقش با «قصّه»" },
                  { id: "f2", label: "واژهٔ هم‌نقش با «سخت»" },
                ],
              },
              correctAnswer: { f1: ["آتش"], f2: ["زود"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «آتش (۰٫۲۵) زود (۰٫۲۵)».",
            },
          ],
        },
        {
          number: 17,
          pageRef: 27,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines("انصاف و عدل داشت موافق بسی", "ولی چون فرّخی، موافق ثابت قدم نداشت"),
                questionText: "نوع حرف ربط (پیوند) را در بیت بالا مشخّص کنید.",
              },
              correctAnswer: { accepted: ["هم‌پایه‌ساز", "همپایه‌ساز", "هم پایه‌ساز", "هم‌پایه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          instruction: "تفاوت معنایی فعل «ساخت» را در عبارت‌های زیر بررسی کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 139,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    {
                      kind: "text",
                      value: "به مناسبت صحبت از سیزده عید بنا کرد به خواندن قصیده‌ای که می‌گفت همین دیروز ",
                    },
                    { kind: "highlight", value: "ساخته است" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "معنای فعل «ساخت» را در عبارت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["سروده است", "گفته است"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«سروده است»، «گفته است» یا هر معنای مشابه (پرداخته است) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote:
                "کلید: «سروده است یا گفته است یا موارد مشابه». زیرخطِ «ساخته است» روی اسکن دیده نمی‌شد و بر اساس صورت سؤال («فعل ساخت») اضافه شده؛ فقط نمایشی است و در تصحیح اثر ندارد.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 65,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "علاوه بر آن، یک «پانوراما» در اینجا " },
                    { kind: "highlight", value: "ساخته شده" },
                    { kind: "text", value: " که از شاهکارهای هنری است." },
                  ],
                },
                questionText: "معنای فعل «ساخت» را در عبارت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["بنا شده است", "ایجاد شده است"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«بنا شده است»، «ایجاد شده است» یا هر معنای مشابه (پدید آمده است) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "زیرخطِ «ساخته شده» نمایشی است (مثل الف).",
            },
          ],
        },
        {
          number: 19,
          pageRef: 55,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«و لابدّ هرچه به واسطهٔ آن به خدا رسند، فرض باشد به نزدیک طالبان.»"),
                questionText: "مفهوم «ان» در جملهٔ بالا چیست؟",
              },
              correctAnswer: { accepted: ["نشانهٔ جمع", "نشانه جمع", "جمع"] },
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
          number: 20,
          instruction: "در هر عبارت کدام آرایهٔ ادبی داخل کمانک به کار نرفته است؟",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 48,
              content: {
                type: "mcq-inline",
                questionText: "هرکسی کاو دور ماند از اصل خویش / باز جوید روزگارِ وصل خویش",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: false },
                { text: "جناس همسان", isCorrect: true },
                { text: "تضاد", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 19,
              content: {
                type: "mcq-inline",
                questionText:
                  "گفت: «آگه نیستی کز سر درافتادت کلاه» / گفت: «در سر عقل باید، بی‌کلاهی عار نیست!»",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "جناس", isCorrect: false },
                { text: "پارادوکس", isCorrect: true },
                { text: "مراعات نظیر", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 152,
              content: {
                type: "mcq-inline",
                questionText:
                  "امّا خنده‌ات که رها می‌شود / و پروازکنان در آسمان مرا می‌جوید / تمامی درهای زندگی را / به رویم می‌گشاید",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشبیه", isCorrect: true },
                { text: "استعاره", isCorrect: false },
                { text: "کنایه", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 21,
          pageRef: 139,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«یکی از حضّار که کبّادهٔ شعر و ادب می‌کشید»"),
                questionText: "مفهوم کنایی «کبّاده کشیدن» را در عبارت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["ادعای چیزی داشتن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 92,
          instruction: "هریک از آرایه‌های ستون «ب» مربوط به کدام مورد از ستون «الف» است؟",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "جز گودالی که از کنجکاوی گلولهٔ توپ در خاک فراهم آمده بود، کجا می‌توانست مخفیگاه من باشد؟",
                  },
                  { id: "ب", text: "از سیم به سر یکی کلّه‌خود / ز آهن به میان یکی کمربند" },
                  { id: "ج", text: "مست شور و گرم گفتن بود" },
                  {
                    id: "د",
                    text: "آنجا در آن برزخ سرد، در کوچه‌های غم و درد / غیر از شب آیا چه می‌دید چشمان تار من و تو؟",
                  },
                ],
                columnB: [
                  { id: "1", text: "حس‌آمیزی" },
                  { id: "2", text: "حسن تعلیل" },
                  { id: "3", text: "نماد" },
                  { id: "4", text: "ایهام" },
                  { id: "5", text: "تلمیح" },
                ],
              },
              correctAnswer: { الف: "2", ب: "4", ج: "1", د: "3" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«تلمیح» (۵) اضافی است. کلید: الف→حسن تعلیل (ص ۹۲)، ب→ایهام (ص ۳۶)، ج→حس‌آمیزی (ص ۱۱۱)، د→نماد (ص ۸۶)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 23,
          instruction: "بخش‌های مشخّص‌شده در عبارت‌های زیر، چه آرایهٔ ادبی می‌آفرینند؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 66,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "متوجّه شدم که قدرت " },
                    { kind: "highlight", value: "قلم" },
                    { kind: "text", value: " این نویسنده تا چه حد بوده است." },
                  ],
                },
                questionText: "بخش مشخّص‌شده چه آرایه‌ای می‌آفریند؟",
              },
              correctAnswer: { accepted: ["مجاز"] },
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
                stimulus: {
                  tokens: [
                    { kind: "text", value: "آن شب نیز ماه با تألّؤ پرشکوهش از راه رسید و " },
                    { kind: "highlight", value: "گل‌های الماس" },
                    { kind: "text", value: " شکفتند." },
                  ],
                },
                questionText: "بخش مشخّص‌شده چه آرایه‌ای می‌آفریند؟",
              },
              correctAnswer: { accepted: ["استعاره", "استعارهٔ مصرّحه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 106,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                stimulus: poemLines("بدان‌گاه سوگند پرمایه شاه", "چنین بود آیین و این بود راه"),
                passage: blank1("در بیت بالا، زمینهٔ ", "b1", " حماسه دیده می‌شود."),
              },
              correctAnswer: { accepted: ["ملّی", "قومی", "ملّی یا قومی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 50,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام بیت شاعر بر پایهٔ تشبیه بین دو مصراع، ارتباط معنایی برقرار کرده‌است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "مستمع، صاحب سخن را بر سر کار آورد / غنچهٔ خاموش، بلبل را به گفتار آورد",
                  isCorrect: true,
                },
                { optionKey: "ب", text: "نی حدیث راه پرخون می‌کند / قصّه‌های عشق مجنون می‌کند", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 26,
          pageRef: 149,
          parts: [
            {
              type: "count-answer",
              score: 0.25,
              content: {
                type: "count-answer",
                questionText:
                  "نام خالق چند اثر، در مقابل آن به درستی نیامده است؟ «ارمیا: سیّد مهدی شجاعی – مثل درخت در شب باران: محمّدرضا شفیعی کدکنی – قصّهٔ شیرین فرهاد: احمد عربلو – سندبادنامه: ظهیری سمرقندی – کباب غاز: محمّدرضا رحمانی»",
                min: 0,
                max: 5,
              },
              correctAnswer: { value: 2 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: «۲ یا (به ذکر دو اثر نادرست «ارمیا» و «کباب غاز» نمره تعلق گیرد)». فهرست پنج اثر داخل questionText گذاشته شد چون در نمونه‌ها count-answer فیلد stimulus نداشت؛ اگر schema اجازه می‌دهد، بهتر است به stimulus (خط‌به‌خط) منتقل شود.",
            },
          ],
        },
        {
          number: 27,
          instruction: "نام پدیدآورندگان هر یک از آثار زیر را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 53,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "فیه ما فیه:" },
              correctAnswer: {
                accepted: [
                  "مولوی",
                  "مولانا",
                  "جلال‌الدین مولوی",
                  "مولانا جلال‌الدین",
                  "جلال‌الدین محمد بلخی",
                  "مولانا جلال‌الدین محمد بلخی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 87,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "دری به خانهٔ خورشید:" },
              correctAnswer: { accepted: ["سلمان هراتی", "هراتی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 54,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "همهٔ موارد زیر از آثار ترجمه‌شده به شمار می‌آیند؛ به جز .....",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "قصّه‌های دوشنبه", isCorrect: false },
                { optionKey: "ب", text: "فی حقیقة العشق", isCorrect: true },
                { optionKey: "ج", text: "کلیله و دمنه", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 119,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام گزینه تکمیل‌کنندهٔ مصراع «اگر مستم اگر هشیار اگر خوابم اگر بیدار» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "به سوی تو بود روی سجودم؛ میهن ای میهن!", isCorrect: true },
                { optionKey: "ب", text: "به هر حالت که بودم با تو بودم؛ میهن ای میهن!", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 30,
          pageRef: 119,
          instruction:
            "مصراع اوّل بیت زیر را مرتّب کنید. (مصراع دوم: «فدای نام تو بود و نبودم؛ میهن ای میهن!»)",
          parts: [
            {
              type: "word-reorder-dnd",
              score: 0.25,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["بودم", "پروردی", "با", "نابودی", "تو", "و", "مهر", "از", "کردی"],
              },
              correctAnswer: {
                orderedTokens: ["تو", "بودم", "کردی", "از", "نابودی", "و", "با", "مهر", "پروردی"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: «تو بودم کردی از نابودی و با مهر پروردی». مصراع دوم بیت (که روی برگه زیر توکن‌ها آمده) به instruction رفت چون content این نوع در نمونه‌ها stimulus نداشت.",
            },
          ],
        },
        {
          number: 31,
          pageRef: 98,
          instruction: "بیت زیر را کامل کنید.",
          parts: [
            {
              type: "verse-completion",
              score: 0.5,
              content: { type: "verse-completion", firstMesra: "خورشید، بی‌حفاظ نشسته به روی خاک؟" },
              correctAnswer: { accepted: ["یا ماه بی‌ملاحظه افتاده بین راه؟"] },
              gradingMode: "ai_semantic",
              verified: true,
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
        // ---- الف) درک مطلب (۴ نمره)
        {
          number: 32,
          pageRef: 23,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "یک دم غریق بحر خدا شو گمان مبر",
                  "کز آب هفت بحر به یک موی تر شوی",
                  "بنیاد هستی تو چو زیر و زبر شود",
                  "در دل مدار هیچ که زیر و زبر شوی",
                ),
                questionText: "مفهوم مشترک ابیات بالا را بنویسید.",
              },
              correctAnswer: { accepted: ["در امان بودن عاشق و مفاهیم مشابه"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 27,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("در دفتر زمانه فتد نامش از قلم", "هر ملّتی که مردم صاحب‌قلم نداشت"),
                questionText: "شاعر در بیت بالا، علّت فراموشی جوامع را چه می‌داند؟",
              },
              correctAnswer: { accepted: ["نداشتن نویسندگان یا مورّخان یا اندیشمندان"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 153,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "آتش عشق است کاندر نی فتاد" }],
                    [{ kind: "text", value: "جوشش عشق است کاندر می فتاد" }],
                    [{ kind: "text", value: "خندهٔ تو، در پاییز" }],
                    [{ kind: "text", value: "در کنارهٔ دریا" }],
                    [{ kind: "text", value: "موج کف‌آلوده‌اش را" }],
                    [{ kind: "text", value: "باید برفرازد" }],
                  ],
                },
                questionText: "اشعار بالا بر کدام ویژگی عشق تأکید دارند؟",
              },
              correctAnswer: {
                accepted: ["نیرو بخشی عشق یا عشق عامل جنبش و حرکت در هستی است و مفاهیم مشابه"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          pageRef: 108,
          instruction:
            "براساس مضمون بیت «آتش ابراهیم را نبود زیان / هر که نمرودی است، گو می‌ترس از آن» هر یک از موارد خواسته‌شده، معادل کدام شخصیّت‌ها در داستان گذر سیاوش از آتش (موبد / سیاوش / کیکاووس / سودابه) است؟",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["موبد", "سیاوش", "کیکاووس", "سودابه"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "t1",
                        value: "الف) ابراهیم:",
                        options: ["موبد", "سیاوش", "کیکاووس", "سودابه"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "t2",
                        value: "ب) نمرود:",
                        options: ["موبد", "سیاوش", "کیکاووس", "سودابه"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { t1: "سیاوش", t2: "سودابه" },
                weights: { t1: 0.25, t2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه دو جای خالیِ نوشتنی است و چهار نام در کمانک آمده؛ به دو فهرست بازشو با همان چهار نام تبدیل شد. کلید: «الف) سیاوش (۰٫۲۵)  ب) سودابه (۰٫۲۵)، ص ۱۰۸».",
            },
          ],
        },
        {
          number: 36,
          pageRef: 163,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«معلّم برای ما سرمشق‌هایی تازه انتخاب کرده بود که بر بالای آن‌ها عبارت «میهن، سرزمین نیاکان، زبان ملّی» به چشم می‌خورد. این سرمشق‌ها که به گوشهٔ میزهای تحریر ما آویزان بود چنان می‌نمود که گویی در چهار گوشهٔ اتاق، درفش ملّی ما را به اهتزاز درآورده باشند.»",
                ),
                questionText: "چرا راوی داستان، سرمشق‌ها را همچون درفش ملّی می‌داند؟",
              },
              correctAnswer: { accepted: ["زیرا زبان ملّی هر کشوری نشانهٔ هویّت آن است"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر پاسخ مشابه (زبان ملّی نشانهٔ هویّت و پرچم/نماد ملّت است) نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          pageRef: 54,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«و به عالَمِ عشق – که بالای همه است – نتوان رسیدن تا از معرفت و محبّت دو پایهٔ نردبان نسازد.»",
                ),
                questionText: "با توجّه به متن بالا، سهروردی شرط رسیدن به عالم عشق را چه می‌داند؟",
              },
              correctAnswer: { accepted: ["گذشتن از دو پایهٔ معرفت و محبّت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          instruction: "در هر یک از عبارت‌های زیر منظور از بخش مشخّص‌شده، چیست؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 75,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "قندیل زیبای پروین سرزد و " },
                    { kind: "highlight", value: "آن جادّهٔ روشن" },
                    {
                      kind: "text",
                      value: " و خیال‌انگیزی که گویی یک‌راست به ابدیّت می‌پیوندد.",
                    },
                  ],
                },
                questionText: "منظور از بخش مشخّص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["کهکشان", "راه شیری", "کهکشان راه شیری"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 165,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "کرامت کن درونی دردپرورد" }],
                    [
                      { kind: "text", value: "دلی در وی درون " },
                      { kind: "highlight", value: "درد" },
                      { kind: "text", value: " و برون درد" },
                    ],
                  ],
                },
                questionText: "منظور از بخش مشخّص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["عشق"] },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "پاسخ (عشق) از کلید قطعی است ولی روی اسکن مشخص نبود کدام «درد»ِ بیت زیرخط دارد (از «درون درد و برون درد» یکی را برداشتیم). فقط نمایشی است و در تصحیح اثر ندارد؛ با برگهٔ چاپی مقایسه شود.",
            },
          ],
        },
        {
          number: 39,
          pageRef: 125,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "با توجّه به مراحل عرفان از نظر عطّار، «تنهایی گزیدن و خالی شدن قلب سالک از آنچه جز خداست» با کدام بیت از موارد زیر در یک مرحله قرار می‌گیرد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مال اینجا بایدت انداختن / ملک اینجا بایدت درباختن", isCorrect: false },
                { optionKey: "ب", text: "رویها چون زین بیابان درکنند / جمله سر از یک گریبان برکنند", isCorrect: true },
                { optionKey: "ج", text: "هشت جنّت نیز اینجا مرده‌ای است / هفت دوزخ همچو یخ افسرده‌ای است", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 40,
          pageRef: 36,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines("با شیر سپهر بسته پیمان", "با اختر سعد کرده پیوند"),
                questionText: "بیت بالا به کدام ویژگی دماوند اشاره می‌کند؟",
              },
              correctAnswer: { accepted: ["بلندی و ارتفاع کوه دماوند", "بلندی", "ارتفاع"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        // ---- ب) معنی و مفهوم شعر و نثر (۴ نمره)
        {
          number: 41,
          pageRef: 63,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "به قول بیرجندی‌ها، " },
                    { kind: "highlight", value: "در این دو شهر تنها یک «سرپَری» زدیم" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["در این دو شهر فقط توقف کوتاهی کردیم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 42,
          pageRef: 12,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "هر نفسی که فرو می‌رود ممدّ حیات است و " },
                    { kind: "highlight", value: "چون بر می‌آید مفرّح ذات" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: {
                accepted: ["وقتی که نفس بیرون می‌آید (بازدم) شادی‌بخش وجود است"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "سه جزء، هرکدام ۰٫۲۵: «وقتی که نفس بیرون می‌آید (بازدم)»، «شادی‌بخش»، «وجود است».",
              verified: true,
            },
          ],
        },
        {
          number: 43,
          pageRef: 37,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "highlight", value: "شو منفجر ای دل زمانه" }],
                    [{ kind: "text", value: "وان آتش خود نهفته مپسند" }],
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["ای قلب روزگار (دماوند) فوران کن. (خشم خود را آشکار کن.)"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «ای قلب روزگار (دماوند)» و «فوران کن (خشم خود را آشکار کن)».",
              verified: true,
            },
          ],
        },
        {
          number: 44,
          pageRef: 48,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "کز نیستان تا مرا ببریده‌اند" }],
                    [{ kind: "highlight", value: "در نفیرم مرد و زن نالیده‌اند" }],
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["از فریاد و زاری من تمام آفریده‌ها گریان و نالان شدند"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «از فریاد و زاری من» و «تمام آفریده‌ها گریان و نالان شدند».",
              verified: true,
            },
          ],
        },
        {
          number: 45,
          pageRef: 87,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "با این نسیم سحرخیز، برخیز اگر جان سپردیم" }],
                    [{ kind: "highlight", value: "در باغ می‌ماند ای دوست، گل یادگار من و تو" }],
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: {
                accepted: ["ای دوست، در ایران (کشور) انقلاب (ارزش‌های انقلاب) از ما به یادگار می‌ماند"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «ای دوست، در ایران (کشور)» و «انقلاب (ارزش‌های انقلاب) از ما به یادگار می‌ماند».",
              verified: true,
            },
          ],
        },
        {
          number: 46,
          pageRef: 127,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [{ kind: "highlight", value: "محو او گشتند آخر بر دوام" }],
                    [{ kind: "text", value: "سایه در خورشید گم شد والسّلام" }],
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["سرانجام برای همیشه در ذات حق (سیمرغ) فانی شدند"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «سرانجام برای همیشه» و «در ذات حق (سیمرغ) فانی شدند».",
              verified: true,
            },
          ],
        },
        {
          number: 47,
          pageRef: 157,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  tokens: [
                    { kind: "highlight", value: "هر روز باید ذکری واحد را مکرّر بخوانم" },
                    {
                      kind: "text",
                      value: " و آنچه را قدیمی است، قدیمی ندانم: «که تو از آن منی، و من از آن تو».",
                    },
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: { accepted: ["هر روز باید یک سخن خاص (عاشقانه) را پیوسته بگویم"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «هر روز باید یک سخن خاص (عاشقانه) را» و «پیوسته بگویم».",
              verified: true,
            },
          ],
        },
        {
          number: 48,
          pageRef: 94,
          instruction: "معنی و مفهوم قسمت‌های مشخّص‌شدهٔ اشعار و عبارات زیر را به نثر روان بنویسید.",
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  tokens: [
                    { kind: "highlight", value: "آخرین رمق‌هایشان را در آخرین فشنگ‌هایشان می‌ریختند" },
                    { kind: "text", value: " و شلیک می‌کردند." },
                  ],
                },
                questionText: "معنی و مفهوم قسمت مشخّص‌شده را به نثر روان بنویسید.",
              },
              correctAnswer: {
                accepted: ["آخرین توانشان را با مهمّات جنگی باقی‌ماندهٔ خود همراه کردند"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «آخرین توانشان را» و «با مهمّات جنگی باقی‌ماندهٔ خود همراه کردند».",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
