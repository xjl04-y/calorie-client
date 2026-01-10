<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { showToast } from 'vant'
// [Import] 引入验证逻辑，与 ModalLogDetail 保持一致
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper'
// 注意：保留引入以免构建报错，实际已使用内置CSS引擎替代
// import BodyTrendRPG from '@/components/trend/BodyTrendRPG.vue';
// import BodyTrendPure from '@/components/trend/BodyTrendPure.vue';

const store = useGameStore()
const systemStore = useSystemStore()

// 体重更新状态
const showWeightUpdate = ref(false)
const newWeight = ref(0)

const weeklyStats = computed(() => store.weeklyStats || [])
const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 })
const topFoods = computed(() => (store.todayLogs || []).slice(0, 8))
const dailyTarget = computed(() => store.dailyTarget)
const isPure = computed(() => systemStore.isPureMode)

const activeTab = computed({
  get: () => systemStore.analysisActiveTab,
  set: (val) => (systemStore.analysisActiveTab = val),
})

const currentDateObj = computed(() => {
  const dateStr = store.analysisRefDate || new Date().toISOString().split('T')[0] || ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y || 0, (m || 0) - 1, d || 0)
})

const weekRangeDateText = computed(() => {
  const stats = weeklyStats.value
  if (!stats || !stats.length || !stats[0] || !stats[6]) return '加载中...'
  const start = new Date(stats[0].date)
  const end = new Date(stats[6].date)
  return `${start.getFullYear()}.${start.getMonth() + 1}.${start.getDate()} - ${end.getMonth() + 1}.${end.getDate()}`
})

const isCurrentWeek = computed(() => {
  const today = new Date()
  const ref = currentDateObj.value
  const getMonday = (d: Date) => {
    const day = d.getDay() || 7
    const temp = new Date(d)
    temp.setDate(temp.getDate() - day + 1)
    temp.setHours(0, 0, 0, 0)
    return temp
  }
  return getMonday(ref).getTime() === getMonday(today).getTime()
})

const macroCals = computed(() => {
  const m = todayMacros.value
  return { p: m.p * 4, c: m.c * 4, f: m.f * 9 }
})

const macroPct = computed(() => {
  const total = todayMacros.value.cals || 1
  const cals = macroCals.value
  return {
    p: Math.round((cals.p / total) * 100),
    c: Math.round((cals.c / total) * 100),
    f: Math.round((cals.f / total) * 100),
  }
})

const totalProgress = computed(() => {
  return Math.min(100, Math.round((todayMacros.value.cals / dailyTarget.value) * 100))
})

const getDayFlavorText = (status: string) => {
  if (isPure.value) {
    switch (status) {
      case 'VICTORY':
        return '热量达标'
      case 'DEFEAT':
        return '热量超标'
      case 'ONGOING':
        return '记录中'
      case 'SKIPPED':
        return '无记录'
      default:
        return ''
    }
  }
  switch (status) {
    case 'VICTORY':
      return '任务完成'
    case 'DEFEAT':
      return '防线告急'
    case 'ONGOING':
      return '行动中'
    case 'SKIPPED':
      return '休整'
    default:
      return '未探测区域'
  }
}

const shiftWeek = (offset: number) => {
  const d = new Date(currentDateObj.value)
  d.setDate(d.getDate() + offset * 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  store.analysisRefDate = `${y}-${m}-${day}`
}

const resetToCurrentWeek = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  store.analysisRefDate = `${y}-${m}-${day}`
}

const openDetail = (date: string) => {
  store.temp.selectedHistoryDate = date
  store.setModal('historyDetail', true)
}

// 计算推荐体重范围
const recommendedWeightRange = computed(() => {
  const user = store.user
  if (!user.height || user.height <= 0) return null
  const heightM = user.height / 100
  const minWeight = (18.5 * heightM * heightM).toFixed(1)
  const maxWeight = (24 * heightM * heightM).toFixed(1)
  const idealWeight = (21.5 * heightM * heightM).toFixed(1)
  return { min: minWeight, max: maxWeight, ideal: idealWeight }
})

const targetWeight = computed(() => {
  const heightM = (store.user.height || 0) / 100
  if (!heightM) return 0
  return 21.5 * heightM * heightM
})

