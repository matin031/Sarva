import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import HeroSectionVaznYab from "@/components/UI/HeroSectionVaznYab";
import { findMeterLocally } from "@/lib/aruz";


// ⚠️ نسخهٔ قدیمی: جست‌وجوی عینِ متن در گنجور. فقط برای شعرهایی که از قبل
// توی گنجور برچسب-خورده‌اند کار می‌کند (شعرِ تازه/دست‌نویس را پیدا نمی‌کند).
// نگه داشته شده برای برگشتِ احتمالی — الان استفاده نمی‌شود.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const submitPoemSearchGanjoor = async (mesra1: string, mesra2?: string) => {
  "use server";
  const searchTerm = mesra2 ? `${mesra1} ${mesra2}` : mesra1;
  const normalize = (str: string) =>
    str
      .replace(/[\u200c\u200f\u200e]/g, " ")
      .replace(/[،؛؟!»«”“"'`.,:;?!()\[\]{}\-_–—…]/g, " ")
      .replace(/\s+/g, "")
      .trim();

  try {
    const searchRes = await fetch(
      `https://api.ganjoor.net/api/ganjoor/poems/search?term=${searchTerm}`,
    );

    if (!searchRes.ok) throw new Error();

    const data = await searchRes.json();
    console.log("رسیدم اینجا، الان می‌خوام فیلتر کنم");
    const poemSearchId = data.filter((i: any) =>
      normalize(i.plainText).includes(normalize(searchTerm)),
    )[0].id;

    if (!poemSearchId) throw new Error();

    try {
      const poemRes = await fetch(
        `https://api.ganjoor.net/api/ganjoor/poem/${poemSearchId}`,
      );
      const poem = await poemRes.json();
      console.log("poemSearchId");
      console.log(poem);
      return poem.sections?.[0]?.ganjoorMetre?.rhythm;
    } catch {}
  } catch {
    console.log(";;");
  }
};
// موتورِ محلیِ عروض (arpy): مصراع‌ها را مستقیماً تقطیع و وزن‌یابی می‌کند —
// نیازی به اینترنت/گنجور ندارد و برای شعرِ تازه هم کار می‌کند.
const submitPoemSearch = async (mesra1: string, mesra2?: string) => {
  "use server";
  const guess = findMeterLocally(mesra1, mesra2);
  return guess?.rhythm;
};

function page() {
  return (
    <div dir="rtl" className="container">
      <HeroSectionVaznYab />

      <VaznYabSection submitPoemSearch={submitPoemSearch} />
    </div>
  );
}

export default page;
