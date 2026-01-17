<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/counter.ts'
import { useSystemStore } from '@/stores/useSystemStore.ts'
import { useHeroStore } from '@/stores/useHeroStore.ts'
import { useLogStore } from '@/stores/useLogStore.ts'
import { useHydrationStore } from '@/stores/useHydrationStore.ts' // 引入补水 Store
import { showNotify, showDialog } from 'vant'
import ShieldBarCanvas from '@/components/ShieldBarCanvas.vue'
import type { MealType } from '@/types'

const store = useGameStore()
const systemStore = useSystemStore()
const heroStore = useHeroStore()
const logStore = useLogStore()
const hydrationStore = useHydrationStore() // 初始化

const user = computed(() => store.user)
const stageInfo = computed(() => store.stageInfo)
const comboState = computed(() => store.comboState)
const activeQuests = computed(() => store.userQuests.filter((q) => q.status !== 'CLAIMED'))
const skillPoints = computed(() => store.user.skillPoints)
const skillStatus = computed(() => store.heroStore.skillStatus)
const raceSkill = computed(() => store.heroStore.raceSkill)
const env = computed(() => store.environment)
const isDarkTheme = computed(() => store.isDarkMode)

// [Fix]: 核心修正 - 强制数值转换，防止 undefined 导致 Math.round 返回 NaN
// 即使数据源中某些字段缺失，这里也会强制转为 0
const todayMacros = computed(() => {
  const raw = store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 }
  return {
    p: Math.round(Number(raw.p) || 0),
    c: Math.round(Number(raw.c) || 0),
    f: Math.round(Number(raw.f) || 0),
    cals: Math.round(Number(raw.cals) || 0)
  }
})

// [Fix]: 运动消耗和伤害值也强制数值转换
const todayBurn = computed(() => Math.round(Number(logStore.todayBurn) || 0))
const todayDamage = computed(() => Math.round(Number(store.todayDamage) || 0))

const showSlash = computed(() => systemStore.temp.attackVfx === 'slash')

// --- Helper Logic from HomeView ---

const handleSkillClick = () => {
  if (!raceSkill.value) return
  if (skillStatus.value.active) {
    store.setModal('addFood', true)
    return
  }
  if (!skillStatus.value.ready) return
  store.heroStore.activateSkill()
}

const hpPercent = computed(() => {
  if (!stageInfo.value.currentObj) return 0
  return Math.floor((stageInfo.value.currentHpRemaining / stageInfo.value.currentObj.maxHp) * 100)
})

const safeCurrentHp = computed(() => {
  if (stageInfo.value && typeof stageInfo.value.currentHpRemaining === 'number') {
    return Math.max(0, Math.floor(stageInfo.value.currentHpRemaining))
  }
  return 0
})

const safeMaxHp = computed(() => {
  if (stageInfo.value && stageInfo.value.currentObj && stageInfo.value.currentObj.maxHp) {
    return Math.floor(stageInfo.value.currentObj.maxHp)
  }
  return 100
})

const bossStateClass = computed(() => {
  if (stageInfo.value.isOverloaded) return 'boss-phase-berserk'
  if (showSlash.value) return 'boss-hurt-anim'
  if (hpPercent.value < 20) return 'opacity-80 grayscale-[0.5] translate-y-1'
  return 'anim-boss'
})

// [新增] 图标硬编码映射表
const ICON_MAPPING: Record<string, string> = {
  'WATER': 'icon-shui',
  'water': 'icon-shui',
  'icon-drink': 'icon-shui',
  '💧': 'icon-shui',
  '🔥': 'icon-huo',
  '✨': 'icon-target',
  '🫖': 'icon-reshui',
  '🍵': 'icon-cha',
  '☕': 'icon-kafei',
  '🥛': 'icon-niunai',
  '🧃': 'icon-guozhi',
  '🥤': 'icon-qishui',
  '💪': 'icon-muscle'
}

const getFinalIcon = (iconStr: string | undefined): string => {
  if (!iconStr) return ''
  return ICON_MAPPING[iconStr] || iconStr
}

