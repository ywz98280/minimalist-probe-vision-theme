<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import VisionOrbitDot from '@/components/VisionOrbitDot.vue'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondSplit } from '@/utils/helper'
import { getMemoryPercentage } from '@/utils/nodeMetricsHelper'
import { getMemoryCompleteness, getNetworkRingPercent } from '@/utils/quest'

/**
 * 意识核心（Vision Probe v2 首页左栏，桌面端 sticky）。
 * 一颗会脉动的心灵宝石 + 三圈同心环（幻视核心转速 / 记忆矩阵 / 量子链路），
 * 再往外是两圈轨道：每个节点是一个小圆点，延迟越小离宝石越近。
 * 这是 v1 世界地图的替代品——不再画地图，节点在轨道上。
 */

const props = defineProps<{
  nodes: NodeData[]
  pingEnabled?: boolean
}>()

const emit = defineEmits<{
  selectNode: [uuid: string]
}>()

type RingKey = 'cpu' | 'memory' | 'network'
type EasterVariant = 'memory' | 'door'

const appStore = useAppStore()
const CENTER = 180
const RING_RADII: Record<RingKey, number> = { cpu: 120, memory: 94, network: 68 }

const MEMORY_FRAGMENTS = [
  { icon: 'tabler:hexagon', name: '幻视' },
  { icon: 'tabler:shield', name: '白幻视' },
  { icon: 'tabler:heart', name: '旺达' },
  { icon: 'tabler:bolt', name: '汤米' },
  { icon: 'tabler:star', name: '比利' },
  { icon: 'tabler:cpu', name: '贾维斯' },
  { icon: 'tabler:calendar', name: '星期五' },
  { icon: 'tabler:robot', name: '奥创' },
] as const

const onlineNodes = computed(() => props.nodes.filter(node => node.online))
const onlineCount = computed(() => onlineNodes.value.length)
const totalCount = computed(() => props.nodes.length)

const avgCpu = computed(() => {
  if (onlineNodes.value.length === 0)
    return 0
  return onlineNodes.value.reduce((sum, node) => sum + (node.cpu || 0), 0) / onlineNodes.value.length
})

const avgMemory = computed(() => {
  if (onlineNodes.value.length === 0)
    return 0
  return onlineNodes.value.reduce((sum, node) => sum + getMemoryPercentage(node), 0) / onlineNodes.value.length
})

const totalUp = computed(() => onlineNodes.value.reduce((sum, node) => sum + (node.net_out || 0), 0))
const totalDown = computed(() => onlineNodes.value.reduce((sum, node) => sum + (node.net_in || 0), 0))
const totalSpeed = computed(() => totalUp.value + totalDown.value)

const avgCompleteness = computed(() => {
  if (onlineNodes.value.length === 0)
    return 0
  return Math.round(onlineNodes.value.reduce((sum, node) => sum + getMemoryCompleteness(node), 0) / onlineNodes.value.length)
})

const formattedUp = computed(() => formatBytesPerSecondSplit(totalUp.value, appStore.byteDecimals))
const formattedDown = computed(() => formatBytesPerSecondSplit(totalDown.value, appStore.byteDecimals))

const rings = computed<Array<{ key: RingKey, label: string, value: string, percent: number, color: string, radius: number }>>(() => [
  { key: 'cpu', label: '幻视核心转速', value: `${avgCpu.value.toFixed(1)}%`, percent: Math.min(100, avgCpu.value), color: '#e8b923', radius: RING_RADII.cpu },
  { key: 'memory', label: '记忆矩阵', value: `${avgMemory.value.toFixed(1)}%`, percent: Math.min(100, avgMemory.value), color: '#0e9a8b', radius: RING_RADII.memory },
  { key: 'network', label: '量子链路', value: `${formattedUp.value.value}${formattedUp.value.unit}↑ ${formattedDown.value.value}${formattedDown.value.unit}↓`, percent: getNetworkRingPercent(totalSpeed.value), color: '#ff9f5a', radius: RING_RADII.network },
])

const highlightedRing = ref<RingKey>('cpu')
const RING_ORDER: RingKey[] = ['cpu', 'memory', 'network']

function ringCircumference(radius: number): number {
  return 2 * Math.PI * radius
}

function ringDash(percent: number, radius: number): string {
  const c = ringCircumference(radius)
  return `${(percent / 100) * c} ${c}`
}

