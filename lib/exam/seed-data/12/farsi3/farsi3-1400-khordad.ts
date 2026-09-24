import { highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، خرداد ۱۴۰۰ (رشتهٔ ریاضی-فیزیک و علوم تجربی)
 * تاریخ برگه: ۱۴۰۰/۰۳/۰۳ — نوبت خرداد.
 * Source: Khordad-1400-Farsi3-_www_konkur_in_.pdf — ۴ صفحه سؤال + ۲ صفحهٔ
 * «راهنمای تصحیح» (کلید، شمارهٔ صفحهٔ کتاب را هم دارد؛ همهٔ pageRefها از آن آمده‌اند).
 *
 * هر صفحهٔ برگه جداگانه با کیفیت بالا خوانده و سؤال‌به‌سؤال با کلید تطبیق داده شد
 * (زیرخط‌ها هم از روی تصویر رندرشده، نه فقط متنِ OCR).
 *
 * نکته‌هایی که موقعِ خواندنِ این فایل لازم است:
 *
 * ۱. **رشته.** برخلاف دو seed نهایی دیگر («همهٔ رشته‌ها»)، این برگه مخصوص ریاضی-فیزیک و
 *    علوم تجربی است. اگر برای هر رشته یک نشستِ جدا لازم است، examSession را عوض کنید.
 *
 * ۲. **بارم‌ها.** قلمرو زبانی ۷٫۵ + ادبی ۴ + فکری ۸٫۵ = ۲۰.
 *    - سؤال ۲۰ (معنی به نثر روان) روی برگه یک ردیفِ بی‌نمره است که ۷ زیربخشِ نمره‌دار دارد
 *      (الف تا ز: ۰٫۵+۰٫۵+۰٫۵+۰٫۵+۰٫۷۵+۰٫۷۵+۰٫۵ = ۴).
 *    - سؤال‌های ۲۱ تا ۲۹ زیرعنوانِ «به پرسش‌های مربوط به درک مطلب پاسخ دهید» (۴٫۵ نمره)
 *      هستند و مثل seedهای دیگر در همان section قلمرو فکری آمده‌اند.
 *
 * ۳. **جایی که برگه «بنویسید» می‌گوید و اینجا گزینه آمده.** فقط سؤال ۱۵ (یک اثر از اخوان
 *    ثالث و یک اثر از سلمان هراتی): پاسخ از میان چهار عنوانِ خودِ برگه است، پس به دو
 *    فهرست بازشو تبدیل شد. کلید تغییر نکرده.
 *
 * ۴. **غلط چاپی روی خودِ برگه (سؤال ۲۹).** مصراع دوم بیت اول «جمله سر از یک بیابان
 *    برکنند» چاپ شده (در متن اصلی «گریبان» است). عیناً مثل برگه نگه داشته شد؛
 *    جزئیات در sourceNote همان سؤال.
 *
 * هیچ سؤالی `verified: false` ندارد.
 */
export const farsi3Khordad1400: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۰ (ریاضی-فیزیک و علوم تجربی)",
  examSession: "farsi-1400-khordad",
  totalScore: 20,
  sourcePdf: "Khordad-1400-Farsi3-_www_konkur_in_.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7.5,
      questions: [
        {
          number: 1,
          instruction: "معنی هریک از واژه‌های مشخّص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 138,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("دیدم توطئهٔ ما دارد ", "می‌ماسد", "w1a", "."),
              },
              correctAnswer: { w1a: ["به نتیجه می‌رسد", "به ثمر می‌رسد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 104,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("که گفتی ", "سمن", "w1b", " داشت اندر کنار"),
              },
              correctAnswer: { w1b: ["نوعی درخت گل", "یاسمن", "گل یاسمن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 114,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("جنگ بود این یا شکار آیا / میزبانی بود یا ", "تزویر", "w1c", ""),
              },
              correctAnswer: { w1c: ["دورویی", "ریاکاری", "نیرنگ"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 122,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank("پیشت آید هر زمانی صد ", "تعب", "w1d", ""),
              },
              correctAnswer: { w1d: ["رنج و سختی", "رنج", "سختی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          instruction: "در بیت‌های زیر، تفاوت معنایی واژهٔ «دستور» را بررسی کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 48,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "چه نیکو گفت با جمشید " },
                      { kind: "highlight", value: "دستور" },
                    ],
                    [{ kind: "text", value: "که با نادان نه شیون باد و نه سور" }],
                  ],
                },
                questionText: "معنای «دستور» را در بیت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["مشاور و وزیر", "مشاور", "وزیر"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«مشاور»، «وزیر» یا «مشاور و وزیر» (و مترادف‌های درست) نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 47,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "تن ز جان و جان ز تن مستور نیست" }],
                    [
                      { kind: "text", value: "لیک کس را دید جان " },
                      { kind: "highlight", value: "دستور" },
                      { kind: "text", value: " نیست" },
                    ],
                  ],
                },
                questionText: "معنای «دستور» را در بیت بالا بنویسید.",
              },
              correctAnswer: { accepted: ["اجازه", "رخصت", "اجازه، رخصت"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«اجازه»، «رخصت» یا مترادف‌های درست نمرهٔ کامل دارد.",
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
              pageRef: 12,
              content: {
                type: "mcq-inline",
                questionText: "واصفان حلیهٔ جمالش به تحیّر (منصوب / منسوب)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "منصوب", isCorrect: false },
                { text: "منسوب", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 19,
              content: {
                type: "mcq-inline",
                questionText: "گفت از (بهر / بحر) غرامت جامه‌ات بیرون کنم.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بهر", isCorrect: true },
                { text: "بحر", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 4,
          instruction: "در هریک از موارد زیر، یک نادرستی املایی بیابید و درست آن را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 114,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "همچنان که می‌توانست او، اگر می‌خواست، / کان کمندِ شصت خمّ خویش بگشاید / و بیاندازد به بالا، ...",
                ),
              },
              correctAnswer: { wrongWord: "بیاندازد", correctWord: "بیندازد" },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "open-error-correction-in-passage",
              score: 0.25,
              pageRef: 134,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "در کتل و گردنهٔ یک دوجین شکم و روده مراحل مضق و بلع و هضم و تحلیل را پیموده است.",
                ),
              },
              correctAnswer: { wrongWord: "مضق", correctWord: "مضغ" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "غلطِ چاپی‌شده روی برگه «مضق» است (کلید: «مضغ»)؛ از روی تصویر رندرشده خوانده شد.",
            },
          ],
        },
        {
          number: 5,
          pageRef: 100,
          instruction: "در گروه کلمه‌های زیر، دو مورد نادرستی املایی وجود دارد؛ درست هریک را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 0.5,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 2,
                items: [
                  { id: "i1", text: "آذرم و حیا" },
                  { id: "i2", text: "خار و بی‌ارزش" },
                  { id: "i3", text: "سورت سرمای دی" },
                  { id: "i4", text: "زهر شمشیر و سنان" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i1", "i2"],
                corrections: { i1: "آزرم و حیا", i2: "خوار و بی‌ارزش" },
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote: "کلید: «آزرم و حیا (۰٫۲۵، ص ۱۰۰)» و «خوار و بی‌ارزش (۰٫۲۵، ص ۱۰۱)».",
            },
          ],
        },
        {
          number: 6,
          pageRef: 53,
          instruction: "در نوشتهٔ زیر، نقش دستوری واژه‌های مشخّص‌شده را تعیین کنید.",
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "«پروانه " },
                    { kind: "highlight", value: "قوت" },
                    { kind: "text", value: " از عشق آتش خورد و همهٔ جهان، " },
                    { kind: "highlight", value: "آتش" },
                    { kind: "text", value: " بیند.»" },
                  ],
                },
                questionText: "نقش دستوری واژه‌های مشخّص‌شده را، به ترتیب، بنویسید.",
                fields: [
                  { id: "f1", label: "نقش «قوت»" },
                  { id: "f2", label: "نقش «آتش»" },
                ],
              },
              correctAnswer: { f1: ["مفعول"], f2: ["مسند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          pageRef: 19,
          instruction:
            "با توجّه به بیت‌های زیر، درستی یا نادرستی موارد داده‌شده را تعیین کنید. «گفت: نزدیک است والی را سرای، آن‌جا شویم / گفت: والی از کجا در خانهٔ خمّار نیست؟ / گفت: تا داروغه را گوییم در مسجد بخواب / گفت: مسجد خوابگاه مردم بدکار نیست»",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "در بیت اول، فعل «شویم»، اسنادی و فعل «نیست»، غیراسنادی است.",
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
                statementText:
                  "در بیت دوم، «خوابگاه مردم»، یک ترکیب اضافی و «مردم بدکار» یک ترکیب وصفی است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          instruction: "نوع وابستهٔ وابسته را در هریک از موارد زیر تعیین کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 64,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "متوجّه شدم که قدرتِ قلمِ " },
                    { kind: "highlight", value: "نویسنده" },
                    { kind: "text", value: " تا چه حد بوده است." },
                  ],
                },
                questionText: "نوع وابستهٔ وابستهٔ مشخّص‌شده را بنویسید.",
              },
              correctAnswer: {
                accepted: ["مضاف‌الیه مضاف‌الیه", "مضاف‌الیهِ مضاف‌الیه", "مضاف الیه مضاف الیه"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 73,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "اینجا می‌توان چند " },
                    { kind: "highlight", value: "حلقه" },
                    { kind: "text", value: " چاه عمیق زد." },
                  ],
                },
                questionText: "نوع وابستهٔ وابستهٔ مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["ممیّز", "ممیز"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 84,
          instruction:
            "با توجّه به بیت زیر، به پرسش‌ها پاسخ دهید. «آن‌جا در آن برزخ سرد، در کوچه‌های غم و درد / غیر از شب آیا چه می‌دید چشمان تار من و تو؟»",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نوع «واو» در مصراع اول، حرف ربط است یا عطف؟",
              },
              correctAnswer: { accepted: ["عطف"] },
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
                questionText: "در مصراع دوم، کدام واژه نقش «نهاد» دارد؟",
              },
              correctAnswer: { accepted: ["چشمان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          pageRef: 90,
          instruction:
            "در نوشتهٔ «فکر کردم اگر پیش‌تر بروم، به حتم گم می‌شوم. بر تلّ خاکی نشستم. حتّی اگر من صدایتان نمی‌کردم، متوجّه حضور من نمی‌شدید.» به پرسش‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "زمان کدام فعل «مضارع التزامی» است؟",
              },
              correctAnswer: { accepted: ["بروم"] },
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
                questionText: "در واژهٔ «صدایتان»، نقش دستوری ضمیر پیوستهٔ «تان» چیست؟",
              },
              correctAnswer: { accepted: ["مفعول"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 110,
          instruction:
            "به پرسش‌های زیر پاسخ دهید. «هفت خوان را زادسرو مرو، / ... / آن هریوهٔ خوب و پاک‌آیین روایت کرد؛ / خوان هشتم را / من روایت می‌کنم اکنون / من که نامم ماث /»",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "گروه اسمی «آن هریوهٔ خوب»، چه نوع نقش تبعی دارد؟",
              },
              correctAnswer: { accepted: ["بدل"] },
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
                questionText: "نقش دستوری واژهٔ «اکنون» را بنویسید.",
              },
              correctAnswer: { accepted: ["قید"] },
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
                questionText: "واژهٔ «هشتم» کدام یک از انواع وابسته‌های پسین است؟",
              },
              correctAnswer: {
                accepted: [
                  "صفت شمارشی",
                  "صفت شمارشی (ترتیبی)",
                  "صفت ترتیبی",
                  "شمارشی",
                  "ترتیبی",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «صفت شمارشی (ترتیبی)».",
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در گروه اسمی «زادسرو مرو»، هسته را مشخّص کنید.",
              },
              correctAnswer: { accepted: ["زادسرو"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          pageRef: 141,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: { type: "mcq-inline", questionText: "در کدام گزینه، جملهٔ مرکّب دیده می‌شود؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "بی‌اختیار در را باز کردم و این جوان نمک‌نشناس را بیرون انداختم.",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "از خوش‌مشربی و فضل و کمال او چیزها گفتند و نمرهٔ تلفن او را از من خواستند.",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "آقای مصطفی خیلی معذرت خواستند که بدون خداحافظی با آقایان رفتند.",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "فوراً مسئلهٔ میهمانی و قرار با رفقا را با عیالم در میان گذاشتم.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 13,
          pageRef: 152,
          instruction: "مفهوم نشانهٔ «ان» را در واژه‌های زیر بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "دیلمان:" },
              correctAnswer: {
                accepted: ["مکان", "مکان (مکان زندگی مردم دیلم)", "نشانهٔ مکان", "مکان زندگی مردم دیلم"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "«مکان» (مکان زندگی مردم دیلم) نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "خواهان:" },
              correctAnswer: { accepted: ["صفت فاعلی"] },
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
      sectionScore: 4,
      questions: [
        {
          number: 14,
          instruction: "نام صاحب هریک از آثار داده‌شده را از کمانک مقابل آن انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 155,
              content: { type: "mcq-inline", questionText: "غزلواره‌ها (شکسپیر / پابلو نرودا)" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "شکسپیر", isCorrect: true },
                { text: "پابلو نرودا", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 93,
              content: { type: "mcq-inline", questionText: "سانتاماریا (مهرداد اوستا / سید مهدی شجاعی)" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مهرداد اوستا", isCorrect: false },
                { text: "سید مهدی شجاعی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 114,
          instruction: "از بین آثار زیر، به ترتیب یک اثر از اخوان ثالث و یک اثر از سلمان هراتی بیابید.",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.5,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: [
                  "از پاریز تا پاریس",
                  "دری به خانهٔ خورشید",
                  "هوا را از من بگیر خنده‌ات را نه",
                  "در حیاط کوچک پاییز در زندان",
                ],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "t1",
                        value: "یک اثر از اخوان ثالث:",
                        options: [
                          "از پاریز تا پاریس",
                          "دری به خانهٔ خورشید",
                          "هوا را از من بگیر خنده‌ات را نه",
                          "در حیاط کوچک پاییز در زندان",
                        ],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "t2",
                        value: "یک اثر از سلمان هراتی:",
                        options: [
                          "از پاریز تا پاریس",
                          "دری به خانهٔ خورشید",
                          "هوا را از من بگیر خنده‌ات را نه",
                          "در حیاط کوچک پاییز در زندان",
                        ],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: {
                  t1: "در حیاط کوچک پاییز در زندان",
                  t2: "دری به خانهٔ خورشید",
                },
                weights: { t1: 0.25, t2: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه دو جای خالیِ نوشتنی است و چهار عنوان همان‌جا آمده؛ به دو فهرست بازشو با همان چهار عنوان تبدیل شد. کلید: «در حیاط کوچک پاییز در زندان (۰٫۲۵، ص ۱۱۴)» و «دری به خانهٔ خورشید (۰٫۲۵، ص ۸۵)».",
            },
          ],
        },
        {
          number: 16,
          instruction: "در هریک از موارد زیر، با توجّه به بخش‌های مشخّص‌شده، کدام آرایهٔ ادبی دیده می‌شود؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 12,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "فراش باد صبا را گفته تا " },
                    { kind: "highlight", value: "فرش زمرّدین" },
                    { kind: "text", value: " بگسترد و دایهٔ ابر بهاری را گفته تا بنات نبات بپرورد." },
                  ],
                },
                questionText: "با توجّه به بخش مشخّص‌شده، کدام آرایهٔ ادبی دیده می‌شود؟",
              },
              correctAnswer: { accepted: ["استعاره", "مجاز"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «استعاره (با توجه به کتاب علوم و فنون ۲ اگر مجاز هم نوشته شود صحیح است)».",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 27,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "در دفتر زمانه " },
                      { kind: "highlight", value: "فتد نامش از قلم" },
                    ],
                    [{ kind: "text", value: "هر ملتی که مردم صاحب قلم نداشت." }],
                  ],
                },
                questionText: "با توجّه به بخش مشخّص‌شده، کدام آرایهٔ ادبی دیده می‌شود؟",
              },
              correctAnswer: { accepted: ["کنایه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 101,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "نهادند بر دشت هیزم دو کوه" }],
                    [
                      { kind: "highlight", value: "جهانی" },
                      { kind: "text", value: " نظاره شده هم گروه" },
                    ],
                  ],
                },
                questionText: "با توجّه به بخش مشخّص‌شده، کدام آرایهٔ ادبی دیده می‌شود؟",
              },
              correctAnswer: { accepted: ["مجاز"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 95,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "تا باز کند به روی عالم" }],
                    [
                      { kind: "text", value: "دیباچهٔ " },
                      { kind: "highlight", value: "خاطرات شیرین" },
                    ],
                  ],
                },
                questionText: "با توجّه به بخش مشخّص‌شده، کدام آرایهٔ ادبی دیده می‌شود؟",
              },
              correctAnswer: { accepted: ["حس‌آمیزی", "حس آمیزی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          pageRef: 126,
          instruction: "با توجّه به منطق‌الطیر عطار، هریک از پرندگان زیر، نماد چه کسانی هستند؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "بلبل:" },
              correctAnswer: {
                accepted: ["انسان‌هایی که عاشق حقیقی نیستند و به عشق‌های دنیوی و ناپایدار دل بسته‌اند"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر پاسخ مشابه (عاشقان غیرحقیقی / دل‌بستگان به عشق‌های دنیوی و ناپایدار) نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "هدهد:" },
              correctAnswer: { accepted: ["پیر و مرشد و راهنما", "پیر", "مرشد", "راهنما"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«پیر»، «مرشد»، «راهنما» یا ترکیبی از آن‌ها نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          instruction: "در هریک از موارد زیر، آرایهٔ درست را از کمانک مقابل آن، انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 48,
              content: {
                type: "mcq-inline",
                questionText: "مستمع صاحب سخن را بر سر کار آورد / غنچهٔ خاموش بلبل را به گفتار آورد",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اسلوب معادله", isCorrect: true },
                { text: "حسن تعلیل", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 103,
              content: {
                type: "mcq-inline",
                questionText: "یکی تازی‌ای برنشسته سیاه / همی خاک نعلش برآمد به ماه",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تناقض", isCorrect: false },
                { text: "اغراق", isCorrect: true },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 62,
              content: {
                type: "mcq-inline",
                questionText: "صد تیغ جفا بر سر و تن دید یکی چوب / تا شد تهی از خویش و نی‌اش نام نهادند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشخیص", isCorrect: true },
                { text: "تضمین", isCorrect: false },
              ],
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 109,
              content: {
                type: "mcq-inline",
                questionText:
                  "همگنان خاموش / گرد بر گردش به کردار صدف بر گرد مروارید / پای تا سر گوش",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "جناس همسان", isCorrect: false },
                { text: "تشبیه", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 19,
          pageRef: 151,
          instruction:
            "با توجّه به سرودهٔ «آن‌گاه که پاهایم می‌روند و بازمی‌گردند / نان را، هوا را، روشنی را، بهار را، از من بگیر / اما خنده‌ات را هرگز / تا چشم از دنیا نبندم» به پرسش‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "یک نمونه آرایهٔ تضاد بیابید." },
              correctAnswer: {
                accepted: ["می‌روند و بازمی‌گردند", "می‌روند / بازمی‌گردند", "می‌روند و بازمی‌گردند (تضاد)"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ «می‌روند و بازمی‌گردند» (یا هر نمونهٔ درست تضاد در سروده) نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "مفهوم کنایهٔ «چشم از دنیا نبندم» چیست؟",
              },
              correctAnswer: { accepted: ["نمیرم", "تا زمانی که زنده‌ام"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«نمیرم» یا «تا زمانی که زنده‌ام» (یا هر پاسخ مشابه) نمرهٔ کامل دارد.",
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
      sectionScore: 8.5,
      questions: [
        // ---- سؤال ۲۰: معنی به نثر روان (۴ نمره)
        {
          number: 20,
          instruction: "معنی هریک از موارد زیر را به نثر روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 46,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "سینه خواهم شرحه شرحه از فراق",
              },
              correctAnswer: {
                accepted: [
                  "دلی می‌خواهم که از درد جدایی پاره‌پاره شده باشد",
                  "محرمی می‌خواهم که سختی جدایی کشیده باشد",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 62,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "امپراتوری‌های بزرگ هم مانند آدم‌های ثروتمند، معمولاً از سوء هاضمه می‌میرند.",
              },
              correctAnswer: {
                accepted: ["حکومت‌های بزرگ هم مانند انسان‌های ثروتمند و پرخور از زیاده‌خواهی نابود می‌شوند"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 100,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "که هر چند فرزند هست ارجمند / دل شاه از اندیشه یابد گزند",
              },
              correctAnswer: {
                accepted: [
                  "هر چند فرزند عزیز و گرانقدر است، اما بدگمانی به فرزند، دل شاه را آزرده خواهد کرد",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «هر چند فرزند عزیز و گرانقدر است، اما بدگمانی به فرزند» و «دل شاه را آزرده خواهد کرد».",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 89,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "طفره می‌رفتید ولی اصرارهای من، عاقبت شما را متقاعد کرد.",
              },
              correctAnswer: {
                accepted: ["خودداری می‌کردید اما اصرارهای من شما را مجاب و راضی کرد"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «خودداری می‌کردید» و «اما اصرارهای من شما را مجاب و راضی کرد».",
              verified: true,
            },
            {
              label: "ه",
              type: "short-text-answer",
              score: 0.75,
              pageRef: 120,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "چون بُوَد کاقلیم ما را شاه نیست / بیش از این بی‌شاه بودن راه نیست",
              },
              correctAnswer: {
                accepted: ["چرا سرزمین ما شاه ندارد؟ بیش از این بدون شاه بودن شایسته نیست"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء: «چرا سرزمین ما شاه ندارد» (۰٫۵) و «بیش از این بدون شاه بودن شایسته نیست» (۰٫۲۵).",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.75,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  "این بدبخت‌ها سال آزگار یک بار برایشان چنین پایی می‌افتد و شکم‌ها را مدتی است صابون زده‌اند که کباب بخورند.",
              },
              correctAnswer: {
                accepted: [
                  "این بدبخت‌ها هر سال طولانی یک بار برایشان چنین موقعیتی پیش می‌آید و مدتی است انتظار کشیده‌اند (گرسنگی کشیده‌اند، به خود وعده داده‌اند) که کباب بخورند",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "سه جزء، هرکدام ۰٫۲۵: «این بدبخت‌ها هر سال طولانی»، «یک بار برایشان چنین موقعیتی پیش می‌آید» و «مدتی است انتظار کشیده‌اند (گرسنگی کشیده‌اند، به خود وعده داده‌اند) که کباب بخورند».",
              verified: true,
              sourceNote: "کلید برای این زیربخش شمارهٔ صفحهٔ کتاب ندارد.",
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 155,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  "آیا چیزی در مخیّلهٔ آدمی می‌گنجد که بتواند آن را بنگارد / اما جان صادق من آن را برای تو ترسیم نکرده باشد؟",
              },
              correctAnswer: {
                accepted: [
                  "فکر و خیالی در ذهن انسان نمی‌گنجد که بتواند آن را بنویسد، اما روح راستگو و درست‌کردار من آن را برای تو، ای عشق جاودانی، به تصویر نکشیده باشد",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «فکر و خیالی در ذهن انسان نمی‌گنجد که بتواند آن را بنویسد» و «اما روح راستگو و درست‌کردار من آن را برای تو، ای عشق جاودانی، به تصویر نکشیده باشد».",
              verified: true,
            },
          ],
        },
        // ---- درک مطلب (۴٫۵ نمره): سؤال‌های ۲۱ تا ۲۹
        {
          number: 21,
          pageRef: 13,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                stimulus: text(
                  "«یکی از یاران به طریق انبساط گفت: از این بوستان که بودی، ما را چه تحفه کرامت کردی؟»",
                ),
                questionText: "در نوشتهٔ بالا، منظور از «به طریق انبساط» چیست؟",
              },
              correctAnswer: { accepted: ["به شیوهٔ صمیمی و خودمانی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 35,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "پنهان مکن آتش درون را" }],
                    [
                      { kind: "text", value: "زین " },
                      { kind: "highlight", value: "سوخته‌جان" },
                      { kind: "text", value: " شنو یکی پند" },
                    ],
                    [
                      { kind: "text", value: "گر " },
                      { kind: "highlight", value: "آتش" },
                      { kind: "text", value: " دل نهفته داری" },
                    ],
                    [{ kind: "text", value: "سوزد جانت به جانت سوگند" }],
                  ],
                },
                questionText:
                  "با توجّه به شعر «دماوندیه»، منظور از بخش‌های مشخّص‌شده در بیت‌های بالا چیست؟",
                fields: [
                  { id: "f1", label: "منظور از «سوخته‌جان»" },
                  { id: "f2", label: "منظور از «آتش»" },
                ],
              },
              correctAnswer: {
                f1: ["شاعر (ملک‌الشعرای بهار)", "شاعر", "ملک‌الشعرای بهار"],
                f2: ["خشم", "اعتراض", "خشم، اعتراض"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 23,
          pageRef: 76,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: {
                  lines: [
                    [
                      {
                        kind: "text",
                        value:
                          "* «من نمازم را وقتی می‌خوانم / که اذانش را باد گفته‌باشد سر گلدستهٔ سرو / من نمازم را پی تکبیرالاحرام علف می‌خوانم /»",
                      },
                    ],
                    [
                      {
                        kind: "text",
                        value:
                          "* «در کویر خدا حضور دارد ... و حتّی درختش، غارش، کوهش، هر صخرهٔ سنگش و سنگریزه‌اش آیات وحی را بر لب دارد.»",
                      },
                    ],
                  ],
                },
                questionText: "از مقایسهٔ سرودهٔ سهراب سپهری با نوشتهٔ بالا، چه مفهوم مشترکی دریافت می‌شود؟",
              },
              correctAnswer: {
                accepted: [
                  "همهٔ موجودات در حال تسبیح خداوند هستند (یُسبّح لله ما فی السّموات و ما فی الارض)",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 85,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines(
                  "با این نسیم سحرخیز، برخیز اگر جان سپردیم",
                  "در باغ می‌ماند ای دوست، گل یادگار من و تو",
                ),
                questionText: "در بیت بالا، منظور از «نسیم سحرخیز» و «باغ» چیست؟",
                fields: [
                  { id: "f1", label: "منظور از «نسیم سحرخیز»" },
                  { id: "f2", label: "منظور از «باغ»" },
                ],
              },
              correctAnswer: {
                f1: ["انقلاب و قیام مردم", "انقلاب", "قیام مردم"],
                f2: ["وطن، کشور", "وطن", "کشور"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 104,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("چو بخشایش پاک یزدان بود", "دم آتش و آب یکسان بود"),
                questionText: "بیت بالا بر چه مفهومی تأکید دارد؟",
              },
              correctAnswer: {
                accepted: [
                  "لطف و عنایت حق، انسان را از آسیب‌ها در امان نگه می‌دارد (آتش سوزان مثل آب، سرد می‌شود)",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 114,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "مرد نقّال – آن صدایش گرم، نایش گرم",
                  "آن سکوتش ساکت و گیرا",
                  "و دمش چونان حدیث آشنایش گرم –",
                  "راه می‌رفت و سخن می‌گفت",
                ),
                questionText: "در سرودهٔ بالا، منظور شاعر از «حدیث آشنای نقّال» چیست؟",
              },
              correctAnswer: {
                accepted: [
                  "داستان‌های شاهنامه (حماسهٔ ملی ایران)",
                  "داستان‌های شاهنامه",
                  "حماسهٔ ملی ایران",
                ],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 134,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«مصطفی جان، می‌خواهم امروز نشان بدهی چند مرده حلّاجی و از زیر سنگ هم شده یک غاز برای ما پیدا کنی.»",
                ),
                questionText: "در نوشتهٔ بالا، منظور نویسنده از مثل «چند مرده حلّاجی» چیست؟",
              },
              correctAnswer: { accepted: ["میزان قدرت و توانایی تو چقدر است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 155,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "هر روز باید ذکری واحد را مکرّر بخوانم",
                  "و آنچه را قدیمی است، قدیمی ندانم: «که تو از آن منی و من از آن تو»،",
                  "این گونه است که عشق جاودانی همواره معشوق را جوان می‌بیند",
                ),
                questionText: "با توجّه به سرودهٔ بالا، یکی از ویژگی‌های عشق جاودانی را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "عشق قدیم را هر چه قدر قدیمی باشد، کهنه و بی‌ارزش نمی‌شمارد",
                  "همواره معشوق را جوان می‌بیند",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "هر یک از این دو مورد (یا مفهوم مشابه) نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "کلید: «یکی از این دو مورد…».",
            },
          ],
        },
        {
          number: 29,
          pageRef: 123,
          instruction:
            "با توجّه به هفت وادی عرفانی منطق‌الطیر، هریک از بیت‌های ردیف نخست، با کدام بیت در ردیف دوم، یادآور وادی مشترکی است؟ (در ردیف دوم، یک بیت اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 0.5,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "1", text: "روی‌ها چون زین بیابان درکنند / جمله سر از یک بیابان برکنند" },
                  { id: "2", text: "دل چه بندی در این سرای مجاز / همّت پست کی رسد به فراز" },
                ],
                columnB: [
                  { id: "الف", text: "هریکی بینا شود بر قدر خویش / بازیابد در حقیقت صدر خویش" },
                  { id: "ب", text: "چشم بگشا به گلستان و ببین / جلوهٔ آب صاف در گل و خار" },
                  { id: "ج", text: "مال اینجا بایدت انداختن / ملک اینجا بایدت درباختن" },
                ],
              },
              correctAnswer: { "1": "ب", "2": "ج" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "بیت «الف» ردیف دوم اضافی است. کلید: ۱←ب (۰٫۲۵، ص ۱۲۳) و ۲←ج (۰٫۲۵، ص ۱۲۷). مصراع دوم بیت ۱ روی برگه «جمله سر از یک بیابان برکنند» چاپ شده (متن اصلی: «یک گریبان»)؛ عیناً مثل برگه آمده. اگر می‌خواهید اصلاح شود، «بیابان» دوم را به «گریبان» تغییر دهید.",
            },
          ],
        },
      ],
    },
  ],
};
