<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { useLogStore } from '@/stores/useLogStore';
import AppHud from '@/components/AppHud.vue';
import DateNavigator from '@/components/DateNavigator.vue';
import { showConfirmDialog, showDialog, showNotify } from 'vant';
import type { FoodLog, MealType } from '@/types';

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore();
const logStore = useLogStore();

// --- [PM Add] 新增：连胜奖励弹窗状态 ---
const showDailyBonusModal = ref(false);
const dailyBonusMessage = ref('');

const handleBonusConfirm = () => {
  showDailyBonusModal.value = false;
};
// ------------------------------------

const user = computed(() => store.user);
const stageInfo = computed(() => store.stageInfo);
const comboState = computed(() => store.comboState);
const activeQuests = computed(() => store.userQuests.filter(q => q.status !== 'CLAIMED'));
const skillPoints = computed(() => store.user.skillPoints);
const skillStatus = computed(() => store.heroStore.skillStatus);
const raceSkill = computed(() => store.heroStore.raceSkill);
const env = computed(() => store.environment);
const floatingTexts = computed(() => systemStore.isPureMode ? [] : (store.temp.floatingTexts || []));
const isExhausted = computed(() => store.heroStore.isExhausted);
const isPure = computed(() => systemStore.isPureMode);

const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });

const dailyTarget = computed(() => heroStore.dailyTarget);

const showSlash = computed(() => systemStore.temp.attackVfx === 'slash');
const projectile = computed(() => systemStore.temp.projectile);
const shadowHpPercent = ref(100);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水', EXERCISE: '运动'
};

// ... [Existing Fasting Logic] ...
const fastingTime = ref(0);
let fastingInterval: number | null = null;

const updateFastingTime = () => {
  let start = 0;
  if (store.user.fasting && store.user.fasting.isFasting) {
    start = store.user.fasting.startTime;
  } else {
    start = store.lastMealTime || 0;
  }

  if (start > 0) {
    fastingTime.value = Date.now() - start;
  } else {
    fastingTime.value = 0;
  }
};

const fastingStatus = computed(() => {
  const hours = fastingTime.value / (1000 * 60 * 60);
  const isFasting = store.user.fasting?.isFasting;

  if (isFasting) {
    if (hours > 16) return { text: '⚡ 蓄力完成 (2.0x)', color: 'text-yellow-400 animate-pulse', icon: 'fas fa-bolt' };
    if (hours > 12) return { text: '🔥 正在蓄力 (1.5x)', color: 'text-orange-400', icon: 'fas fa-fire' };
    return { text: `🧘 冥想中 ${Math.floor(hours)}h`, color: 'text-purple-400', icon: 'fas fa-hourglass-half' };
  }

  return { text: `🕒 距上一餐 ${Math.floor(hours)}h`, color: 'text-slate-400', icon: 'fas fa-history' };
});

const openFastingModal = () => {
  systemStore.setModal('fasting', true);
};

onMounted(() => {
  if (store.user.isInitialized) {
    store.refreshQuestHall();
  }
  updateFastingTime();
  fastingInterval = window.setInterval(updateFastingTime, 60000);

  // --- [PM Add] 新增：检查每日连胜 ---
  // 注意：这需要依赖之前的 useSystemStore 更新，确保 checkDailyLogin 方法存在
  if (systemStore.checkDailyLogin) {
    const loginResult = systemStore.checkDailyLogin();
    if (loginResult.isNewDay) {
      // 发放奖励
      heroStore.addGold(loginResult.streakBonus);
      dailyBonusMessage.value = `${loginResult.message}\n额外获得金币: ${loginResult.streakBonus}`;

      // 延迟 1秒 显示，避免和页面加载动画冲突
      setTimeout(() => {
        showDailyBonusModal.value = true;
      }, 1000);
    }
  }
  // --------------------------------
});

onUnmounted(() => {
  if (fastingInterval) clearInterval(fastingInterval);
});

const handleSkillClick = () => {
  if (!raceSkill.value) return;
  if (skillStatus.value.active) {
    store.setModal('addFood', true);
    return;
  }
  if (!skillStatus.value.ready) return;
  store.heroStore.activateSkill();
};

const hpPercent = computed(() => {
  if (!stageInfo.value.currentObj) return 0;
  return Math.floor((stageInfo.value.currentHpRemaining / stageInfo.value.currentObj.maxHp) * 100);
});

watch(hpPercent, (newVal) => {
  if (newVal > shadowHpPercent.value) {
    shadowHpPercent.value = newVal;
  } else {
    setTimeout(() => {
      shadowHpPercent.value = newVal;
    }, 500);
  }
});

const hpBarColor = computed(() => {
  if (stageInfo.value.isOverloaded) return 'bg-red-600 animate-pulse';
  if (hpPercent.value < 20) return 'bg-red-500';
  if (hpPercent.value < 50) return 'bg-yellow-500';
  return 'bg-green-500';
});

