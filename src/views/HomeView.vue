<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { useLogStore } from '@/stores/useLogStore';
import AppHud from '@/components/AppHud.vue';
import DateNavigator from '@/components/DateNavigator.vue';
import { showConfirmDialog, showDialog, showNotify, showToast } from 'vant';
import type { FoodLog, MealType } from '@/types';
import ShieldBarCanvas from '@/components/ShieldBarCanvas.vue';

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

const isDarkTheme = computed(() => {
  return true;
});

const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });

const dailyTarget = computed(() => heroStore.dailyTarget);

const showSlash = computed(() => systemStore.temp.attackVfx === 'slash');
const projectile = computed(() => systemStore.temp.projectile);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水', EXERCISE: '运动'
};

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
    if (hours > 16) return { text: '⚡ 蓄力完成 (2.0x)', color: 'text-yellow-500 dark:text-yellow-400 animate-pulse', icon: 'fas fa-bolt' };
    if (hours > 12) return { text: '🔥 正在蓄力 (1.5x)', color: 'text-orange-500 dark:text-orange-400', icon: 'fas fa-fire' };
    return { text: `🧘 冥想中 ${Math.floor(hours)}h`, color: 'text-purple-500 dark:text-purple-400', icon: 'fas fa-hourglass-half' };
  }

  return { text: `🕒 距上一餐 ${Math.floor(hours)}h`, color: 'text-slate-500 dark:text-slate-400', icon: 'fas fa-history' };
});

const openFastingModal = () => {
  systemStore.setModal('fasting', true);
};

// --- Weather Animation Logic ---

// [Mod] 控制天气特效显示的开关 (连接到 localStorage)
const weatherEnabled = ref(localStorage.getItem('app_setting_weather') !== 'false');

const showWeatherEffects = computed(() => {
  return weatherEnabled.value;
});

const updateWeatherSetting = () => {
  weatherEnabled.value = localStorage.getItem('app_setting_weather') !== 'false';
  console.log('[HomeView] Weather setting updated:', weatherEnabled.value);
};

const weatherMode = computed(() => {
  const name = env.value?.name || '';

  // 优先级匹配：先匹配极端天气，再匹配普通天气
  if (name.includes('暴雨') || name.includes('大雨') || name.includes('雷') || name.includes('Storm')) return 'HEAVY_RAIN';
  if (name.includes('小雨') || name.includes('细雨') || name.includes('Drizzle')) return 'LIGHT_RAIN';
  if (name.includes('雨') || name.includes('Rain') || name.includes('湿')) return 'RAIN';

  if (name.includes('暴雪') || name.includes('大雪') || name.includes('Blizzard')) return 'BLIZZARD';
  if (name.includes('雪') || name.includes('冰') || name.includes('Snow') || name.includes('寒')) return 'SNOW';

  if (name.includes('雾') || name.includes('霾') || name.includes('Fog') || name.includes('Mist')) return 'FOG';

  if (name.includes('云') || name.includes('阴') || name.includes('Cloud')) return 'CLOUDY';

  if (name.includes('热') || name.includes('火') || name.includes('Sun') || name.includes('旱') || name.includes('炎')) return 'HEAT';

  return 'CLEAR'; // Default
});

// Optimization: Static Arrays
const particlesLight = Array.from({ length: 30 }).map((_, i) => i);
const particlesMedium = Array.from({ length: 80 }).map((_, i) => i);
const particlesHeavy = Array.from({ length: 150 }).map((_, i) => i);
const particlesClouds = Array.from({ length: 6 }).map((_, i) => i);
const particlesHeat = Array.from({ length: 20 }).map((_, i) => i);
// -------------------------------------