const targetDifference = computed(() => {
  if (!targetWeight.value) return null
  const diff = store.user.weight - targetWeight.value
  return {
    value: Math.abs(diff),
    needLose: diff > 0,
    text: diff > 0 ? '需减重' : diff < 0 ? '已超标' : '已达标',
  }
})

const openWeightUpdate = () => {
  newWeight.value = store.user.weight
  showWeightUpdate.value = true
}

// ==========================================
// [Core Logic] Symbol 图标显示逻辑 (修复版)
// ==========================================
const getIconDisplay = (item: unknown) => {
  const typedItem = item as { icon?: string; name?: string; tags?: string[] }
  if (!item) return { isSymbol: false, isImage: false, content: '' }

  let iconRaw = typedItem.icon || ''

  // 1. 脏数据清洗
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '')
  }

  // 2. 图片检查
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw }
  }

  // 3. Symbol ID 检查与验证
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/)
    if (match) {
      const extractedId = match[0]
      // 只有当它是有效的 Symbol 时才作为 Symbol 返回
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, isImage: false, content: extractedId }
      }
      // 如果无效，继续向下执行 (不立即返回)
    }
  }

  // 4. [关键修复] Emoji/文字优先策略
  // 如果 iconRaw 有值，且不包含 'icon-'（说明不是一个损坏的 Symbol ID）
  // 那么它大概率是 Emoji (💧, 🏃) 或者 FontAwesome class
  // 我们直接显示它，防止被 assignIcon 覆盖
  if (iconRaw && !iconRaw.includes('icon-')) {
    return { isSymbol: false, isImage: false, content: iconRaw }
  }

  // 5. 智能推断 (仅当 icon 为空或 icon 无效时)
  const effectiveTags =
    typedItem.tags && typedItem.tags.length > 0 ? typedItem.tags : inferTags(typedItem.name || '')

  const assigned = assignIcon(typedItem.name || '', effectiveTags)

  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned }
  }

  // 6. 最终兜底
  return { isSymbol: false, isImage: false, content: iconRaw }
}

// --------------------------------------------------------------------------
// [Engine 3.2] 增强版 CSS 能量柱状图引擎
// --------------------------------------------------------------------------
const chartDisplayData = computed(() => {
  let history = store.user.weightHistory || []
  if (!Array.isArray(history)) history = []

  // Define a local type for processing to handle timestamp conversion and temporary flag
  type ProcessedWeightRecord = {
    weight: number
    timestamp: number
    date: string
    bmi?: number
    bodyFatRate?: number
    note?: string
    isTemp?: boolean
  }

  let cleanHistory: ProcessedWeightRecord[] = history
    .map(
      (h) =>
        ({
          ...h,
          weight: Number(h.weight),
          timestamp: h.timestamp ? new Date(h.timestamp).getTime() : 0,
          date: h.date || '',
        }) as ProcessedWeightRecord,
    )
    .filter((h) => !isNaN(h.weight) && h.weight > 0)

  cleanHistory.sort((a, b) => a.timestamp - b.timestamp)

  if (cleanHistory.length === 0 && store.user.weight > 0) {
    if (store.user.weight > 0) {
      const now = new Date()
      cleanHistory = [
        {
          weight: Number(store.user.weight),
          timestamp: now.getTime(),
          date: now.toISOString().split('T')[0] ?? '',
          isTemp: true,
        },
      ]
    } else {
      cleanHistory = []
    }
  }

  const maxSlots = 7
  const recentItems = cleanHistory.slice(-maxSlots)
  const emptyCount = maxSlots - recentItems.length
  type WeightSlot = {
    weight: number
    dateStr: string
    hasData: boolean
    heightPct: number
    change: number
    isUp: boolean
    isDown: boolean
    timestamp?: number
    date?: string
    bmi?: number
    isTemp?: boolean
  }

  const resultSlots: WeightSlot[] = []

  for (let i = 0; i < emptyCount; i++) {
    resultSlots.push({
      weight: 0,
      dateStr: '',
      hasData: false,
      heightPct: 0,
      change: 0,
      isUp: false,
      isDown: false,
    })
  }

  let min = 0,
    max = 100,
    range = 100,
    lowerBound = 0
  if (recentItems.length > 0) {
    const weights = recentItems.map((d) => d.weight)
    min = Math.min(...weights)
    max = Math.max(...weights)
    const diff = max - min

    const buffer = diff < 1 ? 2 : diff * 0.5
    lowerBound = Math.max(0, min - buffer)
    const upperBound = max + buffer
    range = upperBound - lowerBound || 1
  }

  recentItems.forEach((item, idx) => {
    const prev = idx > 0 ? recentItems[idx - 1] : null
    const change = prev ? item.weight - prev.weight : 0
    const heightPct = ((item.weight - lowerBound) / range) * 100

    let dateStr = item.date || ''
    if (dateStr.length > 5 && dateStr.includes('-')) {
      dateStr = dateStr.substring(5)
    }

    resultSlots.push({
      ...item,
      dateStr: dateStr,
      hasData: true,
      heightPct: Math.max(10, Math.min(100, heightPct)),
      change: change,
      isUp: change > 0,
      isDown: change < 0,
    })
  })

  return resultSlots
})

