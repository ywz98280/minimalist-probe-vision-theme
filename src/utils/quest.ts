import type { NodeData } from '@/stores/nodes'
import { getDiskPercentage, getMemoryPercentage, isExpiringNode, isHighLoadNode } from '@/utils/nodeMetricsHelper'

/**
 * 记忆任务线（Vision Probe v2）的共享逻辑。
 *
 * v2 推倒了 v1 的首页结构：不再有顶部总览卡、世界地图与节点卡网格，
 * 首页改成左侧「意识核心」+ 右侧「记忆任务线」。每个节点是任务线上的一站，
 * 按记忆完整度从高到低排，离线节点完整度为 0，自然沉底。
 */

/** 任务线上的一站处于哪个阶段 */
export type QuestStage = 'awake' | 'rebuilding' | 'overload' | 'offline'

/** 任务线顶部的阶段筛选 */
export type QuestFilter = 'all' | 'awake' | 'overload' | 'expiring' | 'offline'

export const QUEST_FILTERS: Array<{ key: QuestFilter, label: string }> = [
  { key: 'all', label: '全部任务' },
  { key: 'awake', label: '苏醒中' },
  { key: 'overload', label: '宝石过载' },
  { key: 'expiring', label: '能量将尽' },
  { key: 'offline', label: '记忆断线' },
]

/**
 * 记忆完整度：在线节点 = round(100 - (CPU% + 内存%) / 2)，离线节点 = 0。
 * CPU、内存越空闲，记忆越完整；离线即记忆完全断线。
 */
export function getMemoryCompleteness(node: NodeData): number {
  if (!node.online)
    return 0

  const cpu = Math.min(100, Math.max(0, node.cpu || 0))
  const memory = getMemoryPercentage(node)
  return Math.min(100, Math.max(0, Math.round(100 - (cpu + memory) / 2)))
}

/**
 * 一站的状态动词。
 * - 记忆断线：离线。
 * - 宝石过载：CPU / 内存 / 磁盘任一达到宝石过载阈值（默认 80%）。
 * - 重组中：在线、未过载，但 CPU 或内存已到阈值的 75%（默认 60%），正在高强度重组记忆。
 *   注：直接按「CPU 或内存 ≥80%」会与宝石过载完全重合，所以重组中取阈值的 75% 作前兆线。
 * - 苏醒中：其余在线节点。
 */
export function getQuestStage(node: NodeData, highLoadThreshold: number): QuestStage {
  if (!node.online)
    return 'offline'

  if (isHighLoadNode(node, highLoadThreshold))
    return 'overload'

  const warnAt = Math.max(1, highLoadThreshold * 0.75)
  if ((node.cpu || 0) >= warnAt || getMemoryPercentage(node) >= warnAt)
    return 'rebuilding'

  return 'awake'
}

export const QUEST_STAGE_LABEL: Record<QuestStage, string> = {
  awake: '苏醒中',
  rebuilding: '重组中',
  overload: '宝石过载',
  offline: '记忆断线',
}

/** 生命线的三段：CPU 金色、内存合成青、磁盘灰色，各自 0-100%。 */
export function getLifelineSegments(node: NodeData): Array<{ key: 'cpu' | 'memory' | 'disk', label: string, percentage: number }> {
  return [
    { key: 'cpu', label: '幻视核心转速', percentage: Math.min(100, Math.max(0, node.cpu || 0)) },
    { key: 'memory', label: '记忆矩阵', percentage: getMemoryPercentage(node) },
    { key: 'disk', label: '振金档案库', percentage: getDiskPercentage(node) },
  ]
}

export function matchesQuestFilter(
  node: NodeData,
  filter: QuestFilter,
  highLoadThreshold: number,
  expiringDays: number,
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'awake':
      return node.online
    case 'overload':
      return isHighLoadNode(node, highLoadThreshold)
    case 'expiring':
      return isExpiringNode(node, expiringDays)
    case 'offline':
      return !node.online
    default:
      return true
  }
}

export function countQuestFilter(
  nodes: NodeData[],
  filter: QuestFilter,
  highLoadThreshold: number,
  expiringDays: number,
): number {
  return nodes.reduce((count, node) => count + (matchesQuestFilter(node, filter, highLoadThreshold, expiringDays) ? 1 : 0), 0)
}

/**
 * 量子链路总网速换算成内圈的满环百分比：50 MB/s 为满环。
 * 只是为了让三圈同心环都能用 0-100% 画出来，不代表任何配额。
 */
export function getNetworkRingPercent(totalBytesPerSecond: number): number {
  if (!Number.isFinite(totalBytesPerSecond) || totalBytesPerSecond <= 0)
    return 0

  return Math.min(100, Math.round(totalBytesPerSecond / 50_000_000 * 100))
}
