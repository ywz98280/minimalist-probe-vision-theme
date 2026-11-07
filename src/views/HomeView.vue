<script setup lang="ts">
import type { PermissionKey } from '@/services/auth.service'
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed, defineAsyncComponent, nextTick, onActivated, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import QuestTimeline from '@/components/QuestTimeline.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import VisionCorePanel from '@/components/VisionCorePanel.vue'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import * as financeHelper from '@/utils/financeHelper'
import { formatBytesPerSecondSplit } from '@/utils/helper'
import { getMemoryCompleteness } from '@/utils/quest'
import { assignUniqueVisionMemories } from '@/utils/visionMemories'

/**
 * 首页 v2：记忆任务线。
 * v1 的顶部总览卡 + 世界地图 + 节点卡网格已全部推倒。
 * 首页现在只有三样东西：顶部一条任务简报条、左侧意识核心、右侧记忆任务线。
 * 详情页（/instance/{id}）不动。
 */

type HomeToolKey = 'nodes' | 'nodeCompare' | 'topology' | 'providerValue' | 'healthSummary' | 'snapshotExport'
type PrivateHomeToolKey = Exclude<HomeToolKey, 'nodes' | 'nodeCompare'>

interface HomeToolOption {
  key: Exclude<HomeToolKey, 'nodes'>
  label: string
  icon: string
  description: string
}

defineOptions({ name: 'HomeView' })

const HealthSummaryPanel = defineAsyncComponent(() => import('@/components/HealthSummaryPanel.vue'))
const NodeComparePanel = defineAsyncComponent(() => import('@/components/NodeComparePanel.vue'))
const NodeTopologyPanel = defineAsyncComponent(() => import('@/components/NodeTopologyPanel.vue'))
const ProviderValuePanel = defineAsyncComponent(() => import('@/components/ProviderValuePanel.vue'))
const SnapshotExportPanel = defineAsyncComponent(() => import('@/components/SnapshotExportPanel.vue'))

const appStore = useAppStore()
const nodesStore = useNodesStore()
const router = useRouter()
const isViewActive = ref(true)

onActivated(() => {
  isViewActive.value = true
  nextTick(() => {
    if (appStore.homeScrollPosition > 0)
      window.scrollTo({ top: appStore.homeScrollPosition, behavior: 'instant' })
  })
})

onDeactivated(() => {
  isViewActive.value = false
  appStore.homeScrollPosition = window.scrollY
})

const activeHomeTool = ref<HomeToolKey>('nodes')
const exchangeRates = ref(financeHelper.DEFAULT_EXCHANGE_RATES)
const excludeFreeNodes = ref(true)
const expandedUuid = ref<string | null>(null)

const homeToolPermissionMap: Record<PrivateHomeToolKey, PermissionKey> = {
  topology: 'nodeTopology',
  providerValue: 'providerValue',
  healthSummary: 'healthSummary',
  snapshotExport: 'snapshotExport',
}

const homeTools = computed<HomeToolOption[]>(() => {
  if (!appStore.homeToolsEnabled)
    return []

  const tools: HomeToolOption[] = [
    { key: 'nodeCompare', label: '对比', icon: 'tabler:columns-3', description: '最多四台节点实时横向对比' },
  ]
  if (!appStore.privateFeaturesAllowed)
    return tools

  return [...tools, { key: 'topology', label: '拓扑', icon: 'tabler:route', description: 'ASN / BGP / 上游根因' }, { key: 'providerValue', label: '性价比', icon: 'tabler:scale', description: '单机资源成本对比' }, { key: 'healthSummary', label: '健康', icon: 'tabler:heartbeat', description: '日周月历史健康概览' }, { key: 'snapshotExport', label: '导出', icon: 'tabler:download', description: 'CSV / JSON 数据快照' }]
})

onMounted(async () => {
  excludeFreeNodes.value = financeHelper.shouldExcludeFreeNodes()
  const { rates } = await financeHelper.getDailyExchangeRates()
  exchangeRates.value = rates
})

// 首页节点 = 全部可见节点，不再按分组切 tab
const allNodes = computed(() => nodesStore.visibleNodes)
const onlineNodes = computed(() => allNodes.value.filter(node => node.online))

const visionMemoryByNode = computed(() => assignUniqueVisionMemories(allNodes.value.map(node => node.uuid)))

