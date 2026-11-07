<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import { useNodePingDisplay } from '@/composables/useNodePingDisplay'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, getUptimeDays } from '@/utils/helper'
import { getExpiryDays, getTotalTraffic } from '@/utils/nodeMetricsHelper'
import { getLifelineSegments, getMemoryCompleteness, getQuestStage, QUEST_STAGE_LABEL } from '@/utils/quest'
import { getRegionDisplayName } from '@/utils/regionHelper'
import { formatCurrencyValue, getRemainingValue } from '@/utils/tagHelper'

/**
 * 记忆任务线上的一站（Vision Probe v2）。
 * 不是卡片，是一行：六边形宝石 + 名字 + 记忆碎片标签 + 生命线 + 状态动词。
 * 点一行在原地展开手风琴，显示上下行、累计流量、运行时长、剩余天数/价值、延迟丢包。
 */
const props = withDefaults(defineProps<{
  node: NodeData
  visionMemory?: string
  expanded?: boolean
  density?: 'compact' | 'comfortable'
}>(), {
  expanded: false,
  density: 'compact',
})

const emit = defineEmits<{
  toggle: []
  openDetail: [node: NodeData]
}>()

const appStore = useAppStore()

const stage = computed(() => getQuestStage(props.node, appStore.homeHighLoadThreshold))
const completeness = computed(() => getMemoryCompleteness(props.node))
const lifeline = computed(() => getLifelineSegments(props.node))
const regionName = computed(() => getRegionDisplayName(props.node.region) || props.node.region || '未知地区')

const { latencyDisplay, lossDisplay, taskSummaries, pingStats } = useNodePingDisplay(() => props.node.uuid, {
  // v2.0.1：收起行也要显示延迟，所以始终启用，不再只在展开时才取数。
  // 与意识核心的轨道圆点（VisionOrbitDot）共用 useNodePingStats 的共享缓存
  // （按 uuid 分键、每分钟刷新、localStorage 缓存），不会每个节点重复发请求。
  loadingDisplayText: '—',
  emptyDisplayText: '—',
})

/** 收起行右侧的延迟小标签：离线或无数据时显示“—”，不闪“加载中”。 */
const latencyChipText = computed(() => {
  if (!props.node.online)
    return '—'
  return latencyDisplay.value
})

/** 延迟分档：≤60ms 绿、≤100ms 青、≤160ms 金、≤200ms 橙、>200ms 红、无数据灰。 */
const latencyTone = computed(() => {
  if (!props.node.online || !pingStats.hasData.value)
    return 'none'
  const ms = pingStats.avgLatency.value
  if (ms <= 60)
    return 'good'
  if (ms <= 100)
    return 'fair'
  if (ms <= 160)
    return 'warm'
  if (ms <= 200)
    return 'hot'
  return 'bad'
})

const latencyTooltip = computed(() => {
  if (!props.node.online)
    return '链路延迟：记忆断线，无数据'
  if (!pingStats.hasData.value)
    return '链路延迟（近 1 小时平均）：无数据'
  return `链路延迟（近 1 小时平均）${latencyDisplay.value} · 迷失率 ${lossDisplay.value}`
})

const formatBytes = (bytes: number) => formatBytesWithConfig(bytes, appStore.byteDecimals)
const formatSpeed = (bytes: number) => formatBytesPerSecondWithConfig(bytes, appStore.byteDecimals)

const showPrice = computed(() => appStore.privateFeaturesAllowed || !appStore.hidePriceWhenLoggedOut)

const remainingDaysText = computed(() => {
  const days = getExpiryDays(props.node)
  if (days === null)
    return '—'
  if (days <= 0)
    return '已过期'
  return `${days} 天`
})

const remainingValueText = computed(() => {
  if (!showPrice.value)
    return '···'
  if (!props.node.price || props.node.price <= 0)
    return '免费'
  return formatCurrencyValue(getRemainingValue(props.node.price, props.node.billing_cycle, props.node.expired_at), props.node.currency)
})

function handleRowKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ')
    return
  event.preventDefault()
  emit('toggle')
}
</script>

<template>
  <li class="quest-row" :class="[`quest-row--${density}`, { 'is-expanded': expanded, 'is-offline': !node.online }]" :data-quest-uuid="node.uuid">
    <div
      class="quest-row__main"
      role="button"
      tabindex="0"
      :aria-expanded="expanded"
      :aria-label="`${node.name}，记忆共鸣度 ${completeness}%，${QUEST_STAGE_LABEL[stage]}，链路延迟 ${latencyChipText}，点一下${expanded ? '收起' : '展开'}详情`"
      @click="emit('toggle')"
      @keydown="handleRowKeydown"
    >
      <span class="quest-row__gem" :class="`quest-row__gem--${stage}`" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
          <text x="20" y="23.5" text-anchor="middle">{{ completeness }}</text>
        </svg>
      </span>

      <span class="quest-row__identity">
        <span class="quest-row__name-line">
          <strong class="quest-row__name">{{ node.name }}</strong>
          <span v-if="visionMemory" class="quest-row__memory">{{ visionMemory }}</span>
          <span class="quest-row__region">{{ regionName }}</span>
        </span>
        <span class="quest-row__lifeline" aria-label="生命线：幻视核心转速、记忆矩阵、振金档案库">
          <span
            v-for="segment in lifeline"
            :key="segment.key"
            class="quest-row__segment"
            :class="`quest-row__segment--${segment.key}`"
            :title="`${segment.label} ${segment.percentage.toFixed(0)}%`"
          >
            <i :style="{ width: `${segment.percentage}%` }" />
          </span>
        </span>
        <span class="quest-row__lifeline-numbers">
          <span v-for="segment in lifeline" :key="segment.key">{{ segment.label }} {{ segment.percentage.toFixed(0) }}%</span>
        </span>
      </span>

      <span class="quest-row__side">
        <span class="quest-row__latency" :class="`quest-row__latency--${latencyTone}`" :title="latencyTooltip">{{ latencyChipText }}</span>
        <span class="quest-row__stage" :class="`quest-row__stage--${stage}`">{{ QUEST_STAGE_LABEL[stage] }}</span>
        <span class="quest-row__chevron" aria-hidden="true">›</span>
      </span>
    </div>

    <div v-if="expanded" class="quest-row__details">
      <dl>
        <div>
          <dt>量子链路 · 实时</dt>
          <dd>↑ {{ formatSpeed(node.net_out || 0) }} · ↓ {{ formatSpeed(node.net_in || 0) }}</dd>
        </div>
        <div>
          <dt>量子链路 · 累计传输</dt>
          <dd>{{ formatBytes(getTotalTraffic(node)) }}</dd>
        </div>
        <div>
          <dt>苏醒持续时长</dt>
          <dd>{{ getUptimeDays(node.uptime) }} 天</dd>
        </div>
        <div>
          <dt>能量余期</dt>
          <dd>{{ remainingDaysText }}</dd>
        </div>
        <div>
          <dt>记忆余值</dt>
          <dd>{{ remainingValueText }}</dd>
        </div>
        <div class="quest-row__latency-detail">
          <dt>链路延迟 / 迷失率</dt>
          <dd>{{ latencyDisplay }} / {{ lossDisplay }}</dd>
          <ul v-if="taskSummaries.length > 1" class="quest-row__latency-tasks">
            <li v-for="task in taskSummaries" :key="task.id">
              <span class="quest-row__latency-task-name">{{ task.name }}</span>
              <span class="quest-row__latency-task-bars" role="img" :aria-label="`${task.name} 近 1 小时延迟走势，平均 ${task.latencyDisplay}`">
                <i
                  v-for="bar in task.latencyBars"
                  :key="bar.key"
                  :class="bar.className"
                  :title="bar.tooltip"
                />
              </span>
              <span class="quest-row__latency-task-value">{{ task.latencyDisplay }} / {{ task.lossDisplay }}</span>
            </li>
          </ul>
        </div>
      </dl>
      <button type="button" class="quest-row__detail-link" @click="emit('openDetail', node)">
        进入详情 →
      </button>
    </div>
  </li>
