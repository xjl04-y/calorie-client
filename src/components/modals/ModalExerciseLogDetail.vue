<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { useLogStore } from '@/stores/useLogStore'
import { showConfirmDialog } from 'vant'

const store = useGameStore()
const systemStore = useSystemStore()
const logStore = useLogStore()

const show = computed({
  get: () => store.modals.exerciseLogDetail,
  set: (val) => store.setModal('exerciseLogDetail', val),
})

const log = computed(() => systemStore.temp.selectedExerciseLog)

const handleDelete = () => {
  if (log.value) {
    showConfirmDialog({
      title: '删除记录',
      message: '确定要撤销这条运动记录吗？',
      confirmButtonText: '确认撤销',
      confirmButtonColor: '#10b981',
    })
      .then(() => {
        if (log.value) {
          logStore.removeExerciseLog(log.value.id)
          show.value = false
        }
      })
      .catch(() => {})
  }
}

const intensityLabels = {
  LOW: { label: '轻松', color: 'text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded' },
  MEDIUM: { label: '中等', color: 'text-orange-500 bg-orange-50 px-2 py-0.5 rounded' },
  HIGH: { label: '剧烈', color: 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded' },
}
</script>

<template>
  <van-popup
    v-model:show="show"
    round
    position="center"
    :style="{ width: '85%', maxHeight: '90%' }"
    class="dark:bg-slate-900 flex flex-col overflow-hidden"
  >
    <div class="p-6 text-center overflow-y-auto custom-scrollbar" v-if="log">
      <!-- 头部图标：去除 Bounce 动画，改为更稳重的展示 -->
      <div class="text-6xl mb-4 text-slate-800 dark:text-slate-200">{{ log.icon }}</div>
      <h3 class="font-bold text-xl dark:text-white mb-1 tracking-wide text-slate-800">
        {{ log.name }}
      </h3>
      <div class="text-xs text-slate-400 mb-6 font-medium">运动记录</div>

      <!-- RPG效果卡片：去除 muddy gradient，使用清爽的 Emerald 背景 -->
      <div
        class="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 mb-4 border border-emerald-100 dark:border-emerald-900/30"
      >
        <div
          class="text-xs text-emerald-600 font-bold mb-3 uppercase tracking-wider flex items-center justify-center"
        >
          <i class="fas fa-bolt mr-1"></i> {{ systemStore.isPureMode ? '健康收益' : '战斗效果' }}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center">
            <div class="text-lg mb-1 text-rose-500"><i class="fas fa-heart"></i></div>
            <div class="text-lg font-bold text-slate-700 dark:text-slate-200">
              +{{ log.healAmount || 50 + Math.floor((log.caloriesBurned || 0) / 10) }}
            </div>
            <div class="text-[10px] text-slate-400">HP恢复</div>
          </div>
          <div class="text-center">
            <div class="text-lg mb-1 text-orange-500"><i class="fas fa-fire"></i></div>
            <div class="text-lg font-bold text-slate-700 dark:text-slate-200">
              {{ log.caloriesBurned || 0 }}
            </div>
            <div class="text-[10px] text-slate-400">能量消耗</div>
          </div>
        </div>
      </div>

      <!-- 数据网格：使用 White/Slate-800 背景 -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 mb-4 space-y-3 shadow-sm"
      >
        <div
          class="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2"
        >
          <span class="text-xs text-slate-400">⏱️ 持续时间</span>
          <span class="font-bold text-slate-700 dark:text-white"
            >{{ log.duration || 30 }} 分钟</span
          >
        </div>
        <div
          class="flex justify-between items-center border-b border-slate-50 dark:border-slate-700/50 pb-2"
        >
          <span class="text-xs text-slate-400">💪 运动强度</span>
          <span
            class="font-bold text-xs"
            :class="
              intensityLabels[
                log.tags?.includes('高强度')
                  ? 'HIGH'
                  : log.tags?.includes('低强度')
                    ? 'LOW'
                    : 'MEDIUM'
              ]?.color
            "
          >
            {{
              intensityLabels[
                log.tags?.includes('高强度')
                  ? 'HIGH'
                  : log.tags?.includes('低强度')
                    ? 'LOW'
                    : 'MEDIUM'
              ]?.label
            }}
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">🕐 记录时间</span>
          <span class="font-bold text-xs text-slate-600 dark:text-slate-300">
            {{
              new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            }}
          </span>
        </div>
      </div>

      <!-- 运动收益：使用 Sky/Blue 背景 -->
      <div
        class="bg-sky-50 dark:bg-sky-900/10 rounded-xl p-4 mb-4 border border-sky-100 dark:border-sky-900/30"
      >
        <div
          class="text-xs text-sky-600 font-bold mb-3 uppercase tracking-wider flex items-center justify-center"
        >
          <i class="fas fa-chart-line mr-1"></i>
          {{ systemStore.isPureMode ? '消耗换算' : '冒险收益' }}
        </div>
        <div class="space-y-2 text-left">
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">🔥 燃烧脂肪</span>
            <span class="font-bold text-slate-700 dark:text-slate-200"
              >~{{ Math.round((log.caloriesBurned || 0) / 7.7) }}g</span
            >
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">🚶 相当于走路</span>
            <span class="font-bold text-slate-700 dark:text-slate-200"
              >~{{ Math.round((log.caloriesBurned || 0) / 4) }} 分钟</span
            >
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-slate-500">🍚 抵消食物</span>
            <span class="font-bold text-slate-700 dark:text-slate-200"
              >{{ Math.round(((log.caloriesBurned || 0) / 200) * 100) }}% 米饭</span
            >
          </div>
        </div>
      </div>

      <!-- [新增] RPG 收益 - 仅RPG模式显示 -->
      <div
        v-if="!systemStore.isPureMode && log.goldGained"
        class="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 mb-4 border border-amber-100 dark:border-amber-900/30"
      >
        <div
          class="text-xs text-amber-600 font-bold mb-3 uppercase tracking-wider flex items-center justify-center"
        >
          <i class="fas fa-coins mr-1"></i> 金币获取
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-500 text-xs flex items-center gap-2"> 运动奖励 </span>
          <span class="font-black text-xl text-amber-500">+{{ log.goldGained }} G</span>
        </div>
      </div>

      <!-- 备注 -->
      <div
        v-if="log.tips"
        class="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4 text-left border border-slate-100 dark:border-slate-700"
      >
        <div class="text-xs text-slate-400 font-bold mb-1">📝 备注</div>
        <div class="text-xs text-slate-600 dark:text-slate-300">{{ log.tips }}</div>
      </div>

      <!-- 操作按钮：扁平化 -->
      <div class="flex gap-3 mt-4">
        <van-button
          class="flex-1 border-slate-200 dark:border-slate-600 text-slate-500"
          plain
          round
          @click="handleDelete"
        >
          <i class="fas fa-trash-alt mr-1"></i> 撤销
        </van-button>
        <van-button class="flex-1" color="#10b981" round @click="show = false">
          <i class="fas fa-check mr-1"></i> 关闭
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
