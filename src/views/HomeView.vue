<script lang="ts">
export default { name: 'Home' }; // [Fix] 显式命名，配合 KeepAlive include 使用
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import AppHud from '@/components/AppHud.vue';
import DateNavigator from '@/components/DateNavigator.vue';
import { showConfirmDialog } from 'vant';
import type { FoodLog, MealType } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const user = computed(() => store.user);
const stageInfo = computed(() => store.stageInfo);
const comboState = computed(() => store.comboState);
const activeQuests = computed(() => store.userQuests.filter(q => q.status !== 'CLAIMED'));
const skillPoints = computed(() => store.user.skillPoints);
const skillStatus = computed(() => store.heroStore.skillStatus);
const raceSkill = computed(() => store.heroStore.raceSkill);
const env = computed(() => store.environment);
// [Pure Mode] 如果是纯净模式，不显示飘字
const floatingTexts = computed(() => systemStore.isPureMode ? [] : (store.temp.floatingTexts || []));
const isExhausted = computed(() => store.heroStore.isExhausted);
// 访问纯净模式状态
const isPure = computed(() => systemStore.isPureMode);

const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });
const dailyTarget = computed(() => store.dailyTarget);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食'
};

onMounted(() => {
  if (store.user.isInitialized) {
    store.refreshQuestHall();
  }
});

const handleSkillClick = () => {
  if (!raceSkill.value) return;
  if (skillStatus.value.active) {
    store.setModal('addFood', true);
    return;
  }
  if (!skillStatus.value.ready) {
    return;
  }
  store.heroStore.activateSkill();
};

const hpPercent = computed(() => {
  if (!stageInfo.value.currentObj) return 0;
  return Math.floor((stageInfo.value.currentHpRemaining / stageInfo.value.currentObj.maxHp) * 100);
});

const hpBarColor = computed(() => {
  if (stageInfo.value.isOverloaded) return 'bg-red-600 animate-pulse';
  if (hpPercent.value < 20) return 'bg-red-500';
  if (hpPercent.value < 50) return 'bg-yellow-500';
  return 'bg-green-500';
});

const weaknessColor = computed(() => {
  const type = stageInfo.value.currentObj?.data?.weaknessType;
  if (type === '低碳' || type === 'LOW_CARB') return 'text-orange-400 border-orange-400 bg-orange-900/20';
  if (type === '低脂' || type === 'LOW_FAT') return 'text-yellow-400 border-yellow-400 bg-yellow-900/20';
  if (type === '高蛋白' || type === 'HIGH_PRO') return 'text-red-400 border-red-400 bg-red-900/20';
  return 'text-blue-400 border-blue-400 bg-blue-900/20';
});

const comboColor = computed(() => {
  const c = comboState.value.count;
  if (c >= 5) return 'text-purple-500 from-purple-500 to-pink-500';
  if (c >= 2) return 'text-blue-500 from-blue-500 to-cyan-500';
  return 'text-slate-400 from-slate-400 to-slate-300';
});

const confirmDelete = (log: FoodLog) => {
  showConfirmDialog({
    title: isPure.value ? '确认删除' : '时光倒流',
    message: isPure.value ? '确定要删除这条记录吗？' : '确定要撤销这条记录吗？',
    confirmButtonText: '确认',
    confirmButtonColor: '#1e293b'
  }).then(() => {
    store.deleteLog(log);
  }).catch(() => {});
};

const rpgMeals = [
  { key: 'BREAKFAST', label: '早餐', rpgName: '晨间补给', icon: '🌅' },
  { key: 'LUNCH', label: '午餐', rpgName: '营火烹饪', icon: '⛺' },
  { key: 'DINNER', label: '晚餐', rpgName: '庆功晚宴', icon: '🏰' },
  { key: 'SNACK', label: '零食', rpgName: '炼金药剂', icon: '🧪' }
];

const openAddFood = (key: MealType) => {
  store.temp.activeMealType = key;
  store.setModal('addFood', true);
}

