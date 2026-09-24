import { ul } from "../../helpers";
import type { SeedExam } from "../../seed-types";

/**
 * علوم و فنون ادبی (۳) دوازدهم — امتحان نهایی خرداد ۱۴۰۱ (انسانی و معارف)
 * Source: Khordad-1401-FonunAdabi3-[www.konkur.in].pdf — ۴ صفحه سؤال + ۲ صفحه راهنمای تصحیح.
 *
 * متن سؤال‌ها، بارم‌ها و پاسخ‌ها از روی خودِ برگه و راهنمای رسمی تصحیح رونویسی شده‌اند.
 * نوع هر بخش متناسب با ماهیت پاسخ انتخاب شده تا در آزمون آنلاین سروا رندر مناسب داشته باشد.
 * پاسخ‌های باز فقط بر پایهٔ عبارت‌های راهنمای تصحیح ثبت شده‌اند.
 * بازبینی نهایی در سه گذر انجام شده است: متن و گزینه‌ها با ۴ صفحهٔ سؤال،
 * پاسخ‌ها و بارم‌ها با ۲ صفحهٔ راهنمای تصحیح، و سپس شماره‌ها/جمع بارم/نوع رندر
 * همراه با یک تطبیق دوباره با صفحات PDF. همهٔ بخش‌ها verified: true هستند.
 */

