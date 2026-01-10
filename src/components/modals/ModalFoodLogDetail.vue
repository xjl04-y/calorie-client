<script setup lang="ts">
import { computed } from 'vue';
import { useSystemStore } from '@/stores/useSystemStore';
import { useLogStore } from '@/stores/useLogStore';


const systemStore = useSystemStore();
const logStore = useLogStore();

// 修复：使用正确的 modal 名称
const show = computed({
  get: () => systemStore.modals.logDetail,
  set: (val) => systemStore.setModal('logDetail', val)
});

const currentLog = computed(() => systemStore.temp.selectedLog);

// 删除记录
const deleteLog = () => {
  if (!currentLog.value) return;

  const removed = logStore.removeLog(currentLog.value.id);
  if (removed) {
    show.value = false;
  }
};
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: 'auto', maxHeight: '80%' }"
    class="dark:bg-slate-900 pb-safe"
  >
    <div class="p-6 bg-slate-50 dark:bg-slate-900 min-h-[400px] flex flex-col">
      <div v-if="currentLog" class="flex-1">
        <!-- 头部 -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl flex items-center dark:text-white">
            <i class="fas fa-utensils text-green-500 mr-2"></i>
            食物详情
          </h3>
          <button @click="show = false" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
            <i class="fas fa-times text-slate-500 dark:text-slate-400"></i>
          </button>
        </div>

        <!-- 食物信息 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
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
            <div v-if="currentLog.category" class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">分类</span>
              <span class="font-medium text-slate-700 dark:text-slate-200">{{ currentLog.category }}</span>
            </div>
            <div v-if="currentLog.tags && currentLog.tags.length" class="pt-2 border-t border-slate-100 dark:border-slate-700">
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
        <div v-if="!systemStore.isPureMode && (currentLog.damageTaken || currentLog.healed || currentLog.blocked)" class="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
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

        <!-- [新增] RPG 收益 - 仅RPG模式显示 -->
        <div v-if="!systemStore.isPureMode && (currentLog.generatedGold || currentLog.generatedExp)" class="bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-900/20 dark:to-yellow-900/20 rounded-2xl p-6 mb-6 shadow-sm border border-purple-200 dark:border-purple-700/50">
          <h4 class="font-bold text-lg mb-4 text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <span>💰</span> 冒险收益
          </h4>
          <div class="space-y-3">
            <div v-if="currentLog.generatedExp" class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span class="text-lg">⭐</span> 经验值
              </span>
              <span class="font-black text-xl text-purple-600 dark:text-purple-400">+{{ currentLog.generatedExp }} EXP</span>
            </div>
            <div v-if="currentLog.generatedGold" class="flex items-center justify-between">
              <span class="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span class="text-lg">💎</span> 金币
              </span>
              <span class="font-black text-xl text-yellow-600 dark:text-yellow-400">+{{ currentLog.generatedGold }} G</span>
            </div>
          </div>
        </div>

        <!-- 删除按钮 -->
        <div class="pt-4">
          <button @click="deleteLog" class="w-full py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-2">
            <i class="fas fa-trash"></i> 删除记录
          </button>
        </div>
      </div>
    </div>
  </van-popup>
</template>