onMounted(() => {
  // 监听设置变更事件
  window.addEventListener('settings-changed', updateWeatherSetting);

  if (store.user.isInitialized) {
    store.refreshQuestHall();
  }
  updateFastingTime();
  fastingInterval = window.setInterval(updateFastingTime, 60000);

  if (systemStore.checkDailyLogin) {
    const loginResult = systemStore.checkDailyLogin();
    if (loginResult.isNewDay) {
      heroStore.addGold(loginResult.streakBonus, '签到奖励', 'CHECKIN_BONUS');
      dailyBonusMessage.value = `${loginResult.message}\n额外获得金币: ${loginResult.streakBonus}`;
      setTimeout(() => {
        showDailyBonusModal.value = true;
      }, 1000);
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('settings-changed', updateWeatherSetting);
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

// [Fix] 稳定的血量数值计算属性，防止闪烁
const safeCurrentHp = computed(() => {
  if (stageInfo.value && typeof stageInfo.value.currentHpRemaining === 'number') {
    return stageInfo.value.currentHpRemaining;
  }
  return 0;
});

const safeMaxHp = computed(() => {
  if (stageInfo.value && stageInfo.value.currentObj && stageInfo.value.currentObj.maxHp) {
    return stageInfo.value.currentObj.maxHp;
  }
  // 如果暂时获取不到 maxHp，不要轻易返回默认值，尽量保持稳定或返回 100
  return 100;
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
  if (type === '低碳' || type === 'LOW_CARB') return 'text-orange-500 dark:text-orange-400 border-orange-200 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20';
  if (type === '低脂' || type === 'LOW_FAT') return 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
  if (type === '高蛋白' || type === 'HIGH_PRO') return 'text-red-500 dark:text-red-400 border-red-200 dark:border-red-400 bg-red-50 dark:bg-red-900/20';
  return 'text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20';
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
  if (t === 'WARN') return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
  if (t === 'GOOD') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
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
  if (log.mealType === 'EXERCISE') {
    systemStore.temp.selectedExerciseLog = log as any;
    if (isPure.value) {
      router.push('/exercise-log-detail');
    } else {
      store.setModal('exerciseLogDetail', true);
    }
  } else if (log.mealType === 'HYDRATION') {
    systemStore.temp.selectedHydrationLog = log as any;
    if (isPure.value) {
      router.push('/hydration-log-detail');
    } else {
      store.setModal('hydrationLogDetail', true);
    }
  } else {
    store.temp.selectedLog = log;
    if (isPure.value) {
      router.push('/food-detail');
    } else {
      store.setModal('logDetail', true);
    }
  }
}

const showStatsInfo = () => {
  showDialog({
    title: '📊 战斗数据说明',
    message: '🔥 (左) 运动消耗：\n今日通过运动燃烧的热量，可抵消摄入。\n\n✊ (右) 造成伤害：\n今日饮食摄入的总热量（对Boss造成的伤害）。\n\n目标：让「造成伤害」不要超过「Boss血量 + 运动消耗」。',
    confirmButtonColor: '#7c3aed'
  });
};

// [New] 浅色模式下的粒子特效 (复用 ProfileView 的逻辑)
const lightParticles = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`,
    animationDuration: `${8 + Math.random() * 10}s`,
    width: `${Math.random() * 4 + 2}px`,
    height: `${Math.random() * 4 + 2}px`,
    opacity: 0.3 + Math.random() * 0.5,
  },
  class: Math.random() > 0.5 ? 'bg-blue-400' : 'bg-indigo-400'
}));
</script>

<template>
  <div class="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300 relative overflow-x-hidden">

    <!-- [New] Weather Animation Layer -->
    <div v-if="showWeatherEffects" class="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">

      <!-- 1. LIGHT_RAIN: Sparse, slow drops -->
      <div v-if="weatherMode === 'LIGHT_RAIN'" class="absolute inset-0">
        <div v-for="i in particlesLight" :key="'rain-l-'+i"
             class="absolute bg-blue-300/40 dark:bg-slate-400/30 w-px h-3 animate-rain"
             :style="{
                 left: Math.random() * 100 + '%',
                 top: -20 + '%',
                 animationDuration: 1.5 + Math.random() * 1 + 's',
                 animationDelay: Math.random() * 3 + 's'
               }">
        </div>
      </div>

      <!-- 2. RAIN: Standard rain -->
      <div v-if="weatherMode === 'RAIN'" class="absolute inset-0">
        <div v-for="i in particlesMedium" :key="'rain-m-'+i"
             class="absolute bg-blue-400/50 dark:bg-slate-400/40 w-0.5 h-5 animate-rain"
             :style="{
                 left: Math.random() * 100 + '%',
                 top: -20 + '%',
                 animationDuration: 0.8 + Math.random() * 0.5 + 's',
                 animationDelay: Math.random() * 2 + 's'
               }">
        </div>
      </div>

      <!-- 3. HEAVY_RAIN: Dense, fast, slanted, with flashes -->
      <div v-if="weatherMode === 'HEAVY_RAIN'" class="absolute inset-0">
        <!-- Lightning Flash Overlay -->
        <div class="absolute inset-0 bg-white/20 animate-flash z-0"></div>
        <div v-for="i in particlesHeavy" :key="'rain-h-'+i"
             class="absolute bg-blue-500/60 dark:bg-slate-300/50 w-0.5 h-8 animate-rain-fast"
             :style="{
                 left: Math.random() * 120 - 10 + '%', /* Allow wider range for slant */
                 top: -20 + '%',
                 animationDuration: 0.4 + Math.random() * 0.3 + 's',
                 animationDelay: Math.random() * 1 + 's'
               }">
        </div>
      </div>

      <!-- 4. SNOW: Gentle flakes -->
      <div v-if="weatherMode === 'SNOW'" class="absolute inset-0">
        <div v-for="i in particlesLight" :key="'snow-l-'+i"
             class="absolute bg-white/80 dark:bg-slate-200/60 rounded-full animate-snow"
             :style="{
                 width: Math.random() * 4 + 2 + 'px',
                 height: Math.random() * 4 + 2 + 'px',
                 left: Math.random() * 100 + '%',
                 top: -10 + '%',
                 animationDuration: 4 + Math.random() * 4 + 's',
                 animationDelay: Math.random() * 5 + 's'
               }">
        </div>
      </div>

      <!-- 5. BLIZZARD: Heavy, fast, horizontal movement -->
      <div v-if="weatherMode === 'BLIZZARD'" class="absolute inset-0">
        <div v-for="i in particlesMedium" :key="'snow-b-'+i"
             class="absolute bg-white/90 dark:bg-slate-100/70 w-1.5 h-1.5 rounded-full animate-blizzard"
             :style="{
                 left: Math.random() * 100 + '%',
                 top: Math.random() * 100 + '%',
                 animationDuration: 0.5 + Math.random() * 1 + 's',
                 animationDelay: Math.random() * 2 + 's'
               }">
        </div>
        <!-- Fog overlay for blizzard -->
        <div class="absolute inset-0 bg-white/10 dark:bg-slate-300/10 backdrop-blur-[1px]"></div>
      </div>

      <!-- 6. CLOUDY: Floating clouds -->
      <div v-if="weatherMode === 'CLOUDY'" class="absolute inset-0">
        <div v-for="i in particlesClouds" :key="'cloud-'+i"
             class="absolute opacity-30 dark:opacity-20 animate-float-cloud blur-3xl rounded-full"
             :class="isDarkTheme ? 'bg-slate-500' : 'bg-slate-400'"
             :style="{
                 width: 200 + Math.random() * 200 + 'px',
                 height: 80 + Math.random() * 80 + 'px',
                 top: Math.random() * 50 + '%',
                 left: -50 + '%',
                 animationDuration: 30 + Math.random() * 30 + 's',
                 animationDelay: Math.random() * 20 + 's'
               }">
        </div>
      </div>

      <!-- 7. FOG: Thick fog overlay -->
      <div v-if="weatherMode === 'FOG'" class="absolute inset-0 overflow-hidden">
        <div class="absolute inset-0 bg-slate-300/20 dark:bg-slate-600/30 animate-pulse-slow"></div>
        <div v-for="i in 3" :key="'fog-'+i"
             class="absolute w-[200%] h-full bg-gradient-to-r from-transparent via-slate-200/20 to-transparent dark:via-slate-500/20 animate-float-cloud"
             :style="{
                 top: (i * 30) + '%',
                 animationDuration: 20 + i * 5 + 's',
                 left: '-100%'
               }">
        </div>
      </div>

      <!-- 8. HEAT: Distortion and rising embers -->
      <div v-if="weatherMode === 'HEAT'" class="absolute inset-0">
        <!-- Warm bottom glow -->
        <div class="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-500/20 to-transparent dark:from-red-900/30 pointer-events-none"></div>

        <!-- Rising Embers -->
        <div v-for="i in particlesHeat" :key="'heat-'+i"
             class="absolute bg-orange-400/40 dark:bg-red-500/40 rounded-full blur-[1px] animate-float-up-wobbly"
             :style="{
                 width: Math.random() * 4 + 2 + 'px',
                 height: Math.random() * 4 + 2 + 'px',
                 left: Math.random() * 100 + '%',
                 bottom: '-10px',
                 animationDuration: 3 + Math.random() * 4 + 's',
                 animationDelay: Math.random() * 5 + 's'
               }">
        </div>
        <!-- Heat Haze Overlay (Subtle) -->
        <div class="absolute inset-0 bg-orange-500/5 mix-blend-overlay animate-pulse-slow"></div>
      </div>

      <!-- 9. CLEAR: Default Particles (Only for RPG mode or default) -->
      <div v-if="weatherMode === 'CLEAR' && !isPure" class="absolute inset-0">
        <div v-for="p in lightParticles" :key="'clear-'+p.id"
             class="absolute rounded-full animate-float-up mix-blend-multiply dark:mix-blend-normal"
             :class="p.class"
             :style="p.style">
        </div>
      </div>
    </div>

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
    <div v-if="!isPure && env" class="px-4 mt-3 flex gap-3 relative z-10" id="guide-env">
      <div class="flex-1 bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-2.5 border border-orange-200 dark:border-slate-700 flex items-center shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 flex items-center justify-center mr-2">
          <i class="fas fa-fire-alt"></i>
        </div>
        <div>
          <div class="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">连续讨伐</div>
          <div class="text-sm font-black text-slate-800 dark:text-slate-200">
            {{ user.loginStreak }} <span class="text-[9px] font-normal">天</span>
          </div>
        </div>
      </div>

      <div class="flex-[1.5] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-2.5 border border-blue-200 dark:border-slate-700 flex items-center shadow-sm">
        <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 flex items-center justify-center mr-2 text-lg">
          {{ env.icon }}
        </div>
        <div>
          <div class="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">今日环境: {{ env.name }}</div>
          <div class="text-[10px] font-bold" :class="env.color">
            {{ env.desc }}
          </div>
        </div>
      </div>
    </div>

    <!-- [New V5.7] 断食状态条 (Pure & RPG) -->
    <div class="px-4 mt-3 relative z-10" @click="openFastingModal">
      <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex justify-between items-center active:scale-95 transition cursor-pointer hover:border-purple-400 shadow-sm">
        <div class="text-xs font-bold flex items-center gap-2">
          <i :class="fastingStatus.icon + ' ' + (isPure ? 'text-slate-500 dark:text-slate-400' : '')"></i>
          <span :class="fastingStatus.color">{{ fastingStatus.text }}</span>
        </div>
        <div class="text-[9px] text-slate-500 dark:text-slate-400 flex items-center">
          {{ store.user.fasting?.isFasting ? (isPure ? '断食中' : '蓄力中') : '未开启' }} <van-icon name="arrow" class="ml-1" />
        </div>
      </div>
    </div>

    <div v-if="!isPure" class="px-4 mt-3 grid grid-cols-2 gap-3 relative z-10">
      <div @click="store.setModal('questBoard', true)" id="guide-quest"
           class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group">
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fas fa-scroll"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">公会大厅</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400">进行中: {{ activeQuests.length }}/4</div>
          </div>
        </div>
        <i v-if="!isPure" class="fas fa-scroll absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-[-15deg]"></i>
      </div>

      <div @click="store.setModal('skillTree', true)" id="guide-skill"
           class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between active:scale-95 transition relative overflow-hidden cursor-pointer group">
        <div class="flex items-center gap-2 relative z-10">
          <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <i class="fas fa-project-diagram"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-800 dark:text-slate-200">天赋技能</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              SP: <span class="text-yellow-600 dark:text-yellow-500 font-bold">{{ skillPoints }}</span>
            </div>
          </div>
        </div>
        <div v-if="skillPoints > 0" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse z-20"></div>
        <i v-if="!isPure" class="fas fa-dna absolute -right-2 -bottom-2 text-6xl text-slate-100 dark:text-slate-700/50 z-0 rotate-12"></i>
      </div>
    </div>

    <div v-if="isPure" class="px-4 mt-3 relative z-10" @click="store.setModal('questBoard', true)">
      <div id="guide-quest" class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between active:scale-95 transition shadow-sm">
        <div class="flex items-center gap-3">
          <i class="fas fa-tasks text-blue-500 text-lg"></i>
          <span class="text-sm font-bold text-slate-700 dark:text-slate-200">每日打卡任务</span>
        </div>
        <span class="text-xs text-slate-400">{{ activeQuests.length }} 进行中</span>
      </div>
    </div>

    <!-- Monster Card (Enhanced with ShieldBarCanvas) -->
    <div v-if="!isPure && stageInfo" class="mx-4 mt-4 relative z-10" id="guide-monster">
      <!-- 技能图标 (保持不变) -->
      <div v-if="raceSkill"
           class="absolute -top-3 -right-2 z-30 flex flex-col items-center"
           @click="handleSkillClick">
        <div class="w-14 h-14 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl transition-all active:scale-95 cursor-pointer bg-slate-100 dark:bg-slate-800 relative overflow-hidden group"
             :class="[
                    skillStatus.active ? 'border-yellow-400 animate-pulse ring-4 ring-yellow-400/30' :
                    skillStatus.ready ? 'border-green-400 hover:scale-105' : 'border-slate-300 dark:border-slate-600 grayscale'
                  ]">
          <span class="relative z-10">{{ raceSkill.icon }}</span>
          <div v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
            <span class="text-[10px] font-bold text-white font-mono">{{ skillStatus.text }}</span>
          </div>
          <svg v-if="!skillStatus.ready && !skillStatus.active" class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
            <path class="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="4" />
            <path class="text-green-500 transition-all duration-1000"
                  :stroke-dasharray="skillStatus.percent + ', 100'"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" stroke-width="4" />
          </svg>
        </div>
        <div class="mt-1 bg-white/90 dark:bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[9px] text-slate-700 dark:text-white font-bold whitespace-nowrap shadow-sm border border-slate-200 dark:border-transparent"
             :class="skillStatus.active ? 'text-yellow-600 dark:text-yellow-300' : ''">
          {{ skillStatus.active ? '生效中' : raceSkill.name }}
        </div>
      </div>

      <!-- [Mod] 卡片容器：移除强制渐变和 pulse 动画，改为自适应背景 -->
      <div class="rounded-3xl p-5 shadow-xl relative overflow-hidden border-2 transition-all duration-300"
           :class="[
             stageInfo.isOverloaded ? 'bg-red-50 dark:bg-red-900/10 border-red-500 shadow-red-500/50 animate-pulse-slow' :
             'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
           ]">

        <!-- [Fix] 背景纹理仅在深色模式下显示明显，且移除了 animate-pulse-slow 修复闪屏 -->
        <div class="absolute inset-0 opacity-0 dark:opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        <div class="absolute inset-0 bg-gradient-to-br from-white/50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-900/30 z-0 pointer-events-none"></div>

        <div v-if="comboState.count > 1" class="absolute top-2 left-2 z-20 flex flex-col items-start anim-combo-pop">
          <div class="text-xs font-bold italic text-yellow-500 dark:text-yellow-300 tracking-wider">COMBO</div>
          <div class="text-3xl font-black italic bg-clip-text text-transparent bg-gradient-to-b" :class="comboColor">
            x{{ comboState.count }}
          </div>
        </div>

        <div v-if="stageInfo.isOverloaded" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-red-500/10 font-black text-6xl rotate-12 pointer-events-none z-0">
          BERSERK
        </div>

        <div class="relative z-10 flex items-center justify-between mb-2 mt-2">
          <div class="flex items-center">
            <transition name="boss-transition" mode="out-in">
              <div :key="stageInfo.currentObj?.data?.name" class="relative w-16 h-16">
                <!-- Boss 头像框 -->
                <div class="w-full h-full rounded-2xl flex items-center justify-center text-4xl border shadow-inner relative z-10 transition-transform duration-100"
                     :class="[
                       bossStateClass,
                       'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                     ]">
                  {{ stageInfo.currentObj?.data?.icon || '❓' }}
                  <div v-if="bossOverlayIcon" class="absolute -bottom-1 -right-1 text-sm animate-bounce">
                    {{ bossOverlayIcon }}
                  </div>
                </div>
                <div v-if="showSlash" class="anim-impact"></div>
                <div v-if="stageInfo.isBoss" class="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black border-2 border-white dark:border-slate-900 z-20 shadow-sm animate-bounce">BOSS</div>
              </div>
            </transition>

            <div class="ml-4 max-w-[140px]">
              <div class="text-xl font-rpg tracking-wider truncate drop-shadow-sm" :class="stageInfo.isOverloaded ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'">
                {{ stageInfo.currentObj?.data?.name || '未知敌人' }}
              </div>
              <div class="text-[10px] mt-1 flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold">
                  {{ stageInfo.isBoss ? 'FINAL' : `WAVE ${stageInfo.currentIndex + 1}` }}
                </span>
                <span class="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide truncate" :class="weaknessColor">
                  弱点: {{ stageInfo.currentObj?.data?.weakness || '无' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- [New] 集成 ShieldBarCanvas 护盾血条 -->
        <!-- [Fix] 使用 safeCurrentHp 和 safeMaxHp 确保数值稳定 -->
        <!-- [Fix] 修正 theme 属性绑定 -->
        <div class="w-full max-w-[480px] mx-auto h-16 relative z-10 mb-2">
          <ShieldBarCanvas
            :current-hp="safeCurrentHp"
            :max-hp="safeMaxHp"
            :current-shield="0"
            :max-shield="100"
            :theme="isDarkTheme ? 'dark' : 'light'"
          />
        </div>

        <!-- 底部数据栏 -->
        <div class="flex justify-between items-center px-1 pt-2 border-t border-slate-200 dark:border-slate-700/50" @click.stop="showStatsInfo">
          <div class="flex gap-1 items-center">
            <span class="text-[8px] text-slate-400 font-bold mr-1">STAGE</span>
            <div v-for="(s, idx) in stageInfo.stages" :key="idx"
                 class="w-2.5 h-1 rounded-full transition-all"
                 :class="idx <= stageInfo.currentIndex ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-slate-300 dark:bg-slate-700'">
            </div>
          </div>

          <div class="flex gap-3 text-[9px] font-bold font-mono cursor-pointer relative group">
            <div class="absolute -top-4 right-0 text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击查看说明</div>
            <div class="flex items-center text-orange-500 dark:text-orange-400">
              <i class="fas fa-fire-alt mr-1"></i>
              <span>-{{ logStore.todayBurn }}</span>
            </div>
            <div class="flex items-center text-red-500 dark:text-red-400">
              <i class="fas fa-fist-raised mr-1"></i>
              <span>{{ store.todayDamage }}</span>
            </div>
            <i class="fas fa-question-circle text-[8px] text-slate-400 ml-1"></i>
          </div>
        </div>
      </div>

      <div v-if="tacticalTip" class="mt-2 mx-1 px-3 py-2 rounded-xl flex items-center gap-3 border shadow-sm transition-all duration-500 animate-[pulse_3s_infinite]" :class="tipClass">
        <div class="text-lg">{{ tacticalTip.icon }}</div>
        <div class="flex-1">
          <div class="text-[9px] opacity-80 font-bold uppercase tracking-wide">战术顾问</div>
          <div class="text-xs font-bold">{{ tacticalTip.text }}</div>
        </div>
      </div>
    </div>

    <!-- 纯净模式：数据看板 -->
    <div v-else class="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative z-10" id="guide-monster">
      <div class="flex justify-between items-end mb-3">
        <span class="text-sm text-slate-600 dark:text-slate-500 font-bold">今日热量摄入</span>
        <div class="text-right">
          <span class="font-mono font-black text-2xl text-slate-800 dark:text-white">{{ todayMacros.cals }}</span>
          <span class="text-xs text-slate-500 dark:text-slate-400 ml-1">/ {{ dailyTarget }} kcal</span>
        </div>
      </div>
      <div class="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <div class="h-full bg-blue-500 rounded-full" :style="{ width: Math.min((todayMacros.cals / dailyTarget) * 100, 100) + '%' }"></div>
      </div>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-500 dark:text-slate-400 mb-1">蛋白质</div>
          <div class="font-bold text-blue-600 dark:text-blue-500">{{ todayMacros.p }}g</div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-500 dark:text-slate-400 mb-1">碳水</div>
          <div class="font-bold text-green-600 dark:text-green-500">{{ todayMacros.c }}g</div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
          <div class="text-[10px] text-slate-500 dark:text-slate-400 mb-1">脂肪</div>
          <div class="font-bold text-orange-600 dark:text-orange-500">{{ todayMacros.f }}g</div>
        </div>
      </div>
    </div>

    <div class="px-4 mt-6 mb-2 flex justify-between items-center relative z-10" id="guide-meals">
      <h3 class="font-bold text-slate-800 dark:text-slate-300 text-sm">{{ isPure ? '饮食记录' : '冒险行动' }}</h3>
      <button @click="store.setModal('npcGuide', true)" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-full border border-slate-300 dark:border-slate-700 active:scale-95 transition flex items-center">
        <i class="fas fa-comment-dots mr-1"></i> {{ isPure ? '使用帮助' : '导师通讯' }}
      </button>
    </div>

    <div class="px-4 grid grid-cols-2 gap-3 mb-6 relative z-10">
      <div v-for="m in rpgMeals" :key="m.key"
           @click="openAddFood(m.key as MealType)"
           class="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-200 dark:border-slate-700 transition cursor-pointer hover:border-purple-400 dark:hover:border-purple-700"
           :class="[
             (!isPure && heroStore.user.heroCurrentHp <= 0) ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'
           ]">
        <div class="text-2xl bg-slate-100 dark:bg-slate-700 w-10 h-10 flex items-center justify-center rounded-lg">{{ m.icon }}</div>
        <div>
          <div class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ isPure ? m.label : m.rpgName }}</div>
          <div v-if="!isPure" class="text-[10px] text-slate-500 dark:text-slate-400">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-t-3xl min-h-[300px] p-5 pb-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] border-t border-slate-100 dark:border-slate-700 relative z-10" id="guide-logs">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-800 dark:text-slate-300 text-sm">{{ isPure ? '今日记录' : '战斗记录' }}</h3>
        <span class="text-[10px] text-slate-500 dark:text-slate-400">左滑删除 / 点击详情</span>
      </div>
      <div v-if="store.todayLogs.length === 0" class="text-center py-10 text-slate-500 dark:text-slate-400">
        <div class="text-4xl mb-2 grayscale opacity-50">📜</div>
        <div class="text-xs">暂无记录，快去补给！</div>
      </div>
      <transition-group name="van-slide-up">
        <van-swipe-cell v-for="log in store.todayLogs" :key="log.id" class="mb-3 rounded-2xl overflow-hidden shadow-sm">
          <div class="p-3 border bg-white dark:bg-slate-800/50 flex items-center justify-between relative"
               :class="{
                 'border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10': log.damageTaken && !isPure,
                 'border-green-300 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10': log.mealType === 'EXERCISE',
                 'border-slate-200 dark:border-slate-700': !log.damageTaken && log.mealType !== 'EXERCISE'
               }"
               @click="openLogDetail(log)">
            <div class="flex items-center gap-3 relative z-10">
              <div class="text-2xl w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm relative">
                {{ log.icon }}
                <div v-if="log.comboCount && log.comboCount > 1 && !isPure" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-slate-900 rounded-full text-[9px] flex items-center justify-center font-black border border-white dark:border-slate-900">
                  {{ log.comboCount }}
                </div>
              </div>
              <div>
                <div class="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center">
                  {{ log.name }}
                  <span v-if="log.mealType === 'EXERCISE'" class="ml-2 text-[8px] px-1 rounded bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-bold border border-green-200 dark:border-green-700">运动</span>
                  <span v-if="log.skillEffect && !isPure" class="ml-2 text-[8px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-700">✨天赋</span>
                  <span v-if="log.isComposite" class="ml-2 text-[8px] px-1 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-700">复合</span>
                  <span v-if="log.fastingHours && log.fastingHours > 12" class="ml-2 text-[8px] px-1 rounded bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 font-bold border border-yellow-200 dark:border-yellow-700">⚡蓄力</span>
                </div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" v-if="log.mealType === 'EXERCISE'">
                  消耗 {{ log.calories }} kcal
                </div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5" v-else-if="!log.damageTaken || isPure">
                  {{ log.grams }}g · {{ MEAL_LABELS[log.mealType] || log.mealType }}
                </div>
                <div class="text-[10px] text-red-500 dark:text-red-400 font-bold mt-0.5" v-else>反击伤害 -{{ log.damageTaken }} (格挡 {{ log.blocked }})</div>
              </div>
            </div>
            <div class="text-right relative z-10">
              <div v-if="log.mealType === 'EXERCISE'">
                <div class="font-bold text-lg text-green-600 dark:text-green-500">+{{ 50 + Math.floor((log.calories || 0) / 10) }} HP</div>
                <div class="text-[8px] text-slate-500 dark:text-slate-400">回复</div>
              </div>
              <div v-else-if="!log.damageTaken || isPure">
                <div class="font-rpg font-bold text-lg" :class="(!isPure && (log.multiplier || 1) < 1) ? 'text-slate-500 dark:text-slate-400' : (isPure ? 'text-slate-800 dark:text-slate-300' : 'text-red-600 dark:text-red-500')">
                  {{ isPure ? log.calories : '-' + (log.finalDamageValue || Math.floor(log.calories * (log.multiplier || 1))) }}
                </div>
                <div class="text-[8px] text-slate-500 dark:text-slate-400">{{ isPure ? 'kcal' : 'DMG' }}</div>
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
  font-family: 'Courier New', Courier, monospace;
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
@keyframes float-up {
  0% { transform: translateY(100px) scale(0.8); opacity: 0; }
  20% { opacity: 0.7; }
  80% { opacity: 0.7; }
  100% { transform: translateY(-100px) scale(1.2); opacity: 0; }
}
.animate-float-up {
  animation: float-up 10s linear infinite;
}

/* --- Weather Animations --- */

/* Rain & Heavy Rain */
@keyframes rain {
  0% { transform: translateY(-100px) scaleY(1); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translateY(100vh) scaleY(1); opacity: 0; }
}
.animate-rain {
  animation: rain 1s linear infinite;
}
@keyframes rain-fast {
  0% { transform: translateY(-100px) scaleY(1.5) translateX(0); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translateY(100vh) scaleY(1.5) translateX(-20px); opacity: 0; }
}
.animate-rain-fast {
  animation: rain-fast 0.5s linear infinite;
}

/* Snow & Blizzard */
@keyframes snow {
  0% { transform: translateY(-10px) rotate(0deg) translateX(0); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateY(100vh) rotate(360deg) translateX(20px); opacity: 0; }
}
.animate-snow {
  animation: snow 5s linear infinite;
}
@keyframes blizzard {
  0% { transform: translate(100vw, -10px) rotate(0deg); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translate(-100vw, 100vh) rotate(720deg); opacity: 0; }
}
.animate-blizzard {
  animation: blizzard 2s linear infinite;
}

/* Clouds & Fog */
@keyframes float-cloud {
  0% { transform: translateX(0); }
  50% { transform: translateX(10px); }
  100% { transform: translateX(0); }
}
.animate-float-cloud {
  animation: float-cloud 20s ease-in-out infinite;
}

/* Heat Rising */
@keyframes float-up-wobbly {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  20% { opacity: 0.6; }
  80% { opacity: 0; }
  100% { transform: translateY(-150px) translateX(20px) scale(1.5); opacity: 0; }
}
.animate-float-up-wobbly {
  animation: float-up-wobbly 4s ease-out infinite;
}

/* Flash for Storm */
@keyframes flash {
  0%, 90%, 100% { opacity: 0; }
  92%, 94% { opacity: 0.3; }
  93% { opacity: 0.1; }
}
.animate-flash {
  animation: flash 5s infinite;
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}
</style>
