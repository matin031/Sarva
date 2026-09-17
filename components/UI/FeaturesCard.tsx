import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/components/home/home.module.css";

type FeaturesCardType = {
  title: string;
  desc: string;
  icon: ReactNode;
  bgColor: string;
  href: string;
  action: string;
};

export default function FeaturesCard({ title, desc, icon, bgColor, href, action }: FeaturesCardType) {
  return (
    <article className={styles.feature}>
      <div className={`${styles.featureIcon} ${bgColor}`} aria-hidden="true"><div>{icon}</div></div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <Link className={styles.featureAction} href={href} aria-label={`${action}؛ ${title}`}>
        {action}<ArrowLeft size={17} aria-hidden="true" />
      </Link>
    </article>
  );
}
