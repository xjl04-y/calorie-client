<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import AppHud from '@/components/AppHud.vue';

// --- 全局模态框引入 (Modals) ---
import ModalOnboarding from '@/components/modals/ModalOnboarding.vue';
import ModalAddFood from '@/components/modals/ModalAddFood.vue';
import ModalQuantity from '@/components/modals/ModalQuantity.vue';
import ModalLevelUp from '@/components/modals/ModalLevelUp.vue';
import ModalAchievements from '@/components/modals/ModalAchievements.vue';
import ModalUnlock from '@/components/modals/ModalUnlock.vue';
import ModalItemDetail from '@/components/modals/ModalItemDetail.vue';
import ModalEquipmentSwap from '@/components/modals/ModalEquipmentSwap.vue';
import ModalHistoryDetail from '@/components/modals/ModalHistoryDetail.vue';
import ModalLogDetail from '@/components/modals/ModalLogDetail.vue';
import ModalHpHistory from '@/components/modals/ModalHpHistory.vue';
import ModalQuestBoard from '@/components/modals/ModalQuestBoard.vue';
import ModalSkillTree from '@/components/modals/ModalSkillTree.vue';
import ModalNpcGuide from '@/components/modals/ModalNpcGuide.vue';
import ModalSettings from '@/components/modals/ModalSettings.vue';
// [New Features]
import ModalShop from '@/components/modals/ModalShop.vue';
import ModalRebirth from '@/components/modals/ModalRebirth.vue';
import ModalHydration from '@/components/modals/ModalHydration.vue';
// [New V4.2]
import ModalDailyReport from '@/components/modals/ModalDailyReport.vue';
// [New V4.7]
import ModalManualAdd from '@/components/modals/ModalManualAdd.vue';

const store = useGameStore();
const systemStore = useSystemStore();

