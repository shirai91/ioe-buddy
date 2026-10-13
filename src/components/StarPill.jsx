import { StarIcon } from './icons.jsx'
import './components.css'

export default function StarPill({ stars = 0 }) {
  const label = `${stars} ${stars === 1 ? 'star' : 'stars'}`
  return (
    <div className="star-pill" role="img" aria-label={label}>
      <StarIcon />
      <span aria-hidden="true">{stars}</span>
    </div>
  )
}
