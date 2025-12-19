<script setup lang="ts">
/**
 * ModalHydration.vue - RPG模式补水弹窗
 * [Refactor V6.1] 使用新的 hydrationStore，确保数据同步
 */
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHydrationStore } from '@/stores/useHydrationStore';
import { showToast, showNotify } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();
const hydrationStore = useHydrationStore();

const show = computed({
  get: () => systemStore.modals.hydration,
  set: (val) => systemStore.setModal('hydration', val)
});

const isPure = computed(() => systemStore.isPureMode);

// [Refactor V6.1] 使用 hydrationStore 的配置和进度
const config = computed(() => hydrationStore.hydrationConfig);
const progress = computed(() => hydrationStore.todayProgress);

// 今日补水记录 (合并新旧格式)
const currentCups = computed(() => progress.value.cups);
const currentMl = computed(() => progress.value.amount);

const progressPercent = computed(() => progress.value.percentage);

// 计算波浪遮罩的位置：百分比越高，遮罩越往上移（露出更多水）
// 0% -> top: 100% (全遮住, 水在下面)
// 100% -> top: -10% (接近全满，留一点浪尖)
// 超过100% -> 继续上升
const waveTranslateY = computed(() => {
  const pct = Math.min(progressPercent.value, 130); // 上限限制在130%防止溢出太多
  // 线性映射：0% -> 100%, 100% -> -10%
  // 公式：100 - (pct * 1.1)
  return 100 - (pct * 1.1);
});

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

const cancelSettings = () => { isEditing.value = false; };

const saveSettings = () => {
  // [Refactor V6.1] 使用 hydrationStore 保存设置
  hydrationStore.updateConfig({
    dailyTargetCups: editForm.value.target,
    cupSizeMl: editForm.value.size,
    reminderInterval: editForm.value.interval,
    enableNotifications: editForm.value.notify
  });
  if (editForm.value.notify) showToast('提醒服务已更新 (模拟)');
  store.saveState();
  isEditing.value = false;
  showToast('计划已更新');
};

