<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useGameStore();
// 使用 storeToRefs 保持响应性，避免解构丢失引用
const { analysisRefDate } = storeToRefs(store);

const activeTab = ref('today');

// 获取周报数据
const weeklyStats = computed(() => store.weeklyStats); // 注意：Pinia getter 不需要括号调用

// 计算当前周期的显示文本 (e.g., "2023年10月1日 - 10月7日")
const weekRangeDateText = computed(() => {
  const stats = weeklyStats.value;
  if(!stats.length) return '';
  const start = new Date(stats[0].date);
  const end = new Date(stats[6].date);
  return `${start.getFullYear()}年${start.getMonth()+1}月${start.getDate()}日 - ${end.getMonth()+1}月${end.getDate()}日`;
});

// 判断是否是当前周（用于禁用“下一章”按钮）
const isCurrentWeek = computed(() => {
  const today = new Date();
  const refDate = new Date(analysisRefDate.value);

  // 获取当周周一的辅助函数
  const getMonday = (d: Date) => {
    const day = d.getDay() || 7;
    const temp = new Date(d);
    temp.setHours(0,0,0,0);
    temp.setDate(temp.getDate() - day + 1);
    return temp;
  };
  return getMonday(refDate) >= getMonday(today);
});

// 计算今日宏量营养素百分比 (用于元素共鸣图表)
const macroPct = computed(() => {
  const m = store.todayMacros;
  const total = (m.p + m.c + m.f) || 1; // 防止除以0
  return {
    p: Math.round(m.p/total*100),
    c: Math.round(m.c/total*100),
    f: Math.round(m.f/total*100)
  };
});

// 获取今日前8条记录作为“战利品”展示
const topFoods = computed(() => store.todayLogs.slice(0, 8));

// RPG 风味文案生成器
const getDayFlavorText = (status: string) => {
  switch(status) {
    case 'VICTORY': return "完美的胜利！Boss被击退。";
    case 'DEFEAT': return "防线失守... Boss狂暴化！";
    case 'ONGOING': return "战斗正在激烈进行中...";
    case 'SKIPPED': return "英雄在营地休息。";
    default: return "未知的时空...";
  }
};

// 切换周次 Action
const shiftWeek = (offset: number) => {
  // 这里需要调用 store 中定义的 action (假设 store 中有 shiftAnalysisWeek)
  // 如果之前未定义，建议在 store 中补充此逻辑
  // store.shiftAnalysisWeek(offset);

  // 临时逻辑：手动修改 store 中的 refDate
  const [y, m, d] = analysisRefDate.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + (offset * 7));

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  store.analysisRefDate = `${year}-${month}-${day}`;
};

const openDetail = (date: string) => {
  store.temp.selectedHistoryDate = date;
  store.setModal('historyDetail', true);
}
</script>

