<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSystemStore } from '@/stores/useSystemStore'
import { useHydrationStore } from '@/stores/useHydrationStore'
import { showToast } from 'vant'
import type { HydrationLog } from '@/types'

// 创建类型守卫函数
function isFullHydrationLog(
  log: unknown,
): log is HydrationLog & { healAmount: number; buffEffect?: string } {
  return !!(
    log &&
    typeof log === 'object' &&
    'logType' in log &&
    (log as { logType?: string }).logType === 'HYDRATION' &&
    'healAmount' in log
  )
}

const router = useRouter()
const systemStore = useSystemStore()
const hydrationStore = useHydrationStore()

// 获取当前日志（从临时状态或路由参数）
const currentLog = computed(() => {
  // 如果有临时选中的日志，优先使用
  if (systemStore.temp.selectedHydrationLog) {
    return systemStore.temp.selectedHydrationLog
  }
  // 否则可以根据路由参数查找日志
  return null
})

// 如果没有选中的日志，返回上一页
if (!currentLog.value) {
  router.back()
}

// 表单状态（用于编辑模式）
const isEditing = ref(false)
const editForm = ref({
  name: '',
  icon: '',
  amount: 0,
  type: 'WATER' as 'WATER' | 'TEA' | 'COFFEE' | 'OTHER',
  temperature: 'WARM' as 'COLD' | 'WARM' | 'HOT',
})

// 类型标签
const typeLabels = {
  WATER: { label: '水', color: 'text-blue-500', bg: 'bg-blue-50' },
  TEA: { label: '茶', color: 'text-green-500', bg: 'bg-green-50' },
  COFFEE: { label: '咖啡', color: 'text-amber-500', bg: 'bg-amber-50' },
  OTHER: { label: '其他', color: 'text-purple-500', bg: 'bg-purple-50' },
}

// 温度标签
const tempLabels = {
  COLD: { label: '冰镇', color: 'text-blue-500' },
  WARM: { label: '温热', color: 'text-amber-500' },
  HOT: { label: '滚烫', color: 'text-red-500' },
}

// 删除记录
const deleteLog = () => {
  if (!currentLog.value) return

  const removed = hydrationStore.removeHydration(currentLog.value.id)
  if (removed) {
    showToast('记录已删除')
    router.back()
  }
}

// 进入编辑模式
const startEdit = () => {
  if (!currentLog.value) return

  editForm.value = {
    name: currentLog.value.name,
    icon: currentLog.value.icon,
    amount: currentLog.value.amount,
    type: currentLog.value.type || 'WATER',
    temperature: currentLog.value.temperature || 'WARM',
  }
  isEditing.value = true
}

