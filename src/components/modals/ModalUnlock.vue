<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { showToast } from 'vant';

const store = useGameStore();
// Remove storeToRefs
// const { temp } = storeToRefs(store);

const show = computed({
  get: () => store.modals.unlock,
  set: (val) => store.setModal('unlock', val)
});

const achievement = computed(() => store.temp.unlockedAchievement);

const claim = () => {
  show.value = false;
};

const equipNow = () => {
  if (achievement.value) {
    store.equipItem(achievement.value);
    showToast(`⚔️ 已装备 ${achievement.value.reward}，战力提升！`);
    show.value = false;
  }
};
</script>

<template>
  <van-overlay :show="show" class-name="flex items-center justify-center p-8 backdrop-blur-md z-[200]">
    <div class="text-center relative w-full flex flex-col items-center justify-center h-full" @click.stop>
      <!-- 关闭按钮 -->
      <div class="absolute top-10 right-0 z-50 p-4 cursor-pointer text-white/50 hover:text-white" @click="claim">
        <i class="fas fa-times text-2xl"></i>
      </div>

      <!-- 背景光效 -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-[500px] h-[500px] bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="w-[600px] h-[600px] border-4 border-dashed border-yellow-300/30 rounded-full absolute anim-rays"></div>
      </div>

      <!-- 内容主体 -->
      <div class="relative z-10 anim-pop">
        <div class="text-9xl mb-4 drop-shadow-2xl filter transform hover:scale-110 transition-transform duration-500">{{ achievement?.icon }}</div>
        <div class="text-3xl font-rpg text-yellow-300 mb-2 drop-shadow-md tracking-wider">解锁成就!</div>
        <div class="text-xl font-bold text-white mb-2">{{ achievement?.name }}</div>
        <div class="text-sm text-yellow-100/80 max-w-xs mx-auto">{{ achievement?.desc }}</div>

        <div class="mt-6 bg-slate-900/80 rounded-xl p-4 border border-yellow-500/30 backdrop-blur-sm relative overflow-hidden">
          <div class="absolute top-0 left-0 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-br-lg">REWARD</div>
          <div class="text-sm text-green-400 font-bold mb-1">{{ achievement?.reward }}</div>
          <div class="text-xs text-yellow-400">{{ achievement?.stats }}</div>
          <div class="text-[10px] text-slate-400 mt-2 italic">"{{ achievement?.flavor }}"</div>
        </div>
      </div>

      <!-- 按钮组 -->
      <div class="mt-10 flex gap-4 opacity-0 animate-[fadeIn_1s_ease_1s_forwards] w-full max-w-xs">
        <van-button round plain type="warning" class="flex-1 font-bold border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10" @click="claim">
          放入背包
        </van-button>
        <van-button round color="linear-gradient(to right, #f59e0b, #d97706)" class="flex-1 font-bold shadow-lg shadow-yellow-500/50" @click="equipNow">
          立即装备
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
