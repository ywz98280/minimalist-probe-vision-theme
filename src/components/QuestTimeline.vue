<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import type { QuestFilter } from '@/utils/quest'
import { Icon } from '@iconify/vue'
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import QuestNodeRow from '@/components/QuestNodeRow.vue'
import { Empty } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/stores/app'
import { isNodeMatchSearch } from '@/utils/nodeSearch'
import { countQuestFilter, getMemoryCompleteness, matchesQuestFilter, QUEST_FILTERS } from '@/utils/quest'

/**
 * 记忆任务线（Vision Probe v2 首页右栏）。
 * 一条竖着的金色脊线，每个节点是线上的一站，按记忆完整度从高到低排；
 * 顶部是任务阶段 pill tabs + 搜索框。点一行在原地展开，不跳页。
 */
const props = defineProps<{
  nodes: NodeData[]
  visionMemoryByNode: Map<string, string>
  expandedUuid: string | null
  density?: 'compact' | 'comfortable'
}>()

const emit = defineEmits<{
  toggleExpand: [uuid: string]
  openDetail: [node: NodeData]
}>()

const appStore = useAppStore()
const activeFilter = ref<QuestFilter>('all')
const searchText = ref('')
const debouncedSearchText = ref('')

const updateDebouncedSearch = useDebounceFn((value: string) => {
  debouncedSearchText.value = value
}, 300)

watch(searchText, (value) => {
  updateDebouncedSearch(value)
})

function clearSearch(): void {
  searchText.value = ''
  debouncedSearchText.value = ''
}

const filterCounts = computed(() => {
  const counts = {} as Record<QuestFilter, number>
  for (const filter of QUEST_FILTERS)
    counts[filter.key] = countQuestFilter(props.nodes, filter.key, appStore.homeHighLoadThreshold, appStore.homeExpiringDays)
  return counts
})

/** 按记忆完整度从高到低排；完整度相同按名字稳排，离线（0%）自然沉底。 */
const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => {
    const diff = getMemoryCompleteness(b) - getMemoryCompleteness(a)
    if (diff !== 0)
      return diff
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})

const visibleNodes = computed(() => {
  const query = debouncedSearchText.value.trim()
  return sortedNodes.value.filter((node) => {
    if (!matchesQuestFilter(node, activeFilter.value, appStore.homeHighLoadThreshold, appStore.homeExpiringDays))
      return false
    if (!query)
      return true
    const memory = props.visionMemoryByNode.get(node.uuid) ?? ''
    return memory.includes(query) || isNodeMatchSearch(node, query)
  })
})

const emptyDescription = computed(() => {
  if (debouncedSearchText.value.trim())
    return '记忆矩阵里没翻到匹配的记忆碎片'
  if (activeFilter.value !== 'all')
    return '当前任务阶段下没有记忆碎片'
  return '记忆册空空，还没有记忆碎片'
})
</script>

<template>
  <section class="quest-timeline" aria-label="记忆任务线">
    <div class="quest-timeline__toolbar">
      <div class="quest-timeline__filters" role="tablist" aria-label="任务阶段筛选">
        <button
          v-for="filter in QUEST_FILTERS"
          :key="filter.key"
          type="button"
          role="tab"
          class="quest-timeline__pill"
          :class="{ 'is-active': activeFilter === filter.key }"
          :aria-selected="activeFilter === filter.key"
          @click="activeFilter = filter.key"
        >
          {{ filter.label }}
          <span class="quest-timeline__pill-count">{{ filterCounts[filter.key] ?? 0 }}</span>
        </button>
      </div>
      <div class="quest-timeline__search">
        <Input
          v-model="searchText"
          placeholder="搜索名称、记忆碎片、地区"
          aria-label="搜索记忆碎片"
          class="h-8 border-none bg-background/50 shadow-none backdrop-blur-xs rounded-md"
          @keydown.esc.prevent="clearSearch"
        />
        <Icon icon="tabler:search" :width="14" :height="14" class="quest-timeline__search-icon" aria-hidden="true" />
        <button
          v-if="searchText"
          type="button"
          class="quest-timeline__search-clear"
          aria-label="清空搜索"
          @click="clearSearch"
        >
          <Icon icon="tabler:x" :width="14" :height="14" />
        </button>
      </div>
    </div>

    <p class="quest-timeline__caption">
      按记忆完整度从高到低排 · 完整度 = 100 − (幻视核心转速 + 记忆矩阵) ÷ 2 · 点一行在原地展开
    </p>

    <ol v-if="visibleNodes.length > 0" class="quest-timeline__spine">
      <QuestNodeRow
        v-for="node in visibleNodes"
        :key="node.uuid"
        :node="node"
        :vision-memory="visionMemoryByNode.get(node.uuid)"
        :expanded="expandedUuid === node.uuid"
        :density="density ?? 'compact'"
        @toggle="emit('toggleExpand', node.uuid)"
        @open-detail="emit('openDetail', $event)"
      />
    </ol>
    <div v-else class="quest-timeline__empty">
      <Empty :description="emptyDescription" />
    </div>
  </section>
