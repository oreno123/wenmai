import { useState, useCallback } from 'react'
import { DAILY_FREE_PULLS, INITIAL_POINTS, STORAGE_KEY, MAX_STORAGE_BYTES, PULL_COST, MAX_CREATIONS, TEN_PULL_COST } from '../constants'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Module-level: when set, every setData triggers a debounced push to the
// user's profile row in Supabase. App.tsx sets this via setSyncUser.
let syncUserId: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

export function setSyncUser(userId: string | null) {
  syncUserId = userId
  if (!userId && pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
}

async function pushToCloud(userId: string, data: GameData) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    points: data.points,
    free_pulls: data.freePulls,
    pity_counter: data.pityCounter,
    daily_pull_date: data.dailyPull.date,
    library: data.library,
    creations: data.creations,
    updated_at: new Date().toISOString(),
  })
  if (error) console.warn('[sync] push failed:', error.message)
}

// ── Types ──────────────────────────────────────────────

interface DailyPull {
  date: string | null
  used: boolean
}

interface Placement {
  id: string
  x: number
  y: number
  size: number
  rotation?: number
  scale?: number
}

interface Creation {
  id: string
  image: string
  source: string
  createdAt: string
  placements?: Placement[]
}

export interface GameData {
  points: number
  freePulls: number
  library: string[]
  series: Record<string, unknown>
  dailyPull: DailyPull
  creations: Creation[]
  pityCounter: number
}

export interface GameStore {
  data: GameData
  addPoints: (amount: number) => void
  spendPoints: (amount: number) => void
  addToLibrary: (patternId: string) => void
  canPullToday: () => boolean
  recordPull: () => void
  doPull: () => true | null
  doTenPull: () => true | null
  incrementPity: () => void
  resetPity: () => void
  saveCreation: (imageDataUrl: string, source?: string, placements?: Placement[]) => string
  deleteCreation: (creationId: string) => void
  syncFromCloud: (userId: string) => Promise<void>
  resetLocalData: () => void
}

// ── Constants ──────────────────────────────────────────

const DEFAULT_DATA: GameData = {
  points: INITIAL_POINTS,
  freePulls: DAILY_FREE_PULLS,
  // New-user welcome bundle: 3 commons + 6 SSRs spanning 4 series so the
  // editor/showcase has decent material right out of the gate.
  library: [
    'basic-1', 'basic-2', 'basic-3',           // 3 基础 common
    'dragon-4',                                  // 团龙纹
    'cloud-4',                                   // 团云纹
    'taotie-3',                                  // 夔龙饕餮纹
    'scroll-3',                                  // 宝相花卷草
    'sj-7',                                      // 夫诸·白鹿行水（山海经）
    'sj-12',                                     // 应龙·飞龙布雨（山海经）
  ],
  series: {},
  dailyPull: { date: null, used: false },
  creations: [],
  pityCounter: 0,
}

// ── Helpers ────────────────────────────────────────────

function checkDailyReset(data: GameData): GameData {
  const today = new Date().toDateString()
  if (data.dailyPull.date !== today) {
    return { ...data, freePulls: DAILY_FREE_PULLS, dailyPull: { date: today, used: false } }
  }
  return data
}

function loadData(): GameData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return checkDailyReset({ ...DEFAULT_DATA, ...parsed })
    }
  } catch (e) {
    console.warn('[gameStore] Failed to load data:', (e as Error).message)
    localStorage.removeItem(STORAGE_KEY)
  }
  return { ...DEFAULT_DATA }
}

