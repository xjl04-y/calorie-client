<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';

const store = useGameStore();
// Remove storeToRefs
// const { user, modals } = storeToRefs(store);

const show = computed({
  get: () => store.modals.levelUp,
  set: (val) => store.setModal('levelUp', val)
});

// 计算当前属性上限 (公式: 50 + Lv * 20)
const statCap = computed(() => 50 + (store.user.level * 20));
const prevStatCap = computed(() => 50 + ((store.user.level - 1) * 20));

const close = () => {
  show.value = false;
};
</script>

<template>
  <van-overlay :show="show" @click="close" class-name="flex items-center justify-center p-8 backdrop-blur-sm z-[100]">
    <div class="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center w-full max-w-sm shadow-2xl animate-bounce-in relative overflow-hidden border-4 border-yellow-300" @click.stop>
      <!-- 背景光效 -->
      <div class="absolute inset-0 bg-yellow-50 dark:bg-yellow-900/20 opacity-50 pointer-events-none"></div>
      <!-- 放射光线动画 -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div class="w-[400px] h-[400px] border-4 border-dashed border-yellow-500 rounded-full animate-spin-slow"></div>
      </div>

      <div class="text-7xl mb-4 relative z-10 transform scale-110">🆙</div>
      <h2 class="text-3xl font-rpg text-yellow-600 dark:text-yellow-400 mb-1 relative z-10 drop-shadow-sm">LEVEL UP!</h2>

      <div class="text-lg text-slate-500 dark:text-slate-300 mb-6 relative z-10">
        恭喜达到 <span class="text-yellow-600 dark:text-yellow-400 font-black text-3xl">Lv.{{ store.user.level }}</span>
      </div>

      <!-- 奖励列表 -->
      <div class="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 mb-6 relative z-10 text-left space-y-2 border border-yellow-100 dark:border-yellow-700">
        <div class="flex items-center text-sm">
          <span class="w-6 text-center mr-2">❤️</span>
          <span class="flex-1 text-slate-700 dark:text-slate-200 font-bold">HP 部分恢复</span>
          <span class="text-green-500 font-bold text-xs">+20%</span>
        </div>
        <div class="flex items-center text-sm">
          <span class="w-6 text-center mr-2">💪</span>
          <span class="flex-1 text-slate-700 dark:text-slate-200 font-bold">属性上限提升</span>
          <span class="text-blue-500 font-bold text-xs">{{ prevStatCap }} ➔ {{ statCap }}</span>
        </div>
        <div class="flex items-center text-sm">
          <span class="w-6 text-center mr-2">✨</span>
          <span class="flex-1 text-slate-700 dark:text-slate-200 font-bold">每日基础代谢</span>
          <span class="text-purple-500 font-bold text-xs">微量提升</span>
        </div>
      </div>

      <van-button block round color="linear-gradient(to right, #f59e0b, #d97706)" @click="close" class="font-bold shadow-lg shadow-yellow-500/30 dark:shadow-none relative z-10 animate-pulse">
        我变强了！
      </van-button>
    </div>
  </van-overlay>
</template>

<style scoped>
.animate-bounce-in { animation: bounce-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
.animate-spin-slow { animation: spin 10s linear infinite; }
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
