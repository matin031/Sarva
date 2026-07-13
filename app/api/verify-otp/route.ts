import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json(
      { error: "ایمیل و کد الزامی است" },
      { status: 400 },
    );
  }

  // چک کردن کد
  const { data, error } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .eq("code", code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "کد اشتباه است" }, { status: 400 });
  }

  // چک کردن انقضا
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "کد منقضی شده. دوباره تلاش کنید" },
      { status: 400 },
    );
  }

  // حذف کد بعد از استفاده
  await supabase.from("otp_codes").delete().eq("email", email);

  return NextResponse.json({ success: true });
}
