<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, defineAsyncComponent } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useBattleStore } from '@/stores/useBattleStore';
// import AppHud from '@/components/AppHud.vue';
import SplashScreen from '@/components/SplashScreen.vue';

// --- 全局模态框引入 (Modals) ---
const ModalOnboarding = defineAsyncComponent(() => import('@/components/modals/ModalOnboarding.vue'));
const ModalAddFood = defineAsyncComponent(() => import('@/components/modals/ModalAddFood.vue'));
const ModalAddExercise = defineAsyncComponent(() => import('@/components/modals/ModalAddExercise.vue'));
const ModalQuantity = defineAsyncComponent(() => import('@/components/modals/ModalQuantity.vue'));
const ModalLevelUp = defineAsyncComponent(() => import('@/components/modals/ModalLevelUp.vue'));
const ModalAchievements = defineAsyncComponent(() => import('@/components/modals/ModalAchievements.vue'));
const ModalUnlock = defineAsyncComponent(() => import('@/components/modals/ModalUnlock.vue'));
const ModalItemDetail = defineAsyncComponent(() => import('@/components/modals/ModalItemDetail.vue'));
const ModalEquipmentSwap = defineAsyncComponent(() => import('@/components/modals/ModalEquipmentSwap.vue'));
const ModalHistoryDetail = defineAsyncComponent(() => import('@/components/modals/ModalHistoryDetail.vue'));
const ModalLogDetail = defineAsyncComponent(() => import('@/components/modals/ModalLogDetail.vue'));
const ModalHpHistory = defineAsyncComponent(() => import('@/components/modals/ModalHpHistory.vue'));
const ModalQuestBoard = defineAsyncComponent(() => import('@/components/modals/ModalQuestBoard.vue'));
const ModalSkillTree = defineAsyncComponent(() => import('@/components/modals/ModalSkillTree.vue'));
const ModalNpcGuide = defineAsyncComponent(() => import('@/components/modals/ModalNpcGuide.vue'));
const ModalSettings = defineAsyncComponent(() => import('@/components/modals/ModalSettings.vue'));
const ModalShop = defineAsyncComponent(() => import('@/components/modals/ModalShop.vue'));
const ModalRebirth = defineAsyncComponent(() => import('@/components/modals/ModalRebirth.vue'));
const ModalHydration = defineAsyncComponent(() => import('@/components/modals/ModalHydration.vue'));
const ModalDailyReport = defineAsyncComponent(() => import('@/components/modals/ModalDailyReport.vue'));
const ModalManualAdd = defineAsyncComponent(() => import('@/components/modals/ModalManualAdd.vue'));
const ModalFasting = defineAsyncComponent(() => import('@/components/modals/ModalFasting.vue'));
const ModalTargetConfig = defineAsyncComponent(() => import('@/components/modals/ModalTargetConfig.vue'));
const ModalExerciseLogDetail = defineAsyncComponent(() => import('@/components/modals/ModalExerciseLogDetail.vue'));
const ModalHydrationLogDetail = defineAsyncComponent(() => import('@/components/modals/ModalHydrationLogDetail.vue'));
const ModalBodyTrendDetail = defineAsyncComponent(() => import('@/components/modals/ModalBodyTrendDetail.vue'));
const ModalTransactionHistory = defineAsyncComponent(() => import('@/components/modals/ModalTransactionHistory.vue'));
const ModalInventory = defineAsyncComponent(() => import('@/components/modals/ModalInventory.vue'));

const store = useGameStore();
const systemStore = useSystemStore();
const battleStore = useBattleStore();

// [开屏动画] 控制开屏动画显示
const showSplash = ref(false);

const FAB_POS_KEY = 'health_rpg_fab_pos';

const fabPos = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const isFabExpanded = ref(false);

// [辅助函数] 检查两个日期是否是同一天
const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

// [核心修复] 安全执行每日检查 (签到 + 连击)
// 只有在确定今天还没签到的情况下才调用 Store 方法
const safeCheckDailyStreak = () => {
  if (!store.user.isInitialized) return;

  const now = new Date();
  const lastLogin = new Date(store.user.lastLoginDate || 0);

  // 1. 如果上次登录时间就是今天，说明已经处理过，直接跳过
  // 这能解决“刷新页面导致连击数暴涨”的问题
  if (isSameDay(now, lastLogin)) {
    console.log('[App] 今日已签到，跳过重复检查');
    return;
  }

  // 2. 只有日期不同，才执行签到逻辑
  console.log('[App] 检测到新的一天，执行签到检查...');
  store.heroStore.checkLoginStreak();
};