const saveWeight = () => {
  if (newWeight.value <= 20 || newWeight.value > 300) {
    showToast('请输入合理的体重 (20-300 kg)')
    return
  }

  const oldWeight = store.user.weight
  const change = newWeight.value - oldWeight

  store.heroStore.updateWeight(newWeight.value)

  try {
    if (!Array.isArray(store.user.weightHistory)) {
      store.user.weightHistory = []
    }

    let history = [...store.user.weightHistory]
    const now = new Date()
    const heightM = (store.user.height || 0) / 100
    const bmi = heightM > 0 ? (newWeight.value / (heightM * heightM)).toFixed(1) : 0

    const newEntry = {
      weight: Number(newWeight.value),
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0] ?? '',
      bmi: Number(bmi),
    }

    history.push(newEntry)

    if (history.length > 7) {
      history = history.slice(history.length - 7)
    }

    store.user.weightHistory = history
  } catch (e) {
    console.error('AnalysisView: Local history update failed', e)
  }

  showWeightUpdate.value = false

  const changeText = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1)
  showToast({
    message: isPure.value
      ? `体重已更新: ${newWeight.value}kg (${changeText}kg)`
      : `⚖️ 体重已记录！变化: ${changeText}kg`,
    duration: 2000,
  })
}

const useRecommendedWeight = () => {
  if (!recommendedWeightRange.value) return
  newWeight.value = parseFloat(recommendedWeightRange.value.ideal)
}

const useTargetWeight = () => {
  if (!targetWeight.value) return
  newWeight.value = targetWeight.value
}
</script>

