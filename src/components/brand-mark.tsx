/** Original Duzelo link-and-location mark. Single color, scalable, icon-safe. */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="20" fill="currentColor" />
      <path
        d="M17 33.5 31.7 18.8a4.5 4.5 0 0 1 6.4 0L47 27.7"
        stroke="#FAF7EE"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 30.5 32.3 45.2a4.5 4.5 0 0 1-6.4 0L17 36.3"
        stroke="#FAF7EE"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="5.4" fill="#F6BC5C" />
    </svg>
  );
}
