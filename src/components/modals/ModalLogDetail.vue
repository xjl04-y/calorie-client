<script setup lang="ts">
/**
 * ModalLogDetail.vue
 * * 饮食/日志详情模态框
 * * 更新说明:
 * 1. 适配 iconfont 类名渲染模式 (支持 icon-shui 等)
 * 2. 移除对 isValidIcon 的强校验，允许动态新增的 iconfont
 */

import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { TAG_DEFS, MONSTERS } from '@/constants/gameData';
import { inferTags } from '@/utils/foodDataMapper'; // 移除了 assignIcon, isValidIcon 的强依赖
import { showConfirmDialog } from 'vant';

// definition of interfaces for Type Safety
interface LogItem {
  id?: string;
  name: string;
  icon?: string;
  tags?: string[];
  calories: number;
  grams?: number;
  mealType: string;
  timestamp?: number;
  // Macronutrients
  p?: number; // protein
  c?: number; // carbs
  f?: number; // fat
  // RPG Stats
  damageTaken?: number;
  dodged?: boolean;
  blocked?: number;
  multiplier?: number;
  generatedExp?: number;
  generatedGold?: number;
}

const store = useGameStore();
const systemStore = useSystemStore();

// Computed for Modal Visibility
const show = computed({
  get: () => store.modals.logDetail,
  set: (val) => store.setModal('logDetail', val)
});

// Computed for Data
const log = computed(() => store.temp.selectedLog as LogItem | undefined);
const isPure = computed(() => systemStore.isPureMode);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水'
};

const isFoodLog = computed(() => {
  if (!log.value) return false;
  return !!MEAL_LABELS[log.value.mealType];
});

// ==========================================
// [Core Logic] Icon Display Logic (Refactored)
// ==========================================
interface IconDisplay {
  isSymbol: boolean;    // SVG Symbol (#icon-xxx)
  isImage: boolean;     // Image URL
  isFontClass: boolean; // Font Class (iconfont icon-xxx)
  content: string;
}

const getIconDisplay = (item: LogItem | undefined): IconDisplay => {
  if (!item) return { isSymbol: false, isImage: false, isFontClass: false, content: '' };

  let iconRaw = item.icon || '';

  // 1. Sanitize Data
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 2. Image URL Check
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, isFontClass: false, content: iconRaw };
  }

  // 3. [New] Font Class Check (iconfont)
  // 只要包含 icon- 前缀，优先视为 iconfont class
  if (iconRaw.includes('icon-') || iconRaw.includes('iconfont')) {
    return { isSymbol: false, isImage: false, isFontClass: true, content: iconRaw };
  }

  // 4. Fallback: Default infer logic (Tags -> Icon)
  // 如果没有图标，尝试根据标签推断
  const effectiveTags = (item.tags && item.tags.length > 0)
    ? item.tags
    : inferTags(item.name || '');

  // 简单推断逻辑 (可扩展)
  if (effectiveTags.includes('肉')) return { isSymbol: false, isImage: false, isFontClass: true, content: 'icon-roulei' };
  if (effectiveTags.includes('蔬菜')) return { isSymbol: false, isImage: false, isFontClass: true, content: 'icon-shucai' };

  // 5. Last Resort: Raw Text (Emoji)
  return { isSymbol: false, isImage: false, isFontClass: false, content: iconRaw };
};

// ==========================================
// [Core Logic] Tag & Description Logic
// ==========================================
const displayTags = computed<string[]>(() => {
  if (!log.value || !log.value.tags) return [];

  const HIDDEN_TAGS = new Set([
    'DRINK', 'ALCOHOL', 'MEAT', 'RED_MEAT', 'POULTRY', 'SEAFOOD',
    'VEGETABLE', 'FRUIT', 'STAPLE', 'SNACK', 'VEG', 'OTHER',
    'STATE_DRIED', 'STATE_PRESERVED', 'STATE_COOKED', 'STATE_RAW',
    'FLAVOR_SPICY', 'FLAVOR_SOUR', 'FLAVOR_SWEET', 'FLAVOR_BITTER',
    'TEMP_COLD', 'TEMP_HOT'
  ]);

  return log.value.tags.filter((t) => !HIDDEN_TAGS.has(t));
});

