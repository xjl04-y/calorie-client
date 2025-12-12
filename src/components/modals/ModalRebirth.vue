<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { RACES } from '@/constants/gameData';
import { showConfirmDialog, showToast } from 'vant';
import type { RaceType } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.rebirth,
  set: (val) => systemStore.setModal('rebirth', val)
});

const selectedRace = ref<RaceType>('HUMAN');
const hasPotion = computed(() => (store.user.inventory?.['item_rebirth_potion'] || 0) > 0);

const handleRebirth = () => {
  if (!hasPotion.value) {
    showToast('缺少道具，请先去商店购买转生药水');
    return;
  }

  if (selectedRace.value === store.user.race) {
    showToast('这也是你现在的种族，无需转生');
    return;
  }

  // [PM Note] 在这里明确告知用户：历史记录名称不变，只有新的冒险才会改变
  showConfirmDialog({
    title: '⚠️ 签订转生契约',
    message: `确定要消耗一瓶转生药水，将种族变更为「${RACES[selectedRace.value].name}」吗？\n\n1. 重置所有技能点和已学技能\n2. 历史饮食记录将保留原貌\n3. 新的冒险将以新身份书写`,
    confirmButtonText: '确认转生',
    confirmButtonColor: '#7c3aed'
  }).then(() => {
    store.heroStore.rebirth(selectedRace.value);
  }).catch(() => {});
};

const goToShop = () => {
  show.value = false;
  systemStore.setModal('shop', true);
};
</script>

<template>
  <van-popup v-model:show="show" position="center" round :style="{ width: '90%', maxHeight: '85%' }" class="dark:bg-slate-900 flex flex-col overflow-hidden">
    <div class="p-5 flex flex-col h-full overflow-y-auto">
      <div class="text-center mb-6">
        <div class="text-5xl mb-2">⚗️</div>
        <h3 class="text-xl font-black dark:text-white">灵魂转生</h3>
        <p class="text-xs text-slate-500 mt-1">洗去过往，重获新生。</p>
      </div>

      <!-- 道具检查 -->
      <div class="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg flex justify-between items-center mb-6 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center">
          <span class="text-2xl mr-2">🧪</span>
          <div class="text-sm font-bold dark:text-slate-200">转生药水</div>
        </div>
        <div v-if="hasPotion" class="text-green-500 font-bold text-sm flex items-center">
          <i class="fas fa-check-circle mr-1"></i> 持有: {{ store.user.inventory['item_rebirth_potion'] }}
        </div>
        <button v-else @click="goToShop" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-bold">
          去购买
        </button>
      </div>

      <div class="mb-4">
        <div class="text-xs font-bold text-slate-400 mb-2 uppercase">选择新种族</div>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="(race, key) in RACES" :key="key"
               @click="selectedRace = key as RaceType"
               class="p-3 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden"
               :class="selectedRace === key
                 ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-1 ring-purple-500'
                 : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'">

            <div class="text-3xl mb-2">{{ race.icon }}</div>
            <div class="font-bold text-sm dark:text-white">{{ race.name }}</div>
            <div class="text-[10px] text-slate-500 mt-1 leading-tight">{{ race.desc }}</div>

            <!-- 属性倾向 -->
            <div class="flex gap-1 mt-2">
              <span v-if="race.growth.str > 1.1" class="text-[8px] bg-red-100 text-red-600 px-1 rounded">力</span>
              <span v-if="race.growth.agi > 1.1" class="text-[8px] bg-green-100 text-green-600 px-1 rounded">敏</span>
              <span v-if="race.growth.vit > 1.1" class="text-[8px] bg-orange-100 text-orange-600 px-1 rounded">体</span>
            </div>

            <div v-if="selectedRace === key" class="absolute top-2 right-2 text-purple-500">
              <i class="fas fa-check-circle"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-auto pt-4">
        <van-button block color="linear-gradient(to right, #7c3aed, #6366f1)" round @click="handleRebirth" :disabled="!hasPotion">
          {{ hasPotion ? '开始仪式' : '道具不足' }}
        </van-button>
        <div class="text-[10px] text-center text-slate-400 mt-2">
          * 转生将重置所有技能并返还 SP 点数
        </div>
      </div>
    </div>
  </van-popup>
</template>
