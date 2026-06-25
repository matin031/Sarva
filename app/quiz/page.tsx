import Quiz from "@/components/UI/Quiz";

export type Question = {
  id: number;
  type:
    | "audio-to-poem"
    | "audio-to-pattern"
    | "poem-to-audio"
    | "pattern-to-audio"
    | "audio-to-weight"
    | "weight-to-audio";
  poem?: string[];
  audioSrc?: string;
  options: {
    id: number;
    poem?: string[];
    label?: string;
    audioSrc?: string;
    isCorrect: boolean;
    x: number;
  }[];
};

function page() {
  const data: Question[] = [
    {
      id: 1,
      type: "poem-to-audio",
      poem: [
        "سرو چمان من چرا میل چمن نمی کند",
        "همدم گل نمی‌شود یاد سمن نمی‌کند",
      ],

      options: [
        {
          id: 1,
          audioSrc: "/Lab Labe Man.mp3",
          isCorrect: false,
          x: 30,
        },
        {
          id: 2,
          audioSrc: "/Ramesh - Delakam [320].mp3",
          isCorrect: true,
          x: -30,
        },
        {
          id: 3,
          audioSrc: "/Ramesh - Delakam [320].mp3",
          isCorrect: false,
          x: 30,
        },
        {
          id: 4,
          audioSrc: "/Lab Labe Man.mp3",
          isCorrect: false,
          x: -30,
        },
      ],
    },
    {
      id: 2,
      type: "audio-to-weight",
      audioSrc: "/مفاعیلن.mp3",
      options: [
        { id: 1, label: "مستفعل مستفعل مستفعل فعلن", isCorrect: false, x: 30 },
        {
          id: 2,
          label: "مفاعیلن مفاعیلن مفاعیلن فعولن",
          isCorrect: true,
          x: -30,
        },
        {
          id: 3,
          label: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
          isCorrect: false,
          x: 30,
        },
        {
          id: 4,
          label: "متفعلن مفاعلن مفتلعن مفاعلن",
          isCorrect: false,
          x: -30,
        },
      ],
    },
    {
      id: 3,
      type: "audio-to-poem",
      audioSrc: "/فاعلاتن.mp3",

      options: [
        {
          id: 1,
          poem: [
            "حافظا تیکه بر ایام چو سهو است و خطا",
            "من چرا عشرت امروز به فردا فکنم",
          ],
          isCorrect: false,
          x: 30,
        },
        {
          id: 2,
          poem: [
            "بر آسمان‌ها برده سر وز سرنبشت او بی‌خبر",
            "همیان او پرسیم و زر گوشش پر از طال بقا",
          ],
          isCorrect: false,
          x: -30,
        },
        {
          id: 3,
          poem: [
            "پیشم آمد بامداد آن دلبر از راه شکوخ",
            "با دو رخ از شرم لعل و با دو چشم از سحر شوخ",
          ],
          isCorrect: true,
          x: 30,
        },
        {
          id: 4,
          poem: [
            "مرده بدم زنده شدم گریه بدم خنده شدم",
            "دولت عشق آمد و من دولت پاینده شدم",
          ],
          isCorrect: false,
          x: -30,
        },
      ],
    },
  ];

  return <Quiz data={data} />;
}

export default page;
