<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const isPure = computed(() => systemStore.isPureMode);
const show = computed({
  get: () => systemStore.modals.fasting,
  set: (val) => {
    systemStore.setModal('fasting', val);
    if (!val) isEditing.value = false;
  }
});

// 安全访问 fasting 对象
const fastingState = computed(() => store.user.fasting || { isFasting: false, startTime: 0, targetHours: 16 });
const isFasting = computed(() => fastingState.value.isFasting);

// 计时器
const now = ref(Date.now());
let timer: number | null = null;
const updateNow = () => { now.value = Date.now(); };

onMounted(() => { timer = window.setInterval(updateNow, 1000); });
onUnmounted(() => { if (timer) clearInterval(timer); });

// 计算属性
const elapsedMs = computed(() => {
  if (!isFasting.value) return 0;
  return Math.max(0, now.value - (fastingState.value.startTime || 0));
});
const elapsedHours = computed(() => elapsedMs.value / (1000 * 60 * 60));
const progress = computed(() => {
  const target = fastingState.value.targetHours || 16;
  return Math.min(100, (elapsedHours.value / target) * 100);
});
const formattedDuration = computed(() => {
  const totalSec = Math.floor(elapsedMs.value / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

// --- 编辑逻辑 ---
const isEditing = ref(false);
const editStartTime = ref(0);
const editTargetHours = ref(16);

const initEdit = () => {
  if (isFasting.value) {
    editStartTime.value = fastingState.value.startTime;
    editTargetHours.value = fastingState.value.targetHours;
  } else {
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

const editTimeDisplay = computed(() => {
  const d = new Date(editStartTime.value);
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  const isYesterday = new Date(today.getTime() - 86400000).getDate() === d.getDate();
  const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  if (isToday) return `今天 ${timeStr}`;
  if (isYesterday) return `昨天 ${timeStr}`;
  return `${d.getMonth()+1}/${d.getDate()} ${timeStr}`;
});

const adjustTime = (minutes: number) => {
  let newTime = editStartTime.value + minutes * 60 * 1000;
  if (newTime > Date.now()) newTime = Date.now();
  editStartTime.value = newTime;
};
const setTimeNow = () => { editStartTime.value = Date.now(); };
const setTimeYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const current = new Date(editStartTime.value);
  current.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  editStartTime.value = current.getTime();
};

const saveConfig = () => {
  if (editTargetHours.value < 1) editTargetHours.value = 1;
  if (isFasting.value) {
    store.heroStore.updateFastingStartTime(editStartTime.value);
    store.user.fasting.targetHours = editTargetHours.value;
    showToast('计划已更新');
  } else {
    store.heroStore.startFasting(editStartTime.value, editTargetHours.value);
    showToast(isPure.value ? '计时开始' : '能量力场启动');
  }
  store.saveState();
  isEditing.value = false;
};

const stopFasting = () => {
  showConfirmDialog({
    title: isPure.value ? '结束记录' : '停止蓄力',
    message: `本次时长 ${formattedDuration.value}。确认结束吗？`,
    confirmButtonText: '结束',
    confirmButtonColor: '#ef4444'
  }).then(() => {
    store.heroStore.stopFasting();
    store.saveState();
    showToast('已结束');
    isEditing.value = false;
  }).catch(() => {});
};

const PRESET_HOURS = [16, 18, 20, 24];

// 进度颜色 (纯色 Hex)
const progressColor = computed(() => {
  if (isPure.value) return '#334155'; // Slate-700 (High contrast tool style)
  if (elapsedHours.value >= 16) return '#10b981'; // Emerald
  if (elapsedHours.value >= 12) return '#3b82f6'; // Blue
  return '#0ea5e9'; // Sky
});
</script>

<template>
  <van-popup
    v-model:show="show"
    :position="isPure ? 'right' : 'bottom'"
    :round="!isPure"
    :style="{ height: isPure ? '100%' : 'auto', maxHeight: isPure ? '100%' : '90%', width: isPure ? '100%' : '100%' }"
    class="flex flex-col dark:bg-slate-900 overflow-hidden transition-all duration-300"
    safe-area-inset-bottom
  >
    <!-- 全屏模式下增加 paddingTop 以避开刘海屏/状态栏 -->
    <div class="flex flex-col relative transition-colors duration-300 h-full"
         :class="[
           isPure ? 'bg-slate-50 dark:bg-black p-6 pt-12' : 'bg-white dark:bg-slate-900 p-6 min-h-[400px]'
         ]">

      <!-- 背景：RPG模式下保留极淡的纹理 -->
      <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5 pointer-events-none"></div>

      <!-- Header -->
      <div class="flex justify-between items-center mb-8 relative z-10"
           :class="isPure ? 'border-b border-slate-200 dark:border-slate-800 pb-4' : ''">
        <h3 class="font-bold text-xl flex items-center tracking-tight"
            :class="isPure ? 'text-slate-900 dark:text-white font-mono' : 'text-slate-800 dark:text-white'">
          <i
            class="mr-3"
            :class="[
              isPure ? 'fas fa-stopwatch' : 'fas fa-bolt',
              isPure ? 'text-slate-900 dark:text-white' : 'text-sky-500'
            ]"
          ></i>
          {{ isPure ? '断食计时器' : '能量蓄力站' }}
        </h3>
        <div class="flex gap-4 items-center">
          <button v-if="!isEditing && isFasting" @click="initEdit"
                  class="text-xs font-bold px-3 py-1.5 active:scale-95 transition border"
                  :class="isPure ? 'bg-white border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 rounded-sm' : 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 border-transparent rounded'">
            编辑
          </button>

          <!-- 纯净模式下显示类似“返回”的关闭按钮，RPG模式下显示“向下收起” -->
          <van-icon
            :name="isPure ? 'cross' : 'arrow-down'"
            @click="show = false"
            class="text-lg active:scale-90 cursor-pointer"
            :class="isPure ? 'text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
          />
        </div>
      </div>

      <!-- === 状态展示视图 (非编辑模式) === -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="!isEditing" class="flex-1 flex flex-col items-center justify-between relative z-10">

          <!-- 圆环进度 -->
          <div class="relative flex items-center justify-center mb-10 transition-all duration-300"
               :class="isPure ? 'w-72 h-72 mt-10' : 'w-64 h-64 mt-2'">
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <!-- 底环 -->
              <circle cx="50" cy="50" r="45" fill="none" stroke-width="3"
                      :class="isPure ? 'stroke-slate-200 dark:stroke-slate-800' : 'stroke-slate-100 dark:stroke-slate-800'" />
              <!-- 进度环 -->
              <circle v-if="isFasting" cx="50" cy="50" r="45" fill="none" :stroke="progressColor" stroke-width="3"
                      stroke-linecap="round"
                      :stroke-dasharray="283"
                      :stroke-dashoffset="283 - (283 * progress / 100)"
                      class="transition-all duration-1000 ease-linear" />
            </svg>

            <!-- 中心内容 -->
            <div class="text-center z-10 flex flex-col items-center justify-center">
              <div v-if="isFasting">
                <!-- 纯净模式：仪表盘风格，超大数字 -->
                <div v-if="isPure" class="flex flex-col items-center">
                  <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ELAPSED TIME</div>
                  <div class="text-6xl font-bold font-mono text-slate-900 dark:text-white tracking-tighter tabular-nums mb-4">
                    {{ formattedDuration }}
                  </div>
                  <div class="flex items-center gap-2 text-xs font-medium text-slate-500 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-sm">
                    <i class="fas fa-bullseye"></i> 目标 {{ fastingState.targetHours }} H · 进度 {{ Math.floor(progress) }}%
                  </div>
                </div>

                <!-- RPG模式 -->
                <div v-else class="flex flex-col items-center">
                  <div class="text-3xl text-sky-500 mb-2"><i class="fas fa-bolt animate-pulse"></i></div>
                  <div class="text-5xl font-black font-mono text-slate-800 dark:text-white tracking-tighter tabular-nums mb-2">
                    {{ formattedDuration }}
                  </div>
                  <div class="text-xs font-bold text-sky-500 dark:text-sky-400">
                    {{ elapsedHours < 16 ? '正在积蓄能量...' : '蓄力完成' }}
                  </div>
                </div>
              </div>

              <!-- 未开始状态 -->
              <div v-else class="flex flex-col items-center">
                <div class="w-24 h-24 flex items-center justify-center text-5xl mb-6 transition-transform duration-500"
                     :class="isPure ? 'text-slate-300 dark:text-slate-700 border-2 border-slate-200 dark:border-slate-800 rounded-full' : 'bg-sky-50 text-sky-300 dark:bg-slate-800 dark:text-sky-600 rounded-full hover:scale-105'">
                  <i :class="isPure ? 'fas fa-power-off' : 'fas fa-flask'"></i>
                </div>
                <div class="text-lg font-bold text-slate-500 dark:text-slate-400">{{ isPure ? '计时器待机' : '能量槽空置' }}</div>
                <div v-if="isPure" class="text-xs text-slate-400 mt-2">点击下方按钮开始计时</div>
              </div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="w-full mt-auto mb-6">
            <button v-if="!isFasting" @click="initEdit"
                    class="w-full py-4 font-bold text-lg active:scale-98 transition-all flex items-center justify-center gap-3"
                    :class="isPure ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-sm shadow-sm' : 'bg-sky-500 text-white hover:bg-sky-600 rounded-xl shadow-lg shadow-sky-200 dark:shadow-none'">
              <i class="fas fa-play text-sm"></i> {{ isPure ? '启动计时' : '开始蓄力' }}
            </button>

            <button v-else @click="stopFasting"
                    class="w-full py-4 font-bold text-lg active:scale-98 transition-all border flex items-center justify-center gap-3"
                    :class="isPure ? 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-black dark:border-slate-700 dark:text-white rounded-sm' : 'bg-white border-red-100 text-red-500 hover:bg-red-50 dark:bg-slate-800 dark:border-red-900/30 rounded-xl'">
              <i class="fas fa-stop text-sm"></i> {{ isPure ? '停止 / 结算' : '停止蓄力' }}
            </button>
          </div>
        </div>

        <!-- === 编辑/配置视图 (扁平化表单) === -->
        <div v-else class="flex-1 w-full relative z-10 animate-fade-in flex flex-col gap-8 mt-4">
          <!-- 标题 -->
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <i class="fas fa-cog"></i> 设定参数
          </div>

          <!-- 时长 -->
          <div class="space-y-4">
            <div class="flex justify-between items-end">
              <span class="text-sm font-bold text-slate-600 dark:text-slate-300">目标时长</span>
              <div class="flex items-baseline gap-1">
                <input
                  type="number"
                  v-model.number="editTargetHours"
                  class="w-20 text-right bg-transparent font-bold text-3xl outline-none p-0 font-mono"
                  :class="isPure ? 'text-slate-900 dark:text-white' : 'text-sky-600 dark:text-sky-400'"
                />
                <span class="text-sm text-slate-400 font-medium">H</span>
              </div>
            </div>
            <div class="flex gap-2">
              <button v-for="h in PRESET_HOURS" :key="h" @click="editTargetHours = h"
                      class="flex-1 py-3 text-xs font-bold transition-all border font-mono"
                      :class="[
                        isPure ? 'rounded-sm' : 'rounded-lg',
                        editTargetHours === h
                          ? (isPure ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white' : 'bg-sky-500 text-white border-sky-500')
                          : 'bg-transparent border-slate-200 text-slate-500 dark:border-slate-700 hover:border-slate-300'
                      ]">
                {{ h }}h
              </button>
            </div>
          </div>

          <!-- 开始时间 -->
          <div class="space-y-4">
            <div class="flex justify-between items-end">
              <span class="text-sm font-bold text-slate-600 dark:text-slate-300">开始时间</span>
              <span class="text-lg font-bold font-mono" :class="isPure ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'">
                {{ editTimeDisplay }}
              </span>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <button @click="adjustTime(-60)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">-1h</button>
              <button @click="adjustTime(-10)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">-10m</button>
              <button @click="adjustTime(10)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">+10m</button>
              <button @click="adjustTime(60)" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">+1h</button>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button @click="setTimeYesterday" class="adjust-btn" :class="isPure ? 'rounded-sm' : 'rounded-lg'">昨天此时</button>
              <button @click="setTimeNow" class="adjust-btn font-bold"
                      :class="[isPure ? 'text-slate-900 dark:text-white rounded-sm bg-slate-200 dark:bg-slate-700' : 'text-sky-500 rounded-lg bg-sky-50 dark:bg-sky-900/20']">
                当前时间
              </button>
            </div>
          </div>

          <!-- 操作栏 -->
          <div class="flex gap-3 mt-auto mb-6">
            <button @click="isEditing = false" class="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 active:scale-95 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    :class="isPure ? 'rounded-sm' : 'rounded-xl'">
              取消
            </button>
            <button @click="saveConfig" class="flex-[2] py-4 font-bold text-white active:scale-95 transition hover:opacity-90"
                    :class="[isPure ? 'bg-slate-900 dark:bg-white dark:text-slate-900 rounded-sm' : 'bg-sky-500 rounded-xl']">
              确认设定
            </button>
          </div>
        </div>
      </transition>

    </div>
  </van-popup>
</template>

<style scoped>
.adjust-btn {
  @apply py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 active:scale-95 transition-transform hover:bg-slate-100 dark:hover:bg-slate-700;
}
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(5px); }
</style>
