<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const isLoaded = ref(false)
const hasError = ref(false)

const showBackground = computed(() => appStore.backgroundEnabled)
const currentUrl = computed(() => showBackground.value ? appStore.currentBackgroundUrl : '')
const backgroundType = computed(() => appStore.backgroundType)
const hasCustomBackground = computed(() => showBackground.value && !!currentUrl.value)
const showBackgroundOverlay = computed(() => appStore.backgroundOverlay > 0)

const backgroundStyle = computed(() => {
  const blur = appStore.backgroundBlur
  return {
    filter: blur > 0 ? `blur(${blur}px)` : 'none',
    opacity: appStore.backgroundType === 'video' && !isLoaded.value ? 0 : 1,
  }
})

const backgroundContainerStyle = computed(() => {
  const overlay = appStore.backgroundOverlay
  if (overlay >= 0)
    return {}

  return { opacity: 1 - Math.abs(overlay) / 100 }
})

const overlayStyle = computed(() => {
  const overlay = appStore.backgroundOverlay
  if (overlay <= 0)
    return {}

  return { backgroundColor: `rgba(0, 0, 0, ${overlay / 100})` }
})

const showLoadedBackground = computed(() =>
  hasCustomBackground.value && isLoaded.value && !hasError.value,
)

const showMediaBackground = computed(() =>
  hasCustomBackground.value && !hasError.value && (backgroundType.value === 'video' || showLoadedBackground.value),
)

const showDefaultBackground = computed(() =>
  !hasCustomBackground.value || !showMediaBackground.value || hasError.value,
)

const showLoadingBackground = computed(() =>
  hasCustomBackground.value && backgroundType.value === 'video' && !isLoaded.value && !hasError.value,
)

const showFallbackBackground = computed(() =>
  hasCustomBackground.value && backgroundType.value === 'video' && hasError.value,
)

let imageLoader: HTMLImageElement | null = null

function clearImageLoader() {
  if (imageLoader) {
    imageLoader.onload = null
    imageLoader.onerror = null
    imageLoader = null
  }
}

function loadImage(url: string) {
  isLoaded.value = false
  hasError.value = false

  clearImageLoader()

  imageLoader = new Image()
  imageLoader.onload = () => {
    isLoaded.value = true
    hasError.value = false
  }
  imageLoader.onerror = () => {
    isLoaded.value = false
    hasError.value = true
  }
  imageLoader.src = url
}

const videoRef = ref<HTMLVideoElement | null>(null)

function resetBackgroundState() {
  clearImageLoader()

  if (videoRef.value) {
    videoRef.value.pause()
    videoRef.value.removeAttribute('src')
    videoRef.value.load()
  }

  isLoaded.value = false
  hasError.value = false
}

function handleVideoLoaded() {
  isLoaded.value = true
  hasError.value = false
}
function handleVideoError() {
  isLoaded.value = false
  hasError.value = true
}

watch([showBackground, currentUrl, backgroundType], ([enabled, url, type]) => {
  if (!enabled || !url) {
    resetBackgroundState()
    return
  }

  if (type === 'image') {
    loadImage(url)
  }
  else if (type === 'video') {
    clearImageLoader()
    isLoaded.value = false
    hasError.value = false
  }
}, { immediate: true })

onUnmounted(() => {
  resetBackgroundState()
})
</script>

