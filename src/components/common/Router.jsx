import { useState, useCallback, createContext, useContext } from 'react'

const RouterContext = createContext({ pathname: '/', navigate: () => {} })

export function RouterProvider({ children }) {
  const [pathname, setPathname] = useState(window.location.hash.slice(1) || '/')

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