const getTagDesc = (tag: string): string => {
  if (isPure.value) {
    const pureMap: Record<string, string> = {
      '高糖': '糖分较高，请适量食用',
      '高油': '脂肪含量较高',
      '高碳': '碳水化合物丰富',
      '纯净': '天然无添加',
      '均衡': '营养配比良好',
      '低卡': '热量较低，适合减脂',
      '充饥': '分量足，能提供饱腹感'
    };
    return pureMap[tag] || '普通属性';
  }

  // RPG Logic Helper
  const findEnemy = (type: string) => {
    const m = MONSTERS.find(m => m.weaknessType === type);
    return m ? `[${m.name}]` : '此类怪物';
  };

  // RPG Descriptions
  switch (tag) {
    case '高糖': return `容易被 ${findEnemy('低碳')} 克制，中断连击`;
    case '高油': return `容易被 ${findEnemy('低脂')} 克制，中断连击`;
    case '高碳': return `容易被 ${findEnemy('低碳')} 克制，造成反伤`;
    case '高蛋白': return `克制 ${findEnemy('高蛋白')} 的弱点，造成暴击`;
    case '纯净':
    case '均衡': return '对大多数怪物有额外伤害加成，且容易触发连击';
    case '低卡': return '轻盈的食物，容易触发连击';
    case '充饥': return '厚实的食物，基础伤害较高';
    default: return '普通属性';
  }
};

// ==========================================
// [Interaction] Actions
// ==========================================
const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: isPure.value ? '删除记录' : '时光倒流',
      message: isPure.value
        ? '确定要删除这条饮食记录吗？'
        : '确定要撤销这条记录吗？\n该操作会回滚所有影响（HP、经验、怪物状态）。',
      confirmButtonText: isPure.value ? '删除' : '确认撤销',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'currentColor',
    }).then(() => {
      if (log.value) {
        store.deleteLog(log.value as any);
        show.value = false;
      }
    }).catch(() => {
      // Cancelled
    });
  }
};
</script>

