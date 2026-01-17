<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { useHydrationStore } from '@/stores/useHydrationStore'
import { showConfirmDialog } from 'vant'
import { assignIcon, inferTags } from '@/utils/foodDataMapper'
import type { FoodLog, ExerciseLog, HydrationLog } from '@/types'

// 定义联合类型，确保 TypeScript 能正确推导
type AnyLog = FoodLog | ExerciseLog | HydrationLog

const router = useRouter()
const store = useGameStore()
const systemStore = useSystemStore()
const hydrationStore = useHydrationStore()

const isPure = computed(() => systemStore.isPureMode)

// Tab State
type LogTabType = 'ALL' | 'FOOD' | 'EXERCISE' | 'HYDRATION'
const activeLogTab = ref<LogTabType>('ALL')

// [New Feature] Folding Logic
const isExpanded = ref(false)
const DEFAULT_LIMIT = 5 // 默认只展示 5 条，保持页面短小精悍

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '零食',
  HYDRATION: '补水',
  EXERCISE: '运动',
}

// --- Type Guards (类型守卫) ---
const isHydration = (log: AnyLog): log is HydrationLog => {
  return log.mealType === 'HYDRATION' || (log as any).logType === 'HYDRATION'
}

const isExercise = (log: AnyLog): log is ExerciseLog => {
  return log.mealType === 'EXERCISE' || (log as any).logType === 'EXERCISE'
}

// --- Data Computation ---

// 1. 获取当前 Tab 下的所有记录 (完整列表)
const allVisibleLogs = computed<AnyLog[]>(() => {
  const logs = store.todayLogs as AnyLog[]
  switch (activeLogTab.value) {
    case 'FOOD':
      return logs.filter((l) => !isExercise(l) && !isHydration(l))
    case 'EXERCISE':
      return logs.filter((l) => isExercise(l))
    case 'HYDRATION':
      return logs.filter((l) => isHydration(l))
    case 'ALL':
    default:
      return logs
  }
})

// 2. 根据折叠状态，计算实际渲染的记录 (切片列表)
const displayedLogs = computed<AnyLog[]>(() => {
  if (isExpanded.value) {
    return allVisibleLogs.value
  }
  return allVisibleLogs.value.slice(0, DEFAULT_LIMIT)
})

// 计算剩余未展示的数量
const remainingCount = computed(() => {
  return Math.max(0, allVisibleLogs.value.length - displayedLogs.value.length)
})

// --- Icon Logic (Refactored) ---
interface IconDisplay {
  isSymbol: boolean
  isImage: boolean
  content: string
  cssClass?: string
}

const getIconDisplay = (item: AnyLog): IconDisplay => {
  if (!item) return { isSymbol: false, isImage: false, content: '' }

  let iconRaw = item.icon || ''

  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '')
  }

  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw }
  }

  if (iconRaw.startsWith('icon-') || iconRaw.includes('iconfont')) {
    const cleanClass = iconRaw.trim()
    return { isSymbol: true, isImage: false, content: cleanClass, cssClass: cleanClass }
  }

  const isFood = !item.mealType || ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].includes(item.mealType)
  if (isFood) {
    const tags = (item as FoodLog).tags
    const effectiveTags = tags && tags.length > 0 ? tags : inferTags(item.name || '')
    const assigned = assignIcon(item.name || '', effectiveTags)
    if (assigned) {
      const match = assigned.match(/icon-[\w-]+/)
      const iconId = match ? match[0] : assigned
      return { isSymbol: true, isImage: false, content: iconId, cssClass: iconId }
    }
  }

  return { isSymbol: false, isImage: false, content: iconRaw }
}

// --- Actions ---
const confirmDelete = (log: AnyLog) => {
  showConfirmDialog({
    title: isPure.value ? '确认删除' : '时光倒流',
    message: isPure.value ? '确定要删除这条记录吗？' : '确定要撤销这条记录吗？',
    confirmButtonText: '确认',
    confirmButtonColor: '#10b981',
  }).then(() => {
    if (isHydration(log)) {
      hydrationStore.removeHydration(log.id)
    } else {
      store.deleteLog(log as FoodLog)
    }
  }).catch(() => {})
}

