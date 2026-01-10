<script lang="ts">
export default { name: 'ProfileView' }
</script>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { useHeroStore } from '@/stores/useHeroStore'
import { showToast } from 'vant'
import { getCombatRank } from '@/utils/gameUtils'
import type { Achievement } from '@/types'
import type { UploaderFileListItem } from 'vant'
import type { SlotType } from '@/types'
import HeroBackground from '@/components/HeroBackground.vue'
// [新增] 引入默认头像
import defaultAvatar from '@/assets/avatar/avatar.jpg'

const store = useGameStore()
const systemStore = useSystemStore()
const heroStore = useHeroStore()

const user = computed(() => store.user)
const heroStats = computed(() => store.heroStats)
const isPure = computed(() => systemStore.isPureMode)

const currentBMR = computed(() => heroStore.dailyTarget)

const equipment = computed(() => {
  const slotDefinitions: Array<{ id: SlotType; name: string; icon: string }> = [
    { id: 'HEAD', name: '头部', icon: 'fas fa-hat-wizard' },
    { id: 'BODY', name: '身体', icon: 'fas fa-tshirt' },
    { id: 'LEGS', name: '腿部', icon: 'fas fa-socks' },
    { id: 'BACK', name: '背部', icon: 'fas fa-user-secret' },
    { id: 'WEAPON', name: '主手', icon: 'fas fa-khanda' },
    { id: 'OFFHAND', name: '副手', icon: 'fas fa-shield-alt' },
    { id: 'ACCESSORY', name: '饰品', icon: 'fas fa-ring' },
  ]
  return slotDefinitions.map((def) => {
    const equippedId = user.value.equipped[def.id]
    const equippedItem = equippedId
      ? store.achievements.find((a: Achievement) => a.id === equippedId)
      : null
    return { slotId: def.id, slotName: def.name, defaultIcon: def.icon, item: equippedItem || null }
  })
})

const showEdit = ref(false)
const editData = reactive({ height: 0, weight: 0, age: 0 })

// RPG Rank Info (仅RPG模式使用)
const rpgRankInfo = computed(() => getCombatRank(heroStats.value.combatPower))

