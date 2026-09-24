import { ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی تابستان/شهریور ۱۴۰۴ (انسانی و معارف)
 * Source: Shahrivar-1404-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۲ صفحه راهنمای نمره‌گذاری.
 * تاریخ درج‌شده روی برگه: ۱۴۰۴/۰۵/۲۷.
 *
 * متن سؤال‌ها، گزینه‌ها، بارم‌ها و پاسخ‌ها با برگهٔ سؤال و راهنمای رسمی نمره‌گذاری
 * تطبیق داده شده‌اند. پاسخ‌های تشریحیِ دارای چند بیان پذیرفتنی، با accepted/ai_semantic
 * مدل شده‌اند؛ سؤال‌های بسته تا حد ممکن exact_match هستند.
 */
export const olumFonoon3Shahrivar1404: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی تابستان (شهریور) ۱۴۰۴",
  examSession: "olum-fonoon-1404-shahrivar",
  totalScore: 20,
  sourcePdf: "Shahrivar-1404-FonunAdabi3-[www.konkur.in].pdf",
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
                inputVariant: "word",
                questionText: "مهم‌ترین اثر «میرزادهٔ عشقی» چه نام دارد؟",
              },
              correctAnswer: {
                accepted: ["ایده‌آل", "ایده آل", "سه تابلو مریم", "سه تابلوِ مریم"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 72,
          instruction: "کدام جمله دربارهٔ «مهدی اخوان ثالث» نادرست است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام بخش نادرست است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "روی برگه چهار بخش با شماره‌های ۱ تا ۴ مشخص شده‌اند؛ برای نسخهٔ آنلاین همان چهار بخش به‌صورت گزینه آمده‌اند. راهنمای نمره‌گذاری شمارهٔ ۲ را نادرست می‌داند.",
              options: [
                { optionKey: "۱", text: "از رهروان شعر نیمایی است.", isCorrect: false },
                {
                  optionKey: "۲",
                  text: "بیان روایی و داستانی، کهن‌گرایی و کاربردهای نحوی سبک عراقی از ویژگی‌های شعر اوست.",
                  isCorrect: true,
                },
                { optionKey: "۳", text: "شعر وی، شعری اجتماعی است.", isCorrect: false },
                { optionKey: "۴", text: "حوادث زندگی مردم را در خود منعکس می‌کند.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 73,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "«تهران مخوف» اولین رمان اجتماعی است که مرتضی مشفق کاظمی منتشر کرد.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 17,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "«فرخی یزدی» تحت تأثیر شاعران گذشته، به‌ویژه مسعود سعد و حافظ بود.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          pageRef: 70,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از شاعران زیر جزء شاعران «دورهٔ بیداری» محسوب نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ایرج میرزا", isCorrect: false },
                { optionKey: "ب", text: "عارف قزوینی", isCorrect: false },
                { optionKey: "ج", text: "ملک‌الشعرای بهار", isCorrect: false },
                { optionKey: "د", text: "پروین اعتصامی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 18,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "مجلهٔ «بهار» که نشریه‌ای .................... محسوب می‌شد، در سال‌های مشروطه به وسیلهٔ ...................... منتشر شد.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اجتماعی — سیداشرف‌الدین گیلانی", isCorrect: false },
                { optionKey: "ب", text: "ادبی — میرزا یوسف‌خان اعتصامی", isCorrect: true },
                { optionKey: "ج", text: "ادبی — ملک‌الشعرای بهار", isCorrect: false },
                { optionKey: "د", text: "اجتماعی — دهخدا", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 6,
          layoutPattern: "bracket-choice-mcq",
          instruction: "پاسخ درست را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 20,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "تنها اثر قابل‌توجه در محدودهٔ تحقیقات ادبی و تاریخی دورهٔ مشروطه کدام است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تاریخ مختصر احزاب سیاسی ایرانیان", isCorrect: false },
                { text: "تاریخ بیداری ایرانیان", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 74,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "اولین تجربهٔ داستان‌نویسی سیمین دانشور کدام است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "آتش خاموش", isCorrect: true },
                { text: "سووشون", isCorrect: false },
              ],
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
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 97,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "ابهام در شعر معاصر پسندیده نیست و معنی‌گریزی از ویژگی‌های شعر این دوره است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 45,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText:
                  "نثر فارسی پیشتازتر از شعر فارسی در دورهٔ بیداری قید و بندهای نثر مصنوع و فنی را کنار می‌گذارد و ساده می‌شود.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 8,
          instruction:
            "هرکدام از عبارت‌های زیر مربوط به کدام‌یک از سطوح «زبانی، ادبی و فکری» شعر دورهٔ معاصر تا ادبیات انقلاب اسلامی است؟",
          parts: [
            {
              label: "الف",
              pageRef: 96,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "لغات و ترکیبات امروزی و جدید وارد شعر شده است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: true },
                { text: "ادبی", isCorrect: false },
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
                questionText: "صور خیال، جدید و نو هستند و تکرار تصاویر شاعران دوره‌های قبل نیستند.",
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
          ],
        },
        {
          number: 9,
          pageRef: 65,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "ویژگی‌های فکری دورهٔ معاصر تا انقلاب اسلامی در همهٔ گزینه‌های زیر مشهود است به جز کدام گزینه؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "سراپا اگر زرد و پژمرده‌ایم / ولی دل به پاییز نسپرده‌ایم",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "بسیار بود رود در آن برزخ کبود / اما دریغ، زَهرهٔ دریا شدن نداشت",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "مرا نصیب غم آمد به شادی همه عالم / چرا که از همه عالم محبت تو گزیدم",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 27,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "کدام بیت مصداق توضیح «گروهی از شاعران دورهٔ بیداری با آگاهی از سنت‌های ادبی به زبان پرصلابت گذشته وفادار ماندند» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "آتش حبّ الوطن چو شعله فروزد / از دل مؤمن کند به مجمره اسپند",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "گشت از برق تو ظاهر نور ایمان ای قلم / مشکلات خلق گردد از تو آسان ای قلم",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 11,
          layoutPattern: "bracket-choice-mcq",
          instruction: "با توجه به واژه‌های داخل کمانک پاسخ درست را انتخاب نمایید.",
          parts: [
            {
              label: "الف",
              pageRef: 46,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "یکی از ضعف‌های تکنیکی در اغلب داستان‌های دوران مشروطه، حضور راوی (سوم شخص – اول شخص) در بعضی صحنه‌های داستان و سخن گفتن او با خواننده است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "سوم شخص", isCorrect: true },
                { text: "اول شخص", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 101,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "اندیشهٔ حاکم بر داستان‌های دههٔ اول پس از پیروزی انقلاب، ابتدا ............... و در مرحلهٔ بعد ............... است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اجتماعی، سیاسی", isCorrect: false },
                { text: "سیاسی، اجتماعی", isCorrect: true },
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
          number: 12,
          pageRef: 54,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "تعداد اختیارات زبانی در کدام گزینه متفاوت است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "برای جلوگیری از به‌هم‌ریختگی جهتِ U و ـ در رابط راست‌به‌چپ، نام واژه‌ها به‌عنوان گزینه نگه داشته شده است؛ پاسخ همان گزینهٔ «عامیانه» در برگه است.",
              options: [
                { optionKey: "الف", text: "سوی من", isCorrect: false },
                { optionKey: "ب", text: "جادوی دهر", isCorrect: false },
                { optionKey: "ج", text: "عامیانه", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 13,
          instruction:
            "با توجه به بیت‌های زیر پاسخ دهید: ۱) «به حُسنِ خُلق و وفا کس به یار ما نرسد / تو را در این سخن انکار کار ما نرسد» ۲) «ز دو دیده خون فشانم ز غمت شب جدایی / چه کنم که هست اینها گل باغ آشنایی»",
          parts: [
            {
              label: "الف",
              pageRef: 55,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "وزن کدام بیت «همسان» است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "بیت اول", isCorrect: false },
                { text: "بیت دوم", isCorrect: true },
              ],
            },
            {
              label: "ب",
              pageRef: 23,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نشانه‌های هجایی «رکن پایانی» بیت «ناهمسان» را بنویسید.",
              },
              correctAnswer: { accepted: ["– U U", "- U U", "بلند کوتاه کوتاه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 14,
          pageRef: 26,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از اوزان زیر برتری دارد و وزن بیت را بهتر نشان می‌دهد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مستفعلُ فاعلاتُ مستفعلُ فع", isCorrect: false },
                { optionKey: "ب", text: "مستفعلُ مستفعلُ مستفعلُ مستف", isCorrect: true },
                { optionKey: "ج", text: "مفعولُ مفاعیلُ مفاعیلُ فعولن", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 15,
          instruction:
            "با توجه به دو بیت «کیست که پیغام من به شهر شروان برد / یک سخن از من بدان مرد سخندان برد» و «کیسه هنوز فربه است، با تو از آن قوی دلم / چاره چه خاقانی اگر، کیسه رسد به لاغری» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 86,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "وزن هر دو بیت «همسان دولختی» است.",
              },
              correctAnswer: { value: true },
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
                questionText: "یک «اختیار وزنی» مشترک در هر دو بیت بیابید.",
              },
              correctAnswer: { accepted: ["قلب"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام گزینه شاعر از اختیار وزنی «ابدال» در دو هجای ماقبل آخر استفاده کرده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "ای بی‌خبر بکوش که صاحب خبر شوی / تا راهرو نباشی کی راهبر شوی",
                  isCorrect: false,
                },
                { optionKey: "ب", text: "صورتش در وزش بیشهٔ شور ابدی خواهد ماند", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 17,
          instruction: "با توجه به مصراع «میان مشرق و مغرب ندای محتضری‌ست» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 110,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "یک اختیار وزنی در این شعر بیابید.",
              },
              correctAnswer: {
                accepted: ["بلند بودن هجای پایانی مصراع", "بلند بودن هجای پایانی", "هجای پایانی مصراع بلند است"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 110,
              type: "short-text-answer",
              score: 1,
              content: {
                type: "short-text-answer",
                questionText: "وزن بیت را به صورت کامل بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "مفاعلن فعلاتن مفاعلن فعلن",
                  "مَفاعِلُن فَعَلاتُن مَفاعِلُن فَعِلُن",
                  "مفاعلن فَعَلاتن مفاعلن فَعِلن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای نمره‌گذاری برای هر یک از چهار رکن ۰٫۲۵ در نظر گرفته است؛ در مدل آنلاین پاسخ کامل یک‌جا دریافت می‌شود و بارم کل ۱ است.",
            },
          ],
        },
        {
          number: 18,
          pageRef: 50,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از بیت‌های زیر در بحر «هزج مسدس محذوف» سروده شده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "به پایان آمد این دفتر، حکایت همچنان باقی / به صد دفتر نشاید گفت حسب‌الحال مشتاقی",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "به صد جان ارزد آن رغبت که جانان / نخواهم گوید و خواهد به صد جان",
                  isCorrect: true,
                },
                {
                  optionKey: "ج",
                  text: "پر از مثنوی‌های رندانه است / شب شعر عرفانی چشم تو",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 19,
          instruction:
            "با توجه به بیت «پیش از تو آب معنی دریا شدن نداشت / شب مانده بود و جرئت فردا شدن نداشت» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 102,
              type: "count-answer",
              score: 0.25,
              content: {
                type: "count-answer",
                questionText: "در کدام هجای مصراع اول اختیار زبانی «تغییر کمیت مصوت‌ها» داریم؟",
                min: 1,
                max: 20,
              },
              correctAnswer: { value: 7 },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 102,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در هجای دوم مصراع اول کدام اختیار زبانی صورت گرفته است؟",
              },
              correctAnswer: { accepted: ["امکان حذف همزه", "حذف همزه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 102,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "این بیت را می‌توان به دو صورت «همسان» و «ناهمسان» تقسیم‌بندی کرد.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 87,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "در بیت «به وفای دل من ناله برآرید چنانک / چنبر این فلک شعوذه‌گر بگشایید» کدام اختیارات شاعری وجود ندارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "بلند تلفظ کردن مصوت‌های کوتاه — امکان حذف همزه",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "بلند تلفظ کردن مصوت‌های کوتاه — ابدال",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "آوردن فاعلاتن به جای فعلاتن — کوتاه تلفظ کردن مصوت‌های بلند",
                  isCorrect: true,
                },
                {
                  optionKey: "د",
                  text: "بلند بودن هجای پایان مصراع — ابدال",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 21,
          instruction:
            "با توجه به بیت «سرو را مانی ولیکن سرو را رفتار نه / ماه را مانی ولیکن ماه را گفتار نیست» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              pageRef: 83,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "اختیار وزنی مشترک در هر دو مصراع بین کدام دو واژه ایجاد شده است؟",
                fields: [
                  { id: "w1", label: "واژهٔ مصراع اول" },
                  { id: "w2", label: "واژهٔ مصراع دوم" },
                ],
              },
              correctAnswer: {
                w1: ["نه"],
                w2: ["نیست"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 83,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "نام این اختیار وزنی را بنویسید.",
              },
              correctAnswer: {
                accepted: ["بلند بودن هجای پایانی مصراع", "بلند بودن هجای پایانی", "هجای پایانی مصراع بلند است"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 27,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "کدام گزینه با بیت «گشته‌ام در جهان و آخر کار / دلبری برگزیده‌ام که مپرس» وزن یکسان دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "راستی کن که راستان رستند / راستان در جهان قوی‌دستند",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "گشت یکی چشمه ز سنگی جدا / غلغله‌زن، چهره‌نما، تیزپا",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 23,
          pageRef: 84,
          instruction: "در بیت «یاد باد آن که ز ما وقت سفر یاد نکرد / به وداعی دل غمدیدهٔ ما شاد نکرد» پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در رکن اول کدام مصراع اختیار وزنی به کار رفته است؟",
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
                questionText: "نام آن اختیار وزنی را بنویسید.",
              },
              correctAnswer: {
                accepted: ["آوردن فاعلاتن به جای فعلاتن", "فاعلاتن به جای فعلاتن"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 28,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "در مورد وزن بیت «لبخند تو خلاصهٔ خوبی‌هاست / لَختی بخند، خندهٔ گل زیباست» کدام گزینه درست نیست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مستفعلن مفاعلُ مستفعل", isCorrect: false },
                { optionKey: "ب", text: "مستفعلُ فاعلاتُ مستفعل", isCorrect: true },
                { optionKey: "ج", text: "مفعولُ فاعلاتُ مفاعیلُن", isCorrect: false },
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
          number: 25,
          pageRef: 35,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام‌یک از واژه‌های مشخص‌شدهٔ بیت‌های زیر آرایهٔ «مراعات نظیر» وجود دارد؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "زیرخطِ گزینه‌ها از روی متن بازسازی شد (برگهٔ اصلی در دسترس نبود): در «ج» واژه‌های باغ/باران/سبزه/تر که مراعات نظیر دارند؛ در «الف» و «ب» بخش‌های کنایه و متناقض‌نما. کلید (ج) تغییری نکرده؛ با برگه مقایسه شود.",
              options: [
                {
                  optionKey: "الف",
                  text: `دولت عشق بین که چون از سر فقر و افتخار / ${ul("گوشهٔ تاج سلطنت می‌شکند")} گدای تو`,
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: `${ul("بمیر ای دوست پیش از مرگ")} اگر می زندگی خواهی / که ادریس از چنین مردن بهشتی گشت پیش از ما`,
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: `${ul("باغ باران‌خورده")} می‌نوشید نور / لرزشی در ${ul("سبزه‌های تر")} دوید`,
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 26,
          pageRef: 31,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در کدام بیت اشارهٔ تاریخی به داستان «عاشقانه» دیده نمی‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "ناقهٔ سنگین می‌رود در هر قدم گویی ز شوق / روح مجنون چنگ در دامان محمل می‌زند",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "شور شیرین تو را نازم که بعد از قرن‌ها / هر که لاف عشق زد، نامی هم از فرهاد برد",
                  isCorrect: false,
                },
                {
                  optionKey: "ج",
                  text: "گفت آن یار کز او گشت سرِ دار بلند / جرمش این بود که اسرار هویدا می‌کرد",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 27,
          layoutPattern: "bracket-choice-mcq",
          instruction: "آرایهٔ مناسب را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 33,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بهر این فرمود رحمان ای پسر / کل یومٍ هو فی شأن ای پسر",
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
              pageRef: 32,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "یار بی‌پرده از در و دیوار / در تجلی است یا اولی‌الابصار",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تلمیح", isCorrect: true },
                { text: "تضمین", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 28,
          pageRef: 59,
          instruction:
            `با توجه به بیت «${ul("روی")} و ${ul("چشمی")} دارم اندر مهر او / کاین ${ul("گهر")} می‌ریزد آن ${ul("زَر")} می‌زند» به پرسش‌ها پاسخ دهید.`,
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "از میان واژه‌های مشخص‌شده، کدام واژه «نشر» است؟",
              },
              correctAnswer: { accepted: ["زر", "زَر"] },
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
                questionText: "«نشر ۱» را در بیت بالا مشخص نمایید.",
              },
              correctAnswer: { accepted: ["گوهر", "گهر"] },
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
                questionText: "نوع «لف و نشر» به‌کاررفته را بنویسید.",
              },
              correctAnswer: { accepted: ["مشوش", "مشوّش", "نامرتب", "نامرتّب", "نامنظم", "نامنظّم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          pageRef: 59,
          instruction:
            "با توجه به بیت «اینکه گاهی می‌زدم بر آب و آتش خویش را / روشنی در کار مردم بود مقصودم چو شمع» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "کدام واژه‌ها سبب آفرینش آرایهٔ «تضاد» شده‌اند؟",
                fields: [
                  { id: "w1", label: "واژهٔ اول" },
                  { id: "w2", label: "واژهٔ دوم" },
                ],
              },
              correctAnswer: {
                w1: ["آب"],
                w2: ["آتش"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "آرایهٔ «تضاد» بر موسیقی لفظی کلام می‌افزاید.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 89,
          instruction:
            "در بیت «بگذار تا بگریم چون ابر در بهاران / کز سنگ ناله خیزد روز وداع یاران» جاهای خالی را با واژه‌های مناسب کامل نمایید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "سعدی با بزرگ‌نمایی در توصیف ........................، اوج احساسات و عواطف سرشار درونی خود را نشان می‌دهد.",
              },
              correctAnswer: { accepted: ["روز وداع یار", "روز وداع یاران", "وداع یار", "وداع یاران"] },
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
                questionText: "بزرگ‌نمایی سعدی در بیت بالا سبب آفرینش آرایهٔ ......................... شده است.",
              },
              correctAnswer: { accepted: ["اغراق"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 91,
          instruction: "با توجه به بیت «چنان سایه گسترد بر عالمی / که زالی نیندیشد از رستمی» به پرسش‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام واژه سبب خلق آرایهٔ «ایهام تناسب» شده است؟",
              },
              correctAnswer: { accepted: ["زال"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "معنی پذیرفتنی این واژه در بیت کدام است؟",
              },
              correctAnswer: { accepted: ["پیر سپیدموی", "پیر سپید موی", "پیر سفیدموی", "پیر سفید موی"] },
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
                questionText: "این واژه در معنای غیرپذیرفتنی با کدام واژه تناسب دارد؟",
              },
              correctAnswer: { accepted: ["رستم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          instruction:
            "آرایه‌های «حسن تعلیل، متناقض‌نما، حس‌آمیزی، اسلوب معادله» را در هر یک از بیت‌های زیر مشخص کنید. (هر بیت یک آرایه)",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 1,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["حسن تعلیل", "متناقض‌نما", "حس‌آمیزی", "اسلوب معادله"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "a",
                        value: "الف) دل چو شد غافل ز حق، فرمان‌پذیر تن بود / می‌برد هرجا که خواهد اسب، خواب‌آلوده را",
                        options: ["حسن تعلیل", "متناقض‌نما", "حس‌آمیزی", "اسلوب معادله"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "b",
                        value: "ب) ما با توایم و با تو نه‌ایم؛ اینت بوالعجب / در حلقه‌ایم با تو و چون حلقه بر دریم",
                        options: ["حسن تعلیل", "متناقض‌نما", "حس‌آمیزی", "اسلوب معادله"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "c",
                        value: "ج) سپهبد پرستنده را گفت گرم / سخن‌های شیرین به آوای نرم",
                        options: ["حسن تعلیل", "متناقض‌نما", "حس‌آمیزی", "اسلوب معادله"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "d",
                        value: "د) تویی بهانهٔ آن ابرها که می‌گریند / بیا که صاف شود این هوای بارانی",
                        options: ["حسن تعلیل", "متناقض‌نما", "حس‌آمیزی", "اسلوب معادله"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: {
                  a: "اسلوب معادله",
                  b: "متناقض‌نما",
                  c: "حس‌آمیزی",
                  d: "حسن تعلیل",
                },
                weights: { a: 0.25, b: 0.25, c: 0.25, d: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "صفحه‌های ارجاع راهنما برای چهار مورد به‌ترتیب ۱۱۴، ۶۳، ۱۱۳ و ۱۱۲ است؛ سؤال به‌صورت یک تطبیق چهارتایی رندر می‌شود.",
            },
          ],
        },
        {
          number: 33,
          instruction:
            `با توجه به بیت‌ها پاسخ دهید: ۱) «اگر ${ul("سنت")} اوست نوآوری، / نگاهی هم از نو به ${ul("سنت")} کنیم» ۲) «بر لب کوه جنون خندهٔ شیرین بهار / نقش زخمی است که از تیشهٔ فرهاد شکفت» ۳) «سعدی از سرزنش خلق نترسد، هیهات / غرقه در نیل چه اندیشه کند باران را»`,
          parts: [
            {
              label: "الف",
              pageRef: 90,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "واژهٔ «سنّت» که در بیت اول مشخص شده، چه آرایه‌ای را در ذهن تداعی می‌کند؟",
              },
              correctAnswer: { accepted: ["ایهام"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 114,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک ترکیب در مصراع اول بیت دوم بنویسید که آرایهٔ «حس‌آمیزی» داشته باشد.",
              },
              correctAnswer: { accepted: ["خنده شیرین", "خندهٔ شیرین"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 115,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "زیبایی‌آفرینی اسلوب معادله در بیت سوم بر پایهٔ ....................... است.",
              },
              correctAnswer: { accepted: ["شباهت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 113,
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "شاعر در کدام بیت برای یک مفهوم، دلیل هنری (شاعرانه) و غیرواقعی آورده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "هردم از سرگشتگی چون گرد می‌پیچم به خود / همرهان رفتند و من تنها به صحرا مانده‌ام",
                  isCorrect: false,
                },
                {
                  optionKey: "ب",
                  text: "باران همه بر جای عرق می‌چکد از ابر / پیداست که از دست کریم تو حیا کرد",
                  isCorrect: true,
                },
              ],
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این آرایه چه نام دارد؟",
              },
              correctAnswer: { accepted: ["حسن تعلیل", "حُسن تعلیل"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },

    // ----------------------------------------------- نقد و تحلیل نظم و نثر
    {
      title: "نقد و تحلیل نظم و نثر",
      orderIndex: 5,
      sectionScore: 4,
      questions: [
        {
          number: 35,
          pageRef: 20,
          instruction:
            "متن زیر از آثار «قائم مقام فراهانی» است: «... اکنون مدت دو سال افزون است که نه از آن طرف بَریدی و سلامی و نه از این جانب قاصدی و پیامی، طایر مکاتبات را پر بسته و کلبهٔ مراودات را در بسته...»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "ترکیب «کلبهٔ مراودات» چه آرایه‌ای دارد؟",
              },
              correctAnswer: { accepted: ["اضافه تشبیهی", "اضافهٔ تشبیهی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نوع نثر این متن کدام است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "مسجّع", isCorrect: true },
                { text: "مصنوع", isCorrect: false },
              ],
            },
            {
              label: "ج",
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "نویسندهٔ متن احیاکنندهٔ نظم فارسی است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از گزینه‌های زیر از ویژگی‌های متن بالا است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "عبارات کوتاه و موزون", isCorrect: true },
                { optionKey: "۲", text: "مضامین طنزآمیز", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 36,
          instruction:
            `بیت‌ها را بخوانید: ۱) «گریه را به مستی بهانه کردم / شکوه‌ها ز دست ${ul("زمانه")} کردم» ۲) «آستین چو از چشم برگرفتم / سیل خون به دامان روانه کردم» ۳) «از چه روی چون ارغنون ننالم؟ / از جفایت ${ul("ای چرخ دون")} ننالم» ۴) «چون نگریم ز درد و چون ننالم / دزد را چو محرم به خانه کردم؟»`,
          parts: [
            {
              label: "الف",
              pageRef: 17,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک نمونهٔ «اغراق» در بیت دوم مشخص کنید.",
              },
              correctAnswer: {
                accepted: ["سیل خون به دامان روان کردن", "سیل خون به دامان روانه کردن", "سیل خون"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "پاسخ باید به بزرگ‌نماییِ «سیل خون به دامان روان کردن/روانه کردن» در بیت دوم اشاره کند.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 17,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در دو قسمت مشخص‌شده، علاوه بر «تشخیص» چه آرایهٔ مشترکی وجود دارد؟",
              },
              correctAnswer: { accepted: ["استعاره", "استعاره مکنیه", "استعارهٔ مکنیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 17,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "با توجه به سرودهٔ بالا، عرصهٔ هنر عارف قزوینی ..................... و .......................... است.",
                fields: [
                  { id: "a1", label: "عرصهٔ اول" },
                  { id: "a2", label: "عرصهٔ دوم" },
                ],
              },
              correctAnswer: {
                a1: ["تصنیف‌ها", "تصنیف ها", "تصنیف"],
                a2: ["ترانه‌های میهنی", "ترانه هاي میهنی", "ترانه های میهنی", "ترانهٔ میهنی", "ترانه میهنی"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          instruction:
            "با توجه به سرودهٔ «سیدعلی موسوی گرمارودی» پاسخ دهید: «چگونه شمشیری زهرآگین / پیشانی بلند تو / این کتاب خداوند را / از هم می‌گشاید؟ / چگونه می‌توان به شمشیری، دریایی را شکافت؟ / هنگامی که همتاب آفتاب / به خانهٔ یتیمکان بیوه‌زنی تابیدی / و بر آن شانه که پیامبر پا ننهاد / کودکان را نشاندی / و از آن دهان که هُرّای شیر می‌خروشید / کلمات کودکانه تراوید / آیا تاریخ، بر در سرای / به تحیر / خشک و لرزان نمانده بود؟»",
          parts: [
            {
              label: "الف",
              pageRef: 100,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "یک مورد از ویژگی‌های «فکری» ادبیات دورهٔ انقلاب با توجه به سرودهٔ بالا بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "توجه به مفاهیم و مضامین اسلامی و دینی",
                  "توجه به مضامین اسلامی و دینی",
                  "مفاهیم اسلامی و دینی",
                  "مضامین اسلامی و دینی",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "راهنمای رسمی «توجه به مفاهیم و مضامین اسلامی و دینی» را آورده و پاسخ‌های هم‌معنا را نیز می‌پذیرد.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 100,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "سرودهٔ بالا یادآور کدام «شخصیت بزرگ» است؟",
              },
              correctAnswer: {
                accepted: ["حضرت علی", "حضرت علی (ع)", "امام علی", "امام علی (ع)", "علی (ع)"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 100,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام ویژگی زبانی در این شعر مشهود است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "واژگان متناسب با دین", isCorrect: true },
                { optionKey: "۲", text: "باستان‌گرایی", isCorrect: false },
              ],
            },
            {
              label: "د",
              pageRef: 78,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک اثر از شاعر شعر بالا بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "صدای سبز",
                  "خواب ارغوانی",
                  "برآشفتن گیسوی تاک",
                  "برآشفتن گیسوی تاک یا گوشواره عرش",
                  "گوشواره عرش",
                  "گوشوارهٔ عرش",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          instruction:
            "نوشتهٔ زیر از کتاب «آن بیست و سه نفر» اثر احمد یوسف‌زاده انتخاب شده است: «... کاش می‌شد گوشه‌ای بایستیم. این آرزو هنوز توی دلم بود که ناگهان صدایی مثل شلیک گلوله بلند شد و مینی‌بوس افتاد به تکان‌های شدید. لاستیکش ترکیده بود. راننده و محافظان مسلح برای تعویض لاستیک پیاده شدند. از اقبال ما بود که زاپاس مینی‌بوس هم پنچر از آب درآمد و عراقی‌ها مجبور شدند همان‌جا لاستیک را پنچرگیری کنند. این یعنی فرصتی برای ما که زیر نگاه سربازان مسلح عراقی روی زمین بنشینیم و مشاممان را پر کنیم از بوی تازهٔ علف و گوش‌هایمان را از صدای گنجشک‌های آزاد آسمان.»",
          parts: [
            {
              label: "الف",
              pageRef: 121,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک «تشبیه» در متن بالا پیدا کنید.",
              },
              correctAnswer: {
                accepted: ["ناگهان صدایی مثل شلیک گلوله بلند شد", "صدایی مثل شلیک گلوله", "مثل شلیک گلوله"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "پاسخ باید همان تشبیهِ «صدایی مثل شلیک گلوله» را مشخص کند.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 101,
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو مورد از ویژگی‌های «زبانی» متن بالا را بنویسید.",
                fields: [
                  { id: "f1", label: "ویژگی اول" },
                  { id: "f2", label: "ویژگی دوم" },
                ],
              },
              correctAnswer: {
                f1: [
                  "زبان داستان عامیانه است",
                  "زبان عامیانه",
                  "عامیانه بودن زبان داستان",
                  "ساده‌نویسی",
                  "ساده نویسی",
                  "وجود واژه‌های مربوط به فرهنگ ایثار و شهادت",
                  "واژه‌های مربوط به فرهنگ ایثار و شهادت",
                  "مبارزه و مقاومت",
                  "واژه‌های مربوط به مبارزه و مقاومت",
                ],
                f2: [
                  "زبان داستان عامیانه است",
                  "زبان عامیانه",
                  "عامیانه بودن زبان داستان",
                  "ساده‌نویسی",
                  "ساده نویسی",
                  "وجود واژه‌های مربوط به فرهنگ ایثار و شهادت",
                  "واژه‌های مربوط به فرهنگ ایثار و شهادت",
                  "مبارزه و مقاومت",
                  "واژه‌های مربوط به مبارزه و مقاومت",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو پاسخ متمایز از چهار مورد راهنمای رسمی پذیرفته شود: زبان عامیانه، ساده‌نویسی، واژه‌های مربوط به فرهنگ ایثار و شهادت، واژه‌های مربوط به مبارزه و مقاومت. اگر دو فیلد یک پاسخ تکراری باشند، فقط یک مورد نمره بگیرد.",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 121,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نثر فوق مربوط به کدام سبک است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "معاصر", isCorrect: false },
                { text: "انقلاب", isCorrect: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};
