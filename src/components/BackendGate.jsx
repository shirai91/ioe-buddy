import { useEffect, useState } from 'react'
import { onBackendStage, waitForBackend } from '../api/client.js'
import ChunkyButton from './ChunkyButton.jsx'
import Mascot from './Mascot.jsx'
import Page from './Page.jsx'
import './components.css'

export const SLOW_START_MS = 10000
export const GIVE_UP_MS = 60000

const STEPS = [
  { stage: 'opening', label: 'Opening the app…' },
  { stage: 'downloading', label: 'Downloading the app…' },
  { stage: 'starting', label: 'Almost ready…' },
]

function stepIndexOf(stage) {
  const index = STEPS.findIndex((step) => step.stage === stage)
  return index === -1 ? STEPS.length - 1 : index
}

function reloadPage() {
  window.location.reload()
}

function GateMessage({ title, message, children, bouncing = false }) {
  return (
    <Page className="backend-gate">
      <div className="backend-gate__body">
        <Mascot size={140} className={bouncing ? 'backend-gate__mascot' : undefined} />
        <h1 className="backend-gate__title">{title}</h1>
        <p className="backend-gate__message">{message}</p>
        {children}
      </div>
    </Page>
  )
}

function StartSteps({ stepIndex }) {
  const step = STEPS[stepIndex]
  return (
    <div className="backend-gate__steps">
      <div
        className="backend-gate__track"
        role="progressbar"
        aria-label="Starting IOE Buddy"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={stepIndex + 1}
        aria-valuetext={step.label}
      >
        {STEPS.map((candidate, index) => (
          <span
            key={candidate.stage}
            className="backend-gate__step"
            data-state={index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo'}
          />
        ))}
      </div>
      <p className="backend-gate__step-label" role="status">
        Step {stepIndex + 1} of {STEPS.length}: {step.label}
      </p>
    </div>
  )
}

function useElapsedFlag(delayMs, restartKey) {
  const [passedForKey, setPassedForKey] = useState(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setPassedForKey(restartKey), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs, restartKey])
  return passedForKey === restartKey
}

export default function BackendGate({ children }) {
  const [status, setStatus] = useState('starting')
  const [stage, setStage] = useState('opening')
  const [attempt, setAttempt] = useState(0)
  const isSlow = useElapsedFlag(SLOW_START_MS, attempt)
  const tookTooLong = useElapsedFlag(GIVE_UP_MS, attempt)

  useEffect(() => onBackendStage(setStage), [])

  useEffect(() => {
    let current = true
    waitForBackend().then(
      () => current && setStatus('ready'),
      () => current && setStatus('failed'),
    )
    return () => {
      current = false
    }
  }, [attempt])

  function retry() {
    setStatus('starting')
    setAttempt((count) => count + 1)
  }

  if (status === 'ready') return children

  if (status === 'failed') {
    return (
      <GateMessage title="Oh no!" message="IOE Buddy could not start. Please try again.">
        <ChunkyButton variant="sun" size="md" onClick={retry}>
          Try again
        </ChunkyButton>
      </GateMessage>
    )
  }

  if (tookTooLong) {
    return (
      <GateMessage title="Still not ready" message="The internet may be too slow right now. Reload to try again.">
        <ChunkyButton variant="sun" size="md" onClick={reloadPage}>
          Reload
        </ChunkyButton>
      </GateMessage>
    )
  }

  return (
    <GateMessage title="Getting ready…" message="Your word buddy is waking up!" bouncing>
      <StartSteps stepIndex={stepIndexOf(stage)} />
      {isSlow && (
        <div className="backend-gate__slow">
          <p className="backend-gate__message">This takes a little longer the first time. Please wait.</p>
          <ChunkyButton variant="white" size="sm" onClick={reloadPage}>
            Reload
          </ChunkyButton>
        </div>
      )}
    </GateMessage>
  )
}