<template>
  <div
    class="pb-20 min-h-full transition-colors duration-300 font-sans"
    :class="isPure ? 'bg-stone-50 dark:bg-slate-950' : 'bg-slate-100 dark:bg-slate-950'"
  >
    <!-- Header -->
    <div
      id="guide-analysis-header"
      class="sticky top-0 z-20 pt-4 px-4 pb-2 shadow-sm transition-colors duration-300 backdrop-blur-md bg-opacity-90"
      :class="
        isPure
          ? 'bg-white/90 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800'
          : 'bg-slate-50/90 dark:bg-slate-900/90 border-b-2 border-slate-200 dark:border-slate-800'
      "
    >
      <h2
        class="text-xl font-bold mb-4 flex items-center justify-between"
        :class="
          isPure
            ? 'text-stone-800 dark:text-stone-100'
            : 'text-slate-700 dark:text-slate-200 font-mono'
        "
      >
        <span v-if="!isPure"
          ><i class="fas fa-terminal text-blue-600 dark:text-blue-400 mr-2"></i> 战术分析</span
        >
        <span v-else>数据报表</span>
        <button
          v-if="!isCurrentWeek"
          @click="resetToCurrentWeek"
          class="text-xs px-3 py-1 rounded-full font-bold border active:scale-95 transition"
          :class="
            isPure
              ? 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800'
              : 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          "
        >
          <i class="fas fa-undo mr-1"></i> {{ isPure ? '回到本周' : 'RESET' }}
        </button>
      </h2>

      <!-- Vant Tabs -->
      <van-tabs
        v-model:active="activeTab"
        type="card"
        :color="isPure ? '#0d9488' : '#2563eb'"
        class="w-full"
        background="transparent"
      >
        <van-tab title="今日热量" name="today"></van-tab>
        <van-tab title="历史记录" name="week"></van-tab>
        <van-tab title="体重趋势" name="body"></van-tab>
      </van-tabs>
    </div>

    <!-- Transition Wrapper -->
    <transition name="fade" mode="out-in">
      <!-- Tab 1: Today -->
      <div v-if="activeTab === 'today'" key="today" class="p-4">
        <!-- Info Card -->
        <div
          class="mb-4 p-3 rounded-xl border flex gap-3 shadow-sm transition-colors duration-300"
          :class="
            isPure
              ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/30'
              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
          "
        >
          <div class="text-2xl">{{ isPure ? '📊' : '⚡' }}</div>
          <div>
            <div
              class="text-xs font-bold mb-0.5"
              :class="
                isPure ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'
              "
            >
              {{ isPure ? '今日概览' : '状态监控: 能量读数' }}
            </div>
            <div
              class="text-[10px] leading-tight"
              :class="
                isPure ? 'text-stone-600 dark:text-stone-400' : 'text-slate-600 dark:text-slate-400'
              "
            >
              <span v-if="!isPure">
                <span class="font-bold text-slate-800 dark:text-slate-200">能量摄入</span>
                正在监控中。<br />维持机体运转需要击穿 <span class="font-bold">BMR</span> 阈值。
              </span>
              <span v-else>
                今日总摄入热量与基础代谢(BMR)的对比。<br />控制热量摄入是体重管理的关键。
              </span>
            </div>
          </div>
        </div>

        <!-- Calorie Card -->
        <div
          class="rounded-3xl p-6 relative overflow-hidden transition-all duration-300"
          :class="
            isPure
              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-md'
          "
        >
          <!-- 纹理 (RPG模式): 保持原有的暗纹理，但背景不再是紫色 -->
          <div
            v-if="!isPure"
            class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-5 dark:opacity-10 pointer-events-none"
          ></div>

          <h3
            class="font-bold w-full mb-6 flex items-center justify-center relative z-10 text-lg"
            :class="
              isPure
                ? 'text-stone-700 dark:text-stone-200'
                : 'text-slate-800 dark:text-slate-200 font-mono uppercase tracking-wider'
            "
          >
            <i
              class="fas fa-fire-alt mr-2 animate-pulse"
              :class="isPure ? 'text-teal-500' : 'text-blue-500'"
            ></i>
            {{ isPure ? '今日能量摄入' : 'ENERGY INPUT' }}
          </h3>

          <div id="guide-analysis-circle" class="text-center relative z-10 mb-8">
            <div
              class="text-5xl font-black font-mono drop-shadow-sm tracking-tighter"
              :class="isPure ? 'text-stone-800 dark:text-white' : 'text-slate-900 dark:text-white'"
            >
              {{ todayMacros.cals }}
              <span
                class="text-lg font-normal"
                :class="isPure ? 'text-stone-400' : 'text-slate-400'"
                >/ {{ dailyTarget }}</span
              >
            </div>
            <div class="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
              Daily Intake vs BMR
            </div>

            <!-- 进度条槽位背景适配 -->
            <div
              class="w-full h-3 rounded-full mt-4 overflow-hidden border relative"
              :class="
                isPure
                  ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
              "
            >
              <!-- 移除渐变，改用纯色 -->
              <div
                class="h-full transition-all duration-1000"
                :class="isPure ? 'bg-teal-500' : 'bg-blue-600'"
                :style="{ width: totalProgress + '%' }"
              ></div>
            </div>

            <div class="flex justify-between text-xs text-slate-500 mt-1 font-mono">
              <span>0%</span>
              <span>{{ totalProgress }}%</span>
              <span>100%</span>
            </div>
          </div>

          <!-- 营养占比卡片 -->
          <div
            id="guide-analysis-bars"
            class="space-y-4 relative z-10 p-4 rounded-xl border"
            :class="
              isPure
                ? 'bg-stone-50 dark:bg-slate-700/30 border-stone-100 dark:border-slate-600'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            "
          >
            <div class="text-xs font-bold text-slate-400 text-center mb-2 uppercase">
              Macronutrients
            </div>
            <!-- 使用更健康的配色：Sky(Pro), Amber(Carb), Rose(Fat) -->
            <div>
              <div
                class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest"
                :class="
                  isPure
                    ? 'text-stone-600 dark:text-stone-300'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                <span>蛋白质 (Pro)</span><span>{{ macroCals.p }} kcal ({{ macroPct.p }}%)</span>
              </div>
              <div
                class="h-1.5 rounded-full overflow-hidden"
                :class="
                  isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-900'
                "
              >
                <div class="h-full bg-sky-500" :style="{ width: macroPct.p + '%' }"></div>
              </div>
            </div>
            <div>
              <div
                class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest"
                :class="
                  isPure
                    ? 'text-stone-600 dark:text-stone-300'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                <span>碳水 (Carb)</span><span>{{ macroCals.c }} kcal ({{ macroPct.c }}%)</span>
              </div>
              <div
                class="h-1.5 rounded-full overflow-hidden"
                :class="
                  isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-900'
                "
              >
                <div class="h-full bg-amber-400" :style="{ width: macroPct.c + '%' }"></div>
              </div>
            </div>
            <div>
              <div
                class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest"
                :class="
                  isPure
                    ? 'text-stone-600 dark:text-stone-300'
                    : 'text-slate-600 dark:text-slate-400'
                "
              >
                <span>脂肪 (Fat)</span><span>{{ macroCals.f }} kcal ({{ macroPct.f }}%)</span>
              </div>
              <div
                class="h-1.5 rounded-full overflow-hidden"
                :class="
                  isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-900'
                "
              >
                <div class="h-full bg-rose-400" :style="{ width: macroPct.f + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Foods -->
        <div
          class="mt-4 rounded-2xl p-4 border transition-colors"
          :class="
            isPure
              ? 'bg-stone-50 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700'
              : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          "
        >
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-3">
            {{ isPure ? '今日记录' : '物资清单' }} (Top 8)
          </h4>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="(item, i) in topFoods"
              :key="i"
              class="flex flex-col items-center p-2 rounded-xl shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer border"
              :class="
                isPure
                  ? 'bg-white dark:bg-slate-700 border-stone-100 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
              "
              @click="showToast(`${item.name}: ${item.calories} kcal`)"
            >
              <div class="text-3xl mb-1 flex items-center justify-center h-8">
                <!-- 1. 图片类型 -->
                <template v-if="getIconDisplay(item).isImage">
                  <img :src="getIconDisplay(item).content" class="w-8 h-8 object-contain" />
                </template>
                <!-- 2. SVG Symbol 类型 (标准处理) -->
                <template v-else-if="getIconDisplay(item).isSymbol">
                  <svg class="icon text-3xl" aria-hidden="true">
                    <use :xlink:href="'#' + getIconDisplay(item).content"></use>
                  </svg>
                </template>
                <!-- 3. 兜底 (文本/Emoji) -->
                <template v-else>
                  <span class="text-3xl">{{ getIconDisplay(item).content }}</span>
                </template>
              </div>
              <span
                class="text-[10px] text-slate-600 dark:text-slate-300 truncate w-full text-center font-bold"
              >
                {{ item.name }}
              </span>
              <span class="text-[8px] text-slate-400 font-mono">
                {{ item.calories }}
              </span>
            </div>
            <div
              v-if="topFoods.length === 0"
              class="col-span-4 text-center py-4 text-xs text-slate-400 italic"
            >
              暂无记录...
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Week -->
      <div v-else-if="activeTab === 'week'" key="week" class="p-4">
        <!-- Info Card -->
        <div
          class="mb-4 p-3 rounded-xl border flex gap-3 shadow-sm transition-colors duration-300"
          :class="
            isPure
              ? 'bg-teal-50 dark:bg-slate-800 border-teal-100 dark:border-slate-700'
              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
          "
        >
          <div class="text-2xl">{{ isPure ? '📅' : '📜' }}</div>
          <div>
            <div
              class="text-xs font-bold mb-0.5"
              :class="
                isPure ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'
              "
            >
              {{ isPure ? '历史趋势' : '战术情报: 历史回溯' }}
            </div>
            <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                <span class="text-emerald-600 font-bold">SUCCESS</span> 意味着任务完成；
                <span class="text-orange-500 font-bold">WARNING</span> 意味着防线告急。
              </span>
              <span v-else> 回顾过去一周的热量摄入情况。<br />保持绿色达标状态有助于健康。 </span>
            </div>
          </div>
        </div>

        <div
          class="flex justify-between items-center mb-4 p-1 rounded-lg"
          :class="isPure ? 'bg-stone-100 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-800'"
        >
          <button
            @click="shiftWeek(-1)"
            class="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all active:scale-95"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <span
            class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter"
          >
            {{ weekRangeDateText }}
          </span>
          <button
            @click="shiftWeek(1)"
            class="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all active:scale-95"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div id="guide-weekly-stats" class="space-y-3">
          <div
            v-for="(day, idx) in weeklyStats"
            :key="idx"
            class="relative group"
            @click="!day.isFuture && openDetail(day.date)"
          >
            <div
              v-if="idx < weeklyStats.length - 1"
              class="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10 h-full"
            ></div>
            <div
              class="flex items-center p-3 rounded-2xl border shadow-sm transition-all"
              :class="[
                isPure
                  ? 'bg-white dark:bg-slate-800 border-stone-100 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                day.isToday
                  ? isPure
                    ? 'ring-2 ring-teal-500 z-10'
                    : 'ring-2 ring-blue-500 z-10'
                  : 'opacity-90',
                day.isFuture
                  ? 'opacity-40 cursor-not-allowed grayscale'
                  : 'cursor-pointer active:scale-95',
              ]"
            >
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center text-xl mr-4 shrink-0 shadow-inner"
                :class="{
                  'bg-slate-100 dark:bg-slate-700 text-slate-400':
                    day.rpgStatus === 'UNKNOWN' || day.rpgStatus === 'SKIPPED',
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600':
                    day.rpgStatus === 'VICTORY',
                  'bg-orange-100 dark:bg-orange-900/30 text-orange-500': day.rpgStatus === 'DEFEAT',
                  'bg-blue-100 dark:bg-blue-900/30 text-blue-500': day.rpgStatus === 'ONGOING',
                }"
              >
                <i v-if="day.isFuture" class="fas fa-lock text-xs"></i>
                <i v-else-if="day.rpgStatus === 'VICTORY'" class="fas fa-check"></i>
                <i v-else-if="day.rpgStatus === 'DEFEAT'" class="fas fa-exclamation"></i>
                <i v-else-if="day.rpgStatus === 'ONGOING'" class="fas fa-pen"></i>
                <i v-else class="fas fa-minus"></i>
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {{ day.label }}
                    <span class="text-xs font-normal text-slate-400 ml-1">周{{ day.weekday }}</span>
                  </div>
                  <div
                    class="text-xs font-bold font-mono"
                    :class="day.val > store.dailyTarget ? 'text-orange-500' : 'text-slate-500'"
                  >
                    {{ day.val }}
                  </div>
                </div>
                <div
                  class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full rounded-full"
                    :style="{ width: Math.min((day.val / store.dailyTarget) * 100, 100) + '%' }"
                    :class="day.rpgStatus === 'DEFEAT' ? 'bg-orange-500' : 'bg-emerald-500'"
                  ></div>
                </div>
                <div class="text-[10px] text-slate-400 mt-1 italic flex justify-between">
                  <span>{{
                    day.isFuture ? (isPure ? '未到' : '未解锁...') : getDayFlavorText(day.rpgStatus)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Body Trend (Redesigned with CSS Pillars) -->
      <div v-else key="body" class="p-4">
        <div
          class="mb-4 p-3 rounded-xl border flex gap-3 shadow-sm transition-colors duration-300"
          :class="
            isPure
              ? 'bg-teal-50 dark:bg-slate-800 border-teal-100 dark:border-slate-700'
              : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
          "
        >
          <div class="text-2xl">⚖️</div>
          <div class="flex-1">
            <div
              class="text-xs font-bold mb-0.5"
              :class="
                isPure ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'
              "
            >
              {{ isPure ? '体重记录' : '战术情报: 身体素质' }}
            </div>
            <div class="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                这是你的体重变化曲线。<br />体重的改变将直接重塑你的<span
                  class="font-bold text-slate-700 dark:text-slate-200"
                  >基础属性 (STR/AGI/VIT)</span
                >。
              </span>
              <span v-else> 定期记录体重,监控身体变化趋势。 </span>
            </div>
          </div>
          <button
            @click="openWeightUpdate"
            class="px-4 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap"
            :class="
              isPure
                ? 'bg-teal-500 text-white hover:bg-teal-600'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            "
          >
            <i class="fas fa-weight"></i>
            <span>更新体重</span>
          </button>
        </div>

        <!-- Chart Container -->
        <div
          id="guide-weight-chart"
          class="w-full h-64 relative rounded-2xl overflow-hidden p-4 transition-all duration-300 flex flex-col"
          :class="
            isPure
              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-md'
          "
        >
          <!-- 纹理 (RPG模式) -->
          <div
            v-if="!isPure"
            class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 dark:opacity-20 pointer-events-none"
          ></div>

          <!-- 标题区域 -->
          <div class="flex justify-between items-center mb-4 relative z-10">
            <div
              class="text-xs font-bold uppercase tracking-wider"
              :class="isPure ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400 font-mono'"
            >
              {{ isPure ? '近期趋势 (7次)' : 'BODY COMPOSITION (7d)' }}
            </div>
            <!-- 如果有数据，显示最新体重 -->
            <div
              class="text-xs font-mono"
              :class="isPure ? 'text-teal-500' : 'text-blue-600 dark:text-blue-400'"
            >
              {{ store.user.weight > 0 ? store.user.weight + ' kg' : '--' }}
            </div>
          </div>

          <!-- 缺省状态 -->
          <div
            v-if="chartDisplayData.length === 0"
            class="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs pb-4 opacity-50"
          >
            <i class="fas fa-chart-bar text-3xl mb-2"></i>
            <span>暂无数据</span>
          </div>

          <!-- CSS 柱状图容器 -->
          <div v-else class="flex-1 flex justify-between items-end gap-2 relative z-10 pb-1">
            <div
              v-for="(bar, idx) in chartDisplayData"
              :key="idx"
              class="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
            >
              <!-- 数值标签 (有数据才显示) -->
              <div
                v-if="bar.hasData"
                class="text-[10px] font-bold mb-1 transition-all"
                :class="
                  isPure
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-800 dark:text-white drop-shadow-md'
                "
                style="font-size: 9px"
              >
                {{ bar.weight }}
              </div>

              <!-- 柱体颜色适配 -->
              <div
                class="w-full min-w-[12px] max-w-[24px] rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
                :style="{ height: bar.hasData ? bar.heightPct + '%' : '2px' }"
                :class="[
                  bar.hasData
                    ? isPure
                      ? 'bg-teal-100 dark:bg-teal-900/50 hover:bg-teal-200 dark:hover:bg-teal-800'
                      : 'bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-700 border border-slate-300 dark:border-slate-600'
                    : 'bg-slate-100 dark:bg-slate-800 opacity-50',
                ]"
              >
                <!-- 内部填充条 (RPG模式下的能量槽效果 - 纯色，无渐变) -->
                <div
                  v-if="bar.hasData"
                  class="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                  :style="{ height: '100%' }"
                  :class="isPure ? 'bg-teal-500' : 'bg-blue-600 opacity-80'"
                ></div>

                <!-- 顶部高光 (Pure模式) -->
                <div
                  v-if="isPure && bar.hasData"
                  class="absolute top-0 left-0 right-0 h-1 bg-white/30"
                ></div>
              </div>

              <!-- 日期标签 -->
              <div
                class="text-[9px] mt-2 font-mono text-center w-full truncate"
                :class="isPure ? 'text-slate-400' : 'text-slate-500'"
              >
                {{ bar.dateStr }}
              </div>

              <!-- 趋势指示器 -->
              <div
                v-if="bar.change !== 0"
                class="absolute -top-4 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                :class="bar.isUp ? 'text-orange-500' : 'text-emerald-500'"
              >
                {{ bar.isUp ? '↑' : '↓' }}
              </div>
            </div>
          </div>

          <!-- 底部装饰线 -->
          <div
            class="h-px w-full mt-1"
            :class="isPure ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-300 dark:bg-slate-700'"
          ></div>
        </div>
      </div>
    </transition>

    <!-- 体重更新弹窗 -->
    <van-dialog
      v-model:show="showWeightUpdate"
      :title="isPure ? '更新体重' : '⚖️ 记录体重'"
      show-cancel-button
      @confirm="saveWeight"
      :confirm-button-text="isPure ? '保存' : '记录'"
      :confirm-button-color="isPure ? '#0d9488' : '#2563eb'"
      class="dark:bg-slate-800 dark:text-white"
    >
      <div class="p-4 space-y-4">
        <!-- 当前体重 -->
        <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">当前体重</div>
          <div class="text-3xl font-bold text-slate-800 dark:text-white">
            {{ store.user.weight }} <span class="text-lg font-normal text-slate-500">kg</span>
          </div>
        </div>

        <!-- 新体重输入 -->
        <div>
          <label class="text-xs text-slate-500 dark:text-slate-400 block mb-2 font-bold"
            >新体重 (kg)</label
          >
          <input
            type="number"
            step="0.1"
            v-model.number="newWeight"
            class="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-center text-slate-800 dark:text-white border-2 border-transparent focus:border-teal-500 dark:focus:border-teal-400 transition"
          />
        </div>

        <!-- 推荐体重范围（RPG模式） -->
        <div
          v-if="!isPure && recommendedWeightRange"
          class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-blue-600 dark:text-blue-400">
              <i class="fas fa-star mr-1"></i>推荐体重参考
            </div>
            <button
              @click="useRecommendedWeight"
              type="button"
              class="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-full font-bold active:scale-95 transition"
            >
              使用理想值
            </button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>健康范围:</span>
              <span class="font-bold"
                >{{ recommendedWeightRange.min }} - {{ recommendedWeightRange.max }} kg</span
              >
            </div>
            <div class="flex justify-between">
              <span>理想体重:</span>
              <span class="font-bold text-blue-600 dark:text-blue-400"
                >{{ recommendedWeightRange.ideal }} kg</span
              >
            </div>
            <div class="text-[10px] text-slate-400 mt-2">*基于BMI 18.5-24的健康范围计算</div>
          </div>
        </div>

        <!-- 目标体重信息（纯净模式） -->
        <div
          v-if="isPure && targetWeight > 0"
          class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <i class="fas fa-bullseye mr-1"></i>目标体重
            </div>
            <button
              @click="useTargetWeight"
              type="button"
              class="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-full font-bold active:scale-95 transition"
            >
              使用目标值
            </button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>你的目标:</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400"
                >{{ targetWeight }} kg</span
              >
            </div>
            <div v-if="targetDifference" class="flex justify-between">
              <span>距离目标:</span>
              <span
                class="font-bold"
                :class="targetDifference.needLose ? 'text-orange-600' : 'text-blue-600'"
              >
                {{ targetDifference.value.toFixed(1) }} kg ({{ targetDifference.text }})
              </span>
            </div>
          </div>
        </div>

        <!-- 推荐体重信息（纯净模式 - 无目标时显示） -->
        <div
          v-if="isPure && !targetWeight && recommendedWeightRange"
          class="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 border border-teal-200 dark:border-teal-800"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-teal-600 dark:text-teal-400">
              <i class="fas fa-info-circle mr-1"></i>健康体重参考
            </div>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>健康范围:</span>
              <span class="font-bold"
                >{{ recommendedWeightRange.min }} - {{ recommendedWeightRange.max }} kg</span
              >
            </div>
            <div class="flex justify-between">
              <span>理想体重:</span>
              <span class="font-bold text-teal-600 dark:text-teal-400"
                >{{ recommendedWeightRange.ideal }} kg</span
              >
            </div>
            <div class="text-[10px] text-slate-400 mt-2">*基于BMI 18.5-24的健康范围计算</div>
          </div>
        </div>

        <!-- 变化预览 -->
        <div
          v-if="Math.abs(newWeight - store.user.weight) > 0.1"
          class="text-xs text-center p-2 rounded-lg"
          :class="
            newWeight > store.user.weight
              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
          "
        >
          变化: {{ newWeight > store.user.weight ? '+' : ''
          }}{{ (newWeight - store.user.weight).toFixed(1) }} kg
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 10s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Symbol Icon Style */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}

/* 强制覆盖 Vant Tabs 文字颜色 */
:deep(.van-tab--card.van-tab--active) {
  color: #ffffff !important;
}

:deep(.van-tab--card) {
  /* 确保非选中状态的文字颜色跟随主题，而不是紫色 */
  color: v-bind("isPure ? '#0d9488' : '#2563eb'");
}
</style>
