<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import { showToast } from 'vant';

const store = useGameStore();
const { user, achievements, temp } = storeToRefs(store);

const show = computed({
  get: () => store.modals.equipmentSwap,
  set: (val) => store.setModal('equipmentSwap', val)
});

const slotId = computed(() => temp.value.activeSlot);

// 获取槽位名称的映射 (简单版本，也可以从常量取)
const slotNameMap: Record<string, string> = {
  HEAD: '头部', BODY: '身体', LEGS: '腿部', WEAPON: '主手',
  OFFHAND: '副手', BACK: '背部', ACCESSORY: '饰品'
};
const slotName = computed(() => slotNameMap[slotId.value || ''] || '未知部位');

// 筛选当前部位的已解锁装备
const availableItems = computed(() => {
  return achievements.value.filter(a => a.unlocked && a.slot === slotId.value);
});

const isEquipped = (id: number) => user.value.equipped[slotId.value as keyof typeof user.value.equipped] === id;

const equip = (item: any) => {
  if (slotId.value) {
    // @ts-ignore
    user.value.equipped[slotId.value] = item.id;
    show.value = false;
    store.saveState();
    showToast(`已装备: ${item.reward}\nBoss血量已调整`);
  }
};
</script>

<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '50%' }" class="dark:bg-slate-800">
    <div class="p-4 h-full flex flex-col">
      <h3 class="font-bold text-center mb-4 dark:text-white">更换装备: {{ slotName }}</h3>

      <div class="flex-1 overflow-y-auto space-y-3">
        <div v-if="availableItems.length === 0" class="text-center text-slate-400 py-10">
          暂无此部位装备，快去完成成就吧！
        </div>

        <div v-for="item in availableItems" :key="item.id"
             @click="equip(item)"
             class="flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-95"
             :class="[
                         isEquipped(item.id) ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-700'
                     ]">
          <div class="text-4xl mr-4">{{ item.icon }}</div>
          <div class="flex-1">
            <div class="font-bold text-sm dark:text-white">{{ item.reward }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ item.stats }}</div>
            <div class="text-[10px] text-purple-500 mt-1">
              战力+{{ item.combatPower }} / Boss HP+{{ item.bonusBMR }}
            </div>
          </div>
          <div v-if="isEquipped(item.id)" class="text-green-600 font-bold text-xs">
            <i class="fas fa-check"></i> 已装备
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>
