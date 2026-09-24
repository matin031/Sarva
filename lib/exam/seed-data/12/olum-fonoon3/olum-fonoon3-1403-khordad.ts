import { blank1, poemLines } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی خرداد ۱۴۰۳ (انسانی و معارف)
 * Source: Khordad-1403-FonunAdabi3-[www.konkur.in].pdf — ۵ صفحه سؤال + ۳ صفحه راهنمای تصحیح.
 *
 * متن سؤال‌ها، بارم‌ها و پاسخ‌ها از روی خودِ برگه و راهنمای تصحیح رونویسی شده‌اند.
 * در سؤال‌هایی که پاسخ تشریحی از مجموعهٔ بسته‌ای می‌آید، برای تصحیح خودکار از
 * گزینه/فیلد کوتاه استفاده شده است؛ کلید رسمی در هیچ موردی تغییر نکرده است.
 */
export const olumFonoon3Khordad1403: SeedExam = {
  subject: "olum-fonoon3",
  grade: 12,
  title: "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۳",
  examSession: "olum-fonoon-1403-khordad",
  totalScore: 20,
  sourcePdf: "Khordad-1403-FonunAdabi3-[www.konkur.in].pdf",
  sections: [
    // ------------------------------------------------------- تاریخ ادبیات
    {
      title: "تاریخ ادبیات",
      orderIndex: 1,
      sectionScore: 2,
      questions: [
        {
          number: 1,
          pageRef: 19,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام مورد را می‌توان آغازگر رمان‌نویسی در دورهٔ پیش از انقلاب مشروطه دانست؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ترجمهٔ رمان‌های تاریخی", isCorrect: true },
                { optionKey: "ب", text: "ترجمهٔ رمان‌های اجتماعی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 2,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن عبارت‌های زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 70,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "مضمون شعر شاعران دورهٔ چهارم معاصر تا انقلاب اسلامی، بیشتر نقد اجتماعی است.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 71,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "حماسی بودن زبان، از ویژگی‌های شعر نیما یوشیج است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 3,
          pageRef: 13,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نوع ادبی «خداوندنامه» صبای کاشانی را بنویسید.",
              },
              correctAnswer: {
                accepted: ["حماسهٔ مذهبی", "حماسه مذهبی", "حماسهٔ دینی", "حماسه دینی", "حماسه"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          pageRef: 20,
          instruction: "کدام جمله دربارهٔ زندگی «علی‌اکبر دهخدا» نادرست است؟",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "جملهٔ نادرست را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "در برگهٔ چاپی چهار بخشِ عبارت با شماره‌های ۱ تا ۴ مشخص شده‌اند؛ برای نسخهٔ آنلاین همان چهار بخش به‌صورت گزینه آمده‌اند.",
              options: [
                { optionKey: "۱", text: "از پیشگامان نثر جدید فارسی است.", isCorrect: false },
                { optionKey: "۲", text: "شعر هم می‌سرود.", isCorrect: false },
                { optionKey: "۳", text: "با روزنامهٔ صوراسرافیل همکاری داشت.", isCorrect: false },
                { optionKey: "۴", text: "مجموعهٔ چرند و پرند را در روزنامهٔ سروش منتشر کرد.", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 78,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نام پدیدآورندگان آثار زیر در کدام گزینه به‌درستی ذکر نشده است؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "راه‌آب‌نامه: جمال‌زاده / آتش خاموش: سیمین دانشور / زمین سوخته: سید مهدی شجاعی",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "دستور زبان عشق: قیصر امین‌پور / خواب ارغوانی: موسوی گرمارودی / سفر ششم: علی مؤذنی",
                  isCorrect: false,
                },
              ],
            },
          ],
        },
        {
          number: 6,
          pageRef: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "عبارت زیر دربارهٔ کدام‌یک از نویسندگان عصر بیداری است؟",
                stimulus: {
                  tokens: [
                    {
                      kind: "text",
                      value:
                        "«احیاکنندهٔ نثر فارسی است، تکلّف را در نثر از بین برد و مسائل عصر را با کاربرد زبان و اصطلاحات رایج و آمیخته به شعر و ضرب‌المثل در آثار خود نوشت.»",
                    },
                  ],
                },
              },
              correctAnswer: {
                accepted: ["قائم‌مقام فراهانی", "قائم مقام فراهانی", "میرزا ابوالقاسم قائم‌مقام فراهانی", "قائم مقام"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 7,
          pageRef: 75,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از موارد زیر از آثار منظوم ادبیات انقلاب اسلامی محسوب می‌شود؟",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "مهاجر کوچک", isCorrect: false },
                { optionKey: "ب", text: "ظهور", isCorrect: false },
                { optionKey: "ج", text: "ضیافت", isCorrect: false },
                { optionKey: "د", text: "از آسمان سبز", isCorrect: true },
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
          number: 8,
          layoutPattern: "multi-item-true-false",
          instruction: "درست یا نادرست بودن موارد زیر را مشخص کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 143,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "از ویژگی‌های شعر دورهٔ انقلاب اسلامی، گرایش به عرفان و دوری از حماسه‌سرایی است.",
              },
              correctAnswer: { value: false },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 100,
              type: "true-false",
              score: 0.25,
              content: {
                type: "true-false",
                statementText: "مضامین اخلاقی در دورهٔ مشروطه کارایی خود را از دست داد.",
              },
              correctAnswer: { value: true },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 9,
          layoutPattern: "multi-subquestion",
          instruction: "عبارات زیر نشان‌دهندهٔ کدام‌یک از سطوح زبانی، فکری و ادبی نثر ادبیات بیداری است؟",
          parts: [
            {
              label: "الف",
              pageRef: 46,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "طنز سیاسی ـ اجتماعی، از شاخه‌های نثر عصر بیداری است.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: false },
                { text: "فکری", isCorrect: true },
                { text: "ادبی", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 45,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "قید و بند نثر فنی و مصنوع در آفرینش آثار کنار گذاشته می‌شود.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "زبانی", isCorrect: false },
                { text: "فکری", isCorrect: false },
                { text: "ادبی", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 10,
          pageRef: 71,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "در بیت زیر کدام‌یک از درون‌مایه‌های شعر عصر بیداری مشاهده می‌شود؟",
                stimulus: poemLines("چون نگریم ز درد و چون ننالم؟", "دزد را چو محرم به خانه کردم"),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "توجّه به مردم", isCorrect: false },
                { optionKey: "ب", text: "تعلیم و تربیت جدید", isCorrect: false },
                { optionKey: "ج", text: "وطن", isCorrect: true },
                { optionKey: "د", text: "آزادی", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 11,
          pageRef: 99,
          parts: [
            {
              type: "fill-blank-term",
              score: 0.25,
              content: {
                type: "fill-blank-term",
                passage: blank1(
                  "آشنایی‌زدایی و روی آوردن به ترکیب‌های بدیع و بی‌سابقه یکی از مشخصه‌های زبانی شعر دورهٔ انقلاب اسلامی است که در نتیجهٔ روی آوردن شاعران به ",
                  "b11",
                  " حاصل شده است.",
                ),
              },
              correctAnswer: { accepted: ["مفاهیم انتزاعی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          pageRef: 101,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "داستانک‌نویسی (مینی‌مال) در کدام دهه رایج شد؟",
              },
              correctAnswer: { accepted: ["دههٔ هشتاد", "دهه هشتاد", "هشتاد", "دههٔ ۸۰", "دهه ۸۰"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          pageRef: 99,
          layoutPattern: "bracket-choice-mcq",
          instruction: "پاسخ درست را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "گرایش به کدام یک از موارد داخل کمانک، ویژگی مشترک شعر دورهٔ انقلاب و شعر بیدل است؟ (گرایش به خیال‌بندی ـ گرایش به حماسه)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "گرایش به خیال‌بندی", isCorrect: true },
                { text: "گرایش به حماسه", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------- زیبایی‌شناسی
    {
      title: "زیبایی‌شناسی",
      orderIndex: 3,
      sectionScore: 6,
      questions: [
        {
          number: 14,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "آرایه‌های «اغراق، تناسب، تضمین، تلمیح» به ترتیب در کدام گزینه دیده می‌شود؟",
                stimulus: poemLines(
                  "الف) سر من هست جمالت، دل من دام خیالت / گهر دیده نثار کف دریای تو دارد",
                  "ب) گفت آن یار کزو گشت سر دار بلند / جرمش این بود که اسرار هویدا می‌کرد",
                  "ج) حافظ از جور تو، حاشا که بگرداند روی / من از آن روز که در بند توام، آزادم",
                  "د) چو رامین گه‌گهی بنواختی چنگ / ز شادی بر سر آب آمدی سنگ",
                ),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "۱", text: "ج ـ الف ـ ب ـ د", isCorrect: true },
                { optionKey: "۲", text: "الف ـ ب ـ د ـ ج", isCorrect: false },
                { optionKey: "۳", text: "ب ـ الف ـ ج ـ د", isCorrect: false },
                { optionKey: "۴", text: "د ـ الف ـ ج ـ ب", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 15,
          pageRef: 63,
          layoutPattern: "multi-subquestion",
          instruction: "آرایهٔ «متناقض‌نما» را در بیت زیر مشخص کنید و دلیل خود را بنویسید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "عبارتِ دارای آرایهٔ متناقض‌نما را بنویسید.",
                stimulus: poemLines("عجب مدار که در عین درد، خاموشم", "که درد یار پری‌چهره، عین درمان است"),
              },
              correctAnswer: {
                accepted: [
                  "که درد یار پری‌چهره عین درمان است",
                  "درد یار پری‌چهره عین درمان است",
                  "درد عین درمان است",
                  "درد درمان است",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "دلیل وجود متناقض‌نما را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "جمع دو تضاد در یک امر",
                  "درد درمان‌بخش نیست",
                  "درد درمانبخش نیست",
                  "جمع ضدین در یک امر",
                  "جمع دو معنای متناقض در سخن",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر توضیح هم‌ارز با راهنمای تصحیح، مانند جمع دو تضاد/ضد در یک امر یا متناقض بودنِ درد و درمان، پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          pageRef: 71,
          layoutPattern: "multi-subquestion",
          instruction:
            "در بیت زیر واژهٔ .......... در دو معنا به کار رفته است و کاربرد این واژه باعث خلق آرایهٔ .......... شده است.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "واژهٔ دو معنایی را بنویسید.",
                stimulus: poemLines("بی مهر رخت روز مرا نور نمانده است", "وز عمر مرا جز شب دیجور نمانده است"),
              },
              correctAnswer: { accepted: ["مهر"] },
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
                questionText: "نام آرایه را بنویسید.",
              },
              correctAnswer: { accepted: ["ایهام"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 17,
          pageRef: 114,
          layoutPattern: "multi-subquestion",
          instruction: "در کدام بیت اسلوب معادله وجود دارد؟ چرا؟",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "بیت دارای اسلوب معادله را انتخاب کنید.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "قطع زنجیر ز مجنون تو نتوان کردن / موج جزو بدن آب روان می‌باشد",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "تنور لاله چنان برفروخت باد بهار / که غنچه غرق عرق گشت و گل به جوش آمد",
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
                questionText: "دلیل وجود اسلوب معادله را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "یکی از طرفین معادلی برای تأیید عبارت دیگر است",
                  "می‌توان بین دو مصراع همان‌طور قرار داد",
                  "رابطهٔ دو مصراع بر پایهٔ شباهت است",
                  "بیان مفهوم ذهنی در یک مصراع و مفهوم محسوس در مصراع دیگر",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "مطابق راهنمای تصحیح، هر دلیل هم‌معنا دربارهٔ معادل بودن دو مصراع، امکان قرار دادن «همان‌طور» میان آن‌ها یا رابطهٔ مبتنی بر شباهت پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 58,
          parts: [
            {
              type: "two-answer-text",
              score: 0.75,
              content: {
                type: "two-answer-text",
                questionText: "در بیت زیر نشرها را مشخص کنید و نوع لف و نشر را بنویسید.",
                stimulus: poemLines("گردن‌بندی قبض و بسط عشق را در یک بساط", "گریهٔ مینا نگر، خندیدن ساغر ببین"),
                fields: [
                  { id: "n1", label: "نشر ۱" },
                  { id: "n2", label: "نشر ۲" },
                  { id: "kind", label: "نوع لف و نشر" },
                ],
              },
              correctAnswer: {
                n1: ["گریه", "گریهٔ مینا", "گریه مینا"],
                n2: ["خندیدن", "خندیدن ساغر"],
                kind: ["لف و نشر مرتب", "مرتب"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          pageRef: 51,
          layoutPattern: "multi-subquestion",
          instruction:
            "تضمین را در سرودهٔ زیر مشخص کنید؛ هاتف اصفهانی در این سروده، شعر کدام شاعر را تضمین کرده است؟",
          parts: [
            {
              label: "الف",
              type: "mcq-select-line-in-poem",
              score: 0.25,
              content: {
                type: "mcq-select-line-in-poem",
                lines: [
                  "مه من نقاب بگشا ز جمال کبریایی",
                  "که بتان فرو گذارند اساس خودنمایی",
                  "شده انتظارم از حد چه شود ز در درآیی",
                  "ز دو دیده خون فشانم ز غمت شب جدایی / چه کنم که هست این‌ها گل باغ آشنایی",
                ],
              },
              correctAnswer: { correctLineIndex: 3 },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای تصحیح، دو مصراع پایانی را به‌عنوان بیتِ تضمین‌شده می‌پذیرد؛ برای رندر آنلاین، این دو مصراع در یک گزینه نگه داشته شده‌اند تا دانش‌آموز کل بیت را انتخاب کند.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "شعر کدام شاعر تضمین شده است؟",
              },
              correctAnswer: { accepted: ["فخرالدین عراقی", "فخرالدینِ عراقی", "عراقی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          layoutPattern: "bracket-choice-mcq",
          instruction: "آرایهٔ مناسب را از داخل کمانک انتخاب کنید.",
          parts: [
            {
              label: "الف",
              pageRef: 64,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "لبریز زندگی است نفس‌های آخرت / آورده مرگ، گرم به آغوش تو پناه (متناقض‌نما ـ اسلوب معادله)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "متناقض‌نما", isCorrect: true },
                { text: "اسلوب معادله", isCorrect: false },
              ],
            },
            {
              label: "ب",
              pageRef: 15,
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  "نگران با من استاده سحر / صبح می‌خواهد از من / کز مبارک دم او آورم این قوم به جان باخته را بلکه خبر (ایهام ـ حسن تعلیل)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ایهام", isCorrect: true },
                { text: "حسن تعلیل", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 21,
          pageRef: 88,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در بیت زیر شاعر برای تصویرآفرینی در حماسه از چه آرایه‌ای بهره گرفته است؟",
                stimulus: poemLines("به تنها یکی گور بریان کنی", "هوا را به شمشیر گریان کنی"),
              },
              correctAnswer: { accepted: ["اغراق", "مبالغه"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          instruction: "برای هر یک از ابیات ستون «الف»، آرایهٔ مناسبی از ستون «ب» انتخاب کنید. [یک مورد اضافی است]",
          parts: [
            {
              type: "matching-pairs-with-distractor",
              score: 1,
              content: {
                type: "matching-pairs-with-distractor",
                columnA: [
                  {
                    id: "الف",
                    text: "اشک سحر زداید از لوح دل سیاهی / خرّم کند چمن را باران صبحگاهی",
                  },
                  {
                    id: "ب",
                    text: "پشت کوژ آمد فلک در آفرینش تا کند / هر زمان پشت زمین بوس از برای افتخار",
                  },
                  {
                    id: "ج",
                    text: "جوان می‌خواند سرشار از غمی گرم / پی دستی نوازش‌بخش می‌گشت",
                  },
                  {
                    id: "د",
                    text: "چون جواب ابله آمد خامشی / این درازی در سخن چون می‌کشی",
                  },
                ],
                columnB: [
                  { id: "۱", text: "تلمیح" },
                  { id: "۲", text: "حس‌آمیزی" },
                  { id: "۳", text: "حسن تعلیل" },
                  { id: "۴", text: "اسلوب معادله" },
                  { id: "۵", text: "متناقض‌نما" },
                ],
              },
              correctAnswer: { الف: "۴", ب: "۳", ج: "۲", د: "۱" },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح: الف←اسلوب معادله، ب←حسن تعلیل، ج←حس‌آمیزی، د←تلمیح؛ متناقض‌نما مورد اضافی است.",
            },
          ],
        },
        {
          number: 23,
          layoutPattern: "multi-subquestion",
          instruction:
            "شاعر در بیت زیر به کدام داستان تاریخی اشاره کرده است؟ کاربرد این داستان موجب پیدایش کدام آرایهٔ ادبی شده است؟",
          parts: [
            {
              label: "الف",
              pageRef: 23,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "داستان تاریخی مورد اشاره را بنویسید.",
                stimulus: poemLines("یا رب این آتش که بر جان من است", "سرد کن زان سان که کردی بر خلیل"),
              },
              correctAnswer: {
                accepted: [
                  "سرد شدن آتش بر حضرت ابراهیم",
                  "داستان حضرت ابراهیم و سرد شدن آتش",
                  "داستان حضرت ابراهیم و سوزاندن او به دست نمرود",
                  "حضرت ابراهیم",
                  "ابراهیم و نمرود",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر پاسخ هم‌معنا با اشاره به داستان حضرت ابراهیم، انداختن/سوزاندن او در آتش به دست نمرود و سرد شدن آتش پذیرفته شود.",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 23,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نام آرایهٔ ادبی را بنویسید.",
              },
              correctAnswer: { accepted: ["تلمیح"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          pageRef: 61,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "کدام‌یک از آرایه‌های «تشبیه ـ تضاد ـ تناسب ـ متناقض‌نما» در بیت زیر به کار نرفته است؟",
                stimulus: poemLines("این که گاهی می‌زدم بر آب و آتش خویش را", "روشنی در کار مردم بود مقصودم چو شمع"),
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "تشبیه", isCorrect: false },
                { text: "تضاد", isCorrect: false },
                { text: "تناسب", isCorrect: false },
                { text: "متناقض‌نما", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 25,
          pageRef: 113,
          layoutPattern: "multi-subquestion",
          instruction: "با ذکر دلیل، آرایهٔ حس‌آمیزی را در بند زیر مشخص کنید.",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "عبارتِ دارای حس‌آمیزی را بنویسید.",
                stimulus: {
                  tokens: [
                    {
                      kind: "text",
                      value: "مرد نقّال آن ـ آن صدایش گرم، نمایش گرم، آن سکوتش ساکت و گیرا ـ راه می‌رفت و سخن می‌گفت.",
                    },
                  ],
                },
              },
              correctAnswer: { accepted: ["صدایش گرم", "صدای گرم", "گرم بودن صدا"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "دلیل حس‌آمیزی را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "آمیختن دو حس با یکدیگر",
                  "ترکیب حس شنوایی با حس لامسه",
                  "آمیختن شنوایی و لامسه",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint: "مطابق راهنمای تصحیح، اشاره به آمیختن حس شنوایی با حس لامسه یا دو حس با یکدیگر پذیرفته شود.",
              verified: true,
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------- موسیقی شعر
    {
      title: "موسیقی شعر",
      orderIndex: 4,
      sectionScore: 6,
      questions: [
        {
          number: 26,
          layoutPattern: "multi-subquestion",
          instruction: "تقطیع عبارت زیر با کدام اختیارات شاعری مطابقت دارد؟",
          parts: [
            {
              label: "الف",
              pageRef: 49,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«گردآفرید» با کدام اختیار شاعری مطابقت دارد؟",
              },
              correctAnswer: { accepted: ["امکان حذف همزه", "حذف همزه"] },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "در برگه، تقطیع هجایی نیز کنار واژه چاپ شده است؛ پاسخ رسمی «امکان حذف همزه» است.",
            },
            {
              label: "ب",
              pageRef: 52,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "«سوی من» با کدام اختیار شاعری مطابقت دارد؟",
              },
              correctAnswer: {
                accepted: [
                  "کوتاه تلفّظ کردن مصوّت بلند",
                  "کوتاه تلفظ کردن مصوت بلند",
                  "کوتاه تلفظ کردن مصوت بلندِ «سو»",
                  "سو = سُ",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote: "راهنمای تصحیح صراحتاً «کوتاه تلفّظ کردن مصوّت بلند (سو = سُ)» را می‌پذیرد.",
            },
          ],
        },
        {
          number: 27,
          pageRef: 48,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "در بیت زیر واژه‌ای بیابید که مصوّت بلند «ی» در آن همواره کوتاه تلفّظ می‌شود.",
                stimulus: poemLines("من نمی‌گویم زیان کن یا به فکر سود باش", "ای ز فرصت بی‌خبر، در هر چه هستی، زود باش"),
              },
              correctAnswer: { accepted: ["زیان"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 28,
          instruction: "در ابیات زیر انواع وزن «همسان تک‌لختی، همسان دولختی و ناهمسان» را مشخص کنید.",
          parts: [
            {
              type: "multi-part-inline-tagging",
              score: 0.75,
              content: {
                type: "multi-part-inline-tagging",
                tagOptions: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                passage: {
                  lines: [
                    [
                      {
                        kind: "select",
                        blankId: "v1",
                        value: "الف) هر کاو نظری دارد با یار کمان‌ابرو / باید که سپر باشد پیش همه پیکان‌ها",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v2",
                        value: "ب) این مه که چو منیژه لب چاه می‌نشست / گریان به تازیانهٔ افراسیاب رفت",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                    [
                      {
                        kind: "select",
                        blankId: "v3",
                        value: "ج) ز کوی یار می‌آید نسیم باد نوروزی / از این باد ار مدد خواهی چراغ دل برافروزی",
                        options: ["همسان تک‌لختی", "همسان دولختی", "ناهمسان"],
                      },
                    ],
                  ],
                },
              },
              correctAnswer: {
                tags: { v1: "همسان دولختی", v2: "ناهمسان", v3: "همسان تک‌لختی" },
                weights: { v1: 0.25, v2: 0.25, v3: 0.25 },
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 29,
          layoutPattern: "multi-subquestion",
          instruction:
            "نوع اختیار زبانی و اختیار وزنی بیت زیر را مشخص کنید. این اختیارات در کدام‌یک از پایه‌های آوایی قرار گرفته‌اند؟",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نوع اختیار زبانی را بنویسید.",
                stimulus: poemLines("من که هر آنچه داشتم، اول ره گذاشتم", "حال برای چون تویی اگر که لایقم بگو"),
              },
              correctAnswer: { accepted: ["امکان حذف همزه", "حذف همزه"] },
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
                questionText: "نوع اختیار وزنی را بنویسید.",
              },
              correctAnswer: { accepted: ["قلب"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار زبانی در کدام پایهٔ آوایی قرار گرفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "پایهٔ آوایی اول مصراع اول",
                  "پایه آوایی اول مصراع اول",
                  "رکن اول مصراع اول",
                  "اول مصراع اول",
                  "هر آن",
                  "هَران",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "د",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار وزنی در کدام پایهٔ آوایی قرار گرفته است؟",
              },
              correctAnswer: {
                accepted: [
                  "پایهٔ آوایی سوم مصراع دوم",
                  "پایه آوایی سوم مصراع دوم",
                  "رکن سوم مصراع دوم",
                  "رکن هفتم",
                  "هفتم",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 52,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText: "نام بحر کدام بیت «هزج مسدّس محذوف» است؟",
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
                  text: "بگفتا عشق شیرین بر تو چون است / بگفت از جان شیرینم فزون است",
                  isCorrect: true,
                },
              ],
            },
          ],
        },
        {
          number: 31,
          pageRef: 106,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "سرودهٔ زیر از تکرار کدام رکن (وزن‌واژه) عروضی ایجاد شده است؟",
                stimulus: poemLines(
                  "نفسم را پرِ پرواز از توست",
                  "به دماوند تو سوگند، که گر بگشایند",
                  "بندم از بند، ببینند که: آواز از توست",
                ),
              },
              correctAnswer: { accepted: ["فعلاتن"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 32,
          pageRef: 90,
          layoutPattern: "multi-subquestion",
          instruction:
            "نشانه‌های هجایی کدام بیت را می‌توان به دو صورت «همسان و ناهمسان» برش آوایی زد؟ نظم کدام برش بر دیگری برتری دارد؟",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "بیت مناسب را انتخاب کنید." },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                {
                  optionKey: "الف",
                  text: "چون جام شفق موج زند خون به دل من / با این همه، دور از تو مرا چهره زردی است",
                  isCorrect: true,
                },
                {
                  optionKey: "ب",
                  text: "ترک گدایی مکن که گنج بیابی / از نظر رهروی که در گذر آید",
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
                questionText: "نظم کدام برش بر دیگری برتری دارد؟",
              },
              correctAnswer: {
                accepted: [
                  "همسان",
                  "مستفعل مستفعل مستفعل فع لن",
                  "مستفعل مستفعل مستفعل فعلن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به بیت «شکر ایزد که به اقبال کُلَه گوشهٔ گل / نخوت باد دی و شوکت خار آخر شد» به سؤال‌ها پاسخ دهید.",
          parts: [
            {
              label: "الف-۱",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "پایه‌های آوایی اول و چهارم مصراع دوم را بنویسید.",
                fields: [
                  { id: "p1", label: "پایهٔ آوایی اول" },
                  { id: "p4", label: "پایهٔ آوایی چهارم" },
                ],
              },
              correctAnswer: {
                p1: ["نخ وَ تِ با", "نخوت با", "نخ وَ تِ با"],
                p4: ["خَر شد", "خر شد", "خَر شُد"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "الف-۲",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "نشانه‌های هجاییِ پایه‌های اول و چهارم مصراع دوم را بنویسید.",
                fields: [
                  { id: "s1", label: "نشانهٔ هجایی پایهٔ اول" },
                  { id: "s4", label: "نشانهٔ هجایی پایهٔ چهارم" },
                ],
              },
              correctAnswer: {
                s1: ["- U U -", "ـ U U ـ", "-UU-", "ـUUـ"],
                s4: ["- -", "ـ ـ", "--", "- U U", "ـ U U", "-UU", "ـUU"],
              },
              gradingMode: "exact_match",
              verified: true,
              sourceNote:
                "راهنمای تصحیح برای ستون مربوط، صورت هجایی «-UU-» را نیز صحیح اعلام کرده است؛ صورت‌های معادل در accepted آمده‌اند.",
            },
            {
              label: "الف-۳",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزنِ رکن اول را بنویسید.",
              },
              correctAnswer: { accepted: ["فاعلاتن", "فعلاتن", "فاعلاتن (فعلاتن)"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "الف-۴",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزنِ رکن دوم را بنویسید.",
              },
              correctAnswer: { accepted: ["فعلاتن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "الف-۵",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزنِ رکن سوم را بنویسید.",
              },
              correctAnswer: { accepted: ["فعلاتن"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "الف-۶",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "وزنِ رکن چهارم را بنویسید.",
              },
              correctAnswer: { accepted: ["فع لن", "فعلن", "فع‌لن", "فع لن (فعلن)"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب-۱",
              pageRef: 83,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یکی از اختیارات وزنیِ مصراع دوم را بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "آوردن فاعلاتن به جای فعلاتن در رکن اول",
                  "فاعلاتن به جای فعلاتن در رکن اول",
                  "آوردن فاعلاتن به جای فعلاتن",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب-۲",
              pageRef: 85,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "اختیار وزنیِ دیگرِ مصراع دوم را بنویسید.",
              },
              correctAnswer: {
                accepted: ["ابدال", "ابدال در هجای ماقبل آخر مصراع دوم", "ابدال در رکن آخر مصراع دوم"],
              },
              gradingMode: "exact_match",
              verified: true,
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
          number: 34,
          layoutPattern: "multi-subquestion",
          instruction:
            "متن زیر را بخوانید و به سؤال‌ها پاسخ دهید: «اطرافتان که خلوت شد، به سمت سنگرتان راه افتادید و من هم با فاصله نه چندان دور سعی کردم که پا جای پای شما بگذارم، مثل برق و باد، خودم را به سنگر برسانم و تفنگم را بردارم. آنچه مشکل بود، یافتن شما بود در این معرکه و تاریکی... توپخانه شروع کرده بود و صدای مهیب آن، صدای کودکانه اما خشک کلاش را در خود هضم می‌کرد.»",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو ویژگی زبانی متن بالا را بنویسید.",
                fields: [
                  { id: "f1", label: "ویژگی زبانی ۱" },
                  { id: "f2", label: "ویژگی زبانی ۲" },
                ],
              },
              correctAnswer: {
                f1: [
                  "زبان عامیانه",
                  "زبان ساده و روان",
                  "ساده و روان",
                  "استفاده از واژگان مربوط به فرهنگ شهادت، ایثار و مقاومت",
                  "واژگان مربوط به فرهنگ شهادت و ایثار و مقاومت",
                ],
                f2: [
                  "زبان عامیانه",
                  "زبان ساده و روان",
                  "ساده و روان",
                  "استفاده از واژگان مربوط به فرهنگ شهادت، ایثار و مقاومت",
                  "واژگان مربوط به فرهنگ شهادت و ایثار و مقاومت",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو ویژگی متفاوت لازم است. مطابق راهنمای تصحیح: زبان عامیانه، ساده و روان؛ یا استفاده از واژگان مربوط به فرهنگ شهادت، ایثار و مقاومت و مفاهیم مشابه.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "در متن بالا یک حس‌آمیزی بیابید.",
              },
              correctAnswer: { accepted: ["صدای خشک", "خشک کلاش", "صدای کودکانه اما خشک کلاش"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "متن بالا را از نظر سطح فکری بررسی کنید. [یک مورد]",
              },
              correctAnswer: {
                accepted: [
                  "ترویج فرهنگ ایثار",
                  "دفاع از وطن",
                  "شهادت",
                  "ترویج فرهنگ ایثار، دفاع از وطن و شهادت",
                  "فرهنگ ایثار و شهادت",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر مفهوم هم‌ارز با ترویج فرهنگ ایثار، دفاع از وطن و شهادت مطابق راهنمای تصحیح پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 35,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به متن زیر که برگرفته از کتاب «تاریخ بیداری ایرانیان» است، به سؤال‌ها پاسخ دهید: «مشاهده می‌کنیم که در مجاری سنهٔ ۱۲۶۵ بسیاری از امور را که دلالت دارد بر بیداری ایرانیان و باعث و مسبب آن را جز مرحوم میرزا تقی‌خان امیر نظام، احدی را سراغ نداریم؛ چه آن بزرگ مرد که به قابلیت خود از پستی به بلندی رسید... دوست و دشمن او را از نوادر دهر شمردند و کارهای امیر نظام از ترتیب و انتظام قشون و اصلاح کار دفتر و مالیه که خرج، دو کرور اضافه بر دخل بود، همه در یک دو سال صورت گرفت.»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "این نوشته نشان‌دهندهٔ کدام دورهٔ تاریخی است؟",
              },
              correctAnswer: { accepted: ["دورهٔ مشروطه", "دوره مشروطه", "مشروطه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو ویژگی ادبی متن را بنویسید.",
                fields: [
                  { id: "a1", label: "ویژگی ادبی ۱" },
                  { id: "a2", label: "ویژگی ادبی ۲" },
                ],
              },
              correctAnswer: {
                a1: [
                  "تضاد پستی و بلند",
                  "پستی و بلند: تضاد",
                  "اشتقاق نظام و انتظام",
                  "نظام و انتظام: اشتقاق",
                  "تناسب مالیه، دخل و خرج",
                  "مراعات نظیر مالیه، دخل و خرج",
                  "تضاد دوست و دشمن",
                  "دوست و دشمن: مجاز از همهٔ مردم",
                  "تناسب یک و دو",
                  "کنایه از پستی به بلندی رسیدن",
                  "ساده و گزارشی بودن نثر",
                  "کنار گذاشتن قید و بندهای نثر مصنوع و فنی",
                ],
                a2: [
                  "تضاد پستی و بلند",
                  "پستی و بلند: تضاد",
                  "اشتقاق نظام و انتظام",
                  "نظام و انتظام: اشتقاق",
                  "تناسب مالیه، دخل و خرج",
                  "مراعات نظیر مالیه، دخل و خرج",
                  "تضاد دوست و دشمن",
                  "دوست و دشمن: مجاز از همهٔ مردم",
                  "تناسب یک و دو",
                  "کنایه از پستی به بلندی رسیدن",
                  "ساده و گزارشی بودن نثر",
                  "کنار گذاشتن قید و بندهای نثر مصنوع و فنی",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو مورد متفاوت از پاسخ‌های راهنمای تصحیح لازم است؛ پاسخ‌های هم‌معنا دربارهٔ تضاد، اشتقاق، تناسب/مراعات نظیر، مجاز، کنایه، سادگی و گزارش‌وار بودن نثر یا کنار گذاشتن نثر مصنوع و فنی پذیرفته شود.",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نویسندهٔ متن بالا کیست؟",
              },
              correctAnswer: {
                accepted: ["ناظم‌الاسلام کرمانی", "ناظم الاسلام کرمانی", "ناظم‌الاسلام", "ناظم الاسلام"],
              },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          pageRef: 103,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به شعر زیر پاسخ دهید: «در آن کویر سوخته، آن خاک بی‌بهار / حتی علف اجازهٔ زیبا شدن نداشت / گم بود در عمیق زمین شانهٔ بهار / بی تو ولی زمینهٔ پیدا شدن نداشت / دل‌ها اگر چه صاف، ولی از هراس سنگ / آینه بود و میل تماشا شدن نداشت»",
          parts: [
            {
              label: "الف",
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText: "دو مورد از ویژگی‌های ادبی شعر را بنویسید.",
                fields: [
                  { id: "l1", label: "ویژگی ادبی ۱" },
                  { id: "l2", label: "ویژگی ادبی ۲" },
                ],
              },
              correctAnswer: {
                l1: [
                  "کویر: استعاره",
                  "استعاره",
                  "اجازه نداشتن علف: تشخیص",
                  "تشخیص",
                  "شانهٔ بهار: اضافهٔ استعاری",
                  "اضافه استعاری",
                  "هراس سنگ: تشخیص",
                  "تناسب کویر و خاک",
                  "سنگ و آینه: تضاد مفهومی",
                  "کویر: نماد",
                  "آینه بودن: تشبیه",
                  "صاف بودن دل: کنایه",
                  "سوخته بودن: کنایه از بی‌آب و علف",
                  "جناس ناهمسان افزایشی زمین و زمینه",
                  "خاک بی‌بهار: مجاز از سرزمین",
                  "قالب غزل",
                  "استفاده از تمثیل و نماد",
                  "انتخاب وزن متناسب با محتوا",
                  "صور خیال جدید و نو",
                  "مراعات نظیر صاف، آینه، تماشا",
                  "مراعات نظیر علف، خاک، بهار",
                ],
                l2: [
                  "کویر: استعاره",
                  "استعاره",
                  "اجازه نداشتن علف: تشخیص",
                  "تشخیص",
                  "شانهٔ بهار: اضافهٔ استعاری",
                  "اضافه استعاری",
                  "هراس سنگ: تشخیص",
                  "تناسب کویر و خاک",
                  "سنگ و آینه: تضاد مفهومی",
                  "کویر: نماد",
                  "آینه بودن: تشبیه",
                  "صاف بودن دل: کنایه",
                  "سوخته بودن: کنایه از بی‌آب و علف",
                  "جناس ناهمسان افزایشی زمین و زمینه",
                  "خاک بی‌بهار: مجاز از سرزمین",
                  "قالب غزل",
                  "استفاده از تمثیل و نماد",
                  "انتخاب وزن متناسب با محتوا",
                  "صور خیال جدید و نو",
                  "مراعات نظیر صاف، آینه، تماشا",
                  "مراعات نظیر علف، خاک، بهار",
                ],
              },
              gradingMode: "ai_partial_credit",
              aiGradingHint:
                "دو ویژگی متفاوت لازم است. فهرست accepted از راهنمای رسمی آمده و پاسخ‌های معناییِ معادل همان موارد نیز پذیرفته شود.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "یک ویژگی فکری برای شعر بالا بنویسید.",
              },
              correctAnswer: {
                accepted: [
                  "ظلم‌ستیزی",
                  "ظلم ستیزی",
                  "وجود خفقان و استبداد",
                  "بیان فرهنگ دفاع مقدس",
                  "روی آوردن به مفاهیم انتزاعی",
                  "حضور روح حماسه و عرفان",
                  "مقاومت و دفاع مقدس",
                ],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "مطابق راهنمای تصحیح، ظلم‌ستیزی، خفقان و استبداد، فرهنگ دفاع مقدس، مفاهیم انتزاعی، روح حماسه و عرفان یا مفاهیم نزدیکِ مقاومت و دفاع مقدس پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به ابیات زیر از شعر «دماوندیه» پاسخ دهید: «شو منفجر ای دل زمانه / و آن آتش خود نهفته مپسند / خامش منشین سخن همی گوی / افسرده مباش خوش همی خند / پنهان مکن آتش درون را / زین سوخته جان شنو یکی پند / گر آتش دل نهفته داری / سوزد جانت به جانت سوگند»",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "چه آرایه‌ای بین ابیات اول و آخر مشترک است؟",
              },
              correctAnswer: {
                accepted: [
                  "استعارهٔ مکنیه",
                  "استعاره مکنیه",
                  "تشخیص",
                  "استعاره",
                  "استعارهٔ مصرحه",
                  "استعاره مصرحه",
                  "تناسب",
                  "مراعات نظیر",
                ],
              },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 100,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText: "درون‌مایه و مضمون شعر بالا را بنویسید.",
              },
              correctAnswer: {
                accepted: ["پرهیز از سکوت", "دعوت به قیام", "آزادی", "ظلم‌ستیزی", "ظلم ستیزی"],
              },
              gradingMode: "ai_semantic",
              aiGradingHint:
                "هر مفهوم نزدیک به پاسخ رسمی، یعنی پرهیز از سکوت، دعوت به قیام، آزادی یا ظلم‌ستیزی پذیرفته شود.",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          layoutPattern: "multi-subquestion",
          instruction:
            "با توجّه به سرودهٔ زیر پاسخ دهید: «ققنوس، مرغ خوشخوان، آوازهٔ جهان / بر شاخ خیزران / بنشسته است فرد / بر گرد او / بر هر سر شاخی پرندگان / او ناله‌های گمشده ترکیب می‌کند.»",
          parts: [
            {
              label: "الف",
              pageRef: 82,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "قالب این شعر چیست؟",
              },
              correctAnswer: { accepted: ["شعر نو", "شعر نو نیمایی", "شعر نیمایی", "نیمایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              pageRef: 14,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "کدام قالب شعر سنتی زمینه‌ساز پیدایش این قالب شعری شده است؟",
              },
              correctAnswer: { accepted: ["مستزاد"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ج",
              pageRef: 82,
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "word",
                questionText: "نام سرایندهٔ این شعر را بنویسید.",
              },
              correctAnswer: { accepted: ["نیما یوشیج", "نیما"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
