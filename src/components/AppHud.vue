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

// [New] 护盾相关计算
// 护盾百分比：分母为护盾上限 (目前逻辑是 MaxHP)
const shieldPercent = computed(() => {
  if (!heroStats.value || heroStats.value.maxHp <= 0) return 0;
  return Math.min((user.value.heroShield || 0) / heroStats.value.maxHp * 100, 100);
});

// [New] 是否有护盾
const hasShield = computed(() => (user.value.heroShield || 0) > 0);
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

      <!-- 下半部分：状态条区域 (HP + Shield) -->
      <div v-if="!isPure && heroStats" class="relative w-full mt-1" @click.stop="store.setModal('hpHistory', true)">

        <!-- 数值展示行 -->
        <div class="flex justify-between items-end mb-1 px-0.5">
          <div class="flex items-center gap-2">
            <span class="text-red-500 text-[9px] font-bold flex items-center gap-1"><i class="fas fa-heart"></i> HP</span>
            <!-- 护盾数值 (独立显示) -->
            <transition name="fade">
               <span v-if="hasShield" class="text-[9px] font-bold text-cyan-500 flex items-center gap-1 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded animate-pulse shadow-sm border border-cyan-100 dark:border-cyan-800">
                 <i class="fas fa-shield-alt"></i> {{ Math.floor(user.heroShield) }}
               </span>
            </transition>
          </div>
          <span class="text-[9px] font-mono font-bold text-slate-400">
            {{ Math.floor(user.heroCurrentHp) }} / {{ heroStats.maxHp }}
          </span>
        </div>

        <!-- 复合能量条容器 -->
        <div class="relative flex flex-col gap-0.5">

          <!-- 1. 独立护盾条 (Energy Shield) -->
          <!-- 只有有护盾时才显示高度，否则高度为0但保留过渡 -->
          <div class="relative w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden transition-all duration-500 ease-out"
               :style="{ height: hasShield ? '6px' : '0px', opacity: hasShield ? 1 : 0, marginBottom: hasShield ? '2px' : '0' }">

            <!-- 护盾底纹 -->
            <div class="absolute inset-0 bg-cyan-100/30 dark:bg-cyan-900/20"></div>

            <!-- 护盾进度 -->
            <div class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 relative transition-all duration-500 ease-out shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                 :style="{ width: shieldPercent + '%' }">
              <!-- 科技感斜纹动画 -->
              <div class="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[stripes-move_1s_linear_infinite]"></div>
              <!-- 头部高光 -->
              <div class="absolute right-0 top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_4px_#fff]"></div>
            </div>
          </div>

          <!-- 2. 主血条 (Main HP) -->
          <div class="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden">
            <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                 :style="{ width: Math.min((user.heroCurrentHp / (heroStats.maxHp || 1) * 100), 100) + '%' }">
              <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 护盾条纹动画 */
@keyframes stripes-move {
  0% { background-position: 0 0; }
  100% { background-position: 20px 20px; } /* 必须匹配 bg-length 的倍数 (10px * 2) 或者是它的倍数 */
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
