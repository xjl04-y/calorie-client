<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { showToast } from 'vant';
import type { ActivityLevel, DietGoal } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore();

const show = computed({
  get: () => systemStore.modals.targetConfig,
  set: (val) => systemStore.setModal('targetConfig', val)
});

const isPure = computed(() => systemStore.isPureMode);
const user = computed(() => store.user);

// 本地状态
const localConfig = ref({
  mode: 'AUTO' as 'AUTO' | 'MANUAL',
  goal: 'MAINTAIN' as DietGoal,
  activityLevel: 1.2 as ActivityLevel,
  manualBMR: 2000
});

// 监听弹窗打开，初始化数据
watch(show, (val) => {
  if (val) {
    // 1. 确保 Store 中的 targetConfig 存在
    if (!user.value.targetConfig) {
      heroStore.user.targetConfig = { mode: 'AUTO', goal: 'MAINTAIN', activityLevel: 1.2 };
    }

    // 2. 深拷贝配置到本地
    localConfig.value = JSON.parse(JSON.stringify(user.value.targetConfig));

    // 3. 正确初始化 manualBMR
    if (user.value.baseBMR && user.value.baseBMR > 500) {
      localConfig.value.manualBMR = user.value.baseBMR;
    } else {
      localConfig.value.manualBMR = 2000;
    }
  }
});

// 计算逻辑 (组件内独立计算，确保预览准确)
const calculateFinalBMR = () => {
  // 1. 如果是手动模式，直接返回手动值
  if (localConfig.value.mode === 'MANUAL') {
    return localConfig.value.manualBMR || 2000;
  }

  // 2. 自动模式：Mifflin-St Jeor 公式
  const s = user.value.gender === 'MALE' ? 5 : -161;
  const w = Number(user.value.weight) || 60;
  const h = Number(user.value.height) || 170;
  const a = Number(user.value.age) || 25;

  const bmr = 10 * w + 6.25 * h - 5 * a + s;

  // 3. 活动系数 (确保为数字)
  const activity = Number(localConfig.value.activityLevel) || 1.2;
  const tdee = bmr * activity;

  // 4. 目标修正
  let adjustment = 0;
  if (localConfig.value.goal === 'LOSE') adjustment = -400;
  if (localConfig.value.goal === 'GAIN') adjustment = 300;

  // 5. 结果 & 安全限制
  const final = Math.round(tdee + adjustment);
  return Math.max(1200, final);
};

// 预览计算属性
const calculatedBMR = computed(() => calculateFinalBMR());

// 配置选项
const ACTIVITY_LEVELS = [
  { val: 1.2, label: '久坐', desc: '几乎不运动' },
  { val: 1.375, label: '轻度', desc: '每周 1-3 次' },
  { val: 1.55, label: '中度', desc: '每周 3-5 次' },
  { val: 1.725, label: '高度', desc: '每周 6-7 次' },
];

const GOALS = [
  { val: 'LOSE', label: isPure.value ? '减脂' : '轻装上阵', desc: '-400 kcal', icon: '🍃' },
  { val: 'MAINTAIN', label: isPure.value ? '保持' : '平衡姿态', desc: '维持现状', icon: '🛡️' },
  { val: 'GAIN', label: isPure.value ? '增肌' : '重装突击', desc: '+300 kcal', icon: '💪' },
];

