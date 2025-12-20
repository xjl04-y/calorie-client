<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
// 移除 storeToRefs，避免在此架构下出现解包错误
// import { storeToRefs } from 'pinia';
import { showToast } from 'vant';
import { getLocalDateStr, isSameDay } from '@/utils/dateUtils';

const store = useGameStore();
// 移除 storeToRefs 调用
// const { currentDate } = storeToRefs(store);

const showCalendar = ref(false);

// 日期显示格式化
const dateText = computed(() => {
  // 直接通过 store.currentDate 访问（Pinia 会自动解包，不需要 .value）
  const [y, m, d] = store.currentDate.split('-').map(Number);
  return `${m}月${d}日`;
});

// 直接使用 store.currentDate
const isToday = computed(() => store.currentDate === getLocalDateStr());

// [工单03] 确认选择日期
// 注意：修改 store.currentDate 后，所有依赖 systemStore.currentDate 的 Store 都会自动同步
// 包括: logStore (todayLogs), hydrationStore (todayLogs), battleStore (怪物、进度) 等
const onConfirm = (date: Date) => {
  store.currentDate = getLocalDateStr(date);
  showCalendar.value = false;
};

// 回到今天
const resetToToday = () => {
  store.currentDate = getLocalDateStr();
  showToast('传送成功');
};

// 日历范围配置
const today = new Date();
const minDate = new Date(2025, 0, 1); // 2025-01-01
const maxDate = today;
</script>

<template>
  <div class="sticky top-[var(--status-bar-height)] z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 transition-colors duration-300">
    <van-cell
      :title="dateText"
      is-link
      arrow-direction="down"
      @click="showCalendar = true"
      class="!rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 !items-center font-bold text-slate-700 dark:text-slate-200 dark:bg-slate-800"
    >
      <template #icon>
        <i class="far fa-calendar-alt text-purple-600 text-lg mr-2"></i>
      </template>
      <template #value>
        <van-button
          v-if="!isToday"
          size="mini"
          type="primary"
          color="#1e293b"
          @click.stop="resetToToday"
        >
          回到今天
        </van-button>
      </template>
    </van-cell>

    <van-calendar
      v-model:show="showCalendar"
      @confirm="onConfirm"
      color="#7c3aed"
      :min-date="minDate"
      :max-date="maxDate"
      round
      teleport="body"
      :style="{ height: '500px' }"
    />
  </div>
</template>

<style scoped>
/* Vant Calendar Dark Mode Override */
:deep(.van-calendar) {
  @apply dark:bg-slate-800 dark:text-white;
}
:deep(.van-calendar__day) {
  @apply dark:text-slate-200;
}
:deep(.van-calendar__day--disabled) {
  @apply dark:text-slate-600 dark:opacity-30;
}
</style>
