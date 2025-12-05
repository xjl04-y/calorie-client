<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import { TAG_DEFS } from '@/constants/gameData';

const store = useGameStore();
const { temp, modals, stageInfo } = storeToRefs(store);

// 控制弹窗显示
const show = computed({
  get: () => modals.value.quantity,
  set: (val) => store.setModal('quantity', val)
});

const item = computed(() => temp.value.pendingItem);
const multiplier = ref(1.0);
const currentGrams = ref(0);

// 初始化数据
watch(item, (v) => {
  if(v) {
    multiplier.value = 1.0;
    currentGrams.value = v.grams || 100;
  }
}, { immediate: true });

// 联动：滑块 -> 重量
watch(multiplier, (v) => {
  if(item.value) currentGrams.value = Math.round((item.value.grams || 100) * v);
});

// 计算属性：当前热量
const displayCals = computed(() => {
  if(!item.value) return 0;
  const baseGrams = item.value.grams || 100;
  return Math.round(item.value.cals * (currentGrams.value / baseGrams));
});

// 计算属性：当前营养素
const calcMacros = computed(() => {
  if(!item.value) return {p:0, c:0, f:0};
  const baseGrams = item.value.grams || 100;
  const ratio = currentGrams.value / baseGrams;
  return {
    p: Math.round((item.value.p || 0) * ratio),
    c: Math.round((item.value.c || 0) * ratio),
    f: Math.round((item.value.f || 0) * ratio)
  };
});

// 伤害预测逻辑 V2.0 (RPG 核心逻辑)
const dmgPrediction = computed(() => {
  if (!item.value || !stageInfo.value.currentObj) return null;

  const monster = stageInfo.value.currentObj.data;
  const tags = item.value.tags || [];
  const finalFat = calcMacros.value.f;
  const finalCarb = calcMacros.value.c;
  const finalPro = calcMacros.value.p;

  // 强制抵抗逻辑检测
  if (monster?.weaknessType === 'LOW_FAT') {
    if (tags.includes('HIGH_FAT') || finalFat > 20)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/30' };
  }

  if (monster?.weaknessType === 'LOW_CARB') {
    if (tags.includes('HIGH_SUGAR') || tags.includes('HIGH_CARB') || finalCarb > 30)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/30' };
    if (finalCarb < 15)
      return { text: '🔥 效果拔群 (低碳)', color: 'text-green-500 border-green-500 bg-green-50 dark:bg-green-900/30' };
  }

  if (monster?.weaknessType === 'HIGH_PRO') {
    if (tags.includes('HIGH_PRO') || finalPro > 25)
      return { text: '🔥 效果拔群 (高蛋白)', color: 'text-green-500 border-green-500 bg-green-50 dark:bg-green-900/30' };
  }

  return { text: '⚔️ 普通伤害', color: 'text-slate-400' };
});