</template>

<style scoped>
.quest-row {
  position: relative;
  list-style: none;
  border-bottom: 1px solid rgb(26 35 50 / 0.08);
}

.quest-row:last-child {
  border-bottom: none;
}

.quest-row__main {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  outline: none;
}

.quest-row--comfortable .quest-row__main {
  padding: 1rem 1.1rem;
}

.quest-row__main:hover,
.quest-row__main:focus-visible {
  background: rgb(232 185 35 / 0.07);
}

.quest-row.is-expanded .quest-row__main {
  background: rgb(232 185 35 / 0.09);
}

.quest-row__gem {
  flex: none;
  width: 2.6rem;
  height: 2.6rem;
}

.quest-row__gem svg {
  width: 100%;
  height: 100%;
}

.quest-row__gem polygon {
  fill: #f2c94c;
  stroke: #9a6b00;
  stroke-width: 1.4;
}

.quest-row__gem text {
  fill: #1a2332;
  font-size: 10.5px;
  font-weight: 800;
}

.quest-row__gem--rebuilding polygon {
  fill: #ff9f5a;
  stroke: #9a4a00;
}

.quest-row__gem--overload polygon {
  fill: #c0392b;
  stroke: #7a1f16;
}

.quest-row__gem--overload text {
  fill: #fff;
}

.quest-row__gem--offline polygon {
  fill: #c3cedb;
  stroke: #8a99a8;
}

.quest-row__gem--offline text {
  fill: #5a6b7f;
}

.quest-row__identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.quest-row__name-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.55rem;
  min-width: 0;
}