const save = () => {
  // [Fix] 如果是手动模式，必须确保 manualBMR 有效
  if (localConfig.value.mode === 'MANUAL' && (!localConfig.value.manualBMR || localConfig.value.manualBMR < 500)) {
    showToast('请输入有效的手动目标值');
    return;
  }

  const payload = {
    mode: localConfig.value.mode,
    goal: localConfig.value.goal,
    activityLevel: Number(localConfig.value.activityLevel) as ActivityLevel, // 强制转换类型
    manualBMR: Number(localConfig.value.manualBMR)
  };

  // 调用 Store Action (会触发重新计算)
  heroStore.updateTargetConfig(payload);

  // 强制保存到 localStorage
  store.saveState();

  show.value = false;

  // 移除多余的 console.log，只保留功能
};
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: 'auto', maxHeight: '85%' }"
    class="flex flex-col dark:bg-slate-900"
    safe-area-inset-bottom
  >
    <div class="p-6 bg-slate-50 dark:bg-slate-900 flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl dark:text-white flex items-center">
          <i class="fas fa-bullseye text-red-500 mr-2"></i>
          {{ isPure ? '热量目标设置' : '战术指挥所' }}
        </h3>
        <van-icon name="arrow-down" @click="show = false" class="text-slate-400 text-lg" />
      </div>

      <!-- 模式切换 -->
      <div class="bg-white dark:bg-slate-800 p-1 rounded-xl flex mb-6 border border-slate-200 dark:border-slate-700">
        <button
          v-for="m in ['AUTO', 'MANUAL']" :key="m"
          @click="localConfig.mode = m"
          class="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
          :class="localConfig.mode === m ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'"
        >
          {{ m === 'AUTO' ? '智能推荐' : '手动锁定' }}
        </button>
      </div>

      <!-- 智能推荐面板 -->
      <div v-if="localConfig.mode === 'AUTO'" class="space-y-6">

        <!-- 目标选择 -->
        <div>
          <div class="text-xs font-bold text-slate-400 mb-2 uppercase">当前战术目标</div>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="g in GOALS" :key="g.val"
                 @click="localConfig.goal = g.val"
                 class="p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-1"
                 :class="localConfig.goal === g.val
                   ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                   : 'border-white dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'">
              <span class="text-2xl">{{ g.icon }}</span>
              <span class="text-sm font-bold dark:text-white">{{ g.label }}</span>
              <span class="text-[10px] text-slate-400">{{ g.desc }}</span>
            </div>
          </div>
        </div>

        <!-- 活动水平 -->
        <div>
          <div class="text-xs font-bold text-slate-400 mb-2 uppercase">日常活动强度</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="lvl in ACTIVITY_LEVELS" :key="lvl.val"
                 @click="localConfig.activityLevel = lvl.val"
                 class="px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border-2 cursor-pointer flex justify-between items-center"
                 :class="localConfig.activityLevel === lvl.val ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent'">
              <div class="font-bold text-sm text-slate-700 dark:text-slate-200">{{ lvl.label }}</div>
              <div class="text-xs text-slate-400">{{ lvl.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 预览结果 -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 text-white shadow-lg flex justify-between items-center">
          <div>
            <div class="text-xs opacity-80 mb-1">推荐每日摄入 (Boss HP)</div>
            <div class="text-3xl font-black font-mono">{{ calculatedBMR }} <span class="text-sm font-normal">kcal</span></div>
          </div>
          <div class="text-right text-xs opacity-80">
            <div>基础代谢: {{ Math.round(calculatedBMR / Number(localConfig.activityLevel || 1.2)) }}</div>
            <div>目标修正: {{ localConfig.goal === 'MAINTAIN' ? '0' : (localConfig.goal === 'LOSE' ? '-400' : '+300') }}</div>
            <div v-if="calculatedBMR === 1200" class="text-yellow-300 font-bold mt-1">⚠️ 已触发安全底线</div>
          </div>
        </div>

      </div>

      <!-- 手动模式 -->
      <div v-else class="flex-1 flex flex-col justify-center items-center">
        <div class="text-6xl mb-4">🔒</div>
        <div class="text-sm text-slate-500 mb-6 text-center px-8">
          手动设定一个固定的数值。<br>系统将不再根据体重变化自动调整。
        </div>
        <div class="flex items-center gap-2 mb-8">
          <input type="number" v-model.number="localConfig.manualBMR" class="text-4xl font-black bg-transparent w-32 text-center border-b-2 border-slate-300 focus:border-purple-500 outline-none dark:text-white font-mono" />
          <span class="text-slate-400 font-bold">kcal</span>
        </div>
      </div>

      <div class="mt-auto pt-6">
        <button @click="save" class="w-full py-4 rounded-xl font-bold bg-slate-800 text-white shadow-lg active:scale-95 transition">
          保存并生效
        </button>
      </div>

    </div>
  </van-popup>
</template>
