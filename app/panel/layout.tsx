import PanelNavigation from "@/components/UI/panel/PanelNavigation";
import Link from "next/link";
import { ToastContainer } from "react-toastify";

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
      {/* ⚠️ ToastContainer قبلاً در layoutِ *ریشه* بود، یعنی روی هر صفحهٔ
          عمومی هم بار می‌شد — خانه، درسنامه، بازی‌ها، همه.

          در حالی که در کلِ پروژه فقط *یک* جا از toast استفاده می‌شود:
          دکمهٔ خروج در /panel/setting. پس هزینه‌اش را همه می‌دادند و
          فایده‌اش را یک صفحهٔ پشتِ ورود می‌برد.

          حالا اینجاست: هر صفحه‌ای که واقعاً ممکن است toast نشان دهد
          زیرِ همین layout است، و بقیهٔ سایت اصلاً بارش نمی‌کند. */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={true}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
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
