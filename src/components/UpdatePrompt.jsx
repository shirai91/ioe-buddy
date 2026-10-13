import { useEffect, useState } from 'react'
import { installUpdate, onUpdateReady } from '../api/client.js'
import ChunkyButton from './ChunkyButton.jsx'
import { DownloadIcon, STAR_PATH } from './icons.jsx'
import './UpdatePrompt.css'

const MIN_BAR_PERCENT = 8

function percentOf(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 100
}

function Rocket() {
  return (
    <div className="update-prompt__badge" aria-hidden="true">
      <svg className="update-prompt__rocket" viewBox="0 0 120 120" width="112" height="112" focusable="false">
        <g stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round">
          <path d="M48 92 Q60 118 72 92 Z" fill="var(--sun)" />
          <path d="M44 70 L28 88 L44 88 Z" fill="var(--coral)" />
          <path d="M76 70 L92 88 L76 88 Z" fill="var(--coral)" />
          <path d="M60 10 C80 26 80 70 76 92 L44 92 C40 70 40 26 60 10 Z" fill="var(--white)" />
          <circle cx="60" cy="48" r="11" fill="var(--grape)" />
        </g>
        <circle cx="56" cy="45" r="3" fill="var(--white)" />
        <path d="M50 24 Q60 18 70 24" fill="none" stroke="var(--coral)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <svg className="update-prompt__star update-prompt__star--big" viewBox="0 0 24 24" focusable="false">
        <path d={STAR_PATH} fill="var(--sun)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="update-prompt__star update-prompt__star--small" viewBox="0 0 24 24" focusable="false">
        <path d={STAR_PATH} fill="var(--leaf)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function UpdateProgress({ percent }) {
  const label = percent >= 100 ? 'Starting the new version…' : `Updating… ${percent}%`
  return (
    <div className="update-prompt__progress" role="status" aria-live="polite">
      <div className="update-prompt__track" role="progressbar" aria-label="Update progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className="update-prompt__bar" style={{ width: `${Math.max(MIN_BAR_PERCENT, percent)}%` }} />
      </div>
      <span className="update-prompt__status">{label}</span>
      <span className="update-prompt__hint">Please keep the app open</span>
    </div>
  )
}

export default function UpdatePrompt() {
  const [updateReady, setUpdateReady] = useState(false)
  const [percent, setPercent] = useState(null)

  useEffect(() => onUpdateReady(() => setUpdateReady(true)), [])

  if (!updateReady) return null

  function startUpdate() {
    setPercent(0)
    installUpdate((done, total) => setPercent(percentOf(done, total)))
  }

  const isUpdating = percent !== null

  return (
    <div className="update-prompt">
      <div role="alertdialog" aria-modal="true" aria-labelledby="update-prompt-title" aria-describedby="update-prompt-message" className="update-prompt__card">
        <Rocket />
        <h2 id="update-prompt-title" className="update-prompt__title">
          Time to update!
        </h2>
        <p id="update-prompt-message" className="update-prompt__message">
          We made IOE Buddy even better. Update now to keep playing.
        </p>
        {isUpdating ? (
          <UpdateProgress percent={percent} />
        ) : (
          <>
            <ChunkyButton variant="leaf" className="update-prompt__button" onClick={startUpdate} autoFocus>
              <DownloadIcon />
              Update now
            </ChunkyButton>
            <p className="update-prompt__hint">Ask a grown-up if you need help.</p>
          </>
        )}
      </div>
    </div>
  )
}
