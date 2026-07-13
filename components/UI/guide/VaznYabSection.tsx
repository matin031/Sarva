"use client";
import { PanelAudioPlayer } from "@/components/UI/PanelAudioPlayer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
function VaznYabSection({
  submitPoemSearch,
}: {
  submitPoemSearch: (searchTerm: string) => Promise<string | undefined>;
}) {
  const rhythmToAudioUrl = (rhythm: string) => {
    const clean = rhythm.trim().replace(/\s+/g, "-");
    return `/audio/${clean}.mp3`;
  };

  const [aruzFeet, setAruzFeet] = useState("");
  const [aruzBahr, setAruzBahr] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState<boolean>(false);
  const searchPoemSchema = z.object({
    poem1: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(10, "مصراع را به‌طور کامل وارد نمایید")
          .max(40, "تعداد حروف نمی‌تواند بیشتر از 40 باشد")
          .regex(/^[\u0600-\u06FF\s]+$/, "فقط حروف فارسی پذیرفته هستند"),
      ),
    poem2: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val ||
          (val.length >= 10 &&
            val.length <= 40 &&
            /^[\u0600-\u06FF\s]+$/.test(val)),
        {
          message: "مصراع را به‌طور کامل وارد نمایید",
        },
      ),
  });

  type SerachPoem = z.infer<typeof searchPoemSchema>;

  const searchPoemForm = useForm<SerachPoem>({
    resolver: zodResolver(searchPoemSchema),
    mode: "onChange",
    defaultValues: {
      poem1: "",
      poem2: "",
    },
  });
  const onsubmit = async (data: SerachPoem) => {
    setLoadingFetch(true);
    const fullBeyt = data.poem2 ? `${data.poem1} ${data.poem2}` : data.poem1;

    const result = await submitPoemSearch(fullBeyt);
    if (!result) setShowModal(true);
    setAruzFeet(getPureRhythm(result ?? ""));
    setAruzBahr(getRhythmDescription(result ?? ""));

    setLoadingFetch(false);
  };

  const getPureRhythm = (rhythm: string) => {
    return rhythm?.replace(/\s*\([^)]*\)\s*$/, "").trim();
  };
  const getRhythmDescription = (rhythm: string) => {
    const match = rhythm?.match(/\(([^)]*)\)\s*$/);
    return match ? match[1].trim() : "";
  };

  return (
    <>
      <form
        onSubmit={searchPoemForm.handleSubmit(onsubmit)}
        className=" mx-auto my-12 sm:my-16 md:max-w-4xl p-4 sm:p-8 relative z-50 rounded-3xl glass"
      >
        <label className=" text-xs sm:text-sm text-muted-foreground">
          بیت خود را بنویس — هر مصراع در یک خط
        </label>

        <div className=" relative mt-12 gap-3 sm:gap-x-6 sm:flex-row flex-col items-start flex sm:items-center">
          <span className=" w-18.75 text-center shrink-0 text-xs px-2 py-1 cursor-default  relative z-20 rounded-xl glass border-border! bg-secondary!">
            مصراع اول
          </span>
          <input
            disabled={loadingFetch}
            {...searchPoemForm.register("poem1")}
            placeholder="مثلا: شهر یاران بود و خاک مهربانان این دیار"
            className=" text-sm sm:text-base placeholder:text-muted-foreground/30 text-right w-full relative z-20 glass py-2 px-4 border-border! border-2! rounded-3xl bg-secondary! outline-none focus:border-primary!"
            type="text"
          />
          {searchPoemForm.formState.errors.poem1 && (
            <span className="-bottom-7 left-5 text-red-500  text-xs sm:text-sm absolute z-50">
              {searchPoemForm.formState.errors.poem1?.message}
            </span>
          )}
        </div>

        <div className=" relative mt-12 gap-3 sm:gap-x-6 sm:flex-row flex-col items-start flex sm:items-center">
          <span className=" w-18.75 text-center shrink-0 text-xs px-2 py-1 cursor-default  relative z-20 rounded-xl glass border-border! bg-secondary!">
            مصراع دوم
          </span>
          <input
            disabled={loadingFetch}
            {...searchPoemForm.register("poem2")}
            placeholder="مثلا: مهربانی کی سر آمد؟ شهریاران را چه شد؟ (اختیاری)"
            className=" text-sm sm:text-base placeholder:text-muted-foreground/30 text-right w-full relative z-20 glass py-2 px-4 border-border! border-2! rounded-3xl bg-secondary! outline-none focus:border-primary!"
            type="text"
          />
          {searchPoemForm.formState.errors.poem2 && (
            <span className=" -bottom-7 left-5 text-red-500  text-xs sm:text-sm absolute z-50">
              {searchPoemForm.formState.errors.poem2?.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loadingFetch}
          className={`text-secondary font-bold brightness-85 hover:brightness-100 transition-all
         mt-8 flex items-center rounded-3xl bg-primary sm:text-lg px-4 py-1 gap-x-2  ${loadingFetch && "animate-pulse cursor-not-allowed!"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`size-5 `}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            />
          </svg>
          {loadingFetch ? "درحال جستجو" : "پیدا کن"}
        </button>
      </form>

      <div className=" mx-auto md:max-w-4xl grid md:grid-cols-2 gap-6">
        <div
          className={`${loadingFetch && "blur-xs animate-pulse "} rounded-3xl relative z-20 glass p-4 sm:p-8`}
        >
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <span className=" flex text-primary items-center size-10 justify-center rounded-full bg-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-ruler size-5"
                viewBox="0 0 24 24"
              >
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"></path>
              </svg>
            </span>
            <h3>وزن و بحر</h3>
          </div>
          <div className=" mt-8">
            <span className=" mb-2 inline-block text-muted-foreground text-xs sm:text-sm">
              ارکان عروضی
            </span>
            <div className=" w-full bg-primary/10 text-center px-2 py-3 text-primary font-bold rounded-3xl">
              {aruzFeet ? aruzFeet : "- - - -"}
            </div>
          </div>
          <div className=" mt-3">
            <span className=" text-muted-foreground text-xs sm:text-sm">
              بحر
            </span>
            <div className=" w-full brightness-75 font-bold ">
              {aruzBahr && aruzBahr}
              {!aruzBahr && !aruzFeet && "- - - -"}
              {!aruzBahr && aruzFeet && "یافت نشد"}
            </div>
          </div>
        </div>
        <div
          className={`${loadingFetch && "blur-xs animate-pulse "} flex justify-between flex-col rounded-3xl relative z-20 glass p-4 sm:p-8`}
        >
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <span className=" flex text-primary items-center size-10 justify-center rounded-full bg-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-audio-lines size-5"
                viewBox="0 0 24 24"
              >
                <path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"></path>
              </svg>
            </span>
            <h3>ریتم</h3>
          </div>
          <div className="  flex flex-col justify-between">
            <span className=" mb-2 inline-block text-muted-foreground text-xs sm:text-sm">
              دکمهٔ پخش را بزن تا ضرب‌آهنگِ وزن را بشنوی؛ هجاهای بلند کشیده‌تر و
              بم‌تر نواخته می‌شوند.
            </span>
            <div
              className=" w-full bg-primary/10 text-center
             text-primary font-bold rounded-3xl"
            >
              {aruzFeet ? (
                <PanelAudioPlayer
                  audioSrc={rhythmToAudioUrl(aruzFeet)}
                  color="main"
                  isPanel={false}
                />
              ) : (
                <div className=" py-6">- - - -</div>
              )}
            </div>
          </div>
        </div>

        {/* <div className=" glass relative z-20 p-4 sm:p-8 rounded-3xl md:col-span-2">
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <div
              className="  flex relative text-primary
             items-center size-10 justify-center rounded-full bg-primary/20"
            >
              <span className="text-3xl leading-none translate-y-1.25">U</span>
              <span className=" absolute w-[70%] h-1 bg-primary inline-block"></span>
            </div>
            <h3>تقطیع هجایی</h3>
          </div>
          <h4>به‌زودی....</h4>
        </div> */}
      </div>
      {showModal && (
        <div
          className=" flex items-center justify-center fixed backdrop-blur-xs
         top-0 right-0 w-screen h-screen z-50"
        >
          <div
            className=" bg-card p-4 text-center rounded-2xl flex flex-col
         items-center justify-center relative z-30  gap-y-4 max-w-[90%] sm:w-auto"
          >
            <div className=" size-25">
              <svg
                className=" size-full"
                fill="none"
                data-dc-tpl="18"
                data-om-id="33fea51e:23"
                filter="drop-shadow(rgba(20, 184, 166, 0.15) 0px 0px 20px)"
                style={{ margin: "0 auto" }}
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="58"
                  stroke="rgba(45,212,191,0.2)"
                  strokeWidth="2"
                  data-dc-tpl="19"
                  data-om-id="33fea51e:24"
                ></circle>
                <path
                  stroke="#2dd4bf"
                  strokeLinecap="round"
                  strokeWidth="3"
                  d="M45 70q15-20 30 0"
                  data-dc-tpl="20"
                  data-om-id="33fea51e:25"
                ></path>
                <circle
                  cx="50"
                  cy="55"
                  r="4"
                  fill="#2dd4bf"
                  data-dc-tpl="21"
                  data-om-id="33fea51e:26"
                ></circle>
                <circle
                  cx="70"
                  cy="55"
                  r="4"
                  fill="#2dd4bf"
                  data-dc-tpl="22"
                  data-om-id="33fea51e:27"
                ></circle>
                <path
                  stroke="rgba(45,212,191,0.4)"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="m35 35 15-5 15 5"
                  data-dc-tpl="23"
                  data-om-id="33fea51e:28"
                ></path>
                <path
                  stroke="rgba(45,212,191,0.3)"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="M70 28q5-3 10 0"
                  data-dc-tpl="24"
                  data-om-id="33fea51e:29"
                ></path>
              </svg>
            </div>
            <p className="font-bold text-xl">هیچ نتیجه‌ای پیدا نشد</p>
            <p className="text-muted-foreground text-sm">
              لطفا هر مصراع را با دقت بالا و بدون اشتباه بنویسید و دوباره تلاش
              کنید
            </p>
            <button
              onClick={() => {
                setShowModal(false);
              }}
              className="active:scale-95 px-4 py-1 rounded-lg text-sm transition-all
               glass hover:bg-accent/70! overflow-hidden mt-3 flex"
            >
              تلاش دوباره
            </button>
            <div
              onClick={() => {
                setShowModal(false);
              }}
              className=" text-muted-foreground absolute top-3 left-3 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VaznYabSection;
