<script setup lang="ts">
import { computed, ref } from 'vue';
import { useBodyTrend } from '@/composables/useBodyTrend';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';

const store = useGameStore();
const systemStore = useSystemStore();
const { pureTrendData, avgWeight } = useBodyTrend();

const selectedPoint = ref<number | null>(null);

// 图表数据计算
const chartData = computed(() => {
  const data = pureTrendData.value;
  if (data.length === 0) return null;
  
  // 显示所有记录，不限制数量
  const recent = data;
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
    
    // 检测异常点（变化率过快）
    const isAnomaly = r.changeRate && Math.abs(r.changeRate) > 0.5;
    
    return { 
      x, 
      y, 
      val: r.weight, 
      date: dateShort,
      isAnomaly,
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

// 当前BMI
const currentBMI = computed(() => {
  if (pureTrendData.value.length === 0) return 0;
  const latest = pureTrendData.value[pureTrendData.value.length - 1];
  return latest?.bmi || 0;
});

// BMI状态
const bmiStatus = computed(() => {
  const bmi = currentBMI.value;
  if (bmi < 18.5) return '偏轻';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '偏重';
  return '肥胖';
});

const bmiColorClass = computed(() => {
  const bmi = currentBMI.value;
  if (bmi < 18.5) return 'text-blue-500';
  if (bmi < 24) return 'text-green-500';
  if (bmi < 28) return 'text-orange-500';
  return 'text-red-500';
});

// 周变化率
const weeklyChangeRate = computed(() => {
  if (pureTrendData.value.length === 0) return 0;
  const latest = pureTrendData.value[pureTrendData.value.length - 1];
  return (latest?.changeRate || 0) * 7; // 转换为每周变化
});

const changeRateColorClass = computed(() => {
  const rate = weeklyChangeRate.value;
  if (Math.abs(rate) < 0.5) return 'text-green-500';
  if (Math.abs(rate) < 1) return 'text-orange-500';
  return 'text-red-500';
});

const changeRateTrend = computed(() => {
  const rate = weeklyChangeRate.value;
  if (Math.abs(rate) < 0.3) return '稳定';
  if (rate > 0) return '上升';
  return '下降';
});

// 健康评分
const healthScore = computed(() => {
  if (pureTrendData.value.length === 0) return 0;
  const latest = pureTrendData.value[pureTrendData.value.length - 1];
  return latest?.healthScore || 0;
});

// 目标差距（使用理想体重 BMI 21.5）
const targetDiff = computed(() => {
  const currentWeight = store.user.weight;
  const heightM = store.user.height / 100;
  const idealWeight = 21.5 * heightM * heightM; // BMI 21.5 为理想值
  return currentWeight - idealWeight;
});

// 目标体重（理想BMI 21.5）
const targetWeight = computed(() => {
  const heightM = store.user.height / 100;
  return 21.5 * heightM * heightM;
});

// 目标体重对应的Y坐标
const targetWeightY = computed(() => {
  if (!chartData.value) return 0;
  const { minW, maxW, height } = chartData.value;
  const range = maxW - minW || 1;
  const padding = 20;
  return height - padding - ((targetWeight.value - minW) / range) * (height - 2 * padding);
});

// 数据洞察
const insights = computed(() => {
  if (pureTrendData.value.length === 0) return [];
  const latest = pureTrendData.value[pureTrendData.value.length - 1];
  return latest?.insights || [];
});

// 专业建议
const professionalAdvice = computed(() => {
  const bmi = currentBMI.value;
  const rate = weeklyChangeRate.value;
  
  let primary = '';
  let secondary = '';
  
  if (bmi < 18.5) {
    primary = '您的BMI偏低，建议适当增重。增加优质蛋白质和碳水化合物摄入。';
    secondary = '可以尝试少食多餐，配合力量训练增加肌肉量。';
  } else if (bmi < 24) {
    if (Math.abs(rate) < 0.5) {
      primary = '您的体重保持良好，继续保持当前的生活习惯。';
      secondary = '定期运动和均衡饮食是维持健康的关键。';
    } else {
      primary = '体重变化较快，建议调整节奏，避免过度波动。';
      secondary = '每周体重变化控制在0.5kg以内较为理想。';
    }
  } else if (bmi < 28) {
    primary = '您的BMI偏高，建议适当减重。控制热量摄入，增加有氧运动。';
    secondary = '建议每周减重0.5-1kg，循序渐进效果更佳。';
  } else {
    primary = '您的BMI超标，强烈建议咨询专业营养师制定减重计划。';
    secondary = '合理饮食+规律运动，必要时寻求医疗帮助。';
  }
  
  return { primary, secondary };
});

// 点击数据点
const handlePointClick = (point: { data: import('@/types').PureTrendData }) => {
  systemStore.temp.selectedBodyTrendPoint = point.data;
  systemStore.setModal('bodyTrendDetail', true);
};
</script>

<template>
  <div class="pure-trend-container">
    <!-- 简洁标题 -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">
        体重趋势分析
      </h3>
      <div class="text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 text-slate-600 dark:text-slate-300">
        <span class="text-slate-400 dark:text-slate-500">共 </span><span class="font-bold text-blue-600 dark:text-blue-400">{{ pureTrendData.length }}</span><span class="text-slate-400 dark:text-slate-500"> 条记录</span>
      </div>
    </div>
    
    <!-- 统计摘要卡片 -->
    <div v-if="chartData" class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">当前BMI</div>
        <div class="text-2xl font-bold" :class="bmiColorClass">
          {{ currentBMI.toFixed(1) }}
        </div>
        <div class="text-[10px] text-slate-400 mt-1">{{ bmiStatus }}</div>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">周变化率</div>
        <div class="text-xl font-bold" :class="changeRateColorClass">
          {{ weeklyChangeRate > 0 ? '+' : '' }}{{ weeklyChangeRate.toFixed(2) }} kg
        </div>
        <div class="text-[10px] text-slate-400 mt-1">{{ changeRateTrend }}</div>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">健康评分</div>
        <div class="text-2xl font-bold text-green-500">
          {{ healthScore }}
        </div>
        <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2">
          <div class="h-full bg-green-500 rounded-full transition-all"
               :style="{ width: healthScore + '%' }"></div>
        </div>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">距离理想</div>
        <div class="text-2xl font-bold" :class="targetDiff > 0 ? 'text-orange-500' : 'text-green-500'">
          {{ Math.abs(targetDiff).toFixed(1) }} kg
        </div>
        <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {{ targetDiff > 0 ? '需减重' : targetDiff < -2 ? '已偏轻' : '已达标' }}
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="!chartData" class="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <div class="text-6xl mb-4 opacity-50 grayscale">⚖️</div>
      <div class="text-sm text-slate-500 dark:text-slate-400">暂无体重记录</div>
      <div class="text-xs text-slate-400 dark:text-slate-500 mt-1">请前往「个人中心」更新体重数据</div>
    </div>
    
    <!-- 专业折线图 -->
    <div v-else class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
      <svg :viewBox="`0 0 ${chartData.width} ${chartData.height}`" class="w-full h-full">
        <defs>
          <linearGradient id="pureGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </linearGradient>
        </defs>
        
        <!-- 背景网格线 -->
        <line x1="0" y1="0" x2="300" y2="0" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="1"/>
        <line x1="0" y1="75" x2="300" y2="75" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="1" stroke-dasharray="4 4"/>
        <line x1="0" y1="150" x2="300" y2="150" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="1"/>
        
        <!-- 参考线（理想体重） -->
        <line v-if="targetWeight && targetWeightY > 20 && targetWeightY < 130" 
              x1="0" :y1="targetWeightY" x2="300" :y2="targetWeightY"
              stroke="#10b981" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
        <text v-if="targetWeight && targetWeightY > 20 && targetWeightY < 130" 
              x="290" :y="targetWeightY - 5" 
              class="text-[8px] fill-green-500">
          理想
        </text>
        
        <!-- 区域填充 -->
        <path :d="chartData.areaPathD" fill="url(#pureGradient)"/>
        
        <!-- 主曲线 - 蓝色 -->
        <path :d="chartData.pathD" 
              fill="none" 
              stroke="#3b82f6" 
              stroke-width="2" 
              stroke-linecap="round"/>
        
        <!-- 数据点 -->
        <g v-for="(point, i) in chartData.points" :key="i">
          <circle :cx="point.x" :cy="point.y" r="3" 
                  fill="#3b82f6" 
                  stroke="#fff" 
                  stroke-width="1.5"
                  class="cursor-pointer hover:r-5 transition-all"
                  @click="handlePointClick(point)"
                  @mouseenter="selectedPoint = i"
                  @mouseleave="selectedPoint = null"/>
          
          <!-- 日期标签 - 显示在数据点下方 -->
          <text :x="point.x" :y="145" 
                text-anchor="middle"
                class="text-[8px] fill-slate-400 dark:fill-slate-500 pointer-events-none">
            {{ point.date }}
          </text>
          
          <!-- 异常点标记 -->
          <g v-if="point.isAnomaly">
            <circle :cx="point.x" :cy="point.y" r="8" 
                    fill="none" 
                    stroke="#ef4444" 
                    stroke-width="1.5"/>
            <text :x="point.x" :y="point.y - 12" 
                  text-anchor="middle"
                  class="text-[10px] fill-red-500">⚠️</text>
          </g>
          
          <!-- 恸停提示 -->
          <g v-if="selectedPoint === i">
            <circle :cx="point.x" :cy="point.y" r="5" 
                    fill="#fff" 
                    stroke="#3b82f6" 
                    stroke-width="2"/>
            <g>
              <rect :x="point.x - 28" :y="point.y - 35" 
                    width="56" height="22" rx="6" 
                    fill="#1e293b" 
                    opacity="0.95"/>
              <path :d="`M ${point.x} ${point.y - 13} L ${point.x - 5} ${point.y - 4} L ${point.x + 5} ${point.y - 4} Z`" 
                    fill="#1e293b" 
                    opacity="0.95"/>
              <text :x="point.x" :y="point.y - 20" 
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
      <div class="flex justify-between text-xs text-slate-400 mt-4">
        <span>Min: {{ chartData.minW.toFixed(1) }} kg</span>
        <span>Avg: {{ avgWeight.toFixed(1) }} kg</span>
        <span>Max: {{ chartData.maxW.toFixed(1) }} kg</span>
      </div>
    </div>
    
    <!-- 数据洞察 -->
    <div v-if="insights.length > 0" class="mt-4 space-y-2">
      <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">💡 数据洞察</h4>
      <div v-for="(insight, idx) in insights" :key="idx" 
           class="flex items-start gap-2 p-3 rounded-xl"
           :class="{
             'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800': insight.type === 'WARNING',
             'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800': insight.type === 'SUCCESS',
             'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800': insight.type === 'INFO'
           }">
        <span class="text-lg">
          {{ insight.type === 'WARNING' ? '⚠️' : insight.type === 'SUCCESS' ? '✅' : 'ℹ️' }}
        </span>
        <div class="flex-1">
          <div class="text-xs font-medium text-slate-700 dark:text-slate-200">
            {{ insight.message }}
          </div>
          <div v-if="insight.suggestions && insight.suggestions.length > 0" class="mt-2 space-y-1">
            <div v-for="(sug, sidx) in insight.suggestions" :key="sidx" 
                 class="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
              <span>•</span>
              <span>{{ sug }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 专业建议 -->
    <div v-if="chartData" class="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
      <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
        📋 专业建议
      </h4>
      <ul class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <li class="flex items-start gap-2">
          <span class="text-blue-500">→</span>
          <span>{{ professionalAdvice.primary }}</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-purple-500">→</span>
          <span>{{ professionalAdvice.secondary }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 自定义样式 */
</style>
