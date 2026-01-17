<script setup lang="ts">
import { computed, ref, reactive } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHydrationStore } from '@/stores/useHydrationStore';
import { showToast } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();
const hydrationStore = useHydrationStore();

const show = computed({
  get: () => systemStore.modals.hydration,
  set: (val) => systemStore.setModal('hydration', val)
});

const isPure = computed(() => systemStore.isPureMode);
const config = computed(() => hydrationStore.hydrationConfig);
const progress = computed(() => hydrationStore.todayProgress);

// --- 动画与交互状态 ---
const isPurifying = ref(false);
const ripplePos = reactive({ x: 0, y: 0, show: false });

// 经典的波浪高度计算逻辑
const waveTranslateY = computed(() => {
  const pct = Math.min(progress.value.percentage, 130);
  return 100 - (pct * 1.1);
});

// --- Actions ---

const handleDrink = (event: MouseEvent) => {
  if (isPurifying.value) return;

  // 1. 计算波纹位置
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  ripplePos.x = event.clientX - rect.left;
  ripplePos.y = event.clientY - rect.top;
  ripplePos.show = true;

  // 2. 状态锁定
  isPurifying.value = true;

  // 3. 执行补水
  hydrationStore.quickDrink();

  // 4. 重置动画状态
  setTimeout(() => {
    ripplePos.show = false;
    isPurifying.value = false;
  }, 600);

  // 5. 震动反馈 (部分低端机可能不支持，但这不影响性能)
  if (navigator.vibrate) navigator.vibrate(30);
};

// --- 设置逻辑 ---
const isEditing = ref(false);
const editForm = ref({ target: 8, size: 250, interval: 60, notify: false });

const openSettings = () => {
  editForm.value = {
    target: config.value.dailyTargetCups || 8,
    size: config.value.cupSizeMl || 250,
    interval: config.value.reminderInterval || 60,
    notify: !!config.value.enableNotifications
  };
  isEditing.value = true;
};

