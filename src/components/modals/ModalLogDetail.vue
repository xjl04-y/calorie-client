<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { TAG_DEFS, MONSTERS } from '@/constants/gameData';
// [Import] 引入验证逻辑
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';
import { showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => store.modals.logDetail,
  set: (val) => store.setModal('logDetail', val)
});

const log = computed(() => store.temp.selectedLog);
const isPure = computed(() => systemStore.isPureMode);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水'
};

const isFoodLog = computed(() => {
  if (!log.value) return false;
  return !!MEAL_LABELS[log.value.mealType];
});

// ==========================================
// [Core Logic] Symbol 图标显示逻辑
// ==========================================
const getIconDisplay = (item: unknown) => {
  const typedItem = item as { icon?: string; name?: string; tags?: string[] };
  if (!item) return { isSymbol: false, isImage: false, content: '' };

  let iconRaw = typedItem.icon || '';

  // 1. 脏数据清洗
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 2. 混合显示: 检查是否为图片URL (用于怪物图鉴)
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw };
  }

  // 3. 检查 Symbol ID 并验证是否存在
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      // [FIX] 验证存在性
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, isImage: false, content: extractedId };
      }
    }
  }

  // 4. Runtime Hot-fix (兜底)
  const effectiveTags = (typedItem.tags && typedItem.tags.length > 0)
    ? typedItem.tags
    : inferTags(typedItem.name || '');

  const assigned = assignIcon(typedItem.name || '', effectiveTags);

  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned };
  }

  return { isSymbol: false, isImage: false, content: iconRaw };
};

const displayTags = computed(() => {
  if (!log.value || !log.value.tags) return [];

  const HIDDEN_TAGS = [
    'DRINK', 'ALCOHOL', 'MEAT', 'RED_MEAT', 'POULTRY', 'SEAFOOD',
    'VEGETABLE', 'FRUIT', 'STAPLE', 'SNACK', 'VEG', 'OTHER',
    'STATE_DRIED', 'STATE_PRESERVED', 'STATE_COOKED', 'STATE_RAW',
    'FLAVOR_SPICY', 'FLAVOR_SOUR', 'FLAVOR_SWEET', 'FLAVOR_BITTER',
    'TEMP_COLD', 'TEMP_HOT'
  ];

  return log.value.tags.filter((t: string) => !HIDDEN_TAGS.includes(t));
});

const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: isPure.value ? '删除记录' : '时光倒流',
      message: isPure.value ? '确定要删除这条饮食记录吗？' : '确定要撤销这条记录吗？\n该操作会回滚所有影响（HP、经验、怪物状态）。',
      confirmButtonText: isPure.value ? '删除' : '确认撤销',
      confirmButtonColor: isPure.value ? '#ef4444' : '#7c3aed'
    }).then(() => {
      if (log.value) {
        store.deleteLog(log.value);
        show.value = false;
      }
    }).catch(() => {});
  }
};

