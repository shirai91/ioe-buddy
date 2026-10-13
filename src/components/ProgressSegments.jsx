import './components.css'

function segmentState(index, current, finished) {
  if (finished || index < current) return 'done'
  if (index === current) return 'current'
  return 'todo'
}

export default function ProgressSegments({ total = 10, current = 0, finished = false, unit = 'Question' }) {
  const shownNumber = Math.min(current + 1, total)
  const label = finished ? `All ${total} done` : `${unit} ${shownNumber} of ${total}`
  return (
    <div
      className="progress-segments"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={finished ? total : current}
      aria-valuetext={label}
      style={{ '--segment-count': total }}
    >
      {Array.from({ length: total }, (_, index) => segmentState(index, current, finished)).map((state, index) => (
        <span key={index} data-state={state} className={`progress-segments__segment progress-segments__segment--${state}`} />
      ))}
    </div>
  )
}
