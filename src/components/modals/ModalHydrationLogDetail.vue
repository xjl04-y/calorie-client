<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useLogStore } from '@/stores/useLogStore';
import { showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();
const logStore = useLogStore();

const show = computed({
  get: () => store.modals.hydrationLogDetail,
  set: (val) => store.setModal('hydrationLogDetail', val)
});

const log = computed(() => systemStore.temp.selectedHydrationLog);

const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: '时光倒流',
      message: '确定要撤销这条补水记录吗？',
      confirmButtonText: '确认撤销',
      confirmButtonColor: '#7c3aed'
    }).then(() => {
      if (log.value) {
        logStore.removeHydrationLog(log.value.id);
        show.value = false;
      }
    }).catch(() => {});
  }
};

const typeLabels = {
  WATER: { label: '水', color: 'text-blue-500' },
  TEA: { label: '茶', color: 'text-green-500' },
  COFFEE: { label: '咖啡', color: 'text-amber-500' },
  OTHER: { label: '其他', color: 'text-purple-500' }
};

const tempLabels = {
  COLD: { label: '冰镇', icon: '❄️' },
  WARM: { label: '温热', icon: '☕' },
  HOT: { label: '滚烫', icon: '🔥' }
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '85%', maxHeight: '90%' }" class="dark:bg-slate-800 flex flex-col overflow-hidden">
    <div class="p-6 text-center overflow-y-auto custom-scrollbar" v-if="log">
      <!-- RPG风格装饰 -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
      
      <!-- 图标与名称 -->
      <div class="text-6xl mb-4 filter drop-shadow-md animate-wave">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-2 tracking-wide">💧 {{ log.name }}</h3>
      <div class="text-xs text-slate-400 mb-4">补水记录</div>

      <!-- RPG效果卡片 -->
      <div class="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-xl p-4 mb-4 border border-cyan-500/30">
        <div class="text-xs text-cyan-400 font-bold mb-2 uppercase tracking-wider">💦 净化效果</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center">
            <div class="text-2xl mb-1">💧</div>
            <div class="text-lg font-bold text-blue-400">+{{ log.grams || 250 }}</div>
            <div class="text-[10px] text-slate-400">ml 水分</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-1">✨</div>
            <div class="text-lg font-bold text-cyan-400">{{ Math.round(((log.grams || 250) / 2000) * 100) }}%</div>
            <div class="text-[10px] text-slate-400">目标进度</div>
          </div>
        </div>
      </div>

      <!-- 数据网格 -->
      <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">💧 饮水量</span>
          <span class="font-bold text-blue-500">{{ log.grams || 250 }} ml</span>
        </div>
        <div class="flex justify-between items-center" v-if="log.tags && log.tags.length > 0">
          <span class="text-xs text-slate-400">🥤 饮品类型</span>
          <span class="font-bold" :class="typeLabels[log.tags.includes('茶') ? 'TEA' : log.tags.includes('咖啡') ? 'COFFEE' : 'WATER']?.color">
            {{ typeLabels[log.tags.includes('茶') ? 'TEA' : log.tags.includes('咖啡') ? 'COFFEE' : 'WATER']?.label }}
          </span>
        </div>
        <div class="flex justify-between items-center" v-if="log.tags && log.tags.some(t => ['冰镇', '温热', '滚烫'].includes(t))">
          <span class="text-xs text-slate-400">🌡️ 水温</span>
          <span class="font-bold text-slate-600 dark:text-slate-300">
            {{ tempLabels[log.tags.includes('冰镇') ? 'COLD' : log.tags.includes('滚烫') ? 'HOT' : 'WARM']?.icon }} {{ tempLabels[log.tags.includes('冰镇') ? 'COLD' : log.tags.includes('滚烫') ? 'HOT' : 'WARM']?.label }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">🕐 记录时间</span>
          <span class="font-bold text-xs text-slate-600 dark:text-slate-300">
            {{ new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </div>
      </div>

      <!-- 补水收益 -->
      <div class="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-4 mb-4 border border-indigo-500/30">
        <div class="text-xs text-indigo-400 font-bold mb-3 uppercase tracking-wider">📊 冒险收益</div>
        <div class="space-y-2 text-left">
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">🧬 促进代谢</span>
            <span class="font-bold text-blue-400">{{ (log.grams || 250) >= 500 ? '显著' : (log.grams || 250) >= 250 ? '良好' : '轻微' }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">☕ 标准杯数</span>
            <span class="font-bold text-purple-400">{{ ((log.grams || 250) / 250).toFixed(1) }} 杯</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">💉 体液补充</span>
            <span class="font-bold text-pink-400">{{ ((log.grams || 250) / 50).toFixed(0) }}ml 血液</span>
          </div>
        </div>
      </div>

      <!-- [新增] RPG 收益 - 仅RPG模式显示（补水通常不产生金币/经验，但预留字段） -->
      <div v-if="!systemStore.isPureMode && (log.generatedGold || log.generatedExp)" class="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl p-4 mb-4 border border-blue-500/30">
        <div class="text-xs text-blue-400 font-bold mb-3 uppercase tracking-wider">💰 奖励获取</div>
        <div class="space-y-2">
          <div v-if="log.generatedExp" class="flex items-center justify-between">
            <span class="text-slate-300 flex items-center gap-2">
              <span class="text-lg">⭐</span> 经验值
            </span>
            <span class="font-black text-xl text-blue-400">+{{ log.generatedExp }} EXP</span>
          </div>
          <div v-if="log.generatedGold" class="flex items-center justify-between">
            <span class="text-slate-300 flex items-center gap-2">
              <span class="text-lg">💎</span> 金币
            </span>
            <span class="font-black text-xl text-cyan-400">+{{ log.generatedGold }} G</span>
          </div>
        </div>
      </div>

      <!-- 健康提示 -->
      <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 text-left border border-amber-200 dark:border-amber-800/30">
        <div class="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">💡 健康提示</div>
        <div class="text-xs text-slate-600 dark:text-slate-300">
          {{ log.tags?.includes('茶') ? '茶含有抗氧化物质，有益健康' : 
             log.tags?.includes('咖啡') ? '适量咖啡可提神，但不宜过量' : 
             log.tags?.includes('饮料') ? '注意控制饮料中的糖分摄入' :
             '纯净水是最佳选择，不含糖分和热量' }}
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3 mt-4">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500" plain round @click="handleDelete">
          <i class="fas fa-trash-alt mr-1"></i> 撤销
        </van-button>
        <van-button class="flex-1" color="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" round @click="show = false">
          <i class="fas fa-check mr-1"></i> 关闭
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 4px; }
.animate-wave {
  animation: wave 2s ease-in-out infinite;
}
@keyframes wave {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-5px) scale(1.05); }
}
</style>
