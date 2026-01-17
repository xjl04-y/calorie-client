/**
 * useHydrationStore - 独立补水状态管理
 * [New V6.0] 将补水相关逻辑从 BattleStore 中分离
 * * 修改说明：
 * - 将所有 Emoji 图标替换为 iconfont 类名字符串
 * - 确保数据源头产出的 log.icon 是 CSS 类名而非字符
 */
import { defineStore } from 'pinia'
import { reactive, computed, watch } from 'vue'
import { showToast, showNotify } from 'vant'
import type { HydrationLog, FoodLog } from '@/types'
// generateId 目前未使用，保留供未来扩展

import { useSystemStore } from './useSystemStore'
import { useHeroStore } from './useHeroStore'
import { useLogStore } from './useLogStore'
import { useCollectionStore } from './useCollectionStore'

// 饮品预设 - [修改] Emoji -> iconfont class
const DRINK_PRESETS = [
  {
    id: 'water',
    name: '纯净水',
    icon: 'icon-shui', // 原: 💧
    defaultAmount: 250,
    type: 'WATER' as const,
    tags: ['纯净'],
  },
  {
    id: 'hot_water',
    name: '温开水',
    icon: 'icon-reshui', // 原: 🫖 (请确保有此icon，或复用 icon-shui)
    defaultAmount: 250,
    type: 'WATER' as const,
    temperature: 'WARM' as const,
    tags: ['纯净', '温热'],
  },
  { id: 'tea', name: '茶', icon: 'icon-cha', defaultAmount: 200, type: 'TEA' as const, tags: ['提神'] }, // 原: 🍵
  {
    id: 'green_tea',
    name: '绿茶',
    icon: 'icon-lvcha', // 原: 🍃 (或用 icon-cha)
    defaultAmount: 200,
    type: 'TEA' as const,
    tags: ['抗氧化'],
  },
  {
    id: 'coffee',
    name: '咖啡',
    icon: 'icon-kafei', // 原: ☕
    defaultAmount: 150,
    type: 'COFFEE' as const,
    tags: ['提神', '咖啡因'],
  },
  {
    id: 'milk',
    name: '牛奶',
    icon: 'icon-niunai', // 原: 🥛
    defaultAmount: 250,
    type: 'OTHER' as const,
    tags: ['蛋白质'],
  },
  {
    id: 'juice',
    name: '果汁',
    icon: 'icon-guozhi', // 原: 🧃
    defaultAmount: 250,
    type: 'OTHER' as const,
    tags: ['维生素'],
  },
  {
    id: 'soda',
    name: '苏打水',
    icon: 'icon-qishui', // 原: 🥤
    defaultAmount: 330,
    type: 'OTHER' as const,
    tags: ['气泡'],
  },
] as const

export type DrinkPreset = (typeof DRINK_PRESETS)[number]

