<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';

const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore();

const user = computed(() => heroStore.user);
const heroStats = computed(() => store.heroStats);
const isPure = computed(() => systemStore.isPureMode);

const toggleTheme = () => {
  store.isDarkMode = !store.isDarkMode;
  if (store.isDarkMode) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  store.saveState();
};

const currentMaxHp = computed(() => {
  return heroStore.realMaxHp || user.value.heroMaxHp || 200;
});

const shieldPercent = computed(() => {
  const maxHp = currentMaxHp.value;
  if (maxHp <= 0) return 0;
  return Math.min((user.value.heroShield || 0) / maxHp * 100, 100);
});

const hasShield = computed(() => (user.value.heroShield || 0) > 0);
</script>

<template>
  <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 safe-area-top transition-colors duration-300 shadow-sm">
    <div class="px-4 py-3">
      <!-- 上半部分：身份与操作 -->
      <div class="flex items-center justify-between mb-2">
        <!-- 左侧：头像与基础信息 -->
        <div id="guide-profile" class="flex items-center gap-3 active:opacity-70 transition-opacity" @click="!isPure && store.setModal('achievements', true)">
          <!-- 头像 -->
          <div class="relative shrink-0 group">
            <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <img :src="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.avatarSeed" class="w-full h-full object-cover" />
            </div>
            <!-- 等级胶囊 -->
            <div v-if="!isPure" class="absolute -bottom-1 -right-2 bg-slate-800 text-white text-[8px] font-black px-2 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
              Lv.{{ user.level }}
            </div>
          </div>

          <!-- 文字信息 -->
          <div>
            <div class="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">
              {{ user.nickname }}
            </div>
            <div v-if="!isPure && heroStats" class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 font-bold">
              <span class="text-xs">{{ heroStats.raceIcon }}</span>
              <span class="tracking-wide uppercase">{{ heroStats.raceName }}</span>
            </div>
            <div v-else class="text-[10px] text-slate-400 mt-0.5 font-medium">
              保持健康每一天
            </div>
          </div>
        </div>

        <!-- 右侧：按钮组 -->
        <div class="flex items-center gap-2">
          <button v-if="!isPure" @click.stop="$emit('open-achievements')" class="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center border border-amber-100 dark:border-amber-500/30 active:scale-90 transition shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/40">
            <i class="fas fa-medal text-xs"></i>
          </button>
          <button @click.stop="toggleTheme" class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-90 transition shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700">
            <i :class="store.isDarkMode ? 'fas fa-sun' : 'fas fa-moon'" class="text-xs"></i>
          </button>
        </div>
      </div>

      <!-- 下半部分：状态条区域 (HP + Shield) -->
      <div v-if="!isPure && user.isInitialized" class="relative w-full mt-2" @click.stop="store.setModal('hpHistory', true)">

        <!-- 数值展示行 -->
        <div class="flex justify-between items-end mb-1 px-0.5">
          <div class="flex items-center gap-2 h-4">
            <span class="text-rose-500 text-[9px] font-black flex items-center gap-1"><i class="fas fa-heart"></i> HP</span>

            <!-- 护盾数值 (全息胶囊风格 - 带呼吸动画) -->
            <transition name="shield-pop">
               <span v-if="hasShield" class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-cyan-500 bg-cyan-950/5 dark:bg-cyan-400/10 border border-cyan-200 dark:border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse-slow">
                 <i class="fas fa-shield-alt animate-spin-slow-reverse"></i> {{ Math.floor(user.heroShield) }}
               </span>
            </transition>
          </div>
          <span class="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
            {{ Math.floor(user.heroCurrentHp) }} <span class="text-slate-300">/</span> {{ Math.floor(currentMaxHp) }}
          </span>
        </div>

        <!-- 复合能量条容器 -->
        <div class="relative flex flex-col">

          <!-- 1. 全息护盾条 (Holographic Energy Shield) -->
          <!-- 悬浮在血条上方 -->
          <div class="relative w-full transition-all duration-500 ease-spring"
               :class="hasShield ? 'h-2 mb-1 opacity-100' : 'h-0 mb-0 opacity-0'">

            <!-- 轨道槽 -->
            <div class="absolute inset-0 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner"></div>

            <!-- 能量填充 - 增加 overflow-hidden 确保内部特效不溢出 -->
            <div class="h-full rounded-full relative overflow-hidden transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-cyan-500/20"
                 :style="{ width: shieldPercent + '%' }">

              <!-- 动态底层能量流 (Energy Flow) -->
              <div class="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-gradient-flow opacity-90"></div>

              <!-- 动态粒子/扫描线 (Active Scanline) -->
              <div class="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(120deg,transparent,transparent_6px,rgba(255,255,255,0.4)_8px,transparent_10px)] animate-scanline opacity-60"></div>

              <!-- 快速高光扫过 (Fast Sheen) -->
              <div class="absolute top-0 bottom-0 -left-[100%] w-[80%] bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg] animate-sheen-fast mix-blend-overlay"></div>

              <!-- 顶部高光边缘 (Top Edge Highlight) -->
              <div class="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-80"></div>
            </div>
          </div>

          <!-- 2. 主血条 (Main HP) -->
          <div class="relative h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-inner overflow-hidden">
            <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-500 ease-out"
                 :style="{ width: Math.min((user.heroCurrentHp / (currentMaxHp || 1) * 100), 100) + '%' }">
              <!-- 微弱的内部高光 -->
              <div class="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 能量流动动画 */
@keyframes gradient-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient-flow {
  background-size: 200% 200%;
  animation: gradient-flow 3s ease infinite;
}

/* 扫描线动画 */
@keyframes scanline-move {
  0% { background-position: 0 0; }
  100% { background-position: 30px 0; }
}

.animate-scanline {
  background-size: 30px 100%;
  animation: scanline-move 1s linear infinite;
}

/* 快速流光动画 */
@keyframes sheen-move-fast {
  0% { left: -100%; }
  100% { left: 200%; }
}

.animate-sheen-fast {
  animation: sheen-move-fast 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* 慢速反向旋转 (用于图标) */
@keyframes spin-slow-reverse {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

.animate-spin-slow-reverse {
  animation: spin-slow-reverse 6s linear infinite;
}

.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 弹簧过渡效果 */
.ease-spring {
  transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 护盾数值弹出动画 */
.shield-pop-enter-active,
.shield-pop-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.shield-pop-enter-from,
.shield-pop-leave-to {
  opacity: 0;
  transform: translateX(-10px) scale(0.8);
}
</style>
