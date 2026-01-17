<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, showConfirmDialog } from 'vant';

// --- 类型定义 ---
interface FastingState {
  isFasting: boolean;
  startTime: number;
  targetHours: number;
}

// --- Store ---
const store = useGameStore();
const systemStore = useSystemStore();

// --- 基础状态 ---
const isPure = computed(() => systemStore.isPureMode);

// 控制模态框
const show = computed({
  get: () => systemStore.modals.fasting,
  set: (val) => {
    systemStore.setModal('fasting', val);
    if (!val) {
      setTimeout(() => { isEditing.value = false; }, 300);
    }
  }
});

// 获取状态
const fastingState = computed<FastingState>(() => store.user.fasting || {
  isFasting: false,
  startTime: 0,
  targetHours: 16
});
const isFasting = computed(() => fastingState.value.isFasting);

// --- 计时核心 ---
const now = ref(Date.now());
let timer: number | null = null;

const updateNow = () => { now.value = Date.now(); };

onMounted(() => {
  timer = window.setInterval(updateNow, 1000);
  if (!store.user.fasting) {
    store.user.fasting = { isFasting: false, startTime: 0, targetHours: 16 };
  }

  // 交互优化：如果未开始断食，默认进入编辑模式，但这里不需要额外代码，
  // 因为我们将通过 v-if 逻辑直接控制显示。
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// --- 核心计算逻辑 ---
const elapsedMs = computed(() => {
  if (!isFasting.value) return 0;
  return Math.max(0, now.value - (fastingState.value.startTime || 0));
});

const elapsedHours = computed(() => elapsedMs.value / (1000 * 60 * 60));

const progress = computed(() => {
  const target = fastingState.value.targetHours || 16;
  return Math.min(100, (elapsedHours.value / target) * 100);
});

// 预计进食时间
const eatingTimeDate = computed(() => {
  if (!isFasting.value) return null;
  const start = fastingState.value.startTime;
  const target = fastingState.value.targetHours || 16;
  return new Date(start + target * 60 * 60 * 1000);
});

const eatingTimeString = computed(() => {
  if (!eatingTimeDate.value) return '--:--';
  const d = eatingTimeDate.value;
  const today = new Date();
  const isToday = d.getDate() === today.getDate();
  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return isToday ? `今天 ${timeStr}` : `明天 ${timeStr}`;
});

const startTimeString = computed(() => {
  if (!fastingState.value.startTime) return '--:--';
  const d = new Date(fastingState.value.startTime);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
});

const formattedDuration = computed(() => {
  const totalSec = Math.floor(elapsedMs.value / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

// 生理阶段科普
const physiologicalPhase = computed(() => {
  const h = elapsedHours.value;
  if (h < 4) return { title: '消化期', desc: '血糖上升', color: 'text-slate-500' };
  if (h < 12) return { title: '代谢期', desc: '消耗糖原', color: 'text-emerald-600' };
  if (h < 16) return { title: '燃脂期', desc: '脂肪氧化', color: 'text-emerald-700' };
  return { title: '细胞自噬', desc: '深度清理', color: 'text-emerald-800' };
});

// --- 编辑逻辑 ---
const isEditing = ref(false);
const editStartTime = ref(0);
const editTargetHours = ref(16);

const initEdit = () => {
  // 初始化数据
  if (isFasting.value) {
    editStartTime.value = fastingState.value.startTime;
    editTargetHours.value = fastingState.value.targetHours;
  } else {
    // 智能推断开始时间：补录逻辑
    const lastMeal = store.lastMealTime;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (lastMeal && lastMeal > oneDayAgo && lastMeal < Date.now()) {
      editStartTime.value = lastMeal;
    } else {
      editStartTime.value = Date.now();
    }
    editTargetHours.value = fastingState.value.targetHours || 16;
  }
  isEditing.value = true;
};

// 监听打开，如果未开始，自动初始化编辑数据
const handleShow = () => {
  if (!isFasting.value) {
    initEdit();
  }
}
// 在模板中使用 v-if 逻辑替代 watch，更直观

const editTimeDisplay = computed(() => {
  const d = new Date(editStartTime.value);
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  const isYesterday = new Date(today.getTime() - 86400000).getDate() === d.getDate();
  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (isToday) return `今天 ${timeStr}`;
  if (isYesterday) return `昨天 ${timeStr}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`;
});

const adjustTime = (minutes: number) => {
  let newTime = editStartTime.value + minutes * 60 * 1000;
  if (newTime > Date.now()) newTime = Date.now();
  editStartTime.value = newTime;
};

const setTimeNow = () => { editStartTime.value = Date.now(); };

const saveConfig = () => {
  if (isFasting.value) {
    store.heroStore.updateFastingStartTime(editStartTime.value);
    store.user.fasting.targetHours = editTargetHours.value;
    showToast('计划已修正');
  } else {
    store.heroStore.startFasting(editStartTime.value, editTargetHours.value);
    showToast({ message: '断食计划启动', icon: 'success' });
  }
  store.saveState();
  isEditing.value = false;
};

// 取消编辑
const cancelEdit = () => {
  if (isFasting.value) {
    // 正在进行中，取消编辑回到仪表盘
    isEditing.value = false;
  } else {
    // 未开始，取消即关闭模态框
    show.value = false;
  }
};

const stopFasting = () => {
  showConfirmDialog({
    title: '结束断食记录',
    message: `确认结束吗？\n结束后将进入 ${24 - fastingState.value.targetHours} 小时进食窗口。`,
    confirmButtonText: '确认结束',
    confirmButtonColor: '#059669',
  }).then(() => {
    store.heroStore.stopFasting();
    store.saveState();
    // 停止后，自动回到选择界面（因为 !isFasting 为真）
    initEdit();
    isEditing.value = false;
  }).catch(() => {});
};

const PRESET_HOURS = [14, 16, 18, 20];

// 16+8 模式科普文案
const presetDescriptions: Record<number, string> = {
  14: '新手适应：适合初次尝试，给肠胃放个小假',
  16: '黄金标准 (16+8)：8小时内进食，激活身体修复',
  18: '进阶燃脂：延长空腹时间，加速脂肪代谢',
  20: '战士模式：强力减脂，建议有经验后尝试'
};

const currentPresetDesc = computed(() => {
  return presetDescriptions[editTargetHours.value] || `自定义计划：断食 ${editTargetHours.value} 小时`;
});

const progressColor = computed(() => {
  if (isPure.value) return '#0f172a'; // Slate-900 for Pure Mode (Black/Dark Grey)
  if (elapsedHours.value >= fastingState.value.targetHours) return '#059669';
  return '#10b981';
});
</script>

<template>
  <van-popup
    v-model:show="show"
    :position="isPure ? 'right' : 'bottom'"
    :round="!isPure"
    :style="{ height: isPure ? '100%' : 'auto', maxHeight: isPure ? '100%' : '92%', width: '100%' }"
    class="flex flex-col overflow-hidden transition-all duration-300"
    :class="isPure ? 'bg-white dark:bg-black' : 'bg-slate-50 dark:bg-slate-900'"
    safe-area-inset-bottom
    @open="handleShow"
  >
    <div class="flex flex-col relative h-full transition-colors duration-300"
         :class="isPure ? 'p-8 pt-12' : 'p-6 min-h-[500px]'">

      <!-- Header -->
      <div class="flex justify-between items-center mb-6 relative z-10 shrink-0">
        <div class="flex flex-col">
          <h3 class="font-bold text-xl flex items-center tracking-tight font-sans"
              :class="isPure ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-100'">
            {{ isPure ? '断食计时器' : '16:8 间歇性断食' }}
          </h3>
          <span v-if="!isPure" class="text-xs text-slate-500 font-medium mt-0.5">
            专业饮食窗口管理工具
          </span>
        </div>

        <div class="flex gap-3 items-center">
          <!-- 仅在进行中且非编辑状态显示调整按钮 -->
          <button v-if="isFasting && !isEditing" @click="initEdit"
                  class="text-xs font-bold px-3 py-1.5 active:scale-95 transition border rounded"
                  :class="[
                    isPure
                      ? 'border-black text-black dark:border-white dark:text-white'
                      : 'bg-white border-slate-200 text-slate-700 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                  ]">
            调整
          </button>
          <van-icon
            :name="isPure ? 'cross' : 'arrow-down'"
            @click="show = false"
            class="text-lg active:scale-90 cursor-pointer p-1"
            :class="isPure ? 'text-black dark:text-white' : 'text-slate-400 hover:text-slate-600'"
          />
        </div>
      </div>

      <!-- === 视图逻辑重构：直接根据是否在断食来决定显示内容 === -->
      <transition name="fade-slide" mode="out-in">

        <!-- 状态A: 正在断食中 -> 显示仪表盘 -->
        <div v-if="isFasting && !isEditing" class="flex-1 flex flex-col relative z-10 h-full">

          <!-- 1. 仪表盘区域 (纯净模式下垂直居中布局) -->
          <div class="relative flex flex-col items-center justify-center shrink-0 transition-all duration-500"
               :class="isPure ? 'flex-1 py-0' : 'py-4 mb-6'">
            <!-- 环形进度 -->
            <div class="relative flex items-center justify-center transition-all duration-500"
                 :class="isPure ? 'w-64 h-64' : 'w-60 h-60'">
              <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke-width="3"
                        :class="isPure ? 'stroke-slate-100 dark:stroke-slate-800' : 'stroke-slate-200 dark:stroke-slate-800'" />
                <circle v-if="isFasting" cx="50" cy="50" r="45" fill="none"
                        :stroke="progressColor" stroke-width="3" stroke-linecap="round"
                        :stroke-dasharray="283"
                        :stroke-dashoffset="283 - (283 * progress / 100)"
                        class="transition-all duration-1000 ease-linear" />
              </svg>

              <!-- 环中数据 -->
              <div class="text-center z-10 flex flex-col items-center justify-center w-full">
                <div class="text-xs font-bold uppercase tracking-wider mb-2" :class="isPure ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'">
                  {{ isPure ? '已断食' : '当前已断食' }}
                </div>
                <div class="text-5xl font-bold font-mono tracking-tighter tabular-nums mb-2"
                     :class="isPure ? 'text-black dark:text-white' : 'text-slate-800 dark:text-white'">
                  {{ formattedDuration }}
                </div>
                <!-- 纯净模式下环内尽量干净 -->
                <div v-if="!isPure" class="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                  <i class="fas fa-check-circle text-xs text-emerald-600 dark:text-emerald-400"></i>
                  <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {{ physiologicalPhase.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- === 纯净模式专属：极简数据清单 (已全面汉化) === -->
          <div v-if="isPure" class="w-full px-4 mb-8 animate-fade-in shrink-0">
            <div class="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
              <!-- Row 1: Start Time -->
              <div class="flex justify-between items-center group">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">开始时间</span>
                <span class="text-sm font-mono font-bold text-black dark:text-white">{{ startTimeString }}</span>
              </div>

              <!-- Row 2: Target -->
              <div class="flex justify-between items-center group">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">目标时长</span>
                <span class="text-sm font-mono font-bold text-black dark:text-white">{{ fastingState.targetHours }} 小时</span>
              </div>

              <!-- Row 3: Eating Window (Most Important) -->
              <div class="flex justify-between items-center group">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">预计开饭</span>
                <span class="text-sm font-mono font-bold text-black dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-sm">
                    {{ eatingTimeString }}
                  </span>
              </div>
            </div>
          </div>

          <!-- === 专业模式信息卡 (保持原样) === -->
          <div v-else class="grid grid-cols-2 gap-3 mb-6 w-full animate-fade-in shrink-0">
            <!-- 预计进食时间 -->
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">进食开始时间</div>
              <div class="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-baseline gap-1">
                <i class="fas fa-utensils text-xs text-slate-400"></i>
                {{ eatingTimeString }}
              </div>
            </div>
            <!-- 目标完成度 -->
            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">目标时长</div>
              <div class="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-1 flex items-baseline gap-1">
                <i class="fas fa-flag-checkered text-xs text-emerald-500/50"></i>
                {{ fastingState.targetHours }} 小时
              </div>
            </div>
          </div>

          <!-- 3. 补水指引 (仅在专业模式显示，纯净模式隐藏) -->
          <div v-if="!isPure" class="mb-6 w-full animate-fade-in delay-75 shrink-0">
            <div class="relative overflow-hidden rounded-xl border p-4 flex items-center justify-between bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300">
                  当前允许摄入 (无热量)
                </span>
                <div class="flex gap-4 mt-1">
                  <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <i class="fas fa-tint text-blue-500"></i> <span class="text-xs font-bold">水</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <i class="fas fa-mug-hot text-amber-700/70 dark:text-amber-500"></i> <span class="text-xs font-bold">黑咖啡</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <i class="fas fa-leaf text-emerald-600/70 dark:text-emerald-500"></i> <span class="text-xs font-bold">茶</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. 底部主控按钮 (纯净模式下更加极简) -->
          <div class="mt-auto shrink-0" :class="isPure ? 'pb-0' : 'pt-4'">
            <button @click="stopFasting"
                    class="w-full py-4 font-bold text-base active:scale-[0.98] transition-all border flex items-center justify-center gap-2"
                    :class="[
                       isPure
                         ? 'bg-white border-black text-black hover:bg-slate-50 dark:bg-black dark:border-white dark:text-white rounded-sm tracking-widest uppercase text-sm'
                         : 'bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-red-400 rounded-xl'
                     ]">
              <i class="fas fa-utensils text-xs" v-if="!isPure"></i> {{ isPure ? '结束断食 / 吃饭' : '结束断食 (开始进食)' }}
            </button>
          </div>
        </div>

        <!-- 状态B: 未断食 或 正在编辑中 -> 显示模式选择界面 (直达核心) -->
        <!-- 当 !isFasting 时，会直接显示这里，跳过待机仪表盘 -->
        <div v-else class="flex-1 w-full relative z-10 animate-fade-in flex flex-col gap-6">
          <div class="text-sm font-bold text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            计划设定
          </div>

          <!-- 目标设定 (增强科普逻辑) -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <label class="text-xs font-bold uppercase text-slate-500">选择断食模式</label>
              <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-900/30 dark:text-emerald-400">
                 进食窗口: {{ 24 - editTargetHours }} 小时
               </span>
            </div>

            <!-- 按钮组 -->
            <div class="grid grid-cols-4 gap-2">
              <button v-for="h in PRESET_HOURS" :key="h" @click="editTargetHours = h"
                      class="py-3 text-sm font-bold transition-all border font-mono relative"
                      :class="[
                         isPure ? 'rounded-sm' : 'rounded-lg',
                         editTargetHours === h
                           ? (isPure ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'bg-emerald-600 text-white border-emerald-600')
                           : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                       ]">
                {{ h }}h
              </button>
            </div>

            <!-- 动态科普文案 -->
            <div class="text-xs text-slate-500 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 flex gap-2">
              <i class="fas fa-info-circle mt-0.5 text-emerald-500"></i>
              <span>{{ currentPresetDesc }}</span>
            </div>
          </div>

          <!-- 时间设定 (保留减去时间逻辑) -->
          <div class="space-y-3">
            <label class="text-xs font-bold uppercase text-slate-500">开始时间 (支持补录)</label>
            <div class="flex items-center justify-between p-4 border transition-colors"
                 :class="[
                   isPure
                     ? 'bg-white border-black dark:bg-black dark:border-white rounded-sm'
                     : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-xl'
                 ]">
              <span class="text-xl font-mono font-bold" :class="isPure ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'">
                {{ editTimeDisplay }}
              </span>
              <button @click="setTimeNow" class="text-xs font-bold px-3 py-1.5 rounded"
                      :class="isPure ? 'bg-slate-200 text-slate-800' : 'bg-white border border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'">
                设为现在
              </button>
            </div>
            <!-- 微调 -->
            <div class="grid grid-cols-4 gap-2">
              <button @click="adjustTime(-60)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">-1时</button>
              <button @click="adjustTime(-10)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">-10分</button>
              <button @click="adjustTime(10)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">+10分</button>
              <button @click="adjustTime(60)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">+1时</button>
            </div>
            <div class="text-[10px] text-slate-400 text-center mt-1">
              * 如果您忘记开始记录，请使用减号按钮将时间调回实际停止进食的时刻
            </div>
          </div>

          <div class="flex gap-3 mt-auto mb-2">
            <button @click="cancelEdit"
                    class="flex-1 py-4 font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 active:scale-95 transition"
                    :class="isPure ? 'rounded-sm' : 'rounded-xl'">
              取消
            </button>
            <button @click="saveConfig"
                    class="flex-[2] py-4 font-bold text-white active:scale-95 transition hover:opacity-90"
                    :class="[
                      isPure ? 'bg-black dark:bg-white dark:text-black rounded-sm' : 'bg-emerald-600 rounded-xl'
                    ]">
              {{ isFasting ? '确认修改' : '开始计时' }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </van-popup>
</template>

<style scoped>
.adjust-btn {
  @apply py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 active:scale-95 transition-all hover:border-emerald-400 dark:hover:border-emerald-600;
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(8px); }

.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
