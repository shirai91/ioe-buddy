import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getFlashcards, rateCard } from '../api/client.js'
import AppHeader from '../components/AppHeader.jsx'
import ChunkyButton from '../components/ChunkyButton.jsx'
import ListenButton from '../components/ListenButton.jsx'
import Mascot from '../components/Mascot.jsx'
import Page from '../components/Page.jsx'
import WordPicture from '../components/WordPicture.jsx'
import { RefreshIcon } from '../components/icons.jsx'
import { LETTER_TILE_COLORS } from '../lib/letterTile.js'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './FlashCards.css'

const RATINGS = [
  { level: 'easy', title: 'Easy', hint: 'I know it!', cheer: 'Super!' },
  { level: 'medium', title: 'Medium', hint: 'Almost', cheer: 'Good try!' },
  { level: 'hard', title: 'Hard', hint: 'Not yet', cheer: 'We will practice it again.' },
]

const FACE_MOUTHS = {
  easy: <path d="M12 23 Q20 32 28 23" />,
  medium: <path d="M13 26 L27 26" />,
  hard: <path d="M12 28 Q16 23 20 27 Q24 31 28 26" strokeLinejoin="round" />,
}

function wordFontSize(word) {
  if (word.length <= 5) return 76
  if (word.length <= 8) return 60
  return 48
}

function cardColor(cardIndex) {
  return LETTER_TILE_COLORS[cardIndex % LETTER_TILE_COLORS.length]
}

function isNewWord(card) {
  return card.kind === 'new'
}

function isTrickyRating(level) {
  return level === 'medium' || level === 'hard'
}

function trickyCards(cards, ratings) {
  const latestRatingByWordId = new Map()
  for (const card of cards) {
    if (ratings[card.key]) latestRatingByWordId.set(card.id, ratings[card.key])
  }
  const trickyWordIdsNotYetPicked = new Set([...latestRatingByWordId].filter(([, level]) => isTrickyRating(level)).map(([wordId]) => wordId))
  return cards.filter((card) => trickyWordIdsNotYetPicked.delete(card.id)).map((card) => ({ ...card, kind: 'tricky' }))
}

function freshRound(deck, deal) {
  return { deck, position: 0, flipped: false, finished: false, ratings: {}, deal }
}

function countRatings(ratings) {
  const counts = { easy: 0, medium: 0, hard: 0 }
  for (const level of Object.values(ratings)) counts[level] += 1
  return counts
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'previous' ? 'M15 5 L8 12 L15 19' : 'M9 5 L16 12 L9 19'} />
    </svg>
  )
}

function FaceIcon({ level }) {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round">
      <circle cx="20" cy="20" r="17" fill="var(--white)" />
      <circle cx="14" cy="16" r="2.2" fill="var(--ink)" stroke="none" />
      <circle cx="26" cy="16" r="2.2" fill="var(--ink)" stroke="none" />
      {FACE_MOUTHS[level]}
    </svg>
  )
}

function TapHint({ children }) {
  return (
    <span className="flash-card__hint">
      <RefreshIcon size={22} strokeWidth="2.6" />
      {children}
    </span>
  )
}

function NewWordSticker() {
  return (
    <span className="flash-card__sticker" aria-hidden="true">
      New word!
    </span>
  )
}

function cardLabel(card, flipped) {
  const sideLabel = flipped ? `Word: ${card.word}. ${card.sentence} Tap to see the picture` : 'Picture card. Tap to see the word'
  return isNewWord(card) ? `New word! ${sideLabel}` : sideLabel
}

function CardFaces({ card, color, flipped, onFlip, animateDeal }) {
  const label = cardLabel(card, flipped)
  return (
    <button type="button" className={`flash-card${animateDeal ? ' deal' : ''}`} aria-label={label} onClick={onFlip} style={{ '--card-bg': color }}>
      <div className={`flash-card__turn${flipped ? ' flash-card__turn--flipped' : ''}`}>
        <div className="flash-card__face flash-card__face--front" aria-hidden={flipped ? 'true' : 'false'}>
          {isNewWord(card) && <NewWordSticker />}
          <div className="flash-card__picture-frame">
            <WordPicture word={card} size={176} framed={false} />
          </div>
          <TapHint>Tap to see the word</TapHint>
        </div>
        <div className="flash-card__face flash-card__face--back" aria-hidden={flipped ? 'false' : 'true'}>
          <span className="flash-card__letter">{card.letter}</span>
          <span className="flash-card__word" style={{ '--word-size': `${wordFontSize(card.word)}px` }}>
            {card.word}
          </span>
          <span className="flash-card__sentence">{card.sentence}</span>
          <TapHint>Tap to see the picture</TapHint>
        </div>
      </div>
    </button>
  )
}

function FrontControls({ card, onPrevious, onFlip, onNext }) {
  return (
    <>
      <div className="flash-cards__prompt">
        <ListenButton text={card.word} size={52} className="flash-cards__listen" />
        <span className="flash-cards__prompt-text">What is it? Say it out loud!</span>
      </div>
      <div className="flash-cards__nav">
        <button type="button" className="flash-cards__round flash-cards__round--previous" aria-label="Previous card" onClick={onPrevious}>
          <ChevronIcon direction="previous" />
        </button>
        <button type="button" className="flash-cards__flip" onClick={onFlip}>
          <RefreshIcon size={28} strokeWidth="2.6" />
          Flip
        </button>
        <button type="button" className="flash-cards__round flash-cards__round--next" aria-label="Next card" onClick={onNext}>
          <ChevronIcon direction="next" />
        </button>
      </div>
    </>
  )
}

