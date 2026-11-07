<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import { useNodePingStats } from '@/composables/useNodePingStats'
import { PING_SUMMARY_MAX_COUNT } from '@/constants/load'

/**
 * 意识核心周围轨道上的一个小圆点 = 一台节点。
 * 轨道半径按链路延迟排：延迟越小离宝石越近（内圈 ≤60ms，中圈 ≤160ms，外圈更大或无数据）。
 * 角度由父组件按黄金角散开，避免圆点重叠。
 */
const props = defineProps<{
  node: NodeData
  center: number
  angleDeg: number
  pingEnabled?: boolean
}>()

const emit = defineEmits<{
  select: [uuid: string]
}>()

const { avgLatency, hasData } = useNodePingStats(() => props.node.uuid, {
  enabled: () => props.pingEnabled !== false,
  // 与任务行（useNodePingDisplay）用同一个 maxCount，同一节点只占共享缓存里
  // 一个条目（uuid:1:150），不再各发一份请求；圆点只要平均延迟，不需要 6000 点。
  maxCount: PING_SUMMARY_MAX_COUNT,
})

const radius = computed(() => {
  if (!props.node.online)
    return 168
  if (!hasData.value)
    return 158
  if (avgLatency.value <= 60)
    return 148
  if (avgLatency.value <= 160)
    return 158
  return 168
})

const position = computed(() => {
  const angle = (props.angleDeg * Math.PI) / 180
  return {
    x: props.center + radius.value * Math.cos(angle),
    y: props.center + radius.value * Math.sin(angle),
  }
})

const latencyText = computed(() => {
  if (!props.node.online)
    return '记忆断线'
  if (!hasData.value)
    return '链路延迟 -'
  return `链路延迟 ${Math.round(avgLatency.value)} ms`
})
</script>

<template>
  <g
    class="vision-orbit-dot"
    :class="{ 'is-offline': !node.online }"
    :transform="`translate(${position.x.toFixed(1)} ${position.y.toFixed(1)})`"
    role="button"
    tabindex="0"
    :aria-label="`${node.name}，${latencyText}，点一下跳到任务线对应的一站`"
    @click="emit('select', node.uuid)"
    @keydown.enter="emit('select', node.uuid)"
  >
    <title>{{ node.name }} · {{ latencyText }}</title>
    <circle class="vision-orbit-dot__halo" r="8.5" />
    <circle class="vision-orbit-dot__core" r="4.5" />
  </g>
</template>

<style scoped>
.vision-orbit-dot {
  cursor: pointer;
  outline: none;
}

.vision-orbit-dot__halo {
  fill: rgb(242 201 76 / 0.25);
  transition: fill 160ms ease;
}

.vision-orbit-dot__core {
  fill: #e8b923;
  stroke: #fffbe0;
  stroke-width: 1;
}

.vision-orbit-dot:hover .vision-orbit-dot__halo,
.vision-orbit-dot:focus-visible .vision-orbit-dot__halo {
  fill: rgb(242 201 76 / 0.55);
}

.vision-orbit-dot.is-offline .vision-orbit-dot__halo {
  fill: rgb(138 153 168 / 0.2);
}

.vision-orbit-dot.is-offline .vision-orbit-dot__core {
  fill: #8a99a8;
  stroke: #e8edf2;
}
</style>
