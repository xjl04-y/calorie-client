<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore'; // Import SystemStore

const store = useGameStore();
const systemStore = useSystemStore(); // Init System

const user = computed(() => store.user);
const weeklyStats = computed(() => store.weeklyStats || []);
const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });
const topFoods = computed(() => (store.todayLogs || []).slice(0, 8));
const dailyTarget = computed(() => store.dailyTarget);
const isPure = computed(() => systemStore.isPureMode);

// [V3.9 Fix] Link activeTab to global store for NPC control
const activeTab = computed({
  get: () => systemStore.analysisActiveTab,
  set: (val) => systemStore.analysisActiveTab = val
});

const selectedPoint = ref<number | null>(null);

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

const weightHistory = computed(() => {
  return store.user.weightHistory ? [...store.user.weightHistory] : [];
});

const weightChartData = computed(() => {
  const history = weightHistory.value;
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recent = sorted.slice(-14);

  const weights = recent.map(r => r.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const width = 300;
  const height = 150;
  const padding = 20;

  const points = recent.map((r, i) => {
    const xStep = recent.length > 1 ? (width - 2 * padding) / (recent.length - 1) : 0;
    const x = padding + (i * xStep);
    const y = height - padding - ((r.weight - minW) / range) * (height - 2 * padding);
    const dateShort = r.date.slice(5);
    return { x, y, val: r.weight, date: dateShort };
  });

  const pathD = points.length > 1
    ? `M ${points[0]?.x || 0} ${points[0]?.y || 0} ` + points.slice(1).map(p => `L ${p?.x || 0} ${p?.y || 0}`).join(' ')
    : points.length === 1 ? `M ${padding} ${points[0]?.y || 0} L ${width-padding} ${points[0]?.y || 0}` : '';

  const areaPathD = points.length > 1
    ? `${pathD} L ${points[points.length-1]?.x || 0} ${height} L ${points[0]?.x || 0} ${height} Z`
    : '';

  return { points, pathD, areaPathD, minW, maxW };
});
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

        <!-- 只有最外层保留，内部不再用这个ID -->
        <div class="rounded-3xl p-6 relative overflow-hidden transition-all duration-300"
             :class="isPure ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg' : 'bg-slate-900 border-4 border-double border-slate-700 shadow-2xl magic-border'">

          <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

          <h3 class="font-bold w-full mb-6 flex items-center justify-center relative z-10 text-lg"
              :class="isPure ? 'text-slate-700 dark:text-slate-200' : 'text-slate-200 font-rpg'">
            <i class="fas fa-fire-alt mr-2 animate-pulse" :class="isPure ? 'text-blue-500' : 'text-orange-500'"></i> 今日能量摄入
          </h3>

          <!-- [Fix] 主仪表盘 (Circle) ID -->
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

          <!-- [Fix] 营养条 (Bars) ID -->
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
        <!-- [Modified] ID: guide-weekly-stats -->
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

      <!-- Tab 3: Body Trend -->
      <div v-else key="body" class="p-4">

        <div class="mb-4 bg-green-50 dark:bg-slate-800 p-3 rounded-xl border border-green-100 dark:border-slate-700 flex gap-3 shadow-sm">
          <div class="text-2xl">⚖️</div>
          <div>
            <div class="text-xs font-bold text-green-600 dark:text-green-400 mb-0.5">
              {{ isPure ? '体重记录' : '战术情报: 塑形魔法' }}
            </div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <span v-if="!isPure">
                这是你的体重变化曲线。<br>体重的改变将直接重塑你的<span class="font-bold text-slate-700 dark:text-slate-200">基础属性 (STR/AGI/VIT)</span>。
              </span>
              <span v-else>
                定期记录体重，监控身体变化趋势。
              </span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm text-center" v-if="!weightChartData">
          <div class="text-4xl mb-2 grayscale opacity-50">⚖️</div>
          <div class="text-sm text-slate-500">暂无体重记录</div>
          <div class="text-xs text-slate-400 mt-1">请前往「英雄档案」更新你的体重数据</div>
        </div>

        <div v-else id="guide-weight-chart" class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center justify-between">
            <span><i class="fas fa-weight mr-2 text-blue-500"></i> 近期体态变化</span>
            <span class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">最近14次</span>
          </h3>

          <div class="relative w-full aspect-[2/1] rounded-xl select-none touch-none">
            <svg viewBox="0 0 300 150" class="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="0" x2="300" y2="0" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" />
              <line x1="0" y1="75" x2="300" y2="75" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" stroke-dasharray="4 4" />
              <line x1="0" y1="150" x2="300" y2="150" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" />

              <path :d="weightChartData.areaPathD" fill="url(#areaGradient)" />
              <path :d="weightChartData.pathD" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-sm" />

              <g v-for="(p, i) in weightChartData.points" :key="'p'+i">
                <circle :cx="p.x" :cy="p.y" r="3" fill="#3b82f6" stroke="#fff" stroke-width="1.5" />
              </g>

              <g v-for="(p, i) in weightChartData.points" :key="'hit'+i">
                <circle :cx="p.x" :cy="p.y" r="15" fill="transparent" class="cursor-pointer" @mouseenter="selectedPoint = i" @click="selectedPoint = i" />
              </g>

              <g v-if="selectedPoint !== null && weightChartData.points[selectedPoint]" class="pointer-events-none transition-all duration-200">
                <circle :cx="weightChartData.points[selectedPoint]?.x || 0" :cy="weightChartData.points[selectedPoint]?.y || 0" r="6" fill="#fff" stroke="#3b82f6" stroke-width="3" />
                <g>
                  <rect :x="(weightChartData.points[selectedPoint]?.x || 0) - 24" :y="(weightChartData.points[selectedPoint]?.y || 0) - 45" width="48" height="24" rx="6" fill="#1e293b" class="shadow-lg" />
                  <path :d="`M ${weightChartData.points[selectedPoint]?.x || 0} ${(weightChartData.points[selectedPoint]?.y || 0) - 21} L ${(weightChartData.points[selectedPoint]?.x || 0) - 6} ${(weightChartData.points[selectedPoint]?.y || 0) - 12} L ${(weightChartData.points[selectedPoint]?.x || 0) + 6} ${(weightChartData.points[selectedPoint]?.y || 0) - 12} Z`" fill="#1e293b" />
                  <text :x="weightChartData.points[selectedPoint]?.x || 0" :y="(weightChartData.points[selectedPoint]?.y || 0) - 29" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">
                    {{ weightChartData.points[selectedPoint]?.val || 0 }}kg
                  </text>
                </g>
                <line :x1="weightChartData.points[selectedPoint]?.x || 0" :y1="(weightChartData.points[selectedPoint]?.y || 0) + 6" :x2="weightChartData.points[selectedPoint]?.x || 0" y2="150" stroke="#3b82f6" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
              </g>
            </svg>
          </div>

          <div class="mt-6 flex justify-between text-xs text-slate-400 px-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2">
            <span><i class="fas fa-arrow-down text-green-500 mr-1"></i>Min: {{ weightChartData.minW.toFixed(1) }}</span>
            <span><i class="fas fa-arrow-up text-red-500 mr-1"></i>Max: {{ weightChartData.maxW.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </transition>
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
