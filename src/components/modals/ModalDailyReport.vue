<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '@/stores/useSystemStore';
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';

const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.dailyReport,
  set: (val) => systemStore.setModal('dailyReport', val)
});

const report = computed(() => systemStore.temp.reportData);
const isPure = computed(() => systemStore.isPureMode);

const close = () => {
  show.value = false;
  systemStore.temp.reportData = null;
};

// 状态文案适配
const statusText = computed(() => {
  if (!report.value) return '';
  if (isPure.value) {
    // Pure 模式文案
    switch (report.value.status) {
      case 'VICTORY': return '目标达成';
      case 'DEFEAT': return '热量超标';
      default: return '收支平衡';
    }
  } else {
    // RPG 模式文案
    switch (report.value.status) {
      case 'VICTORY': return '大获全胜';
      case 'DEFEAT': return '防线失守';
      default: return '战局平稳';
    }
  }
});

// 状态颜色适配 (使用健康色系)
const statusColor = computed(() => {
  if (!report.value) return '';
  switch (report.value.status) {
    case 'VICTORY': return 'text-emerald-600 dark:text-emerald-400';
    case 'DEFEAT': return 'text-rose-600 dark:text-rose-400';
    default: return 'text-zinc-500 dark:text-zinc-400';
  }
});

// 状态图标适配
const statusIcon = computed(() => {
  if (!report.value) return '';
  if (isPure.value) {
    switch (report.value.status) {
      case 'VICTORY': return 'fas fa-check-circle text-emerald-500';
      case 'DEFEAT': return 'fas fa-exclamation-circle text-rose-500';
      default: return 'fas fa-minus-circle text-zinc-400';
    }
  } else {
    switch (report.value.status) {
      case 'VICTORY': return 'fas fa-trophy text-amber-500';
      case 'DEFEAT': return 'fas fa-skull text-zinc-500';
      default: return 'fas fa-flag text-zinc-400';
    }
  }
});

// 进度条颜色
const progressColor = computed(() => {
  if (!report.value) return 'bg-zinc-200';
  const ratio = (report.value.totalCalories || 0) / (report.value.targetBMR || 1);
  if (ratio > 1.1) return 'bg-rose-500'; // 超标
  if (ratio > 0.9) return 'bg-emerald-500'; // 达标
  return 'bg-amber-500'; // 不足
});

// [物资清单] 图标显示逻辑
interface IconDisplayItem {
  icon?: string;
  name?: string;
  tags?: string[];
}

const getIconDisplay = (item: IconDisplayItem | null) => {
  if (!item) return { isSymbol: false, isImage: false, content: '' };

  let iconRaw = item.icon || '';
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw };
  }

  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, isImage: false, content: extractedId };
      }
    }
  }

  const effectiveTags = (item.tags && item.tags.length > 0) ? item.tags : inferTags(item.name || '');
  const assigned = assignIcon(item.name || '', effectiveTags);
  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned };
  }

  return { isSymbol: false, isImage: false, content: iconRaw };
};
</script>

