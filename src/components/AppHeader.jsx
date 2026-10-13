import BackButton from './BackButton.jsx'
import StarPill from './StarPill.jsx'
import './components.css'

export default function AppHeader({ title, backTo = '/', backLabel = 'Back to home', stars, children }) {
  const showStars = children === undefined && typeof stars === 'number'
  return (
    <header className="app-header">
      <BackButton to={backTo} label={backLabel} />
      <h1 className="app-header__title">{title}</h1>
      {showStars ? <StarPill stars={stars} /> : children}
    </header>
  )
}
