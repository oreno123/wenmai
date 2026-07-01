import { useState, useCallback, useEffect, createContext, useContext } from 'react'

// 解析当前 hash，分离 pathname + search
// 例：#/puzzle?fork=abc → { pathname: '/puzzle', search: '?fork=abc' }
function parseHash() {
  const raw = window.location.hash.slice(1) || '/'
  const [path, query = ''] = raw.split('?')
  return {
    pathname: path,
    search: query ? `?${query}` : '',
  }
}

const RouterContext = createContext({ pathname: '/', search: '', navigate: () => {} })

export function RouterProvider({ children }) {
  const [loc, setLoc] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => setLoc(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((path) => {
    window.location.hash = path
    setLoc(parseHash())
  }, [])

  return (
    <RouterContext.Provider value={{ pathname: loc.pathname, search: loc.search, navigate }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useLocation() {
  return useContext(RouterContext)
}

export function useNavigate() {
  return useContext(RouterContext).navigate
}