// [指令5] 跨天时间同步优化 - 利用visibilitychange事件
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // App从后台切回前台，强制检查日期是否一致
    const updated = store.logStore.checkDateConsistency();
    if (updated) {
      console.log('[午夜修复] 日期已更新，执行跨天逻辑');
      // 日期确实变了，才尝试签到
      safeCheckDailyStreak();
    } else {
      // 日期没变，但可能需要刷新一下连击显示（不做数值修改）
      if (battleStore.validateCombo) {
        battleStore.validateCombo();
      }
    }
  }
};

onMounted(() => {
  if (systemStore.enableSplashAnimation) {
    showSplash.value = true;
  }

  store.loadState();

  // [新增] 从数据库加载日志
  console.log('[App] 开始从数据库加载日志...');
  store.logStore.loadLogsFromDb().then(() => {
    console.log('[App] 数据库日志加载完成');
  }).catch(err => {
    console.error('[App] 加载数据库日志失败:', err);
  });

  // 日期修正逻辑
  const realToday = new Date();
  const currentDateValue = systemStore.currentDate;
  const todayStr = realToday.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  if (currentDateValue !== todayStr) {
    console.log(`[App初始化] 日期修正: ${currentDateValue} -> ${todayStr}`);
    systemStore.currentDate = todayStr;
  }

  // [Bug修复] 延迟执行所有状态检查
  // 1. 防止 store 数据未完全水合
  // 2. 确保在日期修正逻辑之后执行
  // 3. 合并签到与连击检查
  setTimeout(() => {
    // 签到检查 (防御性调用)
    safeCheckDailyStreak();

    // 连击检查 (Battle Combo)
    if (battleStore.validateCombo) {
      battleStore.validateCombo();
    }
  }, 500);

  if (store.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const defaultPos = { x: w - 80, y: h - 200 };

  try {
    const savedPosStr = localStorage.getItem(FAB_POS_KEY);
    if (savedPosStr) {
      const pos = JSON.parse(savedPosStr);
      if (
        pos &&
        typeof pos.x === 'number' && !isNaN(pos.x) &&
        typeof pos.y === 'number' && !isNaN(pos.y) &&
        pos.x > -20 && pos.x < w + 20 &&
        pos.y > 50 && pos.y < h + 50
      ) {
        fabPos.value = pos;
      } else {
        fabPos.value = defaultPos;
      }
    } else {
      fabPos.value = defaultPos;
    }
  } catch  {
    fabPos.value = defaultPos;
  }
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

const containerClass = computed(() => ({
  'screen-shaking': store.temp.isShaking,
  'mobile-frame': true,
  'bg-white': true,
  'dark:bg-slate-900': true,
  'transition-colors': true
}));

const isPure = computed(() => systemStore.isPureMode);

const isLeftSide = computed(() => {
  if (typeof window === 'undefined') return false;
  return fabPos.value.x < window.innerWidth / 2;
});

const isTopSide = computed(() => {
  if (typeof window === 'undefined') return false;
  return fabPos.value.y < window.innerHeight * 0.5;
});

const onFabTouchStart = (e: TouchEvent | MouseEvent) => {
  const clientX = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientX ?? (e as unknown as MouseEvent).clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientY ?? (e as unknown as MouseEvent).clientY : (e as MouseEvent).clientY;

  dragOffset.value = { x: clientX - fabPos.value.x, y: clientY - fabPos.value.y };
  isDragging.value = true;
};

const onFabTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
  isFabExpanded.value = false;

  const clientX = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientX ?? (e as unknown as MouseEvent).clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientY ?? (e as unknown as MouseEvent).clientY : (e as MouseEvent).clientY;

  let newX = clientX - dragOffset.value.x;
  let newY = clientY - dragOffset.value.y;

  const maxX = window.innerWidth - 60;
  const maxY = window.innerHeight - 60;
  if (newX < 10) newX = 10;
  if (newX > maxX) newX = maxX;
  if (newY < 40) newY = 40;
  if (newY > maxY) newY = maxY;

  fabPos.value = { x: newX, y: newY };
};

const onFabTouchEnd = () => {
  isDragging.value = false;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  let finalX = 20;
  if (fabPos.value.x + 30 >= screenW / 2) {
    finalX = screenW - 76;
  }

  let finalY = fabPos.value.y;
  const safeTop = 120;
  const safeBottom = screenH - 180;

  if (finalY < safeTop) finalY = safeTop;
  if (finalY > safeBottom) finalY = safeBottom;

  fabPos.value = { x: finalX, y: finalY };
  localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPos.value));
};

const toggleFab = () => {
  if (isDragging.value) return;
  isFabExpanded.value = !isFabExpanded.value;
};

