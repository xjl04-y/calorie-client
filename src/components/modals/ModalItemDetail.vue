<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';

const store = useGameStore();

const show = computed({
  get: () => store.modals.itemDetail,
  set: (val) => store.setModal('itemDetail', val)
});

const item = computed(() => store.temp.selectedItem || {});

// 根据稀有度动态设置边框颜色 (依赖 Tailwind class)
const borderClass = computed(() => `border-${item.value.rarity || 'common'}`);
const textClass = computed(() => `text-${item.value.rarity || 'common'}`);
</script>

<template>
  <van-popup v-model:show="show" round position="center" :style="{ width: '80%', overflow: 'visible' }">
    <div class="bg-slate-900 border-2 rounded-2xl p-6 text-center relative overflow-hidden" :class="borderClass">
      <!-- 背景纹理 -->
      <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>

      <div class="relative z-10">
        <div class="text-6xl mb-4 filter drop-shadow-lg animate-bounce">{{ item.icon }}</div>
        <div class="text-xl font-rpg font-bold mb-1" :class="textClass">{{ item.reward || item.name }}</div>

        <div class="text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-bold">
          {{ item.slot || 'ITEM' }} • {{ item.rarity || 'COMMON' }}
        </div>

        <div class="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
          <div class="text-xs text-slate-300 italic">"{{ item.flavor || '暂无描述' }}"</div>
        </div>

        <div v-if="item.stats" class="flex flex-col gap-2 mb-6">
          <div class="text-xs font-bold text-yellow-500 bg-yellow-500/10 py-1 px-2 rounded border border-yellow-500/20">
            ✨ {{ item.stats }}
          </div>
        </div>
      </div>

      <!-- 背景光晕 -->
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl"></div>
    </div>
  </van-popup>
</template>
