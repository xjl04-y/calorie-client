<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useExerciseStore } from '@/stores/useExerciseStore';
import { showToast } from 'vant';
import type { ExerciseLog } from '@/types';

// 创建类型守卫函数
function isFullExerciseLog(log: any): log is ExerciseLog & { healAmount: number; shieldGained: number; goldGained: number } {
  return log && typeof log === 'object' && 'logType' in log && log.logType === 'EXERCISE' && 'healAmount' in log;
}

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();
const exerciseStore = useExerciseStore();

// 获取当前日志（从临时状态或路由参数）
const currentLog = computed(() => {
  // 如果有临时选中的日志，优先使用
  if (systemStore.temp.selectedExerciseLog) {
    return systemStore.temp.selectedExerciseLog;
  }
  // 否则可以根据路由参数查找日志
  return null;
});

// 如果没有选中的日志，返回上一页
if (!currentLog.value) {
  router.back();
}

// 表单状态（用于编辑模式）
const isEditing = ref(false);
const editForm = ref({
  name: '',
  icon: '',
  duration: 0,
  caloriesBurned: 0,
  intensity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  tips: ''
});

// 强度标签
const intensityLabels = {
  LOW: { label: '轻松', color: 'text-green-500', bg: 'bg-green-50' },
  MEDIUM: { label: '中等', color: 'text-orange-500', bg: 'bg-orange-50' },
  HIGH: { label: '剧烈', color: 'text-red-500', bg: 'bg-red-50' }
};

// 删除记录
const deleteLog = () => {
  if (!currentLog.value) return;
  
  const removed = store.exerciseStore.removeExercise(currentLog.value.id);
  if (removed) {
    showToast('记录已删除');
    router.back();
  }
};

// 进入编辑模式
const startEdit = () => {
  if (!currentLog.value) return;
  
  editForm.value = {
    name: currentLog.value.name,
    icon: currentLog.value.icon,
    duration: currentLog.value.duration,
    caloriesBurned: currentLog.value.caloriesBurned,
    intensity: currentLog.value.intensity || 'MEDIUM',
    tips: currentLog.value.tips || ''
  };
  isEditing.value = true;
};

