"use client";

import { useState } from "react";
import Image from "next/image";
import { CARTOON_PORTRAITS, PORTRAITS, type Person } from "@/lib/literary-timeline/data";
import s from "./timeline.module.css";

/** The picture for a person: a Sarva cartoon when one is registered, the
 *  attributed historical portrait otherwise, and a hand-lettered initial when
 *  neither exists or the file fails to load. */
export function portraitFor(person: Person): { src?: string; cartoon: boolean } {
  const cartoon = CARTOON_PORTRAITS[person.id];
  return cartoon ? { src: cartoon, cartoon: true } : { src: PORTRAITS[person.id]?.image, cartoon: false };
}

/** Cartoons are full-length; everywhere except the profile they are cropped to
 *  the head so they read in a small circle. */
export function Portrait({ person, large = false, priority = false }: { person: Person; large?: boolean; priority?: boolean }) {
  const { src, cartoon } = portraitFor(person);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={`${s.initial} ${large ? s.initialLarge : ""}`} role="img" aria-label={`نگارهٔ ${person.name} در دسترس نیست`}><span aria-hidden="true">{person.name.replace(/^(سید|خواجه|ملک‌الشعرا|شیخ)\s*/, "").charAt(0)}</span></span>;
  return <Image className={`${s.portraitImage} ${cartoon ? large ? s.cartoonImage : s.cartoonHead : ""}`} src={src} alt={`${cartoon ? "تصویرسازی" : "چهره‌نگاری"} ${person.name}`} width={large ? 480 : 200} height={large ? cartoon ? 720 : 600 : 250} unoptimized priority={priority} onError={() => setFailed(true)} />;
}
