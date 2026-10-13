import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, getWordOfTheDay, resetProgress, updateProfile } from '../api/client.js'
import ListenButton from '../components/ListenButton.jsx'
import Mascot from '../components/Mascot.jsx'
import Page from '../components/Page.jsx'
import StarPill from '../components/StarPill.jsx'
import UserMenu from '../components/UserMenu.jsx'
import WordPicture from '../components/WordPicture.jsx'
import { useApi } from '../lib/useApi.js'
import './Home.css'

function FlashCardsArt() {
  return (
    <svg viewBox="0 0 80 80" width="72" height="72" aria-hidden="true" focusable="false">
      <rect x="10" y="18" width="40" height="52" rx="8" fill="var(--white)" stroke="var(--ink)" strokeWidth="4" transform="rotate(-12 30 44)" />
      <rect x="28" y="10" width="40" height="52" rx="8" fill="var(--sun)" stroke="var(--ink)" strokeWidth="4" transform="rotate(8 48 36)" />
      <text
        x="48"
        y="45"
        textAnchor="middle"
        fontFamily="Baloo 2, Nunito, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="var(--ink)"
        transform="rotate(8 48 36)"
      >
        Aa
      </text>
    </svg>
  )
}

function PracticeArt() {
  return (
    <svg viewBox="0 0 80 80" width="72" height="72" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="30" fill="var(--white)" stroke="var(--ink)" strokeWidth="4" />
      <circle cx="40" cy="40" r="19" fill="var(--coral)" stroke="var(--ink)" strokeWidth="4" />
      <circle cx="40" cy="40" r="8" fill="var(--white)" stroke="var(--ink)" strokeWidth="4" />
    </svg>
  )
}

function HomeCard({ to, tone, title, hint, art }) {
  return (
    <Link to={to} className={`home-card home-card--${tone}`}>
      {art}
      <span className="home-card__title">{title}</span>
      <span className="home-card__hint">{hint}</span>
    </Link>
  )
}

function WordOfTheDay({ word }) {
  const labelId = useId()
  return (
    <section className="word-of-day" aria-labelledby={labelId}>
      <div className="word-of-day__picture" aria-hidden="true">
        {word && <WordPicture word={word} size={54} framed={false} />}
      </div>
      <div className="word-of-day__text">
        <h2 id={labelId} className="word-of-day__label">
          Word of the day
        </h2>
        <span className="word-of-day__word">{word?.word ?? '…'}</span>
      </div>
      {word && <ListenButton text={word.word} label={`Listen to the word ${word.word}`} size={52} flat />}
    </section>
  )
}

export default function Home() {
  const { data: loadedProfile } = useApi(getProfile)
  const { data: wordOfTheDay } = useApi(getWordOfTheDay)
  const [savedProfile, setSavedProfile] = useState(null)
  const profile = savedProfile ?? loadedProfile

  async function rename(name) {
    setSavedProfile(await updateProfile({ name }))
  }

  async function startOver() {
    await resetProgress()
    setSavedProfile(await getProfile())
  }

  return (
    <Page background="var(--bg-home)" gap={20} className="home">
      <header className="home__top">
        <div className="home__menu">
          <UserMenu name={profile?.name ?? 'Buddy'} onRename={rename} onReset={startOver} />
        </div>
        <StarPill stars={profile?.stars ?? 0} />
      </header>

      <div className="home__hero">
        <div className="home__hero-text">
          <h1 className="home__title">Let’s learn English!</h1>
          <p className="home__subtitle">What do you want to play today?</p>
        </div>
        <Mascot size={92} />
      </div>

      <nav aria-label="Main" className="home__cards">
        <HomeCard to="/cards" tone="cards" title="Flash Cards" hint="Look, flip and say" art={<FlashCardsArt />} />
        <HomeCard to="/practice" tone="practice" title="Practice" hint="Play word games" art={<PracticeArt />} />
      </nav>

      <WordOfTheDay word={wordOfTheDay} />
    </Page>
  )
}
