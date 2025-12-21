<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast } from 'vant';
import type { FoodLog } from '@/types';

// 创建类型守卫函数
function isFullFoodLog(log: any): log is FoodLog & { damageTaken: number; healed: number; blocked: number } {
  return log && typeof log === 'object' && 'mealType' in log && 'damageTaken' in log;
}

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();

// 获取当前日志（从临时状态或路由参数）
const currentLog = computed(() => {
  // 如果有临时选中的日志，优先使用
  if (systemStore.temp.selectedLog) {
    return systemStore.temp.selectedLog;
  }
  // 否则可以根据路由参数查找日志
  return null;
});

// 如果没有选中的日志，返回上一页
if (!currentLog.value) {
  router.back();
}

// 计算营养成分占比
const macroRatios = computed(() => {
  if (!currentLog.value) return { p: 0, c: 0, f: 0 };
  
  const totalCals = (currentLog.value.p || 0) * 4 + (currentLog.value.c || 0) * 4 + (currentLog.value.f || 0) * 9;
  if (totalCals === 0) return { p: 0, c: 0, f: 0 };
  
  return {
    p: Math.round(((currentLog.value.p || 0) * 4 / totalCals) * 100),
    c: Math.round(((currentLog.value.c || 0) * 4 / totalCals) * 100),
    f: Math.round(((currentLog.value.f || 0) * 9 / totalCals) * 100)
  };
});

// 表单状态（用于编辑模式）
const isEditing = ref(false);
const editForm = ref({
  name: '',
  icon: '',
  p: 0,
  c: 0,
  f: 0,
  calories: 0,
  grams: 0,
  mealType: 'SNACK' as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
});

// 删除记录
const deleteLog = () => {
  if (!currentLog.value) return;
  
  const removed = store.deleteLog(currentLog.value);
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
    p: currentLog.value.p,
    c: currentLog.value.c,
    f: currentLog.value.f,
    calories: currentLog.value.calories,
    grams: currentLog.value.grams,
    mealType: currentLog.value.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  };
  isEditing.value = true;
};

// 保存编辑
const saveEdit = () => {
  if (!currentLog.value) return;
  
  // 这里应该调用相应的更新方法
  // 由于食物记录的更新逻辑比较复杂，暂时只给出提示
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
      <span class="font-bold text-slate-800 dark:text-white">🥗 食物详情</span>
      <div class="w-8 h-8"></div> <!-- 占位符 -->
    </div>

    <div class="flex-1 p-4">
      <div v-if="currentLog" class="space-y-6">
        <!-- 食物信息卡片 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 text-3xl flex items-center justify-center">
              {{ currentLog.icon }}
            </div>
            <div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">{{ currentLog.name }}</div>
              <div class="text-slate-500 dark:text-slate-400">{{ new Date(currentLog.timestamp).toLocaleString() }}</div>
            </div>
          </div>

          <!-- 营养成分 -->
          <div class="grid grid-cols-4 gap-3 mb-6">
            <div class="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
              <div class="text-xs text-red-600 dark:text-red-400 font-bold">蛋白质</div>
              <div class="text-lg font-black text-red-600 dark:text-red-300">{{ currentLog.p }}g</div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
              <div class="text-xs text-blue-600 dark:text-blue-400 font-bold">碳水</div>
              <div class="text-lg font-black text-blue-600 dark:text-blue-300">{{ currentLog.c }}g</div>
            </div>
            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center">
              <div class="text-xs text-yellow-600 dark:text-yellow-400 font-bold">脂肪</div>
              <div class="text-lg font-black text-yellow-600 dark:text-yellow-300">{{ currentLog.f }}g</div>
            </div>
            <div class="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
              <div class="text-xs text-orange-600 dark:text-orange-400 font-bold">热量</div>
              <div class="text-lg font-black text-orange-600 dark:text-orange-300">{{ currentLog.calories }}</div>
            </div>
          </div>

          <!-- 营养占比可视化 -->
          <div class="mb-6">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">营养成分占比（按热量）</div>
            <div class="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
              <div 
                v-if="macroRatios.p > 0"
                class="bg-red-500 transition-all" 
                :style="{ width: macroRatios.p + '%' }"
                :title="`蛋白质 ${macroRatios.p}%`"
              ></div>
              <div 
                v-if="macroRatios.c > 0"
                class="bg-blue-500 transition-all" 
                :style="{ width: macroRatios.c + '%' }"
                :title="`碳水 ${macroRatios.c}%`"
              ></div>
              <div 
                v-if="macroRatios.f > 0"
                class="bg-yellow-500 transition-all" 
                :style="{ width: macroRatios.f + '%' }"
                :title="`脂肪 ${macroRatios.f}%`"
              ></div>
            </div>
            <div class="flex justify-between mt-2 text-xs">
              <span class="text-red-500 dark:text-red-400 font-medium">蛋白 {{ macroRatios.p }}%</span>
              <span class="text-blue-500 dark:text-blue-400 font-medium">碳水 {{ macroRatios.c }}%</span>
              <span class="text-yellow-500 dark:text-yellow-400 font-medium">脂肪 {{ macroRatios.f }}%</span>
            </div>
          </div>

          <!-- 扩展信息 -->
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">份量</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.grams }}g</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">餐别</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.mealType }}</span>
            </div>
            <div v-if="'category' in currentLog && currentLog.category" class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">分类</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.category }}</span>
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
        <div v-if="!systemStore.isPureMode && isFullFoodLog(currentLog) && (currentLog.damageTaken || currentLog.healed || currentLog.blocked)" class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white">⚔️ 战斗效果</h4>
          <div class="space-y-3">
            <div v-if="currentLog.damageTaken" class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">受到伤害</span>
              <span class="font-bold text-red-500">-{{ currentLog.damageTaken }} HP</span>
            </div>
            <div v-if="currentLog.healed" class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">生命恢复</span>
              <span class="font-bold text-green-500">+{{ currentLog.healed }} HP</span>
            </div>
            <div v-if="currentLog.blocked" class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300">护盾抵消</span>
              <span class="font-bold text-blue-500">-{{ currentLog.blocked }} HP</span>
            </div>
          </div>
        </div>

        <!-- 奖励收益 - 显示金币和经验 -->
        <div v-if="!systemStore.isPureMode && ('generatedGold' in currentLog || 'generatedExp' in currentLog) && (currentLog.generatedGold || currentLog.generatedExp)" class="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-800">
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">🎁</span>
            饮食奖励
          </h4>
          <div class="space-y-3">
            <div v-if="currentLog.generatedGold" class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">💰</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">获得金币</span>
              </div>
              <span class="font-bold text-yellow-500 text-lg">+{{ currentLog.generatedGold }}</span>
            </div>
            <div v-if="currentLog.generatedExp" class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">⭐</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">获得经验</span>
              </div>
              <span class="font-bold text-purple-500 text-lg">+{{ currentLog.generatedExp }} EXP</span>
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