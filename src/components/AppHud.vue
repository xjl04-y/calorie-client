<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter.ts';

const store = useGameStore();
// 访问 store 中的 state 和 getters
const user = computed(() => store.user);
const heroStats = computed(() => store.heroStats);

// 切换深色模式 Action
const toggleTheme = () => {
  store.isDarkMode = !store.isDarkMode;
  if (store.isDarkMode) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  store.saveState();
};
</script>

<template>
  <div class="px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-50 shadow-sm border-b dark:border-slate-800 flex justify-between safe-area-top">
    <!-- 用户头像区 -->
    <div class="flex items-center gap-3" @click="store.setModal('achievements', true)">
      <div class="relative">
        <div class="w-10 h-10 rounded-full border-2 border-purple-500 p-0.5 bg-purple-50">
          <img :src="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.avatarSeed" class="w-full h-full rounded-full" />
        </div>
        <div class="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 rounded-full border border-white">
          Lv.{{ user.level }}
        </div>
      </div>

      <!-- HP 条 -->
      <div>
        <div class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ user.nickname }}</div>
        <div class="hero-hp-container w-28 h-4 cursor-pointer" @click.stop="store.setModal('hpHistory', true)">
          <div class="hero-hp-text z-10">{{ Math.floor(user.heroCurrentHp) }}/{{ heroStats.maxHp }}</div>
          <div class="hero-hp-fill" :style="{ width: (user.heroCurrentHp / heroStats.maxHp * 100) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 按钮区 -->
    <div class="flex gap-3">
      <button @click="toggleTheme" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <i :class="store.isDarkMode ? 'fas fa-sun' : 'fas fa-moon'" class="text-slate-600 dark:text-yellow-400"></i>
      </button>
      <!-- 成就按钮 -->
      <button @click="$emit('open-achievements')" class="w-9 h-9 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 flex items-center justify-center">
        <i class="fas fa-medal"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.hero-hp-container {
  @apply bg-[#0f172a] rounded overflow-hidden mt-1 border border-slate-700 relative;
}
.hero-hp-fill {
  @apply h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300;
}
.hero-hp-text {
  @apply absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center text-[8px] font-bold text-white shadow-black drop-shadow-md;
}
</style>
