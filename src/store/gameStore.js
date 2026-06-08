import { useState, useCallback } from 'react'

const STORAGE_KEY = 'wenmai_data'

const DAILY_FREE_PULLS = 10

const DEFAULT_DATA = {
  points: 1000,
  freePulls: DAILY_FREE_PULLS,
  library: ['basic-1', 'basic-2', 'basic-3'],
  series: {},
  dailyPull: { date: null, used: false },
  creations: [],
}

function checkDailyReset(data) {
  const today = new Date().toDateString()
  if (data.dailyPull.date !== today) {
    return { ...data, freePulls: DAILY_FREE_PULLS, dailyPull: { date: today, used: false } }
  }
  return data
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return checkDailyReset({ ...DEFAULT_DATA, ...JSON.parse(raw) })
  } catch {}
  return { ...DEFAULT_DATA }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useGameStore() {
  const [data, setDataState] = useState(loadData)

  const setData = useCallback((updater) => {
    setDataState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveData(next)
      return next
    })
  }, [])

  const addPoints = useCallback((amount) => {
    setData(d => ({ ...d, points: d.points + amount }))
  }, [setData])

  const spendPoints = useCallback((amount) => {
    setData(d => {
      if (d.points < amount) return d
      return { ...d, points: d.points - amount }
    })
  }, [setData])

  const addToLibrary = useCallback((patternId) => {
    setData(d => {
      if (d.library.includes(patternId)) return d
      return { ...d, library: [...d.library, patternId] }
    })
  }, [setData])

  const canPullToday = useCallback(() => {
    const today = new Date().toDateString()
    return data.dailyPull.date !== today
  }, [data.dailyPull])

  const recordPull = useCallback(() => {
    const today = new Date().toDateString()
    setData(d => ({
      ...d,
      dailyPull: { date: today, used: true },
      freePulls: Math.max(0, d.freePulls - 1),
    }))
  }, [setData])

  const doPull = useCallback(() => {
    const hasFreePull = data.freePulls > 0
    const cost = hasFreePull ? 0 : 10
    if (!hasFreePull && data.points < cost) return null

    setData(d => {
      const next = { ...d }
      if (!hasFreePull) next.points = d.points - cost
      else next.freePulls = d.freePulls - 1

      const today = new Date().toDateString()
      next.dailyPull = { date: today, used: true }
      return next
    })
    return true
  }, [data, setData])

  return {
    data,
    addPoints,
    spendPoints,
    addToLibrary,
    canPullToday,
    recordPull,
    doPull,
  }
}
