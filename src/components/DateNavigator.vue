<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import { showToast } from 'vant';

const store = useGameStore();
const { currentDate } = storeToRefs(store);

const showCalendar = ref(false);

// 日期显示格式化
const dateText = computed(() => {
  const [y, m, d] = currentDate.value.split('-').map(Number);
  return `${m}月${d}日`;
});

// 获取本地日期字符串 YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isToday = computed(() => currentDate.value === getLocalDateStr());

// 确认选择日期
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
