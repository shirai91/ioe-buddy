import { useEffect, useState } from 'react'
import { waitForBackend } from '../api/client.js'
import ChunkyButton from './ChunkyButton.jsx'
import Mascot from './Mascot.jsx'
import Page from './Page.jsx'
import './components.css'

function GateMessage({ title, message, children, bouncing = false }) {
  return (
    <Page className="backend-gate">
      <div className="backend-gate__body" role="status">
        <Mascot size={140} className={bouncing ? 'backend-gate__mascot' : undefined} />
        <h1 className="backend-gate__title">{title}</h1>
        <p className="backend-gate__message">{message}</p>
        {children}
      </div>
    </Page>
  )
}

export default function BackendGate({ children }) {
  const [status, setStatus] = useState('starting')
  const [attempt, setAttempt] = useState(0)

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

  return <GateMessage title="Getting ready…" message="Your word buddy is waking up!" bouncing />
}
