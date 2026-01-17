<script setup lang="ts">
/**
 * ExerciseDetailView.vue - 纯净模式运动记录页面
 * [New V6.0] 独立的运动记录页面，支持 RPG 和纯净模式
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useExerciseStore } from '@/stores/useExerciseStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast } from 'vant';

const router = useRouter();
const store = useGameStore();
const exerciseStore = useExerciseStore();
const systemStore = useSystemStore();

// 表单状态
const duration = ref(30);
const selectedIntensity = ref<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
const customName = ref('');
const useManualCalories = ref(false);
const manualCalories = ref(0);

// 运动预设列表
const presets = computed(() => exerciseStore.EXERCISE_PRESETS);

// 选中的预设
const selectedPresetId = ref('');
const selectedPreset = computed(() => {
  if (!selectedPresetId.value) return null;
  return presets.value.find(p => p.id === selectedPresetId.value) || null;
});

// 估算消耗热量
const estimatedCalories = computed(() => {
  if (useManualCalories.value) return manualCalories.value;
  if (!selectedPreset.value) return 0;

  return exerciseStore.calculateCalories(
    selectedPreset.value.baseCaloriesPerMin,
    duration.value,
    selectedIntensity.value
  );
});

// RPG 效果预览
const rpgEffects = computed(() => {
  const calories = estimatedCalories.value;
  const healAmt = 50 + Math.floor(calories / 10);

  const currentHp = store.user.heroCurrentHp;
  const maxHp = store.user.heroMaxHp;
  const missingHp = maxHp - currentHp;

  if (healAmt <= missingHp) {
    return { heal: healAmt, shield: 0, gold: 0 };
  }

  const overflow = healAmt - missingHp;
  const currentShield = store.user.heroShield || 0;
  const shieldSpace = maxHp - currentShield;

  if (shieldSpace > 0) {
    const shieldGained = Math.min(overflow, shieldSpace);
    const goldGained = Math.floor((overflow - shieldGained) * 0.5);
    return { heal: missingHp, shield: shieldGained, gold: goldGained };
  }

  return { heal: missingHp, shield: 0, gold: Math.floor(overflow * 0.5) };
});

// 今日统计
const todayStats = computed(() => exerciseStore.todayStats);

// 选择预设
function selectPreset(id: string) {
  selectedPresetId.value = id;
  const preset = presets.value.find(p => p.id === id);
  if (preset) {
    selectedIntensity.value = preset.intensity;
    customName.value = '';
  }
}

// 提交记录
function handleSubmit() {
  if (!selectedPreset.value && !customName.value) {
    showToast('请选择或输入运动类型');
    return;
  }

  if (duration.value <= 0) {
    showToast('请输入运动时长');
    return;
  }

  exerciseStore.commitExercise({
    name: customName.value || selectedPreset.value?.name || '运动',
    icon: selectedPreset.value?.icon || '🏃',
    duration: duration.value,
    caloriesBurned: estimatedCalories.value,
    intensity: selectedIntensity.value,
    baseExerciseId: selectedPresetId.value,
    tags: selectedPreset.value?.tags as unknown as string[]
  });

  showToast('运动记录成功！');
  router.back();
}

// 强度标签
const intensityLabels = {
  LOW: { label: '轻松', color: 'text-green-500', bg: 'bg-green-50' },
  MEDIUM: { label: '中等', color: 'text-orange-500', bg: 'bg-orange-50' },
  HIGH: { label: '剧烈', color: 'text-red-500', bg: 'bg-red-50' }
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between">
      <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">记录运动</span>
      <div class="w-8"></div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">

      <!-- 今日统计卡片 -->
      <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs opacity-80 mb-1">今日运动</div>
            <div class="text-2xl font-black">{{ todayStats.totalBurned }} <span class="text-sm font-normal">kcal</span></div>
          </div>
          <div class="text-right">
            <div class="text-xs opacity-80 mb-1">共 {{ todayStats.totalSessions }} 次</div>
            <div class="text-lg font-bold">{{ todayStats.totalDuration }} 分钟</div>
          </div>
        </div>
      </div>

      <!-- 运动类型选择 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">选择运动类型</h3>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="preset in presets"
            :key="preset.id"
            @click="selectPreset(preset.id)"
            class="flex flex-col items-center p-3 rounded-xl border-2 transition-all"
            :class="selectedPresetId === preset.id
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
              : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'"
          >
            <!-- Icon 渲染逻辑修改 Start -->
            <div class="w-8 h-8 mb-1 flex items-center justify-center">
              <svg v-if="preset.icon && preset.icon.startsWith('icon-')" class="w-full h-full fill-current text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                <use :xlink:href="'#' + preset.icon"></use>
              </svg>
              <span v-else class="text-2xl">{{ preset.icon }}</span>
            </div>
            <!-- Icon 渲染逻辑修改 End -->

            <span class="text-xs font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{{ preset.name }}</span>
          </button>
        </div>
      </div>

      <!-- 自定义名称 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">或自定义名称</h3>
        <input
          v-model="customName"
          type="text"
          placeholder="输入自定义运动名称..."
          class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
        />
      </div>

      <!-- 运动时长 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">运动时长 (分钟)</h3>
        <div class="flex items-center gap-3">
          <button
            @click="duration = Math.max(5, duration - 5)"
            class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xl active:scale-95 transition"
          >-</button>
          <input
            v-model.number="duration"
            type="number"
            min="1"
            class="flex-1 text-center text-2xl font-black py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
          />
          <button
            @click="duration += 5"
            class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xl active:scale-95 transition"
          >+</button>
        </div>
        <!-- 快速选择 -->
        <div class="flex gap-2 mt-2">
          <button
            v-for="d in [15, 30, 45, 60]"
            :key="d"
            @click="duration = d"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition"
            :class="duration === d ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
          >{{ d }}分钟</button>
        </div>
      </div>

      <!-- 运动强度 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">运动强度</h3>
        <div class="flex gap-2">
          <button
            v-for="(config, key) in intensityLabels"
            :key="key"
            @click="selectedIntensity = key as 'LOW' | 'MEDIUM' | 'HIGH'"
            class="flex-1 py-3 rounded-xl border-2 font-medium transition-all"
            :class="selectedIntensity === key
              ? `border-current ${config.color} ${config.bg}`
              : 'border-slate-100 dark:border-slate-700 text-slate-500'"
          >{{ config.label }}</button>
        </div>
      </div>

      <!-- 手动输入热量 -->
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-slate-600 dark:text-slate-300">手动输入消耗热量</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="useManualCalories" class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 dark:peer-focus:ring-emerald-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <input
          v-if="useManualCalories"
          v-model.number="manualCalories"
          type="number"
          min="0"
          placeholder="输入消耗热量 (kcal)"
          class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
        />
      </div>

      <!-- 预估效果 -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">预估效果</h3>

        <div class="text-center mb-4">
          <div class="text-4xl font-black text-emerald-600 dark:text-emerald-400">{{ estimatedCalories }}</div>
          <div class="text-sm text-slate-500">消耗热量 (kcal)</div>
        </div>

        <!-- RPG 效果预览 (非纯净模式) -->
        <div v-if="!systemStore.isPureMode" class="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div class="text-center">
            <div class="text-2xl mb-1">❤️</div>
            <div class="text-lg font-bold text-red-500">+{{ rpgEffects.heal }}</div>
            <div class="text-xs text-slate-400">HP恢复</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-1">🛡️</div>
            <div class="text-lg font-bold text-blue-500">+{{ rpgEffects.shield }}</div>
            <div class="text-xs text-slate-400">护盾</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-1">💰</div>
            <div class="text-lg font-bold text-yellow-500">+{{ rpgEffects.gold }}</div>
            <div class="text-xs text-slate-400">金币</div>
          </div>
        </div>
      </div>

    </div>

    <!-- 底部提交按钮 -->
    <div class="sticky bottom-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
      <button
        @click="handleSubmit"
        :disabled="!selectedPreset && !customName"
        class="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
        :class="(selectedPreset || customName)
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'"
      >
        <span v-if="!systemStore.isPureMode">🏋️ 记录运动 (+{{ estimatedCalories }} HP)</span>
        <span v-else>记录运动 ({{ estimatedCalories }} kcal)</span>
      </button>
    </div>
  </div>
</template>
