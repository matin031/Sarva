import Auth from "@/components/UI/Auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ورود / ثبت‌نام",
  robots: { index: false, follow: false },
};

function page() {
  return (
    <main className=" container ">
      <Auth />
    </main>
  );
}

export default page;
