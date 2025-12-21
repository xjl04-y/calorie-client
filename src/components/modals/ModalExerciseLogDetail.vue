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
  get: () => store.modals.exerciseLogDetail,
  set: (val) => store.setModal('exerciseLogDetail', val)
});

const log = computed(() => systemStore.temp.selectedExerciseLog);

const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: '时光倒流',
      message: '确定要撤销这条运动记录吗？',
      confirmButtonText: '确认撤销',
      confirmButtonColor: '#7c3aed'
    }).then(() => {
      if (log.value) {
        logStore.removeExerciseLog(log.value.id);
        show.value = false;
      }
    }).catch(() => {});
  }
};

const intensityLabels = {
  LOW: { label: '轻松', color: 'text-green-500' },
  MEDIUM: { label: '中等', color: 'text-orange-500' },
  HIGH: { label: '剧烈', color: 'text-red-500' }
};
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '85%', maxHeight: '90%' }" class="dark:bg-slate-800 flex flex-col overflow-hidden">
    <div class="p-6 text-center overflow-y-auto custom-scrollbar" v-if="log">
      <!-- RPG风格装饰 -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
      
      <!-- 图标与名称 -->
      <div class="text-6xl mb-4 filter drop-shadow-md animate-bounce-slow">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-2 tracking-wide">⚔️ {{ log.name }}</h3>
      <div class="text-xs text-slate-400 mb-4">运动记录</div>

      <!-- RPG效果卡片 -->
      <div class="bg-gradient-to-br from-green-900/20 to-emerald-900/20 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4 mb-4 border border-green-500/30">
        <div class="text-xs text-green-400 font-bold mb-2 uppercase tracking-wider">⚡ 战斗效果</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center">
            <div class="text-2xl mb-1">❤️</div>
            <div class="text-lg font-bold text-red-400">+{{ log.healAmount || (50 + Math.floor((log.calories || 0) / 10)) }}</div>
            <div class="text-[10px] text-slate-400">HP恢复</div>
          </div>
          <div class="text-center">
            <div class="text-2xl mb-1">🔥</div>
            <div class="text-lg font-bold text-orange-400">{{ log.calories || 0 }}</div>
            <div class="text-[10px] text-slate-400">能量消耗</div>
          </div>
        </div>
      </div>

      <!-- 数据网格 -->
      <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">⏱️ 持续时间</span>
          <span class="font-bold text-slate-700 dark:text-white">{{ log.grams || 30 }} 分钟</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">💪 运动强度</span>
          <span class="font-bold" :class="intensityLabels[log.tags?.includes('高强度') ? 'HIGH' : log.tags?.includes('低强度') ? 'LOW' : 'MEDIUM']?.color">
            {{ intensityLabels[log.tags?.includes('高强度') ? 'HIGH' : log.tags?.includes('低强度') ? 'LOW' : 'MEDIUM']?.label }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">🕐 记录时间</span>
          <span class="font-bold text-xs text-slate-600 dark:text-slate-300">
            {{ new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </span>
        </div>
      </div>

      <!-- 运动收益 -->
      <div class="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl p-4 mb-4 border border-purple-500/30">
        <div class="text-xs text-purple-400 font-bold mb-3 uppercase tracking-wider">📊 冒险收益</div>
        <div class="space-y-2 text-left">
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">🔥 燃烧脂肪</span>
            <span class="font-bold text-orange-400">~{{ Math.round((log.calories || 0) / 7.7) }}g</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">🚶 相当于走路</span>
            <span class="font-bold text-blue-400">~{{ Math.round((log.calories || 0) / 4) }} 分钟</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-400">🍚 抵消食物</span>
            <span class="font-bold text-green-400">{{ Math.round(((log.calories || 0) / 200) * 100) }}% 米饭</span>
          </div>
        </div>
      </div>
      
      <!-- [新增] RPG 收益 - 仅RPG模式显示 -->
      <div v-if="!systemStore.isPureMode && log.generatedGold" class="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl p-4 mb-4 border border-yellow-500/30">
        <div class="text-xs text-yellow-400 font-bold mb-3 uppercase tracking-wider">💰 金币获取</div>
        <div class="flex items-center justify-between">
          <span class="text-slate-300 flex items-center gap-2">
            <span class="text-xl">💎</span> 运动奖励
          </span>
          <span class="font-black text-2xl text-yellow-400">+{{ log.generatedGold }} G</span>
        </div>
        <div class="text-[10px] text-slate-400 mt-2 text-center">运动产生的治疗溢出转化为金币</div>
      </div>

      <!-- 备注 -->
      <div v-if="log.tips" class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 text-left border border-amber-200 dark:border-amber-800/30">
        <div class="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">📝 备注</div>
        <div class="text-xs text-slate-600 dark:text-slate-300">{{ log.tips }}</div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3 mt-4">
        <van-button class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500" plain round @click="handleDelete">
          <i class="fas fa-trash-alt mr-1"></i> 撤销
        </van-button>
        <van-button class="flex-1" color="linear-gradient(135deg, #10b981 0%, #059669 100%)" round @click="show = false">
          <i class="fas fa-check mr-1"></i> 关闭
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 4px; }
.animate-bounce-slow {
  animation: bounce 2s infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
