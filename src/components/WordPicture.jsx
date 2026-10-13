import { useState } from 'react'
import { letterFor, letterTileColor } from '../lib/letterTile.js'
import './components.css'

export default function WordPicture({ word, size = 110, framed = true, alt = '', className = '' }) {
  const [failedImage, setFailedImage] = useState(null)
  const image = word?.image ?? null
  const showImage = image !== null && failedImage !== image
  const classes = ['word-picture', showImage && framed && 'word-picture--framed', className].filter(Boolean).join(' ')

  return (
    <div className={classes} style={{ '--picture-size': `${size}px` }}>
      {showImage ? (
        <img
          className="word-picture__image"
          src={image}
          alt={alt}
          draggable="false"
          loading="lazy"
          decoding="async"
          onError={() => setFailedImage(image)}
        />
      ) : (
        <span
          className="word-picture__letter-tile"
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : 'true'}
          style={{ '--letter-tile-bg': letterTileColor(word?.word) }}
        >
          {letterFor(word)}
        </span>
      )}
    </div>
  )
}