function hashUuid(uuid: string): number {
  let hash = 0
  for (let i = 0; i < uuid.length; i++)
    hash = (hash * 31 + uuid.charCodeAt(i)) >>> 0
  return hash % 360
}

/** 黄金角散开，避免轨道圆点重叠；同一节点每次渲染角度不变。 */
function dotAngle(node: NodeData, index: number): number {
  return (index * 137.5 + hashUuid(node.uuid)) % 360
}

// 彩蛋：点宝石 + 顶栏宝石（Header 会发 vision:easter-egg）都会弹出
const easterActive = ref(false)
const easterVariant = ref<EasterVariant>('memory')
let easterTimer: ReturnType<typeof setTimeout> | null = null

const easterTitle = computed(() => easterVariant.value === 'door' ? '我即幻视。I am Vision.' : '我是谁？I am Vision.')
const easterSubtitle = computed(() => {
  if (totalCount.value === 0)
    return '记忆册里暂时还没有记忆碎片'
  if (onlineCount.value === totalCount.value)
    return `${totalCount.value} 件记忆碎片全部幻视苏醒，身份已重组`
  return `${onlineCount.value} / ${totalCount.value} 件记忆碎片幻视苏醒，其余仍在迷失中`
})

function revealEasterEgg(event?: Event): void {
  const detail = event instanceof CustomEvent ? event.detail as { variant?: string } | undefined : undefined
  easterVariant.value = detail?.variant === 'door' ? 'door' : 'memory'
  easterActive.value = false
  requestAnimationFrame(() => easterActive.value = true)
  if (easterTimer)
    clearTimeout(easterTimer)
  easterTimer = setTimeout(() => easterActive.value = false, 6200)
}

function handleGemClick(): void {
  const current = RING_ORDER.indexOf(highlightedRing.value)
  highlightedRing.value = RING_ORDER[(current + 1) % RING_ORDER.length]!
  revealEasterEgg()
}

function closeEasterEgg(): void {
  easterActive.value = false
  if (easterTimer) {
    clearTimeout(easterTimer)
    easterTimer = null
  }
}

onMounted(() => window.addEventListener('vision:easter-egg', revealEasterEgg))
onBeforeUnmount(() => {
  window.removeEventListener('vision:easter-egg', revealEasterEgg)
  if (easterTimer)
    clearTimeout(easterTimer)
})
</script>

