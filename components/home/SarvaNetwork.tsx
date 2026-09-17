"use client";

import { useRef, type RefObject } from "react";
import Link from "next/link";
import { BookOpen, FileText, Gamepad2, Headphones, MessageCircle, Music2, type LucideIcon } from "lucide-react";
import MainLogo from "@/components/svgs/mainLogo";
import { AnimatedBeam } from "./AnimatedBeam";
import styles from "./home.module.css";

function NetworkNode({ nodeRef, title, icon: Icon, href, position }: {
  nodeRef: RefObject<HTMLAnchorElement | null>; title: string; icon: LucideIcon; href: string; position: string;
}) {
  return <Link ref={nodeRef} href={href} className={`${styles.networkNode} ${position}`}>
    <span className={styles.nodeIcon}><Icon size={25} strokeWidth={1.6} aria-hidden="true" /></span><span>{title}</span>
  </Link>;
}

export default function SarvaNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const lessonsRef = useRef<HTMLAnchorElement>(null);
  const gamesRef = useRef<HTMLAnchorElement>(null);
  const examRef = useRef<HTMLAnchorElement>(null);
  const meterRef = useRef<HTMLAnchorElement>(null);
  const aruzRef = useRef<HTMLAnchorElement>(null);
  const clubRef = useRef<HTMLAnchorElement>(null);
  return (
    <section className={styles.networkSection} aria-label="دنیای یادگیری سروا">
      <div ref={containerRef} className={styles.network} aria-label="امکانات سروا">
        <div className={styles.networkOrbit} aria-hidden="true" />
        <AnimatedBeam containerRef={containerRef} fromRef={lessonsRef} toRef={centerRef} curvature={-45} reverse />
        <AnimatedBeam containerRef={containerRef} fromRef={gamesRef} toRef={centerRef} reverse delay={0.45} />
        <AnimatedBeam containerRef={containerRef} fromRef={examRef} toRef={centerRef} curvature={45} reverse delay={0.9} />
        <AnimatedBeam containerRef={containerRef} fromRef={meterRef} toRef={centerRef} curvature={-45} delay={1.35} />
        <AnimatedBeam containerRef={containerRef} fromRef={aruzRef} toRef={centerRef} delay={1.8} />
        <AnimatedBeam containerRef={containerRef} fromRef={clubRef} toRef={centerRef} curvature={45} delay={2.25} />
        <div ref={centerRef} className={styles.networkCenter}>
          <span className={styles.networkLogo} aria-hidden="true"><MainLogo /></span>
          <span>سروا</span>
        </div>
        <NetworkNode nodeRef={lessonsRef} title="درسنامه" icon={BookOpen} href="/doroos" position={styles.nodeOne} />
        <NetworkNode nodeRef={gamesRef} title="بازی‌های ادبی" icon={Gamepad2} href="/game" position={styles.nodeTwo} />
        <NetworkNode nodeRef={examRef} title="امتحان نهایی" icon={FileText} href="/exam" position={styles.nodeThree} />
        <NetworkNode nodeRef={meterRef} title="وزن‌یاب" icon={Music2} href="/vazn-yab" position={styles.nodeFour} />
        <NetworkNode nodeRef={aruzRef} title="عروض سماعی" icon={Headphones} href="/aruz" position={styles.nodeFive} />
        <NetworkNode nodeRef={clubRef} title="سروا کلاب" icon={MessageCircle} href="/sarvaclub" position={styles.nodeSix} />
      </div>
    </section>
  );
}
