<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
// 1. 引入新组件
import ShieldBarCanvas from '@/components/ShieldBarCanvas.vue';
// [新增] 引入默认头像，保持与 ProfileView 一致
import defaultAvatar from '@/assets/avatar/avatar.jpg';

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore();

const user = computed(() => heroStore.user);
const heroStats = computed(() => store.heroStats);
const isPure = computed(() => systemStore.isPureMode);

// [Fix] 获取当前主题状态，用于传给 Canvas 防止白屏
const isDark = computed(() => store.isDarkMode);

const toggleTheme = () => {
  store.isDarkMode = !store.isDarkMode;
  if (store.isDarkMode) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  store.saveState();
};

const currentMaxHp = computed(() => {
  return heroStore.realMaxHp || user.value.heroMaxHp || 200;
});

/*const shieldPercent = computed(() => {
  const maxHp = currentMaxHp.value;
  if (maxHp <= 0) return 0;
  return Math.min((user.value.heroShield || 0) / maxHp * 100, 100);
});

const hasShield = computed(() => (user.value.heroShield || 0) > 0);*/

// [经验条] 计算经验百分比
const expPercent = computed(() => {
  const current = user.value.currentExp || 0;
  const next = user.value.nextLevelExp || 100;
  return Math.min((current / next) * 100, 100);
});

// [交互] 头像点击处理
const handleAvatarClick = () => {
  if (isPure.value) {
    // 纯净模式：跳转到个人中心
    router.push('/profile');
  } else {
    // RPG模式：打开成就弹窗
    store.setModal('achievements', true);
  }
};

// [点击事件] 金币区域 - 打开流水弹窗并切换到GOLD Tab
const openGoldHistory = () => {
  systemStore.temp.transactionTab = 'GOLD';
  systemStore.setModal('transactionHistory', true);
};

// [点击事件] 经验区域 - 打开流水弹窗并切换到EXP Tab
const openExpHistory = () => {
  systemStore.temp.transactionTab = 'EXP';
  systemStore.setModal('transactionHistory', true);
};

// === RPG 浮动文字消息队列系统 ===

// 1. 状态缓冲区 (State Buffer)
interface FloatingTextItem {
  id: number;
  text: string;
  type: 'exp' | 'gold' | 'hp' | 'level';
  icon: string;
}

const textQueue = ref<FloatingTextItem[]>([]); // 等待队列
const activeTexts = ref<FloatingTextItem[]>([]); // 活跃队列（正在显示的）
let textIdCounter = 0;
let processingTimer: number | null = null;

// 2. 监听数据源（生产者）

// 监听经验变化
watch(() => user.value.currentExp, (newVal, oldVal) => {
  if (!user.value.isInitialized) return;
  const diff = newVal - oldVal;
  if (diff > 0) {
    enqueueText(`+${Math.floor(diff)} EXP`, 'exp', '⭐');
  } else if (diff < 0) {
    enqueueText(`${Math.floor(diff)} EXP`, 'exp', '💫');
  }
});

// 监听金币变化
watch(() => user.value.gold, (newVal, oldVal) => {
  if (!user.value.isInitialized) return;
  const diff = newVal - oldVal;
  if (diff > 0) {
    enqueueText(`+${Math.floor(diff)} 金币`, 'gold', '💰');
  } else if (diff < 0) {
    enqueueText(`${Math.floor(diff)} 金币`, 'gold', '🪙');
  }
});

// 监听血量变化
watch(() => user.value.heroCurrentHp, (newVal, oldVal) => {
  if (!user.value.isInitialized) return;
  const diff = newVal - oldVal;
  if (diff > 0) {
    enqueueText(`+${Math.floor(diff)} HP`, 'hp', '❤️');
  } else if (diff < 0) {
    enqueueText(`${Math.floor(diff)} HP`, 'hp', '💔');
  }
});

// 注意：护盾动画现在由 ShieldBarCanvas 组件内部处理

// 监听等级变化（高优先级 - 插队）
watch(() => user.value.level, (newVal, oldVal) => {
  if (!user.value.isInitialized) return;
  const diff = newVal - oldVal;
  if (diff > 0) {
    // 等级提升使用 unshift 插队到队列最前端
    const item: FloatingTextItem = {
      id: ++textIdCounter,
      text: `🎉 等级提升！Lv.${newVal}`,
      type: 'level',
      icon: '✨'
    };
    textQueue.value.unshift(item);
  }
});

