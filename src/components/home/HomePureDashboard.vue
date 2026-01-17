<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/counter'
import { useHeroStore } from '@/stores/useHeroStore'
import { useHydrationStore } from '@/stores/useHydrationStore' // [Modified] 引入补水 Store
import type { MealType } from '@/types'

const store = useGameStore()
const heroStore = useHeroStore()
const hydrationStore = useHydrationStore() // [Modified] 初始化

// --- Data Preparation (Sanitized for Display) ---

const activeQuests = computed(() => store.userQuests.filter((q) => q.status !== 'CLAIMED'))

// [Fix]: 核心修正，从源头确保展示数据为整数
const todayMacros = computed(() => {
  const raw = store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 }
  return {
    p: Math.round(raw.p),
    c: Math.round(raw.c),
    f: Math.round(raw.f),
    cals: Math.round(raw.cals)
  }
})

const dailyTarget = computed(() => Math.round(heroStore.dailyTarget || 2000))

// [Interaction] Toggle Calorie View
const showRemaining = ref(true)
const toggleCalorieView = () => {
  showRemaining.value = !showRemaining.value
}

const calorieDisplay = computed(() => {
  if (showRemaining.value) {
    // [Fix]: 确保剩余热量不出现小数，且不小于0
    const remaining = Math.max(0, dailyTarget.value - todayMacros.value.cals)
    return { value: Math.round(remaining), label: 'KCAL 剩余' }
  }
  return { value: todayMacros.value.cals, label: 'KCAL 已摄入' }
})

const progressPercent = computed(() => {
  if (dailyTarget.value <= 0) return 0
  const p = (todayMacros.value.cals / dailyTarget.value) * 100
  return Math.min(p, 100)
})

// [Feedback] Dynamic Status Color & Message
const statusState = computed(() => {
  const p = progressPercent.value
  if (p > 100) return {
    color: 'text-orange-500',
    bg: 'bg-orange-500',
    softBg: 'bg-orange-50 dark:bg-orange-900/10',
    stroke: 'stroke-orange-500',
    icon: 'fas fa-exclamation-circle',
    msg: '热量超标注意'
  }
  if (p >= 85) return {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500',
    softBg: 'bg-emerald-50 dark:bg-emerald-900/10',
    stroke: 'stroke-emerald-500',
    icon: 'fas fa-check-circle',
    msg: '营养摄入完美'
  }
  if (p > 0) return {
    color: 'text-blue-500',
    bg: 'bg-blue-500',
    softBg: 'bg-blue-50 dark:bg-blue-900/10',
    stroke: 'stroke-blue-500',
    icon: 'fas fa-chart-line',
    msg: '能量补充中...'
  }
  return {
    color: 'text-slate-400',
    bg: 'bg-slate-400',
    softBg: 'bg-slate-50 dark:bg-slate-800',
    stroke: 'stroke-slate-300 dark:stroke-slate-600',
    icon: 'fas fa-coffee',
    msg: '准备开始新的一天'
  }
})

// SVG Circle Logic
const radius = 42
const circumference = 2 * Math.PI * radius
const dashOffset = computed(() => {
  return circumference - (progressPercent.value / 100) * circumference
})

// Consolidated Actions
const meals = [
  { key: 'BREAKFAST', label: '早餐', icon: 'fas fa-sun' },
  { key: 'LUNCH', label: '午餐', icon: 'fas fa-utensils' },
  { key: 'DINNER', label: '晚餐', icon: 'fas fa-moon' },
  { key: 'SNACK', label: '加餐', icon: 'fas fa-coffee' },
]

const openAddFood = (key: MealType) => {
  store.temp.activeMealType = key
  store.setModal('addFood', true)
}

// [Modified] 快速补水动作
const quickHydrate = () => {
  hydrationStore.quickDrink()
}

const openQuestBoard = () => {
  store.setModal('questBoard', true)
}

const openGuide = () => {
  store.setModal('npcGuide', true)
}
</script>

