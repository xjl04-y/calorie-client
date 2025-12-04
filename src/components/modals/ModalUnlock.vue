<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useGameStore();
const { temp } = storeToRefs(store);

const show = computed({
  get: () => store.modals.unlock,
  set: (val) => store.setModal('unlock', val)
});

const achievement = computed(() => temp.value.unlockedAchievement);

const claim = () => {
  show.value = false;
  // 这里可以添加领取音效或额外的逻辑
};
</script>

<template>
  <van-overlay :show="show" @click="claim" class-name="flex items-center justify-center p-8 backdrop-blur-md z-[200]">
    <div class="text-center relative w-full flex flex-col items-center justify-center h-full">
      <!-- 背景光效 -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-[500px] h-[500px] bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="w-[600px] h-[600px] border-4 border-dashed border-yellow-300/30 rounded-full absolute anim-rays"></div>
      </div>

      <!-- 内容主体 -->
      <div class="relative z-10 anim-pop">
        <div class="text-9xl mb-4 drop-shadow-2xl filter">{{ achievement?.icon }}</div>
        <div class="text-3xl font-rpg text-yellow-300 mb-2 drop-shadow-md tracking-wider">解锁成就!</div>
        <div class="text-xl font-bold text-white mb-2">{{ achievement?.name }}</div>
        <div class="text-sm text-yellow-100/80 max-w-xs mx-auto">{{ achievement?.desc }}</div>

        <div class="mt-4 bg-white/10 rounded-lg p-2 text-xs text-green-300 font-bold border border-white/20">
          获得装备: {{ achievement?.reward }} <br>
          <span class="text-yellow-400">{{ achievement?.stats }}</span>
        </div>
      </div>

      <!-- 按钮 (延迟显示) -->
      <div class="mt-8 opacity-0 animate-[fadeIn_1s_ease_1s_forwards]">
        <van-button round color="linear-gradient(to right, #f59e0b, #d97706)" class="w-40 font-bold shadow-lg shadow-yellow-500/50" @click="claim">
          收入囊中
        </van-button>
      </div>
    </div>
  </van-overlay>
</template>

<style scoped>
.anim-rays { animation: spin-slow 20s linear infinite; }
.anim-pop { animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes spin-slow { 100% { transform: rotate(360deg); } }
@keyframes pop-in { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes fadeIn { to { opacity: 1; } }
</style>
