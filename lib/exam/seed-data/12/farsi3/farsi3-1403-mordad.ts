import { blank1, highlightThenBlank, poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، نوبت تابستان ۱۴۰۳ (کلیهٔ رشته‌ها)
 * تاریخ برگه: ۱۴۰۳/۰۵/۲۹ (۲۹ مرداد) — ساعت شروع ۸ صبح، ۱۰۰ دقیقه.
 * Source: Shahrivar-1403-Farsi3-_www_konkur_in_.pdf — ۵ صفحه سؤال + ۳ صفحهٔ
 * «راهنمای تصحیح» (کلید، شمارهٔ صفحهٔ کتاب را هم دارد؛ همهٔ pageRefها از آن آمده‌اند).
 *
 * هر صفحه جداگانه با کیفیت بالا رندر و سؤال‌به‌سؤال با کلید تطبیق داده شد (متن OCR این
 * PDF وارونه و شکسته بود، پس متن و زیرخط‌ها از روی تصویر خوانده شدند).
 *
 * نکته‌هایی که موقعِ خواندنِ این فایل لازم است:
 *
 * ۱. **نام فایل و تاریخ.** فایل PDF «Shahrivar-1403» نام دارد ولی تاریخِ چاپ‌شده روی برگه
 *    ۱۴۰۳/۰۵/۲۹ است (ماهِ پنجم = مرداد) و فقط «تابستان ۱۴۰۳» نوشته. examSession را از خودِ
 *    برگه (`mordad-1403`) گرفتیم؛ اگر می‌خواهید `shahrivar-1403` باشد فقط همین یک فیلد را عوض کنید.
 *
 * ۲. **بارم‌ها.** قلمرو زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰ (سؤال ۳۸، «معنای ابیات و عبارات»، ۴ نمره
 *    و هشت زیربخش دارد: ۰٫۲۵+۰٫۲۵+۰٫۵×۴+۰٫۷۵×۲).
 *
 * ۳. **بدون تبدیل به فهرست بازشو.** هیچ سؤال نوشتنی‌ای در این آزمون به انتخابی تبدیل نشد.
 *
 * ۴. **سؤال‌های دوبخشیِ بدون برچسب روی برگه** (۱۵): کلید دو نمرهٔ ۰٫۲۵ جدا می‌دهد (وابستهٔ
 *    وابسته + نمودار پیکانی)، پس دو part «الف/ب» شد؛ برچسب‌ها ساختگی‌اند.
 *
 * ۵. **سؤال ۲۹** (مرتب‌کردن): روی برگه چهار عبارتِ «به هر …» به همین شکل پشت‌سرهم چاپ شده
 *    و ترتیبشان عوض است، پس توکن‌ها عبارت‌اند نه تک‌کلمه (جزئیات در sourceNote).
 *
 * هیچ سؤالی `verified: false` ندارد.
 */
export const farsi3Mordad1403: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی مرداد ۱۴۰۳ (نوبت تابستان)",
  examSession: "farsi-1403-mordad",
  totalScore: 20,
  sourcePdf: "Shahrivar-1403-Farsi3-_www_konkur_in_.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
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
                  "پدران و مادران نیز در تربیت و تعلیم شما چنان که باید ",
                  "اهتمام",
                  "w1a",
                  " نورزیده‌اند.",
                ),
              },
              correctAnswer: { w1a: ["کوشش", "سعی", "همت گماشتن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 30,
              content: {
                type: "word-meaning-input",
                passage: highlightThenBlank(
                  "دشمن با ",
                  "استقرار",
                  "w1b",
                  " سلاح‌های زیادی قلّه را در دست داشت.",
                ),
              },
              correctAnswer: {
                w1b: ["برپایی", "برقرار و ثابت کردن کسی یا چیزی در جایی", "مستقر شدن"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 61,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "معنی واژهٔ مشخّص‌شده، در کدام گزینه به درستی آمده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "بگرای چو اژدهای {{گرزه}} (خشمگین)", isCorrect: false },
                { optionKey: "ب", text: "نی {{حریف}} هر که از یاری برید (رقیب)", isCorrect: false },
                {
                  optionKey: "ج",
                  text: "چه {{استبعادی}} دارد که عمری باشد و روزی خاطراتی از سفر ماه هم بنویسم! (دور دانستن)",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "پاداش هر {{زخمهٔ}} سنگی را دست‌های کریم تو میوه‌ای چند شیرین ایثار کند. (جراحت)",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 3,
          pageRef: 134,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "«این حرف که در " },
                      { kind: "highlight", value: "بادی" },
                      {
                        kind: "text",
                        value: " امر زیاد بی‌پا و بی‌معنی به نظر می‌آمد، معلوم شد آن‌قدرها هم نامعقول نیست.»",
                      },
                    ],
                    [
                      {
                        kind: "text",
                        value:
                          "«یکی را از ملوک عجم حکایت کنند که دست تطاول به مال رعیّت دراز کرده بود و جور و اذیّت آغاز کرده.»",
                      },
                    ],
                  ],
                },
                questionText: "واژهٔ «بادی» در جملهٔ نخست، با کدام واژه در متن دوم مترادف است؟",
              },
              correctAnswer: { accepted: ["آغاز"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          instruction: "املای درست را در جمله‌های زیر، انتخاب نمایید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 109,
              content: {
                type: "mcq-inline",
                questionText: "داشتم می‌گفتم، آن شب نیز (صورت / سورت) سرمای دی بیدادها می‌کرد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "صورت", isCorrect: false },
                { text: "سورت", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 93,
              content: {
                type: "mcq-inline",
                questionText: "سرتان را روی زمین (بگذارم / بگزارم) و بروم.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بگذارم", isCorrect: true },
                { text: "بگزارم", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 39,
              content: {
                type: "mcq-inline",
                questionText: "گاهی می‌ایستد و علف و (خواری / خاری) را پوزه می‌زند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "خواری", isCorrect: false },
                { text: "خاری", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 139,
          instruction: "در گروه واژگان زیر، دو نادرستی املایی به کار رفته است؛ درست آن‌ها را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 0.5,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 2,
                items: [
                  { id: "i1", text: "ضجّه و شیون" },
                  { id: "i2", text: "بغولات و حبوبات" },
                  { id: "i3", text: "سریر و اورنگ" },
                  { id: "i4", text: "طیلسان و ردا" },
                  { id: "i5", text: "متاع و فرمانروا" },
                  { id: "i6", text: "مشایعت و بدرقه" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i2", "i5"],
                corrections: { i2: "بقولات و حبوبات", i5: "مطاع و فرمانروا" },
              },
              gradingMode: "ai_partial_credit",
              verified: true,
              sourceNote: "کلید: «بقولات (۰٫۲۵، ص ۱۳۹)» و «مطاع (۰٫۲۵، ص ۱۳)».",
            },
          ],
        },
        {
          number: 6,
          pageRef: 159,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه نادرستی املایی به کار رفته است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: د («مستقرق» به‌جای «مستغرق»).",
              options: [
                { optionKey: "الف", text: "و از کُربت جورش راه غربت گرفتند.", isCorrect: false },
                { optionKey: "ب", text: "صدای غرّش تانک نزدیک‌تر می‌شد.", isCorrect: false },
                {
                  optionKey: "ج",
                  text: "آن شب من نیز خود را بر روی بام خانه گذاشته بودم و به نظارهٔ آسمان رفته بودم.",
                  isCorrect: false,
                },
                { optionKey: "د", text: "در این اندیشه‌ها مستقرق بودم که دیدم مرا به نام خواندند.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 7,
          pageRef: 80,
          parts: [
            {
              type: "mcq-plus-correction",
              score: 0.5,
              content: {
                type: "mcq-plus-correction",
                questionText: "در کدام عبارت غلط املایی وجود دارد؟",
                correctionPrompt: "درست آن را بنویسید.",
              },
              correctAnswer: { correctionAnswers: ["تهویه"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «الف (۰٫۲۵) تهویه (۰٫۲۵) (در صورتی که کلمهٔ تهویه به تنهایی ذکر شود، نمرهٔ کامل تعلق می‌گیرد)».",
              options: [
                { optionKey: "الف", text: "بساط تحویه به تهران نرسیده بود.", isCorrect: true },
                {
                  optionKey: "ب",
                  text: "هرچه به واسطهٔ آن به خدا رسند فرض باشد به نزدیک طالبان.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 8,
          pageRef: 84,
          instruction: "با توجّه به ابیات زیر، به پرسش‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: poemLines(
                  "دیروز اگر سوخت ای دوست، غم برگ و بار من و تو",
                  "امروز می‌آید از باغ، بوی بهار من و تو",
                  "دیروز در غربت باغ من بودم و یک چمن داغ",
                  "امروز خورشید در دشت، آینه‌دار من و تو",
                ),
                questionText: "در ابیات بالا جملهٔ وابسته (پیرو) را مشخص کنید.",
              },
              correctAnswer: {
                accepted: [
                  "دیروز اگر سوخت غم برگ و بار من و تو",
                  "دیروز اگر سوخت ای دوست، غم برگ و بار من و تو",
                  "مصراع اول",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "«دیروز اگر سوخت غم برگ و بار من و تو» (با یا بدون «ای دوست») یا «مصراع اول» نمرهٔ کامل دارد.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  lines: [
                    [
                      { kind: "text", value: "دیروز در غربت باغ من بودم " },
                      { kind: "highlight", value: "و" },
                      { kind: "text", value: " یک چمن داغ" },
                    ],
                    [{ kind: "text", value: "امروز خورشید در دشت، آینه‌دار من و تو" }],
                  ],
                },
                questionText: "در بیت دوم، نوع «و» مشخص‌شده، عطف است یا ربط؟",
              },
              correctAnswer: { accepted: ["ربط", "حرف ربط"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          pageRef: 101,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مفهوم نشانهٔ «ان» در عبارت «همگنان را خون گرمی بود» با کدام گزینه یکسان است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: ب (واژهٔ «دوان»).",
              options: [
                {
                  optionKey: "الف",
                  text: "گفت: «مستی زان سبب افتان و خیزان می‌روی» / گفت: «جرم راه رفتن نیست، ره هموار نیست»",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "سرانجام گفت ایمن از هر دوان / نگردد مرا دل، نه روشن روان",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 10,
          instruction: "تفاوت معنایی فعل «ساخت» را در نمونه‌های زیر بررسی کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 137,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "بنا کرد به خواندن قصیده‌ای که می‌گفت همین دیروز " },
                    { kind: "highlight", value: "ساخته‌است" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "معنای فعل «ساخت» را در نمونهٔ بالا بنویسید.",
              },
              correctAnswer: { accepted: ["سروده است", "گفته است"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«سروده است»، «گفته است» یا هر پاسخ مشابه نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "زیرخطِ «ساخته‌است» روی اسکن دیده نمی‌شد و بر اساس صورت سؤال اضافه شده؛ فقط نمایشی است.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 104,
              content: {
                type: "short-text-answer",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "سیاوش سیه را به تندی بتاخت" }],
                    [
                      { kind: "text", value: "نشد تنگ‌دل جنگ آتش " },
                      { kind: "highlight", value: "بساخت" },
                    ],
                  ],
                },
                questionText: "معنای فعل «ساخت» را در نمونهٔ بالا بنویسید.",
              },
              correctAnswer: { accepted: ["آماده شد", "مهیا شد"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«آماده شد»، «مهیا شد» یا هر پاسخ مشابه نمرهٔ کامل دارد.",
              verified: true,
              sourceNote: "زیرخطِ «بساخت» نمایشی است (مثل الف).",
            },
          ],
        },
        {
          number: 11,
          pageRef: 53,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نقش ضمیر پیوسته در مصراع «بعد از این وادیّ توحید آیدت» مشابه کدام گزینه است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "در عشق کسی قدم نهد کِش جان نیست", isCorrect: true },
                { optionKey: "ب", text: "آن خضر که فرخنده‌پی‌اش نام نهادند", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 12,
          pageRef: 70,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام یک از گزینه‌های زیر «صفتِ مضاف‌الیه» دیده می‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "جلد دوم کتاب بینوایان", isCorrect: false },
                { optionKey: "ب", text: "غرفهٔ بلند آسمانش", isCorrect: false },
                { optionKey: "ج", text: "چشمهٔ آبی سرد", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 13,
          pageRef: 62,
          instruction:
            "در عبارت «رم پایتخت ایتالیا شهری است قدیمی، دیوارهای قطور و باروهای دودخوردهٔ آن به زبان حال بازگو می‌کند که روزگاری از فراز همین برج‌ها، فرمان به سواحل دریای سیاه داده می‌شده» موارد خواسته‌شده را بیابید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "بدل:" },
              correctAnswer: { accepted: ["پایتخت ایتالیا"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: "معطوف:" },
              correctAnswer: { accepted: ["باروهای دودخوردهٔ آن", "باروهای دودخورده آن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          instruction: "نقش دستوری واژه‌های مشخّص‌شده را بنویسید.",
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
                stimulus: {
                  tokens: [
                    { kind: "text", value: "گفت: «تا " },
                    { kind: "highlight", value: "داروغه" },
                    { kind: "text", value: " را گوییم، در مسجد بخواب»" },
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
              pageRef: 27,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "ما را " },
                    { kind: "highlight", value: "فراغتی" },
                    { kind: "text", value: " است که جمشید جم نداشت" },
                  ],
                },
                questionText: "نقش دستوری واژهٔ مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["نهاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 46,
          instruction: "در بیت زیر «وابستهٔ وابسته» را مشخّص کنید و نمودار پیکانی آن را رسم نمایید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("هر کسی کاو دور ماند از اصل خویش", "باز جوید روزگار وصل خویش"),
                questionText: "وابستهٔ وابسته را در بیت بالا مشخّص کنید.",
              },
              correctAnswer: { accepted: ["خویش"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «خویش (۰٫۲۵)».",
            },
            {
              label: "ب",
              type: "diagram-builder",
              score: 0.25,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: poemLines("هر کسی کاو دور ماند از اصل خویش", "باز جوید روزگار وصل خویش"),
                nodes: [
                  { id: "n1", label: "روزگار" },
                  { id: "n2", label: "وصل" },
                  { id: "n3", label: "خویش" },
                ],
              },
              correctAnswer: {
                edges: [
                  { childId: "n2", parentId: "n1", label: "مضاف‌الیه" },
                  { childId: "n3", parentId: "n2", label: "مضاف‌الیه" },
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: نمودار گروه اسمی «روزگار وصل خویش» با دو پیکان (خویش ← وصل، وصل ← روزگار).",
            },
          ],
        },
        {
          number: 16,
          pageRef: 151,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "الگوی «نهاد + مفعول + مسند + فعل» در کدام گزینه دیده نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "عشق جاودانی همواره معشوق را جوان می‌بیند.", isCorrect: false },
                { optionKey: "ب", text: "همواره عشق قدیم را موضوع صحیفهٔ شعر خود می‌گرداند.", isCorrect: false },
                { optionKey: "ج", text: "گل آبی، گل سرخِ کشورم مرا می‌خواند.", isCorrect: true },
                { optionKey: "د", text: "محبت چون به غایت رسد آن را عشق خوانند.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 17,
          pageRef: 112,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«در تگِ تاریکِ چاهِ ژرفِ پهناور»"),
                questionText: "در عبارت بالا یک ترکیب اضافی پیدا کنید.",
              },
              correctAnswer: { accepted: ["تگ چاه", "تگِ چاه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 92,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                stimulus: text("«عشق کردم از اینکه فهمیده‌اید که انهدام آن تیربار کار من بوده‌است.»"),
                questionText: "زمان دقیق فعل جملهٔ دوم را بنویسید.",
              },
              correctAnswer: { accepted: ["ماضی نقلی"] },
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
          number: 19,
          pageRef: 19,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "قالب شعری کدام بیت «قطعه» است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ای دیو سپید پای در بند / ای گنبد گیتی ای دماوند", isCorrect: false },
                {
                  optionKey: "ب",
                  text: "محتسب مستی به ره دید و گریبانش گرفت / مست گفت: «ای دوست، این پیراهن است افسار نیست»",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 20,
          pageRef: 75,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کتاب «کویر» اثر دکتر علی شریعتی، سفرنامه است یا حسب‌حال؟",
              },
              correctAnswer: { accepted: ["حسب حال", "حسب‌حال"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          instruction: "جاهای خالی را کامل کنید.",
          layoutPattern: "list-of-parallel-blanks",
          parts: [
            {
              label: "الف",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 114,
              content: {
                type: "fill-blank-term",
                passage: blank1("شعر «خوان هشتم» از کتاب ", "f1", " مهدی اخوان ثالث انتخاب شده‌است."),
              },
              correctAnswer: {
                accepted: ["در حیاط کوچک پاییز در زندان", "در حیاط کوچک پاییز"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 151,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "نویسندهٔ مجموعه شعر «هوا را از من بگیر، خنده‌ات را نه!» ",
                  "f2",
                  " است.",
                ),
              },
              correctAnswer: { accepted: ["پابلو نرودا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          instruction: "قسمت مشخّص‌شده در هر عبارت بیانگر کدام آرایهٔ ادبی است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 14,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "به خاطر داشتم که چون به " },
                    { kind: "highlight", value: "درخت گل" },
                    { kind: "text", value: " رسم، دامنی پر کنم هدیهٔ اصحاب را." },
                  ],
                },
                questionText: "قسمت مشخّص‌شده بیانگر کدام آرایهٔ ادبی است؟",
              },
              correctAnswer: { accepted: ["استعاره", "استعارهٔ مصرّحه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 62,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "از بیم " },
                    { kind: "highlight", value: "عقرب جرّارهٔ دموکراسی" },
                    { kind: "text", value: " قرن بیستم، ناچار شده به مار غاشیهٔ حکومت سرهنگ‌ها پناه برد." },
                  ],
                },
                questionText: "قسمت مشخّص‌شده بیانگر کدام آرایهٔ ادبی است؟",
              },
              correctAnswer: { accepted: ["تشبیه", "اضافهٔ تشبیهی", "اضافه تشبیهی"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «تشبیه (اضافهٔ تشبیهی)».",
            },
          ],
        },
        {
          number: 23,
          instruction: "آرایهٔ درست را از داخل کمانک برگزینید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
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
                { text: "ایهام", isCorrect: true },
                { text: "جناس", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 26,
              content: {
                type: "mcq-inline",
                questionText:
                  "خانه‌ای کاو شود از دست اجانب آباد / ز اشک ویران کُنَش آن خانه که بیت‌الحَزَن است",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "متناقض‌نما", isCorrect: false },
                { text: "تضاد", isCorrect: true },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 84,
              content: {
                type: "mcq-inline",
                questionText:
                  "دیروز در غربت باغ من بودم و یک چمن داغ / امروز خورشید در دشت، آینه‌دار من و تو",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشخیص", isCorrect: true },
                { text: "حس‌آمیزی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 24,
          instruction: "مفهوم کنایه‌های مشخّص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 89,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "فکر اینکه مرا شناخته باشید، " },
                    { kind: "highlight", value: "دلم را گرم کرد" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "مفهوم کنایی بخش مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مرا امیدوار کرد", "مرا خوشحال کرد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 151,
              content: {
                type: "short-text-answer",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "روشنی را، بهار را، / از من بگیر / اما خنده‌ات را هرگز / تا " },
                    { kind: "highlight", value: "چشم از دنیا نبندم" },
                    { kind: "text", value: "." },
                  ],
                },
                questionText: "مفهوم کنایی بخش مشخّص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["تا نمیرم", "نمیرم", "تا نمیرم (مردن)"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "«تا نمیرم» (مردن) یا هر پاسخ مشابه نمرهٔ کامل دارد.",
              verified: true,
            },
          ],
        },
        {
          number: 25,
          pageRef: 103,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("پراگنده کافور بر خویشتن", "چنان چون بود رسم و ساز کفن"),
                questionText: "زمینهٔ حماسی بیت بالا چیست؟",
              },
              correctAnswer: {
                accepted: ["ملّی", "ملی", "میهنی", "قومی", "ملّی یا میهنی یا قومی"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید: «ملی یا میهنی یا قومی».",
            },
          ],
        },
        {
          number: 26,
          pageRef: 62,
          instruction: "آرایهٔ مناسب هر بیت را از ستون «ب» انتخاب نمایید. (در ستون «ب» یک مورد اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "دل گرمی و دم سردی ما بود که گاهی / مرداد مه و گاه دی‌اش نام نهادند" },
                  { id: "ب", text: "عشق چون آید برد هوش دل فرزانه را / دزد دانا می‌کشد اوّل چراغ خانه را" },
                  { id: "ج", text: "بیامد دو صد مرد آتش‌فروز / دمیدند گفتی شب آمد به روز" },
                  { id: "د", text: "خیس خون داغ سهراب و سیاوش‌ها / روکش تابوت تخته‌هاست" },
                ],
                columnB: [
                  { id: "1", text: "اسلوب معادله" },
                  { id: "2", text: "تلمیح" },
                  { id: "3", text: "جناس همسان" },
                  { id: "4", text: "اغراق" },
                  { id: "5", text: "حسن تعلیل" },
                ],
              },
              correctAnswer: { الف: "5", ب: "1", ج: "4", د: "2" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«جناس همسان» (۳) اضافی است. کلید: الف→حسن تعلیل (ص ۶۲)، ب→اسلوب معادله (ص ۴۹)، ج→اغراق (ص ۱۰۳)، د→تلمیح (ص ۱۱۰)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 27,
          pageRef: 57,
          instruction: "بیت زیر را کامل کنید.",
          parts: [
            {
              type: "verse-completion",
              score: 0.5,
              content: { type: "verse-completion", firstMesra: "آیینهٔ نگاهت، پیوند صبح و ساحل" },
              correctAnswer: { accepted: ["لبخند گاه‌گاهت، صبح ستاره‌باران"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          pageRef: 96,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: {
                  lines: [
                    [{ kind: "text", value: "ماه آمده به دیدن خورشید، صبح زود" }],
                    [{ kind: "text", value: "......................................................." }],
                  ],
                },
                questionText: "کدام مصراع، تکمیل‌کنندهٔ بیت بالا است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "یا ماه بی‌ملاحظه افتاده بین راه؟", isCorrect: false },
                { optionKey: "ب", text: "خورشید رفته است سر شب سراغ ماه", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 117,
          instruction:
            "مصراع اول بیت زیر را مرتّب کنید. (مصراع دوم: «به هر حالت که بودم با تو بودم؛ میهن ای میهن!»)",
          parts: [
            {
              type: "word-reorder-dnd",
              score: 0.25,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["به هر زندان", "به هر مجلس", "به هر ماتم", "به هر شادی"],
              },
              correctAnswer: {
                orderedTokens: ["به هر مجلس", "به هر زندان", "به هر شادی", "به هر ماتم"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "کلید: «به هر مجلس به هر زندان به هر شادی به هر ماتم». توکن‌ها عبارت‌اند (نه تک‌کلمه) چون روی برگه چهار عبارتِ «به هر …» به همین ترتیبِ به‌هم‌ریخته چاپ شده. مصراع دوم به instruction رفت چون content این نوع در نمونه‌ها stimulus نداشت.",
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
          number: 30,
          pageRef: 13,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "عاشقان کشتگان معشوق‌اند",
                  "بر نیاید ز کشتگان آواز",
                  "این مدعیان در طلبش بی‌خبران‌اند",
                  "کان را که خبر شد، خبری باز نیامد",
                ),
                questionText: "مفهوم مشترک بیت‌های بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: ["سکوت یا بی‌ادعایی عاشقان حقیقی (رازداری عارفان و فنایافتگان)"],
              },
              gradingMode: "ai_semantic",
              verified: true,
              sourceNote: "کلید: ص ۱۳ و ۱۴؛ «یا هر مفهوم مشابه».",
            },
          ],
        },
        {
          number: 31,
          pageRef: 123,
          instruction: "هر بیت زیر، یادآور کدام وادی از هفت وادی عرفان است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("روی‌ها چون زین بیابان درکنند", "جمله سر از یک گریبان برکنند"),
                questionText: "این بیت یادآور کدام وادی است؟",
              },
              correctAnswer: { accepted: ["توحید", "وادی پنجم", "توحید (وادی پنجم)"] },
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
                stimulus: poemLines("هشت جنّت نیز اینجا مرده‌ای است", "هفت دوزخ همچو یخ افسرده‌ای است"),
                questionText: "این بیت یادآور کدام وادی است؟",
              },
              correctAnswer: { accepted: ["استغنا", "وادی چهارم", "استغنا (وادی چهارم)"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          pageRef: 46,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: poemLines("در ره عشق نشد کس به یقین محرم راز", "هر کسی بر حسب فکر گمانی دارد"),
                questionText: "مفهوم بیت بالا از کدام گزینه دریافت می‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "هر کسی از ظنّ خود شد یار من / از درون من نجست اسرار من",
                  isCorrect: true,
                },
                { optionKey: "ب", text: "سرّ من از نالهٔ من دور نیست / لیک چشم و گوش را آن نور نیست", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 33,
          pageRef: 10,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                stimulus: poemLines(
                  "همه غیبی تو بدانی، همه عیبی تو بپوشی",
                  "همه بیشی تو بکاهی، همه کمّی تو فزایی",
                ),
                questionText:
                  "جملهٔ «پردهٔ ناموس بندگان به گناه فاحش ندرد» با کدام بخش از بیت بالا ارتباط مفهومی دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "1", text: "همه غیبی تو بدانی", isCorrect: false },
                { optionKey: "2", text: "همه عیبی تو بپوشی", isCorrect: true },
                { optionKey: "3", text: "همه بیشی تو بکاهی", isCorrect: false },
                { optionKey: "4", text: "همه کمّی تو فزایی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 34,
          pageRef: 19,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines(
                  "گفت: «می بسیار خوردی، زان چنین بی‌خود شدی»",
                  "گفت: «ای بیهوده‌گو، حرف کم و بسیار نیست»",
                ),
                questionText: "مصراع دوم بیت بالا، بر چه موضوعی تأکید دارد؟",
              },
              correctAnswer: {
                accepted: ["ملاک نفس عمل حرام است نه میزان انجام و ارتکاب کم یا زیاد آن"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          pageRef: 35,
          instruction: "مفهوم مناسب هر بیت را از ستون «ب» مشخّص کنید. (در ستون ب یک مورد اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "شو منفجر ای دل زمانه / وان آتش خود نهفته مپسند" },
                  { id: "ب", text: "ز خورشید و از آب و از باد و خاک / نگردد تبه نام و گفتار پاک" },
                  { id: "ج", text: "سیاوش چنین گفت کای شهریار / که دوزخ مرا زین سخن گشت خوار" },
                  { id: "د", text: "هرگز دلم برای کم و بیش غم نداشت / آری نداشت غم که غم بیش و کم نداشت" },
                ],
                columnB: [
                  { id: "1", text: "جاودانگیِ نام نیک" },
                  { id: "2", text: "ترجیح مرگ بر ننگ" },
                  { id: "3", text: "وارستگی" },
                  { id: "4", text: "جاه‌طلبی" },
                  { id: "5", text: "دعوت به ظلم‌ستیزی" },
                ],
              },
              correctAnswer: { الف: "5", ب: "1", ج: "2", د: "3" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "«جاه‌طلبی» (۴) اضافی است. کلید: الف→دعوت به ظلم‌ستیزی (ص ۳۵)، ب→جاودانگیِ نام نیک (ص ۸۶)، ج→ترجیح مرگ بر ننگ (ص ۱۰۴)، د→وارستگی (ص ۲۷)؛ pageRef سؤال به صفحهٔ اولی اشاره دارد.",
            },
          ],
        },
        {
          number: 36,
          instruction: "درستی یا نادرستی عبارت‌های زیر را مشخّص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 154,
              content: {
                type: "true-false",
                statementText:
                  "عبارت «تو ای کشتی تندرو خیال من، همین‌جا لنگر انداز؛ زیرا برای تو بیش از این اجازهٔ سفر نیست» به ناتوانی انسان در شناخت هستی اشاره دارد.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 163,
              content: {
                type: "true-false",
                statementText:
                  "مفهوم بیت «دلم را داغ عشقی بر جبین نه / زبانم را بیانی آتشین ده» طلب رهایی از عشق است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          pageRef: 159,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: text(
                  "«وقتی قومی به اسارت دشمن درآید و مغلوب و مقهور بیگانه گردد، تا وقتی که زبان خویش را همچنان حفظ کند، همچون کسی است که کلید زندان خویش را در دست داشته باشد.»",
                ),
                questionText: "عبارت بالا بیانگر اهمیت کدام بُعد از هویت ملی است؟",
              },
              correctAnswer: { accepted: ["پاسداری از زبان ملی", "زبان ملی"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          instruction: "معنای ابیات و عبارات زیر را به نثر روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 92,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "بچه‌ها هم از دست آن ذلّه شده بودند.",
              },
              correctAnswer: { accepted: ["بچه‌ها هم از دست آن خسته شده بودند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 101,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "پر اندیشه شد جان کاووس کی",
              },
              correctAnswer: { accepted: ["کیکاووس بسیار نگران شد"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "به معنی واژهٔ «اندیشه» (نگرانی) نمره تعلق می‌گیرد.",
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
                questionText: "خوان نعمت بی‌دریغش همه جا کشیده.",
              },
              correctAnswer: {
                accepted: ["سفرهٔ نعمت بی‌مضایقه‌اش (بی‌چشم‌داشت) همه جا گسترده است"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «سفرهٔ نعمت» و «بی‌مضایقه‌اش (بی‌چشم‌داشت) همه جا گسترده است».",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 35,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "بفکن ز پی این اساس تزویر",
              },
              correctAnswer: { accepted: ["پایه‌های ریا و دورویی را نابود گردان"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «پایه‌های ریا و دورویی» و «را نابود گردان».",
              verified: true,
            },
            {
              label: "ه",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 47,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "محرم این هوش جز بی‌هوش نیست",
              },
              correctAnswer: { accepted: ["تنها عاشق واقعی محرم حقیقت عشق است"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "دو جزء، هرکدام ۰٫۲۵: «تنها عاشق واقعی» و «محرم حقیقت عشق است».",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 60,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "هنگام چریغ آفتاب در کنار قنات حسنی در شهر سیرجان اتراق می‌کردیم.",
              },
              correctAnswer: {
                accepted: ["هنگام طلوع آفتاب در کنار قنات حسنی در شهر سیرجان اقامت کوتاه می‌کردیم"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "دو جزء، هرکدام ۰٫۲۵: «هنگام طلوع آفتاب» و «در کنار قنات حسنی در شهر سیرجان اقامت کوتاه می‌کردیم».",
              verified: true,
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.75,
              pageRef: 137,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  "محتاج به تذکار نیست که ایشان در خوراک هم سرسوزنی قصور را جایز نمی‌شمردند.",
              },
              correctAnswer: {
                accepted: ["نیاز به یادآوری نیست که ایشان در خوردن هم اندکی کوتاهی را جایز نمی‌شمردند"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "سه جزء، هرکدام ۰٫۲۵: «نیاز به یادآوری نیست»، «که ایشان در خوردن هم اندکی» و «کوتاهی را جایز نمی‌شمردند».",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.75,
              pageRef: 120,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "چون بود کاقلیم ما را شاه نیست؟ / بیش از این بی‌شاه بودن راه نیست",
              },
              correctAnswer: {
                accepted: ["چگونه است که سرزمین ما شاه ندارد؟ بی‌شاه بودن بیشتر از این درست نیست"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "سه جزء، هرکدام ۰٫۲۵: «چگونه است»، «که سرزمین ما شاه ندارد» و «بی‌شاه بودن بیشتر از این درست نیست».",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