// 保存编辑
const saveEdit = () => {
  if (!currentLog.value) return;
  
  // 这里应该调用相应的更新方法
  // 由于我们使用的是独立的日志存储，更新逻辑会比较复杂
  // 暂时只给出提示
  showToast('编辑功能正在开发中');
  isEditing.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between">
      <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">🏃 运动详情</span>
      <div class="w-8 h-8"></div> <!-- 占位符 -->
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="currentLog" class="space-y-6 pb-safe">
        <!-- 运动信息卡片 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 text-3xl flex items-center justify-center">
              {{ currentLog.icon }}
            </div>
            <div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ currentLog.name }}</div>
              <div class="text-slate-500 dark:text-slate-400">{{ new Date(currentLog.timestamp).toLocaleString() }}</div>
            </div>
          </div>

          <!-- 基础数据 -->
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-center">
              <div class="text-xs text-orange-600 dark:text-orange-400 font-bold mb-1">时长</div>
              <div class="text-xl font-black text-orange-600 dark:text-orange-300">{{ currentLog.duration }}<span class="text-sm font-normal">分钟</span></div>
            </div>
            <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center">
              <div class="text-xs text-red-600 dark:text-red-400 font-bold mb-1">消耗</div>
              <div class="text-xl font-black text-red-600 dark:text-red-300">{{ currentLog.caloriesBurned }}<span class="text-sm font-normal">kcal</span></div>
            </div>
            <div v-if="'intensity' in currentLog && currentLog.intensity" class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center">
              <div class="text-xs text-purple-600 dark:text-purple-400 font-bold mb-1">强度</div>
              <div class="text-xl font-black text-purple-600 dark:text-purple-300">{{ intensityLabels[currentLog.intensity]?.label || currentLog.intensity }}</div>
            </div>
          </div>

          <!-- 扩展信息 -->
          <div class="space-y-3">
            <div v-if="'baseExerciseId' in currentLog && currentLog.baseExerciseId" class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">基础运动</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.baseExerciseId }}</span>
            </div>
            <div v-if="'userWeight' in currentLog && currentLog.userWeight" class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">记录时体重</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.userWeight }} kg</span>
            </div>
            <div v-if="'tips' in currentLog && currentLog.tips" class="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div class="text-slate-500 dark:text-slate-400 mb-1">备注</div>
              <div class="text-slate-700 dark:text-slate-300">{{ currentLog.tips }}</div>
            </div>
            <div v-if="'tags' in currentLog && currentLog.tags && currentLog.tags.length" class="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div class="text-slate-500 dark:text-slate-400 mb-1">标签</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="tag in currentLog.tags" :key="tag" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- RPG 效果 -->
        <div v-if="!systemStore.isPureMode && isFullExerciseLog(currentLog) && (currentLog.healAmount || currentLog.shieldGained || currentLog.goldGained)" class="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 shadow-sm border border-purple-100 dark:border-slate-600">
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">⚔️</span>
            战斗效果
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <div v-if="currentLog.healAmount" class="text-center bg-white/60 dark:bg-slate-800/60 rounded-xl p-4">
              <div class="text-3xl mb-2">❤️</div>
              <div class="text-2xl font-black text-red-500 mb-1">+{{ currentLog.healAmount }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">生命治疗</div>
            </div>
            <div v-if="currentLog.shieldGained" class="text-center bg-white/60 dark:bg-slate-800/60 rounded-xl p-4">
              <div class="text-3xl mb-2">🛡️</div>
              <div class="text-2xl font-black text-blue-500 mb-1">+{{ currentLog.shieldGained }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">护盾值</div>
            </div>
            <div v-if="currentLog.goldGained" class="text-center bg-white/60 dark:bg-slate-800/60 rounded-xl p-4">
              <div class="text-3xl mb-2">💰</div>
              <div class="text-2xl font-black text-yellow-500 mb-1">+{{ currentLog.goldGained }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">金币</div>
            </div>
          </div>
        </div>

        <!-- 健康收益卡片 - 仅RPG模式显示 -->
        <div v-if="!systemStore.isPureMode" class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 shadow-sm border border-green-100 dark:border-green-800">
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">💪</span>
            健康收益
          </h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">🔥</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">燃烧脂肪</span>
              </div>
              <span class="font-bold text-orange-500">~{{ Math.round(currentLog.caloriesBurned / 7.7) }}g</span>
            </div>
            <div class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">💓</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">心血管强化</span>
              </div>
              <span class="font-bold text-red-500">{{ currentLog.intensity === 'HIGH' ? '极佳' : currentLog.intensity === 'MEDIUM' ? '良好' : '一般' }}</span>
            </div>
            <div class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">😊</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">多巴胺分泌</span>
              </div>
              <span class="font-bold text-purple-500">+{{ Math.round(currentLog.duration / 10) }}%</span>
            </div>
          </div>
        </div>

        <!-- 统计对比 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">📊</span>
            运动等效
          </h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">相当于走路</span>
              <span class="font-bold text-slate-700 dark:text-slate-200">~{{ Math.round(currentLog.caloriesBurned / 4) }} 分钟</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">相当于爬楼</span>
              <span class="font-bold text-slate-700 dark:text-slate-200">~{{ Math.round(currentLog.caloriesBurned / 0.15) }} 层</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">抵消食物</span>
              <span class="font-bold text-slate-700 dark:text-slate-200">1 碗米饭 ({{ Math.round((currentLog.caloriesBurned / 200) * 100) }}%)</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3 pt-4">
          <button @click="startEdit" class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-95 transition">
            <i class="fas fa-edit mr-2"></i> 编辑
          </button>
          <button @click="deleteLog" class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition">
            <i class="fas fa-trash mr-2"></i> 删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>