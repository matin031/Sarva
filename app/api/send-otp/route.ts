import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { email } = await req.json();
  const supabase = await createSupabaseServer();

  if (!email) {
    return NextResponse.json({ error: "ایمیل الزامی است" }, { status: 400 });
  }

  // چک کردن کلید Resend
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is missing");
    return NextResponse.json(
      { error: "سرور ایمیل correctly تنظیم نشده" },
      { status: 500 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY); // ← داخل تابع

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // ذخیره در Supabase
  const { error: dbError } = await supabase.from("otp_codes").upsert({
    email,
    code: otp,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (dbError) {
    console.error("DB Error:", dbError);
    return NextResponse.json(
      { error: "خطا در ذخیره کد", detail: dbError.message },
      { status: 500 },
    );
  }

  // ارسال ایمیل
  const { error: emailError } = await resend.emails.send({
    from: "noreply@aruzino.ir",
    to: email,
    subject: "کد تأیید سروا",
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;direction:rtl;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;text-align:center;">
          <p style="font-size:22px;font-weight:700;color:#fff;margin:0;">سروا</p>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="font-size:18px;color:#e2e8f0;margin-bottom:8px;">کد تأیید ورود</h2>
          <p style="font-size:14px;color:#94a3b8;margin-bottom:24px;">کد زیر را برای ورود به حساب خود وارد کنید:</p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#a78bfa;font-family:monospace;">${otp}</span>
          </div>
          <p style="font-size:12px;color:#475569;text-align:center;">⏱ اعتبار: ۱۰ دقیقه</p>
        </div>
      </div>
    `,
    text: `کد تأیید سروا: ${otp}`,
  });

  if (emailError) {
    console.error("Email Error:", emailError);
    return NextResponse.json(
      { error: "خطا در ارسال ایمیل", detail: emailError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
