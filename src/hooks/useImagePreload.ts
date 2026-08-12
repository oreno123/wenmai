import { useEffect, useState } from 'react'

export function useImagePreload(urls: string[]): Record<string, boolean> {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    urls.forEach((url) => {
      if (loaded[url]) return
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setLoaded((prev) => ({ ...prev, [url]: true }))
      }
      img.src = url
    })
    return () => { cancelled = true }
  }, [urls.join(',')])

  return loaded
}
