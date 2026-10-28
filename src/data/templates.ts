// Predefined composition templates for the puzzle page.
//
// Each template defines a set of slots with positional + typological
// constraints. When applied, slots auto-fill from the user's library
// (first matching pattern); remaining slots render as dashed placeholders
// labeled with the required type, so the user can see what's missing.
//
// Coordinates are normalized [0, 1] of canvas size; converted to canvas
// pixels at apply time.

import type { PatternForm } from '../store/patternData'

export type SlotRole = 'center' | 'corner' | 'edge' | 'accent' | 'border'

export interface TemplateSlot {
  id: string
  role: SlotRole
  x: number // normalized [0, 1]
  y: number // normalized [0, 1]
  size: number // canvas pixels
  rotation: number // degrees
  typeConstraint: string // pattern.type required ('龙纹', '角花', etc.)
  label?: string // shown in placeholder if empty
  // 形态偏好（软约束）：自动填充优先选形态匹配的素材，点空位时
  // tray 也按首个偏好形态过滤。题材(type)是硬门槛，形态只是排序。
  preferredForms?: PatternForm[]
}

export interface CompositionTemplate {
  id: string
  name: string
  description: string
  slots: TemplateSlot[]
}

export const TEMPLATES: CompositionTemplate[] = [
  {
    id: 'tuanlong-xianrui',
    name: '团龙献瑞',
    description: '团龙居中 · 四角对称 · 庄重威严',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 360, rotation: 0, typeConstraint: '龙纹', label: '团龙' , preferredForms: ['medallion'] },
      { id: 'c1', role: 'corner', x: 0.18, y: 0.18, size: 140, rotation: 0, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c2', role: 'corner', x: 0.82, y: 0.18, size: 140, rotation: 90, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c3', role: 'corner', x: 0.18, y: 0.82, size: 140, rotation: -90, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c4', role: 'corner', x: 0.82, y: 0.82, size: 140, rotation: 180, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
    ],
  },
  {
    id: 'lianchi-qingyun',
    name: '莲池清韵',
    description: '花卉居中 · 四边云纹环绕 · 清雅端庄',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 320, rotation: 0, typeConstraint: '花卉纹', label: '花卉' , preferredForms: ['medallion', 'motif'] },
      { id: 'e1', role: 'edge', x: 0.5, y: 0.16, size: 180, rotation: 180, typeConstraint: '云纹', label: '云纹' , preferredForms: ['motif', 'border'] },
      { id: 'e2', role: 'edge', x: 0.5, y: 0.84, size: 180, rotation: 0, typeConstraint: '云纹', label: '云纹' , preferredForms: ['motif', 'border'] },
      { id: 'e3', role: 'edge', x: 0.16, y: 0.5, size: 180, rotation: 90, typeConstraint: '云纹', label: '云纹' , preferredForms: ['motif', 'border'] },
      { id: 'e4', role: 'edge', x: 0.84, y: 0.5, size: 180, rotation: -90, typeConstraint: '云纹', label: '云纹' , preferredForms: ['motif', 'border'] },
    ],
  },
  {
    id: 'shuanglong-xizhu',
    name: '双龙戏珠',
    description: '双龙对望 · 中心宝珠 · 动感磅礴',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 200, rotation: 0, typeConstraint: '花卉纹', label: '宝珠/花卉' , preferredForms: ['medallion', 'motif'] },
      { id: 'l1', role: 'accent', x: 0.28, y: 0.5, size: 280, rotation: 0, typeConstraint: '龙纹', label: '行龙' , preferredForms: ['motif'] },
      { id: 'l2', role: 'accent', x: 0.72, y: 0.5, size: 280, rotation: 0, typeConstraint: '龙纹', label: '行龙' , preferredForms: ['motif'] },
    ],
  },
  {
    id: 'shanhai-yishou',
    name: '山海异兽',
    description: '山海经异兽居中 · 瑞云环绕 · 神秘庄严',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 380, rotation: 0, typeConstraint: '山海经', label: '异兽' , preferredForms: ['motif', 'medallion'] },
      { id: 'e1', role: 'edge', x: 0.5, y: 0.14, size: 180, rotation: 180, typeConstraint: '云纹', label: '瑞云' , preferredForms: ['motif', 'border'] },
      { id: 'e2', role: 'edge', x: 0.5, y: 0.86, size: 180, rotation: 0, typeConstraint: '云纹', label: '瑞云' , preferredForms: ['motif', 'border'] },
      { id: 'e3', role: 'edge', x: 0.14, y: 0.5, size: 180, rotation: 90, typeConstraint: '云纹', label: '瑞云' , preferredForms: ['motif', 'border'] },
      { id: 'e4', role: 'edge', x: 0.86, y: 0.5, size: 180, rotation: -90, typeConstraint: '云纹', label: '瑞云' , preferredForms: ['motif', 'border'] },
    ],
  },
  {
    id: 'qingtong-weiyi',
    name: '青铜威仪',
    description: '饕餮兽面 · 四角守护 · 商周气韵',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 380, rotation: 0, typeConstraint: '兽面纹', label: '饕餮' , preferredForms: ['medallion'] },
      { id: 'c1', role: 'corner', x: 0.18, y: 0.18, size: 140, rotation: 0, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c2', role: 'corner', x: 0.82, y: 0.18, size: 140, rotation: 90, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c3', role: 'corner', x: 0.18, y: 0.82, size: 140, rotation: -90, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
      { id: 'c4', role: 'corner', x: 0.82, y: 0.82, size: 140, rotation: 180, typeConstraint: '角花', label: '角花' , preferredForms: ['corner'] },
    ],
  },
  {
    id: 'qinghua-chanzhi',
    name: '青花缠枝',
    description: '花卉主体 · 卷草边框 · 雅致绵长',
    slots: [
      { id: 'center', role: 'center', x: 0.5, y: 0.5, size: 300, rotation: 0, typeConstraint: '花卉纹', label: '花卉' , preferredForms: ['medallion', 'motif'] },
      { id: 'b1', role: 'border', x: 0.5, y: 0.12, size: 220, rotation: 180, typeConstraint: '卷草纹', label: '卷草' , preferredForms: ['border', 'motif'] },
      { id: 'b2', role: 'border', x: 0.5, y: 0.88, size: 220, rotation: 0, typeConstraint: '卷草纹', label: '卷草' , preferredForms: ['border', 'motif'] },
    ],
  },
]

export function getTemplateById(id: string): CompositionTemplate | undefined {
  return TEMPLATES.find(t => t.id === id)
}