const openLogDetail = (log: AnyLog) => {
  if (isExercise(log)) {
    systemStore.temp.selectedExerciseLog = log
    if (isPure.value) {
      router.push('/exercise-log-detail')
    } else {
      store.setModal('exerciseLogDetail', true)
    }
  } else if (isHydration(log)) {
    const amountVal = (log as any).amount || (log as any).grams || 0
    const converted: HydrationLog = {
      id: log.id,
      logType: 'HYDRATION',
      name: log.name,
      icon: log.icon,
      amount: Number(amountVal),
      tags: log.tags || [],
      timestamp: log.timestamp,
      healAmount: (log as any).healed || (log as any).healAmount || 0,
      buffEffect: (log as any).skillEffect || (log as any).buffEffect,
      generatedGold: (log as any).generatedGold,
      generatedExp: (log as any).generatedExp,
    }
    systemStore.temp.selectedHydrationLog = converted
    if (isPure.value) {
      router.push('/hydration-log-detail')
    } else {
      store.setModal('hydrationLogDetail', true)
    }
  } else {
    store.temp.selectedLog = log as FoodLog
    if (isPure.value) {
      router.push('/food-detail')
    } else {
      store.setModal('logDetail', true)
    }
  }
}

const getHydrationVolume = (log: AnyLog): number => {
  if (!isHydration(log)) return 0
  return Number((log as any).amount) || Number((log as any).grams) || 0
}
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 rounded-t-3xl min-h-[300px] p-5 pb-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] border-t border-slate-100 dark:border-slate-700 relative z-10"
    id="guide-logs"
  >
    <!-- Tab Switcher -->
    <div class="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl mb-6 sticky top-0 z-20 backdrop-blur-md bg-opacity-80">
      <button
        v-for="tab in ['ALL', 'FOOD', 'EXERCISE', 'HYDRATION']"
        :key="tab"
        @click="activeLogTab = tab as LogTabType"
        class="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300"
        :class="activeLogTab === tab ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
      >
        {{ tab === 'ALL' ? '全部' : tab === 'FOOD' ? '饮食' : tab === 'EXERCISE' ? '运动' : '补水' }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="allVisibleLogs.length === 0" class="text-center py-10 text-slate-500 dark:text-slate-400">
      <div class="text-4xl mb-2 grayscale opacity-50">📜</div>
      <div class="text-xs">暂无{{ activeLogTab === 'ALL' ? '' : '相关' }}记录</div>
    </div>

    <!-- Log List (Rendering displayedLogs) -->
    <div :key="activeLogTab">
      <van-swipe-cell v-for="log in displayedLogs" :key="log.id" class="mb-3 rounded-2xl overflow-hidden shadow-sm">
        <div
          class="p-4 border bg-white dark:bg-slate-800/50 flex items-center justify-between relative transition-all active:bg-slate-50 dark:active:bg-slate-700"
          :class="{
            'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10': !isHydration(log) && !isExercise(log) && (log as FoodLog).damageTaken && !isPure,
            'border-l-4 border-l-emerald-400 border-slate-100 dark:border-slate-700': isExercise(log),
            'border-l-4 border-l-cyan-400 border-slate-100 dark:border-slate-700 bg-cyan-50/30 dark:bg-cyan-900/10': isHydration(log),
            'border-l-4 border-l-orange-300 border-slate-100 dark:border-slate-700': !isExercise(log) && !isHydration(log) && !(log as FoodLog).damageTaken,
          }"
          @click="openLogDetail(log)"
        >
          <div class="flex items-center gap-4 relative z-10 flex-1 min-w-0">
            <!-- Icon Display -->
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm relative shrink-0 overflow-hidden"
              :class="isHydration(log) ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600' : 'bg-slate-50 dark:bg-slate-700'"
            >
              <template v-if="getIconDisplay(log).isImage">
                <img :src="getIconDisplay(log).content" class="w-full h-full object-contain rounded-lg" />
              </template>

              <template v-else-if="getIconDisplay(log).isSymbol">
                <i v-if="getIconDisplay(log).cssClass" :class="['iconfont', getIconDisplay(log).cssClass]" class="text-2xl"></i>
                <svg v-else class="icon text-3xl" aria-hidden="true">
                  <use :xlink:href="'#' + getIconDisplay(log).content"></use>
                </svg>
              </template>

              <template v-else>
                <span class="text-3xl">{{ getIconDisplay(log).content }}</span>
              </template>

              <div v-if="!isHydration(log) && !isExercise(log) && (log as FoodLog).comboCount && (log as FoodLog).comboCount! > 1 && !isPure" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-slate-900 rounded-full text-[10px] flex items-center justify-center font-black border border-white dark:border-slate-900">
                {{ (log as FoodLog).comboCount }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center mb-1">
                <span class="truncate">{{ log.name }}</span>
                <span v-if="isExercise(log)" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700 shrink-0">运动</span>
                <span v-if="isHydration(log)" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-200 dark:border-cyan-700 shrink-0">
                    {{ (log as any).temperature === 'COLD' ? '冰' : (log as any).temperature === 'HOT' ? '热' : '温' }}
                </span>
                <span v-if="!isPure && (log as any).skillEffect" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-700 shrink-0">天赋</span>
                <span v-if="(log as FoodLog).isComposite" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-700 shrink-0">复合</span>
                <span v-if="(log as FoodLog).fastingHours && (log as FoodLog).fastingHours! > 12" class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 font-bold border border-yellow-200 dark:border-yellow-700 shrink-0">⚡蓄力</span>
              </div>

              <div class="text-xs text-slate-500 dark:text-slate-400" v-if="isExercise(log)">
                消耗 {{ (log as ExerciseLog).caloriesBurned || (log as any).calories }} kcal
              </div>
              <div class="text-xs text-cyan-600/70 dark:text-cyan-400/70 font-medium" v-else-if="isHydration(log)">
                {{ getHydrationVolume(log) }}ml · {{ MEAL_LABELS[log.mealType] || log.mealType }}
                <span v-if="(log as any).buffEffect" class="ml-1 text-teal-500">✨{{ (log as any).buffEffect }}</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400" v-else-if="!(log as FoodLog).damageTaken || isPure">
                {{ (log as FoodLog).grams }}g · {{ MEAL_LABELS[log.mealType] || log.mealType }}
              </div>
              <div class="text-xs text-red-500 dark:text-red-400 font-bold" v-else>
                反击伤害 -{{ (log as FoodLog).damageTaken }} (格挡 {{ (log as FoodLog).blocked }})
              </div>
            </div>
          </div>

          <div class="text-right relative z-10 shrink-0 ml-2 min-w-[60px]">
            <div v-if="isExercise(log)">
              <div class="font-bold text-lg text-emerald-600 dark:text-emerald-500">-{{ (log as ExerciseLog).caloriesBurned || (log as any).calories || 0 }}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500">kcal</div>
            </div>
            <div v-else-if="isHydration(log)">
              <div class="font-bold text-lg text-cyan-500 dark:text-cyan-400 font-mono">
                +{{ getHydrationVolume(log) }}
              </div>
              <div class="text-[10px] text-cyan-400/80 dark:text-cyan-600">ml</div>
            </div>
            <div v-else-if="!(log as FoodLog).damageTaken || isPure">
              <div class="font-rpg font-bold text-lg" :class="!isPure && ((log as FoodLog).multiplier || 1) < 1 ? 'text-slate-500 dark:text-slate-400' : isPure ? 'text-slate-800 dark:text-slate-300' : 'text-red-600 dark:text-red-500'">
                {{ isPure ? (log as FoodLog).calories : '-' + ((log as FoodLog).finalDamageValue || Math.floor((log as FoodLog).calories * ((log as FoodLog).multiplier || 1))) }}
              </div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500">{{ isPure ? 'kcal' : 'DMG' }}</div>
            </div>
            <div v-else><div class="text-2xl">💔</div></div>
          </div>
        </div>
        <template #right>
          <div class="h-full flex">
            <van-button square type="danger" :text="isPure ? '删除' : '撤销'" class="h-full !rounded-none" @click="confirmDelete(log)" />
          </div>
        </template>
      </van-swipe-cell>
    </div>

    <!-- [New Feature] Show More / Collapse Button -->
    <div v-if="allVisibleLogs.length > DEFAULT_LIMIT" class="mt-4 flex justify-center pb-6">
      <button
        @click="isExpanded = !isExpanded"
        class="group flex flex-col items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
      >
        <div class="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors flex items-center gap-2">
          <span>{{ isExpanded ? '收起列表' : `展开更多 (${remainingCount}条)` }}</span>
          <i class="fas transition-transform duration-300" :class="isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.icon {
  width: 1em; height: 1em; vertical-align: -0.15em; fill: currentColor; overflow: hidden;
}
.font-rpg {
  font-family: 'Courier New', Courier, monospace;
}
</style>
