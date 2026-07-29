"use client";
import SimpleBarChart from "@/components/PanelChart";
import { toFa } from "@/components/UI/CircularProgress";
import StatRing from "@/components/UI/panel/StatRing";

function page() {
  return (
    <div className="cursor-default">
      <span
        className="mb-5 inline-flex items-center gap-2
       rounded-full border border-primary/30 bg-primary/10
        px-4 py-1 text-sm font-semibold text-primary"
      >
        پنل کاربری
      </span>
      <div className="glass rounded-xl p-4 sm:p-6">
        <h1 className=" flex items-center gap-x-1 text-2xl sm:text-4xl lg:text-5xl group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className=" size-8 shrink-0 sm:size-10 lg:size-12 group-hover:rotate-45 transition-all"
          >
            <path
              fillRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
              clipRule="evenodd"
            />
          </svg>
          درود، سعدی شیرازی
        </h1>
        <p>خوش اومدی :)</p>
        <div>
          <div className=" mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-7">
            <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
              <StatRing percent={70} />
              <span className=" text-base sm:text-lg">دقت در تمامی بخش‌ها</span>
            </div>
            <div className=" shadow bg-card rounded-xl p-4 flex items-center gap-x-4 sm:gap-x-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className=" size-9 shrink-0 sm:size-10"
              >
                <path
                  fillRule="evenodd"
                  d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
                  clipRule="evenodd"
                />
              </svg>

              <div className=" text-base sm:text-lg">
                <span className=" text-gold text-2xl sm:text-3xl">{toFa(12)}</span> روز با
                سروا
              </div>
            </div>
          </div>
          <div className="mt-12 flex items-center gap-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className=" size-9 shrink-0 sm:size-10"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
              />
            </svg>

            <h2 className=" text-2xl sm:text-3xl"> فعالیت در 6 هفتۀ اخیر</h2>
          </div>
          <div>
            <SimpleBarChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default page;
