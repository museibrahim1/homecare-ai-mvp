/** Paper Web Glass brand orb (organic teal blob + mic). */

type PalmOrbProps = {
  size?: number;
  className?: string;
};

export default function PalmOrb({ size = 56, className = '' }: PalmOrbProps) {
  const gid = `orb-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${gid}-a`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="45%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </radialGradient>
        <radialGradient id={`${gid}-b`} cx="30%" cy="25%" r="55%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M211.3,120 L212,134.6 L214.5,150.7 L216.5,169.2 L214.9,188.9 L207.1,207.1 L193.2,220.8 L175.2,228.3 L155.9,230.3 L137.2,228.8 L120,225.6 L104,221.3 L89,215.5 L75.5,207.4 L63.9,197.2 L54.1,185.9 L44.7,174.7 L34.4,163.6 L23,151.5 L12.1,137.1 L4.8,120 L3.7,101.6 L9.7,84.2 L21,69.6 L34.6,58 L48,48 L60.3,37.8 L72.7,27.1 L86.6,17.2 L102.6,10.3 L120,8.1 L137.3,10.8 L153.5,17 L168.4,25.1 L182.2,34.4 L194.7,45.3 L204.8,58.4 L211,73.6 L213.1,89.7 L212.4,105.4 Z"
        fill="none"
        stroke="#0D948822"
      />
      <path
        d="M214,120 L212.1,134.6 L208.9,148.9 L204.1,162.8 L196.6,175.6 L185.9,185.9 L172.5,192.2 L158.1,194.9 L144.5,195.5 L132.1,196.6 L120,199.9 L106.6,204.8 L91,209.2 L74.2,209.9 L58.2,205.1 L45.1,194.9 L35.8,181.1 L30.2,165.8 L27.1,150.2 L26,134.9 L27.2,120 L31.3,106 L38.4,93.5 L47.3,82.9 L56.2,73.7 L64.2,64.2 L71.6,53.3 L79.8,41.1 L90.6,29.4 L104.4,21.2 L120,18.7 L135.5,22.1 L149.3,29.7 L161.4,38.8 L172.5,47.7 L183.6,56.4 L194.6,65.8 L204.3,77.1 L211,90.4 L214,105.1 Z"
        fill="none"
        stroke="#2DD4BF40"
        strokeWidth="1.25"
      />
      <path
        d="M181.2,120 L178.4,129.2 L174.8,137.8 L171.1,146 L167,154.1 L161.8,161.8 L155,168.2 L146.9,172.9 L138.1,175.8 L129.1,177.6 L120,178.7 L110.6,179.2 L101.1,178.2 L92.2,174.6 L84.9,168.3 L80.2,159.8 L77.6,150.8 L76.1,142.4 L73.9,135 L70.3,127.9 L65.8,120 L62,110.8 L60.6,100.7 L62.5,90.7 L67.3,81.7 L74.3,74.3 L82.4,68.3 L91.3,63.6 L100.7,60.7 L110.5,60 L120,62.1 L128.5,66.4 L135.7,71.7 L142.1,76.5 L148.9,80.2 L156.7,83.3 L165.4,87 L173.5,92.7 L179.4,100.7 L181.9,110.2 Z"
        fill={`url(#${gid}-a)`}
      />
      <path
        d="M181.2,120 L178.4,129.2 L174.8,137.8 L171.1,146 L167,154.1 L161.8,161.8 L155,168.2 L146.9,172.9 L138.1,175.8 L129.1,177.6 L120,178.7 L110.6,179.2 L101.1,178.2 L92.2,174.6 L84.9,168.3 L80.2,159.8 L77.6,150.8 L76.1,142.4 L73.9,135 L70.3,127.9 L65.8,120 L62,110.8 L60.6,100.7 L62.5,90.7 L67.3,81.7 L74.3,74.3 L82.4,68.3 L91.3,63.6 L100.7,60.7 L110.5,60 L120,62.1 L128.5,66.4 L135.7,71.7 L142.1,76.5 L148.9,80.2 L156.7,83.3 L165.4,87 L173.5,92.7 L179.4,100.7 L181.9,110.2 Z"
        fill={`url(#${gid}-b)`}
      />
      <g transform="translate(108,100)">
        <path
          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 11a4 4 0 0 0 8 0M12 15v3"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
