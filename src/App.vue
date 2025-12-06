<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import AppHud from '@/components/AppHud.vue'; // 修复：引入 AppHud
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
import ModalNpcGuide from '@/components/modals/ModalNpcGuide.vue'; // 引入 NPC 组件

const store = useGameStore();
const { isDarkMode, temp, user } = storeToRefs(store);

onMounted(() => {
  store.loadState();
  if (isDarkMode.value) document.documentElement.classList.add('dark');
});

const containerClass = computed(() => ({
  'screen-shaking': temp.value.isShaking,
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
  <van-config-provider :theme="isDarkMode ? 'dark' : 'light'" theme-vars-scope="global">
    <div :class="containerClass">
      <!-- UI 特效层 -->
      <div class="damage-overlay" :class="{'damage-active': temp.isDamaged}"></div>

      <!-- 顶部安全区 (留白) -->
      <div class="h-[var(--status-bar-height)] w-full safe-area-top bg-white dark:bg-slate-900"></div>

      <!-- 核心路由视图区域 -->
      <div class="flex-1 overflow-y-auto no-scrollbar bg-slate-50 dark:bg-[#0b1120] relative" id="main-scroll-view">
        <router-view v-slot="{ Component, route }">
          <!-- 修复：合并 Transition，确保单根节点结构 -->
          <transition name="van-fade" mode="out-in">
            <keep-alive v-if="route.meta.keepAlive">
              <component :is="Component" :key="route.name" />
            </keep-alive>
            <component :is="Component" v-else :key="route.name" />
          </transition>
        </router-view>
      </div>

      <!-- 底部导航 (开启 route 模式) -->
      <van-tabbar v-if="user.isInitialized" route fixed placeholder safe-area-inset-bottom class="shadow-lg z-50 border-t dark:border-slate-800">
        <van-tabbar-item name="home" icon="fire-o" to="/">讨伐</van-tabbar-item>
        <van-tabbar-item name="analysis" icon="chart-trending-o" to="/analysis">战报</van-tabbar-item>
        <van-tabbar-item name="profile" icon="user-o" to="/profile">英雄</van-tabbar-item>
      </van-tabbar>

      <!-- FAB: 快速出刀 (仅在首页显示，通过 v-if 判断当前路由) -->
      <div v-if="$route.name === 'Home' && user.isInitialized" class="absolute bottom-[80px] right-6 z-40">
        <div @click="openAddFood('SNACK')" class="fab-button magic-glow">
          <van-icon name="plus" />
          <span class="text-[8px] font-bold mt-0.5">出刀</span>
        </div>
      </div>

      <!-- 全局模态框挂载点 (View 之外的图层) -->
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

.fab-button {
  @apply w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-full shadow-xl flex flex-col items-center justify-center text-2xl cursor-pointer border-2 border-white/30 transition-transform active:scale-90;
}

/* 全局动画定义 (如果 Tailwind 配置未覆盖) */
@keyframes flash-red {
  0% { background-color: rgba(239, 68, 68, 0.5); }
  100% { background-color: transparent; }
}
</style>
