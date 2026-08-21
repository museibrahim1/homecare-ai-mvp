/** Paper Web Glass topographic wave field. */

type WaveFieldProps = {
  className?: string;
  dark?: boolean;
};

export default function WaveField({ className = '', dark = false }: WaveFieldProps) {
  const a = dark ? '#2DD4BF29' : '#0D948824';
  const b = dark ? '#2DD4BF2E' : '#2DD4BF2E';
  const c = dark ? '#0D948824' : '#0D94881F';
  const d = dark ? '#2DD4BF1F' : '#2DD4BF1A';
  const e = dark ? '#2DD4BF1A' : '#0D948814';

  return (
    <svg
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M-80 187 L-66 184.6 L-52 183.5 L-38 184.6 L-24 188.5 L-10 194.8 L4 202.1 L18 209 L32 214 L46 216.4 L60 216.1 L74 214.1 L88 211.4 L102 208.8 L116 206.5 L130 204.3 L144 201.3 L158 197.2 L172 192.1 L186 186.8 L200 182.6 L214 180.7 L228 182 L242 186.3 L256 192.5 L270 199.2 L284 205 L298 208.9 L312 211.1 L326 211.9 L340 212.3 L354 212.7 L368 213 L382 212.7 L396 211 L410 207.1 L424 201.2 L438 194.2 L452 187.6 L466 182.9 L480 181.1 L494 182.4 L508 186 L522 190.7 L536 195.3 L550 199.1 L564 202 L578 204.5 L592 207.2 L606 210.5 L620 213.9 L634 216.6 L800 220 L1000 210 L1200 205 L1440 212"
        fill="none"
        stroke={a}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M-80 327.2 L0 362 L100 350 L200 321 L300 356 L400 340 L500 331 L600 363 L800 350 L1000 340 L1200 355 L1440 348"
        fill="none"
        stroke={b}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M-80 497 L100 467 L200 493 L300 490 L400 472 L500 497 L600 463 L800 480 L1000 470 L1200 490 L1440 475"
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M-80 626 L100 625 L200 631 L300 614 L400 632 L500 606 L600 623 L800 620 L1000 630 L1200 615 L1440 628"
        fill="none"
        stroke={d}
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M-80 732 L100 749 L200 725 L300 744 L400 728 L500 734 L600 623 L800 740 L1000 730 L1200 745 L1440 738"
        fill="none"
        stroke={e}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <rect x="180" y="280" width="40" height="2" rx="1" fill={b} />
      <rect x="520" y="440" width="48" height="2" rx="1" fill={a} />
      <rect x="900" y="600" width="36" height="2" rx="1" fill={c} />
      <rect x="1100" y="680" width="44" height="2" rx="1" fill={d} />
    </svg>
  );
}
