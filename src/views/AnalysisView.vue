<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast } from 'vant';
// 注意：保留引入以免构建报错，实际已使用内置CSS引擎替代
import BodyTrendRPG from '@/components/trend/BodyTrendRPG.vue';
import BodyTrendPure from '@/components/trend/BodyTrendPure.vue';

const store = useGameStore();
const systemStore = useSystemStore();

// 体重更新状态
const showWeightUpdate = ref(false);
const newWeight = ref(0);

const weeklyStats = computed(() => store.weeklyStats || []);
const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });
const topFoods = computed(() => (store.todayLogs || []).slice(0, 8));
const dailyTarget = computed(() => store.dailyTarget);
const isPure = computed(() => systemStore.isPureMode);

const activeTab = computed({
  get: () => systemStore.analysisActiveTab,
  set: (val) => systemStore.analysisActiveTab = val
});

const currentDateObj = computed(() => {
  const dateStr = store.analysisRefDate || new Date().toISOString().split('T')[0] || '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y || 0, (m || 0) - 1, d || 0);
});

const weekRangeDateText = computed(() => {
  const stats = weeklyStats.value;
  if(!stats || !stats.length || !stats[0] || !stats[6]) return '加载中...';
  const start = new Date(stats[0].date);
  const end = new Date(stats[6].date);
  return `${start.getFullYear()}.${start.getMonth()+1}.${start.getDate()} - ${end.getMonth()+1}.${end.getDate()}`;
});

const isCurrentWeek = computed(() => {
  const today = new Date();
  const ref = currentDateObj.value;
  const getMonday = (d: Date) => {
    const day = d.getDay() || 7;
    const temp = new Date(d);
    temp.setDate(temp.getDate() - day + 1);
    temp.setHours(0,0,0,0);
    return temp;
  };
  return getMonday(ref).getTime() === getMonday(today).getTime();
});

const macroCals = computed(() => {
  const m = todayMacros.value;
  return { p: m.p * 4, c: m.c * 4, f: m.f * 9 };
});

const macroPct = computed(() => {
  const total = todayMacros.value.cals || 1;
  const cals = macroCals.value;
  return {
    p: Math.round(cals.p/total*100),
    c: Math.round(cals.c/total*100),
    f: Math.round(cals.f/total*100)
  };
});

const totalProgress = computed(() => {
  return Math.min(100, Math.round((todayMacros.value.cals / dailyTarget.value) * 100));
});

const getDayFlavorText = (status: string) => {
  if (isPure.value) {
    switch(status) {
      case 'VICTORY': return "热量达标";
      case 'DEFEAT': return "热量超标";
      case 'ONGOING': return "记录中";
      case 'SKIPPED': return "无记录";
      default: return "";
    }
  }
  switch(status) {
    case 'VICTORY': return "大捷！Boss已被击退";
    case 'DEFEAT': return "防线失守... Boss狂暴";
    case 'ONGOING': return "战斗正在进行中";
    case 'SKIPPED': return "英雄在营地休息";
    default: return "未知的时空";
  }
};

const shiftWeek = (offset: number) => {
  const d = new Date(currentDateObj.value);
  d.setDate(d.getDate() + (offset * 7));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  store.analysisRefDate = `${y}-${m}-${day}`;
};

const resetToCurrentWeek = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  store.analysisRefDate = `${y}-${m}-${day}`;
};

const openDetail = (date: string) => {
  store.temp.selectedHistoryDate = date;
  store.setModal('historyDetail', true);
}

// 计算推荐体重范围
const recommendedWeightRange = computed(() => {
  const user = store.user;
  if (!user.height || user.height <= 0) return null;
  const heightM = user.height / 100;
  const minWeight = (18.5 * heightM * heightM).toFixed(1);
  const maxWeight = (24 * heightM * heightM).toFixed(1);
  const idealWeight = (21.5 * heightM * heightM).toFixed(1);
  return { min: minWeight, max: maxWeight, ideal: idealWeight };
});

const targetWeight = computed(() => store.user.targetWeight || 0);

