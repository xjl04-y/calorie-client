<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast } from 'vant';
import type { FoodLog } from '@/types';
// [Import] 引入数据处理工具
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';

// 创建类型守卫函数
function isFullFoodLog(log: unknown): log is FoodLog & { damageTaken: number; healed: number; blocked: number } {
  return !!(log && typeof log === 'object' && 'mealType' in log && 'damageTaken' in log);
}

const router = useRouter();
const store = useGameStore();
const systemStore = useSystemStore();

// 获取当前日志
const currentLog = computed(() => {
  if (systemStore.temp.selectedLog) {
    return systemStore.temp.selectedLog;
  }
  return null;
});

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

// ==========================================
// [DEBUG版本] 图标处理逻辑
// ==========================================
const getIconDisplay = (item: unknown) => {
  // 类型断言为包含必要属性的对象
  const typedItem = item as { name?: string; icon?: string; tags?: string[] };
  const DEBUG_PREFIX = `[IconDebug - ${typedItem?.name || 'Unknown'}]:`;

  if (!item) return { isSymbol: false, isImage: false, content: '' };

  let iconRaw = (typedItem.icon || '').trim(); // 去除首尾空格

  // 1. 脏数据清洗
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // console.log(`${DEBUG_PREFIX} Start processing '${iconRaw}'`);

  // 2. 图片 URL
  if (iconRaw.includes('/') || iconRaw.startsWith('http')) {
    // console.log(`${DEBUG_PREFIX} Detected as Image`);
    return { isSymbol: false, isImage: true, content: iconRaw };
  }

  // 3. 尝试提取 icon-xxx 并验证
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      const valid = isValidIcon(extractedId);

      console.log(`${DEBUG_PREFIX} Extracted ID: ${extractedId}, Valid in JSON: ${valid}`);

      if (valid) {
        return { isSymbol: true, isImage: false, content: extractedId };
      } else {
        console.warn(`${DEBUG_PREFIX} Validation failed for ${extractedId}. It might be missing in iconfont.json or BROKEN_ICONS list.`);
      }
    } else {
      console.warn(`${DEBUG_PREFIX} Regex failed to match icon- pattern in '${iconRaw}'`);
    }
  }

  // 4. 兜底逻辑 (尝试重新分配)
  const effectiveTags = (typedItem.tags && typedItem.tags.length > 0)
    ? typedItem.tags
    : inferTags(typedItem.name || '');

  const assigned = assignIcon(typedItem.name || '', effectiveTags);
  console.log(`${DEBUG_PREFIX} Fallback assigned: ${assigned}`);

  if (assigned) {
    return { isSymbol: true, isImage: false, content: assigned };
  }

  // 5. 实在没办法，显示文字
  console.log(`${DEBUG_PREFIX} Final fallback to text: ${iconRaw}`);
  return { isSymbol: false, isImage: false, content: iconRaw || '❓' };
};

// 表单状态
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

const deleteLog = () => {
  if (!currentLog.value) return;
  const removed = store.deleteLog(currentLog.value);
  if (removed) {
    showToast('记录已删除');
    router.back();
  }
};

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

// const saveEdit = () => {
//   showToast('编辑功能正在开发中');
//   isEditing.value = false;
// };
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between">
      <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">🥗 食物详情 (Debug)</span>
      <div class="w-8 h-8"></div>
    </div>

    <div class="flex-1 p-4">
      <div v-if="currentLog" class="space-y-6">
        <!-- 食物信息卡片 -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div class="flex flex-col items-center mb-6">

            <!-- 智能图标显示区域 -->
            <div class="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm mb-4 overflow-hidden relative group">

              <!-- Image 模式 -->
              <template v-if="getIconDisplay(currentLog).isImage">
                <img :src="getIconDisplay(currentLog).content" class="w-full h-full object-cover" alt="icon" />
              </template>

              <!-- Symbol 模式 (SVG) -->
              <template v-else-if="getIconDisplay(currentLog).isSymbol">
                <svg class="icon text-6xl text-slate-800 dark:text-white" aria-hidden="true">
                  <use :xlink:href="'#' + getIconDisplay(currentLog).content"></use>
                </svg>
              </template>

              <!-- 文字回退模式 -->
              <template v-else>
                <div class="flex flex-col items-center justify-center p-2 text-center">
                  <span class="text-xs text-red-400 mb-1">Invalid Icon</span>
                  <span class="text-sm font-mono break-all leading-tight">{{ getIconDisplay(currentLog).content }}</span>
                </div>
              </template>

              <!-- DEBUG 浮层 (鼠标悬停显示) -->
              <div class="absolute inset-0 bg-black/80 text-white text-[10px] p-1 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div>Raw: {{ currentLog.icon }}</div>
                <div>Res: {{ getIconDisplay(currentLog).content }}</div>
                <div>Sym: {{ getIconDisplay(currentLog).isSymbol }}</div>
              </div>
            </div>

            <!-- 显式调试信息 (帮助你定位问题) -->
            <div class="mb-4 p-2 bg-slate-100 dark:bg-slate-900 rounded text-[10px] font-mono text-slate-500 w-full break-all">
              <strong>DEBUG INFO:</strong><br/>
              Raw: "{{ currentLog.icon }}"<br/>
              Result: {{ JSON.stringify(getIconDisplay(currentLog)) }}
            </div>

            <div class="text-center">
              <div class="text-2xl font-bold text-slate-800 dark:text-white mb-1">{{ currentLog.name }}</div>
              <div class="text-slate-500 dark:text-slate-400 text-sm">{{ new Date(currentLog.timestamp).toLocaleString() }}</div>
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

<style scoped>
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
