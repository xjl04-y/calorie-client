<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useGameStore();
const { heroStats } = storeToRefs(store);

const show = computed({
  get: () => store.modals.hpHistory,
  set: (val) => store.setModal('hpHistory', val)
});

// 筛选所有受伤或闪避的日志
const hpLogs = computed(() => {
  const allLogs: any[] = [];
  // 遍历 store.logs 中的所有日期
  Object.values(store.logs).forEach(dayLogs => {
    dayLogs.forEach(log => {
      if (log.damageTaken !== undefined || log.dodged) {
        allLogs.push(log);
      }
    });
  });
  // 按时间倒序
  return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '60%' }" class="dark:bg-slate-900">
    <div class="p-4 h-full flex flex-col">
      <h3 class="font-bold text-center mb-4 dark:text-white">❤️ 英雄状态</h3>

      <!-- 实时属性展示 -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-slate-700 flex items-center">
          <div class="text-2xl mr-2">🛡️</div>
          <div>
            <div class="text-xs text-slate-500">物理格挡</div>
            <div class="font-bold text-blue-600 dark:text-blue-400">{{ heroStats.blockValue }} 点</div>
          </div>
        </div>
        <div class="bg-green-50 dark:bg-slate-800 p-3 rounded-xl border border-green-100 dark:border-slate-700 flex items-center">
          <div class="text-2xl mr-2">⚡</div>
          <div>
            <div class="text-xs text-slate-500">闪避几率</div>
            <div class="font-bold text-green-600 dark:text-green-400">{{ (heroStats.dodgeChance * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>

      <h4 class="text-xs text-slate-400 mb-2 font-bold">最近受伤记录</h4>
      <div class="flex-1 overflow-y-auto">
        <div v-if="hpLogs.length === 0" class="text-center text-slate-400 py-10">暂无受伤记录，英雄非常健康！</div>

        <div v-for="log in hpLogs" :key="log.id" class="flex items-center p-3 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div class="text-2xl mr-3">{{ log.icon }}</div>
          <div class="flex-1">
            <div class="font-bold text-sm dark:text-white">{{ log.name }}</div>
            <div class="text-[10px] text-slate-400">{{ new Date(log.timestamp).toLocaleString() }}</div>
            <div class="flex gap-2 mt-1">
              <span v-if="log.blocked" class="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">🛡️ 挡{{ log.blocked }}</span>
              <span v-if="log.dodged" class="text-[9px] bg-green-100 text-green-600 px-1 rounded">⚡ 闪避</span>
            </div>
          </div>
          <div class="font-bold" :class="log.damageTaken ? 'text-red-500' : 'text-green-500'">
            {{ log.dodged ? 'MISS' : (log.damageTaken ? '-' + log.damageTaken : '回复') }}
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>
