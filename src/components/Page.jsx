import './components.css'

export default function Page({ background = 'var(--bg-home)', gap = 16, className = '', children }) {
  return (
    <div className={`page ${className}`.trim()} style={{ '--page-bg': background }}>
      <main className="page__column" style={{ '--page-gap': `${gap}px` }}>
        {children}
      </main>
    </div>
  )
}
