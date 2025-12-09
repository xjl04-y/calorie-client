<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { showToast } from 'vant';

const store = useGameStore();

const show = computed({
  get: () => store.modals.questBoard,
  set: (val) => store.setModal('questBoard', val)
});

const myQuests = computed(() => store.userQuests);
const hallQuests = computed(() => store.availableQuests);

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
  if (r === 'S') return 'text-orange-500 border-orange-200 bg-orange-50';
  if (r === 'A') return 'text-purple-500 border-purple-200 bg-purple-50';
  if (r === 'B') return 'text-blue-500 border-blue-200 bg-blue-50';
  return 'text-slate-500 border-slate-200 bg-slate-50';
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '85%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div class="p-4 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
        <h2 class="text-xl font-rpg text-slate-800 dark:text-white flex items-center">
          <i class="fas fa-scroll text-yellow-500 mr-2"></i> 冒险者公会
        </h2>
        <div class="text-xs text-slate-500 mt-1">每日 00:00 刷新委托列表</div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">

        <!-- 我的任务 -->
        <div>
          <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-3 flex justify-between">
            <span>进行中 ({{ myQuests.filter(q=>q.status!=='CLAIMED').length }}/4)</span>
          </h3>
          <div v-if="myQuests.length === 0" class="text-center py-6 text-slate-400 border-2 border-dashed rounded-xl">
            暂无任务，快去接取！
          </div>
          <div v-else class="space-y-2">
            <div v-for="q in myQuests" :key="q.id"
                 v-show="q.status !== 'CLAIMED'"
                 class="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200">
                    <span class="text-[10px] px-1 rounded border mr-1 font-mono" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-xs text-slate-500 mt-1">{{ q.desc }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-mono text-slate-400">{{ q.current }}/{{ q.target }}</div>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-green-500 transition-all" :style="{width: Math.min((q.current/q.target)*100, 100)+'%'}"></div>
              </div>

              <!-- 领取按钮 -->
              <div v-if="q.status === 'COMPLETED'" class="mt-2">
                <van-button block size="small" color="linear-gradient(to right, #fbbf24, #d97706)" @click="handleClaim(q.id)" class="font-bold">
                  领取奖励 (+{{ q.rewardExp }} XP)
                </van-button>
              </div>
            </div>
          </div>
        </div>

        <div class="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>

        <!-- 任务大厅 -->
        <div>
          <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-3">委托板</h3>
          <div class="grid grid-cols-1 gap-2">
            <div v-for="q in hallQuests" :key="q.id" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div class="font-bold text-sm dark:text-slate-200">
                  <span class="text-[10px] px-1 rounded border mr-1 font-mono" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                  {{ q.title }}
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">奖励: {{ q.rewardExp }} XP</div>
              </div>
              <van-button size="small" plain type="primary" @click="handleAccept(q.id)">接取</van-button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </van-popup>
</template>
