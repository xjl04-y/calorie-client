<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore'; // [New]
import { TAG_DEFS } from '@/constants/gameData';
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';
import type { FoodItem } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore(); // [New]

const show = computed({
  get: () => store.modals.quantity,
  set: (val) => store.setModal('quantity', val)
});

// [New] 纯净模式判断
const isPure = computed(() => systemStore.isPureMode);

const item = computed(() => store.temp.pendingItem);
const multiplier = ref(1.0);
const currentGrams = ref(0);

// ==========================================
// [Core Logic] Symbol 图标显示逻辑
// ==========================================
const getIconDisplay = (item: FoodItem | null) => {
  if (!item) return { isSymbol: false, content: '' };

  let iconRaw = item.icon || '';

  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 1. 如果数据本身包含 icon- (例如 icon-apple)，视为 Symbol ID
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      const valid = isValidIcon(extractedId);

      // 验证图标是否存在
      if (valid) {
        return { isSymbol: true, content: extractedId };
      }
    }
  }

  // 2. 动态推断逻辑
  const effectiveTags = (item.tags && item.tags.length > 0)
    ? item.tags
    : inferTags(item.name || '');

  const assigned = assignIcon(item.name || '', effectiveTags);

  if (assigned) {
    return { isSymbol: true, content: assigned };
  }

  // 3. 兜底 (Emoji)
  return { isSymbol: false, content: iconRaw };
};

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

  const baseP = Number(item.value.p ?? item.value.protein ?? 0);
  const baseC = Number(item.value.c ?? item.value.carbs ?? 0);
  const baseF = Number(item.value.f ?? item.value.fat ?? 0);

  return {
    p: Math.round(baseP * ratio),
    c: Math.round(baseC * ratio),
    f: Math.round(baseF * ratio)
  };
});

const displayTags = computed(() => {
  if (!item.value) return [];
  const currentItem = item.value;
  const tags = new Set(currentItem.tags || []);
  const name = currentItem.name || '';

  const c = Number(currentItem.c ?? currentItem.carbs ?? 0);
  const f = Number(currentItem.f ?? currentItem.fat ?? 0);
  const p = Number(currentItem.p ?? currentItem.protein ?? 0);
  const grams = Number(currentItem.grams) || 100;
  const calories = Number(currentItem.calories) || 0;

  const densityC = c / grams;
  const densityF = f / grams;
  const densityP = p / grams;
  const densityCal = calories / grams;

  if (c > 20 && densityC > 0.2) tags.add('高碳');
  if (f > 10 && densityF > 0.1) tags.add('高油');
  if (p > 15 && densityP > 0.15) tags.add('高蛋白');

  if (name.includes('糖') || name.includes('奶茶') || name.includes('蛋糕') || name.includes('甜点') || name.includes('冰淇淋') || name.includes('巧克力')) tags.add('高糖');
  if (name.includes('咸') || name.includes('腌') || name.includes('酱')) tags.add('高盐');

  if (densityCal < 1.0 && calories < 300 && !tags.has('高油') && !tags.has('高糖')) tags.add('低卡');
  if (grams > 200) tags.add('充饥');

  const HIDDEN_TAGS = [
    'DRINK', 'ALCOHOL', 'MEAT', 'RED_MEAT', 'POULTRY', 'SEAFOOD',
    'VEGETABLE', 'FRUIT', 'STAPLE', 'SNACK', 'VEG', 'OTHER',
    'STATE_DRIED', 'STATE_PRESERVED', 'STATE_COOKED', 'STATE_RAW',
    'FLAVOR_SPICY', 'FLAVOR_SOUR', 'FLAVOR_SWEET', 'FLAVOR_BITTER',
    'TEMP_COLD', 'TEMP_HOT'
  ];

  return Array.from(tags).filter(t => !HIDDEN_TAGS.includes(t));
});