function saveData(data: GameData): void {
  try {
    const json = JSON.stringify(data)
    if (json.length > MAX_STORAGE_BYTES) {
      console.warn('[gameStore] Data too large (' + (json.length / 1024).toFixed(0) + 'KB), trimming creations')
      const trimmed = { ...data, creations: data.creations.slice(-10) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      return
    }
    localStorage.setItem(STORAGE_KEY, json)
  } catch (e) {
    console.error('[gameStore] Failed to save data:', (e as Error).message)
  }
}

// ── Hook ───────────────────────────────────────────────

export function useGameStore(): GameStore {
  const [data, setDataState] = useState<GameData>(loadData)

  const setData = useCallback((updater: GameData | ((prev: GameData) => GameData)) => {
    setDataState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveData(next)
      // When logged in, push to cloud (debounced 1s)
      if (syncUserId) {
        if (pushTimer) clearTimeout(pushTimer)
        pushTimer = setTimeout(() => {
          pushToCloud(syncUserId, next)
        }, 1000)
      }
      return next
    })
  }, [])

  const addPoints = useCallback((amount: number) => {
    setData(d => ({ ...d, points: d.points + amount }))
  }, [setData])

  const spendPoints = useCallback((amount: number) => {
    setData(d => {
      if (d.points < amount) return d
      return { ...d, points: d.points - amount }
    })
  }, [setData])

  const addToLibrary = useCallback((patternId: string) => {
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

  const doPull = useCallback((): true | null => {
    let success = false
    setData(d => {
      const hasFreePull = d.freePulls > 0
      const cost = hasFreePull ? 0 : PULL_COST
      if (!hasFreePull && d.points < cost) return d

      success = true
      const today = new Date().toDateString()
      return {
        ...d,
        points: hasFreePull ? d.points : d.points - cost,
        freePulls: hasFreePull ? d.freePulls - 1 : d.freePulls,
        dailyPull: { date: today, used: true },
      }
    })
    return success ? true : null
  }, [setData])

  const doTenPull = useCallback((): true | null => {
    let success = false
    setData(d => {
      const useFree = d.freePulls >= 10
      const cost = useFree ? 0 : TEN_PULL_COST
      if (!useFree && d.points < cost) return d

      success = true
      const today = new Date().toDateString()
      return {
        ...d,
        points: useFree ? d.points : d.points - cost,
        freePulls: useFree ? d.freePulls - 10 : d.freePulls,
        dailyPull: { date: today, used: true },
      }
    })
    return success ? true : null
  }, [setData])

  const incrementPity = useCallback(() => {
    setData(d => ({ ...d, pityCounter: (d.pityCounter || 0) + 1 }))
  }, [setData])

  const resetPity = useCallback(() => {
    setData(d => ({ ...d, pityCounter: 0 }))
  }, [setData])

  const saveCreation = useCallback((imageDataUrl: string, source: string = 'puzzle', placements?: Placement[]): string => {
    const creation: Creation = {
      id: `creation-${Date.now()}`,
      image: imageDataUrl,
      source,
      createdAt: new Date().toISOString(),
      placements,
    }
    setData(d => {
      const next = { ...d, creations: [...d.creations, creation] }
      // Cap at MAX_CREATIONS to stay within storage limits
      if (next.creations.length > MAX_CREATIONS) {
        next.creations = next.creations.slice(-MAX_CREATIONS)
      }
      return next
    })
    return creation.id
  }, [setData])

  const deleteCreation = useCallback((creationId: string) => {
    setData(d => ({
      ...d,
      creations: d.creations.filter(c => c.id !== creationId),
    }))
  }, [setData])

  const syncFromCloud = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return
    setSyncUser(userId)
    const { data: row, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('[sync] pull failed:', error.message)
      return
    }

    if (!row) {
      // New user — push the DEFAULT_DATA welcome bundle (新人福利: dragon-4 SSR
      // + 3 basics) up to cloud. Don't push whatever is currently in local
      // state because that may be the previous user's data leaking through.
      const fresh = checkDailyReset({ ...DEFAULT_DATA })
      saveData(fresh)
      setDataState(fresh)
      await pushToCloud(userId, fresh)
      return
    }

    // Merge cloud fields over local — cloud is source of truth for cross-device.
    setDataState(prev => ({
      ...prev,
      points: row.points ?? prev.points,
      freePulls: row.free_pulls ?? prev.freePulls,
      pityCounter: row.pity_counter ?? prev.pityCounter,
      dailyPull: { date: row.daily_pull_date ?? prev.dailyPull.date, used: false },
      library: Array.isArray(row.library) ? row.library : prev.library,
      creations: Array.isArray(row.creations) ? row.creations : prev.creations,
    }))
  }, [])

  // Wipe local state back to DEFAULT_DATA. Called when switching accounts
  // so user A's library/creations don't leak into user B's view.
  const resetLocalData = useCallback(() => {
    const fresh = { ...DEFAULT_DATA }
    saveData(fresh)
    setDataState(fresh)
  }, [])

  return {
    data,
    addPoints,
    spendPoints,
    addToLibrary,
    canPullToday,
    recordPull,
    doPull,
    doTenPull,
    incrementPity,
    resetPity,
    saveCreation,
    deleteCreation,
    syncFromCloud,
    resetLocalData,
  }
}
