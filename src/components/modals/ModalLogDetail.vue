<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { TAG_DEFS } from '@/constants/gameData';
import { showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => store.modals.logDetail,
  set: (val) => store.setModal('logDetail', val)
});

const log = computed(() => store.temp.selectedLog);
const isPure = computed(() => systemStore.isPureMode);

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

// [Fix] 添加 HYDRATION 映射
const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水'
};

const getTagDesc = (tag: string) => {
  if (isPure.value) {
    if(tag === '高糖') return '糖分较高，请适量食用';
    if(tag === '高油') return '脂肪含量较高';
    if(tag === '高碳') return '碳水化合物丰富';
    if(tag === '纯净') return '天然无添加';
    if(tag === '均衡') return '营养配比良好';
    return '普通属性';
  }
  if(tag === '高糖') return '容易被 [糖霜魔像] 克制，中断连击';
  if(tag === '高油') return '容易被 [油泥软怪] 克制，中断连击';
  if(tag === '高碳') return '容易被 [碳水强盗] 克制';
  if(tag === '纯净' || tag === '均衡') return '对大多数怪物有额外伤害加成，且容易触发连击';
  return '普通属性';
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '85%', maxHeight: '90%' }" class="dark:bg-slate-800 flex flex-col overflow-hidden">
    <div class="p-6 text-center overflow-y-auto" v-if="log">
      <!-- 图标与名称 -->
      <div class="text-6xl mb-4 filter drop-shadow-md">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-2">{{ log.name }}</h3>

      <!-- 标签展示区 -->
      <div class="flex flex-wrap justify-center gap-1 mb-4" v-if="log.damageTaken === undefined">
        <span v-for="tag in log.tags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1 rounded">
            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
        </span>
      </div>

      <!-- 标签情报 -->
      <div v-if="log.tags && log.tags.length > 0 && log.damageTaken === undefined" class="mb-4 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg text-left">
        <div v-for="tag in log.tags" :key="tag" class="text-[10px] text-slate-500 dark:text-slate-400 mb-1 last:mb-0 flex items-start">
          <i class="fas fa-info-circle mr-1 mt-0.5 text-blue-400"></i>
          <span><strong :class="'text-'+tag">{{ tag }}</strong>: {{ getTagDesc(tag) }}</span>
        </div>
      </div>

      <!-- 数据网格 -->
      <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4">
        <div class="text-left" v-if="log.damageTaken === undefined">
          <div class="text-xs text-slate-400">总重量</div>
          <div class="font-bold dark:text-white">{{ log.grams }}g</div>
        </div>
        <div class="text-left" v-if="log.damageTaken === undefined">
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

        <!-- RPG 模式 -->
        <div class="text-left col-span-2" v-else-if="log.damageTaken !== undefined || log.dodged">
          <div v-if="log.dodged" class="text-green-500 font-bold text-lg">⚡ 完美闪避!</div>
          <div v-else>
            <div class="text-xs text-red-400 font-bold">实际受损 HP</div>
            <div class="font-bold text-xl text-red-500">-{{ log.damageTaken }}</div>
            <div class="text-[10px] text-blue-400 mt-1 flex gap-2">
              <span v-if="log.blocked">🛡️ 已格挡 {{ log.blocked }}</span>
            </div>
          </div>
        </div>

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
          <!-- [Fix] 使用映射确保 HYDRATION 显示正确 -->
          <div class="font-bold text-xs dark:text-white">{{ MEAL_LABELS[log.mealType] || log.mealType }}</div>
        </div>
      </div>

      <!-- 营养成分 -->
      <div class="space-y-2 mb-4" v-if="log.damageTaken === undefined">
        <div class="flex justify-between text-xs"><span class="text-slate-500">蛋白质</span><span class="font-bold text-blue-500">{{ log.p }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">碳水</span><span class="font-bold text-green-500">{{ log.c }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">脂肪</span><span class="font-bold text-orange-500">{{ log.f }}g</span></div>
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
</style>
