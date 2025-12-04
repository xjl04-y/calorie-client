<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useGameStore();
const { user, modals } = storeToRefs(store);

const show = computed({
  get: () => modals.value.levelUp,
  set: (val) => store.setModal('levelUp', val)
});

// 升级会重置 HP，通常在 store action 中处理，这里只负责展示
const close = () => {
  show.value = false;
};
</script>

<template>
  <van-overlay :show="show" @click="close" class-name="flex items-center justify-center p-8 backdrop-blur-sm z-[100]">
    <div class="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl animate-bounce-in relative overflow-hidden border-4 border-yellow-300" @click.stop>
      <!-- 背景光效 -->
      <div class="absolute inset-0 bg-yellow-50 dark:bg-yellow-900/20 opacity-50 pointer-events-none"></div>

      <div class="text-7xl mb-4 relative z-10">🆙</div>
      <h2 class="text-3xl font-rpg text-yellow-600 dark:text-yellow-400 mb-2 relative z-10">LEVEL UP!</h2>

      <div class="text-lg text-slate-500 dark:text-slate-300 mb-8 relative z-10">
        恭喜达到 <span class="text-yellow-600 dark:text-yellow-400 font-bold text-2xl">Lv.{{ user.level }}</span>
      </div>

      <van-button block round color="linear-gradient(to right, #f59e0b, #d97706)" @click="close" class="font-bold shadow-lg shadow-yellow-200 dark:shadow-none relative z-10">
        太棒了
      </van-button>
    </div>
  </van-overlay>
</template>

<style scoped>
.animate-bounce-in {
  animation: bounce-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
