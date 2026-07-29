import PanelNavigation from "@/components/UI/panel/PanelNavigation";
import Link from "next/link";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      dir="rtl"
      className=" container relative z-20 mt-12 mb-80 flex flex-col items-center justify-center"
    >
      <PanelNavigation />
      {/* two thirds on a desktop, the full column on a phone — at 390px a 2/3
          column leaves the picture cards and the option chips unreadable */}
      <section className=" w-full md:w-2/3 mx-auto mt-12">{children}</section>
    </main>
  );
}
// return (
// <main className=" grid grid-cols-12 container gap-x-6 relative z-20 mt-12">
//   <section className=" col-span-9  h-200"></section>
//   <aside className=" col-span-3 glass rounded-xl h-140"></aside>
// </main>

// );
// }