function BackControls({ card, onRate }) {
  return (
    <>
      <div className="flash-cards__prompt rise">
        <ListenButton text={`${card.word}. ${card.sentence}`} label="Listen to the word and sentence" size={52} className="flash-cards__listen" />
        <span className="flash-cards__prompt-text">Do you know this word?</span>
      </div>
      <div className="flash-cards__ratings rise" role="group" aria-label="Rate this card">
        {RATINGS.map(({ level, title, hint }) => (
          <button key={level} type="button" className={`flash-cards__rate flash-cards__rate--${level}`} onClick={() => onRate(level)}>
            <FaceIcon level={level} />
            <span className="flash-cards__rate-title">{title}</span>
            <span className="flash-cards__rate-hint">{hint}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function FinishedSummary({ counts, trickyCount, onReviewTricky, onRestart }) {
  return (
    <section className="flash-cards__finished pop" aria-labelledby="flash-cards-finished-title">
      <Mascot size={120} mood="cheer" />
      <h2 id="flash-cards-finished-title" className="flash-cards__finished-title">
        All cards done!
      </h2>
      <div className="flash-cards__counts">
        {RATINGS.map(({ level, title }) => (
          <div key={level} className={`flash-cards__count flash-cards__count--${level}`}>
            <span className="flash-cards__count-number">{counts[level]}</span>
            <span className="flash-cards__count-label">{title}</span>
          </div>
        ))}
      </div>
      {trickyCount > 0 && (
        <ChunkyButton variant="sun" className="flash-cards__tricky" onClick={onReviewTricky}>
          Practice tricky words ({trickyCount})
        </ChunkyButton>
      )}
      <ChunkyButton variant="white" size="sm" className="flash-cards__restart" onClick={onRestart}>
        New cards
      </ChunkyButton>
      <Link to="/" className="flash-cards__home">
        Go home
      </Link>
    </section>
  )
}

function ProgressDots({ total, position, finished }) {
  return (
    <div className="flash-cards__dots" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={[
            'flash-cards__dot',
            !finished && index === position && 'flash-cards__dot--current',
            (finished || index <= position) && 'flash-cards__dot--seen',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}

function CounterPill({ text }) {
  return <span className="flash-cards__counter">{text}</span>
}

function FlashCardSession({ cards, onNewCards }) {
  const [round, setRound] = useState(() => freshRound(cards, 0))
  const { deck, position, flipped, finished, ratings, deal } = round
  const card = deck[Math.min(position, deck.length - 1)]
  const colorIndex = cards.findIndex((sessionCard) => sessionCard.key === card.key)
  const trickyDeck = trickyCards(deck, ratings)

  function flip() {
    if (!flipped) speak(card.word)
    setRound({ ...round, flipped: !flipped })
  }

  function go(step) {
    const size = deck.length
    setRound({ ...round, position: (position + step + size) % size, flipped: false, deal: deal + 1 })
  }

  function rate(level) {
    speak(RATINGS.find((rating) => rating.level === level).cheer)
    rateCard(card.id, level).catch(() => {})
    const nextRatings = { ...ratings, [card.key]: level }
    if (position >= deck.length - 1) setRound({ ...round, ratings: nextRatings, flipped: false, finished: true })
    else setRound({ ...round, ratings: nextRatings, position: position + 1, flipped: false, deal: deal + 1 })
  }

  const counter = finished ? 'Done' : `${position + 1} / ${deck.length}`

  return (
    <>
      <AppHeader title="Flash Cards" backTo="/" backLabel="Back to home">
        <CounterPill text={counter} />
      </AppHeader>
      <ProgressDots total={deck.length} position={position} finished={finished} />
      {finished ? (
        <FinishedSummary
          counts={countRatings(ratings)}
          trickyCount={trickyDeck.length}
          onReviewTricky={() => setRound(freshRound(trickyDeck, deal + 1))}
          onRestart={onNewCards}
        />
      ) : (
        <>
          <CardFaces key={`${card.key}:${deal}`} card={card} color={cardColor(colorIndex)} flipped={flipped} onFlip={flip} animateDeal={deal > 0} />
          <div className="flash-cards__controls">
            {flipped ? (
              <BackControls card={card} onRate={rate} />
            ) : (
              <FrontControls card={card} onPrevious={() => go(-1)} onFlip={flip} onNext={() => go(1)} />
            )}
          </div>
        </>
      )}
    </>
  )
}

function StatusMessage({ title, message, children }) {
  return (
    <>
      <AppHeader title="Flash Cards" backTo="/" backLabel="Back to home" />
      <div className="flash-cards__status" role="status">
        <Mascot size={120} />
        <h2 className="flash-cards__status-title">{title}</h2>
        {message && <p className="flash-cards__status-message">{message}</p>}
        {children}
      </div>
    </>
  )
}

function FlashCardsContent({ data, error, loading, reload }) {
  if (error) {
    return (
      <StatusMessage title="Oh no!" message="We could not load your cards.">
        <ChunkyButton variant="sun" size="md" onClick={reload}>
          Try again
        </ChunkyButton>
      </StatusMessage>
    )
  }
  if (loading || !data) return <StatusMessage title="Dealing cards…" />
  if (data.cards.length === 0) {
    return (
      <StatusMessage title="No cards yet" message="New words are on the way. Come back soon!">
        <ChunkyButton variant="sun" size="md" to="/">
          Go home
        </ChunkyButton>
      </StatusMessage>
    )
  }
  return <FlashCardSession cards={data.cards} onNewCards={reload} />
}

export default function FlashCards() {
  const flashcards = useApi(() => getFlashcards())
  return (
    <Page background="var(--bg-cards)" gap={18}>
      <FlashCardsContent {...flashcards} />
    </Page>
  )
}
