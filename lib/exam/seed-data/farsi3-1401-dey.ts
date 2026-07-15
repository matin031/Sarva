import { blank1, text } from "./helpers";
import type { SeedExam } from "./seed-types";

/**
 * فارسی۳ دوازدهم — امتحان نهایی، دی‌ماه ۱۴۰۱ (کلیه رشته‌ها، نوبت دی‌ماه)
 * Source: 98e42fbb-591691536fari_kolie__reshte_ha.pdf (question sheet, 4
 * pages, + 2-page answer key with page references).
 *
 * Unlike the khordad 1403 seed, this file was transcribed reading each page
 * individually at full resolution from the start (a lesson learned from the
 * first pass on the other exam), then cross-checked question-by-question
 * against the answer key page. Confidence is high across nearly all 38
 * questions; the few genuine simplifications/uncertainties are called out
 * inline with `verified: false` + `sourceNote`.
 */
export const farsi3Dey1401: SeedExam = {
  subject: "farsi3",
  grade: 12,
  title: "فارسی۳ دوازدهم — امتحان نهایی دی‌ماه ۱۴۰۱",
  examSession: "dey-1401",
  totalScore: 20,
  sourcePdf: "98e42fbb-591691536fari_kolie__reshte_ha.pdf",
  sections: [
    // ----------------------------------------------------------------- زبانی
    {
      title: "قلمرو زبانی",
      orderIndex: 1,
      sectionScore: 7,
      questions: [
        {
          number: 1,
          instruction: "با توجّه به اشعار و عبارات زیر، معنی واژه‌های مشخّص‌شده را بنویسید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 134,
              content: {
                type: "word-meaning-input",
                passage: blank1("این حرف در ", "w1a", " امر، زیاد بی‌پا و بی‌معنی به نظر می‌آمد."),
              },
              correctAnswer: { w1a: ["آغاز"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "word-meaning-input",
              score: 0.25,
              pageRef: 47,
              content: {
                type: "word-meaning-input",
                passage: blank1("نی ", "w1b", " هرکه از یاری برید/ پرده‌هایش پرده‌های ما درید"),
              },
              correctAnswer: { w1b: ["دوست", "همدم", "همراه"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 2,
          pageRef: 10,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: {
                type: "mcq-inline",
                questionText:
                  'عبارت «حرکت به‌سوی مقصودی برای به‌دست آوردن و جست‌وجوی چیزی» در توضیح کدام واژه آمده‌است؟',
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "اتراق", isCorrect: false },
                { optionKey: "ب", text: "پوییدن", isCorrect: true },
                { optionKey: "پ", text: "مشایعت", isCorrect: false },
                { optionKey: "ت", text: "وصول", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 3,
          pageRef: 36,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'کدام‌یک از واژه‌های بیت زیر، مترادف واژهٔ «سریر» است؟ «بدو گفت: بی تو نخواهم زمان/ نه اورنگ و تاج و نه گرز و کمان»',
              },
              correctAnswer: { accepted: ["اورنگ"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 4,
          instruction: "در هریک از موارد زیر، املای درست را از داخل کمانک برگزینید.",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 48,
              content: {
                type: "mcq-inline",
                questionText: "که نیکو گفت با جمشید دستور/ که با نادان نه شیون باد و نه (سور/صور)",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "سور", isCorrect: true },
                { text: "صور", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 10,
              content: {
                type: "mcq-inline",
                questionText: "تو حکیمی؛ تو عظیمی؛ تو کریمی؛ تو رحیمی؛ تو نمایندهٔ فضیلی؛ تو سزاوار (ثنایی/سنایی).",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ثنایی", isCorrect: true },
                { text: "سنایی", isCorrect: false },
              ],
            },
            {
              label: "پ",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 62,
              content: {
                type: "mcq-inline",
                questionText:
                  "چه خوش گفتاند که (امپراتوری‌ها/امپراطوری‌ها) بزرگ مانند هم آدم‌های ثروتمند، از سوءهاضمه می‌میرند.",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "امپراتوری‌ها", isCorrect: true },
                { text: "امپراطوری‌ها", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 5,
          pageRef: 137,
          parts: [
            {
              type: "open-error-correction-in-passage",
              score: 0.5,
              content: {
                type: "open-error-correction-in-passage",
                passage: text(
                  'یکی از حضّار که محظوظ گردیده بود، حقیقتاً «ای والله، مصطفی!» استادی به رسم تحقیر، چین به صورت انداخت... همهٔ حضّار یک‌صدا تصدیق کردند. در این اثنا صدای زنگ تلفن از سرسرای امارت بلند شد.',
                ),
              },
              correctAnswer: { wrongWord: "امارت", correctWord: "عمارت" },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "The answer key gives only 'عمارت. ص137' with no explicit wrong-word quote; امارت→عمارت is inferred as the only word in this paragraph that plausibly misspells to عمارت. Passage wording itself (dense, faint scan) is medium confidence.",
            },
          ],
        },
        {
          number: 6,
          pageRef: 154,
          instruction: "در گروه کلمات زیر، سه نادرستی املایی وجود دارد؛ شکل درست هریک را بنویسید.",
          parts: [
            {
              type: "find-n-errors-in-list",
              score: 0.75,
              content: {
                type: "find-n-errors-in-list",
                errorCount: 3,
                items: [
                  { id: "i1", text: "حزین و غم‌انگیز" },
                  { id: "i2", text: "زی‌حیات و جان‌دار" },
                  { id: "i3", text: "ضماد و محرم" },
                  { id: "i4", text: "غرس و نشاندن" },
                  { id: "i5", text: "مصر و پافشاری‌کننده" },
                  { id: "i6", text: "معلوف و ترسناک" },
                  { id: "i7", text: "هول و انس‌گرفته" },
                ],
              },
              correctAnswer: {
                errorItemIds: ["i2", "i3", "i6"],
                corrections: { i2: "ذی‌حیات و جان‌دار", i3: "ضماد و مرهم", i6: "مألوف و ترسناک" },
              },
              gradingMode: "ai_partial_credit",
              verified: false,
              sourceNote:
                "The 7-item list's exact wording (items i5/i7 in particular) was reconstructed from a dense, faintly-scanned line — the 3 corrected items (ذی‌حیات، مرهم، مألوف, confirmed against the answer key) are solid, but the full list of 7 phrases needs a check against the source.",
            },
          ],
        },
        {
          number: 7,
          instruction: 'تفاوت معنایی فعل «گرفت» را در مصراع‌های زیر بررسی کنید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 104,
              content: { type: "short-text-answer", questionText: "ز کردار او پوزش اندر گرفت" },
              correctAnswer: { accepted: ["آغاز کرد"] },
              gradingMode: "exact_match",
              verified: false,
              sourceNote: "Second mesra's exact wording (محتسب...) reconstructed with medium confidence from a dense scan line.",
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 19,
              content: { type: "short-text-answer", questionText: "محتسب مستی به دید و گریبانش گرفت" },
              correctAnswer: { accepted: ["اخذ کرد"] },
              gradingMode: "exact_match",
              verified: false,
              sourceNote: "Same as part الف.",
            },
          ],
        },
        {
          number: 8,
          instruction:
            'در بیت «غرق غبار و غربتیم/ با من سمت باران بیا»، کاربرد کدام نقش تبعی در مصراع دوم مشهود است؛ مصراع نخست را بر اساس ترتیب اجزای جمله در زبان فارسی، مرتّب کنید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 84,
              content: { type: "short-text-answer", questionText: "کاربرد کدام نقش تبعی در مصراع دوم مشهود است؟" },
              correctAnswer: { accepted: ["معطوف"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 84,
              content: {
                type: "short-text-answer",
                questionText: "مصراع نخست را بر اساس ترتیب اجزای جمله در زبان فارسی، مرتّب کنید.",
              },
              correctAnswer: { accepted: ["غرق غبار و غربتیم"] },
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Modeled as short-text-answer instead of word-reorder-dnd: the answer key confirms the target order ('غرق غبار و غربتیم'), but the original scrambled/given form of this mesra on the question page could not be read with confidence, so the drag-and-drop token list can't be reconstructed. A human should pull the actual scrambled tokens from the PDF if word-reorder-dnd is wanted here.",
            },
          ],
        },
        {
          number: 9,
          instruction:
            'در سرودهٔ «که رها می‌شود/ و پروازکنان بر آسمان می‌جوید/ تمامی درهای زندگی را/ به رویم می‌گشاید»، به پرسش‌ها پاسخ دهید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 150,
              content: { type: "short-text-answer", questionText: 'کدام واژه «دوتلفّظی» است؟' },
              correctAnswer: { accepted: ["آسمان"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 150,
              content: { type: "short-text-answer", questionText: 'ترکیب «درهای زندگی» وصفی است یا اضافی؟' },
              correctAnswer: { accepted: ["اضافی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "پ",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 150,
              content: { type: "short-text-answer", questionText: 'مفهوم نشانهٔ «ان» را در واژهٔ «پروازکنان» بنویسید.' },
              correctAnswer: { accepted: ["صفت فاعلی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 10,
          instruction:
            'در متنِ «چون حق تعالی بندهٔ خود را از گزند مستغرق گردانید، هرکه دام او را بگیرد و از او حاجت طلبد، بی آنکه او را یاد کند و عرضه دهد، حق، آن را برآرد»، به پرسش‌ها پاسخ دهید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 51,
              content: { type: "short-text-answer", questionText: 'فعل «بگیرد» ماضی التزامی است یا مضارع التزامی؟' },
              correctAnswer: { accepted: ["مضارع التزامی"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              pageRef: 51,
              content: {
                type: "two-answer-text",
                questionText: "نقش دستوری واژه‌های مشخّص‌شده را، به ترتیب، بنویسید.",
                fields: [
                  { id: "f1", label: "نقش واژهٔ اول" },
                  { id: "f2", label: "نقش واژهٔ دوم" },
                ],
              },
              correctAnswer: { f1: ["نهاد"], f2: ["مسند"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 11,
          pageRef: 57,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'نوع حذف در مصراع نخست بیت زیر، به قرینهٔ لفظی است یا معنایی؟ «آیینهٔ نگاهت، پیوند صبح و ساحل/ لبخند گاه‌گاهت، صبح ستاره‌باران»',
              },
              correctAnswer: { accepted: ["معنایی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 12,
          instruction:
            'در عبارت «عشقم به این بود که عشقتان را از حرفتان بشنوم. الان هم دوستتان دارم؛ بیشتر از همیشه»، به پرسش‌ها پاسخ دهید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 88,
              content: { type: "short-text-answer", questionText: "جملهٔ پیرو یا وابسته را مشخّص کنید." },
              correctAnswer: { accepted: ["که حرفتان را بشنوم"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 88,
              content: { type: "short-text-answer", questionText: "نقش ضمیر متّصل (پیوسته) را در جملهٔ سوم بنویسید." },
              correctAnswer: { accepted: ["مفعول"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 13,
          instruction:
            'در عبارت «بعد از خواندن این مطلب، متوجّه شدم که دنیا عجیب فراموش‌کار است؛ بیست سال پیش چه کارها کرده!»، به پرسش‌ها پاسخ دهید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 63,
              content: { type: "short-text-answer", questionText: "نوع وابستهٔ وابسته را بنویسید." },
              correctAnswer: { accepted: ["صفت مضاف‌الیه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "diagram-builder",
              score: 0.25,
              pageRef: 63,
              content: {
                type: "diagram-builder",
                mode: "dependency-select",
                passage: text("بعد از خواندن این مطلب، متوجّه شدم..."),
                nodes: [
                  { id: "n1", label: "خواندن" },
                  { id: "n2", label: "این" },
                  { id: "n3", label: "مطلب" },
                ],
              },
              correctAnswer: {
                edges: [{ childId: "n3", parentId: "n1", label: "مضاف‌الیه" }],
              },
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
          number: 14,
          instruction: "هریک از ابیات زیر را به‌درستی کامل کنید.",
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "verse-completion",
              score: 0.5,
              pageRef: 117,
              content: { type: "verse-completion", firstMesra: "اگر مستم اگر هشیار، اگر خواهم اگر بیدار" },
              correctAnswer: { accepted: ["به‌سوی تو بود روی سجودم ای میهن"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "verse-completion",
              score: 0.5,
              pageRef: 97,
              content: { type: "verse-completion", firstMesra: "آورده مرگ، گرم به آغوش تو پناه" },
              correctAnswer: { accepted: ["لبریز زندگی است نفس‌های آخرت"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 15,
          pageRef: 93,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: { type: "short-text-answer", questionText: 'نویسندهٔ کتاب «سانتاماریا» کیست؟' },
              correctAnswer: { accepted: ["سیدمهدی شجاعی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 16,
          pageRef: 29,
          instruction: 'کدام بیت دربردارندهٔ نام یکی از سرایندگان «غزل اجتماعی» در عصر مشروطه است؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت نام یک شاعر غزل اجتماعی مشروطه را دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote: "Option الف's exact wording (containing 'پروین') read with medium confidence from a dense line.",
              options: [
                { optionKey: "الف", text: "پروین که دیر گرد و خالی کنند جام نوش/ تسکین که رنج تو در انتظارش بودم", isCorrect: false },
                { optionKey: "ب", text: "پیش از آنی که زند سر ز خاکش/ کاش دل عارف هوس سبزه و صحرا می‌کرد", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 17,
          instruction: "جاهای خالی عبارت زیر را به شکلی درست پُر کنید.",
          layoutPattern: "list-of-parallel-blanks",
          parts: [
            {
              label: "کتاب",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 162,
              content: {
                type: "fill-blank-term",
                passage: blank1("متن زیر، برگرفته از کتاب ", "b1", " نوشتهٔ آلفونس دوده است."),
              },
              correctAnswer: { accepted: ["قصّه‌های دوشنبه"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "مترجم",
              type: "fill-blank-term",
              score: 0.25,
              pageRef: 162,
              content: {
                type: "fill-blank-term",
                passage: blank1("و ترجمهٔ ", "b2", " است."),
              },
              correctAnswer: { accepted: ["عبدالحسین زرّین‌کوب"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 18,
          pageRef: 150,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'مفهوم نمادین «گل سرخ» را در سرودهٔ زیر بنویسید. «نان را از من بگیر، اگر می‌خواهی/ هوا را از من بگیر، امّا خنده‌ات را از من مگیر/ گل سرخ را از من مگیر»',
              },
              correctAnswer: { accepted: ["عشق"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 19,
          pageRef: 103,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'بیت «بدان‌گاه سوگند پُرمایه شاه/ چنین بود آیین و این بود راه» نمایانگر کدام‌یک از زمینه‌های حماسه است؟',
              },
              correctAnswer: { accepted: ["ملّی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 20,
          pageRef: 127,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'دربارهٔ تلمیح به‌کار رفته در بیت زیر توضیح دهید. «دلت خالی است از فریب آز خاقانی/ ز نیرنگ هوا و از طاووس و شیطانش»',
              },
              correctAnswer: {
                accepted: ["بنا بر روایات، طاووس بهشتی بود و در فریفتن آدم و حوا، با شیطان همکاری کرد"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 21,
          instruction:
            'با توجّه به رباعی «کس چون تو طریق پاک‌بازی نگرفت/ با زخم، نشان سرفرازی نگرفت/ زین پیش دلاور، کسی چون تو شگفت/ حیثیّت مرگ را به بازی نگرفت»، به پرسش‌ها پاسخ دهید.',
          layoutPattern: "multi-subquestion",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.25,
              pageRef: 95,
              content: { type: "short-text-answer", questionText: 'واژهٔ «زخم» با کدام واژه ارتباطی مبتنی بر تشبیه دارد؟' },
              correctAnswer: { accepted: ["نشان"] },
              gradingMode: "exact_match",
              verified: true,
            },
            {
              label: "ب",
              type: "two-answer-text",
              score: 0.5,
              pageRef: 95,
              content: {
                type: "two-answer-text",
                questionText: 'آرایه‌های ادبی «تشخیص» و «کنایه» را در مصراع پایانی مشخّص کنید.',
                fields: [
                  { id: "f1", label: "تشخیص" },
                  { id: "f2", label: "کنایه" },
                ],
              },
              correctAnswer: { f1: ["مرگ"], f2: ["به بازی نگرفت"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 22,
          pageRef: 20,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'در بیت زیر، معنای مجازی واژهٔ «خاک» چیست؟ «بگفتا: دل ز مهرش کی کنی پاک/ بگفت: آنگه که باشم خفته در خاک»',
              },
              correctAnswer: { accepted: ["قبر"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 23,
          pageRef: 154,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  '«مشبّه‌به» را در عبارت زیر مشخّص کنید. «تو ای کشتی تندرو خیال من، همین جا لنگر انداز؛ زیرا برای تو بیش از این اجازهٔ سفر نیست.»',
              },
              correctAnswer: { accepted: ["کشتی"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 24,
          instruction:
            "آرایهٔ ادبی مناسب با هر بیت را برگزینید و در برابر آن بنویسید. (یک آرایه، اضافه است) — ۱- ایهام ۲- اغراق ۳- حُسن تعلیل ۴- اسلوب معادله",
          layoutPattern: "bracket-choice-mcq",
          parts: [
            {
              label: "الف",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 103,
              content: {
                type: "mcq-inline",
                questionText: "همی خاک تازه بر آمد به ماه/ یکی تازی برنشسته سیاه",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اغراق", isCorrect: true },
                { text: "ایهام", isCorrect: false },
                { text: "حُسن تعلیل", isCorrect: false },
                { text: "اسلوب معادله", isCorrect: false },
              ],
            },
            {
              label: "ب",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 49,
              content: {
                type: "mcq-inline",
                questionText: "عشق بر یک فرش بنشاند گدا و شاه را/ سیل یکسان می‌کند پست و بلند راه را",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "اسلوب معادله", isCorrect: true },
                { text: "ایهام", isCorrect: false },
                { text: "اغراق", isCorrect: false },
                { text: "حُسن تعلیل", isCorrect: false },
              ],
            },
            {
              label: "پ",
              type: "mcq-inline",
              score: 0.25,
              pageRef: 53,
              content: {
                type: "mcq-inline",
                questionText: "عاشق بادا که عشق خوش سودایی است/ در عالم پیر هرکجا برنایی است",
              },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { text: "ایهام", isCorrect: true },
                { text: "اغراق", isCorrect: false },
                { text: "حُسن تعلیل", isCorrect: false },
                { text: "اسلوب معادله", isCorrect: false },
              ],
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
          number: 25,
          pageRef: 153,
          instruction:
            'مفهوم کدام بیت با سرودهٔ «گفت در دل: رخش! طفلک رخش!/ آه!/ این نخستین بار شاید بود/ کان کلید گنج مروارید او گم شد» تقابل معنایی دارد؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام بیت با سروده تقابل معنایی دارد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "در غم ما روزها بی‌گاه شد/ روزها با سوزها همراه شد", isCorrect: false },
                { optionKey: "ب", text: "اگر خونین‌دلی از جور ایّام/ لب خندان بیاور چون لب جام", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 26,
          pageRef: 103,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'در بیت زیر، پس از آنکه «دوصد مرد آتش‌فروز» در آتش می‌دمند، چه اتّفاقی می‌افتد؟ «بیامد دوصد مرد آتش‌فروز/ دمیدند گفتی شب آمد به روز»',
              },
              correctAnswer: { accepted: ["روز مانند شب تاریک شد"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 27,
          pageRef: 123,
          instruction: 'کدام‌یک از بیت‌های زیر، بیانگر وادی «استغنا» است؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: 'کدام بیت بیانگر وادی «استغنا» است؟' },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: true,
              options: [
                { optionKey: "الف", text: "ملک اینجا بایدت انداختن/ مال اینجا بایدت انداختن", isCorrect: false },
                { optionKey: "ب", text: "هشت جنّت نیز اینجا مرده‌ای است/ هفت دوزخ همچو یخ افسرده‌ای است", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 28,
          instruction: 'گزینهٔ درست را انتخاب کنید. «رستم پس از آنکه به نیرنگِ «شغاد» پی برد، با کمان و تیر...»',
          pageRef: 114,
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "رستم با کمان و تیر چه کرد؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Option الف/ب wording (شاهنامه verse lines) reconstructed from a dense scan line with medium confidence; option پ and the answer key match are solid.",
              options: [
                { optionKey: "الف", text: "یکی تیر زد بر بر اسپ اوی", isCorrect: false },
                { optionKey: "ب", text: "بزد راست بر چشم آن نامدار", isCorrect: false },
                { optionKey: "پ", text: "درخت و برادر را به هم بر بدوخت", isCorrect: true },
              ],
            },
          ],
        },
        {
          number: 29,
          pageRef: 62,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'نویسنده در عبارت زیر، به فرمانبرداری ساکنان «کرانه‌های فرات» از کدام حکومت اشاره می‌کند؟ «کرانه‌های فرات، خط از کرانهٔ رود تیبر می‌خوانده‌اند.»',
              },
              correctAnswer: { accepted: ["روم"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 30,
          pageRef: 27,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'شاعر در بیت «در دفتر زمانه فتد نامش از قلم/ هر ملّتی که مردم صاحب‌قلم نداشت» ادامهٔ حیات ملّت‌ها را در گروِ چه موضوعی می‌داند؟',
              },
              correctAnswer: { accepted: ["داشتن مردم صاحب‌قلم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 31,
          pageRef: 70,
          parts: [
            {
              type: "two-answer-text",
              score: 0.5,
              content: {
                type: "two-answer-text",
                questionText:
                  'در نوشتهٔ زیر، مفهوم کنایی قسمت‌های مشخّص‌شده را، به ترتیب، بنویسید. «بعد از حکیم اسرار، همهٔ چشمها به او بود که حوزهٔ حکمت را او گرم نگاه دارد.»',
                fields: [
                  { id: "f1", label: "همهٔ چشم‌ها به او بود" },
                  { id: "f2", label: "حوزه را گرم نگاه دارد" },
                ],
              },
              correctAnswer: { f1: ["امید/ توجّه داشتن"], f2: ["رونق بخشیدن"] },
              gradingMode: "ai_partial_credit",
              verified: true,
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
                questionText:
                  'با توجّه به سرودهٔ «پهلوان هفت خوان، اکنون طعمهٔ دام و دهان خوان هشتم بود» مقصود از «خوان هشتم» چیست؟',
              },
              correctAnswer: { accepted: ["چاه", "مرگ"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 33,
          pageRef: 126,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                questionText:
                  'مقصود از «سرای پاک و پلید» در بیت زیر چیست؟ «که جای نیک و بد است این سرای پاک و پلید/ طرب بی‌غم تو این جهان تعب نخواهد دید»',
              },
              correctAnswer: { accepted: ["دنیا"] },
              gradingMode: "exact_match",
              verified: true,
            },
          ],
        },
        {
          number: 34,
          pageRef: 139,
          instruction: 'در هریک از عبارات زیر، به‌جز «مصطفی»، از چه گونه‌ای یاد شده‌است؟ کدام گزینه با بقیه متفاوت است؟',
          parts: [
            {
              type: "mcq-inline",
              score: 0.25,
              content: { type: "mcq-inline", questionText: "کدام عبارت با بقیه متفاوت است؟" },
              correctAnswer: {},
              gradingMode: "exact_match",
              verified: false,
              sourceNote:
                "Question stem's exact grammatical framing ('از چه گونه‌ای یاد شده‌است؟') and options ب/پ/ت wording reconstructed with medium confidence — option الف (the confirmed answer) and its page ref are solid.",
              options: [
                { optionKey: "الف", text: "روا نیست بیش از این میزبان محترم را روی زمین انداخت.", isCorrect: true },
                { optionKey: "ب", text: "مشغول تماشا و اندازِ کف و مایتعلّق، به روی صورت گل‌انداختهٔ آقای استادی نقش بست.", isCorrect: false },
                { optionKey: "پ", text: "پنج انگشت دعاگو به مِعیّت کف و مایتعلّق، به روی صورت گل‌انداختهٔ آقای استادی نقش بست.", isCorrect: false },
                { optionKey: "ت", text: "یک دست از بهترین لباس‌های نوزاد خود را بانضمام مایتعلّق، به دست چالاق‌شدهٔ خودم بیرون انداختم.", isCorrect: false },
              ],
            },
          ],
        },
        {
          number: 35,
          pageRef: 73,
          parts: [
            {
              type: "short-text-answer",
              score: 0.25,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'عبارت «ناله‌های گریه‌آلود آن روح دردمند و تنها را می‌شنوم، ناله‌های آن امام راستین و بزرگم را، همچون این شیعهٔ گمنام و غریبش، در کنار آن مدینهٔ پلید و در قلب آن کویر بی‌فریاد، سر در حلقوم چاه می‌برد و می‌گریست» یادآور کدام موضوع مشهور است؟',
              },
              correctAnswer: {
                accepted: ["اشاره به گریستن حضرت علی (ع) در حالی که سر درون چاه می‌برد"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 36,
          pageRef: 155,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'مفهوم مشترک بیت «یک قصّه بیش نیست غم عشق وین عجب/ کز هر زبان که می‌شنوم نامکرّر است» و سرودهٔ «هر روز باید ذکری واحد عشق بخوانم/ و آنچه را قدیمی است، قدیمی ندانم: که تو از آن منی، و من از آن تو» چیست؟',
              },
              correctAnswer: { accepted: ["ناممکّن بودن و تازگی عشق"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 37,
          pageRef: 53,
          parts: [
            {
              type: "short-text-answer",
              score: 0.5,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText:
                  'با توجّه به متن زیر، چرا عین‌القضات همدانی، عشق‌ورزی را در عرفان واجب دانسته‌است؟ «ای عزیز، هرچه فرض است، از خدا رسیدن است و لابدّ هرچه بدان واسطه به خدا رسند، فرض باشد؛ نزدیک طالبان، عشق، بنده را نزدیک‌ترین راه است به خدا رساند.»',
              },
              correctAnswer: { accepted: ["زیرا عشق واسطهٔ رسیدن به خدا می‌داند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
          ],
        },
        {
          number: 38,
          instruction: "معنی ابیات و عبارات زیر را به نثر روان بنویسید.",
          layoutPattern: "multi-paraphrase-block",
          parts: [
            {
              label: "الف",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 12,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "وظیفهٔ روزی به خطای منکر نبُرد." },
              correctAnswer: { accepted: ["روزی مقرّر آنها را با وجود خطاهای زشتشان قطع نمی‌کند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ب",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 110,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "این عیار مهر و کین مرد و نامرد است." },
              correctAnswer: { accepted: ["این شعر، معیار سنجش دوستی مردان و دشمنی نامردان است"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "پ",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 84,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "امروز خورشید در دشت، آینه‌دار من و تو." },
              correctAnswer: {
                accepted: ["اکنون خورشیدِ آزادی و امید، در فضای کشور (ره) امام، روشنی‌بخش ماست"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ت",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 52,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "عشق هرکسی را به خود راه ندهد و به همه جایی مأوا نکند." },
              correctAnswer: { accepted: ["عشق هرکسی را نمی‌پذیرد و در هرجایی اقامت نمی‌کند"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ث",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 71,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "پامان به ده باز نشده بود و رفتار شهرنشینی نداشتیم." },
              correctAnswer: { accepted: ["هنوز به ده رفت‌وآمد داشتیم و رفتار شهرنشینی نشده بودیم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ج",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 140,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "پشت دستم را داغ کردم که تا من باشم دیگر پیرامون ترفیع رتبه نگردم." },
              correctAnswer: { accepted: ["از این کار پشیمان شدم که دیگر به فکر ارتقای رتبه نباشم"] },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "چ",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 122,
              content: {
                type: "short-text-answer",
                inputVariant: "textarea",
                questionText: "نیست از فرسنگِ آن، آگاه کس/ که دوزخ مرا زین سخن گشت خوار",
              },
              correctAnswer: {
                accepted: ["کسی در این جهان به بازنگشته‌است [به همین دلیل] کسی از این مسافت، آگاه نیست"],
              },
              gradingMode: "ai_semantic",
              verified: true,
            },
            {
              label: "ح",
              type: "short-text-answer",
              score: 0.5,
              pageRef: 101,
              content: { type: "short-text-answer", inputVariant: "textarea", questionText: "سیاووش چنین گفت کای شهریار" },
              correctAnswer: {
                accepted: [
                  "سیاووش این‌گونه گفت که پادشاه، تحمّل دوزخ برای من آسان‌تر از این سخن (این تهمت) است",
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
