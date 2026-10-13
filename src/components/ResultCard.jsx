import ChunkyButton from './ChunkyButton.jsx'
import Mascot from './Mascot.jsx'
import { StarIcon } from './icons.jsx'
import './components.css'

export default function ResultCard({ stars, total, onPlayAgain, moreTo = '/practice', moreLabel = 'More games' }) {
  return (
    <section className="result-card pop" aria-labelledby="result-card-title">
      <Mascot size={150} mood="cheer" />
      <h2 id="result-card-title" className="result-card__title">
        You did it!
      </h2>
      <p className="result-card__score">
        You got {stars} of {total} stars
      </p>
      <div className="result-card__stars" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <StarIcon key={index} size={28} fill={index < stars ? 'var(--sun)' : 'var(--star-empty)'} />
        ))}
      </div>
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
