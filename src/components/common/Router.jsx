import { useState, useCallback, useEffect, createContext, useContext } from 'react'

const RouterContext = createContext({ pathname: '/', navigate: () => {} })

export function RouterProvider({ children }) {
  const [pathname, setPathname] = useState(window.location.hash.slice(1) || '/')

  useEffect(() => {
    const onHashChange = () => {
      setPathname(window.location.hash.slice(1) || '/')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((path) => {
    window.location.hash = path
    setPathname(path)
  }, [])

  return (
    <RouterContext.Provider value={{ pathname, navigate }}>
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
