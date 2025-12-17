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
    if (!val) isEditing.value = false; // 关闭时重置编辑状态
  }
});

// 安全访问 fasting 对象
const fastingState = computed(() => store.user.fasting || { isFasting: false, startTime: 0, targetHours: 16 });
const isFasting = computed(() => fastingState.value.isFasting);

// 计时器
const now = ref(Date.now());
let timer: number | null = null;

const updateNow = () => { now.value = Date.now(); };

onMounted(() => {
  timer = window.setInterval(updateNow, 1000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

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

// --- 全新设计：手动配置逻辑 (无弹窗，纯面板) ---
const isEditing = ref(false); // 是否处于编辑模式
const editStartTime = ref(0);
const editTargetHours = ref(16);

// 初始化编辑数据
const initEdit = () => {
  if (isFasting.value) {
    editStartTime.value = fastingState.value.startTime;
    editTargetHours.value = fastingState.value.targetHours;
  } else {
    // 默认开始时间逻辑
    const lastMeal = store.lastMealTime;
    // 如果上一餐在24小时内，且不早于现在(逻辑上不可能，但防卫一下)，默认为上一餐
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

// 时间显示格式化
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

// 快捷调整时间 (替代丑陋的 DatePicker)
const adjustTime = (minutes: number) => {
  let newTime = editStartTime.value + minutes * 60 * 1000;
  if (newTime > Date.now()) newTime = Date.now(); // 不能选未来
  editStartTime.value = newTime;
};

const setTimeNow = () => {
  editStartTime.value = Date.now();
};

const setTimeYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const current = new Date(editStartTime.value);
  current.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
  editStartTime.value = current.getTime();
};

// 保存配置
const saveConfig = () => {
  if (editTargetHours.value < 1) editTargetHours.value = 1;

  if (isFasting.value) {
    // 修改进行中
    store.heroStore.updateFastingStartTime(editStartTime.value);
    store.user.fasting.targetHours = editTargetHours.value;
    showToast('计划已调整');
  } else {
    // 开始新断食
    store.heroStore.startFasting(editStartTime.value, editTargetHours.value);
    showToast(isPure.value ? '断食开始' : '虚空冥想已开启！');
  }
  store.saveState();
  isEditing.value = false;
};

// 停止断食
const stopFasting = () => {
  showConfirmDialog({
    title: isPure.value ? '结束断食' : '打破冥想',
    message: `本次时长 ${formattedDuration.value}。确定要结束吗？`,
    confirmButtonText: '结束',
    confirmButtonColor: '#ef4444'
  }).then(() => {
    store.heroStore.stopFasting();
    store.saveState();
    showToast('已结束');
    isEditing.value = false;
  }).catch(() => {});
};

// RPG 氛围文案
const rpgStatusText = computed(() => {
  if (elapsedHours.value < 12) return '冥想初期... 意志坚定';
  if (elapsedHours.value < 16) return '正在蓄力... 能量涌动';
  return '蓄力完成！下一次攻击伤害翻倍！';
});

// 常用时长预设
const PRESET_HOURS = [16, 18, 20, 24];
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: 'auto', maxHeight: '85%' }"
    class="flex flex-col dark:bg-slate-900 overflow-hidden transition-all duration-300"
    safe-area-inset-bottom
  >
    <div class="p-6 bg-white dark:bg-slate-900 flex flex-col relative min-h-[350px]">

      <!-- RPG 背景 -->
      <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
      <div v-if="!isPure && isFasting" class="absolute inset-0 bg-purple-900/10 animate-pulse pointer-events-none"></div>

      <!-- Header -->
      <div class="flex justify-between items-center mb-4 relative z-10">
        <h3 class="font-bold text-xl flex items-center dark:text-white">
          <i class="fas fa-hourglass-half text-purple-500 mr-2"></i>
          {{ isPure ? '断食追踪' : '虚空冥想室' }}
        </h3>
        <div class="flex gap-3">
          <button v-if="!isEditing && isFasting" @click="initEdit" class="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg active:scale-95 transition">
            修改
          </button>
          <van-icon name="arrow-down" @click="show = false" class="text-slate-400 text-lg active:scale-90" />
        </div>
      </div>

      <!-- === 状态展示视图 (非编辑模式) === -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="!isEditing" class="flex-1 flex flex-col items-center justify-center relative z-10 py-2">

          <!-- 圆环进度 -->
          <div class="relative w-56 h-56 flex items-center justify-center mb-6">
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" stroke-width="6" class="dark:stroke-slate-700" />
              <circle v-if="isFasting" cx="50" cy="50" r="45" fill="none" stroke="#a855f7" stroke-width="6"
                      stroke-linecap="round"
                      :stroke-dasharray="283"
                      :stroke-dashoffset="283 - (283 * progress / 100)"
                      class="transition-all duration-1000 ease-linear drop-shadow-md" />
            </svg>

            <div class="text-center z-10">
              <div v-if="isFasting">
                <div class="text-xs text-slate-400 mb-1 uppercase tracking-widest font-bold">{{ isPure ? '已进行' : '蓄力中' }}</div>
                <div class="text-4xl font-black font-mono text-slate-800 dark:text-white tracking-tight">{{ formattedDuration }}</div>
                <div class="text-[10px] text-slate-400 mt-2 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                  计划 {{ fastingState.targetHours }}h · {{ Math.floor(progress) }}%
                </div>
              </div>
              <div v-else>
                <div class="text-5xl mb-2 opacity-50 grayscale">🧘</div>
                <div class="text-sm text-slate-400 font-bold">准备开始</div>
              </div>
            </div>
          </div>

          <!-- 底部主按钮 -->
          <button v-if="!isFasting" @click="initEdit"
                  class="w-full py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/30 flex items-center justify-center gap-2">
            <i class="fas fa-play"></i> 开始断食
          </button>

          <button v-else @click="stopFasting"
                  class="w-full py-4 rounded-2xl font-bold text-lg border-2 border-red-100 text-red-500 dark:bg-slate-800 dark:border-red-900/50 active:scale-95 transition-all flex items-center justify-center gap-2">
            <i class="fas fa-stop"></i> {{ isPure ? '结束断食' : '停止冥想' }}
          </button>

          <div v-if="!isPure && isFasting" class="mt-4 text-xs text-purple-500 font-bold animate-pulse">
            {{ rpgStatusText }}
          </div>
        </div>

        <!-- === 编辑/配置视图 (内嵌) === -->
        <div v-else class="flex-1 w-full relative z-10 animate-fade-in flex flex-col gap-4">

          <!-- 1. 目标时长设置 (手动输入) -->
          <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm font-bold text-slate-500">目标时长 (小时)</span>
              <input
                type="number"
                v-model.number="editTargetHours"
                class="w-20 text-right bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 font-black text-purple-600 text-lg outline-none focus:border-purple-500"
              />
            </div>

            <div class="flex gap-2 justify-between">
              <button v-for="h in PRESET_HOURS" :key="h" @click="editTargetHours = h"
                      class="flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all"
                      :class="editTargetHours === h ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent bg-white dark:bg-slate-700 text-slate-500'">
                {{ h }}h
              </button>
            </div>
          </div>

          <!-- 2. 开始时间设置 (按钮微调，放弃丑陋表格) -->
          <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
            <div class="flex justify-between items-center mb-4">
              <span class="text-sm font-bold text-slate-500">开始时间</span>
              <span class="text-lg font-black text-slate-800 dark:text-white font-mono bg-white dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                {{ editTimeDisplay }}
              </span>
            </div>

            <div class="grid grid-cols-4 gap-2 mb-2">
              <button @click="adjustTime(-60)" class="adjust-btn">-1h</button>
              <button @click="adjustTime(-10)" class="adjust-btn">-10m</button>
              <button @click="adjustTime(10)" class="adjust-btn">+10m</button>
              <button @click="adjustTime(60)" class="adjust-btn">+1h</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button @click="setTimeYesterday" class="adjust-btn bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200">昨天此时</button>
              <button @click="setTimeNow" class="adjust-btn bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">现在</button>
            </div>
          </div>

          <div class="flex gap-3 mt-auto pt-2">
            <button @click="isEditing = false" class="flex-1 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 active:scale-95 transition">
              取消
            </button>
            <button @click="saveConfig" class="flex-[2] py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg active:scale-95 transition">
              {{ isFasting ? '保存修改' : '确认开始' }}
            </button>
          </div>

        </div>
      </transition>

    </div>
  </van-popup>
</template>

<style scoped>
.adjust-btn {
  @apply py-2.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-transform;
}
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(10px); }
</style>
