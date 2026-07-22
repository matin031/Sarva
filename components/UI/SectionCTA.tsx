import Link from "next/link";

/** Shared "go to this feature's page" button shown under each homepage demo. */
export default function SectionCTA({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-7 flex justify-center">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow transition-all hover:brightness-90 active:scale-95"
      >
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 6 5 12l6 6M19 12H5" />
        </svg>
      </Link>
    </div>
  );
}
