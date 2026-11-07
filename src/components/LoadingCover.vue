<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const hasCustomBackground = computed(() => appStore.backgroundEnabled && Boolean(appStore.currentBackgroundUrl))
</script>

<template>
  <div
    class="loading-cover flex items-center inset-0 justify-center fixed z-20"
    :class="hasCustomBackground ? 'loading-cover--custom-background' : ''"
    role="status"
    aria-live="polite"
  >
    <div class="loading-cover__indicator flex flex-col items-center gap-3">
      <!-- 心灵宝石：金色六边宝石缓慢旋转，六边形光环逐块拼合 -->
      <span class="vision-stone-loader" :class="hasCustomBackground && 'vision-stone-loader--small'" aria-hidden="true">
        <span class="vision-stone-loader__ring" />
        <span class="vision-stone-loader__ring vision-stone-loader__ring--inner" />
        <img class="vision-stone-loader__gem" src="/images/vision/mind-stone.svg" alt="" width="72" height="72">
      </span>
      <span v-if="!hasCustomBackground" class="loading-cover__text">正在连接记忆…</span>
      <span v-else class="sr-only">加载中</span>
    </div>
  </div>
</template>

<style scoped>
.loading-cover {
  background: linear-gradient(180deg, rgb(247 248 250 / 0.97), rgb(233 223 192 / 0.97));
}

:global(.dark .loading-cover) {
  background: linear-gradient(180deg, rgb(10 14 26 / 0.97), rgb(13 20 36 / 0.97));
}

.loading-cover__indicator {
  transition:
    opacity 240ms ease,
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.loading-cover__text {
  color: #1a2332;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

:global(.dark .loading-cover__text) {
  color: #f2c94c;
  text-shadow: 0 0 18px rgb(242 201 76 / 0.45);
}

.loading-cover--custom-background {
  background: rgb(26 35 50 / 0.12);
}

.vision-stone-loader {
  position: relative;
  display: block;
  width: 132px;
  height: 132px;
  animation: vision-stone-hover 1.6s ease-in-out infinite;
}

.vision-stone-loader--small {
  transform: scale(0.5);
}

.vision-stone-loader__ring {
  position: absolute;
  inset: 0;
  border: 2px dashed rgb(232 185 35 / 0.75);
  clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  animation: vision-stone-ring-spin 6s linear infinite;
}

.vision-stone-loader__ring--inner {
  inset: 16px;
  border-style: solid;
  border-color: rgb(14 154 139 / 0.55);
  animation-duration: 4s;
  animation-direction: reverse;
}

.vision-stone-loader__gem {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 72px;
  height: 72px;
  filter: drop-shadow(0 0 14px rgb(242 201 76 / 0.8));
  transform: translate(-50%, -50%);
  animation: vision-stone-spin 2.4s linear infinite;
}

@keyframes vision-stone-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes vision-stone-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vision-stone-hover {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vision-stone-loader,
  .vision-stone-loader__gem,
  .vision-stone-loader__ring {
    animation: none;
  }
}
</style>
