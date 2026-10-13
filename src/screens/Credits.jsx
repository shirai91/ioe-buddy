import { getCredits, getProfile } from '../api/client.js'
import AppHeader from '../components/AppHeader.jsx'
import Page from '../components/Page.jsx'
import WordPicture from '../components/WordPicture.jsx'
import { useApi } from '../lib/useApi.js'
import './Credits.css'

function sourceLinks(source = '') {
  return source
    .split(' + ')
    .map((link) => link.trim())
    .filter((link) => /^https?:\/\//.test(link))
}

function sourceName(index, count) {
  return count > 1 ? `Source ${index + 1}` : 'Source'
}

function BookArt() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 11 C12 8 18 8 24 12 C30 8 36 8 42 11 V38 C36 35 30 35 24 39 C18 35 12 35 6 38 Z" fill="var(--white)" />
      <path d="M24 12 V39" />
      <path d="M11 17 C14 16 17 16 19 17 M11 23 C14 22 17 22 19 23 M29 17 C31 16 34 16 37 17" />
    </svg>
  )
}

function SourceLinks({ word, source }) {
  const links = sourceLinks(source)
  if (links.length === 0) return null
  return (
    <span className="credit__links">
      {links.map((link, index) => (
        <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="credit__link" aria-label={`${sourceName(index, links.length)} for ${word} (opens a new tab)`}>
          {sourceName(index, links.length)}
        </a>
      ))}
    </span>
  )
}

function CreditItem({ credit }) {
  return (
    <li className="credit">
      <WordPicture word={{ word: credit.word, image: credit.image }} size={64} alt={`Picture of ${credit.word}`} />
      <div className="credit__text">
        <span className="credit__word">{credit.word}</span>
        {credit.author && <span className="credit__author">By {credit.author}</span>}
        <span className="credit__meta">
          {credit.license && <span className="credit__license">{credit.license}</span>}
          <SourceLinks word={credit.word} source={credit.source} />
        </span>
      </div>
    </li>
  )
}

function CreditList({ credits, error, loading }) {
  if (error) return <p className="credits__status">Oops! We could not load the credits.</p>
  if (loading && !credits) return <p className="credits__status">Loading…</p>
  if (!credits?.length) return null
  return (
    <ul className="credits__list" aria-label="Picture credits">
      {credits.map((credit) => (
        <CreditItem key={`${credit.word}-${credit.image}`} credit={credit} />
      ))}
    </ul>
  )
}

export default function Credits() {
  const { data: profile } = useApi(getProfile)
  const { data: credits, error, loading } = useApi(getCredits)

  return (
    <Page background="var(--bg-home)" gap={16}>
      <AppHeader title="Credits" backTo="/" backLabel="Back to home" stars={profile?.stars ?? 0} />

      <p className="credits__intro">Thank you to everyone who made our pictures!</p>

      <div className="credits__book">
        <span className="credits__book-art">
          <BookArt />
        </span>
        <p className="credits__book-text">Pictures from the Tieng Anh 1 Global Success book</p>
      </div>

      <CreditList credits={credits} error={error} loading={loading} />
    </Page>
  )
}