export const olumFonoon3Khordad1401: SeedExam = {
  "subject": "olum-fonoon3",
  "grade": 12,
  "title": "علوم و فنون ادبی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۱",
  "examSession": "olum-fonoon-1401-khordad",
  "totalScore": 20,
  "sourcePdf": "Khordad-1401-FonunAdabi3-[www.konkur.in].pdf",
  "sections": [
    {
      "title": "تاریخ ادبیات",
      "orderIndex": 1,
      "sectionScore": 2,
      "questions": [
        {
          "number": 1,
          "layoutPattern": "multi-item-true-false",
          "instruction": "درستی یا نادرستی عبارت‌های زیر را مشخص کنید.",
          "parts": [
            {
              "label": "الف",
              "pageRef": 16,
              "type": "true-false",
              "score": 0.25,
              "content": {
                "type": "true-false",
                "statementText": "شعرهای سید اشرف‌الدین گیلانی در راه مبارزه با استبداد و عشق به وطن در روزنامهٔ «قرن بیستم» چاپ می‌شد."
              },
              "correctAnswer": {
                "value": false
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ب",
              "pageRef": 13,
              "type": "true-false",
              "score": 0.25,
              "content": {
                "type": "true-false",
                "statementText": "شاعران دورهٔ بازگشت از این جهت اهمّیت دارند که توانستند زبان شعر را از آن حالت سستی که در اواخر سبک هندی در شعر به وجود آمده بود، نجات بخشند."
              },
              "correctAnswer": {
                "value": true
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ج",
              "pageRef": 68,
              "type": "true-false",
              "score": 0.25,
              "content": {
                "type": "true-false",
                "statementText": "در ادبیّات دورهٔ معاصر، نوآوری‌ها، اندیشه‌های باستان‌گرا و گاهی گرایش به شعرهای ترجمه‌ای مورد توجّه بود."
              },
              "correctAnswer": {
                "value": true
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "د",
              "pageRef": 72,
              "type": "true-false",
              "score": 0.25,
              "content": {
                "type": "true-false",
                "statementText": "نثر فارسی دورهٔ معاصر، تحت تأثیر آثاری که در دورهٔ بیداری از زبان‌های اروپایی ترجمه می‌شد، از سادگی دور شد."
              },
              "correctAnswer": {
                "value": false
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        },
        {
          "number": 2,
          "pageRef": 77,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "کدام کتاب از آثار منثور «قیصر امین‌پور» است؟"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "optionKey": "الف",
                  "text": "آینه‌های ناگهان",
                  "isCorrect": false
                },
                {
                  "optionKey": "ب",
                  "text": "در کوچهٔ آفتاب",
                  "isCorrect": false
                },
                {
                  "optionKey": "ج",
                  "text": "طوفان در پرانتز",
                  "isCorrect": true
                },
                {
                  "optionKey": "د",
                  "text": "ظهر روز دهم",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 3,
          "pageRef": 70,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "عبارت زیر در مورد کدام دوره از شعر فارسی معاصر است؟",
                "stimulus": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«در این دوره که باید آن را دورهٔ کمال جریان‌های ادبی دانست، شاعران بهتر و هنری‌تر از گذشته به جوهر شعر دست یافتند و مضمون شعر آنها بیشتر نقد اجتماعی است.»"
                    }
                  ]
                }
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "optionKey": "الف",
                  "text": "اوّل",
                  "isCorrect": false
                },
                {
                  "optionKey": "ب",
                  "text": "دوم",
                  "isCorrect": false
                },
                {
                  "optionKey": "ج",
                  "text": "سوم",
                  "isCorrect": false
                },
                {
                  "optionKey": "د",
                  "text": "چهارم",
                  "isCorrect": true
                }
              ]
            }
          ]
        },
        {
          "number": 4,
          "layoutPattern": "list-of-parallel-blanks",
          "instruction": "جاهای خالی را با واژه‌های مناسب پر کنید.",
          "parts": [
            {
              "label": "الف",
              "pageRef": 74,
              "type": "fill-blank-term",
              "score": 0.25,
              "content": {
                "type": "fill-blank-term",
                "passage": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«سیمین دانشور» با کتاب «"
                    },
                    {
                      "kind": "blank",
                      "blankId": "q4a"
                    },
                    {
                      "kind": "text",
                      "value": "» به اوج نویسندگی خود رسید."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "سووشون"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ب",
              "pageRef": 73,
              "type": "fill-blank-term",
              "score": 0.25,
              "content": {
                "type": "fill-blank-term",
                "passage": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "اوّلین "
                    },
                    {
                      "kind": "blank",
                      "blankId": "q4b"
                    },
                    {
                      "kind": "text",
                      "value": " با عنوان «جعفر خان از فرنگ برگشته» به قلم «حسن مقدم» در سال ۱۳۰۱ نوشته شد."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "نمایشنامه",
                  "نمایش‌نامه"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        }
      ]
    },
    {
      "title": "سبک‌شناسی",
      "orderIndex": 2,
      "sectionScore": 2,
      "questions": [
        {
          "number": 5,
          "layoutPattern": "bracket-choice-mcq",
          "instruction": "پاسخ مناسب را از داخل کمانک انتخاب کنید.",
          "parts": [
            {
              "label": "الف",
              "pageRef": 44,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "«ابوالقاسم لاهوتی» و «فرّخی یزدی» از شاخص‌ترین شاعران حوزهٔ (توجّه به مردم – دانش‌ها و فنون نوین) هستند."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "توجّه به مردم",
                  "isCorrect": true
                },
                {
                  "text": "دانش‌ها و فنون نوین",
                  "isCorrect": false
                }
              ]
            },
            {
              "label": "ب",
              "pageRef": 46,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "سبک نویسندگی اکثر نویسندگان دورهٔ بازگشت و بیداری مطابقت کاملی با ادبیّات داستانی (کهن – جدید) نداشت."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "کهن",
                  "isCorrect": false
                },
                {
                  "text": "جدید",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "ج",
              "pageRef": 97,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "ابهام در شعر معاصر پسندیده است و (معنی‌آفرینی – معنی‌گریزی) از ویژگی‌های شعر این دوره است."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "معنی‌آفرینی",
                  "isCorrect": false
                },
                {
                  "text": "معنی‌گریزی",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "د",
              "pageRef": 99,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "گرایش به (خیال‌بندی – واقع‌گرایی) شعر برخی شاعران دورهٔ انقلاب اسلامی را گاه به شعر بیدل و صائب نزدیک کرده است."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "خیال‌بندی",
                  "isCorrect": true
                },
                {
                  "text": "واقع‌گرایی",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 6,
          "layoutPattern": "multi-subquestion",
          "instruction": "هر یک از جملات زیر، مربوط به کدام‌یک از ویژگی‌های «ادبی» یا «فکری» است؟",
          "parts": [
            {
              "label": "الف",
              "pageRef": 98,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "مکتب‌های فلسفی و ادبی قرن نوزدهم و بیستم اروپا مانند رمانتیسم در ادبیات داستانی دورهٔ معاصر حضوری آشکار و تأثیرگذار دارند."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "ادبی",
                  "isCorrect": false
                },
                {
                  "text": "فکری",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "ب",
              "pageRef": 101,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "در نثر دورهٔ انقلاب اسلامی، به‌تدریج به‌ویژه بعد از جنگ، گرایش به سبک‌های جدید داستان‌نویسی مانند جریان سیّال ذهن بیشتر می‌شود."
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "ادبی",
                  "isCorrect": true
                },
                {
                  "text": "فکری",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 7,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.5,
              "content": {
                "type": "mcq-inline",
                "questionText": "بیت زیر، سرودهٔ «سلمان هراتی»، شاعر دورهٔ انقلاب اسلامی است؛ کدام ویژگی «زبانی» در آن دیده می‌شود؟",
                "stimulus": {
                  "lines": [
                    [
                      {
                        "kind": "text",
                        "value": "گم بود در عمیق زمین شانهٔ بهار"
                      }
                    ],
                    [
                      {
                        "kind": "text",
                        "value": "بی تو ولی زمینهٔ پیدا شدن نداشت"
                      }
                    ]
                  ]
                }
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح برای این پاسخ به صفحات ۹۹ و ۱۰۳ کتاب ارجاع داده است.",
              "options": [
                {
                  "optionKey": "الف",
                  "text": "آشنایی‌زدایی و روی آوردن به کاربرد ترکیب‌های بدیع و بی‌سابقه",
                  "isCorrect": true
                },
                {
                  "optionKey": "ب",
                  "text": "عبارت‌های وصفی دور و دراز و لفظ‌پردازی‌های بی‌جا",
                  "isCorrect": false
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "title": "موسیقی شعر",
      "orderIndex": 3,
      "sectionScore": 6,
      "questions": [
        {
          "number": 8,
          "instruction": "در کدام‌یک از مصراع‌های زیر، کلمهٔ «سو» کوتاه تلفّظ نمی‌شود؟",
          "parts": [
            {
              "type": "mcq-select-line-in-poem",
              "score": 0.25,
              "content": {
                "type": "mcq-select-line-in-poem",
                "lines": [
                  "روزه یک سو شد و عید آمد و دل‌ها برخاست",
                  "آمد سوی کعبه سینه پرجوش"
                ]
              },
              "correctAnswer": {
                "correctLineIndex": 0
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: گزینهٔ الف؛ صفحات ۵۳ و ۵۶."
            }
          ]
        },
        {
          "number": 9,
          "pageRef": 54,
          "parts": [
            {
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "در کدام‌یک از واژگان بیت زیر، مصوّت بلند «ی» همواره کوتاه است؟",
                "stimulus": {
                  "lines": [
                    [
                      {
                        "kind": "text",
                        "value": "هرگز وجود حاضر غایب شنیده‌ای؟"
                      }
                    ],
                    [
                      {
                        "kind": "text",
                        "value": "من در میان جمع و دلم جای دیگر است"
                      }
                    ]
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "میان"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        },
        {
          "number": 10,
          "pageRef": 87,
          "layoutPattern": "multi-subquestion",
          "instruction": "برای هر یک از ابیات زیر، یکی از وزن‌های داخل کمانک را انتخاب کنید: «همسان دولختی – ناهمسان».",
          "parts": [
            {
              "label": "الف",
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "تو با خدای خود انداز کار و دل خوش دار / که رحم اگر نکند مدّعی خدا بکند"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "همسان دولختی",
                  "isCorrect": false
                },
                {
                  "text": "ناهمسان",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "ب",
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "من به زبان اشک خود می‌دهمت سلام و تو / بر سر آتش دلم همچو زبانه می‌روی"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "همسان دولختی",
                  "isCorrect": true
                },
                {
                  "text": "ناهمسان",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 11,
          "instruction": "وزن کدام‌یک از ابیات زیر متفاوت است؟",
          "parts": [
            {
              "type": "mcq-select-line-in-poem",
              "score": 0.5,
              "content": {
                "type": "mcq-select-line-in-poem",
                "lines": [
                  "جانا نظری که ناتوانم / بخشا که به لب رسید جانم",
                  "گشته‌ام در جهان و آخر کار / دلبری برگزیده‌ام که مپرس",
                  "ای سرو بلند قامت دوست / وه وه که شمایلت چه نیکوست"
                ]
              },
              "correctAnswer": {
                "correctLineIndex": 1
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: گزینهٔ ب؛ صفحات ۲۷ و ۲۸."
            }
          ]
        },
        {
          "number": 12,
          "pageRef": 25,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.5,
              "content": {
                "type": "mcq-inline",
                "questionText": "بیت »دی شیخ با چراغ همی گشت گرد شهر / کز دیو و دد ملولم و انسانم آرزوست« بر وزن »مستفعلن مفاعل مستفعلن فعل« است؛ برش آوایی دوم این بیت کدام‌یک از موارد زیر است؟"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "optionKey": "الف",
                  "text": "فاعلاتن مفاعلن فعلن",
                  "isCorrect": false
                },
                {
                  "optionKey": "ب",
                  "text": "مفاعلن فعلاتن مفاعلن فعلن",
                  "isCorrect": false
                },
                {
                  "optionKey": "ج",
                  "text": "مفعولُ مفاعلن مفاعیلن",
                  "isCorrect": false
                },
                {
                  "optionKey": "د",
                  "text": "مفعولُ فاعلاتُ مفاعیلُ فاعلن",
                  "isCorrect": true
                }
              ]
            }
          ]
        },
        {
          "number": 13,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.5,
              "content": {
                "type": "mcq-inline",
                "questionText": "در بیت »همت طلب از باطن پیران سحرخیز / زیرا که یکی را ز دو عالم طلبیدند« کدام اختیار شاعری به کار نرفته است؟"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: گزینهٔ الف؛ صفحات ۲۸، ۵۰ و ۸۵.",
              "options": [
                {
                  "optionKey": "الف",
                  "text": "تغییر کمّیّت مصوّت",
                  "isCorrect": true
                },
                {
                  "optionKey": "ب",
                  "text": "حذف همزه",
                  "isCorrect": false
                },
                {
                  "optionKey": "ج",
                  "text": "بلند بودن هجای پایان مصراع",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 14,
          "parts": [
            {
              "type": "short-text-answer",
              "score": 0.75,
              "content": {
                "type": "short-text-answer",
                "questionText": "نام کامل بحر بیت زیر را بنویسید.",
                "stimulus": {
                  "lines": [
                    [
                      {
                        "kind": "text",
                        "value": "ای مست شبرو کیستی؟ آیا مه من نیستی؟"
                      }
                    ],
                    [
                      {
                        "kind": "text",
                        "value": "گر نیستی، پس چیستی؟ ای همدم تنهای دل"
                      }
                    ]
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "رجز مثمّن سالم",
                  "رجز مثمن سالم"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: رجز ۰٫۲۵ + مثمّن ۰٫۲۵ + سالم ۰٫۲۵؛ صفحات ۱۰۸ و ۱۲۰."
            }
          ]
        },
        {
          "number": 15,
          "parts": [
            {
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "«وزن‌واژه» شعر زیر را بنویسید.",
                "stimulus": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«بیا ره‌توشه برداریم / قدم در راه بی‌برگشت بگذاریم / ببینیم آسمانِ «هرکجا» آیا همین رنگ است؟»"
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "مفاعیلن"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: «مفاعیلن»؛ صفحات ۸۱ و ۸۲."
            }
          ]
        },
        {
          "number": 16,
          "layoutPattern": "multi-subquestion",
          "instruction": "با توجّه به بیت «یار با ماست چه حاجت که زیادت طلبیم / دولت صحبت آن مونس جان ما را بس» به پرسش‌ها پاسخ دهید.",
          "parts": [
            {
              "label": "الف",
              "type": "short-text-answer",
              "score": 0.75,
              "content": {
                "type": "short-text-answer",
                "questionText": "بیت را تقطیع هجایی کنید."
              },
              "correctAnswer": {
                "accepted": [
                  "پاسخ مطابق جدول تقطیع هجایی راهنمای رسمی تصحیح"
                ]
              },
              "gradingMode": "manual",
              "verified": true,
              "sourceNote": "راهنمای رسمی پاسخ این قسمت را به‌صورت جدول تقطیع هجایی برای هر دو مصراع آورده و تصریح کرده است که در تعلّق بارم، نظر مصحّح صائب است؛ برای جلوگیری از تبدیل خطاپذیر جدول به رشتهٔ متنی، این قسمت manual است."
            },
            {
              "label": "ب",
              "type": "short-text-answer",
              "score": 0.75,
              "content": {
                "type": "short-text-answer",
                "questionText": "نشانه‌های هجایی آن را بگذارید."
              },
              "correctAnswer": {
                "accepted": [
                  "پاسخ مطابق جدول نشانه‌های هجایی راهنمای رسمی تصحیح"
                ]
              },
              "gradingMode": "manual",
              "verified": true,
              "sourceNote": "راهنمای رسمی نشانه‌های هجایی را در همان جدول پاسخ سؤال ۱۶ آورده و نظر مصحّح را ملاک دانسته است؛ این قسمت برای حفظ دقّت manual نگه داشته شده است."
            },
            {
              "label": "ج",
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "وزن بیت چیست؟"
              },
              "correctAnswer": {
                "accepted": [
                  "فعلاتن فعلاتن فعلاتن فعلن",
                  "فاعلاتن فعلاتن فعلاتن فعلن",
                  "فعلاتن فعلاتن فعلاتن فع‌لن",
                  "فاعلاتن فعلاتن فعلاتن فع‌لن"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: «فعلاتن (فاعلاتن) فعلاتن فعلاتن فعلن (فع‌لن)»."
            },
            {
              "label": "د",
              "pageRef": 87,
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "یک اختیار «وزنی» این بیت را بنویسید."
              },
              "correctAnswer": {
                "accepted": [
                  "هجای پایان مصراع بلند است",
                  "بلند بودن هجای پایان مصراع",
                  "ابدال",
                  "آوردن فاعلاتن به جای فعلاتن اول مصراع",
                  "آوردن فاعلاتن به جای فعلاتن اوّل مصراع"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        }
      ]
    },
    {
      "title": "زیبایی‌شناسی",
      "orderIndex": 4,
      "sectionScore": 6,
      "questions": [
        {
          "number": 17,
          "layoutPattern": "bracket-choice-mcq",
          "instruction": "برای هر یک از ابیات زیر، آرایهٔ مناسب را از داخل کمانک انتخاب کنید.",
          "parts": [
            {
              "label": "الف",
              "pageRef": 35,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "آتش آن نیست که از شعلهٔ آن خندد شمع / آتش آن است که بر خرمن پروانه زدند"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "ایهام",
                  "isCorrect": false
                },
                {
                  "text": "مراعات نظیر",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "ب",
              "pageRef": 39,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "بیداری زمان را با من بخوان به فریاد / ور مرد خواب و خفتی «رو سر بنه به بالین، تنها مرا رها کن»"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "تضمین",
                  "isCorrect": true
                },
                {
                  "text": "حس‌آمیزی",
                  "isCorrect": false
                }
              ]
            },
            {
              "label": "ج",
              "pageRef": 32,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "مجنون که به دیوانه‌گری شهرهٔ شهر است / در دشت جنون همسفر عاقل ما بود"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "حسن تعلیل",
                  "isCorrect": false
                },
                {
                  "text": "تلمیح",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "د",
              "pageRef": 63,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "فلک در خاک می‌غلتید از شرم سرافرازی / اگر می‌دید معراج ز پا افتادن ما را"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "متناقض‌نما (پارادوکس)",
                  "isCorrect": true
                },
                {
                  "text": "لف و نشر",
                  "isCorrect": false
                }
              ]
            },
            {
              "label": "هـ",
              "pageRef": 92,
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "گر برگ گل سرخ کنی پیرهنش را / از نازکی آزار رساند بدنش را"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "اغراق",
                  "isCorrect": true
                },
                {
                  "text": "تضاد",
                  "isCorrect": false
                }
              ]
            }
          ]
        },
        {
          "number": 18,
          "layoutPattern": "multi-subquestion",
          "instruction": "با توجّه به ابیات زیر به پرسش‌ها پاسخ دهید: ۱) «جان ریخته شد با تو، آمیخته شد با تو / چون بوی تو دارد جان، جان را هله بنوازم» ۲) «پرستش به مستی است در کیش مهر / برون‌اند زین جرگه هشیارها»",
          "parts": [
            {
              "label": "الف",
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "در کدام‌یک از ابیات، آرایهٔ «ایهام تناسب» وجود دارد؟"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "optionKey": "۱",
                  "text": "بیت ۱",
                  "isCorrect": false
                },
                {
                  "optionKey": "۲",
                  "text": "بیت ۲",
                  "isCorrect": true
                }
              ]
            },
            {
              "label": "ب",
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "کدام واژه این آرایه را پدید آورده است؟"
              },
              "correctAnswer": {
                "accepted": [
                  "مهر"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ج",
              "type": "two-answer-text",
              "score": 0.5,
              "content": {
                "type": "two-answer-text",
                "questionText": "معانی مختلف این واژه را بنویسید.",
                "fields": [
                  {
                    "id": "m1",
                    "label": "معنی ۱"
                  },
                  {
                    "id": "m2",
                    "label": "معنی ۲"
                  }
                ]
              },
              "correctAnswer": {
                "m1": [
                  "محبّت",
                  "محبت",
                  "خورشید"
                ],
                "m2": [
                  "محبّت",
                  "محبت",
                  "خورشید"
                ]
              },
              "gradingMode": "ai_partial_credit",
              "aiGradingHint": "دو معنی متفاوتِ رسمی لازم است: «محبّت» و «خورشید». اگر هر دو معنا، با هر ترتیب، آمده باشد نمرهٔ کامل بده.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح برای سؤال ۱۸: بیت ۲، واژهٔ «مهر»، با دو معنی «محبّت» و «خورشید»؛ صفحات ۹۰، ۹۱ و ۹۴."
            }
          ]
        },
        {
          "number": 19,
          "pageRef": 62,
          "layoutPattern": "multi-subquestion",
          "instruction": "در هر یک از ابیات زیر، چه نوع لف و نشری به کار رفته است؟",
          "parts": [
            {
              "label": "الف",
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "دل و کشورت جمع و معمور باد! / ز مملکت پراکندگی دور باد!"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "مرتّب",
                  "isCorrect": true
                },
                {
                  "text": "نامرتّب یا مشوّش",
                  "isCorrect": false
                }
              ]
            },
            {
              "label": "ب",
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "اگر ز خلق ملامت و گر ز کرده ندامت / کشیدم، از تو کشیدم، شنیدم، از تو شنیدم"
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "مرتّب",
                  "isCorrect": false
                },
                {
                  "text": "نامرتّب یا مشوّش",
                  "isCorrect": true
                }
              ]
            }
          ]
        },
        {
          "number": 20,
          "layoutPattern": "multi-subquestion",
          "instruction": "با توجّه به دو مورد زیر پاسخ دهید: ۱) «خط شکسته را محکم‌تر و بامزه‌تر از دیگران می‌نوشت.» ۲) «افسوس موها، نگاه‌ها به عبث / عطر لغات شاعر را تاریک می‌کنند.»",
          "parts": [
            {
              "label": "الف",
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "کدام آرایهٔ مشترک (به جز مراعات نظیر) در موارد بالا، «موسیقی معنوی» ایجاد کرده است؟"
              },
              "correctAnswer": {
                "accepted": [
                  "حس‌آمیزی",
                  "حس آمیزی"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ب",
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "چگونه به وجود این آرایه پی برده‌اید؟"
              },
              "correctAnswer": {
                "accepted": [
                  "در هر دو متن، آمیختگی چند حس بر تأثیر و زیبایی کلام افزوده است",
                  "آمیختگی چند حس در هر دو متن",
                  "آمیختگی حواس در هر دو متن"
                ]
              },
              "gradingMode": "ai_semantic",
              "aiGradingHint": "پاسخ رسمی: در هر دو متن، آمیختگی چند حس بر تأثیر و زیبایی کلام افزوده است. پاسخ‌های درست و مشابه پذیرفته شوند.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح به صفحات ۱۱۳، ۱۱۴ و ۱۱۷ ارجاع داده است."
            }
          ]
        },
        {
          "number": 21,
          "pageRef": 117,
          "instruction": "در کدام‌یک از ابیات زیر آرایهٔ «حسن تعلیل» یافت نمی‌شود؟",
          "parts": [
            {
              "type": "mcq-select-line-in-poem",
              "score": 0.25,
              "content": {
                "type": "mcq-select-line-in-poem",
                "lines": [
                  "اشک سحر زداید از لوح دل سیاهی / خرّم کند چمن را باران صبحگاهی",
                  "عجب نیست بر خاک اگر گل شکفت / که چندین گل‌اندام در خاک خفت"
                ]
              },
              "correctAnswer": {
                "correctLineIndex": 0
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        },
        {
          "number": 22,
          "layoutPattern": "multi-subquestion",
          "instruction": "با ذکر دو دلیل ثابت کنید آرایهٔ «اسلوب معادله» در بیت زیر وجود دارد.",
          "parts": [
            {
              "type": "two-answer-text",
              "score": 1,
              "content": {
                "type": "two-answer-text",
                "questionText": "بی‌کمالی‌های انسان از سخن پیدا شود / پستهٔ بی‌مغز چون لب وا کند، رسوا شود",
                "fields": [
                  {
                    "id": "r1",
                    "label": "دلیل ۱"
                  },
                  {
                    "id": "r2",
                    "label": "دلیل ۲"
                  }
                ]
              },
              "correctAnswer": {
                "r1": [
                  "هر یک از دو مصراع استقلال نحوی و معنایی دارند",
                  "یک مصراع در حکم مصداق و تأییدی برای مصراع دیگر است",
                  "زیبایی‌آفرینی بر پایهٔ شباهت است",
                  "رابطهٔ دو مصراع بر پایهٔ شباهت است"
                ],
                "r2": [
                  "هر یک از دو مصراع استقلال نحوی و معنایی دارند",
                  "یک مصراع در حکم مصداق و تأییدی برای مصراع دیگر است",
                  "زیبایی‌آفرینی بر پایهٔ شباهت است",
                  "رابطهٔ دو مصراع بر پایهٔ شباهت است"
                ]
              },
              "gradingMode": "ai_partial_credit",
              "aiGradingHint": "دو دلیل متفاوت لازم است. راهنمای رسمی این دلایل را می‌پذیرد: استقلال نحوی و معنایی دو مصراع؛ مصداق/تأیید بودن یک مصراع برای دیگری؛ و رابطه یا زیبایی‌آفرینی بر پایهٔ شباهت.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: ذکر دو دلیل کافی است؛ صفحات ۱۱۴ تا ۱۱۶."
            }
          ]
        },
        {
          "number": 23,
          "instruction": "در هر یک از بیت‌های گروه «الف» کدام آرایهٔ ادبی گروه «ب» به کار رفته است؟ [در ستون «ب» یک مورد اضافی است]",
          "parts": [
            {
              "type": "matching-pairs-with-distractor",
              "score": 1,
              "content": {
                "type": "matching-pairs-with-distractor",
                "columnA": [
                  {
                    "id": "۱",
                    "text": "همه غیبی تو بدانی، همه عیبی تو بپوشی / همه بیشی تو بکاهی، همه کمی تو فزایی"
                  },
                  {
                    "id": "۲",
                    "text": "از آن مرد دانا دهان دوخته است / که بیند که شمع از زبان سوخته است"
                  },
                  {
                    "id": "۳",
                    "text": "می‌شناسمت / چشم‌های تو میزبانِ آفتابِ صبحِ سبزِ باغ‌هاست / می‌شناسمت"
                  },
                  {
                    "id": "۴",
                    "text": "عهد کردی که کشی فرصت خود را روزی / فرصت ار یافتی، آن عهد فراموش مکن"
                  }
                ],
                "columnB": [
                  {
                    "id": "الف",
                    "text": "اغراق"
                  },
                  {
                    "id": "ب",
                    "text": "تضاد"
                  },
                  {
                    "id": "ج",
                    "text": "ایهام"
                  },
                  {
                    "id": "د",
                    "text": "اسلوب معادله"
                  },
                  {
                    "id": "هـ",
                    "text": "حسن تعلیل"
                  }
                ]
              },
              "correctAnswer": {
                "۱": "ب",
                "۲": "هـ",
                "۳": "الف",
                "۴": "ج"
              },
              "gradingMode": "exact_match",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: ۱) تضاد، ۲) حسن تعلیل، ۳) اغراق، ۴) ایهام؛ «اسلوب معادله» مورد اضافی است."
            }
          ]
        }
      ]
    },
    {
      "title": "نقد و تحلیل نظم و نثر",
      "orderIndex": 5,
      "sectionScore": 4,
      "questions": [
        {
          "number": 24,
          "pageRef": 103,
          "parts": [
            {
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "مفهوم کنایی قسمت مشخّص‌شده را بنویسید.",
                "stimulus": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "این تنگ‌عیشی برای او (مولوی) نوعی ریاضت نفسانی بود؛ ناشی از "
                    },
                    {
                      "kind": "highlight",
                      "value": "خشک‌دستی"
                    },
                    {
                      "kind": "text",
                      "value": " نبود. از زندگی فقط به قدر ضرورت تمتّع می‌برد. بیش از قدر ضرورت را موجب دورافتادن از خطّ سیر روحانی خویش می‌یافت."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "خسیس بودن",
                  "خسّت",
                  "خست",
                  "بخل"
                ]
              },
              "gradingMode": "ai_semantic",
              "aiGradingHint": "پاسخ رسمی: خسیس بودن، خسّت یا بخل.",
              "verified": true
            }
          ]
        },
        {
          "number": 25,
          "layoutPattern": "multi-subquestion",
          "instruction": "متن زیر از داستان «کباب غاز» اثر «جمالزاده» است. دو مورد از ویژگی‌های «سبک نویسندگی» او را ذکر کنید.",
          "parts": [
            {
              "type": "two-answer-text",
              "score": 0.5,
              "content": {
                "type": "two-answer-text",
                "questionText": "«اگر چشمم تو چشمش می‌افتاد، با همان زبان بی‌زبانی نگاه، حقّش را کف دستش می‌گذاشتم. ولی شستش خبردار شده بود و چشمش مثل مرغ سربریده مدام روی میز از این بشقاب به آن بشقاب می‌دوید و به کاینات اعتنا نداشت.»",
                "fields": [
                  {
                    "id": "f1",
                    "label": "ویژگی ۱"
                  },
                  {
                    "id": "f2",
                    "label": "ویژگی ۲"
                  }
                ]
              },
              "correctAnswer": {
                "f1": [
                  "نثر ساده است",
                  "بسیاری از واژه‌ها، کنایات و اصطلاحات عامیانه در آن به کار رفته است",
                  "نثر داستانی تحت تأثیر زبان گفتار و محاوره است",
                  "کوتاهی جملات و کاربرد افعال فراوان در متن دیده می‌شود",
                  "در این متن گونه‌های نثر فنّی و مصنوع جایگاهی ندارند"
                ],
                "f2": [
                  "نثر ساده است",
                  "بسیاری از واژه‌ها، کنایات و اصطلاحات عامیانه در آن به کار رفته است",
                  "نثر داستانی تحت تأثیر زبان گفتار و محاوره است",
                  "کوتاهی جملات و کاربرد افعال فراوان در متن دیده می‌شود",
                  "در این متن گونه‌های نثر فنّی و مصنوع جایگاهی ندارند"
                ]
              },
              "gradingMode": "ai_partial_credit",
              "aiGradingHint": "دو ویژگی متفاوت لازم است. فقط بر پایهٔ راهنمای رسمی نمره بده: نثر ساده؛ کاربرد فراوان واژه‌ها، کنایات و اصطلاحات عامیانه؛ تأثیر زبان گفتار و محاوره؛ کوتاهی جملات و کاربرد افعال فراوان؛ یا نبود گونه‌های نثر فنّی و مصنوع.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح: ذکر دو مورد کافی است؛ صفحات ۷۴ و ۹۸."
            }
          ]
        },
        {
          "number": 26,
          "pageRef": 101,
          "parts": [
            {
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "نوشتهٔ زیر قسمتی از داستان «آن شب عزیز» اثر «سید مهدی شجاعی» است. با توجّه به متن، یکی از مضامین (قلمرو فکری) نثر ادبیّات انقلاب اسلامی را بیان نمایید.",
                "stimulus": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«شما شهادتین گفتید و یک بار دیگر امام زمان را صدا زدید و خاموش شدید. افتخارم این است که خودم با پای لنگ شما را به خط رساندم. و حالا دل‌خوشی‌ام به این است که هر روز صبح با این یک پا و دو عصا به اینجا بیایم. سنگتان را بشویم و خاطراتم را با شما مرور بکنم. هر روز چیزهای بیشتری از آن شب عزیز یادم می‌آید. به همین زنده‌ام آقا!»"
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "بی‌توجّهی به مادیات",
                  "دعوت به اخلاقیات",
                  "استقبال از شهادت",
                  "فرهنگ ایثار",
                  "استکبارستیزی",
                  "دفاع از وطن",
                  "وفاداری به ارزش‌های دفاع مقدس"
                ]
              },
              "gradingMode": "ai_semantic",
              "aiGradingHint": "ذکر یک مورد از مفاهیم رسمی کافی است: بی‌توجّهی به مادیات، دعوت به اخلاقیات، استقبال از شهادت، فرهنگ ایثار، استکبارستیزی، دفاع از وطن یا وفاداری به ارزش‌های دفاع مقدس. پاسخ‌های درست و مشابه پذیرفته شوند.",
              "verified": true
            }
          ]
        },
        {
          "number": 27,
          "layoutPattern": "multi-subquestion",
          "instruction": "متن زیر از کتاب «تاریخ بیداری ایرانیان» است: «کارهای میرزا تقی خان از ترتیب و انتظام قشون و اصلاح کار دفتر و مالیه و عمارت و مرمّت خرابی‌های دیگر که به‌زودی محال می‌نمود و همه در یک دو سال صورت گرفت، گواه و دلیل بزرگی مرد است.»",
          "parts": [
            {
              "label": "الف",
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "این کتاب اثر کیست؟"
              },
              "correctAnswer": {
                "accepted": [
                  "ناظم‌الاسلام کرمانی",
                  "ناظم الاسلام کرمانی",
                  "ناظم‌الاسلام",
                  "ناظم الاسلام"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ب",
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "موضوع آن، تاریخ .......... است."
              },
              "correctAnswer": {
                "accepted": [
                  "مشروطه"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ج",
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "questionText": "کاربرد واژهٔ «قشون» بیانگر کدام ویژگی زبانی این نثر است؟"
              },
              "correctAnswer": {
                "accepted": [
                  "کاربرد واژه‌های ترکی در نثر فارسی",
                  "کاربرد واژه‌های ترکی",
                  "وجود واژه‌های ترکی در نثر فارسی"
                ]
              },
              "gradingMode": "ai_semantic",
              "aiGradingHint": "پاسخ رسمی: کاربرد واژه‌های ترکی در نثر فارسی.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح برای سؤال ۲۷ به صفحات ۲۰، ۴۵ و ۴۷ ارجاع داده است."
            }
          ]
        },
        {
          "number": 28,
          "layoutPattern": "multi-subquestion",
          "instruction": "با مقایسهٔ دو شعر زیر پاسخ دهید: ۱) «قایقی خواهم ساخت / خواهم انداخت به آب / دور خواهم شد از این خاک غریب / که در آن هیچ کسی نیست که در بیشهٔ عشق / قهرمانان را بیدار کند» ـ سهراب سپهری ۲) «پروانه و شمع و گل شبی آشفتند / در طرف چمن / وز جور و جفای دهر با هم گفتند / بسیار سخن / شد صبح، نه پروانه به جا بود و نه شمع / ناگاه صبا / بر گل بوزید و هر دو با هم رفتند / من ماندم و من» ـ ملک‌الشّعرا بهار",
          "parts": [
            {
              "label": "الف",
              "type": "short-text-answer",
              "score": 0.5,
              "content": {
                "type": "short-text-answer",
                "questionText": "یک ویژگی مشترک این دو شعر را بنویسید."
              },
              "correctAnswer": {
                "accepted": [
                  "مصراع‌ها کوتاه و بلند هستند",
                  "وزن‌واژه‌های یک مصراع با مصراع دیگر برابر نیست",
                  "نشانه‌های هجایی مصراع‌ها با هم متفاوت هستند",
                  "تعداد هجاها برابر نیست",
                  "مصراعی یک یا چند هجا یا پایه بیشتر از مصراع دیگر دارد",
                  "ناهمسان بودن وزن مصراع‌ها"
                ]
              },
              "gradingMode": "ai_semantic",
              "aiGradingHint": "یک ویژگی از موارد رسمی کافی است: کوتاه و بلند بودن مصراع‌ها؛ برابر نبودن وزن‌واژه‌ها؛ متفاوت بودن نشانه‌های هجایی؛ برابر نبودن تعداد هجاها؛ یا بیشتر بودن یک یا چند هجا/پایه در یک مصراع نسبت به مصراع دیگر.",
              "verified": true,
              "sourceNote": "راهنمای تصحیح برای بخش الف به صفحات ۱۰۵، ۱۰۶، ۱۱۱ و ۱۱۹ ارجاع داده است."
            },
            {
              "label": "ب",
              "type": "short-text-answer",
              "score": 0.25,
              "content": {
                "type": "short-text-answer",
                "inputVariant": "word",
                "questionText": "قالب شعر «ملک‌الشّعرا بهار» چیست؟"
              },
              "correctAnswer": {
                "accepted": [
                  "مستزاد"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        },
        {
          "number": 29,
          "pageRef": 72,
          "layoutPattern": "list-of-parallel-blanks",
          "instruction": `شعر زیر سرودهٔ «مهدی اخوان ثالث» است: «سلامت را نمی‌خواهند پاسخ گفت / سرها در گریبان است / ${ul("کسی سر بر نیارد کرد پاسخ گفتن و دیدار یاران را")} / نگه جز پیش پا را دید نتواند / که ره تاریک و لغزان است / ${ul("و گر دست محبّت سوی کس یازی")} / به اکراه آورد دست از بغل بیرون / که سرما سخت سوزان است»`,
          "parts": [
            {
              "label": "الف",
              "type": "fill-blank-term",
              "score": 0.25,
              "content": {
                "type": "fill-blank-term",
                "passage": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "مصراع‌های مشخص‌شده، نمونه‌ای از کاربرد نحوی سبک "
                    },
                    {
                      "kind": "blank",
                      "blankId": "q29a"
                    },
                    {
                      "kind": "text",
                      "value": " است."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "خراسانی"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ب",
              "type": "fill-blank-term",
              "score": 0.25,
              "content": {
                "type": "fill-blank-term",
                "passage": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "شعر «اخوان ثالث» شعری "
                    },
                    {
                      "kind": "blank",
                      "blankId": "q29b"
                    },
                    {
                      "kind": "text",
                      "value": " است که حوادث زندگی مردم را در خود منعکس می‌کند."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "اجتماعی"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            },
            {
              "label": "ج",
              "type": "fill-blank-term",
              "score": 0.25,
              "content": {
                "type": "fill-blank-term",
                "passage": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«اخوان ثالث» در بیشتر مجموعه‌ها مثل «زمستان» زبانی "
                    },
                    {
                      "kind": "blank",
                      "blankId": "q29c"
                    },
                    {
                      "kind": "text",
                      "value": " دارد."
                    }
                  ]
                }
              },
              "correctAnswer": {
                "accepted": [
                  "نمادین"
                ]
              },
              "gradingMode": "exact_match",
              "verified": true
            }
          ]
        },
        {
          "number": 30,
          "pageRef": 20,
          "parts": [
            {
              "type": "mcq-inline",
              "score": 0.25,
              "content": {
                "type": "mcq-inline",
                "questionText": "متن زیر از کتاب «منشآت» اثر «قائم مقام فراهانی» است؛ نوع نثر عبارات کوتاه آن، گاه (عامیانه – مسجّع) است.",
                "stimulus": {
                  "tokens": [
                    {
                      "kind": "text",
                      "value": "«مخدوم مهربان من، از آن زمان که رشتهٔ مراودت حضوری گسسته و شیشهٔ شکیبایی از سنگ تفرقه و دوری شکسته، طایر مکاتبات را پر بسته و کلبهٔ مراودات را در بسته.»"
                    }
                  ]
                }
              },
              "correctAnswer": {},
              "gradingMode": "exact_match",
              "verified": true,
              "options": [
                {
                  "text": "عامیانه",
                  "isCorrect": false
                },
                {
                  "text": "مسجّع",
                  "isCorrect": true
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
