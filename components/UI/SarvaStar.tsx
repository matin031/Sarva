import type { SVGProps } from "react";

// One silhouette for navigation, the travelling star and its fitted socket.
export const SARVA_STAR_PATH = "m12 3 2.4 5.1 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8L12 3Z";

export default function SarvaStar({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}><path d={SARVA_STAR_PATH} /></svg>;
}
