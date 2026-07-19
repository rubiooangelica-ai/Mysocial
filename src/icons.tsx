// ─── Ícones de linha do app (traço fino, pontas arredondadas) ─────────────

const PATHS: Record<string, React.ReactNode> = {
  sparkle: (
    <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  ),
  palette: (
    <>
      <path d="M13.2 21c-5.2.4-9.7-3.7-9.7-8.8C3.5 7 7.5 3 12.5 3c4.4 0 8 2.9 8 6.4 0 2.2-1.8 3.9-4 3.9h-2a2 2 0 0 0-1.5 3.3c.6.7.4 1.8-.5 2.3-.4.2-.8.3-1.3.1z" />
      <circle cx="8" cy="10" r="0.6" /><circle cx="12" cy="7.5" r="0.6" /><circle cx="16" cy="10" r="0.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17 M8.5 3v4 M15.5 3v4" />
    </>
  ),
  pencil: <path d="M4.5 19.5l.9-3.6L16.6 4.7a2.1 2.1 0 0 1 3 3L8.4 18.9l-3.9.6z M14.5 6.5l3 3" />,
  plus: <path d="M12 5.5v13 M5.5 12h13" />,
  back: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevL: <path d="M14 6.5L8.5 12l5.5 5.5" />,
  chevR: <path d="M10 6.5l5.5 5.5L10 17.5" />,
  trash: (
    <path d="M4.5 7h15 M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7 M6.5 7l.9 12.5h9.2L17.5 7 M10 11v5.5 M14 11v5.5" />
  ),
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="8.7" cy="10" r="1.4" />
      <path d="M20.5 15.5l-4.6-4.6-8.4 8" />
    </>
  ),
  grid: (
    <path d="M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z" />
  ),
  download: <path d="M12 4.5v10.5 M7.5 11l4.5 4.5L16.5 11 M5 19.5h14" />,
  undo: <path d="M7.5 5.5L3.5 9.5l4 4 M3.5 9.5h10a5.5 5.5 0 1 1 0 11h-3" />,
  redo: <path d="M16.5 5.5l4 4-4 4 M20.5 9.5h-10a5.5 5.5 0 1 0 0 11h3" />,
  resize: <path d="M9 15l-4.5 4.5 M4.5 15v4.5H9 M15 9l4.5-4.5 M19.5 9V4.5H15" />,
  rotate: <path d="M20 12a8 8 0 1 1-2.8-6.1 M17.5 3.5v3.8h3.8" />,
  link: (
    <path d="M10.5 13.5a4 4 0 0 1 0-5.7l2-2a4 4 0 0 1 5.7 5.7l-1.2 1.2 M13.5 10.5a4 4 0 0 1 0 5.7l-2 2a4 4 0 0 1-5.7-5.7L7 11.3" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="M5 13l4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12 M18 6L6 18" />,
  bulb: (
    <path d="M9.5 17.5h5 M10.5 20.5h3 M12 3.5a5.8 5.8 0 0 1 3.4 10.5c-.7.5-1 1.2-1 2v.5h-4.8v-.5c0-.8-.3-1.5-1-2A5.8 5.8 0 0 1 12 3.5z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.4-4.4" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="M11 12.5L19.5 4 M16.5 7l2.5 2.5 M13.5 10l2 2" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M8 4.5v15 M16 4.5v15 M3.5 9.5H8 M3.5 14.5H8 M16 9.5h4.5 M16 14.5h4.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.3 7-11.2A7 7 0 1 0 5 9.8C5 14.7 12 21 12 21z" />
      <circle cx="12" cy="9.8" r="2.2" />
    </>
  ),
  note: (
    <path d="M6 3.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5A1.5 1.5 0 0 1 6.5 3.5z M14.5 3.5V8H19 M8.5 12h7 M8.5 15.5h5" />
  ),
}

export function I({ n, size = 20, style }: { n: keyof typeof PATHS | string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      aria-hidden
    >
      {PATHS[n] ?? null}
    </svg>
  )
}
