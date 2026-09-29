import { blank1, highlight1, highlightThenBlank, poemLines, text, ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۲ یازدهم — امتحان نهایی خرداد ۱۴۰۳ (رشته‌های شاخهٔ نظری)
 * تاریخ برگه: ۱۴۰۳/۰۳/۱۹ — نوبت صبح، ساعت ۷:۳۰، ۹۰ دقیقه.
 * Source: Khordad1403-Farsi2-[konkur.in].pdf — ۵ صفحه سؤال + ۲ صفحهٔ راهنمای تصحیح.
 *
 * کنترل کیفیت سه‌مرحله‌ای:
 * ۱) متن/زیرخط/بارم/ترتیب با تصویر ۵ صفحهٔ سؤال؛
 * ۲) پاسخ و pageRef با ۲ صفحهٔ راهنمای تصحیح؛
 * ۳) نوع سؤال، جمع بارم، شماره‌ها و نحو TypeScript.
 *
 * تبدیل‌های UI: سؤال‌های ۳ و ۶ با find-n-errors-in-list؛ سؤال ۱۰ به‌علت دو ترتیبِ پذیرفته‌شده
 * با short-text-answer؛ سؤال ۲۱ با matching-pairs-with-distractor؛ سؤال ۲۷ج به‌صورت بازنویسی بیت؛
 * سؤال ۳۸ با multi-paraphrase-block و در بندهای چندجزئی با ai_partial_credit.
 * هیچ موردی verified: false ندارد.
 */
