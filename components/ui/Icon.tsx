const PATHS: Record<string, string> = {
  bolt:     "M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l0-8z",
  calendar: "M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
  list:     "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  archive:  "M3 7h18v3H3zM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9M9.5 14h5",
  home:     "M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9",
  wallet:   "M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2zM17 13h.01",
  chart:    "M5 20V10M12 20V4M19 20v-7",
  plus:     "M12 5v14M5 12h14",
  check:    "M5 12.5 10 17.5 19.5 7",
  arrow:    "M5 12h14M13 6l6 6-6 6",
  back:     "M19 12H5M11 6l-6 6 6 6",
  sparkle:  "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z",
  receipt:  "M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21zM9 8h6M9 12h6",
  pencil:   "M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.5zM14 7l3 3",
  user:     "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6",
  bag:      "M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2",
  film:     "M3 5h18v14H3zM3 9h18M3 15h18M8 5v14M16 5v14",
  car:      "M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M5 11h14v6H5zM7.5 14h.01M16.5 14h.01M5 17v2M19 17v2",
  paw:      "M12 13c2.5 0 4 2 4 3.5S14.5 19 12 19s-4-.5-4-2.5S9.5 13 12 13zM7 9.5a1.5 2 0 1 0 0-.01M17 9.5a1.5 2 0 1 0 0-.01M9.5 6.5a1.3 1.8 0 1 0 0-.01M14.5 6.5a1.3 1.8 0 1 0 0-.01",
  x:        "M6 6l12 12M18 6L6 18",
  send:     "M4 12l16-7-7 16-2.5-6.5z",
  clock:    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  cart:     "M3 4h2l2 12h11M7 16h11l1.5-8H6M9 20a1 1 0 1 0 0-.01M17 20a1 1 0 1 0 0-.01",
  heart:    "M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z",
  flag:     "M5 21V4M5 4c3-2 7 2 10 0v9c-3 2-7-2-10 0",
  alert:    "M12 3l9 16H3zM12 10v4M12 17h.01",
  info:     "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  lock:     "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  mic:      "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  camera:   "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L18 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  book:     "M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2zM5 4v16M18 18H7",
  trophy:   "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9 20h6M12 13v7",
};

export default function Icon({
  name,
  size = 22,
  fill = false,
  className,
  style,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const d = PATHS[name] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={d} />
    </svg>
  );
}
