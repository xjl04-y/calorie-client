<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { RACE_NPCS } from '@/constants/gameData';

const store = useGameStore();

const show = computed({
  get: () => store.modals.npcGuide,
  set: (val) => store.setModal('npcGuide', val)
});

// 根据用户种族获取对应的导师
const npc = computed(() => RACE_NPCS[store.user.race] || RACE_NPCS.HUMAN);

const close = () => {
  show.value = false;
};
</script>

<template>
  <van-overlay :show="show" @click="close" class-name="flex items-center justify-center p-6 backdrop-blur-sm z-[100]">
    <div class="w-full max-w-sm" @click.stop>
      <!-- NPC 形象区 -->
      <div class="relative mb-[-40px] z-10 flex justify-center">
        <div class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-xl flex items-center justify-center text-5xl overflow-hidden animate-bounce-slow">
          {{ npc.icon }}
        </div>
      </div>

      <!-- 对话框 -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 pt-12 shadow-2xl border-2 border-slate-200 dark:border-slate-700 relative">
        <!-- 装饰角 -->
        <div class="absolute top-4 right-4 text-slate-200 dark:text-slate-600 text-4xl opacity-50 font-serif">"</div>

        <div class="text-center mb-4">
          <h3 class="font-rpg text-xl font-bold" :class="npc.color">{{ npc.name }}</h3>
          <div class="text-xs text-slate-400 uppercase tracking-widest">{{ npc.title }}</div>
        </div>

        <div class="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="(line, idx) in npc.dialogue" :key="idx"
               class="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl text-sm text-slate-700 dark:text-slate-200 leading-relaxed border border-slate-100 dark:border-slate-600">
            {{ line }}
          </div>
        </div>

        <van-button block round color="#7c3aed" @click="close" class="font-bold shadow-lg shadow-purple-500/30">
          谨遵教诲
        </van-button>
      </div>
    </div>
  </van-overlay>
</template>

<style scoped>
.animate-bounce-slow { animation: bounce 3s infinite; }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
</style>
