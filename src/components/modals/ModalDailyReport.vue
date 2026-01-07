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

const close = () => {
  show.value = false;
  // 清理数据，防止重复显示
  systemStore.temp.reportData = null;
};

const statusText = computed(() => {
  if (!report.value) return '';
  switch (report.value.status) {
    case 'VICTORY': return '大获全胜';
    case 'DEFEAT': return '防线失守';
    default: return '平局';
  }
});

const statusColor = computed(() => {
  if (!report.value) return '';
  switch (report.value.status) {
    case 'VICTORY': return 'text-green-500';
    case 'DEFEAT': return 'text-red-500';
    default: return 'text-slate-500';
  }
});

const statusIcon = computed(() => {
  if (!report.value) return '';
  switch (report.value.status) {
    case 'VICTORY': return '🏆';
    case 'DEFEAT': return '💀';
    default: return '🏳️';
  }
});

// [物资清单] 图标显示逻辑（与HomeView/AnalysisView保持一致）
const getIconDisplay = (item: any) => {
  if (!item) return { isSymbol: false, isImage: false, content: '' };

  let iconRaw = item.icon || '';

  // 1. 脏数据清洗
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 2. 图片检查
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    return { isSymbol: false, isImage: true, content: iconRaw };
  }

  // 3. Symbol ID 检查
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, isImage: false, content: extractedId };
      }
    }
  }

  // 4. Hot-fix (自动修复)
  const effectiveTags = (item.tags && item.tags.length > 0)
    ? item.tags
    : inferTags(item.name || '');

  const assigned = assignIcon(item.name || '', effectiveTags);
  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned };
  }

  // 5. 兜底
  return { isSymbol: false, isImage: false, content: iconRaw };
};
</script>

<template>
  <van-overlay :show="show" @click="close" class-name="flex items-center justify-center p-6 backdrop-blur-md z-[100]">
    <div class="bg-slate-900 border-4 border-slate-700 rounded-3xl p-0 w-full max-w-sm shadow-2xl relative overflow-hidden animate-pop-in" @click.stop>

      <!-- 顶部装饰 -->
      <div class="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center relative z-10">
        <div class="font-rpg text-xl text-yellow-500">📜 战地报告</div>
        <div class="text-xs text-slate-400 font-mono">{{ report?.date }}</div>
      </div>

      <!-- 背景纹理 -->
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none"></div>

      <!-- 主体内容 -->
      <div class="p-6 text-center relative z-10">

        <!-- 结果印章 -->
        <div class="mb-6 transform rotate-[-5deg]">
          <div class="text-6xl mb-2 filter drop-shadow-lg">{{ statusIcon }}</div>
          <h2 class="text-4xl font-black italic uppercase tracking-wider" :class="statusColor">
            {{ statusText }}
          </h2>
          <div class="text-xs text-slate-400 mt-1">
            VS. {{ report?.monsterName || '未知怪物' }}
          </div>
        </div>

        <!-- 数据摘要 -->
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-slate-400 text-xs">总伤害 (热量)</span>
            <span class="font-mono font-bold text-white">{{ report?.totalCalories }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400 text-xs">目标防御 (BMR)</span>
            <span class="font-mono font-bold text-slate-300">{{ report?.targetBMR }}</span>
          </div>
          <div class="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                 :style="{ width: Math.min(((report?.totalCalories || 0) / (report?.targetBMR || 1)) * 100, 100) + '%' }"></div>
          </div>
        </div>

        <!-- 奖励结算 -->
        <div class="space-y-3">
          <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Rewards</div>

          <div class="flex gap-3">
            <div class="flex-1 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2 flex flex-col items-center">
              <div class="text-xl mb-1">🪙</div>
              <div class="text-xs text-yellow-500 font-bold">+{{ report?.goldGained }} 金币</div>
            </div>
            <div class="flex-1 bg-purple-900/20 border border-purple-700/30 rounded-lg p-2 flex flex-col items-center">
              <div class="text-xl mb-1">✨</div>
              <div class="text-xs text-purple-400 font-bold">+{{ report?.expGained }} 经验</div>
            </div>
          </div>

          <div v-if="(report?.loginStreak || 0) > 1" class="text-[10px] text-green-400 mt-2">
            🔥 连续登录 {{ report?.loginStreak }} 天加成生效中
          </div>
        </div>

        <!-- [物资清单] 显示昨日获取的物资 -->
        <div v-if="report?.items && report.items.length > 0" class="mt-6">
          <div class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center">
            <span>📦</span>
            <span class="ml-2">物资清单</span>
          </div>
          
          <div class="grid grid-cols-4 gap-2">
            <div v-for="(item, i) in report.items" :key="i"
                 class="flex flex-col items-center p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
              <!-- 图标显示 -->
              <div class="text-2xl mb-1 flex items-center justify-center h-8">
                <template v-if="getIconDisplay(item).isImage">
                  <img :src="getIconDisplay(item).content" class="w-8 h-8 object-contain" />
                </template>
                <template v-else-if="getIconDisplay(item).isSymbol">
                  <svg class="icon text-2xl" aria-hidden="true">
                    <use :xlink:href="'#' + getIconDisplay(item).content"></use>
                  </svg>
                </template>
                <template v-else>
                  <span class="text-2xl">{{ getIconDisplay(item).content }}</span>
                </template>
              </div>
              
              <!-- 名称 -->
              <span class="text-[9px] text-slate-300 truncate w-full text-center font-bold leading-tight">
                {{ item.name }}
              </span>
              
              <!-- 热量 -->
              <span class="text-[8px] text-slate-500 font-mono mt-0.5">
                {{ item.calories }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- 底部按钮 -->
      <div class="p-4 bg-slate-800/50 border-t border-slate-700 relative z-10">
        <button @click="close" class="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg active:scale-95 transition-transform">
          收入囊中
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
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