const openSupply = () => {
  isFabExpanded.value = false;
  store.temp.activeMealType = 'SNACK';
  store.setModal('addFood', true);
};

const openExercise = () => {
  isFabExpanded.value = false;
  store.setModal('addExercise', true);
};

const openHydration = () => {
  systemStore.setModal('hydration', true);
};

const handleSplashComplete = () => {
  showSplash.value = false;
};

</script>

<template>
  <van-config-provider :theme="store.isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <SplashScreen v-if="showSplash" @animation-complete="handleSplashComplete" />

    <div :class="containerClass">

      <div class="damage-overlay" :class="{'damage-active': store.temp.isDamaged}"></div>
      <div class="heal-overlay" :class="{'heal-active': store.temp.isHealing}"></div>
      <div class="crit-overlay" :class="{'crit-active': store.temp.isCrit}"></div>

      <div class="h-[var(--status-bar-height)] w-full safe-area-top bg-white dark:bg-slate-900 transition-colors"></div>

      <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#0b1120] relative" id="main-scroll-view">
        <router-view v-slot="{ Component, route }">
          <transition name="van-fade">
            <keep-alive :include="['Home', 'Profile']">
              <component :is="Component" :key="route.name" />
            </keep-alive>
          </transition>
        </router-view>
      </div>

      <!-- Tabbar: 根据 Pure/RPG 模式调整高亮颜色 -->
      <van-tabbar
        v-if="store.user.isInitialized"
        route fixed placeholder safe-area-inset-bottom
        class="shadow-lg z-40 border-t dark:border-slate-800"
        :active-color="isPure ? '#0d9488' : '#2563eb'">
        <van-tabbar-item id="tour-tab-home" name="home" :icon="isPure ? 'orders-o' : 'fire-o'" to="/">
          <span>{{ isPure ? '饮食' : '讨伐' }}</span>
        </van-tabbar-item>
        <van-tabbar-item id="tour-tab-analysis" name="analysis" :icon="isPure ? 'bar-chart-o' : 'chart-trending-o'" to="/analysis">
          <span>{{ isPure ? '统计' : '战报' }}</span>
        </van-tabbar-item>
        <van-tabbar-item id="tour-tab-profile" name="profile" :icon="isPure ? 'manager-o' : 'user-o'" to="/profile">
          <span>{{ isPure ? '我的' : '英雄' }}</span>
        </van-tabbar-item>
      </van-tabbar>

      <!-- 1. 补水按钮 (Hydration) -->
      <!-- Pure: Sky-500 | RPG: Blue-600 | 拒绝紫色 -->
      <div v-if="store.user.isInitialized"
           class="fixed z-40 pointer-events-none"
           :style="{
             left: (fabPos.x + 8) + 'px',
             top: fabPos.y + 'px',
             transition: isDragging ? 'left 0.1s ease-out, top 0.1s ease-out' : 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
           }">
        <div @click="!isDragging && openHydration()"
             class="w-10 h-10 rounded-full text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform pointer-events-auto active:scale-90"
             :class="isPure ? 'bg-sky-500' : 'bg-blue-600'"
             :style="{
               transform: `translateY(${ isTopSide ? (isFabExpanded ? 160 : 70) : (isFabExpanded ? -150 : -65) }px)`,
               transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
             }">
          <i class="fas fa-tint text-sm"></i>
        </div>
      </div>

      <!-- 2. 运动按钮 (Exercise) -->
      <!-- Pure: Emerald-500 | RPG: Teal-600 -->
      <div v-if="store.user.isInitialized"
           class="fixed z-50 flex items-center justify-center cursor-pointer"
           :class="[
             isFabExpanded
               ? 'opacity-100 scale-100 translate-y-0'
               : ('opacity-0 scale-50 pointer-events-none ' + (isTopSide ? '-translate-y-10' : 'translate-y-10'))
           ]"
           :style="{
             left: (fabPos.x) + 'px',
             top: (fabPos.y + (isTopSide ? 80 : -80)) + 'px',
             transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s'
           }">
        <div @click="openExercise"
             class="w-14 h-14 rounded-full text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 relative hover:brightness-110 active:scale-90 transition-all"
             :class="isPure ? 'bg-emerald-500' : 'bg-teal-600'">
          <i class="fas fa-running text-xl"></i>
          <span class="text-[10px] font-bold absolute top-1/2 -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded-lg opacity-90 whitespace-nowrap shadow-md"
                :class="isLeftSide ? 'left-full ml-3' : 'right-full mr-3'">
            {{ isPure ? '运动打卡' : '战备训练' }}
          </span>
        </div>
      </div>

      <!-- 3. 饮食按钮 (Supply) -->
      <!-- Pure: Amber-500 | RPG: Orange-600 -->
      <div v-if="store.user.isInitialized"
           class="fixed z-50 flex items-center justify-center cursor-pointer"
           :class="[
             isFabExpanded
               ? 'opacity-100 scale-100 translate-x-0'
               : ('opacity-0 scale-50 pointer-events-none ' + (isLeftSide ? '-translate-x-10' : 'translate-x-10'))
           ]"
           :style="{
             left: (fabPos.x + (isLeftSide ? 80 : -80)) + 'px',
             top: (fabPos.y) + 'px',
             transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s'
           }">
        <div @click="openSupply"
             class="w-14 h-14 rounded-full text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 relative hover:brightness-110 active:scale-90 transition-all"
             :class="isPure ? 'bg-amber-500' : 'bg-orange-600'">
          <i class="fas fa-utensils text-xl"></i>
          <span class="text-[10px] font-bold absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-90 whitespace-nowrap shadow-md"
                :class="isTopSide ? 'top-full mt-3' : 'bottom-full mb-3'">
            {{ isPure ? '添加饮食' : '物资补给' }}
          </span>
        </div>
      </div>

      <!-- 4. 主开关按钮 (Main Toggle) -->
      <!-- 根据 深色/浅色 模式反转黑白，确保对比度 -->
      <div v-if="store.user.isInitialized"
           id="guide-global-supply"
           class="fixed z-[60] transition-transform active:scale-90 cursor-pointer"
           :style="{
             left: fabPos.x + 'px',
             top: fabPos.y + 'px',
             transition: isDragging ? 'none' : 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
           }"
           @mousedown="onFabTouchStart" @touchstart="onFabTouchStart"
           @mousemove="onFabTouchMove" @touchmove="onFabTouchMove"
           @mouseup="onFabTouchEnd" @touchend="onFabTouchEnd"
           @click="toggleFab">

        <div class="w-14 h-14 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center border-2 transition-all duration-300"
             :class="[
               isFabExpanded
                 /* 展开状态: 灰色背景，适应深浅模式 */
                 ? (isPure ? 'bg-stone-200 dark:bg-slate-700 text-stone-500 border-stone-300 dark:border-slate-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-500') + ' rotate-45 scale-90'
                 /* 收起状态: 黑白反转，高对比度 */
                 : (isPure ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-white border-stone-200 dark:border-stone-700' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-700 dark:border-slate-300') + ' hover:scale-105'
             ]">
          <div class="text-3xl mb-[-2px] leading-none transition-transform duration-300">+</div>
        </div>
      </div>

      <div v-if="isFabExpanded" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500" @click="isFabExpanded = false"></div>

      <ModalOnboarding />
      <ModalAddFood />
      <ModalAddExercise />
      <ModalQuantity />
      <ModalLevelUp v-if="!isPure" />
      <ModalAchievements v-if="!isPure" />
      <ModalUnlock v-if="!isPure" />
      <ModalItemDetail v-if="!isPure" />
      <ModalEquipmentSwap v-if="!isPure" />
      <ModalHistoryDetail />
      <ModalLogDetail />
      <ModalHpHistory v-if="!isPure" />
      <ModalQuestBoard v-if="!isPure" />
      <ModalSkillTree v-if="!isPure" />
      <ModalNpcGuide />
      <ModalSettings />
      <ModalShop v-if="!isPure" />
      <ModalRebirth v-if="!isPure" />
      <ModalHydration />
      <ModalDailyReport v-if="!isPure" />
      <ModalManualAdd />
      <ModalFasting />
      <ModalTargetConfig />
      <ModalExerciseLogDetail />
      <ModalHydrationLogDetail />
      <ModalBodyTrendDetail />
      <ModalTransactionHistory v-if="!isPure" />
      <ModalInventory v-if="!isPure" />

    </div>
  </van-config-provider>
</template>

<style scoped>
.mobile-frame {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.damage-overlay, .heal-overlay, .crit-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: transparent;
  transition: background-color 0.1s;
}

.damage-active { animation: flash-red 0.5s ease-out; }
@keyframes flash-red { 0% { background-color: rgba(239, 68, 68, 0.5); } 100% { background-color: transparent; } }

.heal-active { animation: flash-blue 0.8s ease-out; }
@keyframes flash-blue { 0% { background-color: rgba(59, 130, 246, 0.0); } 20% { background-color: rgba(59, 130, 246, 0.4); } 100% { background-color: transparent; } }

.crit-active { animation: flash-gold 0.3s ease-out; }
@keyframes flash-gold { 0% { background-color: rgba(255, 255, 255, 0.8); } 50% { background-color: rgba(250, 204, 21, 0.4); } 100% { background-color: transparent; } }
</style>