.quest-row__name {
  overflow: hidden;
  color: #1a2332;
  font-size: 0.92rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quest-row__memory {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgb(232 185 35 / 0.18);
  color: #8a6508;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
}

.quest-row__region {
  color: #5a6b7f;
  font-size: 0.7rem;
  white-space: nowrap;
}

.quest-row__lifeline {
  display: flex;
  gap: 3px;
  height: 0.5rem;
}

.quest-row__segment {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(26 35 50 / 0.1);
}

.quest-row__segment i {
  position: absolute;
  inset: 0 auto 0 0;
  display: block;
  border-radius: 999px;
  transition: width 300ms ease;
}

.quest-row__segment--cpu i {
  background: #e8b923;
}

.quest-row__segment--memory i {
  background: #0e9a8b;
}

.quest-row__segment--disk i {
  background: #8a99a8;
}

.quest-row__lifeline-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 0.9rem;
  color: #5a6b7f;
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.quest-row__side {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.45rem;
}

.quest-row__stage {
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  background: rgb(14 154 139 / 0.14);
  color: #0b7a6e;
  font-size: 0.7rem;
  font-weight: 800;
  white-space: nowrap;
}

.quest-row__stage--rebuilding {
  background: rgb(255 159 90 / 0.18);
  color: #9a4a00;
}

.quest-row__stage--overload {
  background: rgb(192 57 43 / 0.14);
  color: #c0392b;
}

.quest-row__stage--offline {
  background: rgb(138 153 168 / 0.18);
  color: #5a6b7f;
}

.quest-row__latency {
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgb(138 153 168 / 0.16);
  color: #5a6b7f;
  font-size: 0.7rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.quest-row__latency--good {
  background: rgb(21 128 61 / 0.13);
  color: #15803d;
}

.quest-row__latency--fair {
  background: rgb(14 154 139 / 0.14);
  color: #0b7a6e;
}

.quest-row__latency--warm {
  background: rgb(232 185 35 / 0.22);
  color: #8a6508;
}

.quest-row__latency--hot {
  background: rgb(255 159 90 / 0.2);
  color: #9a4a00;
}

.quest-row__latency--bad {
  background: rgb(192 57 43 / 0.13);
  color: #c0392b;
}

.quest-row__chevron {
  color: #9a6b00;
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 200ms ease;
}

.quest-row.is-expanded .quest-row__chevron {
  transform: rotate(90deg);
}

.quest-row__details {
  padding: 0.2rem 0.9rem 0.9rem 4.3rem;
}

.quest-row__details dl {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
  gap: 0.55rem 1.2rem;
}

.quest-row__details dl div {
  min-width: 0;
}

.quest-row__details dt {
  color: #5a6b7f;
  font-size: 0.68rem;
}

.quest-row__details dd {
  margin-top: 0.1rem;
  color: #1a2332;
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quest-row__detail-link {
  margin-top: 0.7rem;
  padding: 0.35rem 0.8rem;
  border: none;
  border-radius: 999px;
  background: #e8b923;
  color: #1a2332;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.quest-row__latency-detail {
  grid-column: 1 / -1;
}

.quest-row__latency-tasks {
  margin: 0.45rem 0 0;
  padding: 0;
  list-style: none;
}

.quest-row__latency-tasks li {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.2rem 0;
  color: #5a6b7f;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.quest-row__latency-task-name {
  flex: none;
  width: 3.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quest-row__latency-task-bars {
  display: flex;
  flex: 1;
  gap: 2px;
  height: 0.6rem;
  min-width: 0;
}

.quest-row__latency-task-bars i {
  flex: 1;
  min-width: 0;
  border-radius: 2px;
}

.quest-row__latency-task-value {
  flex: none;
  color: #1a2332;
  font-weight: 700;
  white-space: nowrap;
}

.quest-row__detail-link:hover {
  background: #f2c94c;
}

:global(.dark .quest-row) {
  border-bottom-color: rgb(242 245 249 / 0.08);
}

:global(.dark .quest-row__main:hover),
:global(.dark .quest-row__main:focus-visible),
:global(.dark .quest-row.is-expanded .quest-row__main) {
  background: rgb(242 201 76 / 0.08);
}

:global(.dark .quest-row__name),
:global(.dark .quest-row__details dd) {
  color: #f2f5f9;
}

:global(.dark .quest-row__region),
:global(.dark .quest-row__lifeline-numbers),
:global(.dark .quest-row__details dt) {
  color: #c9d4e0;
}

:global(.dark .quest-row__segment) {
  background: rgb(242 245 249 / 0.12);
}

:global(.dark .quest-row__stage--awake) {
  background: rgb(14 154 139 / 0.22);
  color: #4adeb8;
}

:global(.dark .quest-row__latency--good) {
  background: rgb(74 222 128 / 0.16);
  color: #4ade80;
}

:global(.dark .quest-row__latency--fair) {
  background: rgb(14 154 139 / 0.22);
  color: #4adeb8;
}

:global(.dark .quest-row__latency--warm) {
  background: rgb(242 201 76 / 0.18);
  color: #f2c94c;
}

:global(.dark .quest-row__latency--hot) {
  background: rgb(255 159 90 / 0.2);
  color: #ffb27a;
}

:global(.dark .quest-row__latency--bad) {
  background: rgb(192 57 43 / 0.25);
  color: #ff8a7a;
}

:global(.dark .quest-row__latency--none) {
  color: #c9d4e0;
}

:global(.dark .quest-row__latency-tasks li) {
  color: #c9d4e0;
}

:global(.dark .quest-row__latency-tasks .quest-row__latency-task-value) {
  color: #f2f5f9;
}

@media (max-width: 640px) {
  .quest-row__main {
    gap: 0.6rem;
    padding: 0.6rem 0.7rem;
  }

  .quest-row__gem {
    width: 2.2rem;
    height: 2.2rem;
  }

  .quest-row__details {
    padding-left: 0.7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quest-row__segment i,
  .quest-row__chevron {
    transition: none;
  }
}
</style>
