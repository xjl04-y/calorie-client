<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore'; // [Fix] 引入 SystemStore
import AppHud from '@/components/AppHud.vue';
// Modals
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

const store = useGameStore();
const systemStore = useSystemStore(); // [Fix] 获取实例

onMounted(() => {
  store.loadState();
  if (store.user.isInitialized) {
    store.heroStore.checkLoginStreak();
  }
  if (store.isDarkMode) document.documentElement.classList.add('dark');
});

const containerClass = computed(() => ({
  'screen-shaking': store.temp.isShaking,
  'mobile-frame': true,
  'bg-white': true,
  'dark:bg-slate-900': true,
  'transition-colors': true
}));

const isPure = computed(() => systemStore.isPureMode);

// --- 全局悬浮球拖拽逻辑 ---
const fabPos = ref({ x: window.innerWidth - 80, y: window.innerHeight - 150 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const onFabTouchStart = (e: TouchEvent | MouseEvent) => {
  isDragging.value = true;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  dragOffset.value = { x: clientX - fabPos.value.x, y: clientY - fabPos.value.y };
};

const onFabTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault(); // 防止滚动
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  let newX = clientX - dragOffset.value.x;
  let newY = clientY - dragOffset.value.y;

  // 边界限制
  const maxX = window.innerWidth - 60;
  const maxY = window.innerHeight - 80;
  if (newX < 10) newX = 10;
  if (newX > maxX) newX = maxX;
  if (newY < 50) newY = 50;
  if (newY > maxY) newY = maxY;

  fabPos.value = { x: newX, y: newY };
};

const onFabTouchEnd = () => {
  isDragging.value = false;
  // 简单的磁吸效果 (吸附到左右边缘)
  const screenW = window.innerWidth;
  if (fabPos.value.x + 30 < screenW / 2) {
    fabPos.value.x = 10;
  } else {
    fabPos.value.x = screenW - 70;
  }
};

const openSupply = () => {
  if (store.temp.isBuilding) return; // 正在烹饪时不干扰
  store.temp.activeMealType = 'SNACK';
  store.setModal('addFood', true);
};
</script>

<template>
  <van-config-provider :theme="store.isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <div :class="containerClass">
      <div class="damage-overlay" :class="{'damage-active': store.temp.isDamaged}"></div>
      <div class="h-[var(--status-bar-height)] w-full safe-area-top bg-white dark:bg-slate-900"></div>

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
        <!-- [Fix] 纯净模式文案适配 -->
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

      <!-- 全局悬浮补给按钮 -->
      <div v-if="store.user.isInitialized"
           id="guide-global-supply"
           class="fixed z-50 transition-transform active:scale-90"
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

      <!-- 全局模态框 -->
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
      <ModalSettings />
      <ModalNpcGuide />
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
.damage-overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 9999;
  background: transparent;
}
.damage-active { animation: flash-red 0.5s ease-out; }

@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0.5); }
  100% { background-color: transparent; }
}
</style>
