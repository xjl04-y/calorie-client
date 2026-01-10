<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { isRPGTrendData, isPureTrendData } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => store.modals.bodyTrendDetail,
  set: (val) => store.setModal('bodyTrendDetail', val)
});

const point = computed(() => systemStore.temp.selectedBodyTrendPoint);
const isPure = computed(() => systemStore.isPureMode);

const rpgPoint = computed(() => {
  const val = point.value;
  return val && isRPGTrendData(val) ? val : null;
});

const purePoint = computed(() => {
  const val = point.value;
  return val && isPureTrendData(val) ? val : null;
});

// BMI 状态
const getBMIStatus = (bmi: number) => {
  if (bmi < 18.5) return { text: '偏轻', color: 'text-blue-500' };
  if (bmi < 24) return { text: '正常', color: 'text-green-500' };
  if (bmi < 28) return { text: '偏重', color: 'text-orange-500' };
  return { text: '肥胖', color: 'text-red-500' };
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" 
             :style="{ width: '90%', maxHeight: '85%' }">
    <div v-if="point" class="overflow-y-auto max-h-[85vh] custom-scrollbar">
      
      <!-- RPG模式详情 -->
      <div v-if="rpgPoint && !isPure" class="rpg-detail p-6">
        <!-- 顶部装饰 -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-70"></div>
        
        <div class="text-center mb-6">
          <div class="text-5xl mb-3 animate-bounce-slow">⚔️</div>
          <h3 class="font-bold text-xl text-slate-800 dark:text-white mb-1">
            塑形战况回顾
          </h3>
          <div class="text-sm text-slate-500 dark:text-slate-400">
            {{ rpgPoint.date }}
          </div>
        </div>
        
        <!-- 体重变化 -->
        <div class="bg-gradient-to-br from-slate-900/20 to-slate-800/20 rounded-xl p-4 border border-slate-600 mb-4">
          <div class="flex items-center justify-between">
            <div class="text-xs text-slate-400 uppercase tracking-wider">体重记录</div>
            <div class="text-3xl font-black text-yellow-400">{{ rpgPoint.weight }} <span class="text-lg font-normal">kg</span></div>
          </div>
        </div>
        
        <!-- 属性变化 -->
        <div v-if="rpgPoint.attributeChanges" class="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-purple-500/30 mb-4">
          <h4 class="text-xs font-bold text-purple-300 mb-3 uppercase tracking-wider">⚡ 属性重塑</h4>
          <div class="grid grid-cols-3 gap-3">
            <div class="text-center bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div class="text-2xl mb-1">💪</div>
              <div class="text-xs text-red-400 mb-1">力量</div>
              <div class="text-lg font-bold" :class="rpgPoint.attributeChanges.str >= 0 ? 'text-red-300' : 'text-red-500'">
                {{ rpgPoint.attributeChanges.str > 0 ? '+' : '' }}{{ rpgPoint.attributeChanges.str }}
              </div>
            </div>
            <div class="text-center bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <div class="text-2xl mb-1">⚡</div>
              <div class="text-xs text-green-400 mb-1">敏捷</div>
              <div class="text-lg font-bold" :class="rpgPoint.attributeChanges.agi >= 0 ? 'text-green-300' : 'text-green-500'">
                {{ rpgPoint.attributeChanges.agi > 0 ? '+' : '' }}{{ rpgPoint.attributeChanges.agi }}
              </div>
            </div>
            <div class="text-center bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div class="text-2xl mb-1">🛡️</div>
              <div class="text-xs text-blue-400 mb-1">体质</div>
              <div class="text-lg font-bold" :class="rpgPoint.attributeChanges.vit >= 0 ? 'text-blue-300' : 'text-blue-500'">
                {{ rpgPoint.attributeChanges.vit > 0 ? '+' : '' }}{{ rpgPoint.attributeChanges.vit }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 战力变化 -->
        <div v-if="rpgPoint.combatPowerChange !== undefined" class="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-xl p-4 border border-yellow-500/30 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚔️</span>
              <span class="text-sm font-bold text-yellow-300">战力变化</span>
            </div>
            <div class="text-2xl font-black" :class="rpgPoint.combatPowerChange >= 0 ? 'text-yellow-400' : 'text-orange-500'">
              {{ rpgPoint.combatPowerChange > 0 ? '+' : '' }}{{ rpgPoint.combatPowerChange }}
            </div>
          </div>
        </div>
        
        <!-- 成就解锁 -->
        <div v-if="rpgPoint.achievements && rpgPoint.achievements.length > 0" class="bg-yellow-900/20 rounded-xl p-4 border border-yellow-500/30 mb-4">
          <h4 class="text-xs font-bold text-yellow-300 mb-3 uppercase tracking-wider">🏆 成就解锁</h4>
          <div class="space-y-2">
            <div v-for="(ach, idx) in rpgPoint.achievements" :key="idx" 
                 class="flex items-center gap-2 text-sm text-yellow-200 bg-yellow-900/10 rounded-lg p-2">
              <span class="text-lg">✨</span>
              <span>{{ ach }}</span>
            </div>
          </div>
        </div>
        
        <!-- 里程碑 -->
        <div v-if="rpgPoint.milestones && rpgPoint.milestones.length > 0" class="bg-slate-800/50 rounded-xl p-4 border border-slate-600 mb-4">
          <h4 class="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">📍 里程碑</h4>
          <div class="space-y-2">
            <div v-for="(ms, idx) in rpgPoint.milestones" :key="idx" 
                 class="flex items-center gap-2 text-sm">
              <span class="text-2xl">{{ ms.icon }}</span>
              <div class="flex-1">
                <div class="text-slate-200 font-medium">{{ ms.title }}</div>
                <div class="text-xs text-slate-400">{{ ms.type }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 故事节点 -->
        <div v-if="rpgPoint.storyNode" class="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <div class="flex items-start gap-3">
            <span class="text-3xl">📜</span>
            <div class="flex-1">
              <div class="text-xs text-slate-400 mb-1 uppercase tracking-wider">冒险日志</div>
              <div class="text-sm text-slate-200 leading-relaxed">{{ rpgPoint.storyNode }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 纯净模式详情 -->
      <div v-else-if="purePoint && isPure" class="pure-detail p-6">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">📊</div>
          <h3 class="font-bold text-xl text-slate-800 dark:text-white mb-1">
            数据详情
          </h3>
          <div class="text-sm text-slate-500 dark:text-slate-400">
            {{ purePoint.date }}
          </div>
        </div>
        
        <!-- 关键指标 -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">体重</div>
            <div class="text-3xl font-bold text-slate-800 dark:text-white">
              {{ purePoint.weight }} <span class="text-lg font-normal text-slate-500">kg</span>
            </div>
          </div>
          
          <div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">BMI</div>
            <div class="text-3xl font-bold" :class="getBMIStatus(purePoint.bmi).color">
              {{ purePoint.bmi.toFixed(1) }}
            </div>
            <div class="text-[10px] text-slate-400 mt-1">{{ getBMIStatus(purePoint.bmi).text }}</div>
          </div>
          
          <div v-if="purePoint.changeRate !== undefined" class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">周变化率</div>
            <div class="text-xl font-bold" :class="Math.abs(purePoint.changeRate * 7) < 0.5 ? 'text-green-600' : 'text-orange-600'">
              {{ (purePoint.changeRate * 7) > 0 ? '+' : '' }}{{ (purePoint.changeRate * 7).toFixed(2) }} kg
            </div>
            <div class="text-[10px] text-slate-400 mt-1">每周</div>
          </div>
          
          <div v-if="purePoint.healthScore !== undefined" class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-1">健康评分</div>
            <div class="text-xl font-bold text-orange-600">
              {{ purePoint.healthScore }}<span class="text-sm font-normal">/100</span>
            </div>
            <div class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2">
              <div class="h-full rounded-full transition-all"
                   :class="purePoint.healthScore >= 80 ? 'bg-green-500' : purePoint.healthScore >= 60 ? 'bg-orange-500' : 'bg-red-500'"
                   :style="{ width: purePoint.healthScore + '%' }"></div>
            </div>
          </div>
        </div>
        
        <!-- 专业指标 -->
        <div v-if="purePoint.professionalMetrics" class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 mb-4">
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">📈 专业指标</h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500 dark:text-slate-400">周平均体重</span>
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ purePoint.professionalMetrics.weeklyAverage }} kg</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500 dark:text-slate-400">月度趋势</span>
              <span class="text-sm font-bold" :class="{
                'text-red-500': purePoint.professionalMetrics.monthlyTrend === 'UP',
                'text-green-500': purePoint.professionalMetrics.monthlyTrend === 'DOWN',
                'text-blue-500': purePoint.professionalMetrics.monthlyTrend === 'STABLE'
              }">
                {{ purePoint.professionalMetrics.monthlyTrend === 'UP' ? '上升 ↗' : 
                   purePoint.professionalMetrics.monthlyTrend === 'DOWN' ? '下降 ↘' : '稳定 →' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500 dark:text-slate-400">距离目标</span>
              <span class="text-sm font-bold" :class="purePoint.professionalMetrics.targetDiff > 0 ? 'text-orange-500' : 'text-green-500'">
                {{ Math.abs(purePoint.professionalMetrics.targetDiff).toFixed(1) }} kg
                {{ purePoint.professionalMetrics.targetDiff > 0 ? '(需减重)' : '(已达标)' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-500 dark:text-slate-400">波动性</span>
              <span class="text-sm font-bold" :class="purePoint.professionalMetrics.volatility < 0.5 ? 'text-green-500' : 'text-orange-500'">
                {{ purePoint.professionalMetrics.volatility.toFixed(2) }} kg
                {{ purePoint.professionalMetrics.volatility < 0.5 ? '(稳定)' : '(波动较大)' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 数据洞察 -->
        <div v-if="purePoint.insights && purePoint.insights.length > 0" class="space-y-2 mb-4">
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">💡 当日洞察</h4>
          <div v-for="(insight, idx) in purePoint.insights" :key="idx"
               class="p-3 rounded-xl text-xs"
               :class="{
                 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800': insight.type === 'WARNING',
                 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800': insight.type === 'SUCCESS',
                 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800': insight.type === 'INFO'
               }">
            <div class="flex items-start gap-2">
              <span class="text-lg flex-shrink-0">
                {{ insight.type === 'WARNING' ? '⚠️' : insight.type === 'SUCCESS' ? '✅' : 'ℹ️' }}
              </span>
              <div class="flex-1">
                <div class="font-medium text-slate-700 dark:text-slate-200 mb-1">{{ insight.message }}</div>
                <div v-if="insight.suggestions && insight.suggestions.length > 0" class="mt-2 space-y-1">
                  <div v-for="(sug, sidx) in insight.suggestions" :key="sidx" 
                       class="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1 pl-2">
                    <span class="flex-shrink-0">•</span>
                    <span>{{ sug }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 兜底：基础数据展示 -->
      <div v-else class="p-6">
        <div class="text-center mb-6">
          <div class="text-5xl mb-3">⚖️</div>
          <h3 class="font-bold text-xl text-slate-800 dark:text-white mb-1">
            体重记录
          </h3>
          <div class="text-sm text-slate-500 dark:text-slate-400">
            {{ point.date }}
          </div>
        </div>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 text-center">
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">体重</div>
          <div class="text-4xl font-bold text-slate-800 dark:text-white">
            {{ point.weight }} <span class="text-xl font-normal text-slate-500">kg</span>
          </div>
        </div>
      </div>
      
      <!-- 关闭按钮 -->
      <div class="px-6 pb-6">
        <button @click="show = false" 
                class="w-full py-3 rounded-xl font-bold active:scale-95 transition"
                :class="isPure ? 'bg-blue-500 text-white' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900'">
          关闭
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

.animate-bounce-slow {
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