const dmgPrediction = computed(() => {
  if (isPure.value) return null;

  if (!item.value || !store.stageInfo.currentObj) return null;

  const monster = store.stageInfo.currentObj.data;
  const tags = displayTags.value;

  const finalFat = calcMacros.value.f;
  const finalCarb = calcMacros.value.c;
  const finalPro = calcMacros.value.p;

  if (monster?.weaknessType === '低脂') {
    if (tags.includes('高油') || finalFat > 20)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-900/30' };
  }

  if (monster?.weaknessType === '低碳') {
    if (tags.includes('高糖') || tags.includes('高碳') || finalCarb > 30)
      return { text: '💀 严重抵抗! (0.3x)', subtext: 'Boss 必将暴怒反击', color: 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-900/30' };
    if (finalCarb < 15)
      return { text: '🔥 效果拔群 (低碳)', color: 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30' };
  }

  if (monster?.weaknessType === '高蛋白') {
    if (tags.includes('高蛋白') || finalPro > 25)
      return { text: '🔥 效果拔群 (高蛋白)', color: 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30' };
  }

  return { text: '⚔️ 普通伤害', color: 'text-slate-400' };
});

const confirm = () => {
  if(!item.value) return;
  const baseGrams = item.value.grams || 100;
  const ratio = currentGrams.value / baseGrams;

  const macros = calcMacros.value;

  const finalLog = {
    ...item.value,
    calories: Math.round((item.value.calories || 0) * ratio),
    grams: currentGrams.value,
    p: macros.p,
    c: macros.c,
    f: macros.f
  };

  if (store.temp.isBuilding) {
    store.temp.basket.push({ ...finalLog, isComposite: false });
    store.setModal('quantity', false);
    return;
  }

  store.setModal('quantity', false);
  store.setModal('addFood', false);

  setTimeout(() => {
    store.battleCommit(finalLog);
  }, 300);
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round safe-area-inset-bottom class="!pb-6 dark:bg-slate-900">
    <div class="p-6 text-slate-700 dark:text-slate-200" v-if="item">
      <!-- 头部展示 -->
      <div class="text-center mb-6">
        <div class="h-32 sm:h-40 flex items-center justify-center mb-2 text-slate-700 dark:text-slate-300">
          <template v-if="getIconDisplay(item).isSymbol">
            <svg class="icon text-[5rem] sm:text-[7rem]" aria-hidden="true">
              <use :xlink:href="'#' + getIconDisplay(item).content"></use>
            </svg>
          </template>
          <template v-else>
            <span class="text-[5rem] sm:text-[7rem] leading-none">{{ getIconDisplay(item).content }}</span>
          </template>
        </div>

        <h3 class="font-bold text-2xl sm:text-3xl text-slate-800 dark:text-white">{{ item.name }}</h3>

        <div class="flex justify-center gap-1 mt-3 mb-2 flex-wrap" v-if="displayTags.length">
          <span v-for="tag in displayTags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1">
            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
          </span>
        </div>

        <!-- 只有非纯净模式且有伤害预测时才显示 -->
        <div v-if="dmgPrediction && !isPure" class="text-xs font-bold mt-2 px-3 py-1 rounded bg-slate-50 dark:bg-slate-700 inline-block border border-transparent" :class="dmgPrediction.color">
          {{ dmgPrediction.text }}
          <div v-if="dmgPrediction.subtext" class="text-[9px] mt-0.5 opacity-80">{{ dmgPrediction.subtext }}</div>
        </div>

        <div class="text-sm text-slate-400 mt-2 font-mono">基准: {{ item.grams }}g = ~{{ item.calories }} kcal</div>
      </div>

      <!-- 宏量营养素卡片：色彩更柔和，边框更细 -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl text-center border border-blue-100 dark:border-blue-900/30">
          <div class="text-[10px] text-blue-500 font-bold mb-1">蛋白质</div>
          <div class="font-bold text-blue-700 dark:text-blue-300 text-lg">{{ calcMacros.p }}g</div>
        </div>
        <div class="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
          <div class="text-[10px] text-emerald-500 font-bold mb-1">碳水</div>
          <div class="font-bold text-emerald-700 dark:text-emerald-300 text-lg">{{ calcMacros.c }}g</div>
        </div>
        <div class="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-900/30">
          <div class="text-[10px] text-amber-500 font-bold mb-1">脂肪</div>
          <div class="font-bold text-amber-700 dark:text-amber-300 text-lg">{{ calcMacros.f }}g</div>
        </div>
      </div>

      <!-- 总量输入：去除紫色 -->
      <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6 flex justify-around text-center border border-slate-100 dark:border-slate-700">
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">总热量</div>
          <div class="font-black text-2xl text-slate-800 dark:text-white">~{{ displayCals }}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">总重量 (g)</div>
          <input type="number" v-model.number="currentGrams" class="w-24 text-center font-bold text-xl bg-white dark:bg-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-lg py-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none" />
        </div>
      </div>

      <!-- 滑块：使用 Emerald -->
      <div class="mb-8 px-2">
        <div class="flex justify-between mb-4 text-sm font-bold text-slate-600 dark:text-slate-300">
          <span>份量调整</span><span>x{{ multiplier.toFixed(1) }}</span>
        </div>
        <van-slider v-model="multiplier" :min="0.5" :max="5.0" :step="0.1" bar-height="6px" active-color="#10b981" inactive-color="#e2e8f0">
          <template #button>
            <div class="w-6 h-6 bg-white rounded-full shadow-md border border-emerald-500 flex items-center justify-center">
              <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
          </template>
        </van-slider>
      </div>

      <!-- 确认按钮：健康绿 -->
      <van-button
        block
        color="#10b981"
        round
        size="large"
        @click="confirm"
        class="shadow-sm font-bold h-12 text-lg border-none"
      >
        {{ store.temp.isBuilding ? '加入碗里' : '确认记录' }}
      </van-button>
    </div>
  </van-popup>
</template>

<style scoped>
.tag-badge { @apply font-bold rounded mr-1; }
/* 复用全局的柔和 Tag 样式 */
.tag-高糖 { @apply bg-rose-50 text-rose-600 border-rose-100; }
.tag-高油 { @apply bg-orange-50 text-orange-600 border-orange-100; }
.tag-高盐 { @apply bg-slate-100 text-slate-600 border-slate-200; }
.tag-高碳 { @apply bg-yellow-50 text-yellow-600 border-yellow-100; }
.tag-高蛋白 { @apply bg-emerald-50 text-emerald-600 border-emerald-100; }
.tag-纯净 { @apply bg-sky-50 text-sky-600 border-sky-100; }
.tag-均衡 { @apply bg-indigo-50 text-indigo-600 border-indigo-100; }
.tag-低卡 { @apply bg-teal-50 text-teal-600 border-teal-100; }
.tag-充饥 { @apply bg-amber-50 text-amber-600 border-amber-100; }

/* Symbol Icon Style */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
