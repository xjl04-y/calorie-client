<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { TAG_DEFS } from '@/constants/gameData';
import { showConfirmDialog } from 'vant';

const store = useGameStore();

const show = computed({
  get: () => store.modals.logDetail,
  set: (val) => store.setModal('logDetail', val)
});

const log = computed(() => store.temp.selectedLog);

const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: '时光倒流',
      message: '确定要撤销这条记录吗？\n该操作会回滚所有影响（HP、经验、怪物状态）。',
      confirmButtonText: '确认撤销',
      confirmButtonColor: '#7c3aed'
    }).then(() => {
      // [Fix] 空值检查，确保 log.value 存在
      if (log.value) {
        store.deleteLog(log.value);
        show.value = false; // 关闭弹窗
      }
    }).catch(() => {
      // 取消操作
    });
  }
};

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食'
};

const getTagDesc = (tag: string) => {
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

      <!-- [New Feature] 标签战斗情报 -->
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

        <!-- 受伤显示逻辑 -->
        <div class="text-left col-span-2" v-if="log.damageTaken !== undefined || log.dodged">
          <div v-if="log.dodged" class="text-green-500 font-bold text-lg">⚡ 完美闪避!</div>
          <div v-else>
            <div class="text-xs text-red-400 font-bold">实际受损 HP</div>
            <div class="font-bold text-xl text-red-500">-{{ log.damageTaken }}</div>
            <div class="text-[10px] text-blue-400 mt-1 flex gap-2">
              <span v-if="log.blocked">🛡️ 已格挡 {{ log.blocked }}</span>
            </div>
          </div>
        </div>

        <!-- 攻击显示逻辑 -->
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

        <!-- [Fix] 使用中文显示 -->
        <div class="text-left">
          <div class="text-xs text-slate-400">类型</div>
          <div class="font-bold text-xs dark:text-white">{{ MEAL_LABELS[log.mealType] || log.mealType }}</div>
        </div>
      </div>

      <!-- 营养成分 -->
      <div class="space-y-2 mb-4" v-if="log.damageTaken === undefined">
        <div class="flex justify-between text-xs"><span class="text-slate-500">蛋白质</span><span class="font-bold text-blue-500">{{ log.p }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">碳水</span><span class="font-bold text-green-500">{{ log.c }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">脂肪</span><span class="font-bold text-orange-500">{{ log.f }}g</span></div>
      </div>

      <!-- [New Feature] 复合食物成分表 -->
      <div v-if="log.isComposite && log.ingredients && log.ingredients.length > 0" class="bg-purple-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4 text-left border border-purple-100 dark:border-slate-600">
        <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center">
          <i class="fas fa-utensils mr-1"></i> 料理成分表
        </div>
        <div class="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
          <div v-for="(ing, idx) in log.ingredients" :key="idx" class="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
            <div class="flex items-center">
              <span class="text-lg mr-2">{{ ing.icon }}</span>
              <span class="text-xs font-bold dark:text-slate-200">{{ ing.name }}</span>
            </div>
            <div class="text-[10px] text-slate-400">
              {{ ing.calories }} kcal
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 mt-4">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500" plain round @click="handleDelete">
          <i class="fas fa-undo mr-1"></i> 撤销记录
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
/* 简单的 Tag 颜色映射 */
.text-高糖 { color: #dc2626; }
.text-高油 { color: #d97706; }
.text-纯净 { color: #0891b2; }
.text-均衡 { color: #7c3aed; }
</style>
