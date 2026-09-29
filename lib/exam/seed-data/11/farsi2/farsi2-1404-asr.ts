import { highlight1, poemLines, text, ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۲ یازدهم — آزمون شبه‌نهایی عصر اردیبهشت ۱۴۰۴ (ریاضی‌فیزیک و علوم تجربی)
 * تاریخ برگه: ۱۴۰۴/۰۲/۱۵ — ساعت شروع ۱۳:۳۰، ۱۰۰ دقیقه.
 * Source: Farsi2-Asr1404-[konkur.in].pdf — ۴ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 *
 * کنترل سه‌مرحله‌ای:
 * ۱) متن، گزینه‌ها، کلمات مشخص‌شده و بارم‌ها با تصویر چهار صفحه سؤال تطبیق داده شد.
 * ۲) پاسخ هر سؤال و pageRef با دو صفحه راهنمای تصحیح تطبیق داده شد.
 * ۳) نوع سؤال، gradingMode، جمع بارم قلمروها، املای عمدیِ داخل سؤال و syntax فایل کنترل شد.
 *
 * بارم‌ها: قلمرو زبانی ۷ + قلمرو ادبی ۵ + قلمرو فکری ۸ = ۲۰.
 */
export const farsi2Asr1404: SeedExam = {
  subject: "farsi2",
  grade: 11,
  title: "فارسی۲ یازدهم — آزمون شبه‌نهایی عصر اردیبهشت ۱۴۰۴",
  examSession: "farsi2-1404-ordibehesht-asr",
  totalScore: 20,
  sourcePdf: "Farsi2-Asr1404-[konkur.in].pdf",
  sections: [
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
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
                inputVariant: "word",
                stimulus: poemLines("برو شیر درنده باش ای دغل", "مینداز خود را چو روباه شل"),
                questionText: "در بیت بالا یک برابر معنایی برای واژهٔ «حیله‌گر» مشخص کنید.",
              },
              correctAnswer: { accepted: ["دغل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 24,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text("«هم خطواتش متقارب به هم» / «بر قدم او قدمی می‌کشید / وز رقم او رقمی می‌کشید»"),
                questionText: "مفرد واژهٔ «خطواتش» با کدام واژه در بیت دوم هم‌معنی است؟",
              },
              correctAnswer: { accepted: ["قدم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 119,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام گزینه، معادل معنایی داخل کمانک با واژهٔ قبل از آن یکسان نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "نومید و خایب (عصبانی) باز گردد.", isCorrect: true },
                { optionKey: "ب", text: "مادرم شماتتم (سرزنشم) کرد.", isCorrect: false },
                { optionKey: "ج", text: "در نوع خودش متمکن (ثروتمند) به شمار می‌رفت.", isCorrect: false },
                { optionKey: "د", text: "از هر طرف نفیر (فریاد) برآمد.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 4,
          pageRef: 112,
          instruction: "معادل معنای کلمهٔ مشخص‌شده را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: `چنین آن دو ماهر در آداب ضرب / ز هم رد نمودند هفتاد ${ul("حرب")} (حرفه / جنگ)`,
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "حرفه", isCorrect: false },
                { text: "جنگ", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 42,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه غلط املایی وجود ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "نشان از به هم خوردن توازن قوای دو کشور همسایه و برتری و چیره‌گی کشور رقیب بود.",
                  isCorrect: false,
                },
                { optionKey: "ب", text: "آنگاه آگاه شدند که غرقه خاست شد.", isCorrect: false },
                { optionKey: "ج", text: "از نظر اخلاق و صیرت سرآمد روزگار خود بود.", isCorrect: false },
                { optionKey: "د", text: "هرگز بار خفت و خوفی بر دوش نکشیدند.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 120,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام واژه اهمیت املایی بیشتری دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اصناف", isCorrect: false },
                { optionKey: "ب", text: "ثقت", isCorrect: true },
                { optionKey: "ج", text: "اُسرا", isCorrect: false },
                { optionKey: "د", text: "تصرف", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 7,
          instruction: "املای درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 10,
              content: {
                type: "mcq-inline",
                questionText: "به نام چاشنی‌بخش زبان‌ها (هلاوت / حلاوت) سنج معنی در بیان‌ها.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "هلاوت", isCorrect: false },
                { text: "حلاوت", isCorrect: true },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 127,
              content: { type: "mcq-inline", questionText: "در چنین حالی موقع را (مغتنم / مقتنم) شمردم." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مغتنم", isCorrect: true },
                { text: "مقتنم", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 106,
              content: { type: "mcq-inline", questionText: "روزی یاران (الحاح / الهاح) کردند." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "الحاح", isCorrect: true },
                { text: "الهاح", isCorrect: false },
              ],
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 52,
              content: { type: "mcq-inline", questionText: "چون به موسم حج رسید اشتر طلبید و (محمل / مهمل) آراست." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "محمل", isCorrect: true },
                { text: "مهمل", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 8,
          pageRef: 120,
          parts: [
            {
              type: "open-error-correction-in-passage",
              score: 0.5,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  "اهمال جانب من جایز نشمری و از ضمیر، بدان رخصت نیابی و نیز در هنگام بلا شرکت بوده است، در وقت فراق موافقت اولی‌تر.",
                ),
              },
              correctAnswer: { wrongWord: "فراق", correctWord: "فراغ" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: یافتن «فراق» ۰٫۲۵ و نوشتن «فراغ» ۰٫۲۵؛ اگر فقط «فراغ» نوشته شود کل نمره تعلق می‌گیرد.",
            },
          ],
        },
        {
          number: 9,
          pageRef: 14,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "رابطهٔ معنایی همهٔ گزینه‌ها یکسان است، به‌جز گزینهٔ ..." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "بهار / فصل", isCorrect: false },
                { optionKey: "ب", text: "ترش / شیرین", isCorrect: true },
                { optionKey: "ج", text: "فوتبال / ورزش", isCorrect: false },
                { optionKey: "د", text: "سیر / گیاه", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 18,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه فعل مجهول وجود دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اوّل نقش، آن باشد که همه را سجدهٔ او باید کرد.", isCorrect: false },
                { optionKey: "ب", text: "بار داده آید که علت و تب تمامی زایل گشت.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 11,
          pageRef: 57,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه نقش تبعی به کار نرفته است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "برای من مگری و مگو دریغ! دریغ!", isCorrect: false },
                { optionKey: "ب", text: "او برفت. همچنین سوگند بر داد. برگشت.", isCorrect: true },
                {
                  optionKey: "ج",
                  text: "مولانا به همت یاران خود، شیخ صلاح‌الدین زرکوب و حسام‌الدین چلپی، به نشر معارف الهی مشغول بود.",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 12,
          instruction: "بیت زیر را بر اساس ترتیب اجزای جمله در زبان فارسی مرتب کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "مصراع اول",
              type: "word-reorder-dnd",
              score: 0.25,
              pageRef: 52,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["آمد", "سوی", "کعبه", "سینه", "پر", "جوش"],
              },
              correctAnswer: { orderedTokens: ["سینه", "پر", "جوش", "سوی", "کعبه", "آمد"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "مصراع دوم",
              type: "word-reorder-dnd",
              score: 0.25,
              pageRef: 52,
              content: {
                type: "word-reorder-dnd",
                scrambledTokens: ["چون", "کعبه", "نهاد", "حلقه", "در", "گوش"],
              },
              correctAnswer: { orderedTokens: ["چون", "کعبه", "حلقه", "در", "گوش", "نهاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          pageRef: 29,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "چه اندیشید " },
                    { kind: "highlight", value: "آن دم" },
                    { kind: "text", value: "، کس ندانست / که مژگانش به خون دیده تر شد" },
                  ],
                },
                questionText: "نقش دستوری عبارت مشخص‌شده چیست؟",
              },
              correctAnswer: { accepted: ["قید"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 118,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text("حالی صواب آن باشد که جمله به طریق تعاون قوّتی کنید."),
                questionText: "در عبارت بالا کدام واژه هم‌آوا دارد؟",
              },
              correctAnswer: { accepted: ["صواب", "ثواب"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "کلید «صواب» است؛ راهنمای تصحیح تصریح کرده اگر «ثواب» نیز نوشته شود نمره تعلق می‌گیرد.",
            },
          ],
        },
        {
          number: 15,
          pageRef: 14,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "فعل «شد» در کدام گزینه اسنادی نیست؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "یک قطره فرو چکید و نامش دل شد.", isCorrect: false },
                { optionKey: "ب", text: "قطره باران ما گوهر یکدانه شد.", isCorrect: false },
                { optionKey: "ج", text: "ز آتش کمی هم سوزنده‌تر شد.", isCorrect: false },
                { optionKey: "د", text: "دل بر دلدار رفت، جان بر جانانه شد.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 16,
          pageRef: 29,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "در کدام گزینه هیچ کلمه‌ای در نقش دستوری مسند وجود ندارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "نهان می‌گشت روی روشن روز", isCorrect: false },
                { optionKey: "ب", text: "به دنبال سر چنگیز می‌گشت", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 17,
          pageRef: 104,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام واژه با از دست دادن معنای پیشین و پذیرفتن معنای جدید به دوران بعد منتقل شده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "سوفار", isCorrect: false },
                { optionKey: "ب", text: "شوخ", isCorrect: true },
                { optionKey: "ج", text: "رکاب", isCorrect: false },
                { optionKey: "د", text: "یخچال", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 18,
          instruction: "با توجه به بیت زیر به سؤال‌ها پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 102,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("نباشم بدین محضر اندر گوا", "نه هرگز براندیشم از پادشا"),
                questionText: "متمم را در مصراع اول مشخص کنید.",
              },
              correctAnswer: { accepted: ["محضر", "بدین محضر"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 102,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "نباشم بدین محضر اندر " },
                    { kind: "highlight", value: "گوا" },
                    { kind: "text", value: " / نه هرگز براندیشم از پادشا" },
                  ],
                },
                questionText: "نقش واژهٔ مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مسند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          pageRef: 112,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: poemLines("چنان دید بر روی دشمن ز خشم", "که شد ساخته کارش از هر جسم"),
                questionText: "در مصراع اول، وابستهٔ پسین را مشخص کرده و نوع آن را بنویسید.",
                fields: [
                  { id: "f1", label: "وابستهٔ پسین" },
                  { id: "f2", label: "نوع وابسته" },
                ],
              },
              correctAnswer: { f1: ["دشمن"], f2: ["مضاف‌الیه", "مضاف الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 92,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text("ستودنی / پرورده / خندان / خوشحال — دو مورد اضافی است."),
                questionText: "واژه‌های مناسب را در جدول قرار دهید.",
                fields: [
                  { id: "f1", label: "صفت نسبی" },
                  { id: "f2", label: "صفت فاعلی" },
                ],
              },
              correctAnswer: { f1: ["ستودنی"], f2: ["خندان"] },
              gradingMode: "exact_match",
              verified: true,
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
          number: 21,
          instruction: "با توجه به شعر «صبح بی تو»، بیتی بنویسید که قافیهٔ آن واژه‌های «آدینه» و «کینه» باشد.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "مصراع اول",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 95,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "مصراع اول را بنویسید." },
              correctAnswer: { accepted: ["صبح بی تو رنگ بعدازظهر یک آدینه دارد", "صبح بی تو رنگ بعد از ظهر یک آدینه دارد"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "فقط متنِ همان بیت/مصراع پذیرفته است؛ تفاوتِ فاصله، نیم‌فاصله، اعراب و نشانه‌گذاری اشکال ندارد، ولی جابه‌جایی یا جایگزینیِ واژه نمره ندارد.",
              verified: true,
            },
            {
              label: "مصراع دوم",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 95,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "مصراع دوم را بنویسید." },
              correctAnswer: { accepted: ["بی تو حتی مهربانی حالتی از کینه دارد"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "فقط متنِ همان بیت/مصراع پذیرفته است؛ تفاوتِ فاصله، نیم‌فاصله، اعراب و نشانه‌گذاری اشکال ندارد، ولی جابه‌جایی یا جایگزینیِ واژه نمره ندارد.", 
              verified: true,
              sourceNote: "راهنمای تصحیح: به نوشتن مصراع کامل نمره تعلق می‌گیرد. «هم» که در دادهٔ اولیه آمده بود حذف شد: در متنِ قیصر امین‌پور نیست و وزنِ فاعلاتن را می‌شکند.",
            },
          ],
        },
        {
          number: 22,
          pageRef: 115,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "مصراع اول بیت با کدام گزینه کامل می‌شود؟ «............... / به یزدان که بدتر ز اهریمن است»",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "دفاع از وطن کیش و فرزانگی است", isCorrect: false },
                { optionKey: "ب", text: "کسی کز بدی دشمن میهن است", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 23,
          pageRef: 115,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در شعر «وطن»، کدام بیت قبل از بیت «کنم جان خود را فدای وطن / که با او چنین است پیمان من» آمده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "رود ذره‌ای گر خاکت به باد / به خون من، آن ذره آغشته به باد", isCorrect: false },
                { optionKey: "ب", text: "منم پور ایران و نام‌آورم / ز نیروی شیران بود گوهرم", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 24,
          pageRef: 53,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "نام پدیدآورندگان کدام اثر در مقابل آن نادرست است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "فرهاد و شیرین: وحشی بافقی", isCorrect: false },
                { optionKey: "ب", text: "لیلی و مجنون: عطار نیشابوری", isCorrect: true },
                { optionKey: "ج", text: "غزلیات شمس: مولانا", isCorrect: false },
                { optionKey: "د", text: "اسرارالتوحید: محمد بن منور", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 25,
          pageRef: 78,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "گزینهٔ صحیح را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "«روزها» اثر دکتر محمدعلی اسلامی ندوشن است.", isCorrect: true },
                { optionKey: "ب", text: "عطار نیشابوری کتاب تاریخ بیهقی را نوشته است.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 26,
          instruction: "درست یا نادرست بودن عبارت‌های زیر را مشخص کنید.",
          layoutPattern: "multi-item-true-false",
          parts: [
            {
              label: "الف",
              type: "true-false",
              score: 0.25,
              pageRef: 106,
              content: { type: "true-false", statementText: "«روضه خلد» اثر محمد خوافی است." },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              pageRef: 120,
              content: { type: "true-false", statementText: "کتاب «کلیله و دمنه» را «ابوالمعالی نصرالله منشی» تألیف کرده است." },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 39,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: highlight1("", "اروپا", " قدم‌های بزرگی را در راه علم و صنعت برداشته است."),
                questionText: "آرایهٔ واژهٔ مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["مجاز"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          instruction: "قسمت مشخص‌شدهٔ هر گزینه چه آرایه‌ای دارد؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 29,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "در آن " },
                    { kind: "highlight", value: "باران تیر" },
                    { kind: "text", value: " و برق و پولاد / میان شام و رستاخیز می‌گشت" },
                  ],
                },
                questionText: "آرایهٔ قسمت مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["تشبیه", "اضافه تشبیهی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 79,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "ای " },
                    { kind: "highlight", value: "حقیقی‌ترین مجاز" },
                    { kind: "text", value: "، ای عشق / ای همه استعاره‌ها با تو" },
                  ],
                },
                questionText: "آرایهٔ قسمت مشخص‌شده را بنویسید.",
              },
              correctAnswer: { accepted: ["متناقض‌نما", "متناقض نما", "پارادوکس"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 69,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: text("شمس ناگزیر از قونیه دل برکند."),
                questionText: "یک کنایه بیابید و مفهوم آن را بنویسید.",
                fields: [
                  { id: "f1", label: "کنایه" },
                  { id: "f2", label: "مفهوم" },
                ],
              },
              correctAnswer: { f1: ["دل برکندن", "دل بر کندن"], f2: ["رفتن و ترک کردن", "ترک کردن", "رفتن"] },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 71,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: text("چرا به دانه انسانیت این گمان باشد."),
                questionText: "«مشبه‌به» را مشخص کنید.",
              },
              correctAnswer: { accepted: ["دانه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          instruction: "آرایهٔ درست را از داخل کمانک انتخاب کنید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 87,
              content: {
                type: "mcq-inline",
                questionText: "جانان من برخیز بر جولان برانیم / زان جا به جولان تا خط لبنان برانیم (جناس همسان / ایهام)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "جناس همسان", isCorrect: true },
                { text: "ایهام", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 91,
              content: {
                type: "mcq-inline",
                questionText: "ببین لاله‌هایی که در باغ ماست / خموشند و فریادشان تا خداست (استعاره / تضاد)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "استعاره", isCorrect: true },
                { text: "تضاد", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 32,
          pageRef: 112,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("چو غلتید در خاک آن ژنده فیل", "بزد بوسه بر دست او، جبرئیل"),
                questionText: "در بیت بالا کدام زمینهٔ حماسه دیده می‌شود؟",
              },
              correctAnswer: { accepted: ["خرق عادت", "خرق‌عادت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 91,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                stimulus: poemLines("مگو سوخت جان من از فرط عشق", "خموشی است هان، اولین شرط عشق"),
                questionText: "واژه‌های قافیه سبب پیدایش کدام آرایهٔ ادبی شده است؟",
              },
              correctAnswer: { accepted: ["جناس", "جناس ناهمسان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 52,
          parts: [
            {
              type: "mcq-inline",
              score: 0.5,
              content: { type: "mcq-inline", questionText: "در کدام بیت هر دو آرایهٔ داخل کمانک وجود دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "یکی بی‌زیان مرد آهنگرم / ز شاه، آتش آید همی بر سرم (استعاره / ایهام)",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "فرزند عزیز را به صد جهد / بنشاند چو ماه در یکی مهد (جناس / تشبیه)",
                  isCorrect: true,
                },
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
          number: 35,
          pageRef: 10,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("به ترتیبی نهاده وضع عالم", "که نی یک موی باشد بیش و نی کم"),
                questionText: "مصراع دوم بیت بالا چه مفهومی دارد؟",
              },
              correctAnswer: { accepted: ["نظام احسن آفرینش", "نظام احسن آفرینش و نظم دقیق جهان"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          instruction: "مفهوم عبارت‌های زیر را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 52,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "خاک تن در نمی‌دهد." },
              correctAnswer: { accepted: ["راضی نمی‌شود", "تن نمی‌دهد", "نمی‌پذیرد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 136,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "آقا! کلام خام، بدتر از طعام خام است.",
              },
              correctAnswer: { accepted: ["ضرر حرف نسنجیده بدتر از ضرر غذای خام است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          instruction: "تفاوت معنایی «دریای خون» را در دو بیت زیر بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 29,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("در آن دریای خون در آن قرص خورشید", "غروب آفتاب خویشتن دید"),
                questionText: "منظور از «دریای خون» چیست؟",
              },
              correctAnswer: { accepted: ["سرخی آسمان هنگام غروب", "سرخی آسمان در غروب"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 29,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("در آن دریای خون در دشت تاریک", "به دنبال سر چنگیز می‌گشت"),
                questionText: "منظور از «دریای خون» چیست؟",
              },
              correctAnswer: { accepted: ["تعداد زیاد کشته‌شدگان جنگ", "فراوانی کشته‌شدگان جنگ"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          pageRef: 106,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "با توجه به عبارت «استعداد مجرد جز حسرت روزگار نیست»، نویسنده اعتقاد دارد که ...",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "زور داری، چون نداری علم کار / لاف آن نتوان به آسانی زدن", isCorrect: true },
                { optionKey: "ب", text: "با جوانان چو دست بگشادی / پای گردون پیر بربستی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 39,
          pageRef: 86,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                stimulus: {
                  tokens: [
                    { kind: "text", value: "وادی پر از " },
                    { kind: "highlight", value: "فرعونیان" },
                    { kind: "text", value: " و قبطیان است / " },
                    { kind: "highlight", value: "موسی" },
                    { kind: "text", value: " جلودار است و نیل اندر میان است." },
                  ],
                },
                questionText: "منظور شاعر از واژه‌های مشخص‌شده چیست؟",
                fields: [
                  { id: "f1", label: "منظور از «فرعونیان»" },
                  { id: "f2", label: "منظور از «موسی»" },
                ],
              },
              correctAnswer: {
                f1: ["صهیونیست‌ها", "صهیونیستها", "اسرائیلیان"],
                f2: ["رهبر", "امام خمینی", "امام خمینی (ره)", "رهبر / امام خمینی"],
              },
              gradingMode: "ai_partial_credit",
              verified: true,
            },
          ],
        },
        {
          number: 40,
          pageRef: 53,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                stimulus: poemLines("از عمر من آنچه هست برجای", "بستان و به عمر لیلی افزای"),
                questionText: "این بیت به کدام ویژگی اخلاقی مجنون اشاره دارد؟",
              },
              correctAnswer: { accepted: ["از خودگذشتگی", "ازخودگذشتگی", "فداکاری"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 41,
          instruction: "هر یک از مفاهیم ستون «الف» با کدام‌یک از عبارت‌های ستون «ب» مطابقت دارد؟ (در ستون «ب» یک مورد اضافی است)",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  { id: "الف", text: "مرا نیز از عهدهٔ لوازم ریاست بیرون باید آمد." },
                  { id: "ب", text: "کرد فرامش ره و رفتار خویش / ماند غرامت‌زده از کار خویش" },
                  { id: "ج", text: "گویند ز عشق کن جدایی / این نیست طریق آشنایی" },
                  { id: "د", text: "گفتم که چو ناگه آمدی، عیب مگیر / چشم تر و نان خشک و روی تازه" },
                ],
                columnB: [
                  { id: "1", text: "وفاداری عاشق به معشوق" },
                  { id: "2", text: "مهمان‌نوازی" },
                  { id: "3", text: "نتیجهٔ بد تقلید کورکورانه" },
                  { id: "4", text: "گرم و سرد روزگار دیده" },
                  { id: "5", text: "حق‌شناسی" },
                ],
              },
              correctAnswer: { الف: "5", ب: "3", ج: "1", د: "2" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "مورد ۴ ستون «ب» اضافی است. pageRefها: الف ۱۲۰، ب ۲۴، ج ۵۳، د ۱۲۳.",
            },
          ],
        },
        {
          number: 42,
          instruction: "ابیات و عبارت‌ها را به فارسی روان برگردانید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 124,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "هنوز در خانهٔ اول حافظه‌ام باقی است." },
              correctAnswer: { accepted: ["هنوز به خوبی آن را در خاطر دارم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 87,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "فرض است فرمان بردن از حکم جلودار." },
              correctAnswer: { accepted: ["اطاعت کردن از دستور رهبر واجب است", "پیروی از دستور رهبر واجب است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 20,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "این صلت فخر است." },
              correctAnswer: { accepted: ["این هدیه باعث افتخار من است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 53,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "از جای چو مار حلقه برجست." },
              correctAnswer: { accepted: ["به مانند مار حلقه‌زده از جا پرید", "مانند مار حلقه‌زده از جا پرید"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "هـ",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 69,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "به من آورید آخر، صنم گریزپای را." },
              correctAnswer: { accepted: ["معشوق گریزان را به من بازگردانید"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "و",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 102,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "بر او انجمن گشت بازارگاه." },
              correctAnswer: { accepted: ["اهل بازار اطراف او جمع شدند", "اهل بازار دور او جمع شدند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ز",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 30,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "چو لشکر گرد بر گردش گرفتند / چو کشتی بادپا در رود افکند",
              },
              correctAnswer: { accepted: ["هنگامی که محاصره شد، اسبش را مثل کشتی در رود انداخت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.75,
              pageRef: 120,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "و الا طاعنان مجال وقیعت یابند." },
              correctAnswer: { accepted: ["وگرنه سرزنشگران فرصت بدگویی پیدا می‌کنند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
