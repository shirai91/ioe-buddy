import { useEffect, useState } from 'react'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import AppHeader from '../components/AppHeader.jsx'
import ChunkyButton from '../components/ChunkyButton.jsx'
import FeedbackBar from '../components/FeedbackBar.jsx'
import Page from '../components/Page.jsx'
import ProgressSegments from '../components/ProgressSegments.jsx'
import ResultCard from '../components/ResultCard.jsx'
import WordPicture from '../components/WordPicture.jsx'
import { NextArrowIcon } from '../components/icons.jsx'
import { GREAT_JOB, TRY_AGAIN } from '../lib/clips.js'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './MatchUp.css'

const EXAM_TYPE = 'match-up'
const WRONG_PAIR_MILLISECONDS = 700

function pictureLabel(word) {
  const article = /^[aeiou]/i.test(word) ? 'an' : 'a'
  return `Picture of ${article} ${word}`
}

function feedbackFor({ solved, wrongPair, selectedWord, selectedPictureId, matchedCount, pairCount }) {
  if (solved) return { tone: 'success', text: 'All matched! Super!' }
  if (wrongPair) return { tone: 'oops', text: 'Oops! Not a pair. Try again.' }
  if (selectedWord) return { tone: 'choose', text: `Now tap the picture of “${selectedWord.word}”` }
  if (selectedPictureId) return { tone: 'choose', text: 'Now tap the word for it' }
  if (matchedCount > 0) return { tone: 'neutral', text: `${matchedCount} of ${pairCount} pairs found` }
  return { tone: 'neutral', text: 'Tap a word, then its picture' }
}

function cellState({ matched, wrong, selected }) {
  if (matched) return 'matched'
  if (wrong) return 'wrong'
  if (selected) return 'selected'
  return 'idle'
}

function MatchCell({ state, label, onTap, children, kind }) {
  const animation = { matched: 'pop', wrong: 'match-up__cell--shake' }[state] ?? ''
  return (
    <button
      type="button"
      className={`match-up__cell match-up__cell--${kind} match-up__cell--${state} ${animation}`.trim()}
      aria-label={label}
      aria-pressed={state === 'selected'}
      disabled={state === 'matched'}
      onClick={onTap}
    >
      {children}
    </button>
  )
}

function useWrongPair() {
  const [wrongPair, setWrongPair] = useState(null)
  useEffect(() => {
    if (!wrongPair) return undefined
    const timer = setTimeout(() => setWrongPair(null), WRONG_PAIR_MILLISECONDS)
    return () => clearTimeout(timer)
  }, [wrongPair])
  return [wrongPair, setWrongPair]
}

