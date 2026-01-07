<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { TAG_DEFS } from '@/constants/gameData';
import { showConfirmDialog, showToast } from 'vant';
// [Import] 引入数据处理工具
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();

// 获取当前选中的日志
const log = computed(() => systemStore.temp.selectedLog);

// 异常处理：如果没有日志（如刷新），回退
if (!log.value) {
  router.replace('/');
}

// 营养映射
const macros = computed(() => {
  if (!log.value) return { p: 0, c: 0, f: 0, pPct: 0, cPct: 0, fPct: 0 };
  const p = log.value.p || 0;
  const c = log.value.c || 0;
  const f = log.value.f || 0;
  const total = p + c + f;

  if (total === 0) return { p: 0, c: 0, f: 0, pPct: 0, cPct: 0, fPct: 0 };

  return {
    p, c, f,
    pPct: Math.round((p / total) * 100),
    cPct: Math.round((c / total) * 100),
    fPct: Math.round((f / total) * 100)
  };
});

// [New] 每份/每100克 营养数据计算
const perServingMacros = computed(() => {
  if (!log.value) return null;

  const totalGrams = log.value.grams || 100; // 防止除以0
  const ratio = 100 / totalGrams; // 计算100g的倍率

  return {
    calories: Math.round((log.value.calories || 0) * ratio),
    p: (log.value.p * ratio).toFixed(1),
    c: (log.value.c * ratio).toFixed(1),
    f: (log.value.f * ratio).toFixed(1)
  };
});

// CSS 圆环图样式 (Conic Gradient)
const pieStyle = computed(() => {
  const { pPct, cPct } = macros.value;
  return {
    background: `conic-gradient(
      #10b981 0% ${cPct}%,
      #3b82f6 ${cPct}% ${cPct + pPct}%,
      #f59e0b ${cPct + pPct}% 100%
    )`
  };
});

// 运动换算 (基于总热量)
const exercise = computed(() => {
  const cal = log.value?.calories || 0;
  return {
    walk: Math.ceil(cal / 4),
    run: Math.ceil(cal / 10),
    swim: Math.ceil(cal / 8)
  };
});

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐', SNACK: '零食', HYDRATION: '补水'
};

// ==========================================
// [核心逻辑] 智能图标处理
// ==========================================
const getIconDisplay = (item: any) => {
  if (!item) return { isSymbol: false, isImage: false, content: '' };

  let iconRaw = (item.icon || '').trim();

  // 1. 脏数据清洗
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 2. 图片 URL
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw };
  }

  // 3. 尝试提取 icon-xxx 并验证
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, isImage: false, content: extractedId };
      }
    }
  }

  // 4. 兜底逻辑 (尝试重新分配)
  const effectiveTags = (item.tags && item.tags.length > 0)
    ? item.tags
    : inferTags(item.name || '');

  let assigned = assignIcon(item.name || '', effectiveTags);

  // [强制兜底] 绝不返回空，如果失败，强制给一个默认图标
  if (!assigned || assigned === 'undefined' || assigned === 'null') {
    assigned = 'icon-food';
  }

  // 只要有 assigned (哪怕是 fallback 的)，就当作 Symbol 显示
  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned };
  }

  // 5. 真的没办法了
  return { isSymbol: false, isImage: false, content: iconRaw || '❓' };
};

