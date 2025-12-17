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
const myQuests = computed(() => store.userQuests);
const hallQuests = computed(() => store.availableQuests);

// 分类筛选
const activeRank = ref('ALL');
const ranks = ['ALL', 'D', 'C', 'B', 'A', 'S', 'SS'];

// 自定义任务状态
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

const handleAccept = (qId: string) => store.acceptQuest(qId);
const handleClaim = (qId: string) => {
  const exp = store.claimQuest(qId);
  if (exp > 0) {
    store.heroStore.addExp(exp);
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

// 动态颜色
const getRarityColor = (r: string) => {
  if (isPure.value) return 'text-slate-500 bg-slate-100 border-slate-200';
  if (r === 'SS') return 'text-red-500 border-red-200 bg-red-50 animate-pulse';
  if (r === 'S') return 'text-orange-500 border-orange-200 bg-orange-50';
  if (r === 'A') return 'text-purple-500 border-purple-200 bg-purple-50';
  if (r === 'B') return 'text-blue-500 border-blue-200 bg-blue-50';
  if (r === 'C') return 'text-green-600 border-green-200 bg-green-50';
  return 'text-slate-500 border-slate-200 bg-slate-50';
};

// 任务条件描述
const getConditionText = (q: Quest) => {
  const t = q.target;
  switch (q.type) {
    case 'COUNT': return `记录 ${t} 次饮食`;
    case 'PROTEIN': return `蛋白质 > ${t}g`;
    case 'VEG': return `蔬菜/纯净 > ${t} 份`;
    case 'WATER': return `饮水 > ${t} 次`;
    case 'CALORIE_CONTROL': return `热量累计 ${t} kcal`;
    case 'LOW_CARB': return `低碳餐 > ${t} 次`;
    case 'LOW_FAT': return `低脂餐 > ${t} 次`;
    case 'LOW_SUGAR': return `无糖餐 > ${t} 次`;
    default: return `目标 ${t}`;
  }
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      <!-- Header -->
      <div class="p-4 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm border-b dark:border-slate-700">
        <h2 class="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between" :class="isPure ? '' : 'font-rpg'">
          <span>
            <i class="fas mr-2" :class="isPure ? 'fa-clipboard-list text-blue-500' : 'fa-scroll text-yellow-500'"></i>
            {{ isPure ? '每日计划' : '冒险者公会' }}
          </span>
          <span class="text-xs text-slate-400 font-sans font-normal">00:00 刷新</span>
        </h2>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6">

        <!-- 进行中任务 -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 flex items-center">
              <i class="fas fa-tasks mr-1.5" :class="isPure ? 'text-blue-500' : 'text-purple-500'"></i>
              {{ isPure ? '我的目标' : '执行中' }} ({{ myQuests.filter(q=>q.status!=='CLAIMED').length }}/4)
            </h3>
            <button @click="showCustomCreator = !showCustomCreator"
                    class="text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95 transition border flex items-center shadow-sm"
                    :class="isPure ? 'bg-white border-slate-200 text-slate-600' : 'bg-purple-100 text-purple-600 border-purple-200'">
              <i class="fas mr-1.5" :class="showCustomCreator ? 'fa-minus' : 'fa-plus'"></i> {{ isPure ? '添加目标' : '自定委托' }}
            </button>
          </div>

          <!-- 自定义任务创建面板 (展开时显示) -->
          <transition name="van-slide-down">
            <div v-if="showCustomCreator" class="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 mb-4 shadow-sm"
                 :class="isPure ? 'border-slate-100 dark:border-slate-700' : 'border-purple-100 dark:border-slate-600'">

              <div class="text-xs font-bold text-slate-500 mb-3 ml-1">选择类型</div>

              <!-- 模板网格 -->
              <div class="grid grid-cols-4 gap-2 mb-5">
                <div v-for="tpl in CUSTOM_QUEST_TEMPLATES" :key="tpl.type"
                     @click="selectTemplate(tpl.type)"
                     class="flex flex-col items-center justify-center p-2 rounded-xl border-2 cursor-pointer transition-all active:scale-95 h-20"
                     :class="customForm.type === tpl.type
                       ? (isPure ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-purple-50 border-purple-500 text-purple-700')
                       : 'bg-slate-50 border-transparent text-slate-400 dark:bg-slate-700/50'">
                  <div class="text-xl mb-1">{{ tpl.icon }}</div>
                  <div class="text-[10px] font-bold text-center leading-tight">{{ tpl.title }}</div>
                </div>
              </div>

              <!-- 数值设定 -->
              <div class="flex items-center justify-between mb-4 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                <div class="text-xs text-slate-500 font-bold">
                  {{ activeTemplate.label }}:
                  <span class="text-lg mx-1 font-black" :class="isPure ? 'text-blue-600' : 'text-purple-600'">{{ customForm.target }}</span>
                  {{ activeTemplate.unit }}
                </div>
                <van-stepper v-model="customForm.target" :min="activeTemplate.min" :max="activeTemplate.max" :step="activeTemplate.type === 'PROTEIN' ? 5 : 1" button-size="28px" theme="round" />
              </div>

              <button @click="handleCreateCustom"
                      class="w-full py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition flex items-center justify-center"
                      :class="isPure ? 'bg-slate-800 text-white' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'">
                <i class="fas fa-check-circle mr-2"></i> {{ isPure ? '确认添加' : '签署契约' }}
              </button>
            </div>
          </transition>

          <!-- 空状态 -->
          <div v-if="myQuests.length === 0 && !showCustomCreator" class="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
            <div class="text-3xl mb-2 opacity-50">{{ isPure ? '📋' : '📜' }}</div>
            <div class="text-xs">暂无进行中的{{ isPure ? '计划' : '委托' }}</div>
          </div>

          <!-- 任务列表 -->
          <div v-else class="space-y-3">
            <div v-for="q in myQuests" :key="q.id"
                 v-show="q.status !== 'CLAIMED'"
                 class="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group transition-all">

              <div v-if="q.status !== 'COMPLETED'"
                   @click.stop="handleAbandon(q.id)"
                   class="absolute top-3 right-3 text-slate-300 hover:text-red-400 p-1 cursor-pointer z-10 transition-colors">
                <i class="fas fa-times text-sm"></i>
              </div>

              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                    <span v-if="!isPure" class="text-[9px] px-1.5 rounded border mr-1.5 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-xs text-slate-500 mt-1 line-clamp-1">{{ q.desc }}</div>
                </div>
                <div class="text-right pl-4 pt-1">
                  <div class="text-sm font-mono font-black" :class="q.current >= q.target ? 'text-green-500' : 'text-slate-400'">
                    {{ q.current }}/{{ q.target }}
                  </div>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div class="h-full bg-green-500 transition-all duration-500 rounded-full" :style="{width: Math.min((q.current/q.target)*100, 100)+'%'}"></div>
              </div>

              <!-- 条件标签 & 奖励 -->
              <div class="flex justify-between items-center mt-2">
                <div class="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                  {{ getConditionText(q) }}
                </div>
                <div v-if="q.status === 'COMPLETED'">
                  <van-button size="mini" color="linear-gradient(to right, #fbbf24, #d97706)" @click="handleClaim(q.id)" class="px-3 font-bold shadow-sm">
                    领取 {{ q.rewardExp }} XP
                  </van-button>
                </div>
                <div v-else-if="!isPure" class="text-[9px] text-purple-400 font-bold">
                  奖励: {{ q.rewardExp }} XP
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

        <!-- 任务大厅 (仅 RPG 模式显示) -->
        <div v-if="!isPure">
          <div class="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 pb-2">
            <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-center">
              <i class="fas fa-bullboard mr-1.5 text-slate-400"></i> 公会委托板
            </h3>
            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button v-for="r in ranks" :key="r" @click="activeRank = r"
                      class="px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap"
                      :class="activeRank === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'">
                {{ r === 'ALL' ? '全部' : r + '级' }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 mt-2">
            <div v-if="filteredHallQuests.length === 0" class="text-center py-8 text-slate-400 text-xs bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              该等级暂无委托...
            </div>
            <div v-for="q in filteredHallQuests" :key="q.id" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                    <span class="text-[9px] px-1.5 rounded border mr-1.5 font-mono font-black" :class="getRarityColor(q.rarity)">{{ q.rarity }}</span>
                    {{ q.title }}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded inline-block">{{ getConditionText(q) }}</div>
                </div>
                <van-button size="small" plain type="primary" @click="handleAccept(q.id)" class="px-4 h-7 text-xs font-bold border-2">接取</van-button>
              </div>
              <div class="flex items-center text-[10px] text-slate-400 mt-1">
                <i class="fas fa-gift mr-1 text-yellow-500"></i> 奖励: <span class="font-bold text-slate-600 dark:text-slate-300 ml-1">{{ q.rewardExp }} XP</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
/* 优化滑动动画 */
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
</style>