const bossOverlayIcon = computed(() => {
  if (stageInfo.value.isOverloaded) return { type: 'icon', value: 'icon-huo' }
  if (hpPercent.value < 30) return { type: 'icon', value: 'icon-shui' }
  if (hpPercent.value < 60) return { type: 'emoji', value: '💢' }
  return null
})

const isIconFont = (iconStr: string | undefined) => {
  const finalIcon = getFinalIcon(iconStr)
  return finalIcon && (finalIcon.includes('icon-') || finalIcon.includes('iconfont'))
}

const weaknessColor = computed(() => {
  const type = stageInfo.value.currentObj?.data?.weaknessType
  if (type === '低碳' || type === 'LOW_CARB') return 'text-orange-500 dark:text-orange-400 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20'
  if (type === '低脂' || type === 'LOW_FAT') return 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
  if (type === '高蛋白' || type === 'HIGH_PRO') return 'text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20'
  if (type === '纯净' || type === 'CLEAN') return 'text-emerald-500 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
  if (type === '水' || type === 'WATER') return 'text-cyan-500 dark:text-cyan-400 border-cyan-200 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-900/20'
  if (type === '均衡' || type === 'BALANCED') return 'text-sky-500 dark:text-sky-400 border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20'

  return 'text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
})

const comboColor = computed(() => {
  const c = comboState.value.count
  if (c >= 5) return 'text-sky-600 dark:text-sky-400 drop-shadow-sm'
  if (c >= 2) return 'text-blue-500 dark:text-blue-400'
  return 'text-slate-400 dark:text-slate-500'
})

const tacticalTip = computed(() => {
  if (!stageInfo.value.currentObj) return null
  return store.getTacticalSuggestion()
})

const tipClass = computed(() => {
  const t = tacticalTip.value?.type
  if (t === 'DANGER') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
  if (t === 'WARN') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
  if (t === 'GOOD') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
  return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700'
})

const showStatsInfo = () => {
  showDialog({
    title: '📊 数据说明',
    message: '🍽️ (左) 实际摄入：\n今日实际吃掉食物的总热量(kcal)。\n\n🔥 (中) 运动消耗：\n今日通过运动燃烧的热量。\n\n✊ (右) 造成伤害：\n经由RPG机制(暴击/连击)转化后的最终伤害值。\n\n目标：保持热量平衡，击败Boss！',
    confirmButtonColor: '#10b981',
  })
}

