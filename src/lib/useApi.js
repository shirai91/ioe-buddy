import { useCallback, useEffect, useRef, useState } from 'react'

export function useApi(load, dependencies = []) {
  const loadRef = useRef(load)
  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState({ data: undefined, error: null, requestKey: null })
  const requestKey = JSON.stringify([...dependencies, reloadCount])

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let current = true
    Promise.resolve()
      .then(() => loadRef.current())
      .then(
        (data) => current && setResult({ data, error: null, requestKey }),
        (error) => current && setResult({ data: undefined, error, requestKey }),
      )
    return () => {
      current = false
    }
  }, [requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { data: result.data, error: result.error, loading: result.requestKey !== requestKey, reload }
}
