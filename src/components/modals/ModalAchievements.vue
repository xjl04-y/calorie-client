<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';

const store = useGameStore();

const show = computed({
  get: () => store.modals.achievements,
  set: (val) => store.setModal('achievements', val)
});

// V2.6 New Feature: 筛选功能
const activeTab = ref('ALL'); // ALL, UNLOCKED, LOCKED, SLOT
const activeSlotFilter = ref('ALL_SLOTS');

const slots = [
  { k: 'HEAD', n: '头' }, { k: 'BODY', n: '身' }, { k: 'LEGS', n: '腿' },
  { k: 'WEAPON', n: '主' }, { k: 'OFFHAND', n: '副' }, { k: 'ACCESSORY', n: '饰' }
];

const filteredList = computed(() => {
  let list = store.achievements;

  if (activeTab.value === 'UNLOCKED') {
    list = list.filter(a => a.unlocked);
  } else if (activeTab.value === 'LOCKED') {
    list = list.filter(a => !a.unlocked);
  } else if (activeTab.value === 'SLOT') {
    if (activeSlotFilter.value !== 'ALL_SLOTS') {
      list = list.filter(a => a.slot === activeSlotFilter.value);
    }
  }

  // 排序：已解锁的在前，然后按 ID 排序
  return list.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return a.id - b.id;
  });
});

const progress = computed(() => {
  const total = store.achievements.length;
  const unlocked = store.achievements.filter(a => a.unlocked).length;
  return { unlocked, total, percent: Math.round(unlocked/total*100) };
});
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '90%', height: '80%', maxHeight: '800px' }" class="overflow-hidden flex flex-col dark:bg-slate-800" close-on-click-overlay>
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-800 relative">

      <!-- 顶部 Header -->
      <div class="bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-700 z-10">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-lg dark:text-white flex items-center">
            <i class="fas fa-medal text-yellow-500 mr-2"></i> 荣誉殿堂
          </h3>
          <div class="text-xs font-bold text-slate-400">
            收集进度: <span class="text-purple-600 dark:text-purple-400">{{ progress.unlocked }}/{{ progress.total }}</span>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
          <div class="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000" :style="{ width: progress.percent + '%' }"></div>
        </div>

        <!-- 筛选 Tab -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button v-for="tab in ['ALL', 'UNLOCKED', 'LOCKED', 'SLOT']" :key="tab"
                  @click="activeTab = tab"
                  class="px-3 py-1 text-xs font-bold rounded-full border transition-all whitespace-nowrap"
                  :class="activeTab === tab
               ? 'bg-purple-600 text-white border-purple-600 shadow-md'
               : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600'">
            {{ tab === 'ALL' ? '全部' : tab === 'UNLOCKED' ? '已解锁' : tab === 'LOCKED' ? '未解锁' : '按部位' }}
          </button>
        </div>

        <!-- 部位子筛选 -->
        <div v-if="activeTab === 'SLOT'" class="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
          <button @click="activeSlotFilter = 'ALL_SLOTS'"
                  class="px-2 py-0.5 text-[10px] rounded border"
                  :class="activeSlotFilter === 'ALL_SLOTS' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400'">
            所有
          </button>
          <button v-for="s in slots" :key="s.k" @click="activeSlotFilter = s.k"
                  class="px-2 py-0.5 text-[10px] rounded border"
                  :class="activeSlotFilter === s.k ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-400'">
            {{ s.n }}
          </button>
        </div>
      </div>

      <!-- 显式关闭按钮 -->
      <div class="absolute top-4 right-4 w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center cursor-pointer z-20 active:scale-90 transition" @click="show = false">
        <i class="fas fa-times text-slate-400"></i>
      </div>

      <!-- 列表内容 -->
      <div class="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800">
        <div class="grid grid-cols-2 gap-3 pb-4">
          <div v-for="ach in filteredList" :key="ach.id"
               class="border-2 rounded-xl p-3 flex flex-col items-center text-center transition-all relative overflow-hidden group"
               :class="ach.unlocked
                 ? 'bg-white dark:bg-slate-700/50 border-yellow-400/50 dark:border-yellow-600/50 shadow-sm'
                 : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60'">

            <div v-if="ach.unlocked" class="absolute inset-0 bg-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div class="text-3xl mb-2 filter" :class="ach.unlocked ? 'drop-shadow-md' : 'grayscale contrast-50'">{{ ach.icon }}</div>

            <div class="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1 line-clamp-1">{{ ach.name }}</div>
            <div class="text-[10px] text-slate-400 dark:text-slate-500 leading-tight h-8 overflow-hidden">{{ ach.desc }}</div>

            <div v-if="ach.unlocked" class="mt-2 text-[9px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-800">
              {{ ach.reward }}
            </div>
            <div v-else class="mt-2 text-[9px] text-slate-400 italic">
              <i class="fas fa-lock mr-1"></i> 未解锁
            </div>

          </div>
        </div>

        <div v-if="filteredList.length === 0" class="text-center py-10 text-slate-400">
          <div class="text-4xl mb-2 opacity-30">🔍</div>
          <div class="text-xs">没有找到相关成就</div>
        </div>
      </div>

    </div>
  </van-popup>
</template>
