import ChunkyButton from './ChunkyButton.jsx'
import Mascot from './Mascot.jsx'
import { StarIcon } from './icons.jsx'
import './components.css'

function starChangeText(change) {
  if (change === 0) return 'No star change'
  const sign = change > 0 ? '+' : '-'
  const count = Math.abs(change)
  return `${sign}${count} ${count === 1 ? 'star' : 'stars'}`
}

function starChangeTrend(change) {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'same'
}

function StarChange({ change }) {
  if (typeof change !== 'number') return null
  return <p className={`result-card__change result-card__change--${starChangeTrend(change)} pop`}>{starChangeText(change)}</p>
}

export default function ResultCard({ correct, total, change, onPlayAgain, moreTo = '/practice', moreLabel = 'More games' }) {
  return (
    <section className="result-card pop" aria-labelledby="result-card-title">
      <Mascot size={150} mood="cheer" />
      <h2 id="result-card-title" className="result-card__title">
        You did it!
      </h2>
      <p className="result-card__score">
        You got {correct} of {total} right
      </p>
      <div className="result-card__stars" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <StarIcon key={index} size={28} fill={index < correct ? 'var(--sun)' : 'var(--star-empty)'} />
        ))}
      </div>
      <StarChange change={change} />
      <div className="result-card__actions">
        <ChunkyButton variant="leaf" size="md" onClick={onPlayAgain}>
          Play again
        </ChunkyButton>
        <ChunkyButton variant="white" size="sm" flat to={moreTo}>
          {moreLabel}
        </ChunkyButton>
      </div>
    </section>
  )
}