</template>

<style scoped>
.quest-timeline__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.quest-timeline__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.quest-timeline__pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.75rem;
  border: 1px solid rgb(26 35 50 / 0.12);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.6);
  color: #1a2332;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    background 160ms ease,
    border-color 160ms ease;
}

.quest-timeline__pill-count {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: rgb(26 35 50 / 0.08);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.quest-timeline__pill.is-active {
  border-color: #e8b923;
  background: #e8b923;
  color: #1a2332;
}

.quest-timeline__pill.is-active .quest-timeline__pill-count {
  background: rgb(26 35 50 / 0.15);
}

.quest-timeline__search {
  position: relative;
  flex: 1;
  min-width: 11rem;
  max-width: 18rem;
  margin-left: auto;
}

.quest-timeline__search-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  color: #5a6b7f;
  pointer-events: none;
  transform: translateY(-50%);
}

.quest-timeline__search :deep(input) {
  padding-left: 1.9rem;
}

.quest-timeline__search-clear {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  display: flex;
  color: #5a6b7f;
  cursor: pointer;
  transform: translateY(-50%);
}

.quest-timeline__caption {
  margin-top: 0.55rem;
  color: #5a6b7f;
  font-size: 0.7rem;
}

.quest-timeline__spine {
  position: relative;
  margin-top: 0.6rem;
  padding: 0;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.72);
  box-shadow:
    0 1px 0 rgb(26 35 50 / 0.06),
    0 12px 32px -18px rgb(26 35 50 / 0.35);
  backdrop-filter: blur(12px);
  list-style: none;
  overflow: hidden;
}

.quest-timeline__spine::before {
  position: absolute;
  top: 0.9rem;
  bottom: 0.9rem;
  left: 2.19rem;
  width: 2px;
  background: linear-gradient(180deg, #e8b923, #f2c94c 55%, rgb(242 201 76 / 0.25));
  content: '';
}

.quest-timeline__spine :deep(.quest-row__gem) {
  position: relative;
  z-index: 1;
}

.quest-timeline__empty {
  margin-top: 0.6rem;
  padding: 2rem 1rem;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.6);
  text-align: center;
}

:global(.dark .quest-timeline__pill) {
  border-color: rgb(242 245 249 / 0.16);
  background: rgb(18 26 46 / 0.7);
  color: #f2f5f9;
}

:global(.dark .quest-timeline__pill-count) {
  background: rgb(242 245 249 / 0.12);
}

:global(.dark .quest-timeline__pill.is-active) {
  border-color: #e8b923;
  background: #e8b923;
  color: #1a2332;
}

:global(.dark .quest-timeline__caption) {
  color: #c9d4e0;
}

:global(.dark .quest-timeline__spine),
:global(.dark .quest-timeline__empty) {
  background: rgb(18 26 46 / 0.8);
}

@media (max-width: 640px) {
  .quest-timeline__search {
    max-width: none;
    margin-left: 0;
  }

  .quest-timeline__spine::before {
    left: 1.79rem;
  }
}
</style>
