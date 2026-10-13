import { speak } from '../lib/speak.js'
import { SpeakerIcon } from './icons.jsx'
import './components.css'

export default function ListenButton({ text, label = 'Listen to the word', size = 60, flat = false, onListen, className = '', style }) {
  function handleClick() {
    speak(text)
    onListen?.()
  }

  const classes = ['listen-button', flat && 'listen-button--flat', className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} aria-label={label} onClick={handleClick} style={{ '--listen-size': `${size}px`, ...style }}>
      <SpeakerIcon size={Math.round(size / 2)} />
    </button>
  )
}
