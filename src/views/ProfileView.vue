<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import { showToast } from 'vant';

const store = useGameStore();
const { user, heroStats } = storeToRefs(store);

const equipment = computed(() => {
  const slotDefinitions = [
    { id: 'HEAD', name: '头部', icon: 'fas fa-hat-wizard' },
    { id: 'BODY', name: '身体', icon: 'fas fa-tshirt' },
    { id: 'LEGS', name: '腿部', icon: 'fas fa-socks' },
    { id: 'BACK', name: '背部', icon: 'fas fa-user-secret' },
    { id: 'WEAPON', name: '主手', icon: 'fas fa-khanda' },
    { id: 'OFFHAND', name: '副手', icon: 'fas fa-shield-alt' },
    { id: 'ACCESSORY', name: '饰品', icon: 'fas fa-ring' }
  ];
  return slotDefinitions.map(def => {
    const equippedId = user.value.equipped[def.id as keyof typeof user.value.equipped];
    // @ts-ignore
    const equippedItem = equippedId ? store.achievements.find(a => a.id === equippedId) : null;
    return { slotId: def.id, slotName: def.name, defaultIcon: def.icon, item: equippedItem || null };
  });
});

const showEdit = ref(false);
const editData = reactive({ height: 0, weight: 0, age: 0 });

const startEditProfile = () => {
  editData.height = user.value.height;
  editData.weight = user.value.weight;
  editData.age = user.value.age;
  showEdit.value = true;
};

const validate = () => {
  if (editData.height <= 50 || editData.height > 250) {
    showToast('身高必须在 50-250cm 之间');
    return false;
  }
  if (editData.weight <= 20 || editData.weight > 300) {
    showToast('体重必须在 20-300kg 之间');
    return false;
  }
  if (editData.age <= 5 || editData.age > 120) {
    showToast('年龄必须在 5-120 岁之间');
    return false;
  }
  return true;
};

const saveProfile = () => {
  if (!validate()) return;

  store.user.height = editData.height;
  store.user.weight = editData.weight;
  store.user.age = editData.age;

  store.recalcBMR();
  store.saveState();

  showToast('档案已更新，Boss数值重算中...');
};

const onBeforeClose = (action: string) => {
  if (action === 'confirm') {
    return validate();
  }
  return true;
};

const openSwap = (slotId: string) => {
  store.temp.activeSlot = slotId;
  store.setModal('equipmentSwap', true);
};
</script>

