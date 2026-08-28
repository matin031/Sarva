# بستهٔ محتوایی «مدار دستور»

`questions-v1.json` یک آرایهٔ JSON است. هر عضو یک پرسش است:

```jsonc
{
  "sourceId": "gc-yazdahom-06-001",   // یکتا در کلِ فایل و کلِ جدول؛ کلیدِ ورودِ دوباره
  "grade": "yazdahom",                 // dahom | yazdahom | davazdahom
  "lesson": 6,                          // ۱ تا ۱۸
  "type": "sentence",                  // sentence | hemistich | verse
  "difficulty": 2,                      // ۱ تا ۳
  "isPublished": true,                  // نبودنش یعنی false — محتوای نیمه‌کاره منتشر نمی‌شود
  "sortIndex": 0,
  "explanation": "…",                  // اختیاری
  "attribution": "…",                  // اختیاری — مأخذِ بیت
  "roleDefinitions": [ { "key": "subject", "label": "نهاد" } ],
  "tokens": [
    { "id": "t1", "text": "باران", "separatorAfter": " ",
      "roleSlot": { "acceptedRoleKeys": ["subject"] } }
  ],
  "pieces": [ { "id": "p-subject-1", "roleKey": "subject" } ],
  "circuitOrder": ["t1"]               // اختیاری؛ ترتیبِ بررسی از راست به چپ
}
```

## قاعده‌های سختی که وارد‌کننده اعمال می‌کند

- `sourceId` باید در کلِ فایل یکتا باشد.
- `grade` باید یکی از سه کلیدِ بالا باشد و `lesson` بینِ ۱ تا ۱۸.
- متن **از قبل توکِنایز** است. `separatorAfter` دقیقاً همان چیزی است که بینِ
  دو واژه دیده می‌شود — فاصله، «، »، «.» یا رشتهٔ خالی. وارد‌کننده متن را
  نمی‌شکند و فاصله نمی‌سازد.
- هر پرسش باید از `validateGrammarCircuitQuestion` رد شود: شناسه‌های یکتا،
  ارجاع‌های معتبرِ نقش، ترتیبِ مدارِ درست، حل‌پذیری، و **بن‌بست‌ناپذیری**.
- اگر حتی یک پرسش نامعتبر باشد، **هیچ ردیفی نوشته نمی‌شود** (تراکنش).

## اجرا

```bash
DATABASE_URL=… npm run db:seed-grammar-circuit
DATABASE_URL=… node scripts/seed-grammar-circuit.mjs path/to/other.json
DATABASE_URL=… node scripts/seed-grammar-circuit.mjs --prune   # حذفِ ردیف‌هایی که دیگر در فایل نیستند
```

اجرای دوباره ردیف‌ها را **به‌روز** می‌کند، نه تکرار. حذف هیچ‌وقت پیش‌فرض نیست.

## ⚠️ دربارهٔ محتوای فعلی

فایلِ فعلی **نمونه** است و محتوای آموزشیِ تأییدشدهٔ سروا نیست. پیش از اینکه
دانش‌آموزی با آن تمرین کند باید با محتوای بازبینی‌شده جایگزین شود.