const openLogDetail = (log: FoodLog) => {
  store.temp.selectedLog = log;
  store.setModal('logDetail', true);
}
</script>

<template>
  <div class="pb-24 relative">
    <!-- 战斗飘字层 (纯净模式下隐藏) -->
    <div v-if="!isPure" class="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <transition-group name="float-up">
        <div v-for="ft in floatingTexts" :key="ft.id"
             class="absolute text-2xl font-black font-rpg drop-shadow-md text-stroke"
             :class="{
               'text-red-500': ft.type === 'DAMAGE',
               'text-green-400': ft.type === 'HEAL',
               'text-yellow-400 text-3xl': ft.type === 'CRIT',
               'text-blue-400': ft.type === 'BLOCK',
               'text-purple-300 text-sm': ft.type === 'EXP'
             }"
             :style="{ left: ft.x + '%', top: ft.y + '%' }">
          {{ ft.text }}
        </div>
      </transition-group>
    </div>

    <!-- 力竭状态遮罩 (纯净模式隐藏) -->
    <div v-if="isExhausted && !isPure" class="fixed inset-0 pointer-events-none z-30 shadow-[inset_0_0_60px_20px_rgba(220,38,38,0.5)] animate-pulse"></div>
    <div v-if="isExhausted && !isPure" class="absolute top-14 left-4 right-4 z-40 animate-bounce">
      <div class="bg-red-600/90 text-white px-4 py-2 rounded-xl border-2 border-red-400 shadow-lg backdrop-blur flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="fas fa-heart-broken text-xl"></i>
          <div>
            <div class="text-sm font-black">英雄力竭!</div>
            <div class="text-[10px] opacity-90">伤害减半，请补充营养恢复HP</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 顶部 HUD (纯净模式保留，作为基础状态栏) -->
    <AppHud @open-achievements="store.setModal('achievements', true)" />

    <!-- 日期导航 -->
    <div id="guide-date">
      <DateNavigator />
    </div>

    <!-- 战地情报 (纯净模式隐藏) -->
    <!-- [Fix] 增加 env 存在性检查 -->
    <div v-if="!isPure && env" class="px-4 mt-3 flex gap-3" id="guide-env">
      <div class="flex-1 bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-2.5 border border-orange-100 dark:border-slate-700 flex items-center shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center mr-2">
          <i class="fas fa-fire-alt"></i>
        </div>
        <div>
          <div class="text-[9px] text-slate-400 uppercase tracking-wide">连续讨伐</div>
          <div class="text-sm font-black text-slate-700 dark:text-slate-200">
            {{ user.loginStreak }} <span class="text-[9px] font-normal">天</span>
          </div>
        </div>
      </div>

      <div class="flex-[1.5] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-2.5 border border-blue-100 dark:border-slate-700 flex items-center shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mr-2 text-lg">
          {{ env.icon }}
        </div>
        <div>
          <div class="text-[9px] text-slate-400 uppercase tracking-wide">今日环境: {{ env.name }}</div>
          <div class="text-[10px] font-bold" :class="env.color">
            {{ env.desc }}
          </div>
        </div>
      </div>
    </div>

    <!-- 公会与技能入口 (纯净模式隐藏技能树，保留任务板改名为“今日目标”) -->
    <div v-if="!isPure" class="px-4 mt-3 grid grid-cols-2 gap-3">
      <div @click="store.setModal('questBoard', true)" id="guide-quest"
           class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group">
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fas fa-scroll"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-700 dark:text-slate-200">公会大厅</div>
            <div class="text-[10px] text-slate-400">进行中: {{ activeQuests.length }}/4</div>
          </div>
        </div>
        <i v-if="!isPure" class="fas fa-scroll absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-[-15deg]"></i>
      </div>

      <div @click="store.setModal('skillTree', true)" id="guide-skill"
           class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group">
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fas fa-project-diagram"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-700 dark:text-slate-200">天赋技能</div>
            <div class="text-[10px] text-slate-400 flex items-center gap-1">
              SP: <span class="text-yellow-500 font-bold">{{ skillPoints }}</span>
            </div>
          </div>
        </div>
        <div v-if="skillPoints > 0" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse z-20"></div>
        <i v-if="!isPure" class="fas fa-dna absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-12"></i>
      </div>
    </div>

    <!-- 纯净模式：简易任务入口 -->
    <div v-if="isPure" class="px-4 mt-3" @click="store.setModal('questBoard', true)">
      <div id="guide-quest" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between active:scale-95 transition">
        <div class="flex items-center gap-3">
          <i class="fas fa-tasks text-blue-500 text-lg"></i>
          <span class="text-sm font-bold text-slate-700 dark:text-slate-200">每日打卡任务</span>
        </div>
        <span class="text-xs text-slate-400">{{ activeQuests.length }} 进行中</span>
      </div>
    </div>

    <!-- Monster Card (纯净模式隐藏，替换为数据看板) -->
    <!-- [Fix] 增加 stageInfo.currentObj 存在性检查，防止切换模式瞬间数据未就绪导致的渲染崩溃 -->
    <div v-if="!isPure && stageInfo && stageInfo.currentObj" class="mx-4 mt-4 relative" id="guide-monster">
      <div v-if="raceSkill"
           class="absolute -top-3 -right-2 z-30 flex flex-col items-center"
           @click="handleSkillClick">
        <div class="w-14 h-14 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl transition-all active:scale-95 cursor-pointer bg-slate-800 relative overflow-hidden group"
             :class="[
                    skillStatus.active ? 'border-yellow-400 animate-pulse ring-4 ring-yellow-400/30' :
                    skillStatus.ready ? 'border-green-400 hover:scale-105' : 'border-slate-600 grayscale'
                  ]">
          <span class="relative z-10">{{ raceSkill.icon }}</span>
          <div v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
            <span class="text-[10px] font-bold text-white font-mono">{{ skillStatus.text }}</span>
          </div>
          <svg v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
            <path class="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" />
            <path class="text-green-500 transition-all duration-1000"
                  :stroke-dasharray="skillStatus.percent + ', 100'"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" stroke-width="4" />
          </svg>
        </div>
        <div class="mt-1 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] text-white font-bold whitespace-nowrap"
             :class="skillStatus.active ? 'text-yellow-300' : ''">
          {{ skillStatus.active ? '生效中' : raceSkill.name }}
        </div>
      </div>

      <div class="bg-slate-900 dark:bg-black rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border-2 transition-all duration-300"
           :class="stageInfo.isOverloaded ? 'border-red-500 shadow-red-500/50 animate-pulse-slow' : 'border-slate-700'">

        <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse-slow"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 z-0"></div>

        <div v-if="comboState.count > 1" class="absolute top-2 left-2 z-20 flex flex-col items-start animate-bounce">
          <div class="text-xs font-bold italic text-yellow-300 tracking-wider">COMBO</div>
          <div class="text-3xl font-black italic bg-clip-text text-transparent bg-gradient-to-b" :class="comboColor">
            x{{ comboState.count }}
          </div>
        </div>

        <div v-if="stageInfo.isOverloaded" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500/20 font-black text-6xl rotate-12 pointer-events-none z-0">
          BERSERK
        </div>

        <div class="relative z-10 flex items-center justify-between mb-4 mt-2">
          <div class="flex items-center">
            <div class="relative">
              <div class="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border border-slate-600 shadow-inner"
                   :class="{'animate-bounce': stageInfo.isOverloaded}">
                {{ stageInfo.currentObj?.data?.icon || '❓' }}
              </div>
              <div v-if="stageInfo.isBoss" class="absolute -top-2 -right-2 bg-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-white/20">BOSS</div>
            </div>
            <div class="ml-4 max-w-[120px]">
              <div class="text-xl font-rpg tracking-wider truncate" :class="stageInfo.isOverloaded ? 'text-red-400' : ''">
                {{ stageInfo.currentObj?.data?.name || '未知敌人' }}
              </div>
              <div class="text-[10px] mt-1 flex items-center">
                <span class="mr-1 text-slate-400">弱点:</span>
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide truncate" :class="weaknessColor">
                    {{ stageInfo.currentObj?.data?.weakness || '无' }}
                  </span>
              </div>
            </div>
          </div>
          <div class="text-right mt-6 mr-4">
            <div class="text-2xl font-black font-mono tracking-tight">{{ stageInfo.currentHpRemaining }}</div>
            <div class="text-[9px] text-slate-500 uppercase tracking-widest">Enemy HP</div>
          </div>
        </div>
        <div class="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
          <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold z-10 drop-shadow-md">{{ hpPercent }}%</div>
          <div class="h-full transition-all duration-1000 ease-out relative" :class="hpBarColor" :style="{ width: hpPercent + '%' }">
            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>
        <div class="flex justify-between items-center px-1">
          <div class="flex gap-1">
            <div v-for="(s, idx) in stageInfo.stages" :key="idx" class="w-1.5 h-1.5 rounded-full transition-all" :class="idx <= stageInfo.currentIndex ? 'bg-green-500 scale-125' : 'bg-slate-700'"></div>
          </div>
          <div class="text-[9px] text-slate-500">
            {{ stageInfo.isOverloaded ? 'Boss 已暴走！伤害翻倍！' : (stageInfo.isBoss ? '最终决战' : `第 ${stageInfo.currentIndex + 1} 波`) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 纯净模式：数据看板 -->
    <div v-else class="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700" id="guide-monster">
      <div class="flex justify-between items-end mb-3">
        <span class="text-sm text-slate-500 font-bold">今日热量摄入</span>
        <div class="text-right">
          <span class="font-mono font-black text-2xl dark:text-white">{{ todayMacros.cals }}</span>
          <span class="text-xs text-slate-400 ml-1">/ {{ dailyTarget }} kcal</span>
        </div>
      </div>
      <div class="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <div class="h-full bg-blue-500 rounded-full" :style="{ width: Math.min((todayMacros.cals / dailyTarget) * 100, 100) + '%' }"></div>
      </div>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-400 mb-1">蛋白质</div>
          <div class="font-bold text-blue-500">{{ todayMacros.p }}g</div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-400 mb-1">碳水</div>
          <div class="font-bold text-green-500">{{ todayMacros.c }}g</div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-400 mb-1">脂肪</div>
          <div class="font-bold text-orange-500">{{ todayMacros.f }}g</div>
        </div>
      </div>
    </div>

    <!-- 冒险行动 Title -->
    <div class="px-4 mt-6 mb-2 flex justify-between items-center" id="guide-meals">
      <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">{{ isPure ? '饮食记录' : '冒险行动' }}</h3>

      <!-- [Fix] 纯净模式下也显示引导按钮，文案调整 -->
      <button @click="store.setModal('npcGuide', true)" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition flex items-center">
        <i class="fas fa-comment-dots mr-1"></i> {{ isPure ? '使用帮助' : '导师通讯' }}
      </button>
    </div>

    <div class="px-4 grid grid-cols-2 gap-3 mb-6">
      <div v-for="m in rpgMeals" :key="m.key" @click="openAddFood(m.key as MealType)" class="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-slate-700 active:scale-95 transition cursor-pointer hover:border-purple-300 dark:hover:border-purple-700">
        <div class="text-2xl bg-slate-50 dark:bg-slate-700 w-10 h-10 flex items-center justify-center rounded-lg">{{ m.icon }}</div>
        <div>
          <div class="text-sm font-bold dark:text-slate-200">{{ isPure ? m.label : m.rpgName }}</div>
          <div v-if="!isPure" class="text-[10px] text-slate-400">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="bg-white dark:bg-slate-800 rounded-t-3xl min-h-[300px] p-5 pb-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]" id="guide-logs">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">{{ isPure ? '今日记录' : '战斗记录' }}</h3>
        <span class="text-[10px] text-slate-400">左滑删除 / 点击详情</span>
      </div>
      <div v-if="store.todayLogs.length === 0" class="text-center py-10 text-slate-400">
        <div class="text-4xl mb-2 grayscale opacity-50">📜</div>
        <div class="text-xs">暂无记录，快去补给！</div>
      </div>
      <transition-group name="van-slide-up">
        <van-swipe-cell v-for="log in store.todayLogs" :key="log.id" class="mb-3 rounded-2xl overflow-hidden shadow-sm">
          <div class="p-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between relative" :class="{'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10': log.damageTaken && !isPure}" @click="openLogDetail(log)">
            <div class="flex items-center gap-3 relative z-10">
              <div class="text-2xl w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm relative">
                {{ log.icon }}
                <div v-if="log.comboCount && log.comboCount > 1 && !isPure" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-900 rounded-full text-[9px] flex items-center justify-center font-black border border-white">
                  {{ log.comboCount }}
                </div>
              </div>
              <div>
                <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                  {{ log.name }}
                  <span v-if="log.skillEffect && !isPure" class="ml-2 text-[8px] px-1 rounded bg-indigo-100 text-indigo-600 font-bold border border-indigo-200">✨天赋</span>
                  <span v-if="log.isComposite" class="ml-2 text-[8px] px-1 rounded bg-purple-100 text-purple-600 font-bold border border-purple-200">复合</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5" v-if="!log.damageTaken || isPure">
                  {{ log.grams }}g · {{ MEAL_LABELS[log.mealType] || log.mealType }}
                </div>
                <div class="text-[10px] text-red-400 font-bold mt-0.5" v-else>反击伤害 -{{ log.damageTaken }} (格挡 {{ log.blocked }})</div>
              </div>
            </div>
            <div class="text-right relative z-10">
              <div v-if="!log.damageTaken || isPure">
                <div class="font-rpg font-bold text-lg" :class="(!isPure && (log.multiplier || 1) < 1) ? 'text-slate-400' : (isPure ? 'text-slate-700 dark:text-slate-300' : 'text-red-500')">
                  {{ isPure ? log.calories : '-' + (log.finalDamageValue || Math.floor(log.calories * (log.multiplier || 1))) }}
                </div>
                <div class="text-[8px] text-slate-400">{{ isPure ? 'kcal' : 'DMG' }}</div>
              </div>
              <div v-else><div class="text-2xl">💔</div></div>
            </div>
          </div>
          <template #right>
            <div class="h-full flex"><van-button square type="danger" :text="isPure ? '删除' : '撤销'" class="h-full !rounded-none" @click="confirmDelete(log)" /></div>
          </template>
        </van-swipe-cell>
      </transition-group>
    </div>

  </div>
</template>

<style scoped>
.van-slide-up-enter-active, .van-slide-up-leave-active { transition: all 0.3s ease; }
.van-slide-up-enter-from, .van-slide-up-leave-to { opacity: 0; transform: translateY(20px); }
.animate-pulse-slow { animation: pulse-red 2s infinite; }
@keyframes pulse-red { 0%, 100% { border-color: rgba(239, 68, 68, 0.6); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 20px 0 rgba(239, 68, 68, 0.7); } }

.float-up-enter-active { animation: float-up 1s ease-out forwards; }
.float-up-leave-active { transition: opacity 0.5s; opacity: 0; }
@keyframes float-up {
  0% { opacity: 0; transform: translate(-50%, 20px) scale(0.5); }
  20% { opacity: 1; transform: translate(-50%, 0) scale(1.2); }
  100% { opacity: 0; transform: translate(-50%, -60px) scale(1); }
}
.text-stroke {
  -webkit-text-stroke: 1px rgba(0,0,0,0.5);
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
</style>