const targetDifference = computed(() => {
  if (!targetWeight.value) return null;
  const diff = store.user.weight - targetWeight.value;
  return {
    value: Math.abs(diff),
    needLose: diff > 0,
    text: diff > 0 ? '需减重' : diff < 0 ? '已超标' : '已达标'
  };
});

const openWeightUpdate = () => {
  newWeight.value = store.user.weight;
  showWeightUpdate.value = true;
}

// --------------------------------------------------------------------------
// [Engine 3.2] 增强版 CSS 能量柱状图引擎
// 核心修复：移除日期去重逻辑，直接展示最近7次原始记录，并保持7槽位对齐
// --------------------------------------------------------------------------
const chartDisplayData = computed(() => {
  // 1. 获取并清洗数据
  let history = store.user.weightHistory;
  if (!Array.isArray(history)) history = [];

  // 强制转数字并排序
  let cleanHistory = history.map(h => ({
    ...h,
    weight: Number(h.weight),
    timestamp: Number(h.timestamp || 0),
    date: h.date || ''
  })).filter(h => !isNaN(h.weight) && h.weight > 0);

  // 按时间排序，确保先录入的在左边，后录入的在右边
  cleanHistory.sort((a, b) => a.timestamp - b.timestamp);

  // 兜底数据 (如果没有任何历史记录，用当前体重创建一个，作为临时展示)
  if (cleanHistory.length === 0 && store.user.weight > 0) {
    const now = new Date();
    cleanHistory = [{
      weight: Number(store.user.weight),
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      isTemp: true
    }];
  }

  // ------------------------------------------------------
  // [Logic Change] 不再基于日期去重，直接取最后7条数据
  // ------------------------------------------------------

  // 1. 截取最后 7 条真实数据
  const maxSlots = 7;
  const recentItems = cleanHistory.slice(-maxSlots);

  // 2. 构建 7 个渲染槽位 (从左到右)
  // 为了视觉上靠右对齐（符合时间轴向右延伸的直觉），我们需要在前面填充空数据
  const emptyCount = maxSlots - recentItems.length;
  const resultSlots = [];

  // 2.1 填充左侧空槽位
  for (let i = 0; i < emptyCount; i++) {
    resultSlots.push({
      weight: 0,
      dateStr: '',
      hasData: false
    });
  }

  // 2.2 填充真实数据
  // 计算极值用于高度百分比
  let min = 0, max = 100, range = 100, lowerBound = 0;
  if (recentItems.length > 0) {
    const weights = recentItems.map(d => d.weight);
    min = Math.min(...weights);
    max = Math.max(...weights);
    const diff = max - min;

    const buffer = diff < 1 ? 2 : diff * 0.5;
    lowerBound = Math.max(0, min - buffer);
    const upperBound = max + buffer;
    range = upperBound - lowerBound || 1;
  }

  // 2.3 生成带高度属性的渲染对象
  recentItems.forEach((item, idx) => {
    // 这里的 index 是相对于 recentItems 的
    // 如果要计算变化量，和它在 recentItems 里的前一个比
    const prev = idx > 0 ? recentItems[idx - 1] : null;
    const change = prev ? item.weight - prev.weight : 0;

    const heightPct = ((item.weight - lowerBound) / range) * 100;

    // 日期显示处理
    let dateStr = item.date || '';
    if (dateStr.length > 5 && dateStr.includes('-')) {
      dateStr = dateStr.substring(5); // MM-DD
    }

    resultSlots.push({
      ...item,
      dateStr: dateStr,
      hasData: true,
      heightPct: Math.max(10, Math.min(100, heightPct)), // 限制在 10% - 100%
      change: change,
      isUp: change > 0,
      isDown: change < 0
    });
  });

  return resultSlots;
});

// --------------------------------------------------------------------------

// 保存体重逻辑
const saveWeight = () => {
  if (newWeight.value <= 20 || newWeight.value > 300) {
    showToast('请输入合理的体重 (20-300 kg)');
    return;
  }

  const oldWeight = store.user.weight;
  const change = newWeight.value - oldWeight;

  // 1. 更新基础数据
  store.heroStore.updateWeight(newWeight.value);

  // 2. 维护历史记录 (保留最近7次，不按日期去重)
  try {
    if (!Array.isArray(store.user.weightHistory)) {
      store.user.weightHistory = [];
    }

    let history = [...store.user.weightHistory];
    const now = new Date();
    const heightM = (store.user.height || 0) / 100;
    const bmi = heightM > 0 ? (newWeight.value / (heightM * heightM)).toFixed(1) : 0;

    const newEntry = {
      weight: Number(newWeight.value),
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      bmi: Number(bmi)
    };

    // [Logic Change] 移除同日判断，直接追加
    history.push(newEntry);

    // 始终保持只存最近7条（如需更多可调整此数字，但图表目前展示7条）
    if (history.length > 7) {
      history = history.slice(history.length - 7);
    }

    store.user.weightHistory = history;

  } catch (e) {
    console.error("AnalysisView: Local history update failed", e);
  }

  showWeightUpdate.value = false;

  const changeText = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
  showToast({
    message: isPure.value
      ? `体重已更新: ${newWeight.value}kg (${changeText}kg)`
      : `⚖️ 体重已记录！变化: ${changeText}kg`,
    duration: 2000
  });
}

const useRecommendedWeight = () => {
  if (!recommendedWeightRange.value) return;
  newWeight.value = parseFloat(recommendedWeightRange.value.ideal);
}

const useTargetWeight = () => {
  if (!targetWeight.value) return;
  newWeight.value = targetWeight.value;
}
</script>

