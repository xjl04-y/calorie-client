<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, defineAsyncComponent } from 'vue'; // [新增] 引入 defineAsyncComponent
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import AppHud from '@/components/AppHud.vue';

// --- 全局模态框引入 (Modals) - 改为异步加载 ---
// [优化] 之前是同步引入，会导致首屏加载所有弹窗代码。
// 改为 defineAsyncComponent 后，只有组件显示时才会下载/执行代码，大幅提升 App 启动速度。

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

const store = useGameStore();
const systemStore = useSystemStore();

// [New V5.6] 悬浮球位置持久化 Key
const FAB_POS_KEY = 'health_rpg_fab_pos';

// --- 悬浮球 (FAB) 逻辑升级: Speed Dial ---
const fabPos = ref({ x: 0, y: 0 }); // 初始值先置0，在mounted中计算
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const isFabExpanded = ref(false);

// [指令5] 跨天时间同步优化 - 利用visibilitychange事件
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    // App从后台切回前台，强制检查日期是否一致
    const updated = store.logStore.checkDateConsistency();
    if (updated) {
      console.log('[午夜修复] 日期已更新，重新加载页面');
      // 可选：刷新页面或重新检查连胜
      if (store.user.isInitialized) {
        store.heroStore.checkLoginStreak();
      }
    }
  }
};

onMounted(() => {
  store.loadState();
  
  // [日期同步初始化死角修复] 确保所有store在启动时日期对齐
  // 虽然系统采用单一数据源(systemStore.currentDate),但为了防止跨时区/午夜边界问题,显式检查一次
  const realToday = new Date();
  const currentDateValue = systemStore.currentDate;
  const todayStr = realToday.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  if (currentDateValue !== todayStr) {
    console.log(`[App初始化] 日期修正: ${currentDateValue} -> ${todayStr}`);
    systemStore.currentDate = todayStr;
  }
  
  if (store.user.isInitialized) {
    store.heroStore.checkLoginStreak();
  }
  if (store.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // [指令5] 注册可见性监听器 - 不仅仅依赖setInterval，切回前台时强制检查
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // [Fix V6.1] 强化位置恢复逻辑，防止悬浮窗消失
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 默认位置：右下角
  const defaultPos = { x: w - 80, y: h - 200 };

  try {
    const savedPosStr = localStorage.getItem(FAB_POS_KEY);
    if (savedPosStr) {
      const pos = JSON.parse(savedPosStr);
      // 边界检查：确保在屏幕可视范围内 (允许少量溢出以便贴边)
      if (
        pos &&
        typeof pos.x === 'number' && !isNaN(pos.x) &&
        typeof pos.y === 'number' && !isNaN(pos.y) &&
        pos.x > -20 && pos.x < w + 20 &&
        pos.y > 50 && pos.y < h + 50
      ) {
        fabPos.value = pos;
      } else {
        console.warn('FAB position out of bounds, resetting.');
        fabPos.value = defaultPos;
      }
    } else {
      fabPos.value = defaultPos;
    }
  } catch (e) {
    console.error('FAB load error', e);
    fabPos.value = defaultPos;
  }
});

// [技术工单03] 清理监听器
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

</script>

<template>
  <van-config-provider :theme="store.isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <div :class="containerClass">

      <div class="damage-overlay" :class="{'damage-active': store.temp.isDamaged}"></div>
      <div class="heal-overlay" :class="{'heal-active': store.temp.isHealing}"></div>
      <div class="crit-overlay" :class="{'crit-active': store.temp.isCrit}"></div>

      <!-- 顶部安全区域占位：保持原有逻辑 -->
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

      <van-tabbar v-if="store.user.isInitialized" route fixed placeholder safe-area-inset-bottom class="shadow-lg z-40 border-t dark:border-slate-800">
        <van-tabbar-item id="tour-tab-home" name="home" :icon="isPure ? 'orders-o' : 'fire-o'" to="/">
          {{ isPure ? '饮食' : '讨伐' }}
        </van-tabbar-item>
        <van-tabbar-item id="tour-tab-analysis" name="analysis" :icon="isPure ? 'bar-chart-o' : 'chart-trending-o'" to="/analysis">
          {{ isPure ? '统计' : '战报' }}
        </van-tabbar-item>
        <van-tabbar-item id="tour-tab-profile" name="profile" :icon="isPure ? 'manager-o' : 'user-o'" to="/profile">
          {{ isPure ? '我的' : '英雄' }}
        </van-tabbar-item>
      </van-tabbar>

      <div v-if="store.user.isInitialized"
           class="fixed z-40 pointer-events-none"
           :style="{
             left: (fabPos.x + 8) + 'px',
             top: fabPos.y + 'px',
             transition: isDragging ? 'left 0.1s ease-out, top 0.1s ease-out' : 'left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
           }">
        <div @click="!isDragging && openHydration()"
             class="w-10 h-10 rounded-full bg-blue-500 text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform pointer-events-auto active:scale-90"
             :style="{
               transform: `translateY(${ isTopSide ? (isFabExpanded ? 160 : 70) : (isFabExpanded ? -150 : -65) }px)`,
               transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
             }">
          <i class="fas fa-tint text-sm"></i>
        </div>
      </div>

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
        <div @click="openExercise" class="w-14 h-14 rounded-full bg-green-500 text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 relative hover:brightness-110 active:scale-90 transition-all">
          <i class="fas fa-running text-xl"></i>
          <span class="text-[10px] font-bold absolute top-1/2 -translate-y-1/2 bg-slate-800 text-white px-2 py-1 rounded-lg opacity-90 whitespace-nowrap shadow-md"
                :class="isLeftSide ? 'left-full ml-3' : 'right-full mr-3'">
            {{ isPure ? '运动打卡' : '战备训练' }}
          </span>
        </div>
      </div>

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
        <div @click="openSupply" class="w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 relative hover:brightness-110 active:scale-90 transition-all">
          <i class="fas fa-utensils text-xl"></i>
          <span class="text-[10px] font-bold absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-0.5 rounded opacity-90 whitespace-nowrap shadow-md"
                :class="isTopSide ? 'top-full mt-3' : 'bottom-full mb-3'">
            {{ isPure ? '添加饮食' : '物资补给' }}
          </span>
        </div>
      </div>

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
             :class="isFabExpanded
               ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-500 rotate-45 scale-90'
               : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-700 dark:border-slate-200 hover:scale-105'">
          <div class="text-3xl mb-[-2px] leading-none transition-transform duration-300">+</div>
        </div>
      </div>

      <div v-if="isFabExpanded" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500" @click="isFabExpanded = false"></div>

      <!-- 全局模态框组件 - 这里的组件现在都是异步加载的 -->
      <ModalOnboarding />
      <ModalAddFood />
      <ModalAddExercise />
      <ModalQuantity />
      <!-- [工单02] 纯净模式下RPG弹窗隔离 -->
      <ModalLevelUp v-if="!isPure" />
      <ModalAchievements />
      <ModalUnlock v-if="!isPure" />
      <ModalItemDetail />
      <ModalEquipmentSwap v-if="!isPure" />
      <ModalHistoryDetail />
      <ModalLogDetail />
      <ModalHpHistory v-if="!isPure" />
      <ModalQuestBoard v-if="!isPure" />
      <ModalSkillTree v-if="!isPure" />
      <ModalNpcGuide v-if="!isPure" />
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