export const useHydrationStore = defineStore('hydration', () => {
  const systemStore = useSystemStore()
  const heroStore = useHeroStore()
  const logStore = useLogStore()
  const collectionStore = useCollectionStore()

  // --- State ---
  // 临时表单状态
  const formState = reactive({
    selectedPresetId: 'water' as string,
    customName: '',
    customIcon: 'icon-shui', // [修改] 默认图标
    amount: 250,
    cupSize: 250,
    temperature: 'WARM' as 'COLD' | 'WARM' | 'HOT',
    type: 'WATER' as 'WATER' | 'TEA' | 'COFFEE' | 'OTHER',
  })

  // 提醒状态
  const reminderState = reactive({
    isEnabled: false,
    intervalMinutes: 60,
    lastRemindTime: 0,
    nextRemindTime: 0,
  })

  // --- Getters ---
  // 用户补水配置
  const hydrationConfig = computed(() => {
    return (
      heroStore.user.hydration || {
        dailyTargetCups: 8,
        cupSizeMl: 250,
        reminderInterval: 60,
        enableNotifications: false,
      }
    )
  })

  // 今日目标 (ml)
  const dailyTargetMl = computed(() => {
    return hydrationConfig.value.dailyTargetCups * hydrationConfig.value.cupSizeMl
  })

  // 今日进度
  const todayProgress = computed(() => {
    const amount = logStore.todayHydrationAmount
    const cups = logStore.todayHydrationCups
    const target = dailyTargetMl.value
    const percentage = Math.min(100, Math.round((amount / target) * 100))

    return {
      amount,
      cups,
      target,
      percentage,
      remaining: Math.max(0, target - amount),
      isComplete: amount >= target,
    }
  })

  // 选中的饮品预设
  const selectedPreset = computed(() => {
    if (!formState.selectedPresetId) return null
    return DRINK_PRESETS.find((d) => d.id === formState.selectedPresetId) || null
  })

  // 上次补水时间
  const lastDrinkTime = computed(() => {
    return heroStore.user.hydration?.lastDrinkTime || 0
  })

  // 距离上次补水的时间 (分钟)
  const minutesSinceLastDrink = computed(() => {
    if (!lastDrinkTime.value) return Infinity
    return Math.floor((Date.now() - lastDrinkTime.value) / 60000)
  })

  // 是否需要提醒
  const shouldRemind = computed(() => {
    if (!reminderState.isEnabled) return false
    return minutesSinceLastDrink.value >= reminderState.intervalMinutes
  })

  // 今日补水记录
  const todayLogs = computed(() => logStore.allTodayHydration)

  // --- Actions ---

  /**
   * 重置表单状态
   */
  function resetForm() {
    formState.selectedPresetId = 'water'
    formState.customName = ''
    formState.customIcon = 'icon-shui' // [修改]
    formState.amount = hydrationConfig.value.cupSizeMl
    formState.cupSize = hydrationConfig.value.cupSizeMl
    formState.temperature = 'WARM'
    formState.type = 'WATER'
  }

  /**
   * 选择饮品预设
   */
  function selectPreset(presetId: string) {
    formState.selectedPresetId = presetId
    const preset = DRINK_PRESETS.find((d) => d.id === presetId)
    if (preset) {
      formState.amount = preset.defaultAmount
      formState.type = preset.type
      if ('temperature' in preset) {
        formState.temperature = preset.temperature
      }
    }
  }

  /**
   * 快速补水 (一杯)
   */
  function quickDrink(presetId: string = 'water'): { log: HydrationLog | null } {
    const preset = DRINK_PRESETS.find((d) => d.id === presetId) || DRINK_PRESETS[0]
    return commitHydration({
      name: preset.name,
      icon: preset.icon,
      amount: preset.defaultAmount,
      type: preset.type,
    })
  }

  /**
   * 提交补水记录 (核心方法)
   */
  function commitHydration(options?: {
    name?: string
    icon?: string
    amount?: number
    cupSize?: number
    temperature?: 'COLD' | 'WARM' | 'HOT'
    type?: 'WATER' | 'TEA' | 'COFFEE' | 'OTHER'
  }): { log: HydrationLog | null } {
    // 使用传入参数或表单状态
    const preset = selectedPreset.value
    const name = options?.name || formState.customName || preset?.name || '水'
    // [修改] 默认图标改为 icon-shui
    const icon = options?.icon || formState.customIcon || preset?.icon || 'icon-shui'
    const amount = options?.amount ?? formState.amount
    const cupSize = options?.cupSize ?? formState.cupSize
    const type = options?.type ?? formState.type
    const temperature = options?.temperature ?? formState.temperature

    // [防御性编程] 拒绝负数或零补水量
    if (amount <= 0) {
      showToast('补水量必须大于0')
      return { log: null }
    }

    // RPG模式下发放金币奖励
    let goldReward = 0
    if (!systemStore.isPureMode && amount > 0) {
      goldReward = Math.floor(amount / 250) * 5
      if (goldReward > 0) {
        heroStore.addGold(goldReward, '补水奖励', 'BATTLE_REWARD')
      }
    }

    // RPG 模式效果
    let healAmount = 0
    let buffEffect = ''

    if (!systemStore.isPureMode) {
      healAmount = Math.floor(amount / 10) // 每10ml恢复1点HP
      if (type === 'TEA') {
        buffEffect = '精神焕发'
      } else if (type === 'COFFEE') {
        buffEffect = '专注力提升'
      }
    }

    const savedLog = logStore.addHydrationLog({
      name,
      icon,
      amount,
      type,
      temperature,
      healAmount,
      buffEffect,
    })

    if (heroStore.user.hydration) {
      heroStore.user.hydration.lastDrinkTime = Date.now()
    }

    // RPG 模式效果
    if (!systemStore.isPureMode) {
      systemStore.triggerHealEffect()
      heroStore.heal(healAmount)

      // [修改] 提示信息中的 Emoji 可以保留，也可以改为 iconfont，但在 notify 中通常保留 Emoji 更方便
      // 这里我保留了 Emoji，因为 Notify 组件通常直接显示文本
      let message = '💧 净化之水！身心舒畅！'
      if (type === 'TEA') {
        message = '🍵 茶韵悠长，精神焕发！'
      } else if (type === 'COFFEE') {
        message = '☕ 咖啡提神，专注力 +1！'
      }

      showNotify({ type: 'primary', message })
    } else {
      showToast({ type: 'success', message: `补水 +${amount}ml` })
    }

    // 任务检查
    const legacyFormat: FoodLog = {
      id: savedLog.id,
      name: savedLog.name,
      icon: savedLog.icon,
      calories: 0,
      p: 0,
      c: 0,
      f: 0,
      grams: savedLog.amount,
      mealType: 'HYDRATION',
      timestamp: savedLog.timestamp,
      category: 'DRINK',
      tags: ['纯净'],
    }
    collectionStore.checkDailyQuests(legacyFormat)

    const wasComplete = todayProgress.value.isComplete
    const newProgress = {
      amount: logStore.todayHydrationAmount,
      cups: logStore.todayHydrationCups,
      target: dailyTargetMl.value,
      percentage: Math.min(
        100,
        Math.round((logStore.todayHydrationAmount / dailyTargetMl.value) * 100),
      ),
      remaining: Math.max(0, dailyTargetMl.value - logStore.todayHydrationAmount),
      isComplete: logStore.todayHydrationAmount >= dailyTargetMl.value,
    }

    if (newProgress.isComplete && !wasComplete) {
      if (!systemStore.isPureMode) {
        showNotify({
          type: 'success',
          message: '🎉 今日补水目标已达成！',
          background: '#22c55e',
          duration: 3000,
        })
      }
    }

    resetForm()
    return { log: savedLog }
  }

  /**
   * 删除补水记录
   */
  function removeHydration(logId: number | string): HydrationLog | null {
    const targetLog = logStore.allTodayHydration.find((log) => log.id === logId)
    if (!targetLog) {
      showToast('记录不存在')
      return null
    }

    let goldToRevert = 0
    if (!systemStore.isPureMode && targetLog.amount) {
      const baseGold = Math.floor(targetLog.amount / 250) * 5
      goldToRevert = baseGold
    }

    const currentGold = heroStore.user.gold || 0
    if (goldToRevert > 0 && currentGold < goldToRevert) {
      showToast(`金币不足，无法撤销此记录（需要 ${goldToRevert} 金币，当前 ${currentGold}）`)
      return null
    }

    const removed = logStore.removeHydrationLog(logId)
    if (removed && goldToRevert > 0) {
      heroStore.revertGold(goldToRevert)
    }

    return removed
  }

  /**
   * 更新补水配置
   */
  function updateConfig(
    config: Partial<{
      dailyTargetCups: number
      cupSizeMl: number
      reminderInterval: number
      enableNotifications: boolean
    }>,
  ) {
    if (heroStore.user.hydration) {
      Object.assign(heroStore.user.hydration, config)
    }

    if (config.enableNotifications !== undefined) {
      reminderState.isEnabled = config.enableNotifications
    }
    if (config.reminderInterval !== undefined) {
      reminderState.intervalMinutes = config.reminderInterval
    }
  }

  /**
   * 启用/禁用提醒
   */
  function toggleReminder(enabled: boolean) {
    reminderState.isEnabled = enabled
    if (heroStore.user.hydration) {
      heroStore.user.hydration.enableNotifications = enabled
    }

    if (enabled) {
      _scheduleNextReminder()
    }
  }

  /**
   * 获取补水建议
   * [修改] icon 字段返回 iconfont 类名
   */
  function getSuggestion(): { message: string; icon: string; type: 'INFO' | 'WARN' | 'GOOD' } {
    const progress = todayProgress.value
    const minutesSince = minutesSinceLastDrink.value

    if (progress.isComplete) {
      return { message: '今日补水目标已完成，保持水分充足！', icon: 'icon-shui', type: 'GOOD' } // 原: ✨
    }

    if (minutesSince > 120) {
      return { message: '已经超过2小时没喝水了，快来补充水分！', icon: 'icon-shui', type: 'WARN' } // 原: ⚠️
    }

    if (minutesSince > 60) {
      return { message: '一小时没喝水了，来杯水保持活力吧！', icon: 'icon-shui', type: 'INFO' } // 原: 💧
    }

    if (progress.percentage < 30) {
      return {
        message: `今日进度 ${progress.percentage}%，还需要 ${progress.remaining}ml`,
        icon: 'icon-qishui', // 原: 🥤
        type: 'INFO',
      }
    }

    if (progress.percentage < 70) {
      return {
        message: `进度不错！再来 ${progress.remaining}ml 就达标了`,
        icon: 'icon-muscle', // 原: 💪 (需确认是否有 icon-muscle 或类似图标)
        type: 'INFO',
      }
    }

    return { message: `即将达标！只差 ${progress.remaining}ml 了`, icon: 'icon-target', type: 'GOOD' } // 原: 🎯
  }

  // --- Internal Helpers ---
  function _scheduleNextReminder() {
    if (!reminderState.isEnabled) return

    const now = Date.now()
    reminderState.nextRemindTime = now + reminderState.intervalMinutes * 60 * 1000
  }

  watch(
    () => heroStore.user.hydration,
    (config) => {
      if (config) {
        reminderState.isEnabled = config.enableNotifications || false
        reminderState.intervalMinutes = config.reminderInterval || 60
      }
    },
    { immediate: true, deep: true },
  )

  return {
    formState,
    reminderState,
    hydrationConfig,
    dailyTargetMl,
    todayProgress,
    selectedPreset,
    lastDrinkTime,
    minutesSinceLastDrink,
    shouldRemind,
    todayLogs,
    DRINK_PRESETS,
    resetForm,
    selectPreset,
    quickDrink,
    commitHydration,
    removeHydration,
    updateConfig,
    toggleReminder,
    getSuggestion,
  }
})
