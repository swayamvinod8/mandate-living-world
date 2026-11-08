// Simple d20 outline used in the wordmark
export default function D20({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 2 28 9v14l-12 7-12-7V9z" />
      <path d="M16 2 9.5 12.5h13z M9.5 12.5 16 23l6.5-10.5 M4 9l5.5 3.5L4 23 M28 9l-5.5 3.5L28 23 M16 23v7 M9.5 12.5 4 23h24l-5.5-10.5" />
    </svg>
  );
}
