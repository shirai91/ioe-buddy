import { Link } from 'react-router-dom'
import { getProfile } from '../api/client.js'
import AppHeader from '../components/AppHeader.jsx'
import Page from '../components/Page.jsx'
import { ForwardChevronIcon, RefreshIcon } from '../components/icons.jsx'
import { useApi } from '../lib/useApi.js'
import './Practice.css'

function PicturePickArt() {
  return (
    <svg viewBox="0 0 48 48" width="50" height="50" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <rect x="5" y="9" width="30" height="26" rx="4" fill="var(--white)" />
      <path d="M9 30 L17 21 L23 27 L27 23 L31 30 Z" fill="var(--leaf)" />
      <circle cx="27" cy="16" r="3" fill="var(--coral)" />
      <circle cx="37" cy="35" r="8" fill="var(--success)" />
      <path d="M33.5 35 L36 37.5 L40.5 32.5" stroke="var(--white)" />
    </svg>
  )
}

function LetterPopArt() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" focusable="false">
      <rect x="3" y="14" width="13" height="18" rx="3" fill="var(--white)" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="18" y="8" width="13" height="18" rx="3" fill="var(--sun)" stroke="var(--ink)" strokeWidth="2.5" transform="rotate(-14 24 17)" />
      <rect x="33" y="14" width="13" height="18" rx="3" fill="var(--white)" stroke="var(--ink)" strokeWidth="2.5" />
      <text x="9.5" y="28" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="12" fill="var(--ink)">
        c
      </text>
      <text x="39.5" y="28" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="12" fill="var(--ink)">
        t
      </text>
      <path d="M20 38 L28 46 M28 38 L20 46" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function MatchUpArt() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <rect x="3" y="10" width="17" height="24" rx="4" fill="var(--white)" />
      <rect x="28" y="14" width="17" height="24" rx="4" fill="var(--sun)" />
      <path d="M7 20 H16 M7 25 H13" />
      <circle cx="36.5" cy="26" r="5" fill="var(--coral)" />
      <path d="M20 22 C24 22 24 26 28 26" strokeDasharray="2 3" />
    </svg>
  )
}

function FillInArt() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" focusable="false">
      <text x="9" y="30" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="18" fill="var(--ink)">
        c
      </text>
      <rect x="17" y="13" width="14" height="20" rx="3" fill="var(--white)" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="3 2.5" />
      <text x="39" y="30" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="18" fill="var(--ink)">
        t
      </text>
      <rect x="17" y="37" width="14" height="4" rx="2" fill="var(--ink)" />
    </svg>
  )
}

const GAMES = [
  {
    to: '/practice/picture-pick',
    title: 'Picture Pick',
    hint: 'Hear a word, tap its picture',
    length: '10 questions',
    tileColor: 'var(--sun)',
    chipColor: 'var(--chip-cream)',
    Art: PicturePickArt,
  },
  {
    to: '/practice/letter-pop',
    title: 'Letter Pop',
    hint: 'Pop the extra letter to fix the word',
    length: '10 questions',
    tileColor: 'var(--salmon)',
    chipColor: 'var(--chip-rose)',
    Art: LetterPopArt,
  },
  {
    to: '/practice/match-up',
    title: 'Match Up',
    hint: 'Pair each word with its picture',
    length: '10 rounds',
    tileColor: 'var(--lilac)',
    chipColor: 'var(--chip-lilac)',
    Art: MatchUpArt,
  },
  {
    to: '/practice/fill-in',
    title: 'Fill In',
    hint: 'Add the missing letters',
    length: '10 questions',
    tileColor: 'var(--sky-blue)',
    chipColor: 'var(--chip-ice)',
    Art: FillInArt,
  },
]

function GameLink({ game }) {
  const { to, title, hint, length, tileColor, chipColor, Art } = game
  return (
    <Link to={to} className="game-link" style={{ '--game-tile': tileColor, '--game-chip': chipColor }}>
      <span className="game-link__tile" aria-hidden="true">
        <Art />
      </span>
      <span className="game-link__text">
        <span className="game-link__title">{title}</span>
        <span className="game-link__hint">{hint}</span>
        <span className="game-link__length">{length}</span>
      </span>
      <ForwardChevronIcon />
    </Link>
  )
}

export default function Practice() {
  const { data: profile } = useApi(getProfile)
  return (
    <Page background="var(--bg-practice)" gap={16}>
      <AppHeader title="Practice" backTo="/" backLabel="Back to home" stars={profile?.stars ?? 0} />

      <p className="practice__prompt">Pick a game to play!</p>

      <nav aria-label="Games" className="practice__games">
        {GAMES.map((game) => (
          <GameLink key={game.to} game={game} />
        ))}
      </nav>

      <div className="practice__spacer" />

      <div className="practice__tip">
        <RefreshIcon />
        <span>New questions every time you play</span>
      </div>
    </Page>
  )
}
