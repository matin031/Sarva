import Image from "next/image";
import { AppWindow, Eye, Flower, Footprints, Gem, Heart, History, Newspaper, Sprout, Swords, type LucideIcon } from "lucide-react";
import { ERA_ART, type Era, type EraId } from "@/lib/literary-timeline/data";
import s from "./timeline.module.css";

export const ERA_ICONS: Record<EraId, LucideIcon> = {
  roots: Sprout, khorasani: Swords, transition: Footprints, iraqi: Heart, voqu: Eye,
  hindi: Gem, bazgasht: History, bidari: Newspaper, modern: AppWindow, revolution: Flower,
};

/** A chapter's emblem: its cartoon when one exists, otherwise a doodled icon
 *  on a softly morphing blob in the chapter's colour. */
export function EraBadge({ era, size = "medium" }: { era: Era; size?: "small" | "medium" | "large" }) {
  const art = ERA_ART[era.id];
  const Icon = ERA_ICONS[era.id];
  return <span className={`${s.badge} ${s[`badge_${size}`]}`} aria-hidden="true">
    {art ? <Image src={art} alt="" width={240} height={240} unoptimized className={s.badgeArt} /> : <Icon strokeWidth={1.8} />}
  </span>;
}
