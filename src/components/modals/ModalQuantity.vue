<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { TAG_DEFS } from '@/constants/gameData';
import type { FoodItem } from '@/types';

const store = useGameStore();

const show = computed({
  get: () => store.modals.quantity,
  set: (val) => store.setModal('quantity', val)
});

const item = computed(() => store.temp.pendingItem);
const multiplier = ref(1.0);
const currentGrams = ref(0);

watch(item, (v) => {
  if(v) {
    multiplier.value = 1.0;
    currentGrams.value = v.grams || 100;
  }
}, { immediate: true });

watch(multiplier, (v) => {
  if(item.value) currentGrams.value = Math.round((item.value.grams || 100) * v);
});

const displayCals = computed(() => {
  if(!item.value) return 0;
  const baseGrams = item.value.grams || 100;
  return Math.round((item.value.calories || 0) * (currentGrams.value / baseGrams));
});

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

// [UI Logic] 标签显示净化 (同步 ModalAddFood 的逻辑)
const displayTags = computed(() => {
  if (!item.value) return [];
  const currentItem = item.value;
  const tags = new Set(currentItem.tags || []);
  const name = currentItem.name || '';

  // --- 实时营养计算 (基于原始数据而非调整后的份量，以反映食物本质属性) ---
  const c = Number(currentItem.c) || 0;
  const f = Number(currentItem.f) || 0;
  const p = Number(currentItem.p) || 0;
  const grams = Number(currentItem.grams) || 100;
  const calories = Number(currentItem.calories) || 0;

  const densityC = c / grams;
  const densityF = f / grams;
  const densityP = p / grams;
  const densityCal = calories / grams;

  // 核心营养阈值
  if (c > 20 && densityC > 0.2) tags.add('高碳');
  if (f > 10 && densityF > 0.1) tags.add('高油');
  if (p > 15 && densityP > 0.15) tags.add('高蛋白');

  // 简易启发式
  if (name.includes('糖') || name.includes('奶茶') || name.includes('蛋糕') || name.includes('甜点') || name.includes('冰淇淋') || name.includes('巧克力')) tags.add('高糖');
  if (name.includes('咸') || name.includes('腌') || name.includes('酱')) tags.add('高盐');

  // 补位标签
  if (densityCal < 1.0 && calories < 300 && !tags.has('高油') && !tags.has('高糖')) tags.add('低卡');
  if (grams > 200) tags.add('充饥');

  // [Fix] 这里的黑名单更彻底，移除了所有感官、分类、状态标签
  const HIDDEN_TAGS = [
    // 基础分类
    'DRINK', 'ALCOHOL', 'MEAT', 'RED_MEAT', 'POULTRY', 'SEAFOOD',
    'VEGETABLE', 'FRUIT', 'STAPLE', 'SNACK', 'VEG', 'OTHER',
    // 物理状态
    'STATE_DRIED', 'STATE_PRESERVED', 'STATE_COOKED', 'STATE_RAW',
    // 感官风味
    'FLAVOR_SPICY', 'FLAVOR_SOUR', 'FLAVOR_SWEET', 'FLAVOR_BITTER',
    'TEMP_COLD', 'TEMP_HOT'
  ];

  return Array.from(tags).filter(t => !HIDDEN_TAGS.includes(t));
});

const dmgPrediction = computed(() => {
  if (!item.value || !store.stageInfo.currentObj) return null;

  const monster = store.stageInfo.currentObj.data;
  // 使用计算后的 displayTags 进行判断，或者为了逻辑严谨性保留原始tags判断?
  // 建议还是基于 displayTags，因为这些是我们真正认定的属性
  const tags = displayTags.value;

  const finalFat = calcMacros.value.f;
  const finalCarb = calcMacros.value.c;
  const finalPro = calcMacros.value.p;

  // [Fix: Chinese Logic]
  if (monster?.weaknessType === '低脂') {
    if (tags.includes('高油') || finalFat > 20)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/30' };
  }

  if (monster?.weaknessType === '低碳') {
    if (tags.includes('高糖') || tags.includes('高碳') || finalCarb > 30)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-red-500 border-red-500 bg-red-50 dark:bg-red-900/30' };
    if (finalCarb < 15)
      return { text: '🔥 效果拔群 (低碳)', color: 'text-green-500 border-green-500 bg-green-50 dark:bg-green-900/30' };
  }

  if (monster?.weaknessType === '高蛋白') {
    if (tags.includes('高蛋白') || finalPro > 25)
      return { text: '🔥 效果拔群 (高蛋白)', color: 'text-green-500 border-green-500 bg-green-50 dark:bg-green-900/30' };
  }

  return { text: '⚔️ 普通伤害', color: 'text-slate-400' };
});

