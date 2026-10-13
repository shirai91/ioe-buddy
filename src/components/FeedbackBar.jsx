import './components.css'

export default function FeedbackBar({ tone = 'neutral', compact = false, children }) {
  const sizeClass = compact ? ' feedback-bar--compact' : ''
  return (
    <div role="status" className={`feedback-bar feedback-bar--${tone}${sizeClass}`}>
      {children}
    </div>
  )
}