<template>
  <div class="px-4 mt-2 mb-6 animate-fade-in">

    <!-- Header Row: Clean & Functional -->
    <div class="flex justify-between items-center mb-4 px-1">
      <div>
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Overview</div>
        <div class="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i :class="[statusState.icon, statusState.color]" class="text-lg transition-colors duration-500"></i>
          <span>{{ statusState.msg }}</span>
        </div>
      </div>

      <!-- Mini Tools (Tasks & Help) -->
      <div class="flex items-center gap-3">
        <button @click="openGuide" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <i class="fas fa-question text-xs"></i>
        </button>
        <button @click="openQuestBoard" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative">
          <i class="fas fa-tasks text-xs"></i>
          <div v-if="activeQuests.length" class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
        </button>
      </div>
    </div>

    <!-- Unified Control Console -->
    <div
      class="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden transition-all duration-500"
      :class="statusState.softBg"
    >
      <div class="p-6 pb-2">
        <div class="flex items-center gap-6">

          <!-- 1. The Ring (Visual Core) -->
          <div class="relative w-32 h-32 flex-shrink-0 cursor-pointer group" @click="toggleCalorieView">
            <!-- Background Halo -->
            <div class="absolute inset-0 rounded-full opacity-20 blur-xl scale-90 transition-colors duration-500" :class="statusState.bg"></div>

            <svg class="w-full h-full transform -rotate-90 relative z-10">
              <circle cx="50%" cy="50%" :r="radius" fill="transparent" stroke-width="8" class="stroke-slate-100 dark:stroke-slate-700/50" />
              <circle
                cx="50%" cy="50%" :r="radius"
                fill="transparent"
                stroke-width="8"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="dashOffset"
                class="transition-all duration-1000 ease-out"
                :class="statusState.stroke"
              />
            </svg>

            <!-- Center Text -->
            <div class="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span class="text-3xl font-black font-mono tracking-tighter text-slate-800 dark:text-white transition-transform group-active:scale-95">
                {{ calorieDisplay.value }}
              </span>
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{{ calorieDisplay.label }}</span>
            </div>
          </div>

          <!-- 2. Macro Data (Clean List) -->
          <div class="flex-1 space-y-4">
            <!-- Protein -->
            <div class="relative">
              <div class="flex justify-between items-end mb-1">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">蛋白质</span>
                <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">{{ todayMacros.p }}g</span>
              </div>
              <div class="h-1.5 w-full bg-white dark:bg-black/20 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 rounded-full transition-all duration-700" :style="{ width: Math.min((todayMacros.p / 150) * 100, 100) + '%' }"></div>
              </div>
            </div>
            <!-- Carbs -->
            <div class="relative">
              <div class="flex justify-between items-end mb-1">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">碳水</span>
                <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">{{ todayMacros.c }}g</span>
              </div>
              <div class="h-1.5 w-full bg-white dark:bg-black/20 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-700" :style="{ width: Math.min((todayMacros.c / 300) * 100, 100) + '%' }"></div>
              </div>
            </div>
            <!-- Fat -->
            <div class="relative">
              <div class="flex justify-between items-end mb-1">
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">脂肪</span>
                <span class="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">{{ todayMacros.f }}g</span>
              </div>
              <div class="h-1.5 w-full bg-white dark:bg-black/20 rounded-full overflow-hidden">
                <div class="h-full bg-amber-500 rounded-full transition-all duration-700" :style="{ width: Math.min((todayMacros.f / 80) * 100, 100) + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Integrated Action Dock (Divider + Buttons) -->
      <div class="mt-2 border-t border-slate-100 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <!-- [Modified] Grid changed from cols-4 to cols-5 to include Hydration -->
        <div class="grid grid-cols-5 divide-x divide-slate-100 dark:divide-slate-700/50">
          <button
            v-for="m in meals"
            :key="m.key"
            @click="openAddFood(m.key as MealType)"
            class="py-4 flex flex-col items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:bg-slate-100 dark:active:bg-slate-700 group"
          >
            <!-- [Fix] 解除图标颜色与 statusState 的绑定，防止用户误以为是“选中/点击”状态 -->
            <!-- 改为固定的灰色，hover 时变深，保持 Pure 风格的洁净感 -->
            <i
              :class="m.icon"
              class="text-lg text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 opacity-80 group-hover:scale-110 transition-transform transition-colors duration-300"
            ></i>
            <span class="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">{{ m.label }}</span>
          </button>

          <!-- [Modified] 补水按钮：独立样式，强制使用 cyan 色系以保证深色模式清晰度 -->
          <button
            @click="quickHydrate"
            class="py-4 flex flex-col items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:bg-slate-100 dark:active:bg-slate-700 group"
          >
            <!-- [Fix] 同样添加 transition-colors 以保持一致性 -->
            <i class="iconfont icon-shui text-lg text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform transition-colors duration-300"></i>
            <span class="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">补水</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