// 任务简报条：一行字，不是卡片
const briefing = computed(() => {
  const total = allNodes.value.length
  const online = onlineNodes.value.length
  const avgCompleteness = online === 0
    ? 0
    : Math.round(onlineNodes.value.reduce((sum, node) => sum + getMemoryCompleteness(node), 0) / online)
  const up = onlineNodes.value.reduce((sum, node) => sum + (node.net_out || 0), 0)
  const down = onlineNodes.value.reduce((sum, node) => sum + (node.net_in || 0), 0)
  const formattedUp = formatBytesPerSecondSplit(up, appStore.byteDecimals)
  const formattedDown = formatBytesPerSecondSplit(down, appStore.byteDecimals)
  const showPrice = appStore.privateFeaturesAllowed || !appStore.hidePriceWhenLoggedOut
  const remainingValue = financeHelper.calculateTotalRemainingValueCNY(allNodes.value, exchangeRates.value, excludeFreeNodes.value)
  const formattedValue = financeHelper.formatFinanceAmount(remainingValue, 'CNY')
  return {
    text: `幻视苏醒 ${online}/${total}`,
    completeness: `记忆共鸣度 ${avgCompleteness}%`,
    energy: showPrice ? `宝石能量 ${formattedValue.symbol}${formattedValue.value}` : '宝石能量 ···',
    speed: `实时 ↑ ${formattedUp.value} ${formattedUp.unit} · ↓ ${formattedDown.value} ${formattedDown.unit}`,
  }
})

function handleNodeClick(node: NodeData) {
  router.push({ name: 'instance-detail', params: { id: node.uuid } })
}

function toggleExpand(uuid: string) {
  expandedUuid.value = expandedUuid.value === uuid ? null : uuid
}

