<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { showToast } from 'vant';
import type { Quest } from '@/types';

const store = useGameStore();

const show = computed({
  get: () => store.modals.questBoard,
  set: (val) => store.setModal('questBoard', val)
});

const myQuests = computed(() => store.userQuests);
const hallQuests = computed(() => store.availableQuests);

// V3.2: 任务分类筛选
const activeRank = ref('ALL');
const ranks = ['ALL', 'D', 'C', 'B', 'A', 'S', 'SS'];

const filteredHallQuests = computed(() => {
  if (activeRank.value === 'ALL') return hallQuests.value;
  return hallQuests.value.filter(q => q.rarity === activeRank.value);
});

onMounted(() => {
  store.refreshQuestHall();
});

const handleAccept = (qId: string) => store.acceptQuest(qId);
const handleClaim = (qId: string) => {
  const exp = store.claimQuest(qId);
  if (exp > 0) {
    store.heroStore.addExp(exp);
    showToast(`领取成功！经验 +${exp}`);
  }
};

const getRarityColor = (r: string) => {
  if (r === 'SS') return 'text-red-500 border-red-200 bg-red-50 animate-pulse'; // SS 级特效
  if (r === 'S') return 'text-orange-500 border-orange-200 bg-orange-50';
  if (r === 'A') return 'text-purple-500 border-purple-200 bg-purple-50';
  if (r === 'B') return 'text-blue-500 border-blue-200 bg-blue-50';
  if (r === 'C') return 'text-green-600 border-green-200 bg-green-50';
  return 'text-slate-500 border-slate-200 bg-slate-50';
};

// [Fix V3.2] 生成明确的任务条件描述
const getConditionText = (q: Quest) => {
  switch (q.type) {
    case 'COUNT': return `目标：累计记录 ${q.target} 次`;
    case 'PROTEIN': return `目标：蛋白质摄入 > ${q.target}g`;
    case 'VEG': return `目标：蔬菜/水果/纯净食物 > ${q.target} 份`;
    case 'WATER': return `目标：饮水 > ${q.target} 次`;
    case 'CALORIE_CONTROL':
      if (q.id.includes('ss1')) return `目标：全天热量 < ${q.target} kcal`; // 特殊逻辑
      return `目标：控制/累计热量达 ${q.target} kcal`;
    case 'LOW_CARB': return `目标：无高糖且低碳记录 > ${q.target} 次`;
    case 'LOW_FAT': return `目标：无高油且低脂记录 > ${q.target} 次`;
    default: return `目标：完成指定条件 ${q.target} 次`;
  }
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div class="p-4 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm border-b dark:border-slate-700">
        <h2 class="text-xl font-rpg text-slate-800 dark:text-white flex items-center justify-between">
          <span><i class="fas fa-scroll text-yellow-500 mr-2"></i> 冒险者公会</span>
          <span class="text-xs text-slate-400 font-sans">每日 00:00 刷新</span>
        </h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">

        <!-- 我的任务 -->
        <div>
          <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-3 flex justify-between items-center">
            <span><i class="fas fa-clipboard-check mr-1 text-purple-500"></i> 进行中 ({{ myQuests.filter(q=>q.status!=='CLAIMED').length }}/4)</span>
          </h3>
          <div v-if="myQuests.length === 0" class="text-center py-6 text-slate-400 border-2 border-dashed rounded-xl bg-slate-100 dark:bg-slate-800/50">
            暂无任务，快去下方接取！
          </div>
          <div v-else class="space-y-2">
            <div v-for="q in myQuests" :key="q.id"
                 v-show="q.status !== 'CLAIMED'"
                 class="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200">
                    <span class="text-[10px] px-1 rounded border mr-1 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-xs text-slate-500 mt-1">{{ q.desc }}</div>
                  <!-- [New] 显示明确条件 -->
                  <div class="text-[10px] text-blue-500 mt-1 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded inline-block">
                    {{ getConditionText(q) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-mono font-bold" :class="q.current >= q.target ? 'text-green-500' : 'text-slate-400'">
                    {{ q.current }}/{{ q.target }}
                  </div>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-green-500 transition-all duration-500" :style="{width: Math.min((q.current/q.target)*100, 100)+'%'}"></div>
              </div>

              <!-- 领取按钮 -->
              <div v-if="q.status === 'COMPLETED'" class="mt-2">
                <van-button block size="small" color="linear-gradient(to right, #fbbf24, #d97706)" @click="handleClaim(q.id)" class="font-bold shadow-md">
                  领取奖励 (+{{ q.rewardExp }} XP)
                </van-button>
              </div>
            </div>
          </div>
        </div>

        <div class="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>

        <!-- 任务大厅 -->
        <div>
          <div class="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 pb-2">
            <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-2"><i class="fas fa-bullboard mr-1"></i> 委托板</h3>
            <!-- 分类 Tabs -->
            <div class="flex gap-2 overflow-x-auto no-scrollbar">
              <button v-for="r in ranks" :key="r" @click="activeRank = r"
                      class="px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap"
                      :class="activeRank === r ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'">
                {{ r === 'ALL' ? '全部' : r + '级' }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 mt-2">
            <div v-if="filteredHallQuests.length === 0" class="text-center py-8 text-slate-400 text-xs">
              该等级暂无委托...
            </div>
            <div v-for="q in filteredHallQuests" :key="q.id" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200">
                    <span class="text-[10px] px-1 rounded border mr-1 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <!-- [New] 显示明确条件 -->
                  <div class="text-[10px] text-slate-400 mt-1">{{ getConditionText(q) }}</div>
                </div>
                <van-button size="small" plain type="primary" @click="handleAccept(q.id)" class="px-4 h-7 text-xs">接取</van-button>
              </div>
              <div class="flex items-center text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded">
                <i class="fas fa-gift mr-1 text-yellow-500"></i> 奖励: <span class="font-bold text-slate-600 dark:text-slate-300 ml-1">{{ q.rewardExp }} XP</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </van-popup>
</template>