const confirm = () => {
  if(!item.value) return;
  const baseGrams = item.value.grams || 100;
  const ratio = currentGrams.value / baseGrams;

  const finalLog = {
    ...item.value,
    calories: Math.round((item.value.calories || 0) * ratio),
    grams: currentGrams.value,
    p: Math.round((item.value.p || 0) * ratio),
    c: Math.round((item.value.c || 0) * ratio),
    f: Math.round((item.value.f || 0) * ratio)
  };

  if (store.temp.isBuilding) {
    store.temp.basket.push({ ...finalLog, isComposite: false });
    store.setModal('quantity', false);
    return;
  }

  // 先关闭所有弹窗，回到首页
  store.setModal('quantity', false);
  store.setModal('addFood', false);

  // 延迟300ms后再执行战斗逻辑，确保用户已回到首页看到动画
  setTimeout(() => {
    store.battleCommit(finalLog);
  }, 300);
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round safe-area-inset-bottom class="!pb-6 dark:bg-slate-800">
    <div class="p-6" v-if="item">
      <div class="text-center mb-6">
        <div class="text-6xl mb-3 animate-bounce">{{ item.icon }}</div>
        <h3 class="font-black text-2xl text-slate-800 dark:text-white">{{ item.name }}</h3>
        <!-- [Fix] 使用 displayTags 替代 item.tags -->
        <div class="flex justify-center gap-1 mt-2 mb-2" v-if="displayTags.length">
          <span v-for="tag in displayTags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1">
            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
          </span>
        </div>

        <div v-if="dmgPrediction" class="text-xs font-bold mt-2 px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 inline-block border border-transparent transition-all duration-300 transform scale-105" :class="dmgPrediction.color">
          {{ dmgPrediction.text }}
          <div v-if="dmgPrediction.subtext" class="text-[9px] mt-0.5 opacity-80">{{ dmgPrediction.subtext }}</div>
        </div>

        <div class="text-sm text-slate-400 mt-1">基准: {{ item.grams }}g = ~{{ item.calories }} kcal</div>
      </div>

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

      <van-button
        block
        color="linear-gradient(to right, #7c3aed, #6366f1)"
        round
        size="large"
        @click="confirm"
        class="shadow-lg shadow-purple-200 dark:shadow-none font-bold"
      >
        {{ store.temp.isBuilding ? '加入碗里' : '确认记录' }}
      </van-button>
    </div>
  </van-popup>
</template>

<style scoped>
.tag-badge { @apply font-bold rounded mr-1; }
/* 中文类名适配 */
.tag-高糖 { @apply bg-red-100 text-red-800 border-red-200; }
.tag-高油 { @apply bg-yellow-100 text-yellow-800 border-yellow-200; }
.tag-高盐 { @apply bg-slate-200 text-slate-700 border-slate-300; }
.tag-高碳 { @apply bg-orange-100 text-orange-800 border-orange-200; }
.tag-高蛋白 { @apply bg-green-100 text-green-800 border-green-200; }
.tag-纯净 { @apply bg-cyan-100 text-cyan-800 border-cyan-200; }
.tag-均衡 { @apply bg-purple-100 text-purple-800 border-purple-200; }
.tag-低卡 { @apply bg-emerald-50 text-emerald-600 border-emerald-200; }
.tag-充饥 { @apply bg-amber-50 text-amber-600 border-amber-200; }
</style>
