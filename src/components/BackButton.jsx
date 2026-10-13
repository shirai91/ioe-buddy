import { Link } from 'react-router-dom'
import { BackChevronIcon } from './icons.jsx'
import './components.css'

export default function BackButton({ to = '/', label = 'Back to home' }) {
  return (
    <Link to={to} aria-label={label} className="back-button">
      <BackChevronIcon />
    </Link>
  )
}
