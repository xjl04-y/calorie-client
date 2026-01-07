<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore, CUSTOM_QUEST_TEMPLATES } from '@/stores/useCollectionStore';
import { showToast } from 'vant';
import type { Quest } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();
const collectionStore = useCollectionStore();

const show = computed({
  get: () => store.modals.questBoard,
  set: (val) => store.setModal('questBoard', val)
});

const isPure = computed(() => systemStore.isPureMode);

// [Mod] 弹窗属性
const popupProps = computed(() => {
  if (isPure.value) {
    return {
      position: 'bottom',
      style: { height: '100%', width: '100%' },
      class: 'bg-slate-50 dark:bg-slate-900',
      closeable: false
    }
  }
  return {
    position: 'bottom',
    style: { height: '90%' },
    round: true,
    class: 'dark:bg-slate-900 overflow-hidden'
  }
});

const myQuests = computed(() => store.userQuests.filter(q => q.status !== 'CLAIMED'));
const hallQuests = computed(() => store.availableQuests);
const poolSize = computed(() => collectionStore.poolSize);

const activeRank = ref('ALL');
const ranks = ['ALL', 'D', 'C', 'B', 'A', 'S', 'SS'];

const showCustomCreator = ref(false);
const customForm = reactive({
  type: 'WATER',
  target: 5
});

const activeTemplate = computed(() => CUSTOM_QUEST_TEMPLATES.find(t => t.type === customForm.type) || CUSTOM_QUEST_TEMPLATES[0]);

const filteredHallQuests = computed(() => {
  if (activeRank.value === 'ALL') return hallQuests.value;
  return hallQuests.value.filter(q => q.rarity === activeRank.value);
});

onMounted(() => {
  store.refreshQuestHall();
});

const handleForceRefresh = () => {
  collectionStore.forceRefresh();
};

const handleAccept = (qId: string) => store.acceptQuest(qId);
const handleClaim = (qId: string) => {
  const exp = store.claimQuest(qId);
  if (exp > 0) {
    store.heroStore.addExp(exp, '任务奖励', 'QUEST_REWARD');
    showToast(`领取成功！经验 +${exp}`);
  }
};

const handleAbandon = (qId: string) => {
  collectionStore.abandonQuest(qId);
};

const handleCreateCustom = () => {
  const success = collectionStore.addCustomQuest(customForm.type, customForm.target);
  if (success) {
    showCustomCreator.value = false;
  }
};

const selectTemplate = (type: string) => {
  customForm.type = type;
  const t = CUSTOM_QUEST_TEMPLATES.find(temp => temp.type === type);
  if (t) customForm.target = t.default;
};

// [Color System] 优化后的稀有度颜色 - 更柔和、护眼
const getRarityColor = (r: string) => {
  if (isPure.value) return 'text-slate-500 bg-slate-100 border-slate-200';

  // SS: 柔和的玫瑰红
  if (r === 'SS') return 'text-rose-500 border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 animate-pulse';
  // S: 温暖的琥珀色
  if (r === 'S') return 'text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800';
  // A: 沉稳的靛青
  if (r === 'A') return 'text-indigo-500 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800';
  // B: 清爽的天蓝
  if (r === 'B') return 'text-sky-500 border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800';
  // C: 自然的翠绿
  if (r === 'C') return 'text-emerald-500 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800';

  return 'text-slate-500 border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700';
};

const getConditionText = (q: Quest) => {
  const t = q.target;
  const isRPG = !isPure.value;

  switch (q.type) {
    case 'COUNT': return isRPG ? `完成 ${t} 次补给记录` : `记录饮食 ${t} 次`;
    case 'PROTEIN': return isRPG ? `补充蛋白质 > ${t}g` : `摄入蛋白质 > ${t}g`;
    case 'VEG': return isRPG ? `收集 ${t} 份自然之礼(蔬果)` : `摄入蔬菜/水果 ${t} 份`;
    case 'WATER': return isRPG ? `补充水源 ${t} 次` : `饮水打卡 ${t} 次`;
    case 'CALORIE_CONTROL': return isRPG ? `热量控制在 ${t} kcal 以内` : `摄入不超过 ${t} kcal`;
    case 'LOW_CARB': return isRPG ? `执行 ${t} 次低碳战术` : `低碳饮食 ${t} 餐`;
    case 'LOW_FAT': return isRPG ? `执行 ${t} 次清淡战术` : `低脂饮食 ${t} 餐`;
    case 'LOW_SUGAR': return isRPG ? `执行 ${t} 次戒糖挑战` : `控糖饮食 ${t} 餐`;
    default: return `目标值 ${t}`;
  }
};
</script>