const handleDelete = () => {
  showConfirmDialog({
    title: '删除记录',
    message: '确定要删除这条记录吗？',
    confirmButtonText: '删除',
    confirmButtonColor: '#ef4444'
  }).then(() => {
    if (log.value) {
      store.deleteLog(log.value);
      showToast('已删除');
      router.back();
    }
  }).catch(() => {});
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between">
      <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">食物详情</span>
      <div class="w-8"></div>
    </div>

    <div v-if="log" class="flex-1 overflow-y-auto p-6 space-y-8">

      <!-- 1. 核心卡片 -->
      <div class="flex flex-col items-center">
        <!-- 智能图标显示区域 -->
        <div class="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm mb-4 overflow-hidden relative">
          <!-- Image 模式 -->
          <template v-if="getIconDisplay(log).isImage">
            <img :src="getIconDisplay(log).content" class="w-full h-full object-cover" alt="icon" />
          </template>

          <!-- Symbol 模式 (SVG) -->
          <template v-else-if="getIconDisplay(log).isSymbol">
            <svg class="icon text-6xl text-slate-800 dark:text-white" aria-hidden="true">
              <use :xlink:href="'#' + getIconDisplay(log).content"></use>
            </svg>
          </template>

          <!-- 文字回退模式 -->
          <template v-else>
            <span class="text-4xl text-slate-400">{{ getIconDisplay(log).content }}</span>
          </template>
        </div>

        <h1 class="text-2xl font-black text-slate-800 dark:text-white mb-2 text-center leading-tight">
          {{ log.name }}
        </h1>
        <div class="flex gap-2 justify-center">
          <span class="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
            {{ MEAL_LABELS[log.mealType] || log.mealType }}
          </span>
          <span v-for="tag in log.tags" :key="tag"
                class="text-xs px-2 py-1 rounded font-bold border"
                :class="{
                  'bg-red-50 text-red-600 border-red-100': tag === '高糖',
                  'bg-orange-50 text-orange-600 border-orange-100': tag === '高油',
                  'bg-blue-50 text-blue-600 border-blue-100': tag === '高蛋白',
                  'bg-green-50 text-green-600 border-green-100': tag === '高碳',
                  'bg-slate-50 text-slate-500 border-slate-100': !['高糖','高油','高蛋白','高碳'].includes(tag)
                }">
            {{ TAG_DEFS[tag]?.label || tag }}
          </span>
        </div>
      </div>

      <!-- 2. 营养大盘 (圆环图) -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-700">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-sm font-bold text-slate-500">本餐摄入</h3>
          <div class="text-right">
            <span class="text-2xl font-black text-slate-800 dark:text-white">{{ log.calories }}</span>
            <span class="text-xs text-slate-400 font-bold ml-1">kcal</span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="relative w-32 h-32 rounded-full flex items-center justify-center shrink-0" :style="pieStyle">
            <!-- 遮罩层形成圆环 -->
            <div class="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center relative z-10">
              <span class="text-xs text-slate-400 font-bold uppercase">Total</span>
              <span class="text-xl font-black text-slate-800 dark:text-white">{{ log.grams }}g</span>
            </div>
          </div>

          <div class="flex-1 pl-8 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-green-500"></div>
                <span class="text-xs text-slate-500">碳水 ({{ macros.cPct }}%)</span>
              </div>
              <div class="text-sm font-bold dark:text-slate-200">{{ macros.c }}g</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                <span class="text-xs text-slate-500">蛋白质 ({{ macros.pPct }}%)</span>
              </div>
              <div class="text-sm font-bold dark:text-slate-200">{{ macros.p }}g</div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                <span class="text-xs text-slate-500">脂肪 ({{ macros.fPct }}%)</span>
              </div>
              <div class="text-sm font-bold dark:text-slate-200">{{ macros.f }}g</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. [New] 每份营养量 (100g 基准) -->
      <div v-if="perServingMacros" class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-600">
          <h3 class="text-xs font-bold text-slate-500 flex items-center">
            <i class="fas fa-balance-scale mr-1.5"></i> 每 100 克营养参考
          </h3>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ perServingMacros.calories }} kcal</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <div class="text-[10px] text-slate-400 mb-1">碳水化合物</div>
            <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">{{ perServingMacros.c }}g</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 mb-1">蛋白质</div>
            <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">{{ perServingMacros.p }}g</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 mb-1">脂肪</div>
            <div class="font-bold text-slate-700 dark:text-slate-200 text-sm">{{ perServingMacros.f }}g</div>
          </div>
        </div>
      </div>

      <!-- 4. 运动消耗参考 -->
      <div>
        <h3 class="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center">
          <i class="fas fa-fire-alt text-red-500 mr-2"></i> 消耗本次摄入需运动
        </h3>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
            <i class="fas fa-walking text-2xl text-blue-400 mb-2"></i>
            <div class="text-xs text-slate-400 mb-1">慢走</div>
            <div class="font-black text-slate-700 dark:text-slate-200">{{ exercise.walk }}<span class="text-[10px] font-normal ml-0.5">分钟</span></div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
            <i class="fas fa-running text-2xl text-green-500 mb-2"></i>
            <div class="text-xs text-slate-400 mb-1">跑步</div>
            <div class="font-black text-slate-700 dark:text-slate-200">{{ exercise.run }}<span class="text-[10px] font-normal ml-0.5">分钟</span></div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
            <i class="fas fa-swimmer text-2xl text-blue-500 mb-2"></i>
            <div class="text-xs text-slate-400 mb-1">游泳</div>
            <div class="font-black text-slate-700 dark:text-slate-200">{{ exercise.swim }}<span class="text-[10px] font-normal ml-0.5">分钟</span></div>
          </div>
        </div>
      </div>

      <!-- 删除按钮 -->
      <button @click="handleDelete" class="w-full py-4 text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 active:scale-95 transition">
        删除此记录
      </button>

    </div>
  </div>
</template>

<style scoped>
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }

/* 支持 SVG 图标的样式 */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