function MatchUpGame({ rounds, onCorrect, onFinish, onPlayAgain }) {
  const [index, setIndex] = useState(0)
  const [selectedWordId, setSelectedWordId] = useState(null)
  const [selectedPictureId, setSelectedPictureId] = useState(null)
  const [matchedIds, setMatchedIds] = useState([])
  const [wrongPair, setWrongPair] = useWrongPair()
  const [missed, setMissed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = rounds.length
  const round = rounds[index]
  const pairCount = round.words.length
  const solved = matchedIds.length === pairCount
  const isLastRound = index >= total - 1
  const selectedWord = round.words.find((choice) => choice.id === selectedWordId) ?? null
  const feedback = feedbackFor({ solved, wrongPair, selectedWord, selectedPictureId, matchedCount: matchedIds.length, pairCount })

  function clearSelection() {
    setSelectedWordId(null)
    setSelectedPictureId(null)
  }

  function check(wordId, pictureId) {
    clearSelection()
    if (wordId !== pictureId) {
      setWrongPair({ wordId, pictureId })
      setMissed(true)
      speak(TRY_AGAIN)
      return
    }
    const matched = [...matchedIds, wordId]
    const roundSolved = matched.length === pairCount
    setMatchedIds(matched)
    setWrongPair(null)
    speak(roundSolved ? GREAT_JOB : round.words.find((choice) => choice.id === wordId).word)
    if (roundSolved && !missed) {
      setCorrect(correct + 1)
      onCorrect()
    }
  }

  function tapWord(choice) {
    if (matchedIds.includes(choice.id)) return
    speak(choice.word)
    if (selectedPictureId) {
      check(choice.id, selectedPictureId)
      return
    }
    setSelectedWordId(selectedWordId === choice.id ? null : choice.id)
    setWrongPair(null)
  }

  function tapPicture(choice) {
    if (matchedIds.includes(choice.id)) return
    if (selectedWordId) {
      check(selectedWordId, choice.id)
      return
    }
    setSelectedPictureId(selectedPictureId === choice.id ? null : choice.id)
    setWrongPair(null)
  }

  function goNext() {
    if (!solved) return
    if (isLastRound) {
      setFinished(true)
      onFinish(correct, total)
      return
    }
    setIndex(index + 1)
    clearSelection()
    setMatchedIds([])
    setWrongPair(null)
    setMissed(false)
  }

  if (finished) {
    return (
      <>
        <ProgressSegments total={total} current={index} finished unit="Round" />
        <ResultCard stars={correct} total={total} onPlayAgain={onPlayAgain} />
      </>
    )
  }

  return (
    <>
      <ProgressSegments total={total} current={index} unit="Round" />
      <div className="match-up__board" key={round.id}>
        {round.words.map((wordChoice, row) => {
          const pictureChoice = round.pictures[row]
          return [
            <MatchCell
              key={`word-${wordChoice.id}`}
              kind="word"
              label={`Word ${wordChoice.word}`}
              state={cellState({
                matched: matchedIds.includes(wordChoice.id),
                wrong: wrongPair?.wordId === wordChoice.id,
                selected: selectedWordId === wordChoice.id,
              })}
              onTap={() => tapWord(wordChoice)}
            >
              {wordChoice.word}
            </MatchCell>,
            <MatchCell
              key={`picture-${pictureChoice.id}`}
              kind="picture"
              label={pictureLabel(pictureChoice.word)}
              state={cellState({
                matched: matchedIds.includes(pictureChoice.id),
                wrong: wrongPair?.pictureId === pictureChoice.id,
                selected: selectedPictureId === pictureChoice.id,
              })}
              onTap={() => tapPicture(pictureChoice)}
            >
              <WordPicture word={pictureChoice} size={80} framed={false} />
            </MatchCell>,
          ]
        })}
      </div>
      <FeedbackBar tone={feedback.tone} compact>{feedback.text}</FeedbackBar>
      <div className="match-up__spacer" />
      <ChunkyButton variant="sun" disabled={!solved} onClick={goNext}>
        {isLastRound ? 'Finish' : 'Next round'}
        <NextArrowIcon />
      </ChunkyButton>
    </>
  )
}

function ExamMessage({ tone, text, children }) {
  return (
    <>
      <FeedbackBar tone={tone} compact>{text}</FeedbackBar>
      {children}
    </>
  )
}

export default function MatchUp() {
  const [game, setGame] = useState(0)
  const [bankedStars, setBankedStars] = useState(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const { data: profile } = useApi(getProfile)
  const { data: exam, error, loading, reload } = useApi(() => getExam(EXAM_TYPE), [game])
  const shownStars = (bankedStars ?? profile?.stars ?? 0) + earnedStars

  function finishGame(correct, total) {
    postExamResult(EXAM_TYPE, { correct, total }).then(
      ({ stars }) => {
        setBankedStars(stars)
        setEarnedStars((earned) => earned - correct)
      },
      () => {},
    )
  }

  function playAgain() {
    setGame(game + 1)
  }

  function renderBody() {
    if (loading) return <ExamMessage tone="neutral" text="Getting your pairs ready…" />
    if (error) {
      return (
        <ExamMessage tone="oops" text="Oh no! The game could not load.">
          <ChunkyButton variant="sun" size="md" onClick={reload}>
            Try again
          </ChunkyButton>
        </ExamMessage>
      )
    }
    if (!exam?.questions?.length) {
      return (
        <ExamMessage tone="neutral" text="No words to play with yet.">
          <ChunkyButton size="sm" flat to="/practice">
            More games
          </ChunkyButton>
        </ExamMessage>
      )
    }
    return (
      <MatchUpGame
        key={game}
        rounds={exam.questions}
        onCorrect={() => setEarnedStars((stars) => stars + 1)}
        onFinish={finishGame}
        onPlayAgain={playAgain}
      />
    )
  }

  return (
    <Page background="var(--bg-match-up)" className="match-up">
      <AppHeader title="Match Up" backTo="/practice" backLabel="Back to practice" stars={shownStars} />
      {renderBody()}
    </Page>
  )
}
