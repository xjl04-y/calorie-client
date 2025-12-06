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
      // @ts-ignore
      store.deleteLog(log.value);
    }).catch(() => {
      // 取消操作
    });
  }
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '85%' }" class="dark:bg-slate-800">
    <div class="p-6 text-center" v-if="log">
      <!-- 图标与名称 -->
      <div class="text-6xl mb-4">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-2">{{ log.name }}</h3>

      <!-- 标签 -->
      <div class="flex flex-wrap justify-center gap-1 mb-4" v-if="log.damageTaken === undefined">
                <span v-for="tag in log.tags" :key="tag" :class="'tag-'+tag" class="tag-badge text-xs px-2 py-1 rounded">
                    {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label }}
                </span>
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
        </div>

        <div class="text-left">
          <div class="text-xs text-slate-400">时间</div>
          <div class="font-bold text-xs dark:text-white">{{ log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--' }}</div>
        </div>
      </div>

      <!-- 营养成分 -->
      <div class="space-y-2 mb-4" v-if="log.damageTaken === undefined">
        <div class="flex justify-between text-xs"><span class="text-slate-500">蛋白质</span><span class="font-bold text-blue-500">{{ log.p }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">碳水</span><span class="font-bold text-green-500">{{ log.c }}g</span></div>
        <div class="flex justify-between text-xs"><span class="text-slate-500">脂肪</span><span class="font-bold text-orange-500">{{ log.f }}g</span></div>
      </div>

      <div class="flex gap-3">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500" plain round @click="handleDelete">
          <i class="fas fa-undo mr-1"></i> 撤销记录
        </van-button>
        <van-button class="flex-1" color="#7c3aed" round @click="show = false">关闭</van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.tag-HIGH_SUGAR { @apply bg-red-100 text-red-800 border-red-200 border; }
.tag-HIGH_FAT { @apply bg-yellow-100 text-yellow-800 border-yellow-200 border; }
.tag-HIGH_SODIUM { @apply bg-slate-200 text-slate-700 border-slate-300 border; }
.tag-HIGH_CARB { @apply bg-orange-100 text-orange-800 border-orange-200 border; }
.tag-HIGH_PRO { @apply bg-green-100 text-green-800 border-green-200 border; }
.tag-CLEAN { @apply bg-cyan-100 text-cyan-800 border-cyan-200 border; }
</style>