// 确认提交
const confirm = () => {
  if(!item.value) return;
  const baseGrams = item.value.grams || 100;
  const ratio = currentGrams.value / baseGrams;

  const finalLog = {
    ...item.value,
    calories: Math.round(item.value.cals * ratio),
    grams: currentGrams.value,
    p: Math.round(item.value.p * ratio),
    c: Math.round(item.value.c * ratio),
    f: Math.round(item.value.f * ratio)
  };

  // 如果是“配菜模式”
  if (temp.value.isBuilding) {
    store.temp.basket.push({ ...finalLog, isComposite: false });
    store.setModal('quantity', false);
    return;
  }

  // 使用新的战斗结算 Action
  store.battleCommit(finalLog);

  store.setModal('quantity', false);
  store.setModal('addFood', false); // 同时也关闭上层弹窗
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round safe-area-inset-bottom class="!pb-6 dark:bg-slate-800">
    <div class="p-6" v-if="item">
      <!-- 头部信息 -->
      <div class="text-center mb-6">
        <div class="text-6xl mb-3 animate-bounce">{{ item.icon }}</div>
        <h3 class="font-black text-2xl text-slate-800 dark:text-white">{{ item.name }}</h3>
        <div class="flex justify-center gap-1 mt-2 mb-2" v-if="item.tags && item.tags.length">
                    <span v-for="tag in item.tags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1">
                        {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label }}
                    </span>
        </div>

        <!-- 伤害预测胶囊 -->
        <div v-if="dmgPrediction" class="text-xs font-bold mt-2 px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 inline-block border border-transparent transition-all duration-300 transform scale-105" :class="dmgPrediction.color">
          {{ dmgPrediction.text }}
          <div v-if="dmgPrediction.subtext" class="text-[9px] mt-0.5 opacity-80">{{ dmgPrediction.subtext }}</div>
        </div>

        <div class="text-sm text-slate-400 mt-1">基准: {{ item.grams }}g = ~{{ item.cals }} kcal</div>
      </div>

      <!-- 营养素预览 -->
      <div class="grid grid-cols-3 gap-2 mb-6">
        <div class="bg-blue-50 dark:bg-slate-700 p-2 rounded-xl text-center border border-blue-100 dark:border-slate-600">
          <div class="text-[10px] text-blue-500">蛋白质</div>
          <div class="font-bold text-blue-700 dark:text-blue-300">{{ calcMacros.p }}g</div>
        </div>
        <div class="bg-green-50 dark:bg-slate-700 p-2 rounded-xl text-center border border-green-100 dark:border-slate-600">
          <div class="text-[10px] text-green-500">碳水</div>
          <div class="font-bold text-green-700 dark:text-green-300">{{ calcMacros.c }}g</div>
        </div>
        <div class="bg-orange-50 dark:bg-slate-700 p-2 rounded-xl text-center border border-orange-100 dark:border-slate-600">
          <div class="text-[10px] text-orange-500">脂肪</div>
          <div class="font-bold text-orange-700 dark:text-orange-300">{{ calcMacros.f }}g</div>
        </div>
      </div>

      <!-- 调整区域 -->
      <div class="bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 mb-6 flex justify-around text-center border border-slate-100 dark:border-slate-600">
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">总热量</div>
          <div class="font-black text-xl text-purple-600 dark:text-purple-400">~{{ displayCals }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">总重量 (g)</div>
          <input type="number" v-model.number="currentGrams" class="w-20 text-center font-bold text-lg bg-white dark:bg-slate-600 dark:text-white border border-purple-200 dark:border-purple-800 rounded-lg py-0.5" />
        </div>
      </div>

      <!-- 滑块 -->
      <div class="mb-8 px-2">
        <div class="flex justify-between mb-4 text-sm font-bold text-slate-600 dark:text-slate-300">
          <span>份量调整</span><span>x{{ multiplier.toFixed(1) }}</span>
        </div>
        <van-slider v-model="multiplier" :min="0.5" :max="5.0" :step="0.1" bar-height="6px" active-color="#7c3aed">
          <template #button>
            <div class="w-6 h-6 bg-white rounded-full shadow-md border-2 border-purple-600"></div>
          </template>
        </van-slider>
      </div>

      <!-- 按钮 -->
      <van-button
        block
        color="linear-gradient(to right, #7c3aed, #6366f1)"
        round
        size="large"
        @click="confirm"
        class="shadow-lg shadow-purple-200 dark:shadow-none font-bold"
      >
        {{ temp.isBuilding ? '加入碗里' : '确认记录' }}
      </van-button>
    </div>
  </van-popup>
</template>

<style scoped>
.tag-badge {
  @apply font-bold rounded mr-1;
}
.tag-HIGH_SUGAR { @apply bg-red-100 text-red-800 border-red-200; }
.tag-HIGH_FAT { @apply bg-yellow-100 text-yellow-800 border-yellow-200; }
.tag-HIGH_SODIUM { @apply bg-slate-200 text-slate-700 border-slate-300; }
.tag-HIGH_CARB { @apply bg-orange-100 text-orange-800 border-orange-200; }
.tag-HIGH_PRO { @apply bg-green-100 text-green-800 border-green-200; }
</style>
