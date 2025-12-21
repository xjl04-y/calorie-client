<script setup lang="ts">
/**
 * ModalAddExercise.vue
 * 独立的运动录入模块 (Single Responsibility)
 * - Pure Mode: 全屏窗口风格
 * - RPG Mode: 底部弹窗风格 (战备修整)
 * - V5.3 Feature: 强化自定义录入 & 动态体重计算
 */
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { DEFAULT_EXERCISES } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';
import type { FoodItem } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const isPure = computed(() => systemStore.isPureMode);
const user = computed(() => store.user); // 获取用户数据用于计算

const show = computed({
  get: () => systemStore.modals.addExercise,
  set: (val) => {
    systemStore.setModal('addExercise', val);
    if (!val) resetState(); // 关闭时重置状态
  }
});

const exerciseList = computed(() => DEFAULT_EXERCISES);

// --- 状态管理 ---
const mode = ref<'LIST' | 'CALCULATE' | 'MANUAL'>('LIST');
const selectedItem = ref<FoodItem | null>(null);

// 手动/计算输入状态
const manualName = ref('');
const manualDuration = ref(30);
const manualCalories = ref(200);

// --- 核心逻辑：动态计算 ---
const BASE_WEIGHT = 60; // 基准体重 60kg

// 根据体重和时长估算热量 (通用公式: METs * Weight * Hours)
// 这里简化为：基准热量 * (体重/60) * (时长/基准时长)
const calculatedCalories = computed(() => {
  // 如果在纯手动模式下，且用户修改了热量值，则不自动覆盖（这里简化处理，手动模式直接读取 manualCalories）
  if (mode.value === 'MANUAL') {
    // 简易估算：假设中等强度运动，每分钟消耗 0.1 kcal/kg
    // const estimate = Math.round(7 * (user.value.weight || 60) * (manualDuration.value / 60));
    return manualCalories.value;
  }

  if (!selectedItem.value) return 0;

  const baseCals = selectedItem.value.calories || 0;
  const baseDuration = selectedItem.value.grams || 30;
  const userWeight = user.value.weight || 60;

  // 1. 时长比例
  const timeRatio = manualDuration.value / baseDuration;
  // 2. 体重比例 (体重越大消耗越多)
  const weightRatio = userWeight / BASE_WEIGHT;

  return Math.round(baseCals * timeRatio * weightRatio);
});

// 监听时长变化，在手动模式下如果名字为空（或者是自定义），提供一个基础估算
watch(manualDuration, (newVal) => {
  if (mode.value === 'MANUAL') {
    // 粗略估算：假设平均强度，METs=6 左右 => ~6 kcal/kg/hr => 0.1 kcal/kg/min
    // 这是一个兜底值，用户可以改
    const weight = user.value.weight || 60;
    manualCalories.value = Math.round(0.1 * weight * newVal);
  }
});

// 选择预设项目 -> 进入计算模式
const selectExercise = (item: FoodItem) => {
  selectedItem.value = item;
  manualDuration.value = item.grams || 30; // 默认选中基准时长
  mode.value = 'CALCULATE';
};

// 提交逻辑
const submit = () => {
  if (manualDuration.value <= 0) {
    showToast('请输入有效时长');
    return;
  }

  let finalItem: FoodItem;

  if (mode.value === 'CALCULATE' && selectedItem.value) {
    finalItem = {
      ...selectedItem.value,
      calories: calculatedCalories.value,
      grams: manualDuration.value,
      // 增加动态提示，让用户知道这是算出来的
      tips: `基于 ${user.value.weight}kg 体重估算`,
      id: Date.now()
    };
  } else {
    // 纯手动模式
    if (!manualName.value.trim()) {
      manualName.value = isPure.value ? '自定义运动' : '秘密特训';
    }

    finalItem = {
      id: Date.now(),
      name: manualName.value,
      icon: '🧘', // 默认图标，后续可以扩展图标选择
      calories: manualCalories.value,
      p: 0, c: 0, f: 0,
      grams: manualDuration.value,
      unit: '分钟',
      tags: ['自定义'],
      isExercise: true,
      tips: `自主训练 (${manualDuration.value}min)`
    };
  }

  store.battleCommit(finalItem, 'EXERCISE');

  if (isPure.value) {
    show.value = false;
  } else {
    // RPG 模式下回到列表
    show.value = false;
  }
};

