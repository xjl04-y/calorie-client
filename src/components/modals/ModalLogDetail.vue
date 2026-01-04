<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { TAG_DEFS, MONSTERS } from '@/constants/gameData'; // [Fix] 引入 MONSTERS 数据
import { showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => store.modals.logDetail,
  set: (val) => store.setModal('logDetail', val)
});

const log = computed(() => store.temp.selectedLog);
const isPure = computed(() => systemStore.isPureMode);

// [Fix] 添加 HYDRATION 映射
const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水'
};

const isFoodLog = computed(() => {
  if (!log.value) return false;
  return !!MEAL_LABELS[log.value.mealType];
});

// [Fix] 标签显示净化 - 同步 ModalAddFood 的过滤逻辑
// 只展示核心营养标签，隐藏基础分类和感官标签
const displayTags = computed(() => {
  if (!log.value || !log.value.tags) return [];

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

  return log.value.tags.filter(t => !HIDDEN_TAGS.includes(t));
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

// [Fix] 动态生成标签描述 (软编码)
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

  // 动态查找具有对应弱点的怪物
  // 逻辑：如果标签是高糖，说明会被"忌糖/低碳"的怪物克制
  const findEnemy = (type: string) => {
    const m = MONSTERS.find(m => m.weaknessType === type);
    return m ? `[${m.name}]` : '此类怪物';
  };

  if(tag === '高糖') return `容易被 ${findEnemy('低碳')} 克制，中断连击`;
  if(tag === '高油') return `容易被 ${findEnemy('低脂')} 克制，中断连击`;
  if(tag === '高碳') return `容易被 ${findEnemy('低碳')} 克制，造成反伤`;

  // 增益类标签
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
      <div class="text-6xl mb-4 filter drop-shadow-md">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-2">{{ log.name }}</h3>

      <!-- 标签展示区 (使用 displayTags) -->
      <div class="flex flex-wrap justify-center gap-1 mb-4" v-if="isFoodLog && displayTags.length > 0">
        <span v-for="tag in displayTags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1 rounded">
            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
        </span>
      </div>

      <!-- 标签情报 (使用 displayTags) -->
      <div v-if="isFoodLog && displayTags.length > 0" class="mb-4 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg text-left">
        <div v-for="tag in displayTags" :key="tag" class="text-[10px] text-slate-500 dark:text-slate-400 mb-1 last:mb-0 flex items-start">
          <i class="fas fa-info-circle mr-1 mt-0.5 text-blue-400"></i>
          <span><strong :class="'text-'+tag">{{ tag }}</strong>: {{ getTagDesc(tag) }}</span>
        </div>
      </div>

      <!-- 数据网格 -->
      <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4">
        <!-- [Fix] 只要是 FoodLog，就显示重量 -->
        <div class="text-left" v-if="isFoodLog">
          <div class="text-xs text-slate-400">总重量</div>
          <div class="font-bold dark:text-white">{{ log.grams }}g</div>
        </div>
        <!-- [Fix] 只要是 FoodLog，就显示热量 -->
        <div class="text-left" v-if="isFoodLog">
          <div class="text-xs text-slate-400">总热量</div>
          <div class="font-bold dark:text-white">{{ log.calories }} kcal</div>
        </div>

        <!-- 纯净模式：始终显示热量 -->
        <div class="text-left col-span-2" v-if="isPure">
          <div class="text-xs text-slate-400">摄入能量</div>
          <div class="font-bold text-lg text-slate-700 dark:text-slate-200">
            {{ log.calories }} <span class="text-xs font-normal text-slate-400">kcal</span>
          </div>
        </div>

        <!-- RPG 模式 - 真正的怪物攻击 (非食物 且 有伤害/闪避) -->
        <div class="text-left col-span-2" v-else-if="!isFoodLog && (log.damageTaken !== undefined || log.dodged)">
          <div v-if="log.dodged" class="text-green-500 font-bold text-lg">⚡ 完美闪避!</div>
          <div v-else>
            <div class="text-xs text-red-400 font-bold">实际受损 HP</div>
            <div class="font-bold text-xl text-red-500">-{{ log.damageTaken }}</div>
            <div class="text-[10px] text-blue-400 mt-1 flex gap-2">
              <span v-if="log.blocked">🛡️ 已格挡 {{ log.blocked }}</span>
            </div>
          </div>
        </div>

        <!-- RPG 模式 - 食物攻击 (是食物，或者其他情况) -->
        <div class="text-left" v-else>
          <div class="text-xs text-slate-400">实际伤害</div>
          <div class="font-bold font-rpg text-lg" :class="(log.multiplier || 1) < 1 ? 'text-red-400 opacity-60 line-through' : 'text-red-500'">
            {{ Math.floor(log.calories * (log.multiplier || 1)) }}
          </div>
          <div v-if="(log.multiplier || 1) < 1" class="text-[8px] text-red-500 font-bold">严重抵抗 (x{{ log.multiplier?.toFixed(2) }})</div>
          <div v-else-if="(log.multiplier || 1) > 1" class="text-[8px] text-green-500 font-bold">效果拔群 (x{{ log.multiplier?.toFixed(2) }})</div>
        </div>

        <div class="text-left">
          <div class="text-xs text-slate-400">时间</div>
          <div class="font-bold text-xs dark:text-white">{{ log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--' }}</div>
        </div>

        <div class="text-left">
          <div class="text-xs text-slate-400">类型</div>
          <div class="font-bold text-xs dark:text-white">{{ MEAL_LABELS[log.mealType] || log.mealType }}</div>
        </div>
      </div>

      <!-- 营养成分 -->
      <div class="space-y-2 mb-4" v-if="isFoodLog">
        <div class="flex justify-between text-xs"><span class="text-slate-500">蛋白质</span><span class="font-bold text-blue-500">{{ log.p }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">碳水</span><span class="font-bold text-green-500">{{ log.c }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">脂肪</span><span class="font-bold text-orange-500">{{ log.f }}g</span></div>
      </div>

      <!-- RPG 收益 - 仅RPG模式显示 -->
      <div v-if="!isPure && (log.generatedGold || log.generatedExp)" class="bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-purple-200 dark:border-purple-700/50">
        <div class="text-xs text-purple-600 dark:text-purple-300 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span>💰</span> 冒险收益
        </div>
        <div class="space-y-2">
          <div v-if="log.generatedExp" class="flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-xs">
              <span class="text-lg">⭐</span> 经验值
            </span>
            <span class="font-black text-lg text-purple-600 dark:text-purple-400">+{{ log.generatedExp }} EXP</span>
          </div>
          <div v-if="log.generatedGold" class="flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-xs">
              <span class="text-lg">💎</span> 金币
            </span>
            <span class="font-black text-lg text-yellow-600 dark:text-yellow-400">+{{ log.generatedGold }} G</span>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500" plain round @click="handleDelete">
          <i class="fas fa-trash-alt mr-1"></i> {{ isPure ? '删除' : '撤销' }}
        </van-button>
        <van-button class="flex-1" color="#7c3aed" round @click="show = false">关闭</van-button>
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
</style>
