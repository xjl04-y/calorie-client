<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/counter.ts'
import { useSystemStore } from '@/stores/useSystemStore.ts'

const store = useGameStore()
const systemStore = useSystemStore()

const env = computed(() => store.environment)
const projectile = computed(() => systemStore.temp.projectile)
const floatingTexts = computed(() => (systemStore.isPureMode ? [] : store.temp.floatingTexts || []))
const isExhausted = computed(() => store.heroStore.isExhausted)
const isPure = computed(() => systemStore.isPureMode)
const isDarkTheme = computed(() => store.isDarkMode)
const weatherEnabled = ref(localStorage.getItem('app_setting_weather') !== 'false')

const showWeatherEffects = computed(() => {
  return weatherEnabled.value
})

const updateWeatherSetting = () => {
  weatherEnabled.value = localStorage.getItem('app_setting_weather') !== 'false'
}

const weatherMode = computed(() => {
  const name = env.value?.name || ''
  if (name.includes('暴雨') || name.includes('大雨') || name.includes('雷') || name.includes('Storm')) return 'HEAVY_RAIN'
  if (name.includes('小雨') || name.includes('细雨') || name.includes('Drizzle')) return 'LIGHT_RAIN'
  if (name.includes('雨') || name.includes('Rain') || name.includes('湿')) return 'RAIN'
  if (name.includes('暴雪') || name.includes('大雪') || name.includes('Blizzard')) return 'BLIZZARD'
  if (name.includes('雪') || name.includes('冰') || name.includes('Snow') || name.includes('寒')) return 'SNOW'
  if (name.includes('雾') || name.includes('霾') || name.includes('Fog') || name.includes('Mist')) return 'FOG'
  if (name.includes('云') || name.includes('阴') || name.includes('Cloud')) return 'CLOUDY'
  if (name.includes('热') || name.includes('火') || name.includes('Sun') || name.includes('旱') || name.includes('炎')) return 'HEAT'
  return 'CLEAR'
})

// Optimization: Static Arrays
const particlesLight = Array.from({ length: 30 }).map((_, i) => i)
const particlesMedium = Array.from({ length: 80 }).map((_, i) => i)
const particlesHeavy = Array.from({ length: 150 }).map((_, i) => i)
const particlesClouds = Array.from({ length: 6 }).map((_, i) => i)
const particlesHeat = Array.from({ length: 20 }).map((_, i) => i)