<template>
  <div class="pb-20 bg-white dark:bg-slate-900 min-h-full transition-colors duration-300">
    <!-- Header -->
    <div id="guide-analysis-header" class="sticky top-0 bg-white dark:bg-slate-900 z-20 pt-4 px-4 pb-2 shadow-sm">
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between" :class="{'font-rpg': !isPure}">
        <span v-if="!isPure"><i class="fas fa-scroll text-purple-600 mr-2"></i> 冒险手札</span>
        <span v-else>数据报表</span>
        <button v-if="!isCurrentWeek" @click="resetToCurrentWeek" class="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full font-bold border border-purple-200 active:scale-95 transition">
          <i class="fas fa-undo mr-1"></i> 回到本周
        </button>
      </h2>
      <van-tabs v-model:active="activeTab" type="card" color="#7c3aed" class="w-full" background="transparent">
        <van-tab title="今日热量" name="today"></van-tab>
        <van-tab title="历史记录" name="week"></van-tab>
        <van-tab title="体重趋势" name="body"></van-tab>
      </van-tabs>
    </div>

    <!-- Transition Wrapper -->
    <transition name="fade" mode="out-in">
      <!-- Tab 1: Today -->
      <div v-if="activeTab === 'today'" key="today" class="p-4">
        <!-- (原有代码保持不变) -->
        <div class="mb-4 bg-blue-50 dark:bg-slate-800 p-3 rounded-xl border border-blue-100 dark:border-slate-700 flex gap-3 shadow-sm">
          <div class="text-2xl">{{ isPure ? '📊' : '💡' }}</div>
          <div>
            <div class="text-xs font-bold text-blue-600 dark:text-blue-400 mb-0.5">
              {{ isPure ? '今日概览' : '战术情报: 能量对抗' }}
            </div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                <span class="font-bold text-slate-700 dark:text-slate-200">摄入热量</span>即为对 Boss 造成的伤害。<br>目标是击穿 <span class="font-bold">BMR (基础代谢)</span> 防御值！
              </span>
              <span v-else>
                今日总摄入热量与基础代谢(BMR)的对比。<br>控制热量摄入是体重管理的关键。
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-3xl p-6 relative overflow-hidden transition-all duration-300"
             :class="isPure ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg' : 'bg-slate-900 border-4 border-double border-slate-700 shadow-2xl magic-border'">
          <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
          <h3 class="font-bold w-full mb-6 flex items-center justify-center relative z-10 text-lg"
              :class="isPure ? 'text-slate-700 dark:text-slate-200' : 'text-slate-200 font-rpg'">
            <i class="fas fa-fire-alt mr-2 animate-pulse" :class="isPure ? 'text-blue-500' : 'text-orange-500'"></i> 今日能量摄入
          </h3>
          <div id="guide-analysis-circle" class="text-center relative z-10 mb-8">
            <div class="text-5xl font-black font-mono drop-shadow-md tracking-tighter" :class="isPure ? 'text-slate-800 dark:text-white' : 'text-white'">
              {{ todayMacros.cals }}
              <span class="text-lg font-normal" :class="isPure ? 'text-slate-400' : 'text-slate-400'">/ {{ dailyTarget }}</span>
            </div>
            <div class="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Daily Intake vs BMR</div>
            <div class="w-full h-3 rounded-full mt-4 overflow-hidden border relative"
                 :class="isPure ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' : 'bg-slate-800 border-slate-600'">
              <div class="h-full transition-all duration-1000"
                   :class="isPure ? 'bg-blue-500' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'"
                   :style="{ width: totalProgress + '%' }"></div>
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-1 font-mono">
              <span>0%</span>
              <span>{{ totalProgress }}%</span>
              <span>100%</span>
            </div>
          </div>
          <div id="guide-analysis-bars" class="space-y-4 relative z-10 p-4 rounded-xl border"
               :class="isPure ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-100 dark:border-slate-600' : 'bg-slate-800/50 border-slate-700'">
            <div class="text-xs font-bold text-slate-400 text-center mb-2">能量来源占比 (Calories Source)</div>
            <div>
              <div class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest" :class="isPure ? 'text-slate-600 dark:text-slate-300' : 'text-red-400'">
                <span>蛋白质 (Pro)</span><span>{{ macroCals.p }} kcal ({{ macroPct.p }}%)</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" :class="isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-900'">
                <div class="h-full" :class="isPure ? 'bg-blue-500' : 'bg-red-600'" :style="{ width: macroPct.p + '%' }"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest" :class="isPure ? 'text-slate-600 dark:text-slate-300' : 'text-yellow-400'">
                <span>碳水 (Carb)</span><span>{{ macroCals.c }} kcal ({{ macroPct.c }}%)</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" :class="isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-900'">
                <div class="h-full" :class="isPure ? 'bg-green-500' : 'bg-yellow-500'" :style="{ width: macroPct.c + '%' }"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs font-bold mb-1 uppercase tracking-widest" :class="isPure ? 'text-slate-600 dark:text-slate-300' : 'text-green-400'">
                <span>脂肪 (Fat)</span><span>{{ macroCals.f }} kcal ({{ macroPct.f }}%)</span>
              </div>
              <div class="h-1.5 rounded-full overflow-hidden" :class="isPure ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-900'">
                <div class="h-full" :class="isPure ? 'bg-orange-500' : 'bg-green-500'" :style="{ width: macroPct.f + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-3">{{ isPure ? '今日记录' : '今日狩猎战利品' }} (Top 8)</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="(item, i) in topFoods" :key="i" class="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 shadow-sm flex items-center">
                {{ item.icon }} {{ item.name }}
            </span>
            <span v-if="topFoods.length === 0" class="text-xs text-slate-400 italic">暂无记录...</span>
          </div>
        </div>
      </div>

      <!-- Tab 2: Week -->
      <div v-else-if="activeTab === 'week'" key="week" class="p-4">
        <!-- (原有代码保持不变) -->
        <div class="mb-4 bg-purple-50 dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-slate-700 flex gap-3 shadow-sm">
          <div class="text-2xl">{{ isPure ? '📅' : '📜' }}</div>
          <div>
            <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-0.5">
              {{ isPure ? '历史趋势' : '战术情报: 历史回溯' }}
            </div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                <span class="text-green-600 font-bold">VICTORY (大捷)</span> 意味着成功控制热量；
                <span class="text-red-500 font-bold">DEFEAT (失守)</span> 意味着 Boss 狂暴。
              </span>
              <span v-else>
                回顾过去一周的热量摄入情况。<br>保持绿色达标状态有助于健康。
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button @click="shiftWeek(-1)" class="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all active:scale-95">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter">
              {{ weekRangeDateText }}
          </span>
          <button @click="shiftWeek(1)" class="w-10 h-8 flex items-center justify-center text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all active:scale-95">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <div id="guide-weekly-stats" class="space-y-3">
          <div v-for="(day, idx) in weeklyStats" :key="idx" class="relative group" @click="!day.isFuture && openDetail(day.date)">
            <div v-if="idx < weeklyStats.length - 1" class="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10 h-full"></div>
            <div class="flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all"
                 :class="[
                     day.isToday ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900 z-10' : 'opacity-90',
                     day.isFuture ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'
                 ]">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl mr-4 shrink-0 shadow-inner"
                   :class="{
                       'bg-slate-100 dark:bg-slate-700 text-slate-400': day.rpgStatus === 'UNKNOWN' || day.rpgStatus === 'SKIPPED',
                       'bg-green-100 dark:bg-green-900/30 text-green-600': day.rpgStatus === 'VICTORY',
                       'bg-red-100 dark:bg-red-900/30 text-red-500': day.rpgStatus === 'DEFEAT',
                       'bg-blue-100 dark:bg-blue-900/30 text-blue-500': day.rpgStatus === 'ONGOING'
                   }">
                <i v-if="day.isFuture" class="fas fa-lock text-xs"></i>
                <i v-else-if="day.rpgStatus === 'VICTORY'" class="fas fa-check"></i>
                <i v-else-if="day.rpgStatus === 'DEFEAT'" class="fas fa-exclamation"></i>
                <i v-else-if="day.rpgStatus === 'ONGOING'" class="fas fa-pen"></i>
                <i v-else class="fas fa-minus"></i>
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {{ day.label }} <span class="text-xs font-normal text-slate-400 ml-1">周{{ day.weekday }}</span>
                  </div>
                  <div class="text-xs font-bold font-mono" :class="day.val > store.dailyTarget ? 'text-red-500' : 'text-slate-500'">
                    {{ day.val }}
                  </div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full rounded-full"
                       :style="{ width: Math.min((day.val / store.dailyTarget) * 100, 100) + '%' }"
                       :class="day.rpgStatus === 'DEFEAT' ? 'bg-red-500' : 'bg-green-500'">
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 mt-1 italic flex justify-between">
                  <span>{{ day.isFuture ? (isPure ? '未到' : '迷雾未散...') : getDayFlavorText(day.rpgStatus) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Body Trend (Redesigned with CSS Pillars) -->
      <div v-else key="body" class="p-4">

        <div class="mb-4 bg-green-50 dark:bg-slate-800 p-3 rounded-xl border border-green-100 dark:border-slate-700 flex gap-3 shadow-sm">
          <div class="text-2xl">⚖️</div>
          <div class="flex-1">
            <div class="text-xs font-bold text-green-600 dark:text-green-400 mb-0.5">
              {{ isPure ? '体重记录' : '战术情报: 塑形魔法' }}
            </div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                这是你的体重变化曲线。<br>体重的改变将直接重塑你的<span class="font-bold text-slate-700 dark:text-slate-200">基础属性 (STR/AGI/VIT)</span>。
              </span>
              <span v-else>
                定期记录体重,监控身体变化趋势。
              </span>
            </div>
          </div>
          <button @click="openWeightUpdate"
                  class="px-4 py-2 rounded-xl font-bold text-xs shadow-md active:scale-95 transition flex items-center gap-1.5 whitespace-nowrap"
                  :class="isPure ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-yellow-500 text-slate-900 hover:bg-yellow-600'">
            <i class="fas fa-weight"></i>
            <span>更新体重</span>
          </button>
        </div>

        <!--
           [Framework Level Chart]
           CSS Flexbox 能量柱状图
           即使只有一条数据，也会渲染7个槽位，保证布局不塌陷
        -->
        <div id="guide-weight-chart" class="w-full h-64 relative rounded-2xl overflow-hidden p-4 transition-all duration-300 flex flex-col"
             :class="isPure
                ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md'
                : 'bg-slate-900 border-2 border-slate-700 shadow-2xl'">

          <!-- 背景纹理 (RPG模式) -->
          <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

          <!-- 标题区域 -->
          <div class="flex justify-between items-center mb-4 relative z-10">
            <div class="text-xs font-bold uppercase tracking-wider"
                 :class="isPure ? 'text-slate-500' : 'text-slate-400 font-rpg'">
              {{ isPure ? '近期趋势 (7次)' : 'BODY COMPOSITION (7d)' }}
            </div>
            <!-- 如果有数据，显示最新体重 -->
            <div class="text-xs font-mono" :class="isPure ? 'text-blue-500' : 'text-purple-400'">
              {{ store.user.weight > 0 ? store.user.weight + ' kg' : '--' }}
            </div>
          </div>

          <!-- 缺省状态 (仅当完全无数据且兜底失败时) -->
          <div v-if="chartDisplayData.length === 0" class="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs pb-4 opacity-50">
            <i class="fas fa-chart-bar text-3xl mb-2"></i>
            <span>暂无数据</span>
          </div>

          <!-- CSS 柱状图容器 -->
          <div v-else class="flex-1 flex justify-between items-end gap-2 relative z-10 pb-1">
            <div v-for="(bar, idx) in chartDisplayData" :key="idx"
                 class="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative">

              <!-- 数值标签 (有数据才显示) -->
              <div v-if="bar.hasData"
                   class="text-[10px] font-bold mb-1 transition-all"
                   :class="isPure ? 'text-slate-600 dark:text-slate-300' : 'text-white drop-shadow-md'"
                   style="font-size: 9px;">
                {{ bar.weight }}
              </div>

              <!-- 柱体 (有数据高亮，无数据占位) -->
              <div class="w-full min-w-[12px] max-w-[24px] rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
                   :style="{ height: bar.hasData ? bar.heightPct + '%' : '2px' }"
                   :class="[
                       bar.hasData
                         ? (isPure
                            ? 'bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800'
                            : 'bg-slate-800/50 hover:bg-slate-700 border border-slate-600 hover:border-purple-500')
                         : 'bg-slate-100 dark:bg-slate-800 opacity-50'
                     ]">

                <!-- 内部填充条 (RPG模式下的能量槽效果) -->
                <div v-if="bar.hasData"
                     class="absolute bottom-0 left-0 right-0 transition-all duration-1000"
                     :style="{ height: '100%' }"
                     :class="isPure
                            ? 'bg-blue-500'
                            : 'bg-gradient-to-t from-purple-900 via-purple-600 to-pink-500 opacity-80'">
                </div>

                <!-- 顶部高光 (Pure模式) -->
                <div v-if="isPure && bar.hasData" class="absolute top-0 left-0 right-0 h-1 bg-white/30"></div>
              </div>

              <!-- 日期标签 -->
              <div class="text-[9px] mt-2 font-mono text-center w-full truncate"
                   :class="isPure ? 'text-slate-400' : 'text-slate-500'">
                {{ bar.dateStr }}
              </div>

              <!-- 趋势指示器 (仅RPG模式或大变化时显示) -->
              <div v-if="bar.change !== 0"
                   class="absolute -top-4 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                   :class="bar.isUp ? 'text-red-500' : 'text-green-500'">
                {{ bar.isUp ? '↑' : '↓' }}
              </div>
            </div>
          </div>

          <!-- 底部装饰线 -->
          <div class="h-px w-full mt-1" :class="isPure ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-700'"></div>
        </div>

      </div>
    </transition>

    <!-- 体重更新弹窗 (代码保持不变) -->
    <van-dialog v-model:show="showWeightUpdate"
                :title="isPure ? '更新体重' : '⚖️ 记录体重'"
                show-cancel-button
                @confirm="saveWeight"
                :confirm-button-text="isPure ? '保存' : '记录'"
                class="dark:bg-slate-800 dark:text-white">
      <div class="p-4 space-y-4">
        <!-- 当前体重 -->
        <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 text-center">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">当前体重</div>
          <div class="text-3xl font-bold text-slate-800 dark:text-white">
            {{ store.user.weight }} <span class="text-lg font-normal text-slate-500">kg</span>
          </div>
        </div>

        <!-- 新体重输入 -->
        <div>
          <label class="text-xs text-slate-500 dark:text-slate-400 block mb-2 font-bold">新体重 (kg)</label>
          <input type="number"
                 step="0.1"
                 v-model.number="newWeight"
                 class="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-center text-slate-800 dark:text-white border-2 border-transparent focus:border-blue-500 transition">
        </div>

        <!-- 推荐体重范围（RPG模式） -->
        <div v-if="!isPure && recommendedWeightRange" class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-purple-600 dark:text-purple-400">
              <i class="fas fa-star mr-1"></i>推荐体重参考
            </div>
            <button @click="useRecommendedWeight"
                    type="button"
                    class="text-[10px] bg-purple-500 text-white px-2 py-1 rounded-full font-bold active:scale-95 transition">
              使用理想值
            </button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>健康范围:</span>
              <span class="font-bold">{{ recommendedWeightRange.min }} - {{ recommendedWeightRange.max }} kg</span>
            </div>
            <div class="flex justify-between">
              <span>理想体重:</span>
              <span class="font-bold text-purple-600 dark:text-purple-400">{{ recommendedWeightRange.ideal }} kg</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-2">
              *基于BMI 18.5-24的健康范围计算
            </div>
          </div>
        </div>

        <!-- 目标体重信息（纯净模式） -->
        <div v-if="isPure && targetWeight > 0" class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-green-600 dark:text-green-400">
              <i class="fas fa-bullseye mr-1"></i>目标体重
            </div>
            <button @click="useTargetWeight"
                    type="button"
                    class="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-bold active:scale-95 transition">
              使用目标值
            </button>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>你的目标:</span>
              <span class="font-bold text-green-600 dark:text-green-400">{{ targetWeight }} kg</span>
            </div>
            <div v-if="targetDifference" class="flex justify-between">
              <span>距离目标:</span>
              <span class="font-bold" :class="targetDifference.needLose ? 'text-orange-600' : 'text-blue-600'">
                {{ targetDifference.value.toFixed(1) }} kg ({{ targetDifference.text }})
              </span>
            </div>
          </div>
        </div>

        <!-- 推荐体重信息（纯净模式 - 无目标时显示） -->
        <div v-if="isPure && !targetWeight && recommendedWeightRange" class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-blue-600 dark:text-blue-400">
              <i class="fas fa-info-circle mr-1"></i>健康体重参考
            </div>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div class="flex justify-between">
              <span>健康范围:</span>
              <span class="font-bold">{{ recommendedWeightRange.min }} - {{ recommendedWeightRange.max }} kg</span>
            </div>
            <div class="flex justify-between">
              <span>理想体重:</span>
              <span class="font-bold text-blue-600 dark:text-blue-400">{{ recommendedWeightRange.ideal }} kg</span>
            </div>
            <div class="text-[10px] text-slate-400 mt-2">
              *基于BMI 18.5-24的健康范围计算
            </div>
          </div>
        </div>

        <!-- 变化预览 -->
        <div v-if="Math.abs(newWeight - store.user.weight) > 0.1"
             class="text-xs text-center p-2 rounded-lg"
             :class="newWeight > store.user.weight ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'bg-green-50 dark:bg-green-900/20 text-green-600'">
          变化: {{ newWeight > store.user.weight ? '+' : '' }}{{ (newWeight - store.user.weight).toFixed(1) }} kg
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.magic-border { position: relative; }
.magic-border::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 2px;
  background: linear-gradient(45deg, #7c3aed, #3b82f6, #ef4444);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; opacity: 0.5;
}
.animate-spin-slow { animation: spin 10s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
