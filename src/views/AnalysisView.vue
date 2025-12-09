<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';

const store = useGameStore();

const user = computed(() => store.user);
const weeklyStats = computed(() => store.weeklyStats || []);
const todayMacros = computed(() => store.todayMacros || { p: 0, c: 0, f: 0, cals: 0 });
const topFoods = computed(() => (store.todayLogs || []).slice(0, 8));

const activeTab = ref('today');
const selectedPoint = ref<number | null>(null);

const currentDateObj = computed(() => {
  const dateStr = store.analysisRefDate || new Date().toISOString().split('T')[0];
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
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

const macroPct = computed(() => {
  const m = todayMacros.value;
  if (!m) return { p: 0, c: 0, f: 0 };
  const total = (m.p + m.c + m.f) || 1;
  return {
    p: Math.round(m.p/total*100),
    c: Math.round(m.c/total*100),
    f: Math.round(m.f/total*100)
  };
});

const getDayFlavorText = (status: string) => {
  switch(status) {
    case 'VICTORY': return "大捷！Boss已被击退";
    case 'DEFEAT': return "防线失守... Boss狂暴";
    case 'ONGOING': return "战斗正在进行中";
    case 'SKIPPED': return "英雄在营地休息";
    default: return "未知的时空";
  }
};

// 修复 4: 严格的日期格式化 (YYYY-MM-DD)，确保与 store 中的 key 匹配
const shiftWeek = (offset: number) => {
  const d = new Date(currentDateObj.value);
  d.setDate(d.getDate() + (offset * 7));

  const y = d.getFullYear();
  // 必须补零，否则匹配不到 store 中的 key (如 2023-5-1 vs 2023-05-01)
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

// 确保体重历史记录是响应式的
const weightHistory = computed(() => {
  return store.user.weightHistory ? [...store.user.weightHistory] : [];
});

const weightChartData = computed(() => {
  const history = weightHistory.value;
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recent = sorted.slice(-14); // 取最近14条

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
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : points.length === 1 ? `M ${padding} ${points[0].y} L ${width-padding} ${points[0].y}` : '';

  const areaPathD = points.length > 1
    ? `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z`
    : '';

  return { points, pathD, areaPathD, minW, maxW };
});
</script>

<template>
  <div class="pb-20 bg-white dark:bg-slate-900 min-h-full transition-colors duration-300">
    <!-- Header -->
    <div class="sticky top-0 bg-white dark:bg-slate-900 z-20 pt-4 px-4 pb-2 shadow-sm">
      <h2 class="text-xl font-rpg text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between">
        <span><i class="fas fa-scroll text-purple-600 mr-2"></i> 冒险手札</span>
        <button v-if="!isCurrentWeek" @click="resetToCurrentWeek" class="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full font-bold border border-purple-200 active:scale-95 transition">
          <i class="fas fa-undo mr-1"></i> 回到本周
        </button>
      </h2>
      <van-tabs v-model:active="activeTab" type="card" color="#7c3aed" class="w-full" background="transparent">
        <van-tab title="元素共鸣" name="today"></van-tab>
        <van-tab title="冒险编年史" name="week"></van-tab>
        <van-tab title="体态趋势" name="body"></van-tab>
      </van-tabs>
    </div>

    <!-- Tab 1: 元素共鸣 -->
    <div v-if="activeTab === 'today'" class="p-4 animate-fade-in">
      <div class="bg-slate-900 rounded-3xl p-6 border-4 border-double border-slate-700 shadow-2xl relative overflow-hidden magic-border">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
        <h3 class="font-bold text-slate-200 w-full mb-6 flex items-center justify-center relative z-10 text-lg font-rpg">
          <i class="fas fa-atom mr-2 text-purple-400 animate-spin-slow"></i> 元素魔力池
        </h3>
        <div class="space-y-6 relative z-10">
          <div>
            <div class="flex justify-between text-xs font-bold text-red-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-fire mr-1"></i> 力量 (Pro)</span><span>{{ macroPct.p }}%</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
              <div class="absolute inset-0 bg-red-900/30"></div>
              <div class="h-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-1000" :style="{ width: macroPct.p + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-bold text-yellow-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-bolt mr-1"></i> 敏捷 (Carb)</span><span>{{ macroPct.c }}%</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
              <div class="absolute inset-0 bg-yellow-900/30"></div>
              <div class="h-full bg-gradient-to-r from-yellow-500 to-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000" :style="{ width: macroPct.c + '%' }"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-bold text-green-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-shield-alt mr-1"></i> 坚韧 (Fat)</span><span>{{ macroPct.f }}%</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
              <div class="absolute inset-0 bg-green-900/30"></div>
              <div class="h-full bg-gradient-to-r from-green-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" :style="{ width: macroPct.f + '%' }"></div>
            </div>
          </div>
        </div>
        <div class="mt-8 text-center">
          <div class="text-[10px] text-slate-400 uppercase tracking-[0.2em] mb-1">Total Mana Output</div>
          <div class="text-4xl font-rpg text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-lg">
            {{ todayMacros.cals }} <span class="text-sm text-slate-500">kcal</span>
          </div>
        </div>
      </div>
      <div class="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 class="text-xs font-bold text-slate-500 uppercase mb-3">今日狩猎战利品</h4>
        <div class="flex flex-wrap gap-2">
          <span v-for="(item, i) in topFoods" :key="i" class="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 shadow-sm flex items-center">
              {{ item.icon }} {{ item.name }}
          </span>
          <span v-if="topFoods.length === 0" class="text-xs text-slate-400 italic">暂无记录...</span>
        </div>
      </div>
    </div>

    <!-- Tab 2: 冒险编年史 -->
    <div v-else-if="activeTab === 'week'" class="p-4 animate-fade-in">
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
      <div class="space-y-3">
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
              <i v-else-if="day.rpgStatus === 'VICTORY'" class="fas fa-crown"></i>
              <i v-else-if="day.rpgStatus === 'DEFEAT'" class="fas fa-skull"></i>
              <i v-else-if="day.rpgStatus === 'ONGOING'" class="fas fa-running"></i>
              <i v-else class="fas fa-bed"></i>
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
                <span>{{ day.isFuture ? '迷雾未散...' : getDayFlavorText(day.rpgStatus) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: 体态趋势 (Stable SVG) -->
    <div v-else class="p-4 animate-fade-in">
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm text-center" v-if="!weightChartData">
        <div class="text-4xl mb-2 grayscale opacity-50">⚖️</div>
        <div class="text-sm text-slate-500">暂无体重记录</div>
        <div class="text-xs text-slate-400 mt-1">请前往「英雄档案」更新你的体重数据</div>
      </div>

      <div v-else class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center justify-between">
          <span><i class="fas fa-weight mr-2 text-blue-500"></i> 近期体态变化</span>
          <span class="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">最近14次</span>
        </h3>

        <!-- SVG Chart -->
        <div class="relative w-full aspect-[2/1] rounded-xl select-none touch-none">
          <svg viewBox="0 0 300 150" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
              </linearGradient>
            </defs>

            <!-- Grid Lines -->
            <line x1="0" y1="0" x2="300" y2="0" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" />
            <line x1="0" y1="75" x2="300" y2="75" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" stroke-dasharray="4 4" />
            <line x1="0" y1="150" x2="300" y2="150" stroke="currentColor" class="text-slate-100 dark:text-slate-700" stroke-width="1" />

            <!-- Area Fill -->
            <path :d="weightChartData.areaPathD" fill="url(#areaGradient)" />

            <!-- Path Line -->
            <path :d="weightChartData.pathD" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-sm" />

            <!-- Points Layer (Static) -->
            <g v-for="(p, i) in weightChartData.points" :key="'p'+i">
              <circle :cx="p.x" :cy="p.y" r="3" fill="#3b82f6" stroke="#fff" stroke-width="1.5" />
            </g>

            <!-- Interaction Layer (Invisible Hit Targets) -->
            <g v-for="(p, i) in weightChartData.points" :key="'hit'+i">
              <circle :cx="p.x" :cy="p.y" r="15" fill="transparent" class="cursor-pointer" @mouseenter="selectedPoint = i" @click="selectedPoint = i" />
            </g>

            <!-- Highlight Layer (On Top) -->
            <!-- 修复 5: pointer-events-none 彻底消除交互抖动 (鼠标穿透) -->
            <g v-if="selectedPoint !== null && weightChartData.points[selectedPoint]" class="pointer-events-none transition-all duration-200">
              <!-- Highlight Circle -->
              <circle :cx="weightChartData.points[selectedPoint].x" :cy="weightChartData.points[selectedPoint].y" r="6" fill="#fff" stroke="#3b82f6" stroke-width="3" />

              <!-- Tooltip Group -->
              <g>
                <rect :x="weightChartData.points[selectedPoint].x - 24" :y="weightChartData.points[selectedPoint].y - 45" width="48" height="24" rx="6" fill="#1e293b" class="shadow-lg" />
                <!-- Triangle -->
                <path :d="`M ${weightChartData.points[selectedPoint].x} ${weightChartData.points[selectedPoint].y - 21} L ${weightChartData.points[selectedPoint].x - 6} ${weightChartData.points[selectedPoint].y - 12} L ${weightChartData.points[selectedPoint].x + 6} ${weightChartData.points[selectedPoint].y - 12} Z`" fill="#1e293b" />

                <text :x="weightChartData.points[selectedPoint].x" :y="weightChartData.points[selectedPoint].y - 29" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="bold">
                  {{ weightChartData.points[selectedPoint].val }}kg
                </text>
              </g>

              <!-- Vertical Line -->
              <line :x1="weightChartData.points[selectedPoint].x" :y1="weightChartData.points[selectedPoint].y + 6" :x2="weightChartData.points[selectedPoint].x" y2="150" stroke="#3b82f6" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
            </g>
          </svg>
        </div>

        <div class="mt-6 flex justify-between text-xs text-slate-400 px-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2">
          <span><i class="fas fa-arrow-down text-green-500 mr-1"></i>Min: {{ weightChartData.minW.toFixed(1) }}</span>
          <span><i class="fas fa-arrow-up text-red-500 mr-1"></i>Max: {{ weightChartData.maxW.toFixed(1) }}</span>
        </div>
      </div>
    </div>
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
</style>