<template>
  <section class="vision-core" aria-label="幻视意识核心">
    <!-- 移动端紧凑横条 -->
    <div class="vision-core__compact">
      <img src="/images/vision/mind-stone.svg" alt="心灵宝石" class="vision-core__compact-gem" @click="handleGemClick">
      <div class="vision-core__compact-stats">
        <span><i class="vision-core__dot" style="background:#e8b923" />核心 {{ avgCpu.toFixed(0) }}%</span>
        <span><i class="vision-core__dot" style="background:#0e9a8b" />记忆 {{ avgMemory.toFixed(0) }}%</span>
        <span><i class="vision-core__dot" style="background:#ff9f5a" />↑{{ formattedUp.value }}{{ formattedUp.unit }} ↓{{ formattedDown.value }}{{ formattedDown.unit }}</span>
      </div>
      <span class="vision-core__compact-awake">{{ onlineCount }}/{{ totalCount }} 苏醒</span>
    </div>

    <!-- 桌面端大核心 -->
    <div class="vision-core__panel">
      <header class="vision-core__heading">
        <h2>意识核心</h2>
        <span>{{ onlineCount }} / {{ totalCount }} 件记忆碎片幻视苏醒 · 记忆完整度 {{ avgCompleteness }}%</span>
      </header>

      <svg class="vision-core__svg" viewBox="0 0 360 360" role="img" aria-label="心灵宝石与三圈同心环：幻视核心转速、记忆矩阵、量子链路">
        <!-- 轨道 -->
        <circle :cx="CENTER" :cy="CENTER" r="148" class="vision-core__orbit" />
        <circle :cx="CENTER" :cy="CENTER" r="168" class="vision-core__orbit" />

        <!-- 三圈同心环 -->
        <g v-for="ring in rings" :key="ring.key">
          <circle
            :cx="CENTER" :cy="CENTER" :r="ring.radius"
            class="vision-core__ring-track"
          />
          <circle
            :cx="CENTER" :cy="CENTER" :r="ring.radius"
            class="vision-core__ring-value"
            :class="{ 'is-highlighted': highlightedRing === ring.key }"
            :stroke="ring.color"
            :stroke-dasharray="ringDash(ring.percent, ring.radius)"
            :stroke-dashoffset="ringCircumference(ring.radius) / 4"
          />
          <text
            :x="CENTER" :y="CENTER - ring.radius - 6"
            class="vision-core__ring-label"
            text-anchor="middle"
          >
            {{ ring.value }}
          </text>
        </g>

        <!-- 心灵宝石 -->
        <g class="vision-core__gem" role="button" tabindex="0" aria-label="心灵宝石，点一下切换高亮的环并弹出彩蛋" @click="handleGemClick" @keydown.enter="handleGemClick">
          <circle :cx="CENTER" :cy="CENTER" r="52" class="vision-core__gem-pulse" />
          <image href="/images/vision/mind-stone.svg" :x="CENTER - 42" :y="CENTER - 42" width="84" height="84" />
        </g>

        <!-- 轨道节点 -->
        <VisionOrbitDot
          v-for="(node, index) in nodes"
          :key="node.uuid"
          :node="node"
          :center="CENTER"
          :angle-deg="dotAngle(node, index)"
          :ping-enabled="true"
          @select="emit('selectNode', $event)"
        />
      </svg>

      <ul class="vision-core__legend">
        <li v-for="ring in rings" :key="ring.key">
          <button
            type="button"
            class="vision-core__legend-chip"
            :class="{ 'is-highlighted': highlightedRing === ring.key }"
            :aria-pressed="highlightedRing === ring.key"
            @click="highlightedRing = ring.key"
          >
            <i :style="{ background: ring.color }" />
            {{ ring.label }} · {{ ring.value }}
          </button>
        </li>
      </ul>

      <p class="vision-core__hint">
        点宝石切换高亮的环 · 轨道圆点越靠近宝石链路延迟越低，点圆点跳到任务线对应的一站
      </p>
    </div>

    <Teleport to="body">
      <Transition name="vision-awakening">
        <button
          v-if="easterActive"
          type="button"
          class="vision-core__egg"
          aria-label="关闭彩蛋"
          @click="closeEasterEgg"
        >
          <span class="vision-core__egg-card">
            <img src="/images/vision/mind-stone.svg" alt="心灵宝石">
            <strong>{{ easterTitle }}</strong>
            <small>{{ easterSubtitle }}</small>
            <span class="vision-core__egg-fragments">
              <span v-for="fragment in MEMORY_FRAGMENTS" :key="fragment.name">{{ fragment.name }}</span>
            </span>
          </span>
        </button>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.vision-core__compact {
  display: none;
}

.vision-core__panel {
  position: sticky;
  top: 5.5rem;
  padding: 1rem 1rem 0.85rem;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.72);
  box-shadow:
    0 1px 0 rgb(26 35 50 / 0.06),
    0 12px 32px -18px rgb(26 35 50 / 0.35);
  backdrop-filter: blur(12px);
}

.vision-core__heading h2 {
  color: #1a2332;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.vision-core__heading span {
  display: block;
  margin-top: 0.15rem;
  color: #5a6b7f;
  font-size: 0.72rem;
}

.vision-core__svg {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 0.25rem;
}

.vision-core__orbit {
  fill: none;
  stroke: rgb(232 185 35 / 0.35);
  stroke-dasharray: 2 7;
  stroke-width: 1;
}

.vision-core__ring-track {
  fill: none;
  stroke: rgb(26 35 50 / 0.12);
  stroke-width: 7;
}

.vision-core__ring-value {
  fill: none;
  stroke-linecap: round;
  stroke-width: 7;
  opacity: 0.55;
  transition:
    opacity 200ms ease,
    stroke-width 200ms ease;
}

.vision-core__ring-value.is-highlighted {
  opacity: 1;
  stroke-width: 10;
}

.vision-core__ring-label {
  fill: #1a2332;
  font-size: 11px;
  font-weight: 800;
  paint-order: stroke;
  stroke: rgb(255 255 255 / 0.85);
  stroke-width: 3;
}

.vision-core__gem {
  cursor: pointer;
  outline: none;
  transform-box: fill-box;
  transform-origin: center;
  animation: vision-gem-breathe 3.2s ease-in-out infinite;
}

.vision-core__gem-pulse {
  fill: none;
  stroke: #e8b923;
  stroke-width: 1.5;
  transform-box: fill-box;
  transform-origin: center;
  animation: vision-gem-pulse 3.2s ease-out infinite;
}

