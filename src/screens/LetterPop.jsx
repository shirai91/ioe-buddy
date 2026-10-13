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
import { GREAT_JOB, TRY_AGAIN } from '../lib/clips.js'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './LetterPop.css'

const EXAM_TYPE = 'letter-pop'

function withoutLetterAt(letters, index) {
  return letters.filter((_, position) => position !== index).join('')
}

function feedbackFor(question, solved, hasWrongPick) {
  if (solved) return { tone: 'success', text: `Pop! The word is ${question.word}.` }
  if (hasWrongPick) return { tone: 'oops', text: 'Oops! Try another letter.' }
  return { tone: 'neutral', text: 'Tap the letter that does not belong' }
}

function LetterTiles({ question, solved, wrongPicks, onPick }) {
  if (solved) {
    return (
      <div className="letter-pop__tiles" role="group" aria-label="Letters">
        {[...question.word].map((letter, index) => (
          <span key={`solved-${index}`} className="letter-pop__tile letter-pop__tile--solved pop">
            {letter}
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className="letter-pop__tiles" role="group" aria-label="Letters">
      {question.letters.map((letter, index) => (
        <button
          key={index}
          type="button"
          className={`letter-pop__tile${wrongPicks.includes(index) ? ' letter-pop__tile--wrong' : ''}`}
          aria-label={`Letter ${letter}`}
          onClick={() => onPick(index)}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}

function LetterPopGame({ questions, starChange, onFinish, onPlayAgain }) {
  const [index, setIndex] = useState(0)
  const [wrongPicks, setWrongPicks] = useState([])
  const [solved, setSolved] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = questions.length
  const question = questions[index]
  const isLastQuestion = index >= total - 1
  const feedback = feedbackFor(question, solved, wrongPicks.length > 0)

  function pick(letterIndex) {
    if (solved || wrongPicks.includes(letterIndex)) return
    if (withoutLetterAt(question.letters, letterIndex) !== question.word) {
      setWrongPicks([...wrongPicks, letterIndex])
      speak(TRY_AGAIN)
      return
    }
    setSolved(true)
    speak(GREAT_JOB, question.word)
    if (wrongPicks.length === 0) setCorrect(correct + 1)
  }

  function goNext() {
    if (!solved) return
    if (isLastQuestion) {
      setFinished(true)
      onFinish(correct, total)
      return
    }
    setIndex(index + 1)
    setWrongPicks([])
    setSolved(false)
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
      <section className="letter-pop__card" aria-label="Word picture">
        <WordPicture word={question} size={150} alt={question.word} />
        <ListenButton text={question.word} size={56} className="letter-pop__listen" />
        <p className="letter-pop__prompt">One letter sneaked in. Pop it!</p>
      </section>
      <LetterTiles key={index} question={question} solved={solved} wrongPicks={wrongPicks} onPick={pick} />
      <FeedbackBar tone={feedback.tone}>{feedback.text}</FeedbackBar>
      <div className="letter-pop__spacer" />
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
      <FeedbackBar tone={tone}>{text}</FeedbackBar>
      {children}
    </>
  )
}

export default function LetterPop() {
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
      <LetterPopGame
        key={round}
        questions={exam.questions}
        starChange={starChange}
        onFinish={finishRound}
        onPlayAgain={playAgain}
      />
    )
  }

  return (
    <Page background="var(--bg-letter-pop)" className="letter-pop">
      <AppHeader title="Letter Pop" backTo="/practice" backLabel="Back to practice" stars={shownStars} />
      {renderBody()}
    </Page>
  )
}