export const farsi2Khordad1403: SeedExam = {
  subject: "farsi2",
  grade: 11,
  title: "فارسی۲ یازدهم — امتحان نهایی خرداد ۱۴۰۳",
  examSession: "farsi2-1403-khordad",
  totalScore: 20,
  sourcePdf: "Khordad1403-Farsi2-[konkur.in].pdf",
  sections: [
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          instruction: "در عبارت‌های زیر کدام واژه‌ها با هم ترادف معنایی دارند؟",
          parts: [{
            type: "two-answer-text", score: 0.25, pageRef: 161,
            content: {
              type: "two-answer-text",
              stimulus: { lines: [
                [{ kind: "text", value: "خاله‌ام با همه " }, { kind: "highlight", value: "تمکنی" }, { kind: "text", value: " که داشت، به زندگی درویشانه‌ای قناعت کرده بود." }],
                [{ kind: "text", value: "با این همه، حضرت " }, { kind: "highlight", value: "غنا" }, { kind: "text", value: "، دیگری را به جای او نخواند." }],
              ]},
              questionText: "دو واژهٔ مترادف را بنویسید.",
              fields: [{ id: "f1", label: "واژهٔ اول" }, { id: "f2", label: "واژهٔ دوم" }],
            },
            correctAnswer: { f1: ["تمکن", "تمکنی"], f2: ["غنا"] },
            gradingMode: "exact_match", verified: true,
            sourceNote: "کلید: تمکّن (درس ۹، ص ۱۶۱) و غنا (درس ۷، ص ۱۶۰)؛ اشاره به هر دو واژه الزامی است.",
          }],
        },
        {
          number: 2, instruction: "معنی واژهٔ مشخص‌شده را بنویسید.",
          parts: [{
            type: "word-meaning-input", score: 0.25, pageRef: 164,
            content: { type: "word-meaning-input", passage: highlightThenBlank("زاغی در حوالی آن بر درختی بزرگ ", "گشن", "w2", " خانه داشت.") },
            correctAnswer: { w2: ["انبوه", "پرشاخ و برگ", "پر شاخ و برگ"] },
            gradingMode: "ai_semantic", verified: true,
          }],
        },
        {
          number: 3, pageRef: 164,
          instruction: "از بین گروه واژه‌های زیر، معنای دو واژه نادرست است؛ درست آن‌ها را بنویسید.",
          parts: [{
            type: "find-n-errors-in-list", score: 0.5,
            content: { type: "find-n-errors-in-list", errorCount: 2, items: [
              { id: "i1", text: "پایمردی: شفاعت" }, { id: "i2", text: "چنبر: کمند" },
              { id: "i3", text: "هژبر: خشمگین" }, { id: "i4", text: "زنخدان: چانه" },
              { id: "i5", text: "خنیده: نامدار" }, { id: "i6", text: "مخنقه: گردن" },
            ]},
            correctAnswer: { errorItemIds: ["i3", "i6"], corrections: { i3: "هژبر: شیر", i6: "مخنقه: گردن‌بند" } },
            gradingMode: "ai_partial_credit", aiGradingHint: "۰٫۲۵ برای «هژبر: شیر» و ۰٫۲۵ برای «مخنقه: گردن‌بند».",
            verified: true, sourceNote: "کلید: هژبر=شیر (ص ۱۶۴)؛ مخنقه=گردن‌بند (ص ۱۵۸).",
          }],
        },
        {
          number: 4, instruction: "نوشتار کدام واژهٔ داخل کمانک، کامل‌کنندهٔ مفهوم عبارت است؟", layoutPattern: "bracket-choice-mcq",
          parts: [
            { label: "الف", type: "mcq-inline", score: 0.25, pageRef: 83, content: { type: "mcq-inline", questionText: "عزیزترین رفقای من حُسن سیرت را با (سباحت / صباحت) توأم داشت." }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ text: "سباحت", isCorrect: false }, { text: "صباحت", isCorrect: true }] },
            { label: "ب", type: "mcq-inline", score: 0.25, pageRef: 91, content: { type: "mcq-inline", questionText: "بزن زخم، این (مرهم / مرحم) عاشق است / که بی زخم مردن، غم عاشق است" }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ text: "مرهم", isCorrect: true }, { text: "مرحم", isCorrect: false }] },
          ],
        },
        {
          number: 5, instruction: "در هر عبارت املای یک واژه نادرست است؛ شکل صحیح آن‌ها را بنویسید.", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "open-error-correction-in-passage", score: 0.25, pageRef: 52, content: { type: "open-error-correction-in-passage", passage: text("چون موسم حج رسید، برخاست / اُشتر طلبید و مهمل آراست") }, correctAnswer: { wrongWord: "مهمل", correctWord: "محمل" }, gradingMode: "exact_match", verified: true },
            { label: "ب", type: "open-error-correction-in-passage", score: 0.25, pageRef: 120, content: { type: "open-error-correction-in-passage", passage: text("ایشان حقوق مرا به طاعت و مناصحت بگذاردند و به معونت و مظاهرت ایشان از دست صیاد بجستم.") }, correctAnswer: { wrongWord: "بگذاردند", correctWord: "بگزاردند" }, gradingMode: "exact_match", verified: true },
            { label: "ج", type: "open-error-correction-in-passage", score: 0.25, pageRef: 39, content: { type: "open-error-correction-in-passage", passage: text("سپیدهٔ فردای گنجه با نحیب و صفیر گلوله‌های توپ روس، باز شد.") }, correctAnswer: { wrongWord: "نحیب", correctWord: "نهیب" }, gradingMode: "exact_match", verified: true },
            { label: "د", type: "open-error-correction-in-passage", score: 0.25, pageRef: 155, content: { type: "open-error-correction-in-passage", passage: text("دلم را بده عظم بر بندگی / نه چون بی‌غمانم هوسناک کن") }, correctAnswer: { wrongWord: "عظم", correctWord: "عزم" }, gradingMode: "exact_match", verified: true },
          ],
        },
        {
          number: 6, pageRef: 163, instruction: "از میان گروه‌های زیر، املای دو واژه درست نیست؛ شکل درست آن‌ها را بنویسید.",
          parts: [{
            type: "find-n-errors-in-list", score: 0.5,
            content: { type: "find-n-errors-in-list", errorCount: 2, items: [
              { id: "i1", text: "الحاح و اسرار" }, { id: "i2", text: "رشحه و قطره" }, { id: "i3", text: "زهاب دیدگان" },
              { id: "i4", text: "یغور و درشت" }, { id: "i5", text: "خوان و طبق" }, { id: "i6", text: "رغبت و خاست" },
            ]},
            correctAnswer: { errorItemIds: ["i1", "i6"], corrections: { i1: "الحاح و اصرار", i6: "رغبت و خواست" } },
            gradingMode: "ai_partial_credit", aiGradingHint: "۰٫۲۵ برای «اصرار» و ۰٫۲۵ برای «خواست».", verified: true,
            sourceNote: "کلید: اصرار (ص ۱۶۳) و خواست (ص ۱۶۰).",
          }],
        },
        {
          number: 7, pageRef: 118,
          parts: [{
            type: "mcq-inline", score: 0.25,
            content: { type: "mcq-inline", questionText: "وضعیت کدام واژهٔ مشخص‌شده در گذر زمان همانند کلمهٔ «محضر» در مصراع «بدرید و بسپرد محضر به پای» است؟" },
            correctAnswer: {}, gradingMode: "exact_match", verified: true,
            options: [
              { optionKey: "الف", text: "پای راست {{افگار}} شد.", isCorrect: false },
              { optionKey: "ب", text: "{{اختلاف}} صیادان آنجا متواتر.", isCorrect: true },
              { optionKey: "ج", text: "پا در {{رکاب}} راهوار خویش دارند.", isCorrect: false },
            ],
          }],
        },
        {
          number: 8, instruction: "با توجّه به انواع صفت بیانی، کدام واژه در هر گروه با بقیه متفاوت است؟", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "mcq-inline", score: 0.25, pageRef: 91, content: { type: "mcq-inline", questionText: "گروه الف" }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ optionKey: "1", text: "سحرزاد", isCorrect: true }, { optionKey: "2", text: "زخم‌دار", isCorrect: false }, { optionKey: "3", text: "جهان‌آفرین", isCorrect: false }, { optionKey: "4", text: "نیلی‌پوش", isCorrect: false }] },
            { label: "ب", type: "mcq-inline", score: 0.25, pageRef: 162, content: { type: "mcq-inline", questionText: "گروه ب" }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ optionKey: "1", text: "ایرانی", isCorrect: false }, { optionKey: "2", text: "کبریایی", isCorrect: false }, { optionKey: "3", text: "نورانی", isCorrect: true }, { optionKey: "4", text: "شکاری", isCorrect: false }] },
          ],
        },
        {
          number: 9, instruction: "به سؤال‌های زیر پاسخ دهید.", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "mcq-inline", score: 0.25, pageRef: 53, content: { type: "mcq-inline", questionText: "در کدام یک از ابیات زیر، جملهٔ مرکب دیده می‌شود؟" }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ optionKey: "1", text: "فرزند عزیز را به صد جهد / بنشاند چو ماه در یکی مهد", isCorrect: false }, { optionKey: "2", text: "مجنون چو حدیث عشق بشنید / اوّل بگریست، پس بخندید", isCorrect: true }] },
            { label: "ب", type: "short-text-answer", score: 0.25, pageRef: 140, content: { type: "short-text-answer", inputVariant: "word", stimulus: highlight1("بگذار بر پشت زین خود معتبر ", "بمانم", "."), questionText: "زمان فعل مشخص‌شده را بنویسید." }, correctAnswer: { accepted: ["مضارع التزامی"] }, gradingMode: "exact_match", aiGradingHint: "«مضارع» به‌تنهایی نمره ندارد.", verified: true },
          ],
        },
        {
          number: 10,
          pageRef: 101,
          instruction: "در بیت «خروشید و زد دست بر سر ز شاه / که شاها منم کاوه دادخواه!»، اجزای جملهٔ دوم را مطابق زبان معیار مرتّب کنید.",
          parts: [{
            type: "word-reorder-dnd",
            score: 0.5,
            content: { type: "word-reorder-dnd", scrambledTokens: ["زد", "دست", "بر", "سر", "ز", "شاه"] },
            correctAnswer: { orderedTokens: ["ز", "شاه", "دست", "بر", "سر", "زد"] },
            gradingMode: "exact_match",
            verified: true,
            sourceNote: "راهنمای تصحیح: «ز شاه» (۰٫۲۵) + «دست بر سر زد» (۰٫۲۵).",
          }],
        },
        {
          number: 11, instruction: "تفاوت نقش دستوری واژهٔ «شاه» را در عبارت‌های زیر بنویسید.", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "short-text-answer", score: 0.25, pageRef: 39,
              content: { type: "short-text-answer", inputVariant: "word", stimulus: { lines: [[{ kind: "text", value: "سران کشور و در رأسش فتحعلی " }, { kind: "highlight", value: "شاه" }, { kind: "text", value: " در فکر تدارک سپاه برای مقابله با دست‌اندازی‌های روس‌ها بودند." }]] }, questionText: "نقش دستوری «شاه» را بنویسید." },
              correctAnswer: { accepted: ["شاخص"] }, gradingMode: "exact_match", verified: true },
            { label: "ب", type: "short-text-answer", score: 0.25, pageRef: 39,
              content: { type: "short-text-answer", inputVariant: "word", stimulus: { lines: [[{ kind: "text", value: "عباس میرزا خود را برای شرکت در مراسم سلام نوروزی " }, { kind: "highlight", value: "شاه" }, { kind: "text", value: "، به تهران رسانده بود." }]] }, questionText: "نقش دستوری «شاه» را بنویسید." },
              correctAnswer: { accepted: ["مضاف‌الیه", "مضاف الیه"] }, gradingMode: "exact_match", verified: true },
          ],
        },
        {
          number: 12, instruction: "درستی و نادرستی هر عبارت را مشخص کنید.", layoutPattern: "multi-item-true-false",
          parts: [
            { label: "الف", type: "true-false", score: 0.25, pageRef: 14, content: { type: "true-false", statementText: "در بیت «نه بیگانه تیمار خوردش نه دوست / چو چنگش، رگ و استخوان ماند و پوست» می‌توان از شیوهٔ قرار گرفتن واژه در جمله به معنای کلمهٔ «چنگ» پی برد." }, correctAnswer: { value: true }, gradingMode: "exact_match", verified: true },
            { label: "ب", type: "true-false", score: 0.25, pageRef: 111, content: { type: "true-false", statementText: "در مصراع نخست بیت «زره لخت لخت و قبا چاک چاک / سر روی مردان پر از گرد و خاک» نوع «و» عطف است." }, correctAnswer: { value: false }, gradingMode: "exact_match", verified: true },
            { label: "ج", type: "true-false", score: 0.25, pageRef: 42, content: { type: "true-false", statementText: `نقش دستوری واژهٔ مشخص‌شده در عبارت «شما جنگاوران سرافراز، در طول سال‌های دفاع، ${ul("شجاعانه")} و مخلصانه جنگیدید.» «قید» است.` }, correctAnswer: { value: true }, gradingMode: "exact_match", verified: false, sourceNote: "زیرخط در داده نبود؛ «شجاعانه» زیرخط شد. «مخلصانه» هم قید است و کلید (درست) با هر دو یکی است؛ با برگه مقایسه شود." },
          ],
        },
        {
          number: 13, instruction: "در عبارت «خویشان همه در نیاز با او / هریک شده چاره‌ساز با او» به سؤال‌ها پاسخ دهید.", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "two-answer-text", score: 0.5, pageRef: 52,
              content: { type: "two-answer-text", stimulus: { lines: [
                [{ kind: "text", value: "خویشان " }, { kind: "highlight", value: "همه" }, { kind: "text", value: " در نیاز با او" }],
                [{ kind: "text", value: "هریک شده " }, { kind: "highlight", value: "چاره‌ساز" }, { kind: "text", value: " با او" }],
              ] }, questionText: "نقش واژه‌های مشخص‌شده را، به ترتیب، بنویسید.", fields: [{ id: "f1", label: "نقش «همه»" }, { id: "f2", label: "نقش «چاره‌ساز»" }] },
              correctAnswer: { f1: ["بدل"], f2: ["مسند"] }, gradingMode: "exact_match", verified: true },
            { label: "ب", type: "short-text-answer", score: 0.25, pageRef: 52, content: { type: "short-text-answer", inputVariant: "word", questionText: "نوع وابسته را در گروه نهادی «هر یک» تعیین کنید." }, correctAnswer: { accepted: ["هر: صفت مبهم", "صفت مبهم"] }, gradingMode: "exact_match", verified: true },
          ],
        },
        {
          number: 14, pageRef: 189,
          parts: [{ type: "mcq-inline", score: 0.25, content: { type: "mcq-inline", questionText: "در کدام عبارت، کاربرد فعل «مجهول» مشهود است؟" }, correctAnswer: {}, gradingMode: "exact_match", verified: true,
            options: [
              { optionKey: "الف", text: "چون نامه گسیل کرده شود، تو بازآی که پیغامیست سوی بونصر در بابی، تا داده آید.", isCorrect: true },
              { optionKey: "ب", text: "تا نزدیک نماز پیشین، از این مهمات فارغ شده بود و خویلتاشان و سوار را گسیل کرده.", isCorrect: false },
            ] }],
        },
      ],
    },
    {
      title: "قلمرو ادبی", orderIndex: 2, sectionScore: 5,
      questions: [
        {
          number: 15, pageRef: 53,
          parts: [{ type: "mcq-inline", score: 0.25, content: { type: "mcq-inline", questionText: "در کدام بیت، جناس همسان (تام) دیده می‌شود؟" }, correctAnswer: {}, gradingMode: "exact_match", verified: true,
            options: [
              { optionKey: "الف", text: "می‌گفت، گرفته حلقه در بر / کامروز منم چو حلقه بر در", isCorrect: true },
              { optionKey: "ب", text: "حکیم جلودار است بر هامون بتازید / هامون اگر دریا شود از خون، بتازید", isCorrect: false },
            ] }],
        },
        {
          number: 16, instruction: "آرایهٔ مناسب موارد مشخص‌شده را بنویسید.", layoutPattern: "multi-subquestion",
          parts: [
            { label: "الف", type: "short-text-answer", score: 0.25, pageRef: 140, content: { type: "short-text-answer", inputVariant: "word", stimulus: highlight1("امّا ", "چراغدان", " را هم / که همیشه صبورانه در سایه می‌ایستد، از یاد مبر."), questionText: "آرایهٔ مناسب مورد مشخص‌شده را بنویسید." }, correctAnswer: { accepted: ["نماد", "استعاره", "تشخیص", "مجاز"] }, gradingMode: "ai_semantic", aiGradingHint: "طبق کلید رسمی یکی از نماد، استعاره، تشخیص یا مجاز پذیرفته است.", verified: false, sourceNote: "زیرخط در داده نبود؛ «چراغدان» زیرخط شد (موضوعِ تشخیص/نماد در کلید). پاسخ تغییری نکرده؛ با برگه مقایسه شود." },
            { label: "ب", type: "short-text-answer", score: 0.25, pageRef: 77, content: { type: "short-text-answer", inputVariant: "word", stimulus: highlight1("این ", "شیخ همیشه شاب", "، هم هیبت یک آموزگار را دارد و هم مهر یک پرستار."), questionText: "آرایهٔ مناسب را بنویسید." }, correctAnswer: { accepted: ["متناقض‌نما", "متناقض نما", "پارادوکس"] }, gradingMode: "ai_semantic", aiGradingHint: "کلید رسمی: متناقض‌نما (پارادوکس).", verified: true },
            { label: "ج", type: "short-text-answer", score: 0.25, pageRef: 71, content: { type: "short-text-answer", inputVariant: "word", stimulus: { lines: [[{ kind: "text", value: "کدام دانه فرو رفت در زمین که نرست؟" }], [{ kind: "text", value: "چرا به " }, { kind: "highlight", value: "دانهٔ انسان" }, { kind: "text", value: "ت این گمان باشد؟" }]] }, questionText: "آرایهٔ مناسب را بنویسید." }, correctAnswer: { accepted: ["تشبیه", "اضافهٔ تشبیهی", "اضافه تشبیهی"] }, gradingMode: "ai_semantic", verified: false, sourceNote: "زیرخط در داده نبود؛ «دانهٔ انسان» (اضافهٔ تشبیهیِ کلید) زیرخط شد؛ با برگه مقایسه شود." },
          ],
        },
        {
          number: 17, pageRef: 110,
          parts: [{ type: "mcq-inline", score: 0.25, content: { type: "mcq-inline", stimulus: poemLines("چو آن آهنین کوه آمد به دشت", "همه رزمگه کوه فولاد گشت"), questionText: "کدام آرایهٔ بارز حماسه وجود دارد؟" }, correctAnswer: {}, gradingMode: "exact_match", verified: true, options: [{ optionKey: "الف", text: "ایهام", isCorrect: false }, { optionKey: "ب", text: "تضاد", isCorrect: false }, { optionKey: "ج", text: "اغراق", isCorrect: true }, { optionKey: "د", text: "تضمین", isCorrect: false }] }],
        },
        {
          number: 18, pageRef: 79,
          parts: [{ type: "short-text-answer", score: 0.25, content: { type: "short-text-answer", inputVariant: "word", stimulus: text("در زبان فارسی، احدی نتوانسته است مانند او حرف بزند و در عین حال، نظیر حرف زدن او را هر روز در هر کوچه و بازار می‌شنویم."), questionText: "این عبارت بیانگر کدام ویژگی سبک سعدی است؟" }, correctAnswer: { accepted: ["سهل ممتنع بودن", "سهل ممتنع"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 19, pageRef: 105,
          parts: [{ type: "mcq-inline", score: 0.25, content: { type: "mcq-inline", stimulus: poemLines("همی رفت پیش اندرون مرد گرد", "سپاهی بر او انجمن شد، نه خرد"), questionText: "کدام ویژگی شعر حماسی در بیت بالا دیده می‌شود؟" }, correctAnswer: {}, gradingMode: "exact_match", verified: true,
            options: [{ optionKey: "الف", text: "ملّی", isCorrect: false }, { optionKey: "ب", text: "قهرمانی", isCorrect: false }, { optionKey: "ج", text: "قهرمانی و ملّی", isCorrect: true }] }],
        },
        {
          number: 20, pageRef: 148, instruction: "«گوته» در عبارت زیر از کدام شاعر تأثیر پذیرفته است؟",
          parts: [{ type: "short-text-answer", score: 0.25, content: { type: "short-text-answer", inputVariant: "word", stimulus: text("مگر نه راهنمای ما هر شامگاهان با صدای دلکش، بیتی چند از غزل‌های شورانگیز تو را می‌خواند تا اختران آسمان را بیدار کند و رهزنان کوه و دشت را بترساند؟"), questionText: "نام شاعر را بنویسید." }, correctAnswer: { accepted: ["حافظ", "حافظ شیرازی"] }, gradingMode: "exact_match", verified: true }],
        },
        {
          number: 21, instruction: "کدام عبارت، برابر معنایی هر یک از مفاهیم زیر است؟",
          parts: [{ type: "matching-pairs-with-distractor", score: 0.5, pageRef: 57,
            content: { type: "matching-pairs-with-distractor", columnA: [{ id: "الف", text: "نپذیرفتن" }, { id: "ب", text: "تغییر مسیر دادن" }], columnB: [{ id: "1", text: "راه تافتن" }, { id: "2", text: "بخایید دندان به دندان کین" }, { id: "3", text: "تن در ندادن" }, { id: "4", text: "از فرط هیجان لُکّه دویدن" }] },
            correctAnswer: { الف: "3", ب: "1" }, gradingMode: "exact_match", verified: true,
            sourceNote: "کلید: الف→۳ (تن در ندادن، ص ۵۷)؛ ب→۱ (راه تافتن، ص ۱۱۹). عبارت‌های ۲ و ۴ اضافی‌اند." }],
        },
        {
          number: 22, pageRef: 54, instruction: "بیت «گرچه ز شراب عشق مستم / عاشق‌تر ازین کنم که هستم» برگرفته از منظومهٔ داستانی «لیلی و مجنون» است.",
          parts: [{ type: "fill-blank-term", score: 0.25, content: { type: "fill-blank-term", passage: blank1("قالب شعری آن ", "q22", " است.") }, correctAnswer: { accepted: ["مثنوی"] }, gradingMode: "exact_match", verified: true }],
        },
        {
          number: 23, pageRef: 42, instruction: "آرایهٔ مشترک عبارت‌های زیر را بنویسید.",
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "word", stimulus: { lines: [
              [{ kind: "text", value: "در ذهن عباس میرزا، تنها، معمای اُفت و خیزهای جنگ و شکست‌ها و پیروزی‌ها نبود که حضور سنگینی داشت." }],
              [{ kind: "text", value: "مولانا طعن و ناسزای دشمنان را هرگز جواب تلخ نمی‌داد و به نرمی و حُسن خُلق، آنان را به راه راست می‌آورد." }],
            ] }, questionText: "یک آرایهٔ مشترک بنویسید." },
            correctAnswer: { accepted: ["حس‌آمیزی", "حس آمیزی"] },
            gradingMode: "ai_semantic", aiGradingHint: "کلید رسمی: حس‌آمیزی.", verified: true,
            sourceNote: "منابع دو عبارت در کلید: ص ۴۲ و ص ۷۰." }],
        },
        {
          number: 24,
          pageRef: 28,
          instruction: "در عبارات زیر، گزینهٔ درست را انتخاب کنید.",
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام عبارت درست است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "شیخ عطار، کتاب «اسرارنامه» و «منطق‌الطیر» را به جلال‌الدین (مولانا) خردسال هدیه داد.", isCorrect: false },
                { optionKey: "ب", text: "نثر درس «کاوه دادخواه»، برگرفته از کتاب «چشمهٔ روشن» غلامحسین یوسفی، از نوع ادبیات تعلیمی است.", isCorrect: false },
                { optionKey: "ج", text: "شعر «در امواج سند»، سرودهٔ «مهدی حمیدی شیرازی» و شرح دلاوری‌های جلال‌الدین خوارزمشاهی است.", isCorrect: true },
                { optionKey: "د", text: "کتاب «ماه نو و مرغان آواره» اثر یوهان ولفگانگ گوته و «دیوان غربی-شرقی» اثر رابیندرانات تاگور است.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 25,
          instruction: "در هر گروه نام یکی از پدیدآورندگان آثار به درستی بیان نشده است؛ درست آن‌ها را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 74,
              content: {
                type: "short-text-answer", inputVariant: "word",
                stimulus: text("روزها: دکتر محمدعلی اسلامی ندوشن — اسرارالتوحید: محمد عوفی — بهارستان: جامی"),
                questionText: "نام درست پدیدآورنده را بنویسید.",
              },
              correctAnswer: { accepted: ["محمد بن منور", "محمدبن منور", "محمّد بن منوّر", "محمّدبن منوّر"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "اثر نادرست «اسرارالتوحید» است؛ پدیدآورندهٔ درست: محمد بن منور.",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 129,
              content: {
                type: "short-text-answer", inputVariant: "word",
                stimulus: text("روضهٔ خلد: مجد خوافی — شلوارهای وصله‌دار: کامور بخشایش — هم‌صدا با حلق اسماعیل: سید حسن حسینی"),
                questionText: "نام درست پدیدآورنده را بنویسید.",
              },
              correctAnswer: { accepted: ["رسول پرویزی", "پرویزی"] },
              gradingMode: "ai_semantic",
              aiGradingHint: "اثر نادرست «شلوارهای وصله‌دار» است؛ پدیدآورندهٔ درست: رسول پرویزی.",
              verified: true,
            },
          ],
        },
        {
          number: 26,
          pageRef: 144,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", inputVariant: "word", questionText: "کتاب «پیامبر و دیوانه» اثر کیست؟" },
              correctAnswer: { accepted: ["جبران خلیل جبران", "خلیل جبران", "جبران"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          instruction: "به سؤال‌های زیر پاسخ دهید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف", type: "short-text-answer", score: 0.25, pageRef: 24,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "مصراعی از شعر «زاغ و کبک» را بنویسید که در آن، واژهٔ «قاعده» وجود دارد؟" },
              correctAnswer: { accepted: ["رفت بر این قاعده روزی سه چار"] }, gradingMode: "ai_semantic", aiGradingHint: "فقط متنِ همان بیت/مصراع پذیرفته است؛ تفاوتِ فاصله، نیم‌فاصله، اعراب و نشانه‌گذاری اشکال ندارد، ولی جابه‌جایی یا جایگزینیِ واژه نمره ندارد.", verified: true,
            },
            {
              label: "ب", type: "mcq-inline", score: 0.25, pageRef: 95,
              content: { type: "mcq-inline", questionText: "کدام‌یک از موارد زیر، تکمیل‌کنندهٔ مصراع «خواستم از رنجش دوری بگویم، یادم آمد» است؟" },
              correctAnswer: {}, gradingMode: "exact_match", verified: true,
              options: [
                { optionKey: "1", text: "عشق امّا کی خبر از شنبه و آدینه دارد", isCorrect: false },
                { optionKey: "2", text: "عشق با آزار خویشاوندی دیرینه دارد", isCorrect: true },
              ],
            },
            {
              label: "ج-۱", type: "short-text-answer", score: 0.25, pageRef: 115,
              content: {
                type: "short-text-answer", inputVariant: "textarea",
                stimulus: poemLines("رود گر ذرّه‌ای ز خاکت به باد", "آن ذرّه به خون من آغشته باد"),
                questionText: "با توجّه به هنجارهای نحوی، واژه‌های جابه‌جا شده را در جای خود قرار دهید و بیت را درست بنویسید.",
              },
              correctAnswer: { accepted: ["رود ذرّه‌ای گر ز خاکت به باد / به خون من آن ذرّه آغشته باد", "رود ذره‌ای گر ز خاکت به باد / به خون من آن ذره آغشته باد"] },
              gradingMode: "ai_semantic", aiGradingHint: "فقط متنِ همان بیت/مصراع پذیرفته است؛ تفاوتِ فاصله، نیم‌فاصله، اعراب و نشانه‌گذاری اشکال ندارد، ولی جابه‌جایی یا جایگزینیِ واژه نمره ندارد.", verified: true,
              sourceNote: "طبق راهنمای تصحیح، در صورت جابه‌جایی نادرست بقیهٔ اجزای بیت نمره تعلق نمی‌گیرد.",
            },
            {
              label: "ج-۲", type: "short-text-answer", score: 0.25, pageRef: 63,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: poemLines("دی شیخ همی گشت با چراغ گرد شهر", "کز دیو و دد ملولم و انسانم آرزوست"), questionText: "بیت را با ترتیب درست واژه‌ها بنویسید." },
              correctAnswer: { accepted: ["دی شیخ با چراغ همی گشت گرد شهر / کز دیو و دد ملولم و انسانم آرزوست"] },
              gradingMode: "ai_semantic", aiGradingHint: "فقط متنِ همان بیت/مصراع پذیرفته است؛ تفاوتِ فاصله، نیم‌فاصله، اعراب و نشانه‌گذاری اشکال ندارد، ولی جابه‌جایی یا جایگزینیِ واژه نمره ندارد.", verified: true,
              sourceNote: "طبق راهنمای تصحیح، در صورت جابه‌جایی نادرست بقیهٔ اجزای بیت نمره تعلق نمی‌گیرد.",
            },
          ],
        },
      ],
    },
    {
      title: "قلمرو فکری", orderIndex: 3, sectionScore: 8,
      questions: [
        {
          number: 28,
          instruction: "گویندهٔ هر عبارت از کدام ویژگی اخلاقی برخوردار است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف", type: "short-text-answer", score: 0.25, pageRef: 22,
              content: { type: "short-text-answer", inputVariant: "word", stimulus: text("آنچه دارم از اندک مایهٔ حُطام دنیا کفایت است."), questionText: "ویژگی اخلاقی را بنویسید." },
              correctAnswer: { accepted: ["قانع بودن", "قناعت", "قانع"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ب", type: "short-text-answer", score: 0.25, pageRef: 122,
              content: { type: "short-text-answer", inputVariant: "word", stimulus: text("مرا نیز از عهدهٔ لوازم ریاست بیرون باید آمد و مواجب سیادت را به ادا رسانید."), questionText: "ویژگی اخلاقی را بنویسید." },
              correctAnswer: { accepted: ["مسئولیت‌پذیر", "مسئولیت پذیر", "مسئولیت‌پذیری", "مسئولیت پذیری"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ج", type: "short-text-answer", score: 0.25, pageRef: 55,
              content: { type: "short-text-answer", inputVariant: "word", stimulus: poemLines("گویند ز عشق کن جدایی", "این نیست طریق آشنایی"), questionText: "ویژگی اخلاقی را بنویسید." },
              correctAnswer: { accepted: ["وفادار", "وفاداری"] }, gradingMode: "ai_semantic", verified: true,
            },
          ],
        },
        {
          number: 29, pageRef: 31,
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "word", stimulus: poemLines("در آن دریای خون، در دشت تاریک", "به دنبال سر چنگیز می‌گشت"), questionText: "در بیت زیر منظور از «دریای خون» چیست؟" },
            correctAnswer: { accepted: ["میدان جنگ"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 30, pageRef: 91,
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "textarea", stimulus: poemLines("چه جانانه چرخ جنون می‌زنند", "دف عشق با دست خون می‌زنند"), questionText: "مصراع دوم بیت زیر به چه مفهومی اشاره دارد؟" },
            correctAnswer: { accepted: ["با اشتیاق به استقبال شهادت رفتن", "با شوق به استقبال شهادت رفتن", "استقبال از شهادت"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 31, pageRef: 58,
          parts: [{ type: "fill-blank-term", score: 0.25,
            content: { type: "fill-blank-term", stimulus: poemLines("سرشتم عشق بر یک روح زنده", "یک قطره فرو چکید و نامش دل شد"), passage: blank1("محصول آمیختن عشق و روح، ", "q31", " نامیده شد.") },
            correctAnswer: { accepted: ["دل", "قلب"] }, gradingMode: "exact_match", verified: true }],
        },
        {
          number: 32, pageRef: 101,
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "textarea", stimulus: poemLines("هنر خوار شد، جادویی ارجمند", "نهان راستی، آشکارا گزند"), questionText: "بیت بالا به کدام پدیدهٔ اجتماعی اشاره دارد؟" },
            correctAnswer: { accepted: ["از بین رفتن ارزش‌ها", "رواج ناهنجاری‌ها در جامعه", "بی‌ارزش شدن فضایل اخلاقی", "از بین رفتن ارزش ها", "رواج ناهنجاری ها در جامعه", "بی ارزش شدن فضایل اخلاقی"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 33, pageRef: 111,
          parts: [{ type: "two-answer-text", score: 0.5,
            content: { type: "two-answer-text", stimulus: { lines: [[{ kind: "text", value: "سپر بر سر آورد " }, { kind: "highlight", value: "شیراله" }], [{ kind: "text", value: "عَلَم کرد شمشیر آن " }, { kind: "highlight", value: "اژدها" }]] }, questionText: "واژه‌های مشخص‌شده در بیت زیر، معرف کدام شخصیت‌های تاریخی هستند؟", fields: [{ id: "f1", label: "شیراله" }, { id: "f2", label: "اژدها" }] },
            correctAnswer: { f1: ["حضرت علی (ع)", "حضرت علی", "علی (ع)", "علی"], f2: ["عمرو"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 34, pageRef: 86,
          instruction: "مفهوم مشترک عبارت‌های مشخص‌شده را بنویسید.",
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "textarea", stimulus: { lines: [
              [{ kind: "text", value: "وقت است تا برگ سفر بر باره بندیم / دل بر عبور از " }, { kind: "highlight", value: "سد خار و خاره" }, { kind: "text", value: " بندیم" }],
              [{ kind: "text", value: "وادی پر از " }, { kind: "highlight", value: "فرعونیان و قبطیان" }, { kind: "text", value: " است / موسی جلودار است و نیل اندر میان است" }],
            ] }, questionText: "مفهوم مشترک را بنویسید." },
            correctAnswer: { accepted: ["وجود مشکلات و موانع"] }, gradingMode: "ai_semantic", verified: false, sourceNote: "زیرخط در داده نبود؛ «سد خار و خاره» و «فرعونیان و قبطیان» از روی کلید (مشکلات و موانع) زیرخط شد؛ با برگه مقایسه شود." }],
        },
        {
          number: 35, pageRef: 124,
          parts: [{ type: "short-text-answer", score: 0.25,
            content: { type: "short-text-answer", inputVariant: "word", stimulus: text("متلکی می‌گفت که دو برادری مثل عَلَم یزید می‌مانید. دراز دراز، می‌خواهید بروید آسمان، شوربا بیاورید."), questionText: "گوینده در عبارت بالا، کدام ویژگی ظاهری را مورد انتقاد قرار می‌دهد؟" },
            correctAnswer: { accepted: ["درازی قد", "قد بلند", "بلندی قد"] }, gradingMode: "ai_semantic", verified: true }],
        },
        {
          number: 36,
          instruction: "هر یک از عبارات زیر بیانگر کدام دیدگاه است؟",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف", type: "short-text-answer", score: 0.25, pageRef: 42,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: text("مردمی که به خانه‌های تاریک و بی‌دریچه عادت کرده‌اند، از پنجره‌های باز و نورگیر، گریزان هستند؛ آخر چشمانشان را می‌زند و خسته‌شان می‌کند."), questionText: "دیدگاه عبارت را بنویسید." },
              correctAnswer: { accepted: ["سخت بودن تغییر عادت‌ها", "ترس از تغییر عادت‌ها", "سخت بودن تغییر عادت ها", "ترس از تغییر عادت ها"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ب", type: "short-text-answer", score: 0.25, pageRef: 70,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: poemLines("ما به فلک بوده‌ایم، یار ملک بوده‌ایم",
"باز همان جا رویم،" +
"جمله که آن شهر ماست"), questionText: "دیدگاه بیت را بنویسید." },
              correctAnswer: { accepted: ["بازگشت همه به عالم بالاست", "بازگشت همه به عالم بالا"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ج", type: "short-text-answer", score: 0.25, pageRef: 148,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: poemLines("و تو شکر خدا کن، به هنگام رنج", "و شکر او کن، به وقت رستن از رنج"), questionText: "دیدگاه بیت را بنویسید." },
              correctAnswer: { accepted: ["یاد خدا آرام‌بخش است", "یاد خدا آرام بخش است"] }, gradingMode: "ai_semantic", verified: true,
              sourceNote: "پاسخ مطابق راهنمای تصحیح رسمی: «یاد خدا آرام‌بخش است»."
            },
          ],
        },
        {
          number: 37,
          instruction: "برای هر عبارت، یک مفهوم ارزشمند بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف", type: "short-text-answer", score: 0.25, pageRef: 80,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: text("هر عصب و فکر به منبع بی‌شائبهٔ ایمان وصل بود که خوب و بد را مشیت الهی می‌پذیرفت."), questionText: "مفهوم ارزشمند را بنویسید." },
              correctAnswer: { accepted: ["اعتقاد به مشیت الهی", "ایمان به مشیت الهی", "مشیت الهی"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ب", type: "short-text-answer", score: 0.25, pageRef: 141,
              content: { type: "short-text-answer", inputVariant: "textarea", stimulus: text("هنگامی که / در فروتنی، بزرگ باشیم، بیش از همه به آن بزرگ نزدیک شده‌ایم."), questionText: "مفهوم ارزشمند را بنویسید." },
              correctAnswer: { accepted: ["فروتنی", "فروتنی شرط رسیدن به بزرگی است"] }, gradingMode: "ai_semantic", verified: true,
            },
          ],
        },
        {
          number: 38,
          instruction: "معنی عبارات و ابیات زیر را به نثر روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف", type: "short-text-answer", score: 0.25, pageRef: 18,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "به نشاط، قلم درنهاد." },
              correctAnswer: { accepted: ["با شادی شروع به نوشتن کرد", "با شادمانی شروع به نوشتن کرد"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ب", type: "short-text-answer", score: 0.25, pageRef: 57,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "عشق دواسبه می‌آمد." },
              correctAnswer: { accepted: ["عشق با شتاب آمد", "عشق با شتاب می‌آمد"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ج", type: "short-text-answer", score: 0.25, pageRef: 146,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "آن یکی مُمِدّ حیات است." },
              correctAnswer: { accepted: ["آن یکی یاری‌کنندهٔ زندگی است", "آن یکی مددکنندهٔ زندگی است", "یاری‌کنندهٔ زندگی", "مددکنندهٔ زندگی"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "د", type: "short-text-answer", score: 0.25, pageRef: 125,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "من قُلا کردم." },
              correctAnswer: { accepted: ["من کمین کردم", "در پی فرصت بودم", "من در پی فرصت بودم"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "ه", type: "short-text-answer", score: 0.25, pageRef: 75,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "نمی‌دانست در کجا ریشه بدواند." },
              correctAnswer: { accepted: ["نمی‌دانست در کجا ساکن شود", "نمی‌دانست در کجا اقامت کند"] }, gradingMode: "ai_semantic", verified: true,
            },
            {
              label: "و", type: "short-text-answer", score: 0.5, pageRef: 91,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "از آنها که خونین سفر کرده‌اند / سفر بر مدار خطر کرده‌اند" },
              correctAnswer: { accepted: ["از آنها که به شهادت رسیدند و خطر را پذیرفتند", "کسانی که به شهادت رسیدند و خطر را پذیرفتند"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "۰٫۲۵ برای «از آنها که به شهادت رسیدند» و ۰٫۲۵ برای «خطر را پذیرفتند». پاسخ‌های هم‌معنی پذیرفته شوند.",
              verified: true,
            },
            {
              label: "ز", type: "short-text-answer", score: 0.5, pageRef: 13,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "بگیر ای جوان، دست درویش پیر" },
              correctAnswer: { accepted: ["ای جوان به انسان ضعیف و ناتوان کمک کن", "ای جوان به انسان ناتوان کمک کن"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "۰٫۲۵ برای «ای جوان، به انسان ضعیف/ناتوان» و ۰٫۲۵ برای «کمک کن». پاسخ‌های هم‌معنی پذیرفته شوند.",
              verified: true,
            },
            {
              label: "ح", type: "short-text-answer", score: 0.5, pageRef: 30,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "چو لشکر گرد بر گردش گرفتند / چو کشتی، بادپا در رود افکند!" },
              correctAnswer: { accepted: ["وقتی لشکر او را محاصره کرد، اسب را مانند کشتی در آب انداخت", "وقتی که لشکر او را محاصره کرد، اسب را مانند کشتی در آب انداخت"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "۰٫۲۵ برای «وقتی لشکر او را محاصره کرد» و ۰٫۲۵ برای «اسب را مانند کشتی در آب انداخت». پاسخ‌های هم‌معنی پذیرفته شوند.",
              verified: true,
            },
            {
              label: "ط", type: "short-text-answer", score: 0.5, pageRef: 118,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "گرازان به تگ ایستاد." },
              correctAnswer: { accepted: ["خرامان و با ناز و تکبر شروع به دویدن کرد", "با ناز و تکبر شروع به دویدن کرد", "خرامان شروع به دویدن کرد"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "۰٫۲۵ برای «خرامان/با ناز و تکبر» و ۰٫۲۵ برای «شروع به دویدن کرد». پاسخ‌های هم‌معنی پذیرفته شوند.",
              verified: true,
            },
            {
              label: "ی", type: "short-text-answer", score: 0.75, pageRef: 86,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "یعنی کلیم آهنگ جان سامری کرد." },
              correctAnswer: { accepted: ["یعنی امام خمینی (ره) مانند حضرت موسی قصد نابودی دشمن (اسرائیلی‌ها) را کرد", "امام خمینی مانند حضرت موسی قصد نابودی دشمن اسرائیلی‌ها را کرد"] },
              gradingMode: "ai_partial_credit",
              aiGradingHint: "۰٫۲۵ برای «امام خمینی (ره)، مانند حضرت موسی»، ۰٫۲۵ برای «قصد نابودی» و ۰٫۲۵ برای «دشمن (اسرائیلی‌ها) را کرد». پاسخ‌های هم‌معنی پذیرفته شوند.",
              verified: true,
            },
          ],
        },
      ],
    },
  ],
};