/** 意识核心轨道上的圆点被点中：跳到任务线对应的一站并展开它。 */
function handleSelectNode(uuid: string) {
  expandedUuid.value = uuid
  nextTick(() => {
    document.querySelector(`[data-quest-uuid="${uuid}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

async function toggleHomeTool(key: Exclude<HomeToolKey, 'nodes'>) {
  if (!homeTools.value.some(tool => tool.key === key))
    return
  if (activeHomeTool.value === key) {
    activeHomeTool.value = 'nodes'
    return
  }

  const permission = key === 'nodeCompare' ? null : homeToolPermissionMap[key]
  if (permission) {
    const granted = await appStore.requireLoginPermission(permission, { force: true })
    if (!granted) {
      activeHomeTool.value = 'nodes'
      window.$message?.warning('登录状态已过期，请重新登录后使用高级工具。')
      return
    }
  }

  activeHomeTool.value = key
}

watch(homeTools, (tools) => {
  if (activeHomeTool.value !== 'nodes' && !tools.some(tool => tool.key === activeHomeTool.value))
    activeHomeTool.value = 'nodes'
}, { immediate: true })

watch(() => appStore.homeAdvancedToolsVisible, (visible) => {
  if (!visible)
    activeHomeTool.value = 'nodes'
})

const activeToolTitle = computed(() => {
  if (activeHomeTool.value === 'nodes')
    return ''
  return homeTools.value.find(tool => tool.key === activeHomeTool.value)?.description ?? ''
})
</script>

<template>
  <Teleport to="body">
    <aside v-if="isViewActive" class="vision-home-inscription" data-home-inscription aria-label="我是谁？">
      <span class="vision-home-inscription__star" aria-hidden="true" />
      <strong>我是谁？</strong>
      <span class="vision-home-inscription__ellipsis" aria-hidden="true">
        <i /><i /><i />
      </span>
    </aside>
  </Teleport>

  <div class="home-view" :class="!appStore.disablePageAnimation && 'home-view--motion'">
    <div v-if="appStore.alertEnabled && appStore.alertContent" class="alert px-4">
      <Alert class="border-none bg-background/60 backdrop-blur-xs rounded-md">
        <AlertTitle v-if="appStore.alertTitle">
          {{ appStore.alertTitle }}
        </AlertTitle>
        <AlertDescription>
          <MarkdownRenderer :content="appStore.alertContent" />
        </AlertDescription>
      </Alert>
    </div>

    <!-- 任务简报条：一行字，不是卡片 -->
    <p class="quest-brief px-4" aria-live="polite">
      <span class="quest-brief__item"><i class="quest-brief__gem" aria-hidden="true" />{{ briefing.text }}</span>
      <span class="quest-brief__sep" aria-hidden="true">·</span>
      <span class="quest-brief__item">{{ briefing.completeness }}</span>
      <span class="quest-brief__sep" aria-hidden="true">·</span>
      <span class="quest-brief__item">{{ briefing.energy }}</span>
      <span class="quest-brief__sep" aria-hidden="true">·</span>
      <span class="quest-brief__item">{{ briefing.speed }}</span>
    </p>

    <div class="quest-layout">
      <div class="quest-layout__core">
        <VisionCorePanel
          v-if="!appStore.hideVisionCore"
          :nodes="allNodes"
          :ping-enabled="isViewActive"
          @select-node="handleSelectNode"
        />
      </div>

      <div class="quest-layout__main">
        <div v-if="homeTools.length && appStore.homeAdvancedToolsVisible" class="quest-tools">
          <span class="quest-tools__label">幻视工具箱</span>
          <Button
            v-for="tool in homeTools" :key="tool.key"
            variant="ghost" size="sm"
            class="h-7 rounded-full text-xs text-muted-foreground shadow-none hover:bg-background/60"
            :class="[activeHomeTool === tool.key ? '!text-selection !bg-background' : '']"
            :aria-label="`${tool.label}：${tool.description}`"
            :aria-pressed="activeHomeTool === tool.key"
            :title="tool.description"
            @click="toggleHomeTool(tool.key)"
          >
            <Icon :icon="tool.icon" :width="13" :height="13" />
            {{ tool.label }}
          </Button>
          <span v-if="activeHomeTool !== 'nodes'" class="quest-tools__active">{{ activeToolTitle }}</span>
        </div>

        <NodeTopologyPanel v-if="activeHomeTool === 'topology'" :nodes="allNodes" />
        <NodeComparePanel v-else-if="activeHomeTool === 'nodeCompare'" :nodes="allNodes" />
        <ProviderValuePanel v-else-if="activeHomeTool === 'providerValue'" :nodes="allNodes" />
        <HealthSummaryPanel v-else-if="activeHomeTool === 'healthSummary'" :nodes="allNodes" />
        <SnapshotExportPanel v-else-if="activeHomeTool === 'snapshotExport'" :nodes="allNodes" />
        <QuestTimeline
          v-else
          :nodes="allNodes"
          :vision-memory-by-node="visionMemoryByNode"
          :expanded-uuid="expandedUuid"
          :density="appStore.questDensity"
          @toggle-expand="toggleExpand"
          @open-detail="handleNodeClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.vision-home-inscription {
  position: fixed;
  z-index: 2;
  top: clamp(7.5rem, 14vh, 9rem);
  left: 3rem;
  display: none;
  align-items: center;
  flex-direction: column;
  gap: 0.7rem;
  width: 3.5rem;
  pointer-events: none;
  user-select: none;
  animation: vision-inscription-sway 5.6s ease-in-out infinite;
  transform-origin: top center;
}

.vision-home-inscription__star {
  width: 2rem;
  height: 2rem;
  background: url('/images/vision/mind-stone.svg') center / contain no-repeat;
  filter: drop-shadow(0 3px 0 rgb(26 35 50 / 0.25));
}

.vision-home-inscription strong {
  color: #ffffff;
  font-family: var(--font-display);
  font-size: clamp(1.12rem, 1.18vw, 1.42rem);
  font-weight: 800;
  letter-spacing: 0.24em;
  line-height: 1;
  text-shadow: 0 3px 0 rgb(26 35 50 / 0.3);
  white-space: nowrap;
  writing-mode: vertical-rl;
}

.vision-home-inscription__ellipsis {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 0.38rem;
  padding: 0.15rem;
}

.vision-home-inscription__ellipsis i {
  display: block;
  width: 0.34rem;
  height: 0.34rem;
  border-radius: 999px;
  background: #ffffff;
}

.vision-home-inscription__ellipsis i:nth-child(2) {
  background: var(--vision-red);
}

.vision-home-inscription__ellipsis i:nth-child(3) {
  background: var(--vision-gold);
}

:global(.dark .vision-home-inscription strong) {
  color: #f2c94c;
}

@media (min-width: 1600px) and (min-height: 900px) {
  .vision-home-inscription {
    display: flex;
  }
}

@keyframes vision-inscription-sway {
  0%,
  100% {
    transform: rotate(-2deg);
  }

  50% {
    transform: rotate(2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vision-home-inscription {
    animation: none;
  }
}

.home-view--motion {
  animation: home-view-enter 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes home-view-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 任务简报条：一行字 */
.quest-brief {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.6rem;
  padding-top: 0.85rem;
  padding-bottom: 0.15rem;
  color: #1a2332;
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.quest-brief__item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
}

.quest-brief__gem {
  width: 0.95rem;
  height: 0.95rem;
  background: url('/images/vision/mind-stone.svg') center / contain no-repeat;
}

.quest-brief__sep {
  color: #9a6b00;
}

/* 两栏：左意识核心 + 右任务线 */
.quest-layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
  padding: 0.7rem 1rem 1rem;
}

.quest-layout__core {
  min-width: 0;
}

.quest-layout__main {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 0;
}

.quest-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.55);
  backdrop-filter: blur(8px);
}

.quest-tools__label {
  margin-right: 0.25rem;
  color: #5a6b7f;
  font-size: 0.72rem;
  font-weight: 700;
}

.quest-tools__active {
  margin-left: auto;
  color: #5a6b7f;
  font-size: 0.72rem;
}

:global(.dark .quest-brief) {
  color: #f2f5f9;
}

:global(.dark .quest-tools) {
  background: rgb(18 26 46 / 0.7);
}

:global(.dark .quest-tools__label),
:global(.dark .quest-tools__active) {
  color: #c9d4e0;
}

@media (max-width: 1023px) {
  .quest-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.7rem;
    padding: 0.6rem 0.75rem 0.75rem;
  }

  .quest-brief {
    padding-top: 0.7rem;
    font-size: 0.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-view--motion {
    animation: none;
  }
}
</style>
