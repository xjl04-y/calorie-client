<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
// 移除 storeToRefs，直接访问 store 更稳定
// import { storeToRefs } from 'pinia';
import AppHud from '@/components/AppHud.vue';
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
import ModalNpcGuide from '@/components/modals/ModalNpcGuide.vue';

const store = useGameStore();
// const { isDarkMode, temp, user } = storeToRefs(store); // 导致报错的源头

onMounted(() => {
  store.loadState();
  if (store.isDarkMode) document.documentElement.classList.add('dark');
});

const containerClass = computed(() => ({
  'screen-shaking': store.temp.isShaking, // 直接通过 store.temp 访问
  'mobile-frame': true,
  'bg-white': true,
  'dark:bg-slate-900': true,
  'transition-colors': true
}));

const openAddFood = (type: 'SNACK') => {
  store.temp.activeMealType = type;
  store.setModal('addFood', true);
}
</script>

<template>
  <!-- 直接使用 store.isDarkMode -->
  <van-config-provider :theme="store.isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <div :class="containerClass">
      <!-- UI 特效层 -->
      <div class="damage-overlay" :class="{'damage-active': store.temp.isDamaged}"></div>

      <!-- 顶部安全区 (留白) -->
      <div class="h-[var(--status-bar-height)] w-full safe-area-top bg-white dark:bg-slate-900"></div>

      <!-- 核心路由视图区域 -->
      <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#0b1120] relative" id="main-scroll-view">
        <router-view v-slot="{ Component, route }">
          <transition name="van-fade" mode="out-in">
            <keep-alive v-if="route.meta.keepAlive">
              <component :is="Component" :key="route.name" />
            </keep-alive>
            <component :is="Component" v-else :key="route.name" />
          </transition>
        </router-view>
      </div>

      <!-- 底部导航 (开启 route 模式) -->
      <van-tabbar v-if="store.user.isInitialized" route fixed placeholder safe-area-inset-bottom class="shadow-lg z-50 border-t dark:border-slate-800">
        <van-tabbar-item id="tour-tab-home" name="home" icon="fire-o" to="/">讨伐</van-tabbar-item>
        <van-tabbar-item id="tour-tab-analysis" name="analysis" icon="chart-trending-o" to="/analysis">战报</van-tabbar-item>
        <van-tabbar-item id="tour-tab-profile" name="profile" icon="user-o" to="/profile">英雄</van-tabbar-item>
      </van-tabbar>

      <!-- 全局模态框挂载点 -->
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

/* 全局动画定义 */
@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0.5); }
  100% { background-color: transparent; }
}
</style>
