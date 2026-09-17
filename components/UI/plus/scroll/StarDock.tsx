import { useId } from "react";
import { SARVA_STAR_PATH } from "@/components/UI/SarvaStar";

/** Perspective is drawn in vector coordinates, not a rasterised CSS 3D layer. */
export default function StarDock({ className }: { className?: string }) {
  const id = useId();
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className={className} viewBox="0 0 360 256" aria-hidden>
      <defs>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#0a1b27" /><stop offset=".2" stopColor="#21464b" /><stop offset=".5" stopColor="#0c292f" /><stop offset=".8" stopColor="#183a40" /><stop offset="1" stopColor="#081923" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2=".65" y2="1">
          <stop stopColor="#29444b" /><stop offset=".3" stopColor="#182f39" /><stop offset=".72" stopColor="#0b1d2a" /><stop offset="1" stopColor="#102b35" />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2=".5" y2="1">
          <stop stopColor="#f1e3b3" /><stop offset=".24" stopColor="#93c7c0" /><stop offset=".5" stopColor="#315a62" /><stop offset=".76" stopColor="#6e9697" /><stop offset="1" stopColor="#203e49" />
        </linearGradient>
        <radialGradient id={`${id}-shadow`}><stop stopColor="#000" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-light`}><stop stopColor="#35dacc" stopOpacity=".2" /><stop offset="1" stopColor="#35dacc" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="180" cy="196" rx="175" ry="52" fill={paint("shadow")} />
      <path d="M30 142v19c0 36 67 65 150 65s150-29 150-65v-19Z" fill={paint("side")} />
      <path d="M30 156c0 36 67 65 150 65s150-29 150-65" fill="none" stroke="#558183" strokeOpacity=".3" />
      <ellipse cx="180" cy="142" rx="150" ry="65" fill={paint("top")} stroke={paint("metal")} strokeWidth="1.2" />
      <ellipse cx="180" cy="142" rx="142" ry="60" fill="none" stroke="#89b6b3" strokeOpacity=".12" strokeWidth=".8" />
      <path d="M46 120c23-25 75-40 134-40 34 0 66 5 92 14" fill="none" stroke="#dceac5" strokeWidth=".65" strokeOpacity=".38" />
      <path d={SARVA_STAR_PATH} transform="translate(180 146) scale(7.75 5.186) translate(-12 -12)" fill="#06131e" stroke="#06121d" strokeWidth=".8" strokeLinejoin="round" />
      <path d={SARVA_STAR_PATH} transform="translate(180 141) scale(7.75 5.186) translate(-12 -12)" fill={paint("metal")} stroke="#aad4c8" strokeWidth=".12" strokeLinejoin="round" />
      <path d={SARVA_STAR_PATH} transform="translate(180 141) scale(6.917 4.628) translate(-12 -12)" fill="#051824" stroke="#041018" strokeWidth=".25" strokeLinejoin="round" />
      <path d={SARVA_STAR_PATH} transform="translate(180 143) scale(6.65 4.45) translate(-12 -12)" fill="#0d3038" stroke="#3d7175" strokeWidth=".13" strokeLinejoin="round" />
      <g data-dock-glow opacity="0">
        <ellipse cx="180" cy="139" rx="132" ry="56" fill={paint("light")} />
        <path d={SARVA_STAR_PATH} transform="translate(180 141) scale(7.35 4.918) translate(-12 -12)" fill="none" stroke="#80f2dd" strokeWidth=".19" strokeLinejoin="round" />
        <path d="M31 151c9 34 72 60 149 60s140-26 149-60" fill="none" stroke="#40c7be" strokeWidth="1.3" />
        <path d="M153 215h54" stroke="#71efda" strokeWidth="2" strokeLinecap="round" />
      </g>
      <path d="M65 171l15 6m205-6-15 6" stroke="#ad995e" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M174 195h12m-9 3h6" stroke="#8ca8a1" strokeOpacity=".5" strokeWidth=".8" strokeLinecap="round" />
    </svg>
  );
}