@keyframes vision-gem-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes vision-gem-pulse {
  0% {
    opacity: 0.7;
    transform: scale(0.82);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

.vision-core__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
  list-style: none;
}

.vision-core__legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: rgb(26 35 50 / 0.05);
  color: #1a2332;
  font-size: 0.72rem;
  cursor: pointer;
}

.vision-core__legend-chip i {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
}

.vision-core__legend-chip.is-highlighted {
  border-color: #e8b923;
  background: rgb(232 185 35 / 0.14);
  font-weight: 700;
}

.vision-core__hint {
  margin-top: 0.6rem;
  color: #5a6b7f;
  font-size: 0.68rem;
  line-height: 1.5;
}

.vision-core__egg {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: none;
  background: rgb(10 14 26 / 0.55);
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.vision-core__egg-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  max-width: 26rem;
  padding: 1.6rem 1.8rem;
  border: 1px solid rgb(242 201 76 / 0.6);
  border-radius: 1rem;
  background: #fffdf4;
  box-shadow: 0 24px 64px -16px rgb(0 0 0 / 0.5);
  text-align: center;
}

.vision-core__egg-card img {
  width: 4.2rem;
  height: 4.2rem;
}

.vision-core__egg-card strong {
  color: #1a2332;
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.vision-core__egg-card small {
  color: #5a6b7f;
  font-size: 0.78rem;
}

.vision-core__egg-fragments {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.vision-core__egg-fragments span {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgb(232 185 35 / 0.16);
  color: #8a6508;
  font-size: 0.7rem;
  font-weight: 700;
}

.vision-awakening-enter-active,
.vision-awakening-leave-active {
  transition: opacity 220ms ease;
}

.vision-awakening-enter-from,
.vision-awakening-leave-to {
  opacity: 0;
}

:global(.dark .vision-core__panel) {
  background: rgb(18 26 46 / 0.8);
  box-shadow:
    0 1px 0 rgb(242 201 76 / 0.12),
    0 12px 32px -18px rgb(0 0 0 / 0.6);
}

:global(.dark .vision-core__heading h2),
:global(.dark .vision-core__legend-chip) {
  color: #f2f5f9;
}

:global(.dark .vision-core__heading span),
:global(.dark .vision-core__hint) {
  color: #c9d4e0;
}

:global(.dark .vision-core__ring-track) {
  stroke: rgb(242 245 249 / 0.12);
}

:global(.dark .vision-core__ring-label) {
  fill: #f2f5f9;
  stroke: rgb(10 14 26 / 0.85);
}

:global(.dark .vision-core__legend-chip) {
  background: rgb(242 245 249 / 0.06);
}

:global(.dark .vision-core__egg-card) {
  background: #121a2e;
}

:global(.dark .vision-core__egg-card strong) {
  color: #f2c94c;
}

:global(.dark .vision-core__egg-card small) {
  color: #c9d4e0;
}

@media (max-width: 1023px) {
  .vision-core__panel {
    display: none;
  }

  .vision-core__compact {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 0.8rem;
    border-radius: 0.85rem;
    background: rgb(255 255 255 / 0.72);
    box-shadow:
      0 1px 0 rgb(26 35 50 / 0.06),
      0 8px 24px -16px rgb(26 35 50 / 0.35);
    backdrop-filter: blur(12px);
  }

  .vision-core__compact-gem {
    width: 2.1rem;
    height: 2.1rem;
    flex: none;
    cursor: pointer;
    animation: vision-gem-breathe 3.2s ease-in-out infinite;
  }

  .vision-core__compact-stats {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 0.2rem 0.8rem;
    min-width: 0;
    color: #1a2332;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .vision-core__compact-stats span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .vision-core__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
  }

  .vision-core__compact-awake {
    flex: none;
    color: #9a6b00;
    font-size: 0.72rem;
    font-weight: 800;
    white-space: nowrap;
  }

  :global(.dark .vision-core__compact) {
    background: rgb(18 26 46 / 0.8);
  }

  :global(.dark .vision-core__compact-stats) {
    color: #f2f5f9;
  }

  :global(.dark .vision-core__compact-awake) {
    color: #f2c94c;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vision-core__gem,
  .vision-core__gem-pulse,
  .vision-core__compact-gem {
    animation: none;
  }
}
</style>
