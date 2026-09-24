import Link from "next/link";
import { ShinyButton } from "./kit/ShinyButton";

/**
 * Shared "go to this feature's page" button shown under each homepage demo.
 *
 * ⚠️ همان `ShinyButton`ِ هیروِ صفحهٔ اصلی و نه یک `<Link>`ِ رنگ‌شده.
 *
 * تا دیروز این دکمه `bg-primary … shadow` بود: هم‌رنگِ دکمهٔ هیرو ولی
 * نه هم‌ارتفاع، نه هم‌سایه و بدونِ آن درخششِ عبوری. نتیجه این بود که
 * صفحهٔ اصلی پنج دکمهٔ «شروع» داشت که یکی‌شان با بقیه فرق می‌کرد — و آن
 * یکی دقیقاً همانی بود که چهار بار تکرار می‌شد.
 *
 * `asChild` تا ناوبری یک `<a>` واقعی بماند (و نه `onClick` روی یک دکمه):
 * راست‌کلیک، «باز کردن در تبِ تازه» و خزندهٔ گوگل همه به همان یک عنصر
 * تکیه دارند.
 */
export default function SectionCTA({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-7 flex justify-center">
      <ShinyButton asChild>
        <Link href={href}>
          {label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
          </svg>
        </Link>
      </ShinyButton>
    </div>
  );
}
