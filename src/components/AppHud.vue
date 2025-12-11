<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';

const store = useGameStore();
const systemStore = useSystemStore();
const user = computed(() => store.user);
const heroStats = computed(() => store.heroStats);
const isPure = computed(() => systemStore.isPureMode);

// 切换深色模式 Action
const toggleTheme = () => {
  store.isDarkMode = !store.isDarkMode;
  if (store.isDarkMode) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  store.saveState();
};
</script>

<template>
  <div class="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 safe-area-top transition-colors duration-300">
    <div class="px-4 py-3">
      <!-- 上半部分：身份与操作 -->
      <div class="flex items-center justify-between mb-2">
        <!-- 左侧：头像与基础信息 -->
        <div id="guide-profile" class="flex items-center gap-3" @click="!isPure && store.setModal('achievements', true)">
          <!-- 头像 -->
          <div class="relative shrink-0">
            <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <img :src="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.avatarSeed" class="w-full h-full object-cover" />
            </div>
            <!-- 等级胶囊 (纯净模式隐藏) -->
            <div v-if="!isPure" class="absolute -bottom-1 -right-2 bg-slate-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 scale-90">
              Lv.{{ user.level }}
            </div>
          </div>

          <!-- 文字信息 -->
          <div>
            <div class="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">
              {{ user.nickname }}
            </div>
            <!-- [Fix] 增加 v-if="heroStats" 保护 -->
            <div v-if="!isPure && heroStats" class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <span>{{ heroStats.raceIcon }}</span>
              <span>{{ heroStats.raceName }}</span>
            </div>
            <!-- 纯净模式显示简单问候 -->
            <div v-else class="text-[10px] text-slate-400 mt-0.5">
              保持健康每一天
            </div>
          </div>
        </div>

        <!-- 右侧：按钮组 -->
        <div class="flex items-center gap-2">
          <!-- 勋章 (纯净模式隐藏) -->
          <button v-if="!isPure" @click.stop="$emit('open-achievements')" class="w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center border border-yellow-100 dark:border-yellow-500/20 active:scale-95 transition">
            <i class="fas fa-medal text-xs"></i>
          </button>
          <!-- 主题 -->
          <button @click.stop="toggleTheme" class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-100 dark:border-slate-700 active:scale-95 transition">
            <i :class="store.isDarkMode ? 'fas fa-sun' : 'fas fa-moon'" class="text-xs"></i>
          </button>
        </div>
      </div>

      <!-- 下半部分：HP 条 (纯净模式隐藏) -->
      <div v-if="!isPure && heroStats" class="relative w-full" @click.stop="store.setModal('hpHistory', true)">
        <div class="flex justify-between text-[9px] font-bold mb-1 px-0.5">
          <span class="text-red-500 flex items-center gap-1"><i class="fas fa-heart text-[8px]"></i> 英雄状态</span>
          <span class="text-slate-600 dark:text-slate-300 font-mono">{{ Math.floor(user.heroCurrentHp) }} / {{ heroStats.maxHp }}</span>
        </div>
        <div class="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
          <div class="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500 relative"
               :style="{ width: Math.min((user.heroCurrentHp / (heroStats.maxHp || 1) * 100), 100) + '%' }">
            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
