<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useGameStore();
const { achievements } = storeToRefs(store);

const show = computed({
  get: () => store.modals.achievements,
  set: (val) => store.setModal('achievements', val)
});
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '90%', maxHeight: '80%' }" class="overflow-visible">
    <div class="p-6 bg-white dark:bg-slate-800 border-4 border-slate-800 dark:border-slate-600 rounded-3xl relative">
      <!-- 标题 Badge -->
      <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-1 rounded-full text-xs font-bold font-rpg tracking-widest border-2 border-white dark:border-slate-500">
        荣誉殿堂
      </div>

      <div class="grid grid-cols-2 gap-3 mt-4 max-h-[400px] overflow-y-auto no-scrollbar">
        <div v-for="ach in achievements" :key="ach.id"
             class="border-2 rounded-xl p-3 flex flex-col items-center text-center transition-all"
             :class="ach.unlocked ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 shadow-md' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 grayscale opacity-60'">

          <div class="text-3xl mb-2">{{ ach.icon }}</div>
          <div class="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1">{{ ach.name }}</div>
          <div class="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">{{ ach.desc }}</div>
        </div>
      </div>
    </div>
  </van-popup>
</template>
