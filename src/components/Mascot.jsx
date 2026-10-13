const STAR_BODY = 'M100 14 L124 70 L184 74 L138 112 L152 172 L100 140 L48 172 L62 112 L16 74 L76 70 Z'

function HappyFace() {
  return (
    <>
      <path d="M86 116 Q100 130 114 116" fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" />
      <circle cx="70" cy="114" r="7" fill="var(--coral)" opacity="0.7" />
      <circle cx="130" cy="114" r="7" fill="var(--coral)" opacity="0.7" />
    </>
  )
}

function CheerFace() {
  return <path d="M82 112 Q100 136 118 112" fill="var(--coral)" stroke="var(--ink)" strokeWidth="6" strokeLinejoin="round" />
}

export default function Mascot({ size = 92, mood = 'happy', className, style }) {
  const isCheering = mood === 'cheer'
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" focusable="false" className={className} style={{ flexShrink: 0, ...style }}>
      <path d={STAR_BODY} fill="var(--sun)" stroke="var(--ink)" strokeWidth={isCheering ? 7 : 8} strokeLinejoin="round" />
      <circle cx="84" cy="96" r="8" fill="var(--ink)" />
      <circle cx="116" cy="96" r="8" fill="var(--ink)" />
      {isCheering ? <CheerFace /> : <HappyFace />}
    </svg>
  )
}