const lightParticles = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${8 + Math.random() * 10}s`,
    width: `${Math.random() * 4 + 2}px`,
    height: `${Math.random() * 4 + 2}px`,
    opacity: 0.3 + Math.random() * 0.5,
  },
  class: Math.random() > 0.5 ? 'bg-sky-200' : 'bg-emerald-100',
}))

onMounted(() => {
  window.addEventListener('settings-changed', updateWeatherSetting)
})

onUnmounted(() => {
  window.removeEventListener('settings-changed', updateWeatherSetting)
})
</script>

<template>
  <div class="weather-layer-container">
    <!-- [Background] Weather Animation Layer -->
    <div
      v-if="showWeatherEffects"
      class="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <!-- 1. LIGHT_RAIN -->
      <div v-if="weatherMode === 'LIGHT_RAIN'" class="absolute inset-0">
        <div
          v-for="i in particlesLight"
          :key="'rain-l-' + i"
          class="absolute bg-sky-300/40 dark:bg-slate-400/30 w-px h-3 animate-rain"
          :style="{
            left: Math.random() * 100 + '%',
            top: -20 + '%',
            animationDuration: 1.5 + Math.random() * 1 + 's',
            animationDelay: Math.random() * 3 + 's',
          }"
        ></div>
      </div>
      <!-- 2. RAIN -->
      <div v-if="weatherMode === 'RAIN'" class="absolute inset-0">
        <div
          v-for="i in particlesMedium"
          :key="'rain-m-' + i"
          class="absolute bg-sky-400/50 dark:bg-slate-400/40 w-0.5 h-5 animate-rain"
          :style="{
            left: Math.random() * 100 + '%',
            top: -20 + '%',
            animationDuration: 0.8 + Math.random() * 0.5 + 's',
            animationDelay: Math.random() * 2 + 's',
          }"
        ></div>
      </div>
      <!-- 3. HEAVY_RAIN -->
      <div v-if="weatherMode === 'HEAVY_RAIN'" class="absolute inset-0">
        <div class="absolute inset-0 bg-white/20 animate-flash z-0"></div>
        <div
          v-for="i in particlesHeavy"
          :key="'rain-h-' + i"
          class="absolute bg-sky-500/60 dark:bg-slate-300/50 w-0.5 h-8 animate-rain-fast"
          :style="{
            left: Math.random() * 120 - 10 + '%',
            top: -20 + '%',
            animationDuration: 0.4 + Math.random() * 0.3 + 's',
            animationDelay: Math.random() * 1 + 's',
          }"
        ></div>
      </div>
      <!-- 4. SNOW -->
      <div v-if="weatherMode === 'SNOW'" class="absolute inset-0">
        <div
          v-for="i in particlesLight"
          :key="'snow-l-' + i"
          class="absolute bg-white/80 dark:bg-slate-200/60 rounded-full animate-snow"
          :style="{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: -10 + '%',
            animationDuration: 4 + Math.random() * 4 + 's',
            animationDelay: Math.random() * 5 + 's',
          }"
        ></div>
      </div>
      <!-- 5. BLIZZARD -->
      <div v-if="weatherMode === 'BLIZZARD'" class="absolute inset-0">
        <div
          v-for="i in particlesMedium"
          :key="'snow-b-' + i"
          class="absolute bg-white/90 dark:bg-slate-100/70 w-1.5 h-1.5 rounded-full animate-blizzard"
          :style="{
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            animationDuration: 0.5 + Math.random() * 1 + 's',
            animationDelay: Math.random() * 2 + 's',
          }"
        ></div>
        <div class="absolute inset-0 bg-white/10 dark:bg-slate-300/10 backdrop-blur-[1px]"></div>
      </div>
      <!-- 6. CLOUDY -->
      <div v-if="weatherMode === 'CLOUDY'" class="absolute inset-0">
        <div
          v-for="i in particlesClouds"
          :key="'cloud-' + i"
          class="absolute opacity-30 dark:opacity-20 animate-float-cloud blur-3xl rounded-full"
          :class="isDarkTheme ? 'bg-slate-500' : 'bg-slate-400'"
          :style="{
            width: 200 + Math.random() * 200 + 'px',
            height: 80 + Math.random() * 80 + 'px',
            top: Math.random() * 50 + '%',
            left: -50 + '%',
            animationDuration: 30 + Math.random() * 30 + 's',
            animationDelay: Math.random() * 20 + 's',
          }"
        ></div>
      </div>
      <!-- 7. FOG -->
      <div v-if="weatherMode === 'FOG'" class="absolute inset-0 overflow-hidden">
        <div class="absolute inset-0 bg-slate-300/20 dark:bg-slate-600/30 animate-pulse-slow"></div>
        <div
          v-for="i in 3"
          :key="'fog-' + i"
          class="absolute w-[200%] h-full bg-gradient-to-r from-transparent via-slate-200/20 to-transparent dark:via-slate-500/20 animate-float-cloud"
          :style="{ top: i * 30 + '%', animationDuration: 20 + i * 5 + 's', left: '-100%' }"
        ></div>
      </div>
      <!-- 8. HEAT -->
      <div v-if="weatherMode === 'HEAT'" class="absolute inset-0">
        <div
          class="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-500/20 to-transparent dark:from-red-900/30 pointer-events-none"
        ></div>
        <div
          v-for="i in particlesHeat"
          :key="'heat-' + i"
          class="absolute bg-orange-400/40 dark:bg-red-500/40 rounded-full blur-[1px] animate-float-up-wobbly"
          :style="{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: Math.random() * 100 + '%',
            bottom: '-10px',
            animationDuration: 3 + Math.random() * 4 + 's',
            animationDelay: Math.random() * 5 + 's',
          }"
        ></div>
        <div class="absolute inset-0 bg-orange-500/5 mix-blend-overlay animate-pulse-slow"></div>
      </div>
      <!-- 9. CLEAR (RPG Only) -->
      <div v-if="weatherMode === 'CLEAR' && !isPure" class="absolute inset-0">
        <div
          v-for="p in lightParticles"
          :key="'clear-' + p.id"
          class="absolute rounded-full animate-float-up mix-blend-multiply dark:mix-blend-normal"
          :class="p.class"
          :style="p.style"
        ></div>
      </div>
    </div>

    <!-- Projectile Layer -->
    <div
      v-if="projectile && projectile.show"
      class="fixed inset-0 pointer-events-none z-[60]"
      style="perspective: 1000px"
    >
      <div
        class="anim-projectile flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-xl border-2 border-slate-200"
      >
        {{ projectile.icon }}
      </div>
    </div>

    <!-- Floating Text Layer -->
    <div v-if="!isPure" class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <transition-group name="float-up">
        <div
          v-for="ft in floatingTexts"
          :key="ft.id"
          class="absolute text-2xl font-black font-rpg drop-shadow-md text-stroke"
          :class="{
            'text-rose-500': ft.type === 'DAMAGE',
            'text-emerald-500': ft.type === 'HEAL',
            'text-amber-400 text-3xl': ft.type === 'CRIT',
            'text-blue-400': ft.type === 'BLOCK',
            'text-sky-300 text-sm': ft.type === 'EXP',
          }"
          :style="{ left: ft.x + '%', top: ft.y + '%' }"
        >
          {{ ft.text }}
        </div>
      </transition-group>
    </div>

    <!-- Exhaustion Overlay -->
    <div
      v-if="isExhausted && !isPure"
      class="fixed inset-0 pointer-events-none z-30 shadow-[inset_0_0_60px_20px_rgba(220,38,38,0.5)] animate-pulse"
    ></div>
    <div v-if="isExhausted && !isPure" class="absolute top-14 left-4 right-4 z-40 animate-bounce">
      <div
        class="bg-red-600/90 text-white px-4 py-2 rounded-xl border-2 border-red-400 shadow-lg backdrop-blur flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <i class="fas fa-heart-broken text-xl"></i>
          <div>
            <div class="text-sm font-black">英雄力竭!</div>
            <div class="text-[10px] opacity-90">伤害减半，请补充营养恢复HP</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Copied exactly from HomeView.vue style section regarding animations */
.boss-phase-berserk {
  @apply bg-red-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110 rotate-1;
}
.boss-hurt-anim {
  animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5);
}
@keyframes shake {
  10%,
  90% {
    transform: translate3d(-1px, 0, 0);
  }
  20%,
  80% {
    transform: translate3d(2px, 0, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-4px, 0, 0);
  }
  40%,
  60% {
    transform: translate3d(4px, 0, 0);
  }
}
.anim-boss {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
.anim-combo-pop {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  from {
    transform: scale(0) rotate(-10deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}
.anim-impact {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  height: 150%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  transform: translate(-50%, -50%) scale(0);
  animation: impact 0.2s ease-out forwards;
  pointer-events: none;
  z-index: 50;
}
@keyframes impact {
  to {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}
.font-rpg {
  font-family: 'Courier New', Courier, monospace;
}
.text-stroke {
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.5);
}
.float-up-enter-active {
  transition: all 0.8s ease-out;
}
.float-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.5);
}
.float-up-leave-active {
  transition: all 0.5s ease-in;
}
.float-up-leave-to {
  opacity: 0;
  transform: translateY(-50px);
}
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes float-up {
  0% {
    transform: translateY(100px) scale(0.8);
    opacity: 0;
  }
  20% {
    opacity: 0.7;
  }
  80% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(-100px) scale(1.2);
    opacity: 0;
  }
}
.animate-float-up {
  animation: float-up 10s linear infinite;
}

/* --- Weather Animations --- */
/* Rain & Heavy Rain */
@keyframes rain {
  0% { transform: translateY(-100px) scaleY(1); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translateY(100vh) scaleY(1); opacity: 0; }
}
.animate-rain { animation: rain 1s linear infinite; }
@keyframes rain-fast {
  0% { transform: translateY(-100px) scaleY(1.5) translateX(0); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translateY(100vh) scaleY(1.5) translateX(-20px); opacity: 0; }
}
.animate-rain-fast { animation: rain-fast 0.5s linear infinite; }

/* Snow & Blizzard */
@keyframes snow {
  0% { transform: translateY(-10px) rotate(0deg) translateX(0); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateY(100vh) rotate(360deg) translateX(20px); opacity: 0; }
}
.animate-snow { animation: snow 5s linear infinite; }
@keyframes blizzard {
  0% { transform: translate(100vw, -10px) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translate(-100vw, 100vh) rotate(720deg); opacity: 0; }
}
.animate-blizzard { animation: blizzard 2s linear infinite; }

/* Clouds & Fog */
@keyframes float-cloud {
  0% { transform: translateX(0); }
  50% { transform: translateX(10px); }
  100% { transform: translateX(0); }
}
.animate-float-cloud { animation: float-cloud 20s ease-in-out infinite; }

/* Heat Rising */
@keyframes float-up-wobbly {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  20% { opacity: 0.6; }
  80% { opacity: 0; }
  100% { transform: translateY(-150px) translateX(20px) scale(1.5); opacity: 0; }
}
.animate-float-up-wobbly { animation: float-up-wobbly 4s ease-out infinite; }

/* Flash for Storm */
@keyframes flash {
  0%, 90%, 100% { opacity: 0; }
  92%, 94% { opacity: 0.3; }
  93% { opacity: 0.1; }
}
.animate-flash { animation: flash 5s infinite; }
</style>
