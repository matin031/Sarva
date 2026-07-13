import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import HeroSectionVaznYab from "@/components/UI/HeroSectionVaznYab";

const submitPoemSearch = async (searchTerm: string) => {
  "use server";
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
function page() {
  return (
    <div dir="rtl" className="container">
      <HeroSectionVaznYab />

      <VaznYabSection submitPoemSearch={submitPoemSearch} />
    </div>
  );
}

export default page;
