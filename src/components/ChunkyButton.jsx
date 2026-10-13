import { Link } from 'react-router-dom'
import './components.css'

export default function ChunkyButton({
  variant = 'white',
  size = 'lg',
  flat = false,
  to,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = ['chunky-button', `chunky-button--${variant}`, `chunky-button--${size}`, flat && 'chunky-button--flat', className]
    .filter(Boolean)
    .join(' ')

  if (to !== undefined) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
