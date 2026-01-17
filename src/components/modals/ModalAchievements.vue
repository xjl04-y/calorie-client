<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore'; // 引入 SystemStore 以判断 Pure 模式

const store = useGameStore();
const systemStore = useSystemStore();

const isPure = computed(() => systemStore.isPureMode);

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
  <van-popup v-model:show="show" round position="center" :style="{ width: '90%', height: '80%', maxHeight: '800px' }" class="overflow-hidden flex flex-col dark:bg-zinc-900" close-on-click-overlay>
    <div class="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 relative">

      <!-- 顶部 Header -->
      <div class="bg-white dark:bg-zinc-900 p-5 border-b border-zinc-100 dark:border-zinc-800 z-10">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-black text-xl text-zinc-800 dark:text-white flex items-center">
            <i class="fas mr-2" :class="isPure ? 'fa-medal text-emerald-500' : 'fa-trophy text-amber-500'"></i>
            {{ isPure ? '勋章墙' : '荣誉殿堂' }}
          </h3>
          <div class="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg text-zinc-500">
            <span :class="isPure ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">{{ progress.unlocked }}</span> / {{ progress.total }}
          </div>
        </div>

        <!-- 进度条 -->
        <div class="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-5">
          <div class="h-full transition-all duration-1000"
               :class="isPure ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'"
               :style="{ width: progress.percent + '%' }"></div>
        </div>

        <!-- 筛选 Tab -->
        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button v-for="tab in ['ALL', 'UNLOCKED', 'LOCKED', 'SLOT']" :key="tab"
                  @click="activeTab = tab"
                  class="px-4 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap"
                  :class="activeTab === tab
               ? (isPure
                   ? 'bg-zinc-800 text-white border-zinc-800'
                   : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800')
               : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'">
            {{ tab === 'ALL' ? '全部' : tab === 'UNLOCKED' ? '已解锁' : tab === 'LOCKED' ? '未解锁' : '按部位' }}
          </button>
        </div>

        <!-- 部位子筛选 (Pure 模式下可能不需要显示部位，或者改为“类别”，这里暂时保留) -->
        <div v-if="activeTab === 'SLOT'" class="flex gap-2 mt-3 overflow-x-auto no-scrollbar animate-fade-in-down">
          <button @click="activeSlotFilter = 'ALL_SLOTS'"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors"
                  :class="activeSlotFilter === 'ALL_SLOTS'
                    ? 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800'
                    : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'">
            所有
          </button>
          <button v-for="s in slots" :key="s.k" @click="activeSlotFilter = s.k"
                  class="px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors"
                  :class="activeSlotFilter === s.k
                    ? 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800'
                    : 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'">
            {{ s.n }}
          </button>
        </div>
      </div>

      <!-- 显式关闭按钮 -->
      <div class="absolute top-5 right-5 w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center cursor-pointer z-20 active:scale-90 transition hover:bg-zinc-200 dark:hover:bg-zinc-700" @click="show = false">
        <i class="fas fa-times text-zinc-400 text-sm"></i>
      </div>

      <!-- 列表内容 -->
      <div class="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950">
        <div class="grid grid-cols-2 gap-4 pb-4">
          <div v-for="ach in filteredList" :key="ach.id"
               class="rounded-2xl p-4 flex flex-col items-center text-center transition-all relative overflow-hidden group border"
               :class="ach.unlocked
                 ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md'
                 : 'bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60 grayscale'">

            <!-- Unlocked Glow -->
            <div v-if="ach.unlocked && !isPure" class="absolute inset-0 bg-amber-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div class="text-4xl mb-3 mt-1 transition-transform group-hover:scale-110 duration-300">{{ ach.icon }}</div>

            <div class="font-bold text-sm text-zinc-800 dark:text-zinc-200 mb-1 line-clamp-1">{{ ach.name }}</div>
            <div class="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed h-8 overflow-hidden line-clamp-2 px-1">{{ ach.desc }}</div>

            <!-- Reward Tag -->
            <div v-if="ach.unlocked"
                 class="mt-3 text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center"
                 :class="isPure
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'">
              <span v-if="!isPure">{{ ach.reward }}</span>
              <span v-else>已获得</span>
            </div>

            <div v-else class="mt-3 text-[10px] text-zinc-400 italic flex items-center">
              <i class="fas fa-lock text-[8px] mr-1.5 opacity-50"></i> 未解锁
            </div>

          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredList.length === 0" class="text-center py-16">
          <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-300 text-2xl">
            <i class="fas fa-search"></i>
          </div>
          <div class="text-xs text-zinc-400 font-bold">没有找到相关{{ isPure ? '勋章' : '成就' }}</div>
        </div>
      </div>

    </div>
  </van-popup>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-down {
  animation: fade-in-down 0.2s ease-out;
}
</style>