// 3. 入队函数
function enqueueText(text: string, type: FloatingTextItem['type'], icon: string) {
  const item: FloatingTextItem = {
    id: ++textIdCounter,
    text,
    type,
    icon
  };
  textQueue.value.push(item);
}

// 4. 消费引擎 (Consumption Engine)
function processQueue() {
  // 检查队列是否有数据
  if (textQueue.value.length === 0) return;

  // 出队逻辑：取出第一条
  const item = textQueue.value.shift();
  if (item) {
    // 放入活跃队列触发 UI 渲染
    activeTexts.value.push(item);

    // 2 秒后从活跃队列移除（配合 CSS 动画时长）
    setTimeout(() => {
      const index = activeTexts.value.findIndex(t => t.id === item.id);
      if (index !== -1) {
        activeTexts.value.splice(index, 1);
      }
    }, 2000);
  }

  // 动态速率调整 (Smart Pace)
  let nextInterval = 400; // 默认间隔
  if (textQueue.value.length > 5) {
    // 积压超过 5 条，加速处理
    nextInterval = 150;
  } else if (textQueue.value.length > 2) {
    // 积压 2-5 条，中速处理
    nextInterval = 250;
  }

  // 重新调度下一次执行
  if (processingTimer !== null) {
    clearTimeout(processingTimer);
  }
  processingTimer = window.setTimeout(processQueue, nextInterval);
}

// 启动消费引擎
onMounted(() => {
  processQueue();
});

// 清理定时器
onUnmounted(() => {
  if (processingTimer !== null) {
    clearTimeout(processingTimer);
  }
});
</script>

