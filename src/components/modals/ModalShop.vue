<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { SHOP_ITEMS } from '@/constants/gameData';
import { showToast } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.shop,
  set: (val) => systemStore.setModal('shop', val)
});

const gold = computed(() => store.user.gold || 0);
const inventory = computed(() => store.user.inventory || {});

const handleBuy = (item: typeof SHOP_ITEMS[0]) => {
  // [背包功能] 所有道具购买后直接存入背包，不自动使用
  if (store.heroStore.buyItem(item.id, item.price, item.name)) {
    showToast(`${item.name} 已放入背包！`);
  }
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '70%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      <div class="p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h2 class="text-xl font-rpg text-slate-800 dark:text-white flex items-center">
          <i class="fas fa-store text-yellow-600 mr-2"></i> 哥布林黑市
        </h2>
        <div class="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-black font-mono border border-yellow-200 dark:border-yellow-700 flex items-center">
          <i class="fas fa-coins mr-1.5 text-xs"></i> {{ gold }}
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-for="item in SHOP_ITEMS" :key="item.id"
             class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center shadow-sm relative overflow-hidden group">

          <div class="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-4xl mr-4 shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300 relative">
            {{ item.icon }}
            <!-- 持有数量角标 -->
            <div v-if="inventory[item.id]" class="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm font-bold">
              {{ inventory[item.id] }}
            </div>
          </div>

          <div class="flex-1 min-w-0 mr-2">
            <div class="font-bold text-slate-800 dark:text-white mb-1">{{ item.name }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">{{ item.desc }}</div>
          </div>

          <button @click="handleBuy(item)"
                  class="shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 flex flex-col items-center min-w-[70px]"
                  :class="gold >= item.price
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-500 cursor-not-allowed'">
            <span>购买</span>
            <span class="text-xs flex items-center mt-0.5"><i class="fas fa-coins mr-1 scale-75"></i>{{ item.price }}</span>
          </button>
        </div>

        <div class="text-center text-xs text-slate-400 mt-6 pb-6">
          更多稀有商品正在进货中...
        </div>
      </div>
    </div>
  </van-popup>
</template>