<template>
  <van-popup v-bind="popupProps" v-model:show="show" class="transition-all duration-300 flex flex-col">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      <!-- Header -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 sticky top-0 z-50 shadow-sm border-b dark:border-slate-700 flex items-center justify-between shrink-0 safe-area-top">
        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center" :class="isPure ? '' : 'font-rpg'">
          <span>
            <!-- Icon Color Change: Blue (Pure) / Amber (RPG) -->
            <i class="fas mr-2" :class="isPure ? 'fa-clipboard-list text-sky-500' : 'fa-scroll text-amber-500'"></i>
            {{ isPure ? '每日计划' : '公会大厅' }}
          </span>
        </h2>

        <div class="flex items-center gap-3">
          <span @click="handleForceRefresh" class="text-xs text-slate-400 font-sans font-normal active:text-teal-500 cursor-pointer hover:text-slate-600 transition-colors">
            库: {{ poolSize }} <i class="fas fa-sync-alt ml-1"></i>
          </span>
          <div @click="show = false" class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <i class="fas fa-times text-sm"></i>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar overscroll-contain transform-gpu pb-20">

        <!-- My Quests -->
        <div class="p-4 space-y-4">
          <div class="flex justify-between items-center mb-1">
            <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center">
              <!-- Sub-header Icon: Blue (Pure) / Teal (RPG) -->
              <i class="fas fa-tasks mr-1.5" :class="isPure ? 'text-sky-500' : 'text-teal-500'"></i>
              {{ isPure ? '我的目标' : '执行中' }}
              <span class="ml-1" :class="myQuests.length >= 4 ? 'text-rose-500' : 'text-slate-400'">
                ({{ myQuests.length }}/4)
              </span>
            </h3>
            <!-- Button Style: Clean outline styles -->
            <button @click="showCustomCreator = !showCustomCreator"
                    class="text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95 transition border flex items-center shadow-sm"
                    :class="isPure
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800'">
              <i class="fas mr-1.5" :class="showCustomCreator ? 'fa-minus' : 'fa-plus'"></i> {{ isPure ? '添加目标' : '自定委托' }}
            </button>
          </div>

          <!-- Custom Creator Panel -->
          <transition name="van-slide-down">
            <div v-if="showCustomCreator" class="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 mb-4 shadow-sm"
                 :class="isPure ? 'border-slate-100 dark:border-slate-700' : 'border-teal-100 dark:border-slate-700'">

              <div class="text-xs font-bold text-slate-500 mb-3 ml-1">选择类型</div>

              <div class="grid grid-cols-4 gap-2 mb-5">
                <div v-for="tpl in CUSTOM_QUEST_TEMPLATES" :key="tpl.type"
                     @click="selectTemplate(tpl.type)"
                     class="flex flex-col items-center justify-center p-2 rounded-xl border-2 cursor-pointer transition-all active:scale-95 h-20"
                     :class="customForm.type === tpl.type
                       ? (isPure
                           ? 'bg-sky-50 border-sky-500 text-sky-600'
                           : 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400')
                       : 'bg-slate-50 border-transparent text-slate-400 dark:bg-slate-700/50'">
                  <div class="text-xl mb-1">{{ tpl.icon }}</div>
                  <div class="text-[10px] font-bold text-center leading-tight">{{ tpl.title }}</div>
                </div>
              </div>

              <div class="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                <div class="text-xs text-slate-500 font-bold">
                  {{ activeTemplate.label }}:
                  <span class="text-lg mx-1 font-black" :class="isPure ? 'text-sky-600' : 'text-teal-600'">{{ customForm.target }}</span>
                  {{ activeTemplate.unit }}
                </div>
                <van-stepper v-model="customForm.target" :min="activeTemplate.min" :max="activeTemplate.max" :step="activeTemplate.type === 'PROTEIN' ? 5 : 1" button-size="28px" theme="round" />
              </div>

              <button @click="handleCreateCustom"
                      class="w-full py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition flex items-center justify-center text-white"
                      :class="isPure ? 'bg-slate-800' : 'bg-teal-600 hover:bg-teal-500'">
                <i class="fas fa-check-circle mr-2"></i> {{ isPure ? '确认添加' : '签署契约' }}
              </button>
            </div>
          </transition>

          <!-- Empty State -->
          <div v-if="myQuests.length === 0 && !showCustomCreator" class="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
            <div class="text-3xl mb-2 opacity-50 grayscale">{{ isPure ? '📋' : '📜' }}</div>
            <div class="text-xs">暂无进行中的{{ isPure ? '计划' : '委托' }}</div>
          </div>

          <!-- Quest List -->
          <div v-else class="space-y-3">
            <div v-for="q in myQuests" :key="q.id"
                 class="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group transition-all">

              <div v-if="q.status !== 'COMPLETED'"
                   @click.stop="handleAbandon(q.id)"
                   class="absolute top-2 right-2 text-slate-300 hover:text-rose-400 p-1.5 cursor-pointer z-10 transition-colors bg-white/50 dark:bg-slate-800/50 rounded-full">
                <i class="fas fa-times text-xs"></i>
              </div>

              <div class="flex justify-between items-start mb-2 pr-6">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                    <span v-if="!isPure" class="text-[9px] px-1.5 rounded border mr-1.5 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-xs text-slate-500 mt-1 line-clamp-1">{{ q.desc }}</div>
                </div>
                <div class="text-right pl-2 pt-1 min-w-[50px]">
                  <div class="text-sm font-mono font-black" :class="q.current >= q.target ? 'text-emerald-500' : 'text-slate-400'">
                    {{ q.current }}/{{ q.target }}
                  </div>
                </div>
              </div>

              <!-- Progress Bar: Emerald Green -->
              <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div class="h-full bg-emerald-500 transition-all duration-500 rounded-full" :style="{width: Math.min((q.current/q.target)*100, 100)+'%'}"></div>
              </div>

              <div class="flex justify-between items-center mt-2">
                <div class="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                  {{ getConditionText(q) }}
                </div>
                <div v-if="q.status === 'COMPLETED'">
                  <!-- Claim Button: Warm Amber/Orange -->
                  <van-button size="mini" color="linear-gradient(to right, #f59e0b, #d97706)" @click="handleClaim(q.id)" class="px-3 font-bold shadow-sm border-0">
                    领取 {{ q.rewardExp }} XP
                  </van-button>
                </div>
                <div v-else-if="!isPure" class="text-[9px] text-teal-500 font-bold">
                  奖励: {{ q.rewardExp }} XP
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4"></div>

        <!-- Quest Hall -->
        <div>
          <div class="sticky top-0 bg-slate-50 dark:bg-slate-900 z-40 px-4 pt-3 pb-2 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.05)] transition-shadow">
            <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>
                <i class="fas mr-1.5 text-slate-400" :class="isPure ? 'fa-list-ul' : 'fa-bullboard'"></i>
                {{ isPure ? '更多挑战' : '公会委托板' }}
              </span>
              <span class="text-[10px] text-slate-400 font-normal">可选: {{ filteredHallQuests.length }}</span>
            </h3>

            <!-- Rank Filters -->
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button v-for="r in ranks" :key="r" @click="activeRank = r"
                      class="px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap"
                      :class="activeRank === r
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'">
                {{ r === 'ALL' ? '全部' : r + (isPure ? '' : '级') }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 mt-2 px-4 pb-4">
            <div v-if="filteredHallQuests.length === 0" class="text-center py-8 text-slate-400 text-xs bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              暂无更多...
            </div>
            <div v-for="q in filteredHallQuests" :key="q.id" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                    <span v-if="!isPure" class="text-[9px] px-1.5 rounded border mr-1.5 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded inline-block">{{ getConditionText(q) }}</div>
                </div>

                <van-button size="small" plain type="primary" @click="handleAccept(q.id)"
                            :disabled="myQuests.length >= 4"
                            class="px-4 h-7 text-xs font-bold border-2"
                            :color="isPure ? '#0ea5e9' : '#0d9488'">
                  {{ myQuests.length >= 4 ? '已满' : '接取' }}
                </van-button>
              </div>
              <div v-if="!isPure" class="flex items-center text-[10px] text-slate-400 mt-1">
                <i class="fas fa-gift mr-1 text-amber-500"></i> 奖励: <span class="font-bold text-slate-600 dark:text-slate-300 ml-1">{{ q.rewardExp }} XP</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.van-slide-down-enter-active,
.van-slide-down-leave-active {
  transition: all 0.3s ease-out;
  max-height: 500px;
  opacity: 1;
}
.van-slide-down-enter-from,
.van-slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
</style>