const saveSettings = () => {
  hydrationStore.updateConfig({
    dailyTargetCups: editForm.value.target,
    cupSizeMl: editForm.value.size,
    reminderInterval: editForm.value.interval,
    enableNotifications: editForm.value.notify
  });
  store.saveState();
  isEditing.value = false;
  showToast('计划已更新');
};
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: 'auto', maxHeight: '80%' }"
    class="dark:bg-slate-900 pb-safe"
  >
    <div class="p-6 bg-slate-50 dark:bg-slate-900 min-h-[500px] flex flex-col relative overflow-hidden transition-colors duration-300">

      <!-- 背景纹理 -->
      <div v-if="!isPure" class="absolute inset-0 pointer-events-none opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <!-- 头部 -->
      <div class="flex justify-between items-center mb-6 relative z-10">
        <h3 class="font-bold text-xl flex items-center dark:text-white">
          <!-- 这里使用了您自定义的 iconfont -->
          <i class="iconfont icon-shui text-blue-500 mr-2 animate-bounce"></i>
          {{ isPure ? '补水计划' : '净化之源' }}
        </h3>
        <button v-if="!isEditing" @click="openSettings" class="text-xs text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition hover:bg-slate-50">
          <i class="fas fa-cog mr-1"></i> 设置
        </button>
      </div>

      <!-- 设置面板 -->
      <div v-if="isEditing" class="space-y-4 mb-6 relative z-10 animate-fade-in">
        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">每日目标 (杯)</span>
            <van-stepper v-model="editForm.target" min="1" max="20" button-size="28px" class="theme-stepper"/>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">单杯容量 (ml)</span>
            <van-stepper v-model="editForm.size" min="50" max="1000" step="50" button-size="28px" class="theme-stepper"/>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">提醒间隔 (分)</span>
            <van-stepper v-model="editForm.interval" min="30" max="240" step="30" button-size="28px" class="theme-stepper"/>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">开启通知</span>
            <van-switch v-model="editForm.notify" size="22px" active-color="#3b82f6" />
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <van-button class="flex-1 border-slate-200 dark:border-slate-700" plain round @click="isEditing = false">取消</van-button>
          <van-button class="flex-[2] shadow-lg shadow-blue-200 dark:shadow-none" color="#3b82f6" round @click="saveSettings">保存计划</van-button>
        </div>
      </div>

      <!-- 主面板：经典水球 (Classic Water Sphere) - 移动端优化版 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center relative z-10">

        <!-- 水球容器 -->
        <!-- 优化: 移除了 blur 和复杂的 shadow, 改用 border 和简单 shadow -->
        <div
          class="relative w-64 h-64 mb-8 cursor-pointer active:scale-95 transition-transform duration-300 group rounded-full border-4 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden isolate select-none tap-highlight-transparent"
          style="transform: translateZ(0);"
          @click="handleDrink"
        >
          <!-- 点击波纹 (优化: 使用 opacity 动画代替复杂的 filter) -->
          <span
            v-if="ripplePos.show"
            class="absolute bg-white/40 rounded-full animate-ripple pointer-events-none z-50"
            :style="{
              left: ripplePos.x + 'px',
              top: ripplePos.y + 'px',
              width: '10px',
              height: '10px'
            }"
          ></span>

          <!-- 水体层：3个层级 (优化: 添加 will-change: transform) -->

          <!-- Wave 1: 背景深色 -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-[#1e3a8a] dark:bg-[#172554] rounded-[40%] animate-spin-slow transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) layer-gpu"
               :style="{ top: (waveTranslateY - 8) + '%' }"></div>

          <!-- Wave 2: 中间层 -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-[#3b82f6] dark:bg-[#1d4ed8] opacity-80 rounded-[38%] animate-spin-reverse transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) layer-gpu"
               :style="{ top: (waveTranslateY - 4) + '%' }"></div>

          <!-- Wave 3: 前景浅色 (优化: 移除了 expensive 的 shadow, 改用纯色渐变) -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-gradient-to-tr from-[#60a5fa] to-[#22d3ee] opacity-90 rounded-[42%] animate-spin-fast transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) layer-gpu"
               :style="{ top: waveTranslateY + '%' }"></div>

          <!-- 气泡层 (优化: 减少气泡数量，移除 blend-mode) -->
          <div class="absolute inset-0 z-20 pointer-events-none opacity-50 overflow-hidden"
               :style="{ top: waveTranslateY + '%' }">
            <div class="bubble b1"></div>
            <div class="bubble b2"></div>
            <div class="bubble b3"></div>
          </div>

          <!-- 文字信息 -->
          <div class="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <div class="text-5xl font-black transition-colors duration-500 drop-shadow-sm"
                 :class="progress.percentage > 50 ? 'text-white' : 'text-slate-700 dark:text-white'">
              {{ progress.cups }}<span class="text-xl font-normal opacity-80">/{{ config.dailyTargetCups }}</span>
            </div>

            <!-- 动态文案 -->
            <!-- 优化: 移除了 backdrop-blur, 改用半透明背景 -->
            <div class="text-xs font-bold px-3 py-1 rounded-full mt-2 transition-all duration-500 border border-white/20 shadow-sm"
                 :class="progress.percentage > 55
                   ? 'bg-white/20 text-white'
                   : 'bg-blue-50/90 text-blue-600 border-blue-200 dark:bg-slate-700/90 dark:text-slate-300 dark:border-slate-600'">
              {{ isPurifying ? '净化中...' : `${progress.amount} ml` }}
            </div>
          </div>

          <!-- 玻璃高光 (优化: 简单的半透明层，移除 blur) -->
          <div class="absolute top-4 left-6 w-20 h-10 bg-gradient-to-b from-white/40 to-transparent rounded-full -rotate-45 pointer-events-none z-40 opacity-60"></div>
        </div>

        <!-- 数据面板 -->
        <div class="grid grid-cols-2 gap-4 w-full mb-4">
          <div class="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-blue-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">距离上次</div>
            <div class="font-bold text-slate-700 dark:text-slate-200">
              {{ hydrationStore.minutesSinceLastDrink > 1000 ? '很久' : `${hydrationStore.minutesSinceLastDrink}分钟` }}
            </div>
          </div>
          <div class="bg-green-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-green-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">完成度</div>
            <div class="font-bold text-green-600">
              {{ progress.percentage }}%
            </div>
          </div>
        </div>

        <div v-if="!isPure" class="text-center text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
          <i class="fas fa-magic mr-1 text-purple-400"></i> 提示：水分可以中和体内的“高盐”状态并恢复生命值
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* --- GPU 优化层类 --- */
/* 强制浏览器为该元素创建合成层 */
.layer-gpu {
  will-change: transform;
  transform: translateZ(0);
}

/* --- 旋转波浪 --- */
@keyframes spin-slow { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
@keyframes spin-reverse { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(-360deg); } }
@keyframes spin-fast { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }

.animate-spin-slow { animation: spin-slow 12s linear infinite; }
.animate-spin-reverse { animation: spin-reverse 10s linear infinite; }
.animate-spin-fast { animation: spin-fast 8s linear infinite; }

/* --- 气泡上升 --- */
.bubble {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  bottom: -20px;
}

.b1 { left: 20%; width: 6px; height: 6px; animation: bubble-rise 4s infinite ease-in; }
.b2 { left: 50%; width: 10px; height: 10px; animation: bubble-rise 5s infinite ease-in 1s; }
.b3 { left: 70%; width: 5px; height: 5px; animation: bubble-rise 3s infinite ease-in 2s; }

@keyframes bubble-rise {
  0% { transform: translateY(20px) scale(0.5); opacity: 0; }
  25% { transform: translateY(-50px) scale(0.8); opacity: 0.8; }
  50% { transform: translateY(-100px) scale(1); opacity: 1; }
  100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
}

/* --- 点击波纹 (简单 Scaling) --- */
@keyframes ripple-effect {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(40); opacity: 0; }
}
.animate-ripple {
  animation: ripple-effect 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* --- Stepper Override --- */
:deep(.theme-stepper .van-stepper__input) {
  background: transparent;
  font-weight: bold;
}
:deep(.theme-stepper .van-stepper__minus),
:deep(.theme-stepper .van-stepper__plus) {
  background: rgba(0,0,0,0.05);
}
.dark :deep(.theme-stepper .van-stepper__minus),
.dark :deep(.theme-stepper .van-stepper__plus) {
  background: rgba(255,255,255,0.1);
  color: #94a3b8;
}
</style>
