export const STAR_PATH = 'M12 2 L14.9 8.6 L22 9.2 L16.6 13.8 L18.2 21 L12 17.2 L5.8 21 L7.4 13.8 L2 9.2 L9.1 8.6 Z'

export function StarIcon({ size = 22, fill = 'var(--sun)' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d={STAR_PATH} fill={fill} stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function StrokeIcon({ size, strokeWidth, stroke = 'var(--ink)', children, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {children}
    </svg>
  )
}

export function BackChevronIcon({ size = 26 }) {
  return (
    <StrokeIcon size={size} strokeWidth="3">
      <path d="M15 5 L8 12 L15 19" />
    </StrokeIcon>
  )
}

export function ForwardChevronIcon({ size = 28 }) {
  return (
    <StrokeIcon size={size} strokeWidth="3" style={{ flexShrink: 0 }}>
      <path d="M9 5 L16 12 L9 19" />
    </StrokeIcon>
  )
}

export function NextArrowIcon({ size = 28 }) {
  return (
    <StrokeIcon size={size} strokeWidth="3.2">
      <path d="M5 12 H19 M13 6 L19 12 L13 18" />
    </StrokeIcon>
  )
}

export function SpeakerIcon({ size = 30 }) {
  return (
    <StrokeIcon size={size} strokeWidth="2.4" stroke="var(--white)">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="var(--white)" />
      <path d="M16.5 8.5 C18 10 18 14 16.5 15.5" />
      <path d="M19 6 C22 9 22 15 19 18" />
    </StrokeIcon>
  )
}

export function RefreshIcon({ size = 28, strokeWidth = '2.4' }) {
  return (
    <StrokeIcon size={size} strokeWidth={strokeWidth} style={{ flexShrink: 0 }}>
      <path d="M4 12 A8 8 0 0 1 18 7 M18 3 V7 H14" />
      <path d="M20 12 A8 8 0 0 1 6 17 M6 21 V17 H10" />
    </StrokeIcon>
  )
}

export function CheckIcon({ size = 24 }) {
  return (
    <StrokeIcon size={size} strokeWidth="3.6" stroke="var(--white)">
      <path d="M5 12.5 L10 17 L19 7" />
    </StrokeIcon>
  )
}

export function CrossIcon({ size = 22 }) {
  return (
    <StrokeIcon size={size} strokeWidth="3.6" stroke="var(--white)">
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </StrokeIcon>
  )
}