// RPG Meals Configuration
const rpgMeals = [
  { key: 'BREAKFAST', label: '早餐', rpgName: '晨间补给', icon: 'fas fa-sun', color: 'text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' },
  { key: 'LUNCH', label: '午餐', rpgName: '日中餐食', icon: 'fas fa-utensils', color: 'text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800' },
  { key: 'DINNER', label: '晚餐', rpgName: '暮色晚宴', icon: 'fas fa-moon', color: 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700' },
  { key: 'SNACK', label: '加餐', rpgName: '能量补给', icon: 'fas fa-lemon', color: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' },
]

const openAddFood = (key: MealType) => {
  if (heroStore.user.heroCurrentHp <= 0) {
    showNotify({ type: 'warning', message: '⚠️ 你已经精疲力尽，请先进食或运动恢复HP！', background: '#f59e0b', duration: 3000 })
    return
  }
  store.temp.activeMealType = key
  store.setModal('addFood', true)
}

// [Modified] 快速补水调用
const quickHydrate = () => {
  hydrationStore.quickDrink()
}
</script>

<template>
  <div class="pb-safe">
    <!-- 战地情报 -->
    <div v-if="env" class="px-4 mt-2 flex gap-3 relative z-10" id="guide-env">
      <!-- 连胜卡片 -->
      <div class="flex-1 rounded-xl p-2.5 border flex items-center shadow-sm bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50">
        <div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 flex items-center justify-center mr-2 shadow-sm">
          <i class="fas fa-fire-alt"></i>
        </div>
        <div>
          <div class="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">连续讨伐</div>
          <div class="text-sm font-black text-slate-800 dark:text-slate-200">
            {{ user.loginStreak }} <span class="text-[9px] font-normal">天</span>
          </div>
        </div>
      </div>

      <!-- 环境卡片 -->
      <div class="flex-[1.5] rounded-xl p-2.5 border flex items-center shadow-sm bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50">
        <div class="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-500 flex items-center justify-center mr-2 text-lg shadow-sm">
          <span v-if="!isIconFont(env.icon)">{{ getFinalIcon(env.icon) }}</span>
          <i v-else :class="['iconfont', getFinalIcon(env.icon)]"></i>
        </div>
        <div>
          <div class="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">今日环境: {{ env.name }}</div>
          <div class="text-[10px] font-bold" :class="env.color">{{ env.desc }}</div>
        </div>
      </div>
    </div>

    <!-- RPG 模式功能入口 -->
    <div class="px-4 mt-3 grid grid-cols-2 gap-3 relative z-10">
      <div
        @click="store.setModal('questBoard', true)"
        id="guide-quest"
        class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group hover:border-sky-200 dark:hover:border-sky-700/50"
      >
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">
            <i class="fas fa-scroll"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">公会大厅</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400">进行中: {{ activeQuests.length }}/4</div>
          </div>
        </div>
        <i class="fas fa-scroll absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-[-15deg]"></i>
      </div>

      <div
        @click="store.setModal('skillTree', true)"
        id="guide-skill"
        class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group hover:border-teal-200 dark:hover:border-teal-700/50"
      >
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">
            <i class="fas fa-project-diagram"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">天赋技能</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              SP: <span class="text-yellow-600 dark:text-yellow-500 font-bold">{{ skillPoints }}</span>
            </div>
          </div>
        </div>
        <div v-if="skillPoints > 0" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse z-20"></div>
        <i class="fas fa-dna absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-12"></i>
      </div>
    </div>

    <!-- Monster Card -->
    <div v-if="stageInfo" class="mx-4 mt-4 relative z-10" id="guide-monster">
      <!-- 技能图标 -->
      <div v-if="raceSkill" class="absolute -top-3 -right-2 z-30 flex flex-col items-center" @click="handleSkillClick">
        <div
          class="w-14 h-14 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl transition-all active:scale-95 cursor-pointer bg-slate-100 dark:bg-slate-800 relative overflow-hidden group"
          :class="[
            skillStatus.active
              ? 'border-yellow-400 animate-pulse ring-4 ring-yellow-400/30'
              : skillStatus.ready
                ? 'border-green-400 hover:scale-105'
                : 'border-slate-300 dark:border-slate-600 grayscale',
          ]"
        >
          <span v-if="!isIconFont(raceSkill.icon)" class="relative z-10">{{ getFinalIcon(raceSkill.icon) }}</span>
          <i v-else :class="['iconfont', getFinalIcon(raceSkill.icon), 'relative z-10']"></i>

          <div v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
            <span class="text-[10px] font-bold text-white font-mono">{{ skillStatus.text }}</span>
          </div>
          <svg v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
            <path class="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" />
            <path class="text-green-500 transition-all duration-1000" :stroke-dasharray="skillStatus.percent + ', 100'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" />
          </svg>
        </div>
        <div
          class="mt-1 bg-white/90 dark:bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] text-slate-700 dark:text-white font-bold whitespace-nowrap shadow-sm border border-slate-200 dark:border-transparent"
          :class="skillStatus.active ? 'text-yellow-600 dark:text-yellow-300' : ''"
        >
          {{ skillStatus.active ? '生效中' : raceSkill.name }}
        </div>
      </div>

      <!-- 怪物卡片 -->
      <div
        class="rounded-3xl p-5 shadow-xl relative overflow-hidden border-2 transition-all duration-300"
        :class="[
          stageInfo.isOverloaded
            ? 'bg-red-50 dark:bg-red-900/10 border-red-500 shadow-red-500/50 animate-pulse-slow'
            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700',
        ]"
      >
        <div v-if="comboState.count > 1" class="absolute top-2 left-2 z-20 flex flex-col items-start anim-combo-pop">
          <div class="text-xs font-bold italic text-yellow-500 dark:text-yellow-300 tracking-wider">COMBO</div>
          <div class="text-3xl font-black italic bg-clip-text text-transparent bg-gradient-to-b" :class="comboColor">x{{ comboState.count }}</div>
        </div>

        <div v-if="stageInfo.isOverloaded" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500/10 font-black text-6xl rotate-12 pointer-events-none z-0">BERSERK</div>

        <div class="relative z-10 flex items-center justify-between mb-2 mt-2">
          <div class="flex items-center">
            <transition name="boss-transition" mode="out-in">
              <div :key="stageInfo.currentObj?.data?.name" class="relative w-16 h-16">
                <!-- Boss 头像框 -->
                <div
                  class="w-full h-full rounded-2xl flex items-center justify-center text-4xl border shadow-inner relative z-10 transition-transform duration-100"
                  :class="[bossStateClass, 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600']"
                >
                  <i
                    v-if="isIconFont(stageInfo.currentObj?.data?.icon)"
                    :class="['iconfont', getFinalIcon(stageInfo.currentObj?.data?.icon)]"
                    class="text-4xl text-slate-700 dark:text-slate-200"
                  ></i>
                  <span v-else>{{ getFinalIcon(stageInfo.currentObj?.data?.icon) || '❓' }}</span>

                  <!-- Boss 状态图标 -->
                  <div v-if="bossOverlayIcon" class="absolute -bottom-1 -right-1 text-sm animate-bounce">
                    <i v-if="bossOverlayIcon.type === 'icon'" :class="['iconfont', getFinalIcon(bossOverlayIcon.value), 'text-blue-500']"></i>
                    <span v-else>{{ getFinalIcon(bossOverlayIcon.value) }}</span>
                  </div>
                </div>
                <div v-if="showSlash" class="anim-impact"></div>
                <div v-if="stageInfo.isBoss" class="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black border-2 border-white dark:border-slate-900 z-20 shadow-sm animate-bounce">BOSS</div>
              </div>
            </transition>

            <div class="ml-4 max-w-[140px]">
              <div class="text-xl font-rpg tracking-wider truncate drop-shadow-sm" :class="stageInfo.isOverloaded ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'">
                {{ stageInfo.currentObj?.data?.name || '未知敌人' }}
              </div>
              <div class="text-[10px] mt-1 flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold border border-slate-200 dark:border-slate-600">
                  {{ stageInfo.isBoss ? 'FINAL' : `WAVE ${stageInfo.currentIndex + 1}` }}
                </span>
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide truncate" :class="weaknessColor">
                  弱点: {{ stageInfo.currentObj?.data?.weakness || '无' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="w-full max-w-[480px] mx-auto h-16 relative z-10 mb-2">
          <ShieldBarCanvas :current-hp="safeCurrentHp" :max-hp="safeMaxHp" :current-shield="0" :max-shield="100" :theme="isDarkTheme ? 'dark' : 'light'" />
        </div>

        <!-- 底部数据栏 -->
        <div class="flex justify-between items-center px-1 pt-2 border-t border-slate-200 dark:border-slate-700/50" @click.stop="showStatsInfo">
          <div class="flex gap-1 items-center">
            <span class="text-[8px] text-slate-400 font-bold mr-1">STAGE</span>
            <div
              v-for="(s, idx) in stageInfo.stages"
              :key="idx"
              class="w-2.5 h-1 rounded-full transition-all"
              :class="idx <= stageInfo.currentIndex ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-slate-300 dark:bg-slate-700'"
            ></div>
          </div>

          <!-- [Fix]: 强制使用 Number() 转换，处理 NaN 问题 -->
          <div class="flex gap-3 text-[9px] font-bold font-mono cursor-pointer relative group">
            <div class="absolute -top-4 right-0 text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击查看说明</div>
            <div class="flex items-center text-green-600 dark:text-green-400">
              <i class="fas fa-utensils mr-1 text-[8px]"></i>
              <span>{{ todayMacros.cals }}</span>
            </div>
            <div class="flex items-center text-orange-500 dark:text-orange-400">
              <i class="fas fa-fire-alt mr-1"></i>
              <span>-{{ todayBurn }}</span>
            </div>
            <div class="flex items-center text-red-500 dark:text-red-400">
              <i class="fas fa-fist-raised mr-1"></i>
              <span>{{ todayDamage }}</span>
            </div>
            <i class="fas fa-question-circle text-[8px] text-slate-400 ml-1"></i>
          </div>
        </div>
      </div>

      <!-- 战术顾问 -->
      <div v-if="tacticalTip" class="mt-2 mx-1 px-3 py-2 rounded-xl flex items-center gap-3 border shadow-sm transition-all duration-500 animate-[pulse_3s_infinite]" :class="tipClass">
        <div class="text-lg">
          <i v-if="isIconFont(tacticalTip.icon)" :class="['iconfont', getFinalIcon(tacticalTip.icon)]"></i>
          <span v-else>{{ getFinalIcon(tacticalTip.icon) }}</span>
        </div>
        <div class="flex-1">
          <div class="text-[9px] opacity-80 font-bold uppercase tracking-wide">战术顾问</div>
          <div class="text-xs font-bold">{{ tacticalTip.text }}</div>
        </div>
      </div>
    </div>

    <!-- 标题栏 -->
    <div class="px-4 mt-6 mb-2 flex justify-between items-center relative z-10" id="guide-meals">
      <h3 class="font-bold text-slate-800 dark:text-slate-300 text-sm">冒险行动</h3>
      <button
        @click="store.setModal('npcGuide', true)"
        class="text-[10px] bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400 px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 active:scale-95 transition flex items-center hover:bg-sky-50 dark:hover:bg-sky-900/20"
      >
        <i class="fas fa-comment-dots mr-1"></i> 导师通讯
      </button>
    </div>

    <!-- RPG 饮食入口 -->
    <div class="px-4 grid grid-cols-2 gap-3 mb-6 relative z-10">
      <div
        v-for="m in rpgMeals"
        :key="m.key"
        @click="openAddFood(m.key as MealType)"
        class="rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border transition cursor-pointer active:scale-95 hover:shadow-md"
        :class="[m.color, heroStore.user.heroCurrentHp <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : '']"
      >
        <div class="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-sm">
          <i :class="[m.icon, isIconFont(m.icon) ? 'iconfont' : '']"></i>
        </div>
        <div>
          <div class="text-sm font-bold opacity-90">{{ m.rpgName }}</div>
          <div class="text-[10px] opacity-70">{{ m.label }}</div>
        </div>
      </div>

      <!-- 独立补水卡片：高亮 Cyan 色系 -->
      <div
        @click="quickHydrate"
        class="rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border transition cursor-pointer active:scale-95 hover:shadow-md border-cyan-100 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-800"
      >
        <div class="text-xl w-10 h-10 flex items-center justify-center rounded-lg bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-sm">
          <i class="iconfont icon-shui text-cyan-500 dark:text-cyan-400"></i>
        </div>
        <div>
          <div class="text-sm font-bold opacity-90 text-cyan-900 dark:text-cyan-100">生命之水</div>
          <div class="text-[10px] opacity-70 text-cyan-700 dark:text-cyan-300">快速补水</div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Reusing necessary RPG styles */
.boss-phase-berserk {
  @apply bg-red-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110 rotate-1;
}
.boss-hurt-anim {
  animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5);
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
.anim-boss {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.anim-combo-pop {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  from { transform: scale(0) rotate(-10deg); opacity: 0; }
  to { transform: scale(1) rotate(0deg); opacity: 1; }
}
.anim-impact {
  position: absolute; top: 50%; left: 50%; width: 150%; height: 150%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  transform: translate(-50%, -50%) scale(0);
  animation: impact 0.2s ease-out forwards;
  pointer-events: none; z-index: 50;
}
@keyframes impact {
  to { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}
.font-rpg {
  font-family: 'Courier New', Courier, monospace;
}
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
