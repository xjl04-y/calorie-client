<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { showToast } from 'vant';
import { getLocalDateStr } from '@/utils/dateUtils';

const store = useGameStore();

const showCalendar = ref(false);

// 日期显示格式化
const dateText = computed(() => {
  const [ m, d] = store.currentDate.split('-').map(Number);
  return `${m}月${d}日`;
});

const isToday = computed(() => store.currentDate === getLocalDateStr());

const onConfirm = (date: Date) => {
  store.currentDate = getLocalDateStr(date);
  showCalendar.value = false;
};

const resetToToday = () => {
  store.currentDate = getLocalDateStr();
  showToast('传送成功');
};

const today = new Date();
const minDate = new Date(2025, 0, 1);
const maxDate = today;
</script>

<template>
  <div class="sticky top-[var(--status-bar-height)] z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 transition-colors duration-300">
    <!-- 日期条：统一使用干净的样式，图标颜色改为天蓝 -->
    <van-cell
      :title="dateText"
      is-link
      arrow-direction="down"
      @click="showCalendar = true"
      class="!rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 !items-center font-bold text-slate-700 dark:text-slate-200 dark:bg-slate-800"
    >
      <template #icon>
        <!-- Icon: Purple -> Sky Blue -->
        <i class="far fa-calendar-alt text-sky-500 text-lg mr-2"></i>
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

    <!-- 日历组件：将选选中色从紫色改为了天蓝色 (#0ea5e9) -->
    <van-calendar
      v-model:show="showCalendar"
      @confirm="onConfirm"
      color="#0ea5e9"
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