<template>
  <div class="pb-24 bg-slate-900 min-h-full text-white">
    <div class="relative h-56 bg-gradient-to-b from-purple-900 to-slate-900 overflow-hidden">
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
      <div class="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <div class="w-28 h-28 rounded-full border-4 border-slate-800 p-1 bg-slate-700 shadow-2xl relative z-10">
          <img :src="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.avatarSeed" class="w-full h-full rounded-full bg-slate-600" />
          <div class="absolute bottom-0 right-0 bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-0.5 rounded-full border-2 border-slate-800 shadow-lg">Lv.{{ user.level }}</div>
        </div>
      </div>
    </div>

    <div class="mt-16 text-center px-6">
      <h2 class="text-3xl font-rpg text-yellow-400 tracking-wide">{{ user.nickname }}</h2>
      <div class="flex items-center justify-center gap-2 mt-1 text-slate-400 text-xs">
        <span><i :class="user.gender === 'MALE' ? 'fas fa-mars text-blue-400' : 'fas fa-venus text-pink-400'"></i> {{ user.age }}岁</span>
        <span>|</span>
        <span>{{ user.height }}cm</span>
        <span>|</span>
        <span>{{ user.weight }}kg</span>
      </div>

      <div class="flex justify-center mt-2 mb-2">
        <span class="bg-slate-800 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-bold flex items-center">
            <span class="mr-1 text-lg">{{ heroStats.raceIcon }}</span> {{ heroStats.raceName }}
        </span>
      </div>

      <div class="mt-2 flex justify-center gap-3">
        <div class="bg-slate-800 px-3 py-1 rounded border border-slate-700 text-xs text-blue-300 font-bold">战力: {{ heroStats.combatPower }}</div>
        <div class="bg-slate-800 px-3 py-1 rounded border border-slate-700 text-xs text-yellow-500 font-bold">每日目标: {{ store.dailyTarget }}</div>
      </div>

      <div class="mt-3">
        <button @click="startEditProfile" class="text-xs text-slate-500 underline hover:text-purple-400">修改档案数据</button>
      </div>
    </div>

    <div class="px-4 mt-8">
      <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
        <h3 class="text-sm font-bold text-slate-400 mb-5 flex items-center"><i class="fas fa-chart-bar mr-2 text-purple-500"></i> 核心属性</h3>
        <div class="space-y-5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-blue-400 w-16">力量 (STR)</span>
            <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-blue-500" :class="{'stat-bar-overflow': heroStats.rawStr > heroStats.maxStat}" :style="{width: Math.min((heroStats.str / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
            <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawStr > heroStats.maxStat}">{{ heroStats.str }}</span>
          </div>
          <div class="text-[10px] text-blue-500/60 text-right -mt-3">🛡️ 提供 {{ heroStats.blockValue }} 点格挡</div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-green-400 w-16">敏捷 (AGI)</span>
            <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-green-500" :class="{'stat-bar-overflow': heroStats.rawAgi > heroStats.maxStat}" :style="{width: Math.min((heroStats.agi / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
            <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawAgi > heroStats.maxStat}">{{ heroStats.agi }}</span>
          </div>
          <div class="text-[10px] text-green-500/60 text-right -mt-3">⚡ 提供 {{ (heroStats.dodgeChance * 100).toFixed(1) }}% 闪避</div>

          <div class="flex items-center justify-between">
            <span class="text-xs text-orange-400 w-16">体质 (VIT)</span>
            <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-orange-500" :class="{'stat-bar-overflow': heroStats.rawVit > heroStats.maxStat}" :style="{width: Math.min((heroStats.vit / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
            <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawVit > heroStats.maxStat}">{{ heroStats.vit }}</span>
          </div>
          <div class="text-[10px] text-orange-500/60 text-right -mt-3">❤️ 提供 {{ heroStats.maxHp }} 点生命上限</div>
        </div>
      </div>
    </div>

    <div class="px-4 mt-4">
      <div class="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none"></div>
        <div class="flex justify-between items-center mb-4 relative z-10">
          <h3 class="text-sm font-bold text-slate-300 flex items-center"><i class="fas fa-shield-alt mr-2 text-yellow-600"></i> 英雄装备</h3>
          <span class="text-[10px] text-slate-500 font-normal">点击槽位更换</span>
        </div>

        <div class="grid grid-cols-4 gap-3 relative z-10">
          <div v-for="slot in equipment" :key="slot.slotId"
               @click="openSwap(slot.slotId)"
               class="aspect-square bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group cursor-pointer hover:border-purple-500 active:scale-95"
               :class="[
                             slot.item ? ('border-' + slot.item.rarity + ' shadow-md') : 'border-slate-700 border-dashed opacity-60'
                         ]">
            <i v-if="!slot.item" :class="slot.defaultIcon" class="text-3xl text-slate-600"></i>
            <span v-if="!slot.item" class="text-[8px] text-slate-600 mt-1 font-bold">{{ slot.slotName }}</span>

            <div v-if="slot.item" class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <!-- @ts-ignore -->
            <span v-if="slot.item" class="text-4xl mb-1 filter drop-shadow-md transform transition-transform group-hover:scale-110">{{ slot.item.rewardIcon || slot.item.icon }}</span>
            <div v-if="slot.item" class="absolute bottom-0 w-full text-center bg-slate-900/80 backdrop-blur-sm py-0.5">
              <span class="text-[8px] font-bold block truncate px-1" :class="'text-' + slot.item.rarity">{{ slot.item.reward }}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 text-center relative z-10">
          <button class="text-xs text-slate-500 hover:text-yellow-500 transition-colors flex items-center justify-center mx-auto" @click="store.setModal('achievements', true)">
            <i class="fas fa-book mr-1"></i> 查看图鉴
          </button>
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showEdit" title="修改档案" show-cancel-button :before-close="onBeforeClose" @confirm="saveProfile" class="dark:bg-slate-800 dark:text-white">
      <div class="p-4 space-y-4">
        <div><label class="text-xs text-slate-500 block mb-1">身高 (cm)</label><input type="number" v-model.number="editData.height" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm"></div>
        <div><label class="text-xs text-slate-500 block mb-1">体重 (kg)</label><input type="number" v-model.number="editData.weight" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm"></div>
        <div><label class="text-xs text-slate-500 block mb-1">年龄</label><input type="number" v-model.number="editData.age" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm"></div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.stat-bar-overflow { background: repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #b91c1c 10px, #b91c1c 20px); }
</style>
