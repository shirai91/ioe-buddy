import { useState } from 'react'
import { getExam, getProfile, postExamResult } from '../api/client.js'
import AppHeader from '../components/AppHeader.jsx'
import ChunkyButton from '../components/ChunkyButton.jsx'
import FeedbackBar from '../components/FeedbackBar.jsx'
import ListenButton from '../components/ListenButton.jsx'
import Page from '../components/Page.jsx'
import ProgressSegments from '../components/ProgressSegments.jsx'
import ResultCard from '../components/ResultCard.jsx'
import WordPicture from '../components/WordPicture.jsx'
import { NextArrowIcon } from '../components/icons.jsx'
import { GREAT_JOB } from '../lib/clips.js'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './FillIn.css'

const EXAM_TYPE = 'fill-in'

function feedbackFor(question, solved, wrong) {
  if (solved) return { tone: 'success', text: `Great job! It says ${question.word}.` }
  if (wrong) return { tone: 'oops', text: 'Oops! Tap a box to change it.' }
  const text = question.blanks.length === 1 ? 'Find the missing letter' : `Find the ${question.blanks.length} missing letters`
  return { tone: 'neutral', text }
}

function slotStateClass(filled, solved, wrong) {
  if (solved) return ' fill-in__blank--solved'
  if (wrong) return ' fill-in__blank--wrong'
  if (filled) return ' fill-in__blank--filled'
  return ''
}

function slotsAnimationClass(solved, wrong) {
  if (wrong) return ' fill-in__slots--shake'
  if (solved) return ' pop'
  return ''
}

function WordSlots({ question, filledTiles, solved, wrong, onClear }) {
  const letters = [...question.word]
  return (
    <div className={`fill-in__slots${slotsAnimationClass(solved, wrong)}`} style={{ '--slot-count': letters.length }}>
      {letters.map((letter, position) => {
        if (!question.blanks.includes(position)) {
          return (
            <span key={position} className="fill-in__fixed">
              {letter}
            </span>
          )
        }
        const tileIndex = filledTiles[position]
        const filledLetter = tileIndex === undefined ? '' : question.tiles[tileIndex]
        return (
          <button
            key={position}
            type="button"
            className={`fill-in__blank${slotStateClass(filledLetter !== '', solved, wrong)}`}
            aria-label={filledLetter ? `Letter ${filledLetter}, tap to remove` : 'Empty box'}
            onClick={() => onClear(position)}
          >
            {filledLetter}
          </button>
        )
      })}
    </div>
  )
}

function LetterTiles({ question, usedTiles, solved, onPick }) {
  return (
    <div className="fill-in__tiles" role="group" aria-label="Letters">
      {question.tiles.map((letter, tileIndex) => {
        const used = usedTiles.includes(tileIndex)
        return (
          <button
            key={tileIndex}
            type="button"
            className={`fill-in__tile${used ? ' fill-in__tile--used' : ''}`}
            aria-label={`Letter ${letter}`}
            disabled={used || solved}
            onClick={() => onPick(tileIndex)}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}

function FillInGame({ questions, starChange, onFinish, onPlayAgain }) {
  const [index, setIndex] = useState(0)
  const [filledTiles, setFilledTiles] = useState({})
  const [wrong, setWrong] = useState(false)
  const [solved, setSolved] = useState(false)
  const [missed, setMissed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = questions.length
  const question = questions[index]
  const isLastQuestion = index >= total - 1
  const usedTiles = Object.values(filledTiles)
  const feedback = feedbackFor(question, solved, wrong)

  function pickTile(tileIndex) {
    if (solved || usedTiles.includes(tileIndex)) return
    const emptyBlank = question.blanks.find((position) => filledTiles[position] === undefined)
    if (emptyBlank === undefined) return
    const nextFilled = { ...filledTiles, [emptyBlank]: tileIndex }
    setFilledTiles(nextFilled)
    speak(question.tiles[tileIndex])
    const allFilled = question.blanks.every((position) => nextFilled[position] !== undefined)
    if (!allFilled) {
      setWrong(false)
      return
    }
    const spelledRight = question.blanks.every((position) => question.tiles[nextFilled[position]] === question.word[position])
    if (!spelledRight) {
      setWrong(true)
      setMissed(true)
      return
    }
    setSolved(true)
    setWrong(false)
    speak(GREAT_JOB, question.word)
    if (!missed) setCorrect(correct + 1)
  }

  function clearBlank(position) {
    if (solved || filledTiles[position] === undefined) return
    const remaining = { ...filledTiles }
    delete remaining[position]
    setFilledTiles(remaining)
    setWrong(false)
  }

  function goNext() {
    if (!solved) return
    if (isLastQuestion) {
      setFinished(true)
      onFinish(correct, total)
      return
    }
    setIndex(index + 1)
    setFilledTiles({})
    setWrong(false)
    setSolved(false)
    setMissed(false)
  }

  if (finished) {
    return (
      <>
        <ProgressSegments total={total} current={index} finished />
        <ResultCard correct={correct} total={total} change={starChange} onPlayAgain={onPlayAgain} />
      </>
    )
  }

  return (
    <>
      <ProgressSegments total={total} current={index} />
      <section className="fill-in__card" aria-label="Word picture">
        <WordPicture word={question} size={130} alt={question.word} />
        <ListenButton text={question.word} size={56} className="fill-in__listen" />
        <WordSlots key={index} question={question} filledTiles={filledTiles} solved={solved} wrong={wrong} onClear={clearBlank} />
      </section>
      <LetterTiles key={`tiles-${index}`} question={question} usedTiles={usedTiles} solved={solved} onPick={pickTile} />
      <FeedbackBar tone={feedback.tone} compact>{feedback.text}</FeedbackBar>
      <div className="fill-in__spacer" />
      <ChunkyButton variant="sun" disabled={!solved} onClick={goNext}>
        {isLastQuestion ? 'Finish' : 'Next'}
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

export default function FillIn() {
  const [round, setRound] = useState(0)
  const [bankedStars, setBankedStars] = useState(null)
  const [starChange, setStarChange] = useState(null)
  const { data: profile } = useApi(getProfile)
  const { data: exam, error, loading, reload } = useApi(() => getExam(EXAM_TYPE), [round])
  const shownStars = bankedStars ?? profile?.stars ?? 0

  function finishRound(correct, total) {
    postExamResult(EXAM_TYPE, { correct, total }).then(
      ({ stars, change }) => {
        setBankedStars(stars)
        setStarChange(change)
      },
      () => {},
    )
  }

  function playAgain() {
    setStarChange(null)
    setRound(round + 1)
  }

  function renderBody() {
    if (loading) return <ExamMessage tone="neutral" text="Getting your words ready…" />
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
      <FillInGame
        key={round}
        questions={exam.questions}
        starChange={starChange}
        onFinish={finishRound}
        onPlayAgain={playAgain}
      />
    )
  }

  return (
    <Page background="var(--bg-fill-in)" className="fill-in">
      <AppHeader title="Fill In" backTo="/practice" backLabel="Back to practice" stars={shownStars} />
      {renderBody()}
    </Page>
  )
}
