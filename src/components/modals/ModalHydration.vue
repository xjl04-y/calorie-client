<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, showNotify } from 'vant';
import type { FoodItem, MealType } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.hydration,
  set: (val) => systemStore.setModal('hydration', val)
});

const isPure = computed(() => systemStore.isPureMode);
const config = computed(() => store.user.hydration || {
  dailyTargetCups: 8, cupSizeMl: 250, reminderInterval: 60, enableNotifications: false
});

// ... existing computed properties (todayWaterLogs, currentCups, currentMl, progressPercent) ...
const todayWaterLogs = computed(() => {
  return store.todayLogs.filter(l =>
    l.mealType === 'HYDRATION' || (l.category === 'DRINK' && l.tags?.includes('纯净'))
  );
});

const currentCups = computed(() => todayWaterLogs.value.length);
const currentMl = computed(() => {
  return todayWaterLogs.value.reduce((sum, log) => sum + (log.grams || config.value.cupSizeMl), 0);
});

const progressPercent = computed(() => {
  const target = config.value.dailyTargetCups;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((currentCups.value / target) * 100));
});

// ... existing editing logic ...
const isEditing = ref(false);
const editForm = ref({ target: 8, size: 250, interval: 60, notify: false });

const openSettings = () => {
  editForm.value = {
    target: config.value.dailyTargetCups || 8,
    size: config.value.cupSizeMl || 250,
    interval: config.value.reminderInterval || 60,
    notify: !!config.value.enableNotifications
  };
  isEditing.value = true;
};

const cancelSettings = () => { isEditing.value = false; };

const saveSettings = () => {
  if (!store.user.hydration) {
    store.user.hydration = { dailyTargetCups: 8, cupSizeMl: 250, reminderInterval: 60, enableNotifications: false };
  }
  store.user.hydration.dailyTargetCups = editForm.value.target;
  store.user.hydration.cupSizeMl = editForm.value.size;
  store.user.hydration.reminderInterval = editForm.value.interval;
  store.user.hydration.enableNotifications = editForm.value.notify;
  if (editForm.value.notify) showToast('提醒服务已更新 (模拟)');
  store.saveState();
  isEditing.value = false;
  showToast('计划已更新');
};

const drinkWater = () => {
  const itemName = isPure.value ? '补水' : '净化之泉';

  const waterItem: FoodItem = {
    id: Date.now(),
    name: itemName,
    icon: '💧',
    calories: 0,
    p: 0, c: 0, f: 0,
    grams: config.value.cupSizeMl,
    unit: '杯',
    category: 'DRINK',
    tags: ['纯净', '无糖'],
    tips: isPure.value ? '补充水分' : '恢复微量生命，清除异常状态'
  };

  store.battleCommit(waterItem, 'HYDRATION');

  store.user.hydration.lastDrinkTime = Date.now();
  store.saveState();

  if (!isPure.value) {
    // [V4.3] 触发净化特效
    systemStore.triggerHealEffect();
    showNotify({ type: 'primary', message: '💧 净化之水！身心舒畅！' });
  } else {
    showToast({ type: 'success', message: '💧 补水 +1' });
  }
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: 'auto', maxHeight: '80%' }" class="dark:bg-slate-900 pb-safe">
    <div class="p-6 bg-slate-50 dark:bg-slate-900 min-h-[400px] flex flex-col relative overflow-hidden">

      <!-- 背景装饰 -->
      <div v-if="!isPure" class="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <!-- 头部 -->
      <div class="flex justify-between items-center mb-6 relative z-10">
        <h3 class="font-bold text-xl flex items-center dark:text-white">
          <i class="fas fa-tint text-blue-500 mr-2"></i>
          {{ isPure ? '补水计划' : '生命之源' }}
        </h3>
        <button v-if="!isEditing" @click="openSettings" class="text-xs text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition">
          <i class="fas fa-cog mr-1"></i> 计划设置
        </button>
      </div>

      <!-- 设置面板 -->
      <div v-if="isEditing" class="space-y-4 mb-6 relative z-10 animate-fade-in">
        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">每日目标 (杯)</span>
            <van-stepper v-model="editForm.target" min="1" max="20" button-size="24px" />
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">单杯容量 (ml)</span>
            <van-stepper v-model="editForm.size" min="50" max="1000" step="50" button-size="24px" />
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">提醒间隔 (分钟)</span>
            <van-stepper v-model="editForm.interval" min="30" max="240" step="30" button-size="24px" />
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <span class="text-sm font-bold text-slate-600 dark:text-slate-300">开启系统通知</span>
            <van-switch v-model="editForm.notify" size="20px" active-color="#3b82f6" />
          </div>
        </div>
        <div class="flex gap-3">
          <van-button class="flex-1" plain round @click="cancelSettings">取消</van-button>
          <van-button class="flex-[2]" color="#3b82f6" round @click="saveSettings">保存计划</van-button>
        </div>
      </div>

      <!-- 主面板 -->
      <div v-else class="flex-1 flex flex-col items-center justify-center relative z-10">

        <!-- 水球进度 -->
        <div class="relative w-48 h-48 mb-8 cursor-pointer active:scale-95 transition-transform" @click="drinkWater">
          <div class="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30 z-20 shadow-xl"></div>
          <div class="absolute inset-2 rounded-full overflow-hidden bg-white dark:bg-slate-800 z-10">
            <div class="absolute bottom-0 left-0 right-0 bg-blue-400 transition-all duration-1000 ease-in-out wave-anim opacity-80"
                 :style="{ height: progressPercent + '%' }"></div>
            <div class="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-1000 ease-in-out wave-anim opacity-60"
                 :style="{ height: (progressPercent - 5) + '%', animationDelay: '-1s' }"></div>
          </div>
          <div class="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <div class="text-4xl font-black text-slate-800 dark:text-white drop-shadow-sm">{{ currentCups }} <span class="text-lg text-slate-400 font-normal">/ {{ config.dailyTargetCups }}</span></div>
            <div class="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/50 px-2 py-0.5 rounded-full mt-1">
              {{ currentMl }} ml
            </div>
          </div>
          <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-slate-400 animate-bounce">
            👇 点击补水
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 w-full mb-4">
          <div class="bg-blue-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-blue-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">下次提醒</div>
            <div class="font-bold text-slate-700 dark:text-slate-200">
              {{ config.enableNotifications ? `${config.reminderInterval}分钟后` : '未开启' }}
            </div>
          </div>
          <div class="bg-green-50 dark:bg-slate-800 p-3 rounded-xl text-center border border-green-100 dark:border-slate-700">
            <div class="text-xs text-slate-500 mb-1">完成度</div>
            <div class="font-bold text-green-600">
              {{ progressPercent }}%
            </div>
          </div>
        </div>

        <div v-if="!isPure" class="text-center text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg">
          <i class="fas fa-info-circle mr-1"></i> 提示：喝水可以清除部分负面状态 (如高盐) 并少量回血。
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.wave-anim { animation: wave 4s infinite linear; }
@keyframes wave {
  0% { transform: scaleX(1.5) translateX(0); }
  50% { transform: scaleX(1.5) translateX(-25%); }
  100% { transform: scaleX(1.5) translateX(0); }
}
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
</style>
