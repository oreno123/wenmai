import { supabase, isSupabaseConfigured } from './supabase'

// ──────────────────────────────────────────────────────────
// galleryApi — Supabase 查询封装
// 所有广场相关读写都走这里
// ──────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'works'

// ── 读取 ──────────────────────────────────────────────────

/**
 * 列出已审核通过的作品
 * @param {Object} opts
 *   - sort: 'newest' | 'hottest' | 'curated'
 *   - series: '青花瓷' | '山海经' | '青铜器' | '唐草' | null
 *   - template: 模板 id 或 null
 *   - limit, offset
 */
export async function listWorks(opts = {}) {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { sort = 'newest', series = null, template = null, limit = 24, offset = 0 } = opts

  let q = supabase
    .from('works')
    .select(`
      id, title, template, cover_path, series, status,
      likes_count, reuse_count, forked_from, created_at, author_id,
      author:profiles!works_author_id_fkey(user_id, username)
    `)
    .eq('status', 'approved')

  if (series) q = q.eq('series', series)
  if (template) q = q.eq('template', template)

  if (sort === 'newest') q = q.order('created_at', { ascending: false })
  else if (sort === 'hottest') q = q.order('likes_count', { ascending: false })
  else if (sort === 'curated') {
    // 编辑精选 = 高复用 + 高点赞，简单加权
    q = q.order('reuse_count', { ascending: false })
      .order('likes_count', { ascending: false })
  }

  q = q.range(offset, offset + limit - 1)
  const { data, error } = await q
  return { data: data || [], error }
}

/**
 * 获取单件作品详情（含 fork 链）
 * 注意：Supabase 不允许在一条 select 里 self-join works 表，
 * 所以 forked_from 的源作品要单独查一次
 */
export async function getWork(id) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('not configured') }
  const { data, error } = await supabase
    .from('works')
    .select(`
      id, title, template, placements, cover_path, series, status,
      rejected_reason, likes_count, reuse_count, forked_from,
      created_at, reviewed_at, author_id,
      author:profiles!works_author_id_fkey(user_id, username)
    `)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return { data, error }
  if (!data.forked_from) return { data: { ...data, source: null }, error: null }

  // 单独查源作品
  const { data: source } = await supabase
    .from('works')
    .select('id, title, status, author:profiles!works_author_id_fkey(user_id, username)')
    .eq('id', data.forked_from)
    .maybeSingle()
  return { data: { ...data, source }, error: null }
}

/**
 * 这件作品被哪些作品复用了
 */
export async function listForksOf(workId, limit = 6) {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { data, error } = await supabase
    .from('works')
    .select('id, title, cover_path, likes_count, reuse_count, created_at, author:profiles!works_author_id_fkey(username)')
    .eq('forked_from', workId)
    .eq('status', 'approved')
    .order('likes_count', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}

/**
 * 当前用户是否已点赞
 */
export async function hasLiked(workId, userId) {
  if (!isSupabaseConfigured || !userId) return false
  const { data } = await supabase
    .from('likes')
    .select('work_id')
    .eq('work_id', workId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

// ── 写入 ──────────────────────────────────────────────────

/**
 * 上传作品封面到 Storage，返回 public URL
 * @param {Blob|File} blob — 1536×1536 WebP 推荐
 * @param {string} userId
 * @param {string} workId
 */
export async function uploadWorkCover(blob, userId, workId) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const ext = blob.type === 'image/png' ? 'png' : 'webp'
  const path = `${userId}/${workId}.${ext}`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true })
  if (error) throw error
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return pub.publicUrl
}

/**
 * 发布作品（status=pending 等审）
 * @param {Object} input
 *   - authorId, title, template, placements, series, forkedFrom
 *   - coverBlob: Blob|File（封面图）
 */
export async function publishWork(input) {
  if (!isSupabaseConfigured) return { data: null, error: new Error('not configured') }
  const { authorId, title, template, placements, series, forkedFrom = null, coverBlob } = input

  // 先 INSERT 拿到 workId，再上传封面，再 UPDATE cover_path
  const { data: work, error: insErr } = await supabase
    .from('works')
    .insert({
      author_id: authorId,
      title,
      template,
      placements,
      series,
      forked_from: forkedFrom,
      status: 'pending',
    })
    .select('id')
    .single()
  if (insErr) return { data: null, error: insErr }

  let coverUrl = null
  if (coverBlob) {
    try {
      coverUrl = await uploadWorkCover(coverBlob, authorId, work.id)
      await supabase.from('works').update({ cover_path: coverUrl }).eq('id', work.id)
    } catch (e) {
      console.warn('[gallery] cover upload failed:', e.message)
    }
  }

  return { data: { id: work.id, cover_path: coverUrl }, error: null }
}

/**
 * 点赞 / 取消点赞
 */
export async function toggleLike(workId, userId) {
  if (!isSupabaseConfigured) return { liked: false, error: new Error('not configured') }
  const { data: existing } = await supabase
    .from('likes')
    .select('work_id')
    .eq('work_id', workId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('work_id', workId)
      .eq('user_id', userId)
    return { liked: false, error }
  }
  const { error } = await supabase
    .from('likes')
    .insert({ work_id: workId, user_id: userId })
  return { liked: true, error }
}

// ── 管理员 ────────────────────────────────────────────────

/**
 * 拉取待审核队列（仅 is_admin）
 */
export async function listPendingReviews() {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { data, error } = await supabase
    .from('works')
    .select(`
      id, title, template, cover_path, series, status, created_at,
      author_id, author:profiles!works_author_id_fkey(username)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  return { data: data || [], error }
}

/**
 * 通过审核
 */
export async function approveWork(workId, adminId) {
  const { error } = await supabase
    .from('works')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      rejected_reason: null,
    })
    .eq('id', workId)
  return { error }
}

/**
 * 驳回（必填理由）
 */
export async function rejectWork(workId, adminId, reason) {
  if (!reason || !reason.trim()) {
    return { error: new Error('驳回必填理由') }
  }
  const { error } = await supabase
    .from('works')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      rejected_reason: reason.trim(),
    })
    .eq('id', workId)
  return { error }
}

/**
 * 当前用户是否管理员
 */
export async function fetchIsAdmin(userId) {
  if (!isSupabaseConfigured || !userId) return false
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data?.is_admin)
}