const bossStateClass = computed(() => {
  if (stageInfo.value.isOverloaded) return 'boss-phase-berserk';
  if (showSlash.value) return 'boss-hurt-anim';
  if (hpPercent.value < 20) return 'opacity-80 grayscale-[0.5] translate-y-1';
  return 'anim-boss';
});

const bossOverlayIcon = computed(() => {
  if (stageInfo.value.isOverloaded) return '🔥';
  if (hpPercent.value < 30) return '💦';
  if (hpPercent.value < 60) return '💢';
  return '';
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
  if (c >= 5) return 'text-purple-500 from-purple-500 to-pink-500 drop-shadow-md';
  if (c >= 2) return 'text-blue-500 from-blue-500 to-cyan-500';
  return 'text-slate-400 from-slate-400 to-slate-300';
});

const tacticalTip = computed(() => {
  if (isPure.value || !stageInfo.value.currentObj) return null;
  return store.getTacticalSuggestion();
});

const tipClass = computed(() => {
  const t = tacticalTip.value?.type;
  if (t === 'DANGER') return 'bg-red-500 text-white border-red-600 animate-pulse';
  if (t === 'WARN') return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
  if (t === 'GOOD') return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
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
  // [UI欺诈修复] 在UI层面也检查HP, 不让用户点击后才发现无法战斗
  if (!isPure.value && heroStore.user.heroCurrentHp <= 0) {
    showNotify({
      type: 'warning',
      message: '⚠️ 你已经精疲力尽，请先进食或运动恢复HP！',
      background: '#f59e0b',
      duration: 3000
    });
    return;
  }
  store.temp.activeMealType = key;
  store.setModal('addFood', true);
}

const openLogDetail = (log: FoodLog) => {
  store.temp.selectedLog = log;
  if (isPure.value) {
    router.push('/food-detail');
  } else {
    store.setModal('logDetail', true);
  }
}

const showStatsInfo = () => {
  showDialog({
    title: '📊 战斗数据说明',
    message: '🔥 (左) 运动消耗：\n今日通过运动燃烧的热量，可抵消摄入。\n\n✊ (右) 造成伤害：\n今日饮食摄入的总热量（对Boss造成的伤害）。\n\n目标：让「造成伤害」不要超过「Boss血量 + 运动消耗」。',
    confirmButtonColor: '#7c3aed'
  });
};
</script>

<template>
  <div class="pb-24 relative overflow-x-hidden">
    <!-- [Animation Layer 1] 投掷物层 -->
    <div v-if="projectile && projectile.show" class="fixed inset-0 pointer-events-none z-[60]" style="perspective: 1000px;">
      <div class="anim-projectile flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-xl border-2 border-slate-200">
        {{ projectile.icon }}
      </div>
    </div>

    <!-- 战斗飘字层 -->
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

    <!-- 力竭状态遮罩 -->
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

    <AppHud @open-achievements="store.setModal('achievements', true)" />

    <div id="guide-date">
      <DateNavigator />
    </div>

    <!-- 战地情报 -->
    <div v-if="!isPure && env" class="px-4 mt-3 flex gap-3" id="guide-env">
      <div class="flex-1 bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-2.5 border border-orange-100 dark:border-slate-700 flex items-center shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center mr-2">
          <i class="fas fa-fire-alt"></i>
        </div>
        <div>
          <div class="text-[9px] text-slate-400 uppercase tracking-wide">连续讨伐</div>
          <!-- 这里使用 user.loginStreak 还是 systemStore.streak.currentStreak 取决于你是否完全迁移 -->
          <!-- 暂时保留 user.loginStreak 以防 UI 变化太大，但弹窗奖励用的是 SystemStore -->
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

    <!-- [New V5.7] 断食状态条 (Pure & RPG) -->
    <div class="px-4 mt-3" @click="openFastingModal">
      <div class="bg-slate-900/5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex justify-between items-center active:scale-95 transition cursor-pointer hover:border-purple-400/50">
        <div class="text-xs font-bold flex items-center gap-2">
          <i :class="fastingStatus.icon + ' ' + (isPure ? 'text-slate-400' : '')"></i>
          <span :class="fastingStatus.color">{{ fastingStatus.text }}</span>
        </div>
        <div class="text-[9px] text-slate-400 flex items-center">
          {{ store.user.fasting?.isFasting ? (isPure ? '断食中' : '蓄力中') : '未开启' }} <van-icon name="arrow" class="ml-1" />
        </div>
      </div>
    </div>

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

    <div v-if="isPure" class="px-4 mt-3" @click="store.setModal('questBoard', true)">
      <div id="guide-quest" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between active:scale-95 transition">
        <div class="flex items-center gap-3">
          <i class="fas fa-tasks text-blue-500 text-lg"></i>
          <span class="text-sm font-bold text-slate-700 dark:text-slate-200">每日打卡任务</span>
        </div>
        <span class="text-xs text-slate-400">{{ activeQuests.length }} 进行中</span>
      </div>
    </div>

    <!-- Monster Card (Enhanced Animation) -->
    <div v-if="!isPure && stageInfo" class="mx-4 mt-4 relative" id="guide-monster">
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

        <div v-if="comboState.count > 1" class="absolute top-2 left-2 z-20 flex flex-col items-start anim-combo-pop">
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
            <transition name="boss-transition" mode="out-in">
              <div :key="stageInfo.currentObj?.data?.name" class="relative w-16 h-16">
                <div class="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border border-slate-600 shadow-inner relative z-10 transition-transform duration-100"
                     :class="bossStateClass">
                  {{ stageInfo.currentObj?.data?.icon || '❓' }}
                  <div v-if="bossOverlayIcon" class="absolute -bottom-1 -right-1 text-sm animate-bounce">
                    {{ bossOverlayIcon }}
                  </div>
                </div>
                <div v-if="showSlash" class="anim-impact"></div>
                <!-- 优化：Boss 标识更明显 -->
                <div v-if="stageInfo.isBoss" class="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black border-2 border-slate-900 z-20 shadow-sm animate-bounce">BOSS</div>
              </div>
            </transition>

            <div class="ml-4 max-w-[140px]">
              <div class="text-xl font-rpg tracking-wider truncate text-white drop-shadow-md" :class="stageInfo.isOverloaded ? 'text-red-400' : ''">
                {{ stageInfo.currentObj?.data?.name || '未知敌人' }}
              </div>
              <div class="text-[10px] mt-1 flex items-center gap-2">
                <!-- 优化：当前波次显示 -->
                <span class="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono font-bold">
                  {{ stageInfo.isBoss ? 'FINAL' : `WAVE ${stageInfo.currentIndex + 1}` }}
                </span>
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide truncate" :class="weaknessColor">
                  弱点: {{ stageInfo.currentObj?.data?.weakness || '无' }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right mt-6 mr-4">
            <div class="text-2xl font-black font-mono tracking-tight">{{ stageInfo.currentHpRemaining }}</div>
            <div class="text-[9px] text-slate-500 uppercase tracking-widest">Enemy HP</div>
          </div>
        </div>

        <div class="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-3">
          <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold z-10 drop-shadow-md">{{ hpPercent }}%</div>
          <div class="absolute inset-y-0 left-0 bg-yellow-300 hp-shadow" :style="{ width: shadowHpPercent + '%' }"></div>
          <div class="h-full transition-all duration-300 ease-out relative" :class="hpBarColor" :style="{ width: hpPercent + '%' }">
            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>

        <!-- 优化：底部数据栏 (进度条 + 统计数据) -->
        <div class="flex justify-between items-center px-1 pt-2 border-t border-slate-700/50" @click.stop="showStatsInfo">
          <!-- 波次进度点 -->
          <div class="flex gap-1 items-center">
            <span class="text-[8px] text-slate-500 font-bold mr-1">STAGE</span>
            <div v-for="(s, idx) in stageInfo.stages" :key="idx"
                 class="w-2.5 h-1 rounded-full transition-all"
                 :class="idx <= stageInfo.currentIndex ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-slate-700'">
            </div>
          </div>

          <!-- 核心统计数据 (带问号提示) -->
          <div class="flex gap-3 text-[9px] font-bold font-mono cursor-pointer relative group">
            <div class="absolute -top-4 right-0 text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击查看说明</div>
            <div class="flex items-center text-orange-400">
              <i class="fas fa-fire-alt mr-1"></i>
              <span>-{{ logStore.todayBurn }}</span>
            </div>
            <div class="flex items-center text-red-400">
              <i class="fas fa-fist-raised mr-1"></i>
              <span>{{ store.todayDamage }}</span>
            </div>
            <i class="fas fa-question-circle text-[8px] text-slate-600 ml-1"></i>
          </div>
        </div>
      </div>

      <!-- [New V4.9] 战术顾问面板 -->
      <div v-if="tacticalTip" class="mt-2 mx-1 px-3 py-2 rounded-xl flex items-center gap-3 border shadow-sm transition-all duration-500 animate-[pulse_3s_infinite]" :class="tipClass">
        <div class="text-lg">{{ tacticalTip.icon }}</div>
        <div class="flex-1">
          <div class="text-[9px] opacity-80 font-bold uppercase tracking-wide">战术顾问</div>
          <div class="text-xs font-bold">{{ tacticalTip.text }}</div>
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

    <!-- ... (Log List and other components remain unchanged) ... -->
    <div class="px-4 mt-6 mb-2 flex justify-between items-center" id="guide-meals">
      <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">{{ isPure ? '饮食记录' : '冒险行动' }}</h3>
      <button @click="store.setModal('npcGuide', true)" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition flex items-center">
        <i class="fas fa-comment-dots mr-1"></i> {{ isPure ? '使用帮助' : '导师通讯' }}
      </button>
    </div>

    <div class="px-4 grid grid-cols-2 gap-3 mb-6">
      <!-- [UI欺诈修复] 当HP为0时禁用按钮 -->
      <div v-for="m in rpgMeals" :key="m.key" 
           @click="openAddFood(m.key as MealType)" 
           class="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-slate-700 transition cursor-pointer hover:border-purple-300 dark:hover:border-purple-700"
           :class="[
             (!isPure && heroStore.user.heroCurrentHp <= 0) ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'
           ]">
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
          <div class="p-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between relative"
               :class="{'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10': log.damageTaken && !isPure, 'border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10': log.mealType === 'EXERCISE'}"
               @click="openLogDetail(log)">
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
                  <span v-if="log.mealType === 'EXERCISE'" class="ml-2 text-[8px] px-1 rounded bg-green-100 text-green-600 font-bold border border-green-200">运动</span>
                  <span v-if="log.skillEffect && !isPure" class="ml-2 text-[8px] px-1 rounded bg-indigo-100 text-indigo-600 font-bold border border-indigo-200">✨天赋</span>
                  <span v-if="log.isComposite" class="ml-2 text-[8px] px-1 rounded bg-purple-100 text-purple-600 font-bold border border-purple-200">复合</span>
                  <span v-if="log.fastingHours && log.fastingHours > 12" class="ml-2 text-[8px] px-1 rounded bg-yellow-100 text-yellow-600 font-bold border border-yellow-200">⚡蓄力</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5" v-if="log.mealType === 'EXERCISE'">
                  消耗 {{ log.calories }} kcal
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5" v-else-if="!log.damageTaken || isPure">
                  {{ log.grams }}g · {{ MEAL_LABELS[log.mealType] || log.mealType }}
                </div>
                <div class="text-[10px] text-red-400 font-bold mt-0.5" v-else>反击伤害 -{{ log.damageTaken }} (格挡 {{ log.blocked }})</div>
              </div>
            </div>
            <div class="text-right relative z-10">
              <div v-if="log.mealType === 'EXERCISE'">
                <div class="font-bold text-lg text-green-500">+{{ 50 + Math.floor((log.calories || 0) / 10) }} HP</div>
                <div class="text-[8px] text-slate-400">回复</div>
              </div>
              <div v-else-if="!log.damageTaken || isPure">
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

    <!-- [PM Add] 新增：全局弹窗，层级最高 -->
    <div v-if="showDailyBonusModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div class="bg-slate-800 border-2 border-yellow-500 rounded-xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] animate-bounce-in relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
        <h3 class="text-2xl font-bold text-yellow-400 mb-2 drop-shadow-md">每日登录奖励!</h3>
        <div class="text-6xl my-6 animate-pulse">🎁</div>
        <p class="text-slate-200 whitespace-pre-line mb-8 font-medium">{{ dailyBonusMessage }}</p>
        <button
          @click="handleBonusConfirm"
          class="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-3.5 px-6 rounded-lg transition-all transform active:scale-95 shadow-lg border-t border-yellow-400/20"
        >
          收入囊中
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* [PM Add] 新增动画，其他样式保持不变 */
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-bounce-in {
  animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bounceIn {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 你的原始样式保留 */
.boss-phase-berserk {
  @apply bg-red-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110 rotate-1;
}
.boss-hurt-anim {
  animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both;
  filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(5);
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
.anim-boss {
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.anim-combo-pop {
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  from { transform: scale(0) rotate(-10deg); opacity: 0; }
  to { transform: scale(1) rotate(0deg); opacity: 1; }
}
.anim-impact {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  height: 150%;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
  transform: translate(-50%, -50%) scale(0);
  animation: impact 0.2s ease-out forwards;
  pointer-events: none;
  z-index: 50;
}
@keyframes impact {
  to { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}
.font-rpg {
  font-family: 'Courier New', Courier, monospace; /* Fallback if custom font not loaded */
}
.text-stroke {
  -webkit-text-stroke: 1px rgba(0,0,0,0.5);
}
.hp-shadow {
  transition: width 0.5s ease-in-out 0.2s;
}
.float-up-enter-active {
  transition: all 0.8s ease-out;
}
.float-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.5);
}
.float-up-leave-active {
  transition: all 0.5s ease-in;
}
.float-up-leave-to {
  opacity: 0;
  transform: translateY(-50px);
}
.animate-pulse-slow {
  animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
