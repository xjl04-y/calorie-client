<script setup lang="ts">
import { computed, onMounted, ref, onUnmounted, watch } from 'vue'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { useHeroStore } from '@/stores/useHeroStore'
import AppHud from '@/components/AppHud.vue'
import DateNavigator from '@/components/DateNavigator.vue'
import ModalQuestBoard from '@/components/modals/ModalQuestBoard.vue'
import WeatherLayer from '@/components/home/WeatherLayer.vue'
import HomeRpgDashboard from '@/components/home/HomeRpgDashboard.vue'
import HomePureDashboard from '@/components/home/HomePureDashboard.vue'
import HomeLogList from '@/components/home/HomeLogList.vue'

const store = useGameStore()
const systemStore = useSystemStore()
const heroStore = useHeroStore()

// --- 连胜奖励弹窗状态 ---
const showDailyBonusModal = ref(false)
const dailyBonusMessage = ref('')

const handleBonusConfirm = () => {
  showDailyBonusModal.value = false
}

const isPure = computed(() => systemStore.isPureMode)
// [Optimization] 直接解构或计算属性，确保响应式依赖正确
const isDarkTheme = computed(() => store.isDarkMode)

// --- 断食逻辑 ---
const fastingTime = ref(0)
let fastingInterval: number | null = null

const updateFastingTime = () => {
  let start = 0
  if (store.user.fasting && store.user.fasting.isFasting) {
    start = store.user.fasting.startTime
  } else {
    start = store.lastMealTime || 0
  }
  if (start > 0) {
    fastingTime.value = Date.now() - start
  } else {
    fastingTime.value = 0
  }
}

const fastingStatus = computed(() => {
  const hours = fastingTime.value / (1000 * 60 * 60)
  const isFasting = store.user.fasting?.isFasting

  if (isFasting) {
    if (hours > 16) return { text: '✨ 燃脂全开 (2.0x)', color: 'text-emerald-600 dark:text-emerald-400', icon: 'fas fa-bolt', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' }
    if (hours > 12) return { text: '🔥 正在燃烧 (1.5x)', color: 'text-blue-600 dark:text-blue-400', icon: 'fas fa-fire', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' }
    return { text: `🧘 身体净化中 ${Math.floor(hours)}h`, color: 'text-sky-600 dark:text-sky-400', icon: 'fas fa-spa', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800' }
  }
  return { text: `🕒 距上一餐 ${Math.floor(hours)}h`, color: 'text-slate-500 dark:text-slate-400', icon: 'fas fa-utensils', bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
})

const openFastingModal = () => {
  systemStore.setModal('fasting', true)
}

// [Fix] 容器动态类名优化: 确保背景色随 Theme 立即改变
const containerClass = computed(() => {
  return isDarkTheme.value
    ? 'bg-slate-900 text-slate-200'
    : 'bg-slate-50 text-slate-700'
})

onMounted(() => {
  if (store.user.isInitialized) {
    store.refreshQuestHall()
    if (!systemStore.hasCompletedGuide) {
      systemStore.hasCompletedGuide = true
    }
  }
  updateFastingTime()
  fastingInterval = window.setInterval(updateFastingTime, 60000)

  if (systemStore.checkDailyLogin) {
    const loginResult = systemStore.checkDailyLogin()
    if (loginResult.isNewDay) {
      heroStore.addGold(loginResult.streakBonus, '签到奖励', 'CHECKIN_BONUS')
      dailyBonusMessage.value = `${loginResult.message}\n额外获得金币: ${loginResult.streakBonus}`

      const checkAndShowBonus = () => {
        if (systemStore.hasCompletedGuide || !store.user.isInitialized) {
          setTimeout(() => { showDailyBonusModal.value = true }, 1000)
        } else {
          const unwatch = watch(() => systemStore.hasCompletedGuide, (completed) => {
            if (completed) {
              setTimeout(() => { showDailyBonusModal.value = true }, 800)
              unwatch()
            }
          })
        }
      }
      checkAndShowBonus()
    }
  }

  if (isPure.value && !systemStore.hasSeenPureGuide && store.user.isInitialized) {
    setTimeout(() => {
      systemStore.hasSeenPureGuide = true
      store.setModal('npcGuide', true)
    }, 1500)
  }
})

onUnmounted(() => {
  if (fastingInterval) clearInterval(fastingInterval)
})
</script>

<template>
  <div
    class="pb-24 min-h-screen transition-colors duration-300 relative overflow-x-hidden font-sans"
    :class="containerClass"
  >
    <!-- Weather Layer -->
    <WeatherLayer v-if="!isPure" />

    <AppHud @open-achievements="store.setModal('achievements', true)" />

    <!-- Date Navigator -->
    <div id="guide-date" class="relative z-10 my-2">
      <DateNavigator />
    </div>

    <!-- Fasting Status -->
    <div class="px-4 mt-3 relative z-10" @click="openFastingModal">
      <div
        class="rounded-xl px-4 py-3 flex justify-between items-center active:scale-98 transition-all cursor-pointer shadow-sm border border-transparent"
        :class="[fastingStatus.bg, fastingStatus.border]"
      >
        <div class="text-xs font-bold flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center text-lg shadow-sm">
            <i :class="fastingStatus.icon + ' ' + fastingStatus.color"></i>
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] opacity-70 font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">断食状态</span>
            <span :class="fastingStatus.color" class="text-sm">{{ fastingStatus.text }}</span>
          </div>
        </div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500 flex items-center bg-white/40 dark:bg-black/20 px-2 py-1 rounded-full">
          {{ store.user.fasting?.isFasting ? '查看详情' : '去开启' }}
          <van-icon name="arrow" class="ml-1" />
        </div>
      </div>
    </div>

    <!-- Mode Switcher -->
    <HomePureDashboard v-if="isPure" />
    <HomeRpgDashboard v-else />

    <!-- Shared Log List -->
    <HomeLogList />

    <!-- Daily Bonus Modal -->
    <div v-if="showDailyBonusModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-slate-800 border-2 border-yellow-500 rounded-xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-bounce-in relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
        <h3 class="text-2xl font-bold text-yellow-400 mb-2 drop-shadow-md">每日登录奖励!</h3>

        <!-- [修改] 替换 🎁 Emoji 为 iconfont (假设您有 icon-liwu) -->
        <!-- 如果没有 liwu 图标，这里会显示空白，请确保您下载的 iconfont 包含对应图标 -->
        <div class="my-6 animate-pulse flex justify-center">
          <i class="iconfont icon-liwu text-6xl text-yellow-400"></i>
        </div>

        <p class="text-slate-200 whitespace-pre-line mb-8 font-medium">{{ dailyBonusMessage }}</p>
        <button
          @click="handleBonusConfirm"
          class="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-3.5 px-6 rounded-lg transition-all transform active:scale-95 shadow-lg border-t border-yellow-400/20"
        >
          收入囊中
        </button>
      </div>
    </div>

    <ModalQuestBoard />
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes bounceIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>