<template>
  <div class="background-container" :style="backgroundContainerStyle">
    <Transition name="fade">
      <div v-if="showDefaultBackground" class="default-background" aria-hidden="true">
        <div class="vision-sun" />
        <div class="vision-sky-pattern" />
        <span class="vision-cloud vision-cloud--1" />
        <span class="vision-cloud vision-cloud--2" />
        <span class="vision-cloud vision-cloud--3" />
        <span class="vision-cloud vision-cloud--4" />
        <span class="vision-flyer"><i /></span>
        <span class="vision-hex vision-hex--1" aria-hidden="true" />
        <span class="vision-hex vision-hex--2" aria-hidden="true" />
        <span class="vision-hex vision-hex--3" aria-hidden="true" />
        <span class="vision-hex vision-hex--4" aria-hidden="true" />
        <span class="vision-hex vision-hex--5" aria-hidden="true" />

        <!-- 西景镇天际线：抽象几何剪影——房子、水塔、电线杆 -->
        <svg class="vision-town" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="vision-town-tile" width="1200" height="220" patternUnits="userSpaceOnUse">
              <path class="t-far" d="M0 204V150H60V130H110V160H170V120H210V140H300V165H380V110H420V100H440V110H470V150H560V135H640V160H720V125H780V145H880V115H930V150H1010V130H1090V155H1150V140H1200V204Z" />

              <g class="t-wires">
                <path d="M-350 74Q-50 112 250 74M250 74Q550 112 850 74M850 74Q1150 112 1450 74" />
                <path d="M-350 84Q-50 120 250 84M250 84Q550 120 850 84M850 84Q1150 120 1450 84" />
              </g>

              <!-- 两层小楼 -->
              <rect class="t-wall" x="40" y="148" width="140" height="56" />
              <path class="t-roof" d="M30 152H190L176 138H44Z" />
              <rect class="t-wall" x="62" y="104" width="96" height="36" />
              <path class="t-roof" d="M50 108L110 78L170 108Z" />
              <rect class="t-win t-lit" x="76" y="114" width="20" height="14" rx="1.5" />
              <rect class="t-win" x="124" y="114" width="20" height="14" rx="1.5" />
              <rect class="t-win" x="54" y="162" width="26" height="18" rx="1.5" />
              <rect class="t-win t-lit" x="94" y="162" width="26" height="18" rx="1.5" />
              <rect class="t-door" x="140" y="166" width="22" height="38" rx="1.5" />
              <rect class="t-fence" x="18" y="182" width="206" height="22" />
              <path class="t-fence-line" d="M18 189H224M18 196H224M52 182V204M86 182V204M120 182V204M154 182V204M188 182V204" />

              <!-- 电线杆 -->
              <rect class="t-pole" x="247" y="60" width="6" height="144" />
              <rect class="t-pole" x="232" y="72" width="36" height="4" rx="1" />
              <rect class="t-pole" x="847" y="60" width="6" height="144" />
              <rect class="t-pole" x="832" y="72" width="36" height="4" rx="1" />

              <!-- 空地和三根水泥管 -->
              <path class="t-grass" d="M284 204l6-10 4 10M318 204l5-8 5 8M470 204l6-11 5 11M520 204l4-8 5 8M540 204l6-10 4 10" />
              <circle class="t-pipe" cx="362" cy="178" r="26" />
              <circle class="t-pipe" cx="416" cy="178" r="26" />
              <circle class="t-pipe" cx="389" cy="132" r="26" />
              <circle class="t-hole" cx="362" cy="178" r="17" />
              <circle class="t-hole" cx="416" cy="178" r="17" />
              <circle class="t-hole" cx="389" cy="132" r="17" />
              <path class="t-pipe-rim" d="M346 166a20 20 0 0 1 12-8M400 166a20 20 0 0 1 12-8M373 120a20 20 0 0 1 12-8" />

              <!-- 带阳台的房子 -->
              <rect class="t-wall" x="590" y="120" width="190" height="84" />
              <path class="t-roof" d="M576 124L685 76L794 124Z" />
              <rect class="t-win t-lit" x="610" y="134" width="24" height="16" rx="1.5" />
              <rect class="t-win" x="732" y="134" width="24" height="16" rx="1.5" />
              <rect class="t-win t-lit" x="702" y="166" width="30" height="20" rx="1.5" />
              <rect class="t-door" x="626" y="168" width="22" height="36" rx="1.5" />
              <path class="t-rail" d="M606 154H702M606 154V164M630 154V164M654 154V164M678 154V164M702 154V164M606 164H702" />

              <!-- 树 -->
              <rect class="t-trunk" x="801" y="160" width="8" height="44" rx="2" />
              <circle class="t-tree" cx="805" cy="140" r="26" />
              <circle class="t-tree" cx="788" cy="154" r="18" />
              <circle class="t-tree" cx="824" cy="154" r="18" />

              <!-- 公寓 -->
              <rect class="t-wall" x="890" y="110" width="160" height="94" />
              <rect class="t-roof" x="884" y="104" width="172" height="8" rx="2" />
              <rect class="t-roof" x="1010" y="86" width="24" height="18" rx="2" />
              <rect class="t-win" x="906" y="126" width="30" height="18" rx="1.5" />
              <rect class="t-win t-lit" x="956" y="126" width="30" height="18" rx="1.5" />
              <rect class="t-win" x="1006" y="126" width="30" height="18" rx="1.5" />
              <rect class="t-win t-lit" x="906" y="160" width="30" height="18" rx="1.5" />
              <rect class="t-win" x="956" y="160" width="30" height="18" rx="1.5" />
              <rect class="t-win t-lit" x="1006" y="160" width="30" height="18" rx="1.5" />
              <rect class="t-fence" x="1068" y="184" width="132" height="20" />
              <path class="t-fence-line" d="M1068 191H1200M1068 197H1200M1100 184V204M1134 184V204M1168 184V204" />

              <rect class="t-ground" x="0" y="204" width="1200" height="16" />
              <path class="t-road" d="M20 213H80M160 213H220M300 213H360M440 213H500M580 213H640M720 213H780M860 213H920M1000 213H1060M1140 213H1200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#vision-town-tile)" />
        </svg>

        <!-- 幻视脑海里的小屋：深色模式专用，见下方 .vision-mind-house -->
        <span class="vision-mind-house" aria-hidden="true" />
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="showLoadingBackground" class="background-loading" />
    </Transition>
    <Transition name="fade">
      <div v-if="showFallbackBackground" class="background-loading" />
    </Transition>
    <Transition name="fade">
      <div v-if="showMediaBackground" class="background-media" :style="backgroundStyle">
        <div
          v-if="backgroundType === 'image'"
          class="background-image"
          :style="{ backgroundImage: `url(${currentUrl})` }"
        />
        <video
          v-else-if="backgroundType === 'video'"
          ref="videoRef"
          class="background-video"
          :src="currentUrl ?? undefined"
          autoplay
          loop
          muted
          preload="auto"
          playsinline
          @loadeddata="handleVideoLoaded"
          @canplay="handleVideoLoaded"
          @error="handleVideoError"
        />
      </div>
    </Transition>
    <div v-if="showBackgroundOverlay" class="background-overlay" :style="overlayStyle" />
  </div>
