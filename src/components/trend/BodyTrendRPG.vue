<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBodyTrend } from '@/composables/useBodyTrend';
import { useSystemStore } from '@/stores/useSystemStore';

const systemStore = useSystemStore();
const { rpgTrendData } = useBodyTrend();

const selectedPoint = ref<number | null>(null);

// 图表数据计算
const chartData = computed(() => {
  const data = rpgTrendData.value;
  if (data.length === 0) return null;
  
  const recent = data.slice(-14); // 最近14条记录
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
    return { 
      x, 
      y, 
      val: r.weight, 
      date: dateShort,
      milestone: r.milestones && r.milestones.length > 0 ? r.milestones[0] : null,
      achievements: r.achievements,
      data: r
    };
  });
  
  const pathD = points.length > 1
    ? `M ${points[0]?.x || 0} ${points[0]?.y || 0} ` + points.slice(1).map(p => `L ${p?.x || 0} ${p?.y || 0}`).join(' ')
    : points.length === 1 ? `M ${padding} ${points[0]?.y || 0} L ${width-padding} ${points[0]?.y || 0}` : '';
  
  const areaPathD = points.length > 1
    ? `${pathD} L ${points[points.length-1]?.x || 0} ${height} L ${points[0]?.x || 0} ${height} Z`
    : '';
  
  return { points, pathD, areaPathD, minW, maxW, width, height };
});

// 最新属性变化
const latestAttributeChanges = computed(() => {
  if (rpgTrendData.value.length === 0) return { str: 0, agi: 0, vit: 0 };
  const latest = rpgTrendData.value[rpgTrendData.value.length - 1];
  return latest?.attributeChanges || { str: 0, agi: 0, vit: 0 };
});

// 总战力变化
const totalCombatPowerChange = computed(() => {
  return rpgTrendData.value.reduce((sum, r) => sum + (r.combatPowerChange || 0), 0);
});

// 近期成就
const recentAchievements = computed(() => {
  const achievements: { id: string; title: string; icon: string; date: string }[] = [];
  rpgTrendData.value.slice(-7).forEach(r => {
    if (r.achievements && r.achievements.length > 0) {
      r.achievements.forEach(ach => {
        achievements.push({
          id: `${r.date}-${ach}`,
          title: ach,
          icon: '🏆',
          date: r.date
        });
      });
    }
  });
  return achievements.slice(-5); // 最多显示5个
});

// 当前故事节点
const currentStoryNode = computed(() => {
  const latest = rpgTrendData.value[rpgTrendData.value.length - 1];
  if (!latest?.storyNode) return null;
  return {
    text: latest.storyNode,
    date: latest.date
  };
});

// 点击数据点
const handlePointClick = (point: { data: import('@/types').RPGTrendData }, index: number) => {
  selectedPoint.value = index;
  
  // 设置临时数据并打开详情弹窗
  systemStore.temp.selectedBodyTrendPoint = point.data;
  systemStore.setModal('bodyTrendDetail', true);
};
</script>

