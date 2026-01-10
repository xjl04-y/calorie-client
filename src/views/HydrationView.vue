<script setup lang="ts">
/**
 * HydrationView.vue - 纯净模式补水记录页面
 * [New V6.0] 独立的补水记录页面，支持 RPG 和纯净模式
 * [Fix V6.1] 添加目标设置功能
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/counter';
import { useHydrationStore } from '@/stores/useHydrationStore';
import { showToast } from 'vant';

const router = useRouter();
const store = useGameStore();
const hydrationStore = useHydrationStore();

// [Fix V6.1] 目标设置相关状态
const isSettingsOpen = ref(false);
const settingsForm = ref({
  targetCups: 8,
  cupSize: 250
});

// 当前配置
const currentConfig = computed(() => hydrationStore.hydrationConfig);

// 打开设置
function openSettings() {
  settingsForm.value = {
    targetCups: currentConfig.value.dailyTargetCups || 8,
    cupSize: currentConfig.value.cupSizeMl || 250
  };
  isSettingsOpen.value = true;
}

// 保存设置
function saveSettings() {
  hydrationStore.updateConfig({
    dailyTargetCups: settingsForm.value.targetCups,
    cupSizeMl: settingsForm.value.cupSize
  });
  store.saveState();
  isSettingsOpen.value = false;
  showToast({ type: 'success', message: '目标已更新' });
}

// 饮品预设
const presets = computed(() => hydrationStore.DRINK_PRESETS);

// 选中的预设
const selectedPresetId = ref('water');
const selectedPreset = computed(() => {
  return presets.value.find(p => p.id === selectedPresetId.value) || presets.value[0];
});

// 饮水量
const amount = ref(250);

// 今日进度
const progress = computed(() => hydrationStore.todayProgress);

// 建议
const suggestion = computed(() => hydrationStore.getSuggestion());

// 进度条颜色
const progressColor = computed(() => {
  const pct = progress.value.percentage;
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-blue-500';
  if (pct >= 40) return 'bg-yellow-500';
  return 'bg-orange-500';
});

// 选择预设
function selectPreset(id: string) {
  selectedPresetId.value = id;
  const preset = presets.value.find(p => p.id === id);
  if (preset) {
    amount.value = preset.defaultAmount;
  }
}

// 快速补水
function handleQuickDrink() {
  hydrationStore.quickDrink(selectedPresetId.value);
  showToast({ type: 'success', message: `💧 +${selectedPreset.value.defaultAmount}ml` });
}

// 自定义补水
function handleCustomDrink() {
  if (amount.value <= 0) {
    showToast('请输入饮水量');
    return;
  }
  
  hydrationStore.commitHydration({
    name: selectedPreset.value.name,
    icon: selectedPreset.value.icon,
    amount: amount.value,
    type: selectedPreset.value.type
  });
  
  showToast({ type: 'success', message: `💧 补水 +${amount.value}ml` });
}

// 今日记录
const todayLogs = computed(() => hydrationStore.todayLogs);
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 pb-safe flex flex-col">
    <!-- 顶部导航 -->
    <div class="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 z-50 px-4 h-14 flex items-center justify-between">
      <button @click="router.back()" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-arrow-left text-slate-600 dark:text-slate-300"></i>
      </button>
      <span class="font-bold text-slate-800 dark:text-white">💧 补水站</span>
      <!-- [Fix V6.1] 设置按钮 -->
      <button @click="openSettings" class="w-8 h-8 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 transition">
        <i class="fas fa-cog text-slate-500 dark:text-slate-400"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      
      <!-- [Fix V6.1] 目标设置面板 -->
      <div v-if="isSettingsOpen" class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-5 animate-fade-in">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-slate-800 dark:text-white">⚙️ 补水目标设置</h3>
          <button @click="isSettingsOpen = false" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <!-- 每日目标杯数 -->
          <div>
            <label class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 block">每日目标 (杯)</label>
            <div class="flex items-center gap-3">
              <button @click="settingsForm.targetCups = Math.max(1, settingsForm.targetCups - 1)" 
                      class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">-</button>
              <div class="flex-1 text-center">
                <span class="text-3xl font-black text-blue-600">{{ settingsForm.targetCups }}</span>
                <span class="text-sm text-slate-400 ml-1">杯</span>
              </div>
              <button @click="settingsForm.targetCups = Math.min(20, settingsForm.targetCups + 1)" 
                      class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">+</button>
            </div>
            <div class="flex justify-center gap-2 mt-2">
              <button v-for="n in [6, 8, 10, 12]" :key="n" @click="settingsForm.targetCups = n"
                      class="px-3 py-1 rounded-full text-xs font-medium transition"
                      :class="settingsForm.targetCups === n ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'"
              >{{ n }}杯</button>
            </div>
          </div>
          
          <!-- 单杯容量 -->
          <div>
            <label class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 block">单杯容量 (ml)</label>
            <div class="flex items-center gap-3">
              <button @click="settingsForm.cupSize = Math.max(100, settingsForm.cupSize - 50)" 
                      class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">-</button>
              <div class="flex-1 text-center">
                <span class="text-3xl font-black text-cyan-600">{{ settingsForm.cupSize }}</span>
                <span class="text-sm text-slate-400 ml-1">ml</span>
              </div>
              <button @click="settingsForm.cupSize = Math.min(500, settingsForm.cupSize + 50)" 
                      class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">+</button>
            </div>
            <div class="flex justify-center gap-2 mt-2">
              <button v-for="s in [200, 250, 300, 350]" :key="s" @click="settingsForm.cupSize = s"
                      class="px-3 py-1 rounded-full text-xs font-medium transition"
                      :class="settingsForm.cupSize === s ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'"
              >{{ s }}ml</button>
            </div>
          </div>
          
          <!-- 预计每日摄入 -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <div class="text-xs text-slate-500 mb-1">每日目标摄入量</div>
            <div class="text-2xl font-black text-blue-600">{{ settingsForm.targetCups * settingsForm.cupSize }} ml</div>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button @click="isSettingsOpen = false" class="flex-1 py-3 rounded-xl font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            取消
          </button>
          <button @click="saveSettings" class="flex-[2] py-3 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            保存设置
          </button>
        </div>
      </div>
      
      <!-- 今日进度卡片 -->
      <div class="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-5 text-white">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-xs opacity-80 mb-1">今日饮水</div>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black">{{ progress.amount }}</span>
              <span class="text-sm opacity-80">/ {{ progress.target }} ml</span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-4xl font-black">{{ progress.percentage }}%</div>
            <div class="text-xs opacity-80">{{ progress.cups }} 杯</div>
          </div>
        </div>
        
        <!-- 进度条 -->
        <div class="h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            class="h-full transition-all duration-500 rounded-full"
            :class="progressColor"
            :style="{ width: `${Math.min(100, progress.percentage)}%` }"
          ></div>
        </div>
        
        <!-- 完成提示 -->
        <div v-if="progress.isComplete" class="mt-3 text-center">
          <span class="text-lg">🎉 今日目标已达成！继续保持！</span>
        </div>
        <div v-else class="mt-3 text-center opacity-80">
          <span>还需 {{ progress.remaining }} ml</span>
        </div>
      </div>

      <!-- 建议提示 -->
      <div 
        class="flex items-center gap-3 p-4 rounded-xl"
        :class="{
          'bg-yellow-50 dark:bg-yellow-900/20': suggestion.type === 'WARN',
          'bg-green-50 dark:bg-green-900/20': suggestion.type === 'GOOD',
          'bg-blue-50 dark:bg-blue-900/20': suggestion.type === 'INFO'
        }"
      >
        <span class="text-2xl">{{ suggestion.icon }}</span>
        <span 
          class="text-sm font-medium"
          :class="{
            'text-yellow-700 dark:text-yellow-300': suggestion.type === 'WARN',
            'text-green-700 dark:text-green-300': suggestion.type === 'GOOD',
            'text-blue-700 dark:text-blue-300': suggestion.type === 'INFO'
          }"
        >{{ suggestion.message }}</span>
      </div>

      <!-- 饮品类型选择 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">选择饮品</h3>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="preset in presets"
            :key="preset.id"
            @click="selectPreset(preset.id)"
            class="flex flex-col items-center p-3 rounded-xl border-2 transition-all"
            :class="selectedPresetId === preset.id 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'"
          >
            <span class="text-2xl mb-1">{{ preset.icon }}</span>
            <span class="text-xs font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">{{ preset.name }}</span>
          </button>
        </div>
      </div>

      <!-- 饮水量调节 -->
      <div>
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">饮水量 (ml)</h3>
        <div class="flex items-center gap-3">
          <button 
            @click="amount = Math.max(50, amount - 50)"
            class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xl active:scale-95 transition"
          >-</button>
          <input
            v-model.number="amount"
            type="number"
            min="50"
            step="50"
            class="flex-1 text-center text-2xl font-black py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
          />
          <button 
            @click="amount += 50"
            class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xl active:scale-95 transition"
          >+</button>
        </div>
        <!-- 快速选择 -->
        <div class="flex gap-2 mt-2">
          <button 
            v-for="a in [150, 250, 350, 500]" 
            :key="a"
            @click="amount = a"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition"
            :class="amount === a ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
          >{{ a }}ml</button>
        </div>
      </div>

      <!-- 今日记录列表 -->
      <div v-if="todayLogs.length > 0">
        <h3 class="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">今日记录</h3>
        <div class="space-y-2">
          <div 
            v-for="log in todayLogs.slice(0, 5)" 
            :key="log.id"
            class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ log.icon }}</span>
              <div>
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ log.name }}</div>
                <div class="text-xs text-slate-400">{{ new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</div>
              </div>
            </div>
            <span class="text-sm font-bold text-blue-500">+{{ log.amount }}ml</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 底部操作按钮 -->
    <div class="sticky bottom-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
      <div class="flex gap-3">
        <!-- 快速一杯 -->
        <button
          @click="handleQuickDrink"
          class="flex-1 py-4 rounded-2xl font-bold text-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 active:scale-[0.98] transition-all"
        >
          {{ selectedPreset.icon }} 快速一杯
        </button>
        <!-- 自定义 -->
        <button
          @click="handleCustomDrink"
          class="flex-1 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
        >
          💧 记录 {{ amount }}ml
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
