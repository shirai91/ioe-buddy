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
import { CheckIcon, CrossIcon, NextArrowIcon } from '../components/icons.jsx'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './PicturePick.css'

const EXAM_TYPE = 'picture-pick'

function pictureLabel(word) {
  const article = /^[aeiou]/i.test(word) ? 'an' : 'a'
  return `Picture of ${article} ${word}`
}

function feedbackFor(question, solved, pickedId) {
  if (solved) return { tone: 'success', text: `Great job! That is the ${question.word}.` }
  if (pickedId !== null) return { tone: 'oops', text: 'Oops! Try again.' }
  return { tone: 'neutral', text: 'Tap the right picture!' }
}

function choiceState(option, question, solved, pickedId) {
  if (solved && option.id === question.answerId) return 'right'
  if (pickedId === option.id) return 'wrong'
  return 'idle'
}

function ChoiceBadge({ state }) {
  if (state === 'idle') return null
  return (
    <span className={`picture-pick__badge picture-pick__badge--${state} pop`} aria-hidden="true">
      {state === 'right' ? <CheckIcon /> : <CrossIcon />}
    </span>
  )
}

function PictureChoices({ question, solved, pickedId, onPick }) {
  return (
    <div className="picture-pick__choices">
      {question.options.map((option) => {
        const state = choiceState(option, question, solved, pickedId)
        return (
          <button
            key={option.id}
            type="button"
            className={`picture-pick__choice picture-pick__choice--${state}`}
            aria-label={pictureLabel(option.word)}
            onClick={() => onPick(option)}
          >
            <WordPicture word={option} size={110} framed={false} />
            <ChoiceBadge state={state} />
          </button>
        )
      })}
    </div>
  )
}

function PicturePickGame({ questions, onCorrect, onFinish, onPlayAgain }) {
  const [index, setIndex] = useState(0)
  const [pickedId, setPickedId] = useState(null)
  const [solved, setSolved] = useState(false)
  const [missed, setMissed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = questions.length
  const question = questions[index]
  const isLastQuestion = index >= total - 1
  const feedback = feedbackFor(question, solved, pickedId)

  function pick(option) {
    if (solved) return
    setPickedId(option.id)
    if (option.id !== question.answerId) {
      setMissed(true)
      speak('Try again')
      return
    }
    setSolved(true)
    speak(`Great job! ${question.word}`)
    if (!missed) {
      setCorrect(correct + 1)
      onCorrect()
    }
  }

  function goNext() {
    if (!solved) return
    if (isLastQuestion) {
      setFinished(true)
      onFinish(correct, total)
      return
    }
    setIndex(index + 1)
    setPickedId(null)
    setSolved(false)
    setMissed(false)
  }

  if (finished) {
    return (
      <>
        <ProgressSegments total={total} current={index} finished />
        <ResultCard stars={correct} total={total} onPlayAgain={onPlayAgain} />
      </>
    )
  }

  return (
    <>
      <ProgressSegments total={total} current={index} />
      <section className="picture-pick__prompt" aria-label="Word to find">
        <p className="picture-pick__prompt-text">
          <span className="picture-pick__find">Find the…</span>
          <span className="picture-pick__word">{question.word}</span>
        </p>
        <ListenButton text={`Find the ${question.word}`} />
      </section>
      <PictureChoices key={question.id} question={question} solved={solved} pickedId={pickedId} onPick={pick} />
      <FeedbackBar tone={feedback.tone}>{feedback.text}</FeedbackBar>
      <div className="picture-pick__spacer" />
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

export default function PicturePick() {
  const [round, setRound] = useState(0)
  const [bankedStars, setBankedStars] = useState(null)
  const [earnedStars, setEarnedStars] = useState(0)
  const { data: profile } = useApi(getProfile)
  const { data: exam, error, loading, reload } = useApi(() => getExam(EXAM_TYPE), [round])
  const shownStars = (bankedStars ?? profile?.stars ?? 0) + earnedStars

  function finishRound(correct, total) {
    postExamResult(EXAM_TYPE, { correct, total }).then(
      ({ stars }) => {
        setBankedStars(stars)
        setEarnedStars((earned) => earned - correct)
      },
      () => {},
    )
  }

  function playAgain() {
    setRound(round + 1)
  }

  function renderBody() {
    if (loading) return <ExamMessage tone="neutral" text="Getting your pictures ready…" />
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
      <PicturePickGame
        key={round}
        questions={exam.questions}
        onCorrect={() => setEarnedStars((stars) => stars + 1)}
        onFinish={finishRound}
        onPlayAgain={playAgain}
      />
    )
  }

  return (
    <Page background="var(--bg-picture-pick)" className="picture-pick">
      <AppHeader title="Picture Pick" backTo="/practice" backLabel="Back to practice" stars={shownStars} />
      {renderBody()}
    </Page>
  )
}