<template>
  <van-overlay :show="show" @click="close" class-name="flex items-center justify-center p-6 backdrop-blur-sm z-[100]">
    <!-- 卡片容器: 使用 Zinc 色系，去除深蓝/紫色背景 -->
    <div
      class="rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-pop-in transition-colors duration-300"
      :class="isPure
        ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
        : 'bg-zinc-50 dark:bg-zinc-900 border-4 border-white dark:border-zinc-800'
      "
      @click.stop
    >

      <!-- Pure Mode 顶部 -->
      <div v-if="isPure" class="p-6 pb-2 text-center">
        <div class="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">{{ report?.date }}</div>
        <h2 class="text-2xl font-black text-zinc-900 dark:text-white">今日总结</h2>
      </div>

      <!-- RPG Mode 顶部装饰 -->
      <div v-else class="bg-zinc-100 dark:bg-zinc-800/50 p-4 border-b border-zinc-200 dark:border-zinc-700/50 flex justify-between items-center relative z-10">
        <div class="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center">
          <i class="fas fa-scroll text-amber-500 mr-2"></i> 战地报告
        </div>
        <div class="text-xs text-zinc-400 font-mono font-bold">{{ report?.date }}</div>
      </div>

      <!-- RPG 纹理 (仅在 RPG 模式且深色模式下显示 subtle 纹理) -->
      <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none hidden dark:block"></div>

      <!-- 主体内容 -->
      <div class="p-6 text-center relative z-10">

        <!-- 结果状态 -->
        <div class="mb-8">
          <div class="text-6xl mb-4 transition-transform hover:scale-110 duration-300 inline-block">
            <i :class="statusIcon"></i>
          </div>
          <h2 class="text-3xl font-black tracking-tight" :class="statusColor">
            {{ statusText }}
          </h2>
          <!-- RPG 模式下显示 VS 怪物 -->
          <div v-if="!isPure" class="text-xs font-bold text-zinc-400 mt-2 uppercase tracking-wide">
            VS. {{ report?.monsterName || '未知威胁' }}
          </div>
        </div>

        <!-- 数据摘要 (通用的卡片样式) -->
        <div class="rounded-2xl p-5 mb-6 border transition-colors"
             :class="isPure
             ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50'
             : 'bg-white dark:bg-zinc-800 shadow-sm border-zinc-200 dark:border-zinc-700'
           ">
          <!-- 摄入量 -->
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold text-zinc-500">今日总摄入</span>
            <span class="font-mono font-black text-lg text-zinc-800 dark:text-white">{{ report?.totalCalories }} <span class="text-xs font-normal text-zinc-400">kcal</span></span>
          </div>
          <!-- 目标量 -->
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs font-bold text-zinc-400">{{ isPure ? '目标预算' : '防御阈值 (BMR)' }}</span>
            <span class="font-mono font-bold text-zinc-400">{{ report?.targetBMR }}</span>
          </div>

          <!-- 进度条 -->
          <div class="h-2.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div class="h-full transition-all duration-1000"
                 :class="progressColor"
                 :style="{ width: Math.min(((report?.totalCalories || 0) / (report?.targetBMR || 1)) * 100, 100) + '%' }"></div>
          </div>
        </div>

        <!-- 奖励结算 (仅 RPG 模式) -->
        <div v-if="!isPure" class="space-y-3">
          <div class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Battle Rewards</div>

          <div class="flex gap-3">
            <div class="flex-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-2.5 flex flex-col items-center">
              <i class="fas fa-coins text-amber-500 text-xl mb-1"></i>
              <div class="text-xs text-amber-700 dark:text-amber-400 font-bold">+{{ report?.goldGained }} 金币</div>
            </div>
            <div class="flex-1 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/20 rounded-xl p-2.5 flex flex-col items-center">
              <i class="fas fa-star text-sky-500 text-xl mb-1"></i>
              <div class="text-xs text-sky-700 dark:text-sky-400 font-bold">+{{ report?.expGained }} 经验</div>
            </div>
          </div>

          <div v-if="(report?.loginStreak || 0) > 1" class="text-[10px] text-emerald-500 mt-2 font-bold flex items-center justify-center">
            <i class="fas fa-fire mr-1"></i> 连续登录 {{ report?.loginStreak }} 天加成生效中
          </div>
        </div>

        <!-- [物资清单] 显示昨日获取的物资 (Pure模式下也可显示，作为饮食记录回顾) -->
        <div v-if="report?.items && report.items.length > 0" class="mt-6">
          <div class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-3 flex items-center justify-center">
            <span class="w-8 h-px bg-zinc-200 dark:bg-zinc-700 mr-2"></span>
            <span>{{ isPure ? '今日饮食' : '物资消耗' }}</span>
            <span class="w-8 h-px bg-zinc-200 dark:bg-zinc-700 ml-2"></span>
          </div>

          <div class="grid grid-cols-4 gap-2">
            <div v-for="(item, i) in report.items" :key="i"
                 class="flex flex-col items-center p-2 rounded-lg transition-colors border"
                 :class="isPure ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800' : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm'"
            >
              <!-- 图标显示 -->
              <div class="text-xl mb-1 flex items-center justify-center h-6 text-zinc-600 dark:text-zinc-300">
                <template v-if="getIconDisplay(item).isImage">
                  <img :src="getIconDisplay(item).content" class="w-6 h-6 object-contain" />
                </template>
                <template v-else-if="getIconDisplay(item).isSymbol">
                  <svg class="icon text-xl" aria-hidden="true">
                    <use :xlink:href="'#' + getIconDisplay(item).content"></use>
                  </svg>
                </template>
                <template v-else>
                  <span class="text-xl">{{ getIconDisplay(item).content }}</span>
                </template>
              </div>

              <!-- 名称 -->
              <span class="text-[9px] text-zinc-600 dark:text-zinc-400 truncate w-full text-center font-bold leading-tight mt-1">
                {{ item.name }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- 底部按钮 -->
      <div class="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 relative z-10">
        <button @click="close"
                class="w-full py-3.5 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                :class="isPure
            ? 'bg-zinc-900 dark:bg-white dark:text-zinc-900'
            : 'bg-gradient-to-r from-amber-500 to-orange-600'"
        >
          <span v-if="isPure">完成</span>
          <span v-else><i class="fas fa-check mr-1"></i> 收入囊中</span>
        </button>
      </div>

    </div>
  </van-overlay>
</template>

<style scoped>
/* Iconfont Symbol 通用样式 */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}

.animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes pop-in {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