</template>

<style scoped>
.background-container {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}

.default-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* 白幻视：瓷白天空，地平线附近有一层心灵宝石金的暖光 */
  background:
    radial-gradient(ellipse 80% 38% at 50% 100%, rgb(242 201 76 / 0.35), transparent 70%),
    linear-gradient(180deg, #f7f8fa 0%, #f2f0e6 55%, #e9dfc0 100%);
}

.dark .default-background {
  /* 虚空夜幕：深空星空，六边形网格与金色宝石月 */
  background:
    radial-gradient(ellipse 70% 40% at 50% 100%, rgb(232 185 35 / 0.14), transparent 70%),
    linear-gradient(180deg, #0a0e1a 0%, #0d1424 46%, #121a2e 100%);
}

.vision-sun,
.vision-sky-pattern,
.vision-cloud,
.vision-flyer,
.vision-town {
  /* hex particles are positioned by their own class */
}
.vision-sun,
.vision-sky-pattern,
.vision-cloud,
.vision-flyer,
.vision-town {
  position: absolute;
  pointer-events: none;
}

/* 心灵宝石日：左上角一轮金色宝石，光芒缓慢旋转 */
.vision-sun {
  top: -15rem;
  left: -13rem;
  width: 32rem;
  height: 32rem;
  border-radius: 50%;
  background:
    radial-gradient(circle, #fffbe0 0 5.5rem, #f2c94c 5.6rem 7.2rem, rgb(242 201 76 / 0.35) 7.3rem, transparent 11rem),
    repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.22) 0deg 7deg, transparent 7deg 20deg);
  mask-image: radial-gradient(circle, #000 42%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle, #000 42%, transparent 70%);
  animation: vision-sun-spin 120s linear infinite;
}

/* 金色宝石月：夜里换成左上角的一轮金色六边宝石月 */
.dark .vision-sun {
  top: -4.5rem;
  left: -4.5rem;
  width: 15rem;
  height: 15rem;
  background:
    radial-gradient(circle at 58% 60%, rgb(214 170 40 / 0.4) 0 1.1rem, transparent 1.15rem),
    radial-gradient(circle at 72% 44%, rgb(214 170 40 / 0.32) 0 0.7rem, transparent 0.75rem),
    radial-gradient(circle at 46% 76%, rgb(214 170 40 / 0.3) 0 0.55rem, transparent 0.6rem),
    radial-gradient(circle at 60% 60%, #fff6c2, #ffd700 68%, #f2c200);
  box-shadow:
    0 0 0 1.2rem rgb(255 215 0 / 0.07),
    0 0 0 2.6rem rgb(255 215 0 / 0.04),
    0 0 5rem rgb(255 215 0 / 0.3);
  mask-image: none;
  -webkit-mask-image: none;
  animation: none;
}

/* 淡淡的六边形网格，呼应幻视的合成晶格 */
.vision-sky-pattern {
  inset: 0;
  opacity: 0.13;
  background-image:
    radial-gradient(circle, #ffffff 0 2px, transparent 2.5px),
    radial-gradient(circle, #ffffff 0 1.2px, transparent 1.7px);
  background-position:
    0 0,
    23px 23px;
  background-size: 46px 46px;
  mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 85%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 55%, transparent 85%);
}

.dark .vision-sky-pattern {
  z-index: 1;
  opacity: 0.75;
  background-image:
    radial-gradient(circle at 18% 22%, #ffffff 0 1px, transparent 1.6px),
    radial-gradient(circle at 64% 35%, #a5e4ff 0 1px, transparent 1.7px),
    radial-gradient(circle at 34% 78%, #ffd700 0 1.2px, transparent 1.8px),
    radial-gradient(circle at 88% 67%, #ffffff 0 1px, transparent 1.5px);
  background-position: 0 0;
  background-size:
    180px 190px,
    260px 230px,
    310px 290px,
    220px 270px;
  animation: vision-star-twinkle 6s ease-in-out infinite alternate;
}

/* 漫画风白云 */
.vision-cloud {
  display: block;
  aspect-ratio: 200 / 104;
  background: url('/images/vision/cloud.svg') center / contain no-repeat;
  filter: drop-shadow(0 8px 0 rgb(0 90 150 / 0.1));
  animation: vision-cloud-drift 40s ease-in-out infinite alternate;
}

.vision-cloud--1 {
  top: 11%;
  left: 3%;
  width: 13rem;
}

.vision-cloud--2 {
  top: 26%;
  right: 2%;
  width: 10rem;
  animation-duration: 52s;
  animation-direction: alternate-reverse;
}

.vision-cloud--3 {
  top: 52%;
  left: -2%;
  width: 8rem;
  opacity: 0.85;
  animation-duration: 46s;
}

.vision-cloud--4 {
  top: 62%;
  right: -1%;
  width: 11rem;
  opacity: 0.8;
  animation-duration: 58s;
}

.dark .vision-cloud {
  /* 夜云：之前只有 0.07，夜里基本看不见；提到 0.3 变成柔和夜云。
     小屋层在 DOM 里排在漂浮物之后会盖住它们，所以提到小屋之上。 */
  z-index: 1;
  opacity: 0.3;
  filter: none;
}

/* 一颗心灵宝石从天空里慢慢飞过 */
.vision-flyer {
  top: 17%;
  left: -7rem;
  width: 4.6rem;
  aspect-ratio: 220 / 272;
  animation: vision-flyer-cross 46s linear infinite;
}

.vision-flyer i {
  display: block;
  width: 100%;
  height: 100%;
  background: url('/images/vision/mind-stone.svg') center / contain no-repeat;
  filter: drop-shadow(0 10px 8px rgb(184 134 11 / 0.35));
  animation: vision-flyer-bob 2.6s ease-in-out infinite;
}

.dark .vision-flyer {
  /* 宝石夜里要发光：提到 0.95，提到小屋之上，金色光晕 */
  z-index: 1;
  opacity: 0.95;
}

.dark .vision-flyer i {
  filter: drop-shadow(0 0 14px rgb(242 201 76 / 0.6)) drop-shadow(0 6px 8px rgb(0 0 0 / 0.45));
}

/* 幻视脑海里的小屋：手绘客厅内景（窗、沙发、落地灯、发光的心灵宝石）。
   只在深色模式出现，代替小镇剪影；顶部压一道深色渐变，保证任务线文字可读。
   注意：小屋层在 DOM 里排在云、宝石、六边形粒子之后，会盖住它们，
   所以深色下的漂浮物要单独提 z-index（见下方 .dark 规则）。 */
.vision-mind-house {
  position: absolute;
  inset: 0;
  display: none;
  pointer-events: none;
}

.dark .vision-mind-house {
  display: block;
  background:
    linear-gradient(180deg, rgb(10 14 26 / 0.8) 0%, rgb(10 14 26 / 0.42) 42%, rgb(10 14 26 / 0.68) 100%),
    url('/images/vision/mind-house.svg') center 72% / cover no-repeat;
}

.dark .vision-town {
  display: none;
}

/* 小镇天际线 */
.vision-town {
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 220px;
}

.t-far {
  fill: rgb(255 255 255 / 0.2);
}
.t-wall {
  fill: #ffffff;
}
.t-roof,
.t-door {
  fill: #1a2332;
}
.t-win {
  fill: #e8d9a8;
}
.t-win.t-lit {
  fill: #f2c94c;
}
.t-fence {
  fill: #efede4;
}
.t-fence-line,
.t-rail {
  fill: none;
  stroke: #0e9a8b;
  stroke-width: 2;
}
.t-rail {
  stroke: #0b6fb3;
}
.t-pole {
  fill: #1a2332;
}
.t-wires path {
  fill: none;
  stroke: rgb(26 35 50 / 0.4);
  stroke-width: 1.4;
}
.t-pipe {
  fill: #f7f8fa;
  stroke: #e8b923;
  stroke-width: 2;
}
.t-hole {
  fill: #e8b923;
}
.t-pipe-rim {
  fill: none;
  stroke: #ffffff;
  stroke-linecap: round;
  stroke-width: 3;
}
.t-grass {
  fill: none;
  stroke: #0e9a8b;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
}
.t-tree {
  fill: #0e9a8b;
}
.t-trunk {
  fill: #1a2332;
}
.t-ground {
  fill: #e5d9ae;
}
.t-road {
  fill: none;
  stroke: rgb(255 255 255 / 0.45);
  stroke-width: 2.5;
}

.dark .t-far {
  fill: rgb(76 195 255 / 0.07);
}
.dark .t-wall {
  fill: #121a2e;
}
.dark .t-roof,
.dark .t-door {
  fill: #061a2e;
}
.dark .t-win {
  fill: #15395a;
}
.dark .t-win.t-lit {
  fill: #ffd966;
}
.dark .t-fence {
  fill: #0a2742;
}
.dark .t-fence-line {
  stroke: #0f3656;
}
.dark .t-rail {
  stroke: #061a2e;
}
.dark .t-pole {
  fill: #041424;
}
.dark .t-wires path {
  stroke: rgb(2 12 24 / 0.9);
}
.dark .t-pipe {
  fill: #1c4466;
  stroke: #0f2f4c;
}
.dark .t-hole {
  fill: #04121f;
}
.dark .t-pipe-rim {
  stroke: rgb(165 228 255 / 0.25);
}
.dark .t-grass,
.dark .t-tree {
  fill: #0e9a8b;
  stroke: #0e9a8b;
}
.dark .t-grass {
  fill: none;
}
.dark .t-trunk {
  fill: #06182b;
}
.dark .t-ground {
  fill: #031120;
}
.dark .t-road {
  stroke: rgb(255 215 0 / 0.2);
}

@media (max-width: 640px) {
  .vision-town {
    width: calc(100% / 0.62);
    transform: scale(0.62);
    transform-origin: left bottom;
  }

  .vision-sun {
    top: -18rem;
    left: -16rem;
  }

  .dark .vision-sun {
    top: -6rem;
    left: -6rem;
  }

  .vision-cloud--1 {
    width: 8rem;
  }

  .vision-cloud--2,
  .vision-cloud--4 {
    width: 6.5rem;
  }

  .vision-flyer {
    width: 3.2rem;
  }
}

@keyframes vision-sun-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes vision-star-twinkle {
  to {
    opacity: 0.45;
  }
}

@keyframes vision-cloud-drift {
  to {
    transform: translate3d(-48px, 6px, 0);
  }
}

@keyframes vision-flyer-cross {
  0% {
    transform: translate3d(0, 0, 0) rotate(8deg);
  }
  25% {
    transform: translate3d(28vw, -30px, 0) rotate(4deg);
  }
  50% {
    transform: translate3d(56vw, 16px, 0) rotate(10deg);
  }
  75% {
    transform: translate3d(84vw, -20px, 0) rotate(5deg);
  }
  100% {
    transform: translate3d(calc(100vw + 14rem), 0, 0) rotate(8deg);
  }
}

@keyframes vision-flyer-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vision-sun,
  .vision-cloud,
  .vision-flyer,
  .vision-flyer i,
  .dark .vision-sky-pattern {
    animation: none;
  }
  .vision-flyer {
    display: none;
  }
}

.background-loading {
  position: absolute;
  inset: 0;
  background-color: #0a0e1a;
}

:root:not(.dark) .background-loading {
  background: linear-gradient(180deg, #f7f8fa, #efe6c0);
}

.background-media {
  position: absolute;
  inset: 0;
  transition: opacity 0.8s ease;
}

.background-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.background-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.8s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 六边形粒子：从天空缓缓飘落、左右摇摆 */
.vision-hex {
  position: absolute;
  width: 1.1rem;
  height: 1.1rem;
  background: url('/images/vision/hex-particle.svg') center / contain no-repeat;
  opacity: 0.85;
  pointer-events: none;
  animation: vision-hex-fall 14s linear infinite;
}
.vision-hex--1 {
  top: -2rem;
  left: 12%;
  animation-duration: 13s;
  animation-delay: 0s;
}
.vision-hex--2 {
  top: -2rem;
  left: 34%;
  width: 0.85rem;
  height: 0.85rem;
  animation-duration: 17s;
  animation-delay: 3s;
}
.vision-hex--3 {
  top: -2rem;
  left: 58%;
  width: 1.3rem;
  height: 1.3rem;
  animation-duration: 15s;
  animation-delay: 6s;
}
.vision-hex--4 {
  top: -2rem;
  left: 76%;
  width: 0.9rem;
  height: 0.9rem;
  animation-duration: 19s;
  animation-delay: 1.5s;
}
.vision-hex--5 {
  top: -2rem;
  left: 90%;
  animation-duration: 14s;
  animation-delay: 8s;
}
.dark .vision-hex {
  /* 金色六边形粒子夜里更亮，带一点金光，提到小屋之上 */
  z-index: 1;
  opacity: 0.9;
  filter: drop-shadow(0 0 6px rgb(242 201 76 / 0.45));
}
@keyframes vision-hex-fall {
  0% {
    transform: translate3d(0, -2rem, 0) rotate(0deg);
  }
  25% {
    transform: translate3d(24px, 26vh, 0) rotate(120deg);
  }
  50% {
    transform: translate3d(-18px, 52vh, 0) rotate(240deg);
  }
  75% {
    transform: translate3d(20px, 78vh, 0) rotate(320deg);
  }
  100% {
    transform: translate3d(0, 104vh, 0) rotate(420deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vision-hex {
    animation: none;
    display: none;
  }
}
</style>
