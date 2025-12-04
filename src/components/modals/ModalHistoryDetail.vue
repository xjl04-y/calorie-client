<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { TAG_DEFS } from '@/constants/gameData';

const store = useGameStore();

const show = computed({
  get: () => store.modals.historyDetail,
  set: (val) => store.setModal('historyDetail', val)
});

const date = computed(() => store.temp.selectedHistoryDate);
const logs = computed(() => date.value ? (store.logs[date.value] || []) : []);

const dateDisplay = computed(() => {
  if(!date.value) return '';
  const [y, m, d] = date.value.split('-');
  return `${m}月${d}日 战斗记录`;
});
</script>

<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full">
      <!-- 头部 -->
      <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
        <h3 class="font-bold text-lg dark:text-white">{{ dateDisplay }}</h3>
        <van-icon name="close" @click="show = false" class="text-slate-400"/>
      </div>

      <!-- 列表 -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="!logs || logs.length === 0" class="text-center text-slate-400 py-10">
          <div class="text-4xl mb-2">🍃</div>
          这天没有记录...
        </div>

        <div v-else class="space-y-3">
          <div v-for="log in logs" :key="log.id"
               class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
               :class="(log.damageTaken || log.dodged) ? 'border-red-500/30 bg-red-900/10' : ''">

            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <div class="text-2xl w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm">{{ log.icon }}</div>
                <div>
                  <div class="font-bold text-sm dark:text-slate-200">{{ log.name }}</div>
                  <div class="flex gap-1 mt-1" v-if="!log.damageTaken && !log.dodged">
                                        <span v-for="tag in log.tags" :key="tag" :class="'tag-'+tag" class="tag-badge text-[8px] px-1 rounded">
                                            {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label }}
                                        </span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5">{{ log.mealType }}</div>
                </div>
              </div>

              <!-- 右侧数值 -->
              <div class="text-right" v-if="log.dodged">
                <div class="text-green-500 font-bold">⚡ 闪避</div>
              </div>
              <div class="text-right" v-else-if="log.damageTaken">
                <div class="text-[10px] text-red-400 font-bold">反击伤害</div>
                <div class="font-rpg font-bold text-red-500 text-lg">-{{ log.damageTaken }}</div>
                <div v-if="log.blocked" class="text-[8px] text-blue-400">🛡️格挡 {{ log.blocked }}</div>
              </div>
              <div class="text-right" v-else>
                <div class="text-[10px] text-slate-400">热量 {{ log.calories }} kcal</div>
                <div class="font-rpg font-bold" :class="(log.multiplier||1) < 1 ? 'text-slate-400 line-through' : 'text-red-500'">
                  伤害 {{ Math.floor(log.calories * (log.multiplier || 1)) }}
                </div>
              </div>
            </div>
          </div>
        </div>
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
</style>