onMounted(() => {
  store.loadState();
  // 检查并初始化连续登录天数
  if (store.user.isInitialized) {
    store.heroStore.checkLoginStreak();
  }
  // 初始化暗黑模式
  if (store.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
});

// 容器动态样式
const containerClass = computed(() => ({
  'screen-shaking': store.temp.isShaking,
  'mobile-frame': true,
  'bg-white': true,
  'dark:bg-slate-900': true,
  'transition-colors': true
}));

const isPure = computed(() => systemStore.isPureMode);

// --- 悬浮球 (FAB) 拖拽逻辑 ---
const fabPos = ref({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const onFabTouchStart = (e: TouchEvent | MouseEvent) => {
  const clientX = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientX ?? (e as unknown as MouseEvent).clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientY ?? (e as unknown as MouseEvent).clientY : (e as MouseEvent).clientY;

  dragOffset.value = { x: clientX - fabPos.value.x, y: clientY - fabPos.value.y };
  isDragging.value = true;
};

const onFabTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault(); // 防止页面滚动

  const clientX = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientX ?? (e as unknown as MouseEvent).clientX : (e as MouseEvent).clientX;
  const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches?.[0]?.clientY ?? (e as unknown as MouseEvent).clientY : (e as MouseEvent).clientY;

  let newX = clientX - dragOffset.value.x;
  let newY = clientY - dragOffset.value.y;

  // 边界限制
  const maxX = window.innerWidth - 60;
  const maxY = window.innerHeight - 80;
  if (newX < 10) newX = 10;
  if (newX > maxX) newX = maxX;
  if (newY < 50) newY = 50; // 避开顶部状态栏
  if (newY > maxY) newY = maxY; // 避开底部 Tabbar

  fabPos.value = { x: newX, y: newY };
};

const onFabTouchEnd = () => {
  isDragging.value = false;
  // 自动吸附到左右边缘
  const screenW = window.innerWidth;
  if (fabPos.value.x + 30 < screenW / 2) {
    fabPos.value.x = 10;
  } else {
    fabPos.value.x = screenW - 70;
  }
};

// 打开添加食物/补给面板
const openSupply = () => {
  if (store.temp.isBuilding) return;
  store.temp.activeMealType = 'SNACK';
  store.setModal('addFood', true);
};

// 打开喝水面板
const openHydration = () => {
  systemStore.setModal('hydration', true);
};
</script>

<template>
  <van-config-provider :theme="store.isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <div :class="containerClass">

      <!-- 受伤/震动特效层 (红色) -->
      <div class="damage-overlay" :class="{'damage-active': store.temp.isDamaged}"></div>

      <!-- [New V4.3] 净化/治疗特效层 (蓝色柔光) -->
      <div class="heal-overlay" :class="{'heal-active': store.temp.isHealing}"></div>

      <!-- [New V4.3] 暴击特效层 (金色闪光) -->
      <div class="crit-overlay" :class="{'crit-active': store.temp.isCrit}"></div>

      <!-- 顶部安全区占位 -->
      <div class="h-[var(--status-bar-height)] w-full safe-area-top bg-white dark:bg-slate-900 transition-colors"></div>

      <!-- 主内容滚动区 -->
      <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#0b1120] relative" id="main-scroll-view">
        <router-view v-slot="{ Component, route }">
          <transition name="van-fade">
            <keep-alive :include="['Home', 'Profile']">
              <component :is="Component" :key="route.name" />
            </keep-alive>
          </transition>
        </router-view>
      </div>

      <!-- 底部导航栏 -->
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

      <!-- [New] 快速喝水悬浮球 (位于主FAB上方) -->
      <div v-if="store.user.isInitialized"
           class="fixed z-40 transition-transform active:scale-90"
           :style="{ left: (fabPos.x + 8) + 'px', top: (fabPos.y - 60) + 'px', transition: isDragging ? 'none' : 'left 0.3s ease' }">
        <div @click="!isDragging && openHydration()"
             class="w-10 h-10 rounded-full bg-blue-500 text-white shadow-lg flex flex-col items-center justify-center border-2 border-white dark:border-slate-700 cursor-pointer">
          <i class="fas fa-tint text-sm"></i>
        </div>
      </div>

      <!-- 主悬浮球 (添加记录) -->
      <div v-if="store.user.isInitialized"
           id="guide-global-supply"
           class="fixed z-50 transition-transform active:scale-90 cursor-pointer"
           :style="{ left: fabPos.x + 'px', top: fabPos.y + 'px', transition: isDragging ? 'none' : 'left 0.3s ease' }"
           @mousedown="onFabTouchStart" @touchstart="onFabTouchStart"
           @mousemove="onFabTouchMove" @touchmove="onFabTouchMove"
           @mouseup="onFabTouchEnd" @touchend="onFabTouchEnd"
           @click="!isDragging && openSupply()">

        <div class="w-14 h-14 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center border-2 border-slate-600 dark:border-slate-200">
          <div class="text-2xl mb-[-2px]">+</div>
          <div class="text-[9px] font-black uppercase tracking-wider">{{ isPure ? 'Add' : 'Supply' }}</div>
        </div>
      </div>

      <!-- 全局模态框组件 -->
      <ModalOnboarding />
      <ModalAddFood />
      <ModalQuantity />
      <ModalLevelUp />
      <ModalAchievements />
      <ModalUnlock />
      <ModalItemDetail />
      <ModalEquipmentSwap />
      <ModalHistoryDetail />
      <ModalLogDetail />
      <ModalHpHistory />
      <ModalQuestBoard />
      <ModalSkillTree />
      <ModalNpcGuide />
      <ModalSettings />
      <!-- New Features -->
      <ModalShop />
      <ModalRebirth />
      <ModalHydration />
      <!-- V4.2 Feature -->
      <ModalDailyReport />
      <!-- V4.7 Feature -->
      <ModalManualAdd />

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

/* 基础 Overlay 样式 */
.damage-overlay, .heal-overlay, .crit-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: transparent;
  transition: background-color 0.1s;
}

/* 受伤：红色闪烁 */
.damage-active {
  animation: flash-red 0.5s ease-out;
}
@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0.5); }
  100% { background-color: transparent; }
}

/* [New V4.3] 治疗：蓝色柔光 */
.heal-active {
  animation: flash-blue 0.8s ease-out;
}
@keyframes flash-blue {
  0% { background-color: rgba(59, 130, 246, 0.0); }
  20% { background-color: rgba(59, 130, 246, 0.4); } /* 柔和的蓝光 */
  100% { background-color: transparent; }
}

/* [New V4.3] 暴击：金色闪光 (更强烈) */
.crit-active {
  animation: flash-gold 0.3s ease-out;
}
@keyframes flash-gold {
  0% { background-color: rgba(255, 255, 255, 0.8); } /* 瞬间白屏 */
  50% { background-color: rgba(250, 204, 21, 0.4); } /* 转为金光 */
  100% { background-color: transparent; }
}
</style>