// 保存编辑
// const saveEdit = () => {
//   if (!currentLog.value) return;
//
//   // 这里应该调用相应的更新方法
//   // 由于我们使用的是独立的日志存储，更新逻辑会比较复杂
//   // 暂时只给出提示
//   showToast('编辑功能正在开发中');
//   isEditing.value = false;
// };
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div
      class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between"
    >
      <button
        @click="router.back()"
        class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition"
      >
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">💧 补水详情</span>
      <div class="w-8 h-8"></div>
      <!-- 占位符 -->
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <div v-if="currentLog" class="space-y-6 pb-safe">
        <!-- 补水信息卡片 -->
        <div
          class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div class="flex items-center gap-4 mb-6">
            <div
              class="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-3xl flex items-center justify-center"
            >
              {{ currentLog.icon }}
            </div>
            <div>
              <div class="text-2xl font-bold text-slate-800 dark:text-white">
                {{ currentLog.name }}
              </div>
              <div class="text-slate-500 dark:text-slate-400">
                {{ new Date(currentLog.timestamp).toLocaleString() }}
              </div>
            </div>
          </div>

          <!-- 基础数据 -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
              <div class="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">饮水量</div>
              <div class="text-xl font-black text-blue-600 dark:text-blue-300">
                {{ currentLog.amount || 250 }}<span class="text-sm font-normal">ml</span>
              </div>
            </div>
            <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-center">
              <div class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">杯数</div>
              <div class="text-xl font-black text-indigo-600 dark:text-indigo-300">
                {{ ((currentLog.amount || 250) / 250).toFixed(1)
                }}<span class="text-sm font-normal">杯</span>
              </div>
            </div>
          </div>

          <!-- 扩展信息 -->
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">饮品类型</span>
              <span
                v-if="
                  currentLog.tags &&
                  (currentLog.tags.includes('茶') ||
                    currentLog.tags.includes('咖啡') ||
                    currentLog.tags.includes('饮料'))
                "
                class="px-2 py-1 rounded-full text-xs font-bold"
                :class="[
                  currentLog.tags.includes('茶')
                    ? typeLabels.TEA.bg
                    : currentLog.tags.includes('咖啡')
                      ? typeLabels.COFFEE.bg
                      : typeLabels.OTHER.bg,
                  currentLog.tags.includes('茶')
                    ? typeLabels.TEA.color
                    : currentLog.tags.includes('咖啡')
                      ? typeLabels.COFFEE.color
                      : typeLabels.OTHER.color,
                ]"
              >
                {{
                  currentLog.tags.includes('茶')
                    ? typeLabels.TEA.label
                    : currentLog.tags.includes('咖啡')
                      ? typeLabels.COFFEE.label
                      : typeLabels.OTHER.label
                }}
              </span>
              <span
                v-else
                class="px-2 py-1 rounded-full text-xs font-bold"
                :class="[typeLabels.WATER.bg, typeLabels.WATER.color]"
              >
                {{ typeLabels.WATER.label }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">水温</span>
              <span
                v-if="
                  currentLog.tags &&
                  (currentLog.tags.includes('冰镇') || currentLog.tags.includes('滚烫'))
                "
                class="px-2 py-1 rounded-full text-xs font-bold"
                :class="
                  currentLog.tags.includes('冰镇') ? tempLabels.COLD.color : tempLabels.HOT.color
                "
              >
                {{
                  currentLog.tags.includes('冰镇') ? tempLabels.COLD.label : tempLabels.HOT.label
                }}
              </span>
              <span v-else class="text-slate-700 dark:text-slate-200">{{
                tempLabels.WARM.label
              }}</span>
            </div>
            <div
              v-if="'tags' in currentLog && currentLog.tags && currentLog.tags.length"
              class="pt-2 border-t border-slate-100 dark:border-slate-700"
            >
              <div class="text-slate-500 dark:text-slate-400 mb-1">标签</div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in currentLog.tags"
                  :key="tag"
                  class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- RPG 效果 -->
        <div
          v-if="
            !systemStore.isPureMode &&
            isFullHydrationLog(currentLog) &&
            (currentLog.healAmount || currentLog.buffEffect)
          "
          class="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 shadow-sm border border-cyan-100 dark:border-slate-600"
        >
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">💧</span>
            RPG 效果
          </h4>
          <div class="space-y-3">
            <div
              v-if="currentLog.healAmount"
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <span class="text-slate-600 dark:text-slate-300">生命恢复</span>
              <span class="font-bold text-red-500 text-lg">+{{ currentLog.healAmount }} HP</span>
            </div>
            <div
              v-if="currentLog.buffEffect"
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <span class="text-slate-600 dark:text-slate-300">特殊效果</span>
              <span class="font-bold text-blue-500 text-lg">{{ currentLog.buffEffect }}</span>
            </div>
          </div>
        </div>

        <!-- 奖励收益 - 显示金币和经验 -->
        <div
          v-if="
            !systemStore.isPureMode &&
            ('generatedGold' in currentLog || 'generatedExp' in currentLog) &&
            (currentLog.generatedGold || currentLog.generatedExp)
          "
          class="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-800"
        >
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">🎁</span>
            补水奖励
          </h4>
          <div class="space-y-3">
            <div
              v-if="currentLog.generatedGold"
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">💰</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">获得金币</span>
              </div>
              <span class="font-bold text-yellow-500 text-lg">+{{ currentLog.generatedGold }}</span>
            </div>
            <div
              v-if="currentLog.generatedExp"
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">⭐</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">获得经验</span>
              </div>
              <span class="font-bold text-purple-500 text-lg"
                >+{{ currentLog.generatedExp }} EXP</span
              >
            </div>
          </div>
        </div>

        <!-- 健康收益 - 仅RPG模式显示 -->
        <div
          v-if="!systemStore.isPureMode"
          class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 shadow-sm border border-blue-100 dark:border-blue-800"
        >
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">💦</span>
            健康收益
          </h4>
          <div class="space-y-3">
            <div
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">🧬</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">促进代谢</span>
              </div>
              <span class="font-bold text-blue-500">{{
                (currentLog.amount || 250) >= 500
                  ? '显著'
                  : (currentLog.amount || 250) >= 250
                    ? '良好'
                    : '轻微'
              }}</span>
            </div>
            <div
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">🧠</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">提升专注</span>
              </div>
              <span class="font-bold text-purple-500"
                >+{{ Math.round((currentLog.amount || 250) / 50) }}%</span
              >
            </div>
            <div
              class="flex items-center justify-between bg-white/60 dark:bg-slate-800/60 rounded-xl p-3"
            >
              <div class="flex items-center gap-2">
                <span class="text-xl">✨</span>
                <span class="text-sm text-slate-600 dark:text-slate-300">皮肤水润</span>
              </div>
              <span class="font-bold text-pink-500"
                >+{{ Math.round((currentLog.amount || 250) / 100) }}%</span
              >
            </div>
          </div>
        </div>

        <!-- 补水统计 -->
        <div
          class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <h4 class="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">📊</span>
            补水对比
          </h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">占每日目标</span>
              <span class="font-bold text-slate-700 dark:text-slate-200"
                >~{{ Math.round(((currentLog.amount || 250) / 2000) * 100) }}%</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">相当于标准杯</span>
              <span class="font-bold text-slate-700 dark:text-slate-200"
                >{{ ((currentLog.amount || 250) / 250).toFixed(1) }} 杯</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400 text-sm">体液补充</span>
              <span class="font-bold text-slate-700 dark:text-slate-200"
                >{{ ((currentLog.amount || 250) / 50).toFixed(0) }}ml 血液</span
              >
            </div>
          </div>
        </div>

        <!-- 健康小贴士 -->
        <div
          class="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-amber-800"
        >
          <h4 class="font-bold text-lg mb-3 text-slate-800 dark:text-white flex items-center">
            <span class="text-2xl mr-2">💡</span>
            健康小贴士
          </h4>
          <div class="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p class="flex items-start gap-2">
              <span class="text-amber-500 shrink-0">•</span>
              <span>{{
                currentLog.tags?.includes('茶')
                  ? '茶含有抗氧化物质，有益健康'
                  : currentLog.tags?.includes('咖啡')
                    ? '适量咖啡可提神，但不宜过量'
                    : currentLog.tags?.includes('饮料')
                      ? '注意控制饮料中的糖分摄入'
                      : '纯净水是最佳选择，不含糖分和热量'
              }}</span>
            </p>
            <p class="flex items-start gap-2">
              <span class="text-amber-500 shrink-0">•</span>
              <span>{{
                currentLog.tags?.includes('冰镇')
                  ? '冰饮会刺激肠胃，不宜空腹饮用'
                  : currentLog.tags?.includes('滚烫')
                    ? '热饮可促进血液循环'
                    : '温水最适合身体吸收'
              }}</span>
            </p>
            <p class="flex items-start gap-2">
              <span class="text-amber-500 shrink-0">•</span>
              <span>建议每天饮水 8 杯（约 2000ml），少量多次饮用效果更佳</span>
            </p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-3 pt-4">
          <button
            @click="startEdit"
            class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl active:scale-95 transition"
          >
            <i class="fas fa-edit mr-2"></i> 编辑
          </button>
          <button
            @click="deleteLog"
            class="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl active:scale-95 transition"
          >
            <i class="fas fa-trash mr-2"></i> 删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
