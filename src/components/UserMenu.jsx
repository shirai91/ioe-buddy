import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ChunkyButton from './ChunkyButton.jsx'
import { CheckIcon, RefreshIcon } from './icons.jsx'
import './UserMenu.css'

const MAX_NAME_LENGTH = 20
const MENU_VIEW = 'menu'
const RENAME_VIEW = 'rename'
const CONFIRM_RESET_VIEW = 'confirm-reset'

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 18) return 'Good afternoon!'
  return 'Good evening!'
}

function currentGreeting() {
  return greetingFor(new Date())
}

function Avatar({ small = false }) {
  const iconSize = small ? 24 : 32
  return (
    <span aria-hidden="true" className={`user-menu__avatar${small ? ' user-menu__avatar--small' : ''}`}>
      <svg viewBox="0 0 40 40" width={iconSize} height={iconSize} focusable="false">
        <circle cx="20" cy="15" r="7" fill="var(--white)" stroke="var(--ink)" strokeWidth="3" />
        <path d="M7 36 C9 26 31 26 33 36" fill="var(--white)" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`user-menu__chevron${open ? ' user-menu__chevron--open' : ''}`}
    >
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20 L5 15 L15.5 4.5 L19.5 8.5 L9 19 Z" fill="var(--sun)" />
      <path d="M13 7 L17 11" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="var(--coral)" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round">
      <path d="M12 20 C6 15.5 3 12.5 3 8.8 A4.6 4.6 0 0 1 12 7 A4.6 4.6 0 0 1 21 8.8 C21 12.5 18 15.5 12 20 Z" />
    </svg>
  )
}

function RenameForm({ name, onSave, onCancel }) {
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef(null)
  const inputId = useId()
  const trimmedDraft = draft.trim()

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!trimmedDraft || saving) return
    if (trimmedDraft === name) {
      onCancel()
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await onSave(trimmedDraft)
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <form className="user-menu__rename" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="user-menu__rename-label">
        Your name
      </label>
      <div className="user-menu__rename-row">
        <input
          id={inputId}
          ref={inputRef}
          className="user-menu__name-input"
          value={draft}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="user-menu__save-button" aria-label="Save name" disabled={!trimmedDraft || saving}>
          <CheckIcon size={22} />
        </button>
      </div>
      {failed && (
        <p className="user-menu__error" role="alert">
          Oops! Please try again.
        </p>
      )}
    </form>
  )
}

function ConfirmReset({ onConfirm, onCancel }) {
  const [resetting, setResetting] = useState(false)
  const [failed, setFailed] = useState(false)
  const keepButtonRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    keepButtonRef.current?.focus()
  }, [])

  async function confirm() {
    setResetting(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      setFailed(true)
      setResetting(false)
    }
  }

  return (
    <div className="user-menu__confirm pop" role="group" aria-labelledby={titleId}>
      <RefreshIcon size={40} strokeWidth="2.6" />
      <h2 id={titleId} className="user-menu__confirm-title">
        Start over?
      </h2>
      <p className="user-menu__confirm-text">All your stars and card progress will go away.</p>
      {failed && (
        <p className="user-menu__error" role="alert">
          Oops! Please try again.
        </p>
      )}
      <ChunkyButton variant="coral" size="sm" className="user-menu__confirm-button" onClick={confirm} disabled={resetting}>
        Yes, start over
      </ChunkyButton>
      <ChunkyButton ref={keepButtonRef} variant="white" size="sm" flat className="user-menu__confirm-button" onClick={onCancel} disabled={resetting}>
        No, keep them
      </ChunkyButton>
    </div>
  )
}

export default function UserMenu({ name = 'Buddy', onRename, onReset }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(MENU_VIEW)
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const panelId = useId()
  const [greeting] = useState(currentGreeting)

  function closeMenu() {
    setOpen(false)
    setView(MENU_VIEW)
  }

  function toggleMenu() {
    if (open) closeMenu()
    else setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined

    function closeOnOutsidePointer(event) {
      if (rootRef.current?.contains(event.target)) return
      setOpen(false)
      setView(MENU_VIEW)
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return
      setOpen(false)
      setView(MENU_VIEW)
      toggleRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function saveName(newName) {
    await onRename?.(newName)
    setView(MENU_VIEW)
  }

  async function confirmReset() {
    await onReset?.()
    closeMenu()
    toggleRef.current?.focus()
  }

  const isRenaming = view === RENAME_VIEW
  const isConfirmingReset = view === CONFIRM_RESET_VIEW

  return (
    <div ref={rootRef} className="user-menu">
      <button
        ref={toggleRef}
        type="button"
        className={`user-menu__toggle${open ? ' user-menu__toggle--open' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleMenu}
      >
        <Avatar />
        <span className="user-menu__hello">
          <span className="user-menu__greeting">{greeting}</span>
          <span className="user-menu__hi">Hi, {name}!</span>
        </span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div id={panelId} className="user-menu__panel drop" role="group" aria-label="Account">
          {isConfirmingReset ? (
            <ConfirmReset onConfirm={confirmReset} onCancel={() => setView(MENU_VIEW)} />
          ) : (
            <>
              <div className="user-menu__profile">
                <Avatar small />
                {isRenaming ? (
                  <RenameForm name={name} onSave={saveName} onCancel={() => setView(MENU_VIEW)} />
                ) : (
                  <>
                    <span className="user-menu__profile-text">
                      <span className="user-menu__name">{name}</span>
                      <span className="user-menu__role">Learning English</span>
                    </span>
                    <button type="button" className="user-menu__edit-button" aria-label="Change name" onClick={() => setView(RENAME_VIEW)}>
                      <PencilIcon />
                    </button>
                  </>
                )}
              </div>
              <Link to="/credits" className="user-menu__item" onClick={closeMenu}>
                <HeartIcon />
                Credits
              </Link>
              <button type="button" className="user-menu__item" onClick={() => setView(CONFIRM_RESET_VIEW)}>
                <RefreshIcon size={24} strokeWidth="2.6" />
                Reset progress
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