<template>
  <!-- [Mobile Opt] 顶部导航栏 UI 优化：
       1. 浅色模式：完全透明 (bg-transparent)，移除 blur、border 和 shadow，消除“黑罩子”感。
       2. 深色模式：保持原有的毛玻璃和深色背景。
  -->
  <div class="bg-transparent dark:bg-slate-900/95 dark:backdrop-blur-xl sticky top-0 z-50 dark:border-b dark:border-slate-800/50 transition-colors duration-300 shadow-none dark:shadow-sm will-change-transform" style="transform: translateZ(0);">

    <div class="px-4 py-3" style="padding-top: max(12px, env(safe-area-inset-top));">
      <!-- 上半部分：身份与操作 -->
      <div class="flex items-center justify-between mb-2">
        <!-- 左侧：头像与基础信息 -->
        <div id="guide-profile" class="flex items-center gap-3 active:opacity-70 transition-opacity cursor-pointer" @click="handleAvatarClick">
          <!-- 头像 -->
          <div class="relative shrink-0 group">
            <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 overflow-hidden shadow-md transition-transform">
              <img v-if="user.avatarType === 'CUSTOM' && user.customAvatar" :src="user.customAvatar" class="w-full h-full object-cover" />
              <img v-else :src="defaultAvatar" class="w-full h-full object-cover" />
            </div>
            <!-- 等级胶囊 (仅RPG显示) -->
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

      <!-- 下半部分：Canvas 血条护盾组件 -->
      <!-- [UI Design Opt] 浅色模式 UI 优化：
           1. 移除 bg-white/bg-slate-50 等实心背景，改用 bg-transparent。
           2. [Fix] 移除 border 类，因为 ShieldBarCanvas 组件内部会根据 theme 绘制更精确的边框，避免双重边框。
      -->
      <div v-if="!isPure && user.isInitialized"
           class="status-bar-container relative w-full mt-2 rounded-2xl overflow-hidden transition-all duration-300"
           :class="isDark ? 'bg-slate-900 border border-slate-800' : 'bg-transparent'"
           @click.stop="store.setModal('hpHistory', true)">
        <ShieldBarCanvas
          :current-hp="user.heroCurrentHp"
          :max-hp="currentMaxHp"
          :current-shield="user.heroShield || 0"
          :max-shield="currentMaxHp"
          :theme="isDark ? 'dark' : 'light'"
        />
      </div>

      <!-- [交易记录入口] 金币、经验和背包显示区域 -->
      <div v-if="!isPure && user.isInitialized" class="grid grid-cols-3 gap-2 mt-3">
        <!-- 金币 -->
        <div
          class="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-2 border border-yellow-200 dark:border-yellow-700/30 cursor-pointer active:scale-95 transition-all flex flex-col items-center justify-center relative overflow-hidden h-[52px]"
          @click.stop="openGoldHistory"
        >
          <div class="flex items-center gap-1 relative z-10">
            <i class="fas fa-coins text-yellow-500 text-[10px]"></i>
            <span class="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold tracking-wide">GOLD</span>
          </div>
          <span class="text-xs font-black text-yellow-700 dark:text-yellow-300 font-mono mt-0.5 relative z-10">{{ user.gold || 0 }}</span>
          <!-- 装饰图标 -->
          <i class="fas fa-coins absolute -right-1 -bottom-2 text-3xl text-yellow-500/10 dark:text-yellow-500/10 z-0 transform -rotate-12"></i>
        </div>

        <!-- 经验 -->
        <div
          class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-2 border border-purple-200 dark:border-purple-700/30 cursor-pointer active:scale-95 transition-all flex flex-col items-center justify-center relative overflow-hidden h-[52px]"
          @click.stop="openExpHistory"
        >
          <div class="flex items-center gap-1 relative z-10 w-full justify-center">
            <i class="fas fa-star text-purple-500 text-[10px]"></i>
            <span class="text-[9px] text-purple-600 dark:text-purple-400 font-bold tracking-wide">EXP</span>
          </div>

          <div class="w-full mt-1 relative z-10">
            <!-- 进度条背景 -->
            <div class="h-1.5 w-full bg-purple-200 dark:bg-purple-950 rounded-full overflow-hidden">
              <!-- 进度条本体 (纯色) -->
              <div
                class="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-500 ease-out"
                :style="{ width: expPercent + '%' }"
              ></div>
            </div>
          </div>
          <!-- 装饰图标 -->
          <i class="fas fa-star absolute -right-1 -bottom-2 text-3xl text-purple-500/10 dark:text-purple-500/10 z-0 transform rotate-12"></i>
        </div>

        <!-- [背包功能] -->
        <div
          class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200 dark:border-emerald-700/30 cursor-pointer active:scale-95 transition-all flex flex-col items-center justify-center relative overflow-hidden h-[52px]"
          @click.stop="systemStore.setModal('inventory', true)"
        >
          <div class="flex items-center gap-1 relative z-10">
            <i class="fas fa-bag-shopping text-emerald-500 text-[10px]"></i>
            <span class="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wide">BAG</span>
          </div>
          <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 relative z-10">背包</span>
          <!-- 装饰图标 -->
          <i class="fas fa-bag-shopping absolute -right-1 -bottom-2 text-3xl text-emerald-500/10 dark:text-emerald-500/10 z-0 transform -rotate-6"></i>
        </div>
      </div>
    </div>
  </div>

  <!-- 浮动文字层 -->
  <div class="floating-text-layer">
    <transition-group name="float-up" tag="div" class="floating-text-container">
      <div
        v-for="item in activeTexts"
        :key="item.id"
        class="floating-text"
        :class="`floating-text-${item.type}`"
      >
        <span class="text-icon">{{ item.icon }}</span>
        <span class="text-content">{{ item.text }}</span>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
/* Canvas 血条容器样式 */
.status-bar-container {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;

  /* [Fix] 核心修复：
     不要写死 height: 110px！
     Canvas 现在是响应式的，高度会随宽度变化。
     如果写死 110px，当屏幕变窄 Canvas 变矮时，Canvas 就会贴在容器顶部，导致下方留白，看起来没居中。
     改为 auto 让容器包裹 Canvas 即可。
  */
  height: auto;
  min-height: 50px; /* 防止未加载时完全坍塌 */

  position: relative;
  pointer-events: auto;
  cursor: pointer;
}

/* 强制重置 Canvas 元素背景 */
:deep(canvas) {
  background-color: transparent !important;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

/* === 浮动文字系统样式 === */
.floating-text-layer {
  position: fixed;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.floating-text-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.floating-text {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  transition: all 0.3s ease;
}

.floating-text-exp {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.95), rgba(168, 85, 247, 0.95));
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.floating-text-gold {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(251, 191, 36, 0.95));
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.floating-text-hp {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(248, 113, 113, 0.95));
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.floating-text-level {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(74, 222, 128, 0.95));
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  font-size: 18px;
  padding: 12px 24px;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
}

.text-icon {
  font-size: 20px;
  display: inline-block;
  animation: icon-bounce 0.6s ease-in-out;
}

.text-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@keyframes icon-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.float-up-enter-active {
  animation: float-up-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.float-up-leave-active {
  animation: float-up-out 0.5s ease-out;
}

@keyframes float-up-in {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes float-up-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
}
</style>
