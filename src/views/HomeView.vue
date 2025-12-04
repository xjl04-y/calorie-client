<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import AppHud from '@/components/AppHud.vue';
import DateNavigator from '@/components/DateNavigator.vue';
import { showConfirmDialog } from 'vant'

const store = useGameStore();
const { user, stageInfo, dailyTarget } = storeToRefs(store);

// 计算属性：HP 条颜色
const hpPercent = computed(() => {
  if (!stageInfo.value.currentObj) return 0;
  return Math.floor((stageInfo.value.currentHpRemaining / stageInfo.value.currentObj.maxHp) * 100);
});

const hpBarColor = computed(() => {
  if (stageInfo.value.isOverloaded) return 'bg-red-600';
  if (hpPercent.value < 20) return 'bg-red-500';
  if (hpPercent.value < 50) return 'bg-yellow-500';
  return 'bg-green-500';
});

// 撤销日志
const confirmDelete = (log: any) => {
  showConfirmDialog({
    title: '撤销行动?',
    message: '这也将删除获得的经验值。',
  }).then(() => {
    // 调用 store action 删除
    // store.deleteLog(log.id);
  });
};

const rpgMeals = [
  { key: 'BREAKFAST', label: '早餐', rpgName: '晨间补给', icon: '🌅' },
  { key: 'LUNCH', label: '午餐', rpgName: '营火烹饪', icon: '⛺' },
  { key: 'DINNER', label: '晚餐', rpgName: '庆功晚宴', icon: '🏰' },
  { key: 'SNACK', label: '零食', rpgName: '炼金药剂', icon: '🧪' }
];

const openAddFood = (key: any) => {
  store.temp.activeMealType = key;
  store.setModal('addFood', true);
}
</script>

<template>
  <div class="pb-24">
    <!-- 头部 HUD 组件 -->
    <AppHud @open-achievements="store.setModal('achievements', true)" />

    <!-- 日期选择器组件 -->
    <DateNavigator />

    <!-- 怪物战斗卡片 -->
    <div class="mx-4 mt-4 bg-slate-900 dark:bg-black rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border-2"
         :class="stageInfo.isOverloaded ? 'border-red-500 shadow-red-500/50' : 'border-slate-700'">

      <!-- 背景纹理 -->
      <div class="absolute inset-0 opacity-10 bg-pattern"></div>

      <!-- Boss 信息与 HP 条 -->
      <div class="relative z-10 flex items-center justify-between mb-4">
        <div class="flex items-center">
          <div class="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center text-4xl border border-slate-600">
            {{ stageInfo.currentObj.data.icon }}
          </div>
          <div class="ml-3">
            <div class="text-xl font-rpg">{{ stageInfo.currentObj.data.name }}</div>
            <div class="text-[10px] text-slate-400">弱点: {{ stageInfo.currentObj.data.weakness }}</div>
          </div>
        </div>
        <div class="text-2xl font-black font-mono">{{ stageInfo.currentHpRemaining }}</div>
      </div>

      <!-- HP Bar -->
      <div class="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-4">
        <div class="h-full transition-all duration-1000 ease-out" :class="hpBarColor" :style="{ width: hpPercent + '%' }"></div>
      </div>
    </div>

    <!-- 膳食/行动入口 -->
    <div class="px-4 mt-6 mb-2"><h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">冒险行动</h3></div>
    <div class="px-4 grid grid-cols-2 gap-3 mb-6">
      <div v-for="m in rpgMeals" :key="m.key" @click="openAddFood(m.key)"
           class="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-slate-700 active:scale-95 transition cursor-pointer">
        <div class="text-2xl">{{ m.icon }}</div>
        <div>
          <div class="text-sm font-bold dark:text-slate-200">{{ m.rpgName }}</div>
          <div class="text-[10px] text-slate-400">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- 战斗日志列表 (使用 SwipeCell) -->
    <div class="bg-white dark:bg-slate-800 rounded-t-3xl min-h-[300px] p-5 pb-20 shadow-up">
      <!-- ... 使用 v-for 遍历 store.todayLogs ... -->
      <!-- 结构与原 HTML log 列表一致，但使用 store 数据 -->
    </div>
  </div>
</template>

<style scoped>
.bg-pattern { background-image: url('https://www.transparenttextures.com/patterns/cubes.png'); }
.shadow-up { box-shadow: 0 -4px 20px rgba(0,0,0,0.02); }
</style>
