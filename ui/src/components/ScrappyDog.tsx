export function ScrappyDog({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Scrappy the dog mascot"
    >
      {/* Ears */}
      <ellipse cx="16" cy="18" rx="10" ry="14" fill="#065F46" />
      <ellipse cx="48" cy="18" rx="10" ry="14" fill="#065F46" />
      <ellipse cx="16" cy="18" rx="7" ry="10" fill="#059669" />
      <ellipse cx="48" cy="18" rx="7" ry="10" fill="#059669" />

      {/* Head */}
      <circle cx="32" cy="34" r="22" fill="#059669" />

      {/* Face lighter area */}
      <ellipse cx="32" cy="40" rx="14" ry="12" fill="#D1FAE5" />

      {/* Eyes */}
      <circle cx="24" cy="30" r="4" fill="white" />
      <circle cx="40" cy="30" r="4" fill="white" />
      <circle cx="25" cy="29" r="2.5" fill="#065F46" />
      <circle cx="41" cy="29" r="2.5" fill="#065F46" />
      <circle cx="25.5" cy="28.5" r="1" fill="white" />
      <circle cx="41.5" cy="28.5" r="1" fill="white" />

      {/* Nose */}
      <ellipse cx="32" cy="38" rx="4" ry="3" fill="#065F46" />
      <ellipse cx="31" cy="37.5" rx="1.5" ry="1" fill="#34D399" />

      {/* Mouth */}
      <path
        d="M28 42 Q32 46 36 42"
        stroke="#065F46"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Tongue */}
      <ellipse cx="32" cy="45" rx="3" ry="2.5" fill="#f87171" />

      {/* Collar */}
      <rect x="18" y="52" width="28" height="5" rx="2.5" fill="#065F46" />
      <circle cx="32" cy="55" r="3" fill="#fbbf24" />
    </svg>
  );
}
