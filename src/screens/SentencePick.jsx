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
import { GREAT_JOB, TRY_AGAIN } from '../lib/clips.js'
import { speak } from '../lib/speak.js'
import { useApi } from '../lib/useApi.js'
import './SentencePick.css'

const EXAM_TYPE = 'sentence-pick'
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const OPTION_BADGES = ['var(--sun)', 'var(--salmon)', 'var(--lilac)', 'var(--sky-blue)']

function feedbackFor(solved, picked) {
  if (solved) return { tone: 'success', text: 'Great job!' }
  if (picked !== null) return { tone: 'oops', text: 'Oops! Try again.' }
  return { tone: 'neutral', text: 'Which word fits?' }
}

function optionState(option, question, solved, picked) {
  if (solved && option.text === question.answer) return 'right'
  if (picked === option.text) return 'wrong'
  return 'idle'
}

function blankFor(question, solved, picked) {
  if (solved) return { state: 'solved', text: question.answer, animation: 'pop' }
  if (picked !== null) return { state: 'wrong', text: picked, animation: 'shake' }
  return { state: 'idle', text: '?', animation: '' }
}

function OptionBadge({ state }) {
  if (state === 'idle') return null
  return (
    <span className={`sentence-pick__badge sentence-pick__badge--${state} pop`} aria-hidden="true">
      {state === 'right' ? <CheckIcon size={20} /> : <CrossIcon size={18} />}
    </span>
  )
}

function CountPictures({ count }) {
  return (
    <div className="sentence-pick__count" role="img" aria-label={`${count.number} ${count.picture.word}`}>
      {Array.from({ length: count.number }, (_, pictureIndex) => (
        <WordPicture key={pictureIndex} word={count.picture} size={64} framed={false} />
      ))}
    </div>
  )
}

function SentenceCard({ question, solved, picked }) {
  const blank = blankFor(question, solved, picked)
  const blankClass = ['sentence-pick__blank', `sentence-pick__blank--${blank.state}`, blank.animation].filter(Boolean).join(' ')
  return (
    <section className="sentence-pick__card" aria-label="Sentence">
      <div className="sentence-pick__card-top">
        <span className="sentence-pick__label">Finish the sentence</span>
        <ListenButton
          text={solved ? question.sentence : question.prompt}
          label="Listen to the sentence"
          size={48}
          className="sentence-pick__listen"
        />
      </div>
      {question.count && <CountPictures count={question.count} />}
      <p className="sentence-pick__sentence">
        <span>{question.before}</span>
        <span key={blank.state} className={blankClass}>
          {blank.text}
        </span>
        <span>{question.after}</span>
      </p>
    </section>
  )
}

function SentenceOptions({ question, solved, picked, onPick }) {
  return (
    <div className="sentence-pick__options" role="group" aria-label="Answers">
      {question.options.map((option, optionIndex) => {
        const state = optionState(option, question, solved, picked)
        const letter = OPTION_LETTERS[optionIndex]
        return (
          <button
            key={option.text}
            type="button"
            className={`sentence-pick__option sentence-pick__option--${state}`}
            aria-label={`${letter}: ${option.text}`}
            onClick={() => onPick(option.text)}
          >
            <span className="sentence-pick__letter" aria-hidden="true" style={{ '--letter-bg': OPTION_BADGES[optionIndex] }}>
              {letter}
            </span>
            <span className="sentence-pick__option-text">{option.text}</span>
            {option.picture && <WordPicture word={option.picture} size={42} framed={false} />}
            <OptionBadge state={state} />
          </button>
        )
      })}
    </div>
  )
}

function SentencePickGame({ questions, starChange, onFinish, onPlayAgain }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [solved, setSolved] = useState(false)
  const [missed, setMissed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const total = questions.length
  const question = questions[index]
  const isLastQuestion = index >= total - 1
  const feedback = feedbackFor(solved, picked)

  function pick(option) {
    if (solved) return
    setPicked(option)
    if (option !== question.answer) {
      setMissed(true)
      speak(TRY_AGAIN)
      return
    }
    setSolved(true)
    speak(GREAT_JOB, question.sentence)
    if (!missed) setCorrect(correct + 1)
  }

  function goNext() {
    if (!solved) return
    if (isLastQuestion) {
      setFinished(true)
      onFinish(correct, total)
      return
    }
    setIndex(index + 1)
    setPicked(null)
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
      <SentenceCard key={question.id} question={question} solved={solved} picked={picked} />
      <SentenceOptions key={`${question.id}-options`} question={question} solved={solved} picked={picked} onPick={pick} />
      <FeedbackBar tone={feedback.tone} compact>
        {feedback.text}
      </FeedbackBar>
      <div className="sentence-pick__spacer" />
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

export default function SentencePick() {
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
    if (loading) return <ExamMessage tone="neutral" text="Getting your sentences ready…" />
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
        <ExamMessage tone="neutral" text="No sentences to play with yet.">
          <ChunkyButton size="sm" flat to="/practice">
            More games
          </ChunkyButton>
        </ExamMessage>
      )
    }
    return (
      <SentencePickGame
        key={round}
        questions={exam.questions}
        starChange={starChange}
        onFinish={finishRound}
        onPlayAgain={playAgain}
      />
    )
  }

  return (
    <Page background="var(--bg-sentence-pick)" className="sentence-pick">
      <AppHeader title="Sentence Quiz" backTo="/practice" backLabel="Back to practice" stars={shownStars} />
      {renderBody()}
    </Page>
  )
}
