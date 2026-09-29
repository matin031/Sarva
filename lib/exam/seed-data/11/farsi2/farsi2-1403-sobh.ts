import { poemLines, text } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * فارسی۲ یازدهم — امتحان شبه‌نهایی صبح ۱۴۰۳ (همهٔ رشته‌ها)
 * تاریخ: ۱۴۰۳/۰۲/۰۴ — ساعت ۷:۳۰، ۹۰ دقیقه.
 * Source: برگهٔ ۴ صفحه‌ای سؤال + ۳ صفحه راهنمای تصحیح.
 *
 * کنترل سه‌مرحله‌ای:
 * ۱) متن، گزینه‌ها، واژه‌های مشخص‌شده و بارم با تصویر برگه تطبیق شد.
 * ۲) پاسخ، ریزبارم و pageRef با راهنمای تصحیح تطبیق شد.
 * ۳) نوع UI، gradingMode، جمع بارم‌ها و syntax بازبینی شد.
 *
 * بارم‌ها: زبانی ۷ + ادبی ۵ + فکری ۸ = ۲۰.
 */
export const farsi2Sobh1403: SeedExam = {
  subject: "farsi2",
  grade: 11,
  title: "فارسی۲ یازدهم — امتحان شبه‌نهایی صبح ۱۴۰۳",
  examSession: "farsi2-1403-shabhe-nahayi-sobh",
  totalScore: 20,
  sourcePdf: "Farsi2-Sobh1403-[konkur.in].pdf",
  sections: [
    {
      title: "قلمرو زبانی", orderIndex: 1, sectionScore: 7,
      questions: [
        {
          number: 1, instruction: "معنی واژگان صحیح را از داخل کمانک انتخاب کنید.", layoutPattern: "bracket-choice-mcq",
          parts: [
            { label:"الف", type:"mcq-inline", score:.25, pageRef:57,
              content:{type:"mcq-inline",questionText:"حق‌تعالی عزرائیل را بفرمود: «برو اگر به طوع و رغبت نیاید به اکراه و اجبار برگیر و بیاور.»"},
              correctAnswer:{},gradingMode:"exact_match",verified:true,
              options:[{text:"اطاعت",isCorrect:true},{text:"کراهت",isCorrect:false}]},
            { label:"ب", type:"mcq-inline", score:.25, pageRef:102,
              content:{type:"mcq-inline",questionText:"تو شاهی و گر اژدهاپیکری / بباید زدن داستان‌آوری"},
              correctAnswer:{},gradingMode:"exact_match",verified:true,
              options:[{text:"به طور قطع",isCorrect:true},{text:"احتمالاً",isCorrect:false}]},
          ]
        },
        {
          number:2, instruction:"واژهٔ درست املایی را انتخاب کنید.", layoutPattern:"bracket-choice-mcq",
          parts:[
            {label:"الف",type:"mcq-inline",score:.25,pageRef:83,content:{type:"mcq-inline",questionText:"عزیزترین رفقای من که حُسن سیرت را با (صباحت / سباحت) توأم داشت..."},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"صباحت",isCorrect:true},{text:"سباحت",isCorrect:false}]},
            {label:"ب",type:"mcq-inline",score:.25,pageRef:125,content:{type:"mcq-inline",questionText:"من (قُلا / غُلا) کردم و روزی که پیرزن نبود، رفتم سر بقچه‌اش."},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"قُلا",isCorrect:true},{text:"غُلا",isCorrect:false}]},
            {label:"ج",type:"mcq-inline",score:.25,pageRef:106,content:{type:"mcq-inline",questionText:"کشتی‌گیری بود که در زورآزمایی شهره بود. بدر در میدان او (هلالی / حلالی) بود و رستم به دستان او زالی."},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"هلالی",isCorrect:true},{text:"حلالی",isCorrect:false}]},
          ]
        },
        {
          number:3, parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:text("من می‌ترسم که اگر از گشادن عقده‌های من آغاز کنی ملول شوی و بعضی از ایشان در بند بمانند و چون من بسته باشم ـ اگرچه ملالت به کمال رسیده باشد ـ اهمال جانب من جایز نشمری."),questionText:"واژهٔ «اهمال» در کدام معنی نیامده است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[{optionKey:"الف",text:"کوتاهی کردن",isCorrect:false},{optionKey:"ب",text:"سهل‌انگاری کردن",isCorrect:false},{optionKey:"ج",text:"آزرده کردن",isCorrect:true},{optionKey:"د",text:"کم‌کاری کردن",isCorrect:false}]}]
        },
        {
          number:4,pageRef:18,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:text("بونصر نامه‌های رسیده را، به خطّ خویش، نکت بیرون می‌آورد و چیزی که در او کراهیتی نبود، می‌فرستاد فرود سرای."),questionText:"کدام‌یک نمی‌تواند معادل معنایی «فرود سرای» باشد؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[{text:"اندرونی",isCorrect:false},{text:"اتاق مخصوص خدمتگزاران",isCorrect:false},{text:"اتاق تشریفات",isCorrect:true}]}]
        },
        {
          number:5,instruction:"در هر عبارت غلط املایی را پیدا و اصلاح کنید.",layoutPattern:"multi-subquestion",
          parts:[
            {label:"الف",type:"open-error-correction-in-passage",score:.25,content:{type:"open-error-correction-in-passage",passage:text("ناگاه آن دیدند که چون آب نیرو کرده بود و کشتی پر شده، نشستن و دریدن گرفت. آن‌گاه آگاه شدند که غرقه خواست شد. بانگ و هزاهز و غریو خاست، امیر برخاست.")},correctAnswer:{wrongWord:"خواست",correctWord:"خاست"},gradingMode:"exact_match",verified:true},
            {label:"ب-۱",type:"open-error-correction-in-passage",score:.25,pageRef:120,content:{type:"open-error-correction-in-passage",passage:text("و چون ایشان حقوق مرا به طاعت و مناسحت بگزاردند و به معونت و مظاهرت ایشان از دست صیاد بجستم، مرا نیز از عهده لوازم ریاست بیرون باید آمد و مواجب صیادت را به ادا رسانید.")},correctAnswer:{wrongWord:"مناسحت",correctWord:"مناصحت"},gradingMode:"exact_match",verified:true},
            {label:"ب-۲",type:"open-error-correction-in-passage",score:.25,pageRef:120,content:{type:"open-error-correction-in-passage",passage:text("و چون ایشان حقوق مرا به طاعت و مناسحت بگزاردند و به معونت و مظاهرت ایشان از دست صیاد بجستم، مرا نیز از عهده لوازم ریاست بیرون باید آمد و مواجب صیادت را به ادا رسانید.")},correctAnswer:{wrongWord:"ریاست",correctWord:"سیادت"},gradingMode:"exact_match",verified:true},
          ]
        },
        {
          number:6,pageRef:91,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"در کدام گزینه غلط املایی دیده نمی‌شود؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[
            {optionKey:"الف",text:"از آنها که خورشید فریادشان / دمید از گلوی سحرزاده‌شان",isCorrect:false},
            {optionKey:"ب",text:"بزن زخم، این مرحم عاشق است / که بی زخم مردن غم عاشق است",isCorrect:false},
            {optionKey:"ج",text:"حال منکر جان و جانان ما / بزن زخم انکار بر جان ما",isCorrect:false},
            {optionKey:"د",text:"چه جانانه چرخ جنون می‌زنند / دف عشق با دست خون می‌زنند",isCorrect:true},
          ]}]
        },
        {
          number:7,pageRef:111,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"کدام بیت به لحاظ املایی درست است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[{optionKey:"الف",text:"سپر بر سر آورد شیر اله / علم کرد شمشیر آن اژدها",isCorrect:true},{optionKey:"ب",text:"بیفشرد چون کوه پا بر زمین / بخوایید دندان به دندان کین",isCorrect:false}]}]
        },
        {
          number:8,instruction:"با توجه به ابیات «به روز مرگ، چو تابوت من روان باشد / گمان مبر که مرا درد این جهان باشد» و «برای من مَگِری و مگو: دریغ دریغ / به دوغ دیو درافتی، دریغ آن باشد» پاسخ دهید.",layoutPattern:"multi-subquestion",
          parts:[
            {label:"الف",type:"count-answer",score:.25,pageRef:71,content:{type:"count-answer",questionText:"بیت نخست چند متمم دارد؟",min:0,max:10},correctAnswer:{value:2},gradingMode:"exact_match",verified:true,sourceNote:"کلید: دو متمم «روز» و «من». بیت دوم در دادهٔ اولیه نبود (جزءهای ب، ج و د به آن ارجاع می‌دهند و پاسخ «دریغ» از آن است)؛ از غزل مولانا (کتاب، ص ۷۱) افزوده شد."},
            {label:"ب",type:"short-text-answer",score:.25,pageRef:71,content:{type:"short-text-answer",inputVariant:"word",questionText:"در دو بیت، یک حرف ربط وابسته‌ساز مشخص کنید."},correctAnswer:{accepted:["چو","که"]},gradingMode:"exact_match",verified:true},
            {label:"ج",type:"short-text-answer",score:.25,pageRef:71,content:{type:"short-text-answer",inputVariant:"word",questionText:"در بیت دوم کدام واژه نقش تبعی دارد؟"},correctAnswer:{accepted:["دریغ"]},gradingMode:"exact_match",verified:true},
            {label:"د",type:"true-false",score:.25,pageRef:71,content:{type:"true-false",statementText:"«مسند» در جملهٔ آخر، صفت اشاره است."},correctAnswer:{value:false},gradingMode:"exact_match",verified:true},
          ]
        },
        {
          number:9,pageRef:53,instruction:"در بیت «دریاب که مبتلای عشقم / آزاد کن از بلای عشقم» پاسخ دهید.",layoutPattern:"multi-subquestion",
          parts:[
            {label:"الف",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"نقش دستوری «م» در مصراع دوم چیست؟"},correctAnswer:{accepted:["مفعول"]},gradingMode:"exact_match",verified:true},
            {label:"ب",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"جملهٔ هسته (پایه) را مشخص کنید."},correctAnswer:{accepted:["دریاب"]},gradingMode:"exact_match",verified:true},
          ]
        },
        {
          number:10,pageRef:104,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"وضعیت کدام دو واژه در گذر زمان یکسان است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[{optionKey:"الف",text:"سوفار ـ سوگند",isCorrect:false},{optionKey:"ب",text:"کثیف ـ فتراک",isCorrect:false},{optionKey:"ج",text:"سپر ـ رکاب",isCorrect:true}]}]
        },
        {
          number:11,parts:[{type:"mcq-inline",score:.5,content:{type:"mcq-inline",questionText:"نوع حذف در کدام عبارت متفاوت است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[
            {optionKey:"الف",text:"درفشان لاله در وی چون چراغی",isCorrect:false},
            {optionKey:"ب",text:"نهان راستی، آشکارا گزند",isCorrect:false},
            {optionKey:"ج",text:"شیران غرّیدند و به اتّفاق، آهو را از دام رهانید.",isCorrect:true},
          ],sourceNote:"کلید: گزینهٔ ج؛ pageRefهای کلید ۱۰۱ و ۱۲۱."}]
        },
        {
          number:12,pageRef:58,instruction:"در بیت «بپویید کاین مهتر آهرمن است / جهان‌آفرین را به دل دشمن است» پاسخ دهید.",layoutPattern:"multi-subquestion",
          parts:[
            {label:"الف",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"نوع وابستهٔ پیشین در جملهٔ دوم را بنویسید."},correctAnswer:{accepted:["صفت اشاره"]},gradingMode:"exact_match",verified:true},
            {label:"ب",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"نقش واژهٔ «جهان‌آفرین» را بنویسید."},correctAnswer:{accepted:["مضاف‌الیه","مضاف الیه"]},gradingMode:"exact_match",verified:true},
          ]
        },
        {
          number:13,pageRef:38,instruction:"با توجه به عبارت داده‌شده پاسخ دهید.",layoutPattern:"multi-subquestion",
          parts:[
            {label:"الف",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",stimulus:text("با کشته شدن آغا محمّدخان، فتحعلی شاه بر تخت نشست. شاهزادهٔ نوجوان، میرزا عیسی قائم مقام را نه تنها وزیر خردمند، بلکه مرشد و پدر معنوی خود می‌دانست و بی اذن و خواست او دست به کاری نمی‌زد."),questionText:"مرجع ضمیر «او» در جملهٔ آخر کدام واژه است؟"},correctAnswer:{accepted:["میرزا عیسی قائم مقام","میرزا عیسی","قائم مقام"]},gradingMode:"exact_match",verified:true},
            {label:"ب-۱",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"یک وابستهٔ پیشین در جملهٔ دوم پیدا کنید."},correctAnswer:{accepted:["میرزا"]},gradingMode:"exact_match",verified:true},
            {label:"ب-۲",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"نوع وابستهٔ پیشین را بنویسید."},correctAnswer:{accepted:["شاخص"]},gradingMode:"exact_match",verified:true},
          ]
        },
        {
          number:14,pageRef:20,parts:[{type:"count-answer",score:.25,content:{type:"count-answer",questionText:"در عبارت «امیر گفت: در این دو سه روز، بار داده آید. نامه‌ها نبشته آمد. چون نامه‌ها گُسیل کرده شد، تو بازآی که پیغامی‌ست سوی بونصر تا داده آید.» چند فعل مجهول وجود دارد؟",min:0,max:10},correctAnswer:{value:4},gradingMode:"exact_match",verified:true}]
        },
        {
          number:15,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"نوع صفت بیانی در کدام مصراع متفاوت است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,
          options:[
            {optionKey:"الف",text:"برو شیر درنده باش، ای دغل",isCorrect:false},
            {optionKey:"ب",text:"برافراخت پس دست خیبرگشا",isCorrect:false},
            {optionKey:"ج",text:"همی‌رفت پیش اندرون مرد گرد",isCorrect:true},
            {optionKey:"د",text:"که ای نامداران یزدان‌پرست",isCorrect:false},
          ]}]
        },
      ]
    },
    {
      title:"قلمرو ادبی",orderIndex:2,sectionScore:5,
      questions:[
        {number:16,pageRef:28,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"در کدام بیت هر دو آرایهٔ تشبیه و استعاره دیده می‌شود؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"به خوناب شفق در دامن شام / به خون آلوده ایران کهن دید",isCorrect:true},
          {optionKey:"ب",text:"نهان می‌گشت روی روشن روز / به زیر دامن شب در سیاهی",isCorrect:false},
        ]}]},
        {number:17,parts:[{type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",stimulus:text("الف) از شبنم عشق خاک آدم گل شد / صد فتنه و شور در جهان حاصل شد\nب) سرنشتر عشق بر رگ روح زدند / یک قطره فرو چکید و نامش دل شد"),questionText:"آرایهٔ مشترک در مصراع اول دو بیت را بنویسید."},correctAnswer:{accepted:["اضافهٔ تشبیهی","اضافه تشبیهی"]},gradingMode:"exact_match",verified:true,sourceNote:"کلید: اضافهٔ تشبیهی؛ pageRefها ۱۳ و ۳۰."}]},
        {number:18,pageRef:52,parts:[{type:"mcq-inline",score:.5,content:{type:"mcq-inline",questionText:"واژهٔ «ماه / مه» در کدام بیت آرایهٔ استعاره نیست؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"به ترانه‌های شیرین به بهانه‌های زرین / بکشید سوی خانه مه خوب خوش‌لقا را",isCorrect:false},
          {optionKey:"ب",text:"فرزند عزیز را به صد جهد / بنشاند چو ماه در یکی مهد",isCorrect:true},
          {optionKey:"ج",text:"چون رایت عشق آن جهانگیر / شد چون مه لیلی آسمان‌گیر",isCorrect:false},
        ]}]},
        {number:19,pageRef:128,instruction:"با توجه به عبارت پاسخ دهید.",layoutPattern:"multi-subquestion",parts:[
          {label:"الف",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",stimulus:text("یقین شد که من فکر تازه‌ای در سر دارم که او را دست بیندازم و مسخره کنم. ناگهان چون پلنگی خشمناک راه افتاد. اتفاقاً این آقای معلّم لهجهٔ غلیظ شیرازی داشت و اصرار داشت که خیلی خیلی عامیانه صحبت کند. همین‌طور که پیش می‌آمد، با لهجهٔ خاصش گفت: به‌به! مثل قوّال‌ها صورتک زدی؟"),questionText:"یک آرایهٔ حس‌آمیزی بیابید."},correctAnswer:{accepted:["لهجهٔ غلیظ","لهجه غلیظ"]},gradingMode:"exact_match",verified:true},
          {label:"ب-۱",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"یک کنایه بیابید."},correctAnswer:{accepted:["دست انداختن","دست بیندازم"]},gradingMode:"exact_match",verified:true},
          {label:"ب-۲",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"مفهوم کنایه را بنویسید."},correctAnswer:{accepted:["مسخره کردن"]},gradingMode:"ai_semantic",verified:true},
          {label:"ج-۱",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"در جملهٔ «ناگهان چون پلنگی خشمناک راه افتاد» مشبّه را بنویسید."},correctAnswer:{accepted:["من"]},gradingMode:"exact_match",verified:true},
          {label:"ج-۲",type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"مشبّه‌به را بنویسید."},correctAnswer:{accepted:["پلنگ","پلنگی خشمناک"]},gradingMode:"exact_match",verified:true},
        ]},
        {number:20,instruction:"بیت مربوط به هر آرایه را انتخاب کنید. (یک بیت اضافی است)",parts:[{type:"matching-pairs-with-distractor",score:.75,content:{type:"matching-pairs-with-distractor",
          columnA:[{id:"الف",text:"مجاز"},{id:"ب",text:"متناقض‌نما"},{id:"ج",text:"تلمیح"}],
          columnB:[
            {id:"1",text:"ای حقیقی‌ترین مجاز من، ای عشق / ای همه استعاره‌ها با تو"},
            {id:"2",text:"جانان من اندوه لبنان کشت ما را / بشکست داغ دیر یاسین پشت ما را"},
            {id:"3",text:"به پاس هر وجب خاکی از این ملک / چه بسیار است آن سرها که رفته"},
            {id:"4",text:"چنان سعی کن کز تو ماند چو شیر / چه باشی چو روبه به وامانده سیر"},
          ]},correctAnswer:{الف:"3",ب:"1",ج:"2"},gradingMode:"exact_match",verified:true,sourceNote:"بیت ۴ اضافی است. کلید: مجاز=۳، متناقض‌نما=۱، تلمیح=۲."}]},
        {number:21,pageRef:52,parts:[{type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",questionText:"مهم‌ترین اثر نجم‌الدّین رازی (دایه) را نام ببرید."},correctAnswer:{accepted:["مرصاد العباد","مرصادالعباد"]},gradingMode:"exact_match",verified:true}]},
        {number:22,pageRef:78,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"در کدام گزینه نام نویسنده نادرست است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"روضهٔ خلد — مجد خوافی",isCorrect:false},
          {optionKey:"ب",text:"چشمهٔ روشن — غلامحسین یوسفی",isCorrect:false},
          {optionKey:"ج",text:"شلوارهای وصله‌دار — رسول پرویزی",isCorrect:false},
          {optionKey:"د",text:"روزها — مجید واعظی",isCorrect:true},
        ]}]},
        {number:23,pageRef:74,instruction:"گزینه‌های درست را انتخاب کنید.",layoutPattern:"multi-subquestion",parts:[
          {label:"الف",type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"کتابی عرفانی دربارهٔ زندگی ابوسعید ابوالخیر کدام است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"تذکرةالاولیا",isCorrect:false},{text:"اسرارالتوحید",isCorrect:true}]},
          {label:"ب",type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"نویسندهٔ آن کتاب کیست؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"محمد بن منوّر",isCorrect:true},{text:"عطار نیشابوری",isCorrect:false}]},
        ]},
        {number:24,instruction:"ابیات را کامل کنید.",layoutPattern:"multi-subquestion",parts:[
          {label:"الف",type:"verse-completion",score:.5,pageRef:63,content:{type:"verse-completion",firstMesra:"باز کشید از روش خویش پای"},correctAnswer:{accepted:["در پی او کرد به تقلید جای"]},gradingMode:"exact_match",verified:true},
          {label:"ب",type:"verse-completion",score:.5,pageRef:115,content:{type:"verse-completion",firstMesra:"مرا اوج عزّت در افلاک توست"},correctAnswer:{accepted:["به چشمان من کیمیا خاک توست"]},gradingMode:"exact_match",verified:true},
        ]},
      ]
    },
    {
      title:"قلمرو فکری",orderIndex:3,sectionScore:8,
      questions:[
        {number:25,pageRef:12,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",questionText:"مفهوم کدام بیت متفاوت است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"یقین مرد را دیده بیننده کرد / شد و تکیه بر آفریننده کرد",isCorrect:false},
          {optionKey:"ب",text:"کزین پس به کنجی نشینم چو مور / که روزی نخوردند پیلان به زور",isCorrect:false},
          {optionKey:"ج",text:"زنخدان فرو برد چندی به جیب / که بخشنده روزی فرستد ز غیب",isCorrect:false},
          {optionKey:"د",text:"نه بیگانه تیمار خوردش نه دوست / چو چنگش رگ و استخوان ماند و پوست",isCorrect:true},
        ]}]},
        {number:26,pageRef:48,instruction:"دو ویژگی رفتاری و اخلاقی قاضی بُست را بنویسید.",parts:[{type:"two-answer-text",score:.5,content:{type:"two-answer-text",stimulus:{tokens:[{kind:"text",value:"قاضی "},{kind:"highlight",value:"بسیار دعا کرد"},{kind:"text",value:" و گفت: این صلت فخر است. پذیرفتم و باز دادم که مرا به کار نیست و "},{kind:"highlight",value:"قیامت سخت نزدیک است، حساب این نتوانم داد"},{kind:"text",value:"."}]},questionText:"با توجه به قسمت‌های مشخص‌شده، دو ویژگی را بنویسید.",fields:[{id:"f1",label:"ویژگی اول"},{id:"f2",label:"ویژگی دوم"}]},correctAnswer:{f1:["آداب‌دان بودن","آداب دان بودن"],f2:["ایمان به حساب قیامت","اعتقاد به حساب قیامت"]},gradingMode:"ai_semantic",verified:false,sourceNote:"زیرخط در داده نبود؛ دو بخشِ مشخص‌شده از روی کلید (آداب‌دانی ← «بسیار دعا کرد»، ایمان به قیامت ← «قیامت سخت نزدیک است…») بازسازی شد. پاسخ از کلید است و تغییری نکرده؛ با برگه مقایسه شود."}]},
        {number:27,parts:[{type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"word",stimulus:poemLines("گو یا رب از این گزاف‌کاری","توفیق دهم به رستگاری"),questionText:"مقصود شاعر از «گزاف‌کاری» چیست؟"},correctAnswer:{accepted:["عشق‌ورزی","عشق ورزی"]},gradingMode:"ai_semantic",verified:true}]},
        {number:28,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:poemLines("بدان شمشیر تیز عافیت‌سوز","در آن انبوه کار مرگ می‌کرد"),questionText:"کدام مفهوم از بیت دریافت نمی‌شود؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"تیزی شمشیر",isCorrect:false},{optionKey:"ب",text:"پرشماری حریف",isCorrect:false},{optionKey:"ج",text:"دلاوری فرمانده",isCorrect:false},{optionKey:"د",text:"وحشی‌گری دشمن",isCorrect:true},
        ]}]},
        {number:29,pageRef:48,parts:[{type:"mcq-inline",score:.5,content:{type:"mcq-inline",stimulus:{lines:[[{kind:"text",value:"فرصت بده ای روح جنون "},{kind:"highlight",value:"تا غزل بعد"}],[{kind:"text",value:"در غیرت ما نیست که در ننگ بمیریم"}]]},questionText:"مقصود شاعر از قسمت مشخص‌شده چیست؟"},correctAnswer:{},gradingMode:"exact_match",verified:false,sourceNote:"زیرخط در داده نبود؛ «تا غزل بعد» از روی کلید (درخواست یک فرصت کوتاه) بازسازی شد. کلید (ب) تغییری نکرده؛ با برگه مقایسه شود.",options:[{optionKey:"الف",text:"درخواست یک شعر دیگر",isCorrect:false},{optionKey:"ب",text:"درخواست یک فرصت کوتاه",isCorrect:true}]}]},
        {number:30,pageRef:33,parts:[{type:"short-text-answer",score:.5,content:{type:"short-text-answer",inputVariant:"textarea",stimulus:poemLines("به آنچه می‌گذرد دل منه که دجله بسی","پس از خلیفه بخواهد گذشت در بغداد"),questionText:"شاعر چه کاری را توصیه می‌کند؟"},correctAnswer:{accepted:["دل نبستن به دنیا","دلبسته نشدن به دنیا"]},gradingMode:"ai_semantic",verified:true}]},
        {number:31,parts:[{type:"two-answer-text",score:.5,content:{type:"two-answer-text",stimulus:{tokens:[{kind:"text",value:"کبوتران را فرمود فرود آیید. "},{kind:"highlight",value:"فرمان او نگاه داشتند"},{kind:"text",value:" و جمله بنشستند و آن موش را زِبرا نام بود، "},{kind:"highlight",value:"با دهای تمام و خرد بسیار"},{kind:"text",value:"."}]},questionText:"قسمت‌های مشخص‌شده به‌ترتیب بیانگر کدام ویژگی کبوتران و زِبرا است؟",fields:[{id:"f1",label:"کبوتران"},{id:"f2",label:"زِبرا"}]},correctAnswer:{f1:["فرمان‌پذیری و اطاعت","اطاعت","فرمان پذیری"],f2:["زیرکی و هوشمندی","هوشمندی","زیرکی"]},gradingMode:"ai_semantic",verified:false,sourceNote:"زیرخط در داده نبود؛ «فرمان او نگاه داشتند» (اطاعت) و «با دهای تمام و خرد بسیار» (زیرکی) از روی کلید بازسازی شد. پاسخ تغییری نکرده؛ با برگه مقایسه شود."}]},
        {number:32,pageRef:89,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:text("ای کعبه به داغ ماتمت، نیلی‌پوش / وز تشنگی‌ات، فرات در جوش و خروش\nجز تو که فرات، رشحه‌ای از یم توست / دریا نشنیدم که کشد مشک به دوش"),questionText:"مفهوم کنایی دو بیت به کدام گزینه نزدیک‌تر است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"نیلی‌پوشی کعبه",isCorrect:false},{optionKey:"ب",text:"مشک به دوش کشیدن دریا",isCorrect:false},{optionKey:"ج",text:"سوگواری عمیق برای تشنگی خودخواسته",isCorrect:true},
        ]}]},
        {number:33,pageRef:110,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:poemLines("با جوانان چو دست بگشادی","پای گردون پیر بربستی"),questionText:"شاعر فردی را توصیف می‌کند که به لحاظ کدام جنبه قوی است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{optionKey:"الف",text:"جسمی",isCorrect:true},{optionKey:"ب",text:"روحی",isCorrect:false}]}]},
        {number:34,pageRef:102,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:text("خروشید کای پایمردان دیو / بریده دل از ترس گیهان خدیو\nهمه سوی دوزخ نهادید روی / سپردید دل‌ها به گفتار اوی"),questionText:"بر اساس مفهوم ابیات، کدام دسته از افراد مخاطب شاعر نیست؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[
          {optionKey:"الف",text:"شورشیان درباری",isCorrect:true},{optionKey:"ب",text:"افراد خدانترس",isCorrect:false},{optionKey:"ج",text:"یاریگران اهریمن",isCorrect:false},{optionKey:"د",text:"دل‌سپردگان به ابلیس",isCorrect:false},
        ]}]},
        {number:35,pageRef:124,parts:[{type:"short-text-answer",score:.25,content:{type:"short-text-answer",inputVariant:"textarea",stimulus:text("ننه ـ خدا حفظش کند ـ هر وقت برای من و برادرم لباس می‌خرید، ناله‌اش بلند بود. متلکی می‌گفت که دو برادری مثل عَلَم یزید می‌مانید. می‌خواهید بروید آسمان، شوربا بیاورید."),questionText:"کدام ویژگی مشترک نویسنده و برادرش توصیف شده است؟"},correctAnswer:{accepted:["درازی و قد بلند آنان","قد بلند","بلندقد بودن"]},gradingMode:"ai_semantic",verified:true}]},
        {number:36,pageRef:69,parts:[{type:"mcq-inline",score:.25,content:{type:"mcq-inline",stimulus:poemLines("اگر او به وعده گوید که دمی دگر بیایم","همه وعده مکر باشد، بفریبد او شما را"),questionText:"با توجه به درس «در کوی عاشقان» و غیبت شمس، مفهوم بیت در ارتباط با کدام است؟"},correctAnswer:{},gradingMode:"exact_match",verified:true,options:[{text:"شخصیتی فریبکار",isCorrect:false},{text:"معشوقی دست‌نیافتنی",isCorrect:true}]}]},
        {number:37,instruction:"معنی ابیات و عبارات زیر را به نثر روان بنویسید.",layoutPattern:"multi-subquestion",parts:[
          {label:"الف",type:"short-text-answer",score:.5,pageRef:20,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"خداوند این سخت نیکو کرد و شنوده‌ام که ابوالحسن و پسرش وقت باشد که به ده دِرَم درمانده‌اند."},correctAnswer:{accepted:["سلطان مسعود این کار را بسیار به‌جا انجام داده است و شنیده‌ام ابوالحسن و پسرش گاهی حتی ده درهم نیز برای خرج کردن ندارند"]},gradingMode:"ai_semantic",verified:true},
          {label:"ب",type:"short-text-answer",score:.5,pageRef:29,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"میان موج می‌رقصید در آب / به رقص مرگ اخترهای انبوه."},correctAnswer:{accepted:["ستاره‌های بی‌شمار آسمان در میان آب رودخانه سند رقص مرگ می‌کردند"]},gradingMode:"ai_semantic",verified:true},
          {label:"ج",type:"short-text-answer",score:.5,pageRef:39,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"نعره‌های درهمِ شترهای حاملِ زنبورک، با آهنگ شیپورها در هم می‌آمیخت."},correctAnswer:{accepted:["صدای شترهایی که حامل توپ‌های جنگی بودند با صدای شیپور جنگ در هم آمیخته بود"]},gradingMode:"ai_semantic",verified:true},
          {label:"د",type:"short-text-answer",score:.25,pageRef:59,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"چون به دل رسید، دل را بر مثال کوشکی یافت."},correctAnswer:{accepted:["ابلیس هنگامی که بر دل انسان رسید آن را همچون کاخی باعظمت یافت"]},gradingMode:"ai_semantic",verified:true},
          {label:"هـ",type:"short-text-answer",score:.5,pageRef:86,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"یعنی کلیم آهنگ جان سامری کرد / ای یاوران باید ولی را یاوری کرد."},correctAnswer:{accepted:["رهبر انقلاب قصد از میان برداشتن اشغالگران اسرائیلی را دارد؛ ای یاران انقلاب لازم است از ولی و رهبرمان حمایت کنیم"]},gradingMode:"ai_semantic",verified:true},
          {label:"و",type:"short-text-answer",score:.5,pageRef:103,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"بیامد به درگاه سالار نو / بدیدندش آن جا و برخاست غو."},correctAnswer:{accepted:["کاوه به بارگاه پادشاه جدید فریدون آمد و مردم فریدون را در مخفیگاهش دیدند و با دیدن او فریاد شادی سر دادند"]},gradingMode:"ai_semantic",verified:true},
          {label:"ز",type:"short-text-answer",score:.75,pageRef:120,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"در هنگام بلا شرکت بوده، در وقت فراغ موافقت اولی‌تر."},correctAnswer:{accepted:["در هنگام گرفتاری با هم بوده‌ایم؛ پس در وقت آسایش نیز شایسته است که با هم باشیم"]},gradingMode:"ai_partial_credit",verified:true,sourceNote:"ریزبارم کلید: گرفتاری ۰٫۲۵ + وقت آسایش ۰٫۲۵ + شایستگی همراهی ۰٫۲۵."},
          {label:"ح",type:"short-text-answer",score:.5,pageRef:71,content:{type:"short-text-answer",inputVariant:"textarea",questionText:"کدام دانه در زمین فرو رفت که نَرُست / چرا به دانهٔ انسانت این گمان باشد."},correctAnswer:{accepted:["کدام دانه است که پس از کاشتن نروید؟ پس چرا این گمان نادرست را درباره انسان داری و معاد انسان را باور نداری؟"]},gradingMode:"ai_semantic",verified:true},
        ]},
      ]
    }
  ]
};