<template>
  <div class="rpg-trend-container">
    <!-- 游戏化标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-slate-200 flex items-center">
        <span class="text-2xl mr-2">⚔️</span>
        英雄塑形编年史
      </h3>
      <div class="text-xs bg-purple-900/30 px-3 py-1 rounded-full border border-purple-500/30">
        <span class="text-slate-400">共 </span><span class="font-bold text-yellow-400">{{ rpgTrendData.length }}</span><span class="text-slate-400"> 条记录</span>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="!chartData" class="text-center py-12">
      <div class="text-6xl mb-4 opacity-50 grayscale">⚖️</div>
      <div class="text-sm text-slate-400">暂无体态记录</div>
      <div class="text-xs text-slate-500 mt-1">前往「英雄档案」更新体重数据</div>
    </div>
    
    <!-- SVG图表 - 游戏化风格 -->
    <div v-else class="relative bg-slate-900 rounded-2xl p-6 border-2 border-purple-500/30 shadow-2xl overflow-hidden">
      <!-- 背景装饰 -->
      <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      <div class="absolute top-0 left-0 right-0 h-1 bg-yellow-500 opacity-50"></div>
      
      <svg :viewBox="`0 0 ${chartData.width} ${chartData.height}`" class="w-full h-full relative z-10">
        <!-- 滤镜定义 - 发光效果 -->
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- 背景网格线 -->
        <line x1="0" y1="0" x2="300" y2="0" stroke="#475569" stroke-width="1" opacity="0.3"/>
        <line x1="0" y1="75" x2="300" y2="75" stroke="#475569" stroke-width="1" stroke-dasharray="4 4" opacity="0.3"/>
        <line x1="0" y1="150" x2="300" y2="150" stroke="#475569" stroke-width="1" opacity="0.3"/>
        
        <!-- 区域填充 - 纯色 -->
        <path :d="chartData.areaPathD" fill="#7c3aed" fill-opacity="0.15"/>
        
        <!-- 主曲线 - 金色 -->
        <path :d="chartData.pathD" 
              fill="none" 
              stroke="#fbbf24" 
              stroke-width="3" 
              stroke-linecap="round" 
              filter="url(#glow)"/>
        
        <!-- 数据点 + 里程碑标记 -->
        <g v-for="(point, i) in chartData.points" :key="i">
          <!-- 普通数据点 -->
          <circle :cx="point.x" :cy="point.y" r="4" 
                  fill="#7c3aed" 
                  stroke="#fbbf24" 
                  stroke-width="2"
                  class="cursor-pointer hover:r-6 transition-all"
                  @click="handlePointClick(point, i)"/>
          
          <!-- 日期标签 - 显示在数据点下方 -->
          <text :x="point.x" :y="145" 
                text-anchor="middle"
                class="text-[8px] fill-slate-400 pointer-events-none">
            {{ point.date }}
          </text>
          
          <!-- 里程碑特效 -->
          <g v-if="point.milestone">
            <circle :cx="point.x" :cy="point.y" r="12" 
                    fill="none" 
                    stroke="#fbbf24" 
                    stroke-width="2" 
                    opacity="0.5"
                    class="animate-ping"/>
            <text :x="point.x" :y="point.y - 20" 
                  text-anchor="middle"
                  class="text-xs fill-yellow-400 font-bold pointer-events-none">
              {{ point.milestone.icon }}
            </text>
          </g>
          
          <!-- 成就徽章 -->
          <g v-if="point.achievements && point.achievements.length > 0">
            <circle :cx="point.x" :cy="point.y" r="8" 
                    fill="#a855f7" 
                    stroke="#fbbf24" 
                    stroke-width="2"/>
            <text :x="point.x" :y="point.y + 4" 
                  text-anchor="middle"
                  class="text-[10px] fill-white pointer-events-none">
              🏆
            </text>
          </g>
          
          <!-- 恸停提示 -->
          <g v-if="selectedPoint === i">
            <circle :cx="point.x" :cy="point.y" r="6" 
                    fill="#fff" 
                    stroke="#fbbf24" 
                    stroke-width="3"/>
            <g>
              <rect :x="point.x - 24" :y="point.y - 32" 
                    width="48" height="20" rx="6" 
                    fill="#1e293b" 
                    opacity="0.95"/>
              <path :d="`M ${point.x} ${point.y - 12} L ${point.x - 5} ${point.y - 3} L ${point.x + 5} ${point.y - 3} Z`" 
                    fill="#1e293b" 
                    opacity="0.95"/>
              <text :x="point.x" :y="point.y - 18" 
                    text-anchor="middle"
                    font-size="12" 
                    fill="#ffffff" 
                    font-weight="bold">
                {{ point.val.toFixed(1) }}kg
              </text>
            </g>
          </g>
        </g>
      </svg>
      
      <!-- 图例 -->
      <div class="flex justify-between text-xs text-slate-400 mt-4 relative z-10">
        <span>Min: {{ chartData.minW.toFixed(1) }} kg</span>
        <span>Max: {{ chartData.maxW.toFixed(1) }} kg</span>
      </div>
    </div>
    
    <!-- 属性变化展示 -->
    <div v-if="chartData" class="grid grid-cols-3 gap-3 mt-4">
      <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center">
        <div class="text-xs text-red-400 mb-1">💪 力量</div>
        <div class="text-2xl font-bold text-red-300">
          {{ latestAttributeChanges.str > 0 ? '+' : '' }}{{ latestAttributeChanges.str }}
        </div>
        <div class="text-[10px] text-red-400/60 mt-1">STR</div>
      </div>
      <div class="bg-green-900/20 border border-green-500/30 rounded-xl p-3 text-center">
        <div class="text-xs text-green-400 mb-1">⚡ 敏捷</div>
        <div class="text-2xl font-bold text-green-300">
          {{ latestAttributeChanges.agi > 0 ? '+' : '' }}{{ latestAttributeChanges.agi }}
        </div>
        <div class="text-[10px] text-green-400/60 mt-1">AGI</div>
      </div>
      <div class="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 text-center">
        <div class="text-xs text-blue-400 mb-1">🛡️ 体质</div>
        <div class="text-2xl font-bold text-blue-300">
          {{ latestAttributeChanges.vit > 0 ? '+' : '' }}{{ latestAttributeChanges.vit }}
        </div>
        <div class="text-[10px] text-blue-400/60 mt-1">VIT</div>
      </div>
    </div>
    
    <!-- 成就解锁列表 -->
    <div v-if="recentAchievements.length > 0" class="mt-4 bg-purple-900/20 rounded-xl p-4 border border-purple-500/30">
      <h4 class="text-xs font-bold text-purple-300 mb-2 uppercase tracking-wider">🏆 近期解锁成就</h4>
      <div class="space-y-2">
        <div v-for="ach in recentAchievements" :key="ach.id" 
             class="flex items-center gap-2 text-xs">
          <span class="text-lg">{{ ach.icon }}</span>
          <span class="text-purple-200 flex-1">{{ ach.title }}</span>
          <span class="text-purple-400/60 text-[10px]">{{ ach.date.slice(5) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 故事线提示 -->
    <div v-if="currentStoryNode" class="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-600">
      <div class="flex items-start gap-3">
        <span class="text-3xl">📜</span>
        <div class="flex-1">
          <div class="text-xs text-slate-400 mb-1">冒险日志</div>
          <div class="text-sm text-slate-200">{{ currentStoryNode.text }}</div>
          <div class="text-[10px] text-slate-500 mt-2">{{ currentStoryNode.date }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