<template>
  <van-popup
    v-model:show="show"
    round
    position="center"
    :style="{ width: '90%', maxWidth: '400px', maxHeight: '90%' }"
    class="bg-white dark:bg-slate-900 flex flex-col overflow-hidden shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10"
  >
    <div class="p-6 text-center overflow-y-auto custom-scrollbar" v-if="log">

      <!-- ================= Section: Icon & Header ================= -->
      <div class="relative group">
        <!-- Back glow effect -->
        <div class="absolute inset-0 bg-emerald-500/10 rounded-full filter blur-xl transform scale-75 group-hover:scale-90 transition-transform duration-500"></div>

        <div class="relative h-32 sm:h-40 flex items-center justify-center mb-4 transition-all duration-300">

          <!-- Case 1: Image URL -->
          <template v-if="getIconDisplay(log).isImage">
            <img
              :src="getIconDisplay(log).content"
              class="h-28 w-28 sm:h-36 sm:w-36 object-contain drop-shadow-lg"
              alt="icon"
            />
          </template>

          <!-- Case 2: Iconfont Class [NEW] -->
          <template v-else-if="getIconDisplay(log).isFontClass">
            <!-- 直接使用 iconfont class -->
            <i
              class="iconfont text-[5rem] sm:text-[7rem] text-slate-700 dark:text-slate-200 drop-shadow-sm transition-transform duration-300 hover:scale-110"
              :class="getIconDisplay(log).content"
            ></i>
          </template>

          <!-- Case 3: SVG Symbol (Compatibility) -->
          <template v-else-if="getIconDisplay(log).isSymbol">
            <svg class="icon text-[5rem] sm:text-[7rem] text-slate-700 dark:text-slate-200 drop-shadow-sm" aria-hidden="true">
              <use :xlink:href="'#' + getIconDisplay(log).content"></use>
            </svg>
          </template>

          <!-- Case 4: Text/Emoji Fallback -->
          <template v-else>
            <span class="text-[5rem] sm:text-[7rem] leading-none text-slate-700 dark:text-slate-200">
              {{ getIconDisplay(log).content }}
            </span>
          </template>
        </div>
      </div>

      <h3 class="font-bold text-2xl text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
        {{ log.name }}
      </h3>

      <!-- Time Badge -->
      <div class="mb-5 inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>{{ MEAL_LABELS[log.mealType] || log.mealType }}</span>
        <span class="mx-1.5">•</span>
        <span>{{ log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--' }}</span>
      </div>

      <!-- ================= Section: Tags ================= -->
      <div class="flex flex-wrap justify-center gap-2 mb-6" v-if="isFoodLog && displayTags.length > 0">
        <span
          v-for="tag in displayTags"
          :key="tag"
          :class="`tag-${tag}`"
          class="tag-badge text-xs px-3 py-1 rounded-md font-medium border border-transparent transition-colors"
        >
          {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
        </span>
      </div>

      <!-- Tag Description Box (Info) -->
      <div v-if="isFoodLog && displayTags.length > 0" class="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-left border border-slate-100 dark:border-slate-700">
        <div
          v-for="tag in displayTags"
          :key="tag"
          class="text-xs text-slate-600 dark:text-slate-400 mb-2 last:mb-0 flex items-start leading-relaxed"
        >
          <i class="fas fa-info-circle mr-2 mt-0.5 text-sky-500 dark:text-sky-400 flex-shrink-0"></i>
          <span>
            <strong :class="`text-${tag}`" class="font-semibold">{{ tag }}</strong>
            <span class="mx-1 text-slate-300">|</span>
            {{ getTagDesc(tag) }}
          </span>
        </div>
      </div>

      <!-- ================= Section: Data Grid ================= -->
      <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-6 grid grid-cols-2 gap-y-6 gap-x-4 border border-slate-100 dark:border-slate-700/50">

        <!-- Food Stats -->
        <template v-if="isFoodLog">
          <div class="text-left">
            <div class="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">总重量</div>
            <div class="font-bold text-xl text-slate-700 dark:text-slate-200 font-mono">
              {{ log.grams }}<span class="text-sm font-normal text-slate-400 ml-1">g</span>
            </div>
          </div>
          <div class="text-left">
            <div class="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">总热量</div>
            <div class="font-bold text-xl text-slate-700 dark:text-slate-200 font-mono">
              {{ log.calories }}<span class="text-sm font-normal text-slate-400 ml-1">kcal</span>
            </div>
          </div>
        </template>

        <!-- Pure Mode Energy -->
        <div class="text-left col-span-2" v-if="isPure">
          <div class="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">摄入能量</div>
          <div class="font-bold text-2xl text-emerald-600 dark:text-emerald-400 font-mono">
            {{ log.calories }} <span class="text-sm font-normal text-slate-400">kcal</span>
          </div>
        </div>

        <!-- RPG Battle Stats (Non-Food Log) -->
        <div class="text-left col-span-2" v-else-if="!isFoodLog && (log.damageTaken !== undefined || log.dodged)">
          <div v-if="log.dodged" class="text-emerald-500 font-bold text-xl flex items-center">
            <i class="fas fa-bolt mr-2"></i> 完美闪避!
          </div>
          <div v-else>
            <div class="text-xs text-rose-400 font-bold mb-1">实际受损 HP</div>
            <div class="font-bold text-3xl text-rose-500 font-mono">-{{ log.damageTaken }}</div>
            <div v-if="log.blocked" class="text-xs text-sky-500 mt-1 font-medium bg-sky-50 dark:bg-sky-900/20 inline-block px-2 py-0.5 rounded">
              🛡️ 已格挡 {{ log.blocked }}
            </div>
          </div>
        </div>

        <!-- RPG Damage Output (Food Log) -->
        <div class="text-left col-span-2" v-else-if="!isPure">
          <div class="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">实际伤害 (RPG)</div>
          <div class="flex items-baseline gap-2">
            <div
              class="font-black text-2xl font-mono"
              :class="(log.multiplier || 1) < 1 ? 'text-slate-400 line-through decoration-rose-400' : 'text-rose-500'"
            >
              {{ Math.floor(log.calories * (log.multiplier || 1)) }}
            </div>

            <div v-if="(log.multiplier || 1) < 1" class="text-xs font-bold text-amber-500 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              抵抗 (x{{ log.multiplier?.toFixed(2) }})
            </div>
            <div v-else-if="(log.multiplier || 1) > 1" class="text-xs font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
              效果拔群 (x{{ log.multiplier?.toFixed(2) }})
            </div>
          </div>
        </div>
      </div>

      <!-- ================= Section: Macros ================= -->
      <div class="mb-6 px-1" v-if="isFoodLog">
        <div class="text-xs font-bold text-slate-400 mb-3 text-left uppercase tracking-wider">营养构成</div>
        <div class="space-y-3">
          <!-- Protein -->
          <div class="flex items-center justify-between group">
            <span class="text-xs text-slate-500 font-medium w-12">蛋白质</span>
            <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mx-3">
              <div class="h-full bg-sky-400 rounded-full" :style="{ width: '40%' }"></div>
            </div>
            <span class="font-bold text-sky-600 dark:text-sky-400 text-sm font-mono w-10 text-right">{{ log.p }}g</span>
          </div>

          <!-- Carbs -->
          <div class="flex items-center justify-between group">
            <span class="text-xs text-slate-500 font-medium w-12">碳水</span>
            <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mx-3">
              <div class="h-full bg-emerald-400 rounded-full" :style="{ width: '50%' }"></div>
            </div>
            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono w-10 text-right">{{ log.c }}g</span>
          </div>

          <!-- Fat -->
          <div class="flex items-center justify-between group">
            <span class="text-xs text-slate-500 font-medium w-12">脂肪</span>
            <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mx-3">
              <div class="h-full bg-amber-400 rounded-full" :style="{ width: '20%' }"></div>
            </div>
            <span class="font-bold text-amber-600 dark:text-amber-400 text-sm font-mono w-10 text-right">{{ log.f }}g</span>
          </div>
        </div>
      </div>

      <!-- ================= Section: RPG Rewards ================= -->
      <div v-if="!isPure && (log.generatedGold || log.generatedExp)" class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-400 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span>🎁</span> 冒险收益
        </div>
        <div class="flex items-center justify-around">
          <div v-if="log.generatedExp" class="text-center">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">经验值</div>
            <div class="font-black text-xl text-emerald-600 dark:text-emerald-400">+{{ log.generatedExp }}</div>
          </div>
          <div v-if="log.generatedExp && log.generatedGold" class="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
          <div v-if="log.generatedGold" class="text-center">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">金币</div>
            <div class="font-black text-xl text-amber-500 dark:text-amber-400">+{{ log.generatedGold }}</div>
          </div>
        </div>
      </div>

      <!-- ================= Section: Footer Actions ================= -->
      <div class="flex gap-3 mt-4">
        <button
          class="flex-1 h-11 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95 flex items-center justify-center gap-2"
          @click="handleDelete"
        >
          <i class="fas fa-trash-alt text-xs"></i>
          {{ isPure ? '删除' : '撤销' }}
        </button>

        <button
          class="flex-1 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
          @click="show = false"
        >
          完成
        </button>
      </div>

    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 dark:bg-slate-600;
  border-radius: 4px;
}

/* Healthy Color Palette for Tags */
.tag-badge {
  @apply bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300;
}

.tag-高糖, .text-高糖 { @apply text-rose-500 dark:text-rose-400; }
.tag-高糖.tag-badge { @apply bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/30; }

.tag-高油, .text-高油 { @apply text-amber-500 dark:text-amber-400; }
.tag-高油.tag-badge { @apply bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30; }

.tag-纯净, .text-纯净 { @apply text-sky-500 dark:text-sky-400; }
.tag-纯净.tag-badge { @apply bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-900/30; }

.tag-均衡, .text-均衡 { @apply text-emerald-500 dark:text-emerald-400; }
.tag-均衡.tag-badge { @apply bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30; }

.tag-低卡, .text-低卡 { @apply text-emerald-600 dark:text-emerald-300; }
.tag-低卡.tag-badge { @apply bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30; }

.tag-充饥, .text-充饥 { @apply text-orange-600 dark:text-orange-300; }
.tag-充饥.tag-badge { @apply bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30; }

/* Symbol Styles */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