<template>
  <div class="pb-20 bg-white dark:bg-slate-900 min-h-full transition-colors duration-300">
    <!-- 顶部 Tab 导航 -->
    <div class="sticky top-0 bg-white dark:bg-slate-900 z-20 pt-4 px-4 pb-2 transition-colors duration-300 shadow-sm">
      <h2 class="text-xl font-rpg text-slate-800 dark:text-slate-100 mb-4 flex items-center">
        <i class="fas fa-scroll text-purple-600 mr-2"></i> 冒险手札
      </h2>
      <van-tabs v-model:active="activeTab" type="card" color="#7c3aed" class="w-full" background="transparent">
        <van-tab title="元素共鸣" name="today"></van-tab>
        <van-tab title="冒险编年史" name="week"></van-tab>
      </van-tabs>
    </div>

    <!-- 视图 1: 元素共鸣 (Today) -->
    <div v-if="activeTab === 'today'" class="p-4 animate-fade-in">
      <!-- 魔法卡片容器 -->
      <div class="bg-slate-900 rounded-3xl p-6 border-4 border-double border-slate-700 shadow-2xl relative overflow-hidden magic-border">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>

        <h3 class="font-bold text-slate-200 w-full mb-6 flex items-center justify-center relative z-10 text-lg font-rpg">
          <i class="fas fa-atom mr-2 text-purple-400 animate-spin-slow"></i> 元素魔力池
        </h3>

        <!-- 三大元素进度条 -->
        <div class="space-y-6 relative z-10">
          <!-- 力量之火 (Protein) -->
          <div>
            <div class="flex justify-between text-xs font-bold text-red-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-fire mr-1"></i> 力量之火 (Pro)</span>
              <span>{{ macroPct.p }}%</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
              <div class="absolute inset-0 bg-red-900/30"></div>
              <div class="h-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-1000" :style="{ width: macroPct.p + '%' }"></div>
            </div>
          </div>

          <!-- 敏捷之雷 (Carb) -->
          <div>
            <div class="flex justify-between text-xs font-bold text-yellow-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-bolt mr-1"></i> 敏捷之雷 (Carb)</span>
              <span>{{ macroPct.c }}%</span>
            </div>
            <div class="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
              <div class="absolute inset-0 bg-yellow-900/30"></div>
              <div class="h-full bg-gradient-to-r from-yellow-500 to-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000" :style="{ width: macroPct.c + '%' }"></div>
            </div>
          </div>

          <!-- 坚韧之土 (Fat) -->
          <div>
            <div class="flex justify-between text-xs font-bold text-green-400 mb-1 uppercase tracking-widest">
              <span><i class="fas fa-shield-alt mr-1"></i> 坚韧之土 (Fat)</span>
              <span>{{ macroPct.f }}%</span>
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
            {{ store.todayMacros.cals }} <span class="text-sm text-slate-500">kcal</span>
          </div>
        </div>
      </div>

      <!-- 战利品列表 -->
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

    <!-- 视图 2: 冒险编年史 (Week - RPG Style) -->
    <div v-else class="p-4 animate-fade-in">
      <!-- 周切换导航 -->
      <div class="flex justify-between items-center mb-4">
        <button @click="shiftWeek(-1)" class="text-slate-400 hover:text-white px-2">
          <i class="fas fa-chevron-left"></i> 上一章
        </button>
        <span class="text-xs font-bold text-purple-500 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                    {{ weekRangeDateText }}
                </span>
        <button @click="shiftWeek(1)" :disabled="isCurrentWeek" class="text-slate-400 hover:text-white disabled:opacity-30 px-2">
          下一章 <i class="fas fa-chevron-right"></i>
        </button>
      </div>

      <!-- 周历列表 -->
      <div class="space-y-4">
        <div v-for="(day, idx) in weeklyStats" :key="idx" class="relative group" @click="!day.isFuture && openDetail(day.date)">
          <!-- 时间轴连接线 -->
          <div v-if="idx < weeklyStats.length - 1" class="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700 -z-10 h-16"></div>

          <div class="flex items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all"
               :class="[
                             day.isToday ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' : '',
                             day.isFuture ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95 hover:border-purple-300 dark:hover:border-purple-700'
                         ]">
            <!-- 状态图标 -->
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mr-4 shrink-0 shadow-inner"
                 :class="{
                                 'bg-slate-100 dark:bg-slate-700 text-slate-400': day.rpgStatus === 'UNKNOWN' || day.rpgStatus === 'SKIPPED',
                                 'bg-green-100 dark:bg-green-900/30 text-green-600': day.rpgStatus === 'VICTORY',
                                 'bg-red-100 dark:bg-red-900/30 text-red-500': day.rpgStatus === 'DEFEAT',
                                 'bg-blue-100 dark:bg-blue-900/30 text-blue-500': day.rpgStatus === 'ONGOING'
                             }">
              <i v-if="day.isFuture" class="fas fa-lock"></i>
              <i v-else-if="day.rpgStatus === 'VICTORY'" class="fas fa-trophy animate-pulse"></i>
              <i v-else-if="day.rpgStatus === 'DEFEAT'" class="fas fa-skull-crossbones"></i>
              <i v-else-if="day.rpgStatus === 'ONGOING'" class="fas fa-hourglass-half"></i>
              <i v-else class="fas fa-bed"></i>
            </div>

            <!-- 详情内容 -->
            <div class="flex-1">
              <div class="flex justify-between items-center mb-1">
                <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {{ day.label }} <span class="text-xs font-normal text-slate-400">周{{ day.weekday }}</span>
                  <span v-if="day.isToday" class="ml-2 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded">进行中</span>
                </div>
                <div class="text-xs font-bold font-mono" :class="day.val > store.dailyTarget ? 'text-red-500' : 'text-slate-500'">
                  {{ day.val }} <span class="text-[10px]">kcal</span>
                </div>
              </div>
              <!-- 热量条 -->
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div class="h-full rounded-full"
                     :style="{ width: Math.min((day.val / store.dailyTarget) * 100, 100) + '%' }"
                     :class="day.rpgStatus === 'DEFEAT' ? 'bg-red-500' : 'bg-green-500'">
                </div>
              </div>
              <div class="text-[10px] text-slate-400 mt-1 italic flex justify-between">
                <span>{{ day.isFuture ? '迷雾未散...' : getDayFlavorText(day.rpgStatus) }}</span>
                <span v-if="!day.isFuture" class="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">查看详情 <i class="fas fa-chevron-right text-[8px]"></i></span>
              </div>
            </div>
          </div>
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
.anim-spin-slow { animation: spin-slow 12s linear infinite; }
@keyframes spin-slow { 100% { transform: rotate(360deg); } }
</style>