const resetState = () => {
  mode.value = 'LIST';
  selectedItem.value = null;
  manualDuration.value = 30;
  manualName.value = '';
  // 重置手动热量估算
  const weight = user.value.weight || 60;
  manualCalories.value = Math.round(0.1 * weight * 30);
};

// 动态样式
const popupStyles = computed(() => {
  if (isPure.value) {
    return { width: '100%', height: '100%', borderRadius: '0' };
  }
  return { height: '85%', borderRadius: '24px 24px 0 0' };
});

const popupPosition = computed(() => isPure.value ? 'right' : 'bottom');
</script>

<template>
  <van-popup
    v-model:show="show"
    :position="popupPosition"
    :style="popupStyles"
    class="flex flex-col dark:bg-slate-900 transition-all duration-300"
    safe-area-inset-bottom
  >
    <!-- Header -->
    <div class="px-4 py-4 flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10">
      <div v-if="mode !== 'LIST'" @click="mode = 'LIST'" class="text-slate-500 flex items-center cursor-pointer active:opacity-70">
        <van-icon name="arrow-left" class="mr-1" /> 返回
      </div>
      <div v-else-if="isPure" @click="show = false" class="text-slate-500 flex items-center cursor-pointer active:opacity-70">
        <van-icon name="arrow-left" class="mr-1" /> 返回
      </div>
      <van-icon v-else name="arrow-down" @click="show = false" class="text-slate-400 text-lg active:scale-90" />

      <div class="font-bold text-lg dark:text-white flex items-center gap-2">
        <i class="fas fa-running" :class="isPure ? 'text-green-600' : 'text-orange-500'"></i>
        <span v-if="mode === 'LIST'">{{ isPure ? '选择运动' : '战备修整' }}</span>
        <span v-else-if="mode === 'CALCULATE'">{{ selectedItem?.name }}</span>
        <span v-else>自定义记录</span>
      </div>

      <!-- 右上角快捷入口 -->
      <div class="flex-shrink-0">
        <span v-if="mode === 'LIST'" @click="mode = 'MANUAL'" class="text-xs text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded cursor-pointer active:scale-95 whitespace-nowrap inline-flex items-center">
            <i class="fas fa-plus mr-1"></i>自定义
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">

      <!-- 模式 A: 列表选择 -->
      <div v-if="mode === 'LIST'" class="space-y-3 animate-fade-in">
        <!-- 顶部 Banner (RPG only) -->
        <div v-if="!isPure" class="mb-4 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800 flex items-center gap-3">
          <div class="text-2xl">⛺</div>
          <div>
            <div class="text-xs font-bold text-orange-600 dark:text-orange-400">营地训练</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400">基于你的体重({{ user.weight }}kg)计算消耗，恢复 HP。</div>
          </div>
        </div>

        <div v-for="ex in exerciseList" :key="ex.id"
             @click="selectExercise(ex)"
             class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex justify-between items-center active:scale-95 transition cursor-pointer group hover:border-green-400">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 text-2xl flex items-center justify-center group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">
              {{ ex.icon }}
            </div>
            <div>
              <div class="font-bold text-slate-700 dark:text-white">{{ ex.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ ex.tips }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">点击计算</div>
          </div>
        </div>

        <!-- 列表底部的自定义入口 -->
        <div @click="mode = 'MANUAL'" class="mt-4 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-sm cursor-pointer active:bg-slate-100 dark:active:bg-slate-800">
          <i class="fas fa-pen mr-2"></i> 没有找到？手动录入
        </div>
      </div>

      <!-- 模式 B & C: 计算/手动详情 -->
      <div v-else class="space-y-6 animate-fade-in h-full flex flex-col pb-4">

        <!-- 大图标展示 -->
        <div class="flex justify-center my-2">
          <div class="w-20 h-20 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center text-4xl shadow-lg animate-bounce-slow">
            {{ mode === 'CALCULATE' ? selectedItem?.icon : '📝' }}
          </div>
        </div>

        <!-- 核心计算区 -->
        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">

          <!-- 手动模式下的名字输入 -->
          <div v-if="mode === 'MANUAL'">
            <div class="flex items-center gap-3">
              <label class="text-sm font-bold text-slate-500 whitespace-nowrap flex-shrink-0">运动名称</label>
              <input v-model="manualName" type="text" :placeholder="isPure ? '例如：打篮球' : '例如：剑术训练'" class="flex-1 min-w-0 bg-slate-100 dark:bg-slate-700 p-3 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 ring-green-500/50" />
            </div>
          </div>

          <!-- 时长滑块 -->
          <div>
            <div class="flex justify-between items-end mb-4">
              <label class="text-sm font-bold text-slate-500">运动时长</label>
              <div class="flex items-end gap-2">
                <input type="number" v-model.number="manualDuration" class="text-2xl font-black text-slate-800 dark:text-white bg-transparent w-20 text-right outline-none border-b border-slate-200 dark:border-slate-600 focus:border-green-500" />
                <span class="text-xs font-normal text-slate-400 mb-1">min</span>
              </div>
            </div>
            <van-slider v-model="manualDuration" :min="5" :max="180" :step="5" bar-height="8px" active-color="#10b981">
              <template #button>
                <div class="w-6 h-6 bg-white rounded-full shadow-md border-2 border-green-500 flex items-center justify-center text-[8px] font-bold text-green-600">
                  <i class="fas fa-clock"></i>
                </div>
              </template>
            </van-slider>
            <div class="flex justify-between text-[10px] text-slate-300 mt-2 font-mono">
              <span>5m</span>
              <span>60m</span>
              <span>120m</span>
              <span>180m</span>
            </div>
          </div>

          <div class="h-px bg-slate-100 dark:bg-slate-700"></div>

          <!-- 热量结果 -->
          <div class="text-center">
            <div class="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">
              消耗热量 ({{ mode === 'CALCULATE' ? '自动计算' : '可手动修改' }})
            </div>

            <div v-if="mode === 'CALCULATE'" class="flex items-center justify-center gap-2">
              <span class="text-4xl font-black text-green-500">{{ calculatedCalories }}</span>
              <span class="text-sm font-bold text-slate-400 mt-3">kcal</span>
            </div>

            <div v-else class="flex justify-center items-end gap-2">
              <input type="number" v-model.number="manualCalories" class="text-4xl font-black text-green-500 bg-transparent text-center w-32 outline-none border-b-2 border-slate-100 dark:border-slate-600 focus:border-green-500 transition-colors" />
              <span class="text-sm font-bold text-slate-400 mb-2">kcal</span>
            </div>

            <!-- 体重加成提示 -->
            <div v-if="mode === 'CALCULATE'" class="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600">
              <i class="fas fa-weight-hanging"></i>
              <span>体重加成: x{{ (user.weight / BASE_WEIGHT).toFixed(2) }}</span>
            </div>
            <div v-else class="mt-2 text-[10px] text-slate-400">
              * 默认值基于中等强度估算
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="mt-auto">
          <button @click="submit" class="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition flex items-center justify-center text-lg">
            <i class="fas fa-check-circle mr-2"></i> {{ isPure ? '记录运动' : '完成训练' }}
          </button>
        </div>

      </div>

    </div>
  </van-popup>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-bounce-slow { animation: bounce 2s infinite; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
</style>