// [Refactor V6.1] 使用 hydrationStore 的 commitHydration
const drinkWater = () => {
  const itemName = isPure.value ? '补水' : '净化之泉';
  
  hydrationStore.commitHydration({
    name: itemName,
    icon: '💧',
    amount: config.value.cupSizeMl,
    type: 'WATER'
  });
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: 'auto', maxHeight: '80%' }" class="dark:bg-slate-900 pb-safe">
    <div class="p-6 bg-slate-50 dark:bg-slate-900 min-h-[400px] flex flex-col relative overflow-hidden">

      <!-- 背景装饰 -->
      <div v-if="!isPure" class="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <!-- 头部 -->
      <div class="flex justify-between items-center mb-6 relative z-10">
        <h3 class="font-bold text-xl flex items-center dark:text-white">
          <i class="fas fa-tint text-blue-500 mr-2"></i>
          {{ isPure ? '补水计划' : '生命之源' }}
        </h3>
        <button v-if="!isEditing" @click="openSettings" class="text-xs text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition">
          <i class="fas fa-cog mr-1"></i> 计划设置
        </button>
      </div>

      <!-- 设置面板 -->
      <div v-if="isEditing" class="space-y-4 mb-6 relative z-10 animate-fade-in">
        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">每日目标 (杯)</span>
            <van-stepper v-model="editForm.target" min="1" max="20" button-size="24px" />
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">单杯容量 (ml)</span>
            <van-stepper v-model="editForm.size" min="50" max="1000" step="50" button-size="24px" />
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">提醒间隔 (分钟)</span>
            <van-stepper v-model="editForm.interval" min="30" max="240" step="30" button-size="24px" />
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">开启系统通知</span>
            <van-switch v-model="editForm.notify" size="20px" active-color="#3b82f6" />
          </div>
        </div>
        <div class="flex gap-3">
          <van-button class="flex-1" plain round @click="cancelSettings">取消</van-button>
          <van-button class="flex-[2]" color="#3b82f6" round @click="saveSettings">保存计划</van-button>
        </div>
      </div>

      <!-- 主面板 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center relative z-10">

        <!-- [V6.1 Water Sphere] 究极真实流体物理模拟 -->
        <div class="relative w-64 h-64 mb-8 cursor-pointer active:scale-95 transition-transform duration-300 group rounded-full border-4 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-[0_20px_50px_rgba(59,130,246,0.2)] overflow-hidden isolate" @click="drinkWater">

          <!-- 水体层：3个不同相位、不同颜色的旋转方块 -->

          <!-- Wave 1: 最深色，背景，转速慢，模拟深水 -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-[#1e3a8a] dark:bg-[#172554] rounded-[40%] animate-spin-slow transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
               :style="{ top: (waveTranslateY - 8) + '%' }"></div>

          <!-- Wave 2: 中间色，反向旋转，增加湍流感 -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-[#3b82f6] dark:bg-[#1d4ed8] opacity-80 rounded-[38%] animate-spin-reverse transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
               :style="{ top: (waveTranslateY - 4) + '%' }"></div>

          <!-- Wave 3: 最浅色/主色，前景，高亮水波 -->
          <div class="absolute left-1/2 w-[200%] h-[200%] -translate-x-1/2 bg-gradient-to-tr from-[#60a5fa] to-[#22d3ee] opacity-90 rounded-[42%] animate-spin-fast transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) shadow-[0_0_30px_rgba(34,211,238,0.4)]"
               :style="{ top: waveTranslateY + '%' }"></div>

          <!-- 气泡层 (Bubbles) - 只在水面上方可见，且带有左右摇摆 -->
          <div class="absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-60 overflow-hidden"
               :style="{ top: waveTranslateY + '%' }"> <!-- 气泡容器跟随水位 -->
            <div class="bubble b1"></div>
            <div class="bubble b2"></div>
            <div class="bubble b3"></div>
            <div class="bubble b4"></div>
            <div class="bubble b5"></div>
          </div>

          <!-- 文字信息 (层级最高) -->
          <div class="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <!-- 自动变色：通过 mix-blend-mode 或阴影增强对比度 -->
            <div class="text-5xl font-black transition-colors duration-500 drop-shadow-lg"
                 :class="progressPercent > 50 ? 'text-white' : 'text-slate-700 dark:text-white'">
              {{ currentCups }}<span class="text-xl font-normal opacity-80">/{{ config.dailyTargetCups }}</span>
            </div>
            <div class="text-xs font-bold px-3 py-1 rounded-full mt-2 transition-colors duration-500 border backdrop-blur-md shadow-sm"
                 :class="progressPercent > 55
                   ? 'bg-white/20 text-white border-white/40'
                   : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'">
              {{ currentMl }} ml
            </div>
          </div>

          <!-- 玻璃高光 (Gloss) -->
          <div class="absolute top-4 left-6 w-20 h-10 bg-gradient-to-b from-white/60 to-transparent rounded-full blur-md -rotate-45 pointer-events-none z-40 opacity-80"></div>
          <div class="absolute bottom-6 right-8 w-10 h-4 bg-white/20 rounded-full blur-sm -rotate-45 pointer-events-none z-40 opacity-50"></div>

          <!-- 提示 -->
          <div class="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-slate-400 animate-bounce">
            👇 点击补水
          </div>
        </div>

        <!-- 数据面板 -->
        <div class="grid grid-cols-2 gap-4 w-full mb-4">
          <div class="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-blue-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">下次提醒</div>
            <div class="font-bold text-slate-700 dark:text-slate-200">
              {{ config.enableNotifications ? `${config.reminderInterval}分钟后` : '未开启' }}
            </div>
          </div>
          <div class="bg-green-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-green-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">完成度</div>
            <div class="font-bold text-green-600">
              {{ progressPercent }}%
            </div>
          </div>
        </div>

        <div v-if="!isPure" class="text-center text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
          <i class="fas fa-info-circle mr-1"></i> 提示：喝水可以清除部分负面状态 (如高盐) 并少量回血。
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* --- 真实的旋转波浪 --- */
/* 关键是 center center 旋转大尺寸的圆角矩形 */
@keyframes spin-slow { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }
@keyframes spin-reverse { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(-360deg); } }
@keyframes spin-fast { from { transform: translateX(-50%) rotate(0deg); } to { transform: translateX(-50%) rotate(360deg); } }

.animate-spin-slow { animation: spin-slow 12s linear infinite; }
.animate-spin-reverse { animation: spin-reverse 10s linear infinite; }
.animate-spin-fast { animation: spin-fast 8s linear infinite; }

/* --- 气泡上升 (S形轨迹) --- */
.bubble {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  bottom: -20px;
}

.b1 { left: 20%; width: 6px; height: 6px; animation: bubble-rise 4s infinite ease-in; }
.b2 { left: 50%; width: 10px; height: 10px; animation: bubble-rise 5s infinite ease-in 1s; }
.b3 { left: 70%; width: 5px; height: 5px; animation: bubble-rise 3s infinite ease-in 2s; }
.b4 { left: 35%; width: 8px; height: 8px; animation: bubble-rise 6s infinite ease-in 0.5s; }
.b5 { left: 80%; width: 4px; height: 4px; animation: bubble-rise 4.5s infinite ease-in 1.5s; }

@keyframes bubble-rise {
  0% { transform: translateY(20px) translateX(0) scale(0.5); opacity: 0; }
  25% { transform: translateY(-50px) translateX(10px) scale(0.8); opacity: 0.8; }
  50% { transform: translateY(-100px) translateX(-10px) scale(1); opacity: 1; }
  75% { transform: translateY(-150px) translateX(10px) scale(1.1); opacity: 0.8; }
  100% { transform: translateY(-220px) translateX(0) scale(1.2); opacity: 0; }
}
</style>