// RPG Rank Definitions (for modal - RPG Mode Only)
const rpgRanks = [
  {
    title: '无名之辈',
    minCp: 0,
    passive: '无特殊加成',
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-700',
  },
  {
    title: '见习冒险者',
    minCp: 500,
    passive: '基础体力恢复+5%',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    title: '正式冒险者',
    minCp: 1500,
    passive: '每日签到金币+10%',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    title: '资深专家',
    minCp: 3000,
    passive: '属性训练效果+5%',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  {
    title: '王国卫士',
    minCp: 5000,
    passive: '战斗经验获取+10%',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    title: '皇家骑士',
    minCp: 10000,
    passive: '商店购物折扣 5%',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  {
    title: '传奇英雄',
    minCp: 20000,
    passive: '全属性加成+5%',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    title: '半神',
    minCp: 50000,
    passive: '每日体力上限+20',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    title: '神话',
    minCp: 100000,
    passive: '解锁隐藏神话装备',
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
]

const nextRankProgress = computed(() => {
  if (isPure.value) return 0 // 纯净模式不计算Rank进度
  if (!rpgRankInfo.value.next) return 100
  return Math.min(100, (heroStats.value.combatPower / rpgRankInfo.value.next) * 100)
})

const bmi = computed(() => {
  const h = user.value.height / 100
  if (h <= 0) return 0
  return (user.value.weight / (h * h)).toFixed(1)
})

const bmiStatus = computed(() => {
  const val = parseFloat(String(bmi.value))
  if (val < 18.5) return { text: '偏瘦', color: 'text-blue-500', width: '15%' } // 偏瘦区间
  if (val < 24) return { text: '正常', color: 'text-green-500', width: '40%' } // 正常区间
  if (val < 28) return { text: '超重', color: 'text-orange-500', width: '70%' } // 超重区间
  return { text: '肥胖', color: 'text-red-500', width: '90%' } // 肥胖区间
})

// 计算BMI指示条的位置
const bmiPercent = computed(() => {
  const val = parseFloat(String(bmi.value))
  // 简单映射：15~35 映射到 0%~100%
  const min = 15
  const max = 35
  const percent = ((val - min) / (max - min)) * 100
  return Math.min(Math.max(percent, 0), 100)
})

const rankViewMode = ref<'details' | 'list'>('details')
const showRankDetails = ref(false)

const openRankDetails = () => {
  if (isPure.value) return // 纯净模式不打开阶位详情
  rankViewMode.value = 'details'
  showRankDetails.value = true
}

const onAvatarRead = (items: UploaderFileListItem | UploaderFileListItem[]) => {
  const file = Array.isArray(items) ? items[0] : items
  if (file && file.content) {
    store.user.avatarType = 'CUSTOM'
    store.user.customAvatar = file.content
    store.saveState()
    showToast('头像上传成功！')
  } else {
    showToast('图片读取失败')
  }
}

// [移除] 移除了 changeAvatar 函数，不再支持随机生成头像

const startEditProfile = () => {
  editData.height = user.value.height
  editData.weight = user.value.weight
  editData.age = user.value.age
  showEdit.value = true
}

const validate = () => {
  if (editData.height <= 50 || editData.height > 250) {
    showToast('身高必须在 50-250cm 之间')
    return false
  }
  if (editData.weight <= 20 || editData.weight > 300) {
    showToast('体重必须在 20-300kg 之间')
    return false
  }
  if (editData.age <= 5 || editData.age > 120) {
    showToast('年龄必须在 5-120 岁之间')
    return false
  }
  return true
}

const saveProfile = () => {
  if (!validate()) return
  store.user.height = editData.height
  store.updateWeight(editData.weight)
  store.user.age = editData.age
  store.saveState()
  showToast(isPure.value ? '身体数据已更新' : '档案已更新，Boss数值重算中...')
}

const onBeforeClose = (action: string) => {
  if (action === 'confirm') return validate()
  return true
}

const openSwap = (slotId: SlotType) => {
  if (isPure.value) return
  store.temp.activeSlot = slotId
  store.setModal('equipmentSwap', true)
}

const expPercent = computed(() => {
  if (user.value.nextLevelExp <= 0) return 0
  return Math.min(100, (user.value.currentExp / user.value.nextLevelExp) * 100)
})

const lightParticles = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${10 + Math.random() * 15}s`,
    width: `${Math.random() * 6 + 2}px`,
    height: `${Math.random() * 6 + 2}px`,
    opacity: 0.2 + Math.random() * 0.4,
  },
  class: Math.random() > 0.5 ? 'bg-purple-400' : 'bg-blue-400',
}))

const openRebirth = () => {
  systemStore.setModal('rebirth', true)
}
const openShop = () => {
  systemStore.setModal('shop', true)
}
const openTargetConfig = () => {
  systemStore.setModal('targetConfig', true)
}
</script>

<template>
  <div
    class="pb-24 bg-slate-50 dark:bg-slate-900 min-h-full text-slate-800 dark:text-white transition-colors duration-300"
  >
    <!-- Header -->
    <div
      class="relative transition-all duration-500 overflow-hidden"
      :class="
        isPure
          ? 'h-auto pt-6 pb-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
          : 'h-72 bg-white dark:bg-slate-900'
      "
    >
      <!-- 动画层 (仅RPG) -->
      <div v-if="!isPure" class="absolute inset-0 hidden dark:block pointer-events-none">
        <HeroBackground />
      </div>

      <div
        v-if="!isPure"
        class="absolute inset-0 dark:hidden pointer-events-none overflow-hidden select-none z-0"
      >
        <div
          class="absolute inset-0 opacity-40 animate-pulse-slow"
          style="
            background:
              radial-gradient(circle at 20% 30%, rgba(167, 139, 250, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(96, 165, 250, 0.4) 0%, transparent 50%);
          "
        ></div>
        <div
          v-for="p in lightParticles"
          :key="p.id"
          class="absolute rounded-full animate-float-up mix-blend-multiply"
          :class="p.class"
          :style="p.style"
        ></div>
        <div class="absolute top-12 left-10 text-purple-300/50 text-2xl animate-spin-slow">✦</div>
        <div
          class="absolute bottom-20 right-12 text-blue-300/50 text-xl animate-float-up"
          style="animation-delay: 2s"
        >
          ✶
        </div>
      </div>

      <!-- 纹理层 (仅RPG) -->
      <div
        v-if="!isPure"
        class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 dark:opacity-20 pointer-events-none z-0"
      ></div>

      <!-- Settings & Avatar Button -->
      <div class="absolute top-4 left-0 right-0 px-4 z-30 flex justify-between" v-if="!isPure">
        <!-- RPG Mode Top Bar -->
        <div
          id="guide-settings"
          @click="store.setModal('settings', true)"
          class="px-3 py-1 rounded-full text-xs flex items-center active:scale-95 transition cursor-pointer backdrop-blur border bg-white/60 dark:bg-black/30 text-slate-700 font-bold dark:text-white border-slate-300/50 dark:border-white/20 hover:bg-white/80 dark:hover:bg-black/50"
        >
          <i class="fas fa-cog mr-1"></i> 设置
        </div>
        <van-uploader :after-read="onAvatarRead">
          <div
            class="px-3 py-1 rounded-full text-xs flex items-center active:scale-95 transition cursor-pointer backdrop-blur border bg-white/60 dark:bg-black/30 text-slate-700 font-bold dark:text-white border-slate-300/50 dark:border-white/20 hover:bg-white/80 dark:hover:bg-black/50"
          >
            <i class="fas fa-camera mr-1"></i> 头像
          </div>
        </van-uploader>
      </div>

      <!-- Pure Mode Top Bar -->
      <div v-if="isPure" class="px-6 flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-slate-800 dark:text-white">个人中心</h2>
        <div class="flex gap-2">
          <van-uploader :after-read="onAvatarRead">
            <div
              class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-200"
            >
              <i class="fas fa-camera text-xs"></i>
            </div>
          </van-uploader>
          <div
            @click="store.setModal('settings', true)"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer hover:bg-slate-200"
          >
            <i class="fas fa-cog text-xs"></i>
          </div>
        </div>
      </div>

      <!-- User Card (RPG Style) -->
      <div
        v-if="!isPure"
        class="absolute inset-0 flex flex-col items-center justify-start z-20 pt-16"
      >
        <!-- [修改] 移除了点击事件和 cursor-pointer -->
        <div class="relative group mb-3">
          <div
            class="w-24 h-24 rounded-full p-1 relative z-10 overflow-hidden shadow-xl transition-all bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-800"
          >
            <img
              v-if="user.avatarType === 'CUSTOM' && user.customAvatar"
              :src="user.customAvatar"
              class="w-full h-full rounded-full object-cover"
            />
            <!-- [修改] 使用本地默认头像 -->
            <img
              v-else
              :src="defaultAvatar"
              class="w-full h-full rounded-full bg-slate-200 dark:bg-slate-600 object-cover"
            />
          </div>
          <div
            class="absolute bottom-0 right-0 bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-0.5 rounded-full border-2 border-white dark:border-slate-800 shadow-lg z-20"
          >
            Lv.{{ user.level }}
          </div>
        </div>

        <h2
          class="text-2xl font-bold tracking-wide mb-1 transition-colors font-rpg text-purple-900 dark:text-yellow-400"
        >
          {{ user.nickname }}
        </h2>

        <!-- EXP & Gold (RPG Only) -->
        <div class="flex flex-col items-center">
          <div class="w-48 mb-2">
            <div
              class="flex justify-between text-[10px] px-1 mb-0.5 font-bold text-slate-600 dark:text-slate-400"
            >
              <span>EXP</span>
              <span>{{ Math.floor(user.currentExp) }} / {{ user.nextLevelExp }}</span>
            </div>
            <div
              class="h-2 rounded-full overflow-hidden border transition-colors bg-slate-300 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            >
              <div
                class="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                :style="{ width: expPercent + '%' }"
              ></div>
            </div>
          </div>

          <div
            class="px-3 py-0.5 rounded-full border flex items-center text-xs font-mono font-bold cursor-pointer hover:scale-105 transition bg-white/60 dark:bg-black/40 border-yellow-500/30 text-yellow-800 dark:text-yellow-400"
            @click="openShop"
          >
            <i class="fas fa-coins mr-1.5"></i> {{ user.gold || 0 }}
          </div>
        </div>

        <div
          class="flex items-center justify-center gap-2 text-xs mt-1 font-medium text-slate-600 dark:text-slate-400"
        >
          <span
            ><i
              :class="
                user.gender === 'MALE'
                  ? 'fas fa-mars text-blue-600 dark:text-blue-400'
                  : 'fas fa-venus text-pink-600 dark:text-pink-400'
              "
            ></i>
            {{ user.age }}岁</span
          >
          <span>|</span><span>{{ user.height }}cm</span><span>|</span
          ><span>{{ user.weight }}kg</span>
        </div>
      </div>

      <!-- User Card (Pure Style) -->
      <div v-else class="px-6 flex items-center gap-4">
        <!-- [修改] 移除了点击事件和 cursor-pointer -->
        <div
          class="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-600 flex-shrink-0"
        >
          <img
            v-if="user.avatarType === 'CUSTOM' && user.customAvatar"
            :src="user.customAvatar"
            class="w-full h-full object-cover"
          />
          <!-- [修改] 使用本地默认头像 -->
          <img
            v-else
            :src="defaultAvatar"
            class="w-full h-full bg-slate-50 dark:bg-slate-700 object-cover"
          />
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">{{ user.nickname }}</h3>
          <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
              {{ user.gender === 'MALE' ? '男' : '女' }} / {{ user.age }}岁
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- RPG Content -->
    <div v-if="!isPure">
      <!-- 功能入口区 -->
      <div class="px-4 mt-5 grid grid-cols-2 gap-3">
        <div
          @click="openShop"
          class="group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 cursor-pointer shadow-sm active:scale-95 transition-all hover:shadow-md"
        >
          <div
            class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-lg shadow-inner"
          >
            <i class="fas fa-store"></i>
          </div>
          <div class="flex flex-col">
            <span
              class="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors"
              >道具商店</span
            >
            <span class="text-[10px] text-slate-400">Shop</span>
          </div>
          <div
            class="absolute -right-3 -top-3 w-10 h-10 bg-orange-500/10 rounded-full blur-xl"
          ></div>
        </div>

        <div
          @click="openRebirth"
          class="group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 cursor-pointer shadow-sm active:scale-95 transition-all hover:shadow-md"
        >
          <div
            class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shadow-inner"
          >
            <i class="fas fa-dungeon"></i>
          </div>
          <div class="flex flex-col">
            <span
              class="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
              >转生洗点</span
            >
            <span class="text-[10px] text-slate-400">Rebirth</span>
          </div>
          <div
            class="absolute -right-3 -top-3 w-10 h-10 bg-purple-500/10 rounded-full blur-xl"
          ></div>
        </div>
      </div>

      <!-- Base Stats & Rank -->
      <div class="mt-4 text-center px-6">
        <div class="flex justify-center mb-4">
          <span
            class="px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all"
            :class="'bg-white dark:bg-slate-800 border-purple-200 dark:border-slate-600 text-purple-700 dark:text-slate-300'"
          >
            种族：{{ heroStats.raceName }}
          </span>
        </div>

        <div
          @click="openTargetConfig"
          class="mx-auto w-full max-w-[200px] mb-4 rounded-lg py-1 px-3 flex justify-between items-center cursor-pointer active:scale-95 transition hover:border-purple-500 border"
          :class="'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600'"
        >
          <div
            class="text-[10px] font-bold uppercase"
            :class="'text-slate-600 dark:text-slate-400'"
          >
            当前战术目标
          </div>
          <div class="text-xs font-bold" :class="'text-yellow-700 dark:text-yellow-400'">
            <i class="fas fa-crosshairs mr-1"></i> {{ currentBMR }}
            <span class="text-[8px]">HP</span>
          </div>
        </div>

        <div
          @click="openRankDetails"
          class="rounded-xl p-4 border shadow-inner mb-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors cursor-pointer active:scale-98"
          :class="'bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700'"
        >
          <div
            class="absolute -right-4 -top-4 text-6xl opacity-10 rotate-12 group-hover:scale-110 transition-transform text-slate-900 dark:text-white"
          >
            {{ heroStats.rankIcon }}
          </div>

          <div
            class="text-xs uppercase tracking-widest mb-1 font-bold"
            :class="'text-slate-600 dark:text-slate-400'"
          >
            Combat Rank
          </div>
          <div
            class="text-2xl font-black flex items-center justify-center gap-2 mb-2"
            :class="heroStats.rankColor"
          >
            {{ heroStats.rankTitle }}
            <span class="text-sm font-mono font-bold" :class="'text-slate-500 dark:text-slate-500'"
              >({{ heroStats.combatPower }})</span
            >
          </div>

          <div
            class="rounded-lg py-2 px-3 text-xs inline-block border mb-3"
            :class="'bg-slate-100 dark:bg-black/30 border-slate-200 dark:border-white/5'"
          >
            <span class="font-bold mr-1" :class="'text-yellow-700 dark:text-yellow-500'"
              >✦ 阶位特权:</span
            >
            <span class="font-medium" :class="'text-slate-700 dark:text-slate-300'">{{
              rpgRankInfo.passive
            }}</span>
          </div>

          <div v-if="rpgRankInfo.next" class="mt-2 px-4">
            <div
              class="flex justify-between text-[10px] mb-1 font-bold"
              :class="'text-slate-600 dark:text-slate-500'"
            >
              <span>距离下一阶位</span>
              <span>{{ heroStats.combatPower }} / {{ rpgRankInfo.next }}</span>
            </div>
            <div
              class="h-1.5 rounded-full overflow-hidden"
              :class="'bg-slate-200 dark:bg-slate-700'"
            >
              <div
                class="h-full bg-yellow-600 transition-all duration-500"
                :style="{ width: nextRankProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button
            @click="startEditProfile"
            class="text-xs underline hover:text-purple-500 font-medium"
            :class="'text-slate-600 dark:text-slate-500'"
          >
            修改档案数据
          </button>
        </div>
      </div>

      <!-- Core Attributes -->
      <div class="px-4 mt-6">
        <div
          id="guide-profile-stats"
          class="border rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden"
          :class="'bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'"
        >
          <h3
            class="text-sm font-bold mb-5 flex items-center"
            :class="'text-slate-700 dark:text-slate-400'"
          >
            <i class="fas fa-chart-bar mr-2 text-purple-600 dark:text-purple-500"></i> 核心属性
          </h3>
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-blue-600 dark:text-blue-400 w-16 font-bold"
                >力量 (STR)</span
              >
              <div
                class="flex-1 mx-3 h-2 rounded-full overflow-hidden"
                :class="'bg-slate-200 dark:bg-slate-700'"
              >
                <div
                  class="h-full bg-blue-500"
                  :class="{ 'stat-bar-overflow': heroStats.rawStr > heroStats.maxStat }"
                  :style="{ width: Math.min((heroStats.str / heroStats.maxStat) * 100, 100) + '%' }"
                ></div>
              </div>
              <span
                class="text-xs font-bold w-12 text-right text-slate-800 dark:text-slate-200"
                :class="{ 'text-red-500': heroStats.rawStr > heroStats.maxStat }"
                >{{ heroStats.str }}</span
              >
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-green-600 dark:text-green-400 w-16 font-bold"
                >敏捷 (AGI)</span
              >
              <div
                class="flex-1 mx-3 h-2 rounded-full overflow-hidden"
                :class="'bg-slate-200 dark:bg-slate-700'"
              >
                <div
                  class="h-full bg-green-500"
                  :class="{ 'stat-bar-overflow': heroStats.rawAgi > heroStats.maxStat }"
                  :style="{ width: Math.min((heroStats.agi / heroStats.maxStat) * 100, 100) + '%' }"
                ></div>
              </div>
              <span
                class="text-xs font-bold w-12 text-right text-slate-800 dark:text-slate-200"
                :class="{ 'text-red-500': heroStats.rawAgi > heroStats.maxStat }"
                >{{ heroStats.agi }}</span
              >
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-orange-600 dark:text-orange-400 w-16 font-bold"
                >体质 (VIT)</span
              >
              <div
                class="flex-1 mx-3 h-2 rounded-full overflow-hidden"
                :class="'bg-slate-200 dark:bg-slate-700'"
              >
                <div
                  class="h-full bg-orange-500"
                  :class="{ 'stat-bar-overflow': heroStats.rawVit > heroStats.maxStat }"
                  :style="{ width: Math.min((heroStats.vit / heroStats.maxStat) * 100, 100) + '%' }"
                ></div>
              </div>
              <span
                class="text-xs font-bold w-12 text-right text-slate-800 dark:text-slate-200"
                :class="{ 'text-red-500': heroStats.rawVit > heroStats.maxStat }"
                >{{ heroStats.vit }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment -->
      <div class="px-4 mt-4" id="guide-equipment">
        <div
          class="border-2 rounded-2xl p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden"
          :class="'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'"
        >
          <!-- 纹理层 -->
          <div
            class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] hidden dark:block opacity-20 pointer-events-none"
          ></div>

          <div class="flex justify-between items-center mb-4 relative z-10">
            <h3
              class="text-sm font-bold flex items-center"
              :class="'text-slate-700 dark:text-slate-300'"
            >
              <i class="fas fa-shield-alt mr-2 text-yellow-600"></i> 英雄装备
            </h3>
            <span class="text-[10px] font-medium" :class="'text-slate-600 dark:text-slate-500'"
              >点击槽位更换</span
            >
          </div>

          <div class="grid grid-cols-4 gap-3 relative z-10">
            <div
              v-for="slot in equipment"
              :key="slot.slotId"
              @click="openSwap(slot.slotId)"
              class="aspect-square rounded-lg flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group cursor-pointer hover:border-purple-500 active:scale-95"
              :class="[
                slot.item
                  ? 'border-' + slot.item.rarity + ' shadow-md'
                  : 'border-dashed opacity-60',
                'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
              ]"
            >
              <i
                v-if="!slot.item"
                class="text-3xl"
                :class="[slot.defaultIcon, 'text-slate-500 dark:text-slate-600']"
              ></i>
              <span
                v-if="!slot.item"
                class="text-[8px] mt-1 font-bold"
                :class="'text-slate-600 dark:text-slate-600'"
                >{{ slot.slotName }}</span
              >

              <div
                v-if="slot.item"
                class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
              ></div>
              <span
                v-if="slot.item"
                class="text-4xl mb-1 filter drop-shadow-md transform transition-transform group-hover:scale-110"
                >{{ slot.item.icon }}</span
              >
              <div
                v-if="slot.item"
                class="absolute bottom-0 w-full text-center backdrop-blur-sm py-0.5"
                :class="'bg-slate-200/90 dark:bg-slate-900/80'"
              >
                <span
                  class="text-[8px] font-bold block truncate px-1"
                  :class="'text-' + slot.item.rarity"
                  >{{ slot.item.reward }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pure Content (Clean Health Dashboard) -->
    <div v-else class="px-4 mt-2 pb-6 space-y-4">
      <!-- Health Metrics: BMI Visualization -->
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div class="flex justify-between items-center mb-4">
          <div class="flex flex-col">
            <span
              class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
              >BMI 指数</span
            >
            <span class="text-2xl font-black text-slate-800 dark:text-white mt-0.5"
              >{{ bmi }}
              <span
                class="text-xs font-medium px-1.5 py-0.5 rounded ml-1"
                :class="[
                  bmiStatus.text === '正常'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600',
                ]"
                >{{ bmiStatus.text }}</span
              ></span
            >
          </div>
          <div class="text-right flex flex-col items-end">
            <span
              class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider"
              >每日基础消耗 (BMR)</span
            >
            <div @click="openTargetConfig" class="flex items-center cursor-pointer group">
              <span class="text-xl font-bold text-slate-700 dark:text-slate-200 mt-0.5">{{
                currentBMR
              }}</span>
              <span class="text-xs text-slate-400 ml-1">kcal</span>
              <i
                class="fas fa-edit text-[10px] text-slate-300 ml-1.5 group-hover:text-blue-500 transition-colors"
              ></i>
            </div>
          </div>
        </div>

        <!-- Visual BMI Gauge -->
        <div class="relative pt-2 pb-1">
          <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
            <div class="h-full bg-blue-300 w-[18.5%]"></div>
            <!-- Underweight -->
            <div class="h-full bg-green-400 w-[24.5%]"></div>
            <!-- Normal -->
            <div class="h-full bg-orange-400 w-[27%]"></div>
            <!-- Overweight -->
            <div class="h-full bg-red-400 flex-1"></div>
            <!-- Obese -->
          </div>
          <!-- Indicator -->
          <div
            class="absolute top-0 w-1 h-6 bg-slate-800 dark:bg-white rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-all duration-1000"
            :style="{ left: bmiPercent + '%' }"
          ></div>
          <div class="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
            <span>15</span>
            <span>18.5</span>
            <span>24</span>
            <span>28</span>
            <span>35+</span>
          </div>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 leading-relaxed">
          * BMI 与 BMR 基于您的身高体重计算，可作为基础健康参考。
        </div>
      </div>

      <!-- Body Stats Cards -->
      <div class="grid grid-cols-3 gap-3">
        <div
          class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center"
        >
          <i class="fas fa-ruler-vertical text-slate-300 mb-2 text-lg"></i>
          <div class="text-xl font-bold text-slate-800 dark:text-white">{{ user.height }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">身高 (cm)</div>
        </div>
        <div
          class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center"
        >
          <i class="fas fa-weight text-slate-300 mb-2 text-lg"></i>
          <div class="text-xl font-bold text-slate-800 dark:text-white">{{ user.weight }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">体重 (kg)</div>
        </div>
        <div
          class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center"
        >
          <i class="fas fa-birthday-cake text-slate-300 mb-2 text-lg"></i>
          <div class="text-xl font-bold text-slate-800 dark:text-white">{{ user.age }}</div>
          <div class="text-[10px] text-slate-400 mt-0.5">年龄 (岁)</div>
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click="startEditProfile"
        class="w-full py-3.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold text-sm shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
      >
        <i class="fas fa-user-edit"></i> 更新身体数据
      </button>
    </div>

    <!-- Enhanced Edit Modal (Adapted for RPG/Pure) -->
    <van-dialog
      v-model:show="showEdit"
      :title="isPure ? '更新身体数据' : '重塑英雄肉体'"
      show-cancel-button
      :before-close="onBeforeClose"
      @confirm="saveProfile"
      :confirm-button-color="isPure ? '#3b82f6' : '#9333ea'"
      class="overflow-hidden dark:bg-slate-800 dark:text-white"
    >
      <!-- Custom Content Wrapper -->
      <div
        class="p-6 transition-colors duration-300"
        :class="isPure ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900'"
      >
        <!-- Flavor Text (RPG Only) -->
        <div
          v-if="!isPure"
          class="text-xs text-center mb-6 italic text-slate-500 dark:text-slate-400"
        >
          "调整你的现实投影，以适应新的战斗需求..."
        </div>

        <div class="space-y-5">
          <!-- Height Input -->
          <div class="relative group">
            <div class="flex items-center justify-between mb-1.5">
              <label
                class="text-xs font-bold transition-colors"
                :class="
                  isPure
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-purple-700 dark:text-purple-400'
                "
              >
                <i
                  class="fas fa-ruler-vertical mr-1"
                  :class="isPure ? 'text-blue-500' : 'text-purple-500'"
                ></i>
                {{ isPure ? '身高' : '灵体高度' }}
              </label>
              <span class="text-[10px] text-slate-400">50 - 250 cm</span>
            </div>
            <div class="relative">
              <input
                type="number"
                v-model.number="editData.height"
                class="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none transition-all border-2"
                :class="
                  isPure
                    ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-white'
                    : 'bg-white dark:bg-slate-800 border-purple-100 dark:border-purple-900/30 focus:border-purple-500 dark:focus:border-purple-500 text-purple-900 dark:text-purple-100 shadow-inner'
                "
                placeholder="0"
              />
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                >cm</span
              >
            </div>
          </div>

          <!-- Weight Input -->
          <div class="relative group">
            <div class="flex items-center justify-between mb-1.5">
              <label
                class="text-xs font-bold transition-colors"
                :class="
                  isPure
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-purple-700 dark:text-purple-400'
                "
              >
                <i
                  class="fas fa-weight-hanging mr-1"
                  :class="isPure ? 'text-green-500' : 'text-purple-500'"
                ></i>
                {{ isPure ? '体重' : '肉体质量' }}
              </label>
              <span class="text-[10px] text-slate-400">20 - 300 kg</span>
            </div>
            <div class="relative">
              <input
                type="number"
                v-model.number="editData.weight"
                class="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none transition-all border-2"
                :class="
                  isPure
                    ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-white'
                    : 'bg-white dark:bg-slate-800 border-purple-100 dark:border-purple-900/30 focus:border-purple-500 dark:focus:border-purple-500 text-purple-900 dark:text-purple-100 shadow-inner'
                "
                placeholder="0"
              />
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                >kg</span
              >
            </div>
          </div>

          <!-- Age Input -->
          <div class="relative group">
            <div class="flex items-center justify-between mb-1.5">
              <label
                class="text-xs font-bold transition-colors"
                :class="
                  isPure
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-purple-700 dark:text-purple-400'
                "
              >
                <i
                  class="fas fa-hourglass-half mr-1"
                  :class="isPure ? 'text-orange-500' : 'text-purple-500'"
                ></i>
                {{ isPure ? '年龄' : '骨龄' }}
              </label>
              <span class="text-[10px] text-slate-400">5 - 120 岁</span>
            </div>
            <div class="relative">
              <input
                type="number"
                v-model.number="editData.age"
                class="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none transition-all border-2"
                :class="
                  isPure
                    ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-white'
                    : 'bg-white dark:bg-slate-800 border-purple-100 dark:border-purple-900/30 focus:border-purple-500 dark:focus:border-purple-500 text-purple-900 dark:text-purple-100 shadow-inner'
                "
                placeholder="0"
              />
              <span
                class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400"
                >岁</span
              >
            </div>
          </div>
        </div>
      </div>
    </van-dialog>

    <!-- 战斗阶位详情弹窗 (仅在RPG模式下触发) -->
    <van-dialog
      v-model:show="showRankDetails"
      :show-confirm-button="false"
      close-on-click-overlay
      class="overflow-hidden bg-transparent w-11/12 max-w-sm"
    >
      <div
        class="bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors duration-300 overflow-hidden rounded-2xl flex flex-col max-h-[80vh]"
      >
        <div class="p-6 overflow-y-auto custom-scrollbar">
          <!-- 视图 1: 详情视图 -->
          <div v-if="rankViewMode === 'details'" class="animate-fade-in">
            <!-- Title Section -->
            <div class="text-center mb-6">
              <h3 class="text-2xl font-black tracking-wider uppercase" :class="heroStats.rankColor">
                {{ heroStats.rankTitle }}
              </h3>
              <div class="flex items-center justify-center gap-2 mt-1">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
                >
                  Combat Rank
                </span>
              </div>
            </div>

            <!-- Current Stats -->
            <div class="grid grid-cols-2 gap-3 mb-2">
              <div
                class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600 text-center"
              >
                <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Combat Power</div>
                <div class="text-xl font-black font-mono text-slate-700 dark:text-slate-200">
                  {{ heroStats.combatPower }}
                </div>
              </div>
              <div
                class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600 text-center"
              >
                <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">距离下一阶</div>
                <div class="text-xl font-black font-mono text-slate-400">
                  {{ rpgRankInfo.next ? rpgRankInfo.next - heroStats.combatPower : 'MAX' }}
                </div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mb-6">
              <div class="flex justify-between text-xs mb-1.5 font-bold">
                <span class="text-slate-500 dark:text-slate-400">晋升进度</span>
                <span class="text-yellow-600 dark:text-yellow-400"
                  >{{ nextRankProgress.toFixed(1) }}%</span
                >
              </div>
              <div
                class="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600 shadow-inner"
              >
                <div
                  class="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  :style="{ width: nextRankProgress + '%' }"
                ></div>
              </div>
            </div>

            <!-- Privileges / Description -->
            <div class="mb-6">
              <div
                class="flex items-center text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider"
              >
                <i class="fas mr-2 fa-crown text-yellow-500"></i> 阶位特权
              </div>
              <div
                class="rounded-xl p-4 relative overflow-hidden group border bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200"
              >
                <div
                  class="relative z-10 text-sm font-bold leading-relaxed text-yellow-800 dark:text-yellow-200"
                >
                  {{ rpgRankInfo.passive }}
                </div>
              </div>
            </div>

            <!-- 切换按钮 -->
            <button
              @click="rankViewMode = 'list'"
              class="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm shadow-sm active:scale-95 transition flex items-center justify-center gap-2 group"
            >
              <i
                class="fas fa-list-ol text-blue-500 group-hover:scale-110 transition-transform"
              ></i>
              查看完整阶位晋升表
              <i class="fas fa-chevron-right text-xs opacity-50"></i>
            </button>
          </div>

          <!-- 视图 2: 列表视图 -->
          <div v-else class="animate-fade-in">
            <div class="flex items-center mb-4 sticky top-0 bg-white dark:bg-slate-800 z-10 py-1">
              <button
                @click="rankViewMode = 'details'"
                class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition active:scale-90 mr-3"
              >
                <i class="fas fa-arrow-left"></i>
              </button>
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">阶位晋升一览</span>
            </div>

            <div class="space-y-2 relative">
              <div
                class="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"
              ></div>

              <div
                v-for="(rank, index) in rpgRanks"
                :key="index"
                class="relative pl-8 pr-3 py-2 rounded-lg border transition-all"
                :class="[
                  rank.title === heroStats.rankTitle
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-700/50 ring-1 ring-yellow-400/30'
                    : 'bg-slate-50 dark:bg-slate-700/30 border-transparent hover:border-slate-200 dark:hover:border-slate-600',
                ]"
              >
                <!-- Dot -->
                <div
                  class="absolute left-[11px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800"
                  :class="
                    rank.title === heroStats.rankTitle
                      ? 'bg-yellow-500 scale-125'
                      : heroStats.combatPower >= rank.minCp
                        ? 'bg-blue-400'
                        : 'bg-slate-300 dark:bg-slate-600'
                  "
                ></div>

                <div class="flex justify-between items-center mb-1">
                  <span class="text-xs font-bold" :class="rank.color">{{ rank.title }}</span>
                  <span class="text-[10px] font-mono text-slate-400">{{ rank.minCp }} CP</span>
                </div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400 flex items-start">
                  <i class="fas fa-star text-[8px] mt-0.5 mr-1 text-yellow-500 opacity-70"></i>
                  {{ rank.passive }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
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

@keyframes spin-slow {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 8s infinite ease-in-out;
}

.animate-float-up {
  animation: float-up 10s linear infinite;
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* Custom Scrollbar for rank list */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}
</style>