const getTagDesc = (tag: string) => {
  if (isPure.value) {
    if(tag === '高糖') return '糖分较高，请适量食用';
    if(tag === '高油') return '脂肪含量较高';
    if(tag === '高碳') return '碳水化合物丰富';
    if(tag === '纯净') return '天然无添加';
    if(tag === '均衡') return '营养配比良好';
    if(tag === '低卡') return '热量较低，适合减脂';
    if(tag === '充饥') return '分量足，能提供饱腹感';
    return '普通属性';
  }

  const findEnemy = (type: string) => {
    const m = MONSTERS.find(m => m.weaknessType === type);
    return m ? `[${m.name}]` : '此类怪物';
  };

  if(tag === '高糖') return `容易被 ${findEnemy('低碳')} 克制，中断连击`;
  if(tag === '高油') return `容易被 ${findEnemy('低脂')} 克制，中断连击`;
  if(tag === '高碳') return `容易被 ${findEnemy('低碳')} 克制，造成反伤`;

  if(tag === '高蛋白') return `克制 ${findEnemy('高蛋白')} 的弱点，造成暴击`;
  if(tag === '纯净' || tag === '均衡') return '对大多数怪物有额外伤害加成，且容易触发连击';
  if(tag === '低卡') return '轻盈的食物，容易触发连击';
  if(tag === '充饥') return '厚实的食物，基础伤害较高';

  return '普通属性';
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '85%', maxHeight: '90%' }" class="dark:bg-slate-800 flex flex-col overflow-hidden">
    <div class="p-6 text-center overflow-y-auto" v-if="log">
      <!-- 图标与名称 -->
      <!-- [MODIFIED] Symbol 模式：移除颜色绑定 -->
      <div class="h-32 sm:h-40 flex items-center justify-center mb-4 filter drop-shadow-md transition-all duration-300">
        <template v-if="getIconDisplay(log).isImage">
          <img :src="getIconDisplay(log).content" class="h-28 w-28 sm:h-36 sm:w-36 object-contain rounded-xl" alt="icon" />
        </template>
        <template v-else-if="getIconDisplay(log).isSymbol">
          <svg class="icon text-[5rem] sm:text-[7rem]" aria-hidden="true">
            <use :xlink:href="'#' + getIconDisplay(log).content"></use>
          </svg>
        </template>
        <template v-else>
          <span class="text-[5rem] sm:text-[7rem] leading-none">{{ getIconDisplay(log).content }}</span>
        </template>
      </div>

      <h3 class="font-bold text-2xl sm:text-3xl dark:text-white mb-3">{{ log.name }}</h3>

      <!-- 标签展示区 -->
      <div class="flex flex-wrap justify-center gap-1.5 mb-5" v-if="isFoodLog && displayTags.length > 0">
        <span v-for="tag in displayTags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2.5 py-1 rounded">
            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
        </span>
      </div>

      <!-- 标签情报 -->
      <div v-if="isFoodLog && displayTags.length > 0" class="mb-5 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-left">
        <div v-for="tag in displayTags" :key="tag" class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1.5 last:mb-0 flex items-start">
          <i class="fas fa-info-circle mr-1.5 mt-0.5 text-blue-400"></i>
          <span><strong :class="'text-'+tag">{{ tag }}</strong>: {{ getTagDesc(tag) }}</span>
        </div>
      </div>

      <!-- 数据网格 -->
      <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-5 grid grid-cols-2 gap-4">
        <div class="text-left" v-if="isFoodLog">
          <div class="text-xs text-slate-400">总重量</div>
          <div class="font-bold text-lg dark:text-white">{{ log.grams }}g</div>
        </div>
        <div class="text-left" v-if="isFoodLog">
          <div class="text-xs text-slate-400">总热量</div>
          <div class="font-bold text-lg dark:text-white">{{ log.calories }} kcal</div>
        </div>

        <div class="text-left col-span-2" v-if="isPure">
          <div class="text-xs text-slate-400">摄入能量</div>
          <div class="font-bold text-xl text-slate-700 dark:text-slate-200">
            {{ log.calories }} <span class="text-xs font-normal text-slate-400">kcal</span>
          </div>
        </div>

        <div class="text-left col-span-2" v-else-if="!isFoodLog && (log.damageTaken !== undefined || log.dodged)">
          <div v-if="log.dodged" class="text-green-500 font-bold text-xl">⚡ 完美闪避!</div>
          <div v-else>
            <div class="text-xs text-red-400 font-bold">实际受损 HP</div>
            <div class="font-bold text-2xl text-red-500">-{{ log.damageTaken }}</div>
            <div class="text-[10px] text-blue-400 mt-1 flex gap-2">
              <span v-if="log.blocked">🛡️ 已格挡 {{ log.blocked }}</span>
            </div>
          </div>
        </div>

        <div class="text-left" v-else>
          <div class="text-xs text-slate-400">实际伤害</div>
          <div class="font-bold font-rpg text-xl" :class="(log.multiplier || 1) < 1 ? 'text-red-400 opacity-60 line-through' : 'text-red-500'">
            {{ Math.floor(log.calories * (log.multiplier || 1)) }}
          </div>
          <div v-if="(log.multiplier || 1) < 1" class="text-[10px] text-red-500 font-bold">严重抵抗 (x{{ log.multiplier?.toFixed(2) }})</div>
          <div v-else-if="(log.multiplier || 1) > 1" class="text-[10px] text-green-500 font-bold">效果拔群 (x{{ log.multiplier?.toFixed(2) }})</div>
        </div>

        <div class="text-left">
          <div class="text-xs text-slate-400">时间</div>
          <div class="font-bold text-sm dark:text-white">{{ log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--' }}</div>
        </div>

        <div class="text-left">
          <div class="text-xs text-slate-400">类型</div>
          <div class="font-bold text-sm dark:text-white">{{ MEAL_LABELS[log.mealType] || log.mealType }}</div>
        </div>
      </div>

      <!-- 营养成分 -->
      <div class="space-y-2 mb-5" v-if="isFoodLog">
        <div class="flex justify-between text-xs"><span class="text-slate-500">蛋白质</span><span class="font-bold text-blue-500 text-sm">{{ log.p }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">碳水</span><span class="font-bold text-green-500 text-sm">{{ log.c }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">脂肪</span><span class="font-bold text-orange-500 text-sm">{{ log.f }}g</span></div>
      </div>

      <!-- RPG 收益 -->
      <div v-if="!isPure && (log.generatedGold || log.generatedExp)" class="bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-5 border border-purple-200 dark:border-purple-700/50">
        <div class="text-xs text-purple-600 dark:text-purple-300 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span>💰</span> 冒险收益
        </div>
        <div class="space-y-3">
          <div v-if="log.generatedExp" class="flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-xs">
              <span class="text-lg">⭐</span> 经验值
            </span>
            <span class="font-black text-xl text-purple-600 dark:text-purple-400">+{{ log.generatedExp }} EXP</span>
          </div>
          <div v-if="log.generatedGold" class="flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-xs">
              <span class="text-lg">💎</span> 金币
            </span>
            <span class="font-black text-xl text-yellow-600 dark:text-yellow-400">+{{ log.generatedGold }} G</span>
          </div>
        </div>
      </div>

      <div class="flex gap-4 mt-6">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500 h-10" plain round @click="handleDelete">
          <i class="fas fa-trash-alt mr-1"></i> {{ isPure ? '删除' : '撤销' }}
        </van-button>
        <van-button class="flex-1 h-10 font-bold" color="#7c3aed" round @click="show = false">关闭</van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 4px; }
.text-高糖 { color: #dc2626; }
.text-高油 { color: #d97706; }
.text-纯净 { color: #0891b2; }
.text-均衡 { color: #7c3aed; }
.text-低卡 { color: #059669; }
.text-充饥 { color: #d97706; }

/* Symbol 通用样式 */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
