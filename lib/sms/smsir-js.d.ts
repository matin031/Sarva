/**
 * تایپ‌هایِ بستهٔ رسمیِ SMS.ir (`smsir-js`).
 *
 * ⚠️ خودِ بسته جاوااسکریپتِ خالص است و هیچ `.d.ts` ندارد؛ بدونِ این فایل،
 * `import` کردنش در پروژه‌ای با `strict` یعنی خطایِ TS7016 و در عمل `any`.
 *
 * فقط متدهایی که سروا استفاده می‌کند اینجا آمده‌اند. امضاها از خودِ
 * `node_modules/smsir-js/index.js` برداشته شده‌اند (نسخهٔ ۱.۳.۳) و نه از
 * README — README پارامترِ `line_number` را در بعضی متدها جا انداخته.
 *
 * ⚠️ خروجیِ همهٔ متدها پاسخِ خامِ axios است و نه بدنهٔ JSON: یعنی
 * `res.status` کدِ HTTP است و وضعیتِ *منطقیِ* سرویس در `res.data.status`
 * می‌نشیند. یکی گرفتنِ این دو یعنی «۲۰۰ گرفتم پس پیامک رفت» — که غلط است.
 */
declare module "smsir-js" {
  export type SmsIrParameter = { name: string; value: string };

  export class Smsir {
    /**
     * ⚠️ کلید و شمارهٔ خط در ماژول ذخیره می‌شوند و نه روی نمونه: ساختنِ نمونهٔ
     * دوم، کلیدِ نمونهٔ اول را هم عوض می‌کند. سروا فقط یک حساب دارد، ولی این
     * یعنی نگه‌داشتنِ دو آداپتر با دو کلید در یک پروسه ممکن نیست.
     */
    constructor(apikey: string, linenumber?: number | null);

    SendVerifyCode(
      Mobile: string,
      TemplateId: number,
      Parameters: SmsIrParameter[],
    ): Promise<{ status: number; data: unknown }>;

    SendBulk(
      MessageText: string,
      Mobiles: string[],
      SendDateTime?: number | null,
      line_number?: number | null,
    ): Promise<{ status: number; data: unknown }>;

    getCredit(): Promise<{ status: number; data: unknown }>;
  }

  /**
   * ⚠️ بسته CommonJS است (`module.exports = { Smsir }`). Node و باندلرها
   * معمولاً `Smsir` را به‌صورت namedExport هم بیرون می‌دهند، ولی همیشه نه —
   * بعضی حالت‌ها فقط `default` را می‌دهند. این اعلان اجازه می‌دهد کد هر دو را
   * بدونِ `any` بررسی کند.
   */
  const smsir: { Smsir: typeof Smsir };
  export default smsir;
}
