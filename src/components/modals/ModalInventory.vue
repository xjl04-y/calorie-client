<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { SHOP_ITEMS } from '@/constants/gameData';
import { showToast, showConfirmDialog } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.inventory,
  set: (val) => systemStore.setModal('inventory', val)
});

const inventory = computed(() => store.user.inventory || {});

// 获取背包中的道具列表（带数量）
const inventoryItems = computed(() => {
  return Object.entries(inventory.value)
    .map(([itemId, count]) => {
      const itemDef = SHOP_ITEMS.find(i => i.id === itemId);
      return itemDef ? { ...itemDef, count } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.count > 0)
    .sort((a, b) => (b.price || 0) - (a.price || 0)); // 按价格排序
});

// 使用道具
const handleUse = (item: typeof SHOP_ITEMS[0]) => {
  showConfirmDialog({
    title: `使用 ${item.name}`,
    message: `${item.desc}\n\n确定要使用吗？`,
    confirmButtonText: '使用',
    confirmButtonColor: '#7c3aed'
  }).then(() => {
    // === 核心逻辑分支：处理不同道具的生效逻辑 ===

    // 1. 特殊功能道具 (ID 优先匹配)
    if (item.id === 'item_skill_reset') {
      store.heroStore.resetSkills();
      store.heroStore.consumeItem(item.id, 1, item.name);
      return;
    }

    if (item.id.includes('blind_box')) {
      const type = item.id.includes('rare') ? 'RARE' : 'COMMON';
      store.heroStore.openBlindBox(type);
      store.heroStore.consumeItem(item.id, 1, item.name);
      return;
    }

    if (item.id === 'item_purify_water') {
      store.heroStore.clearDebuffs();
      store.heroStore.consumeItem(item.id, 1, item.name);
      return;
    }

    if (item.id === 'item_shield_pack') {
      store.heroStore.addShield(200);
      store.heroStore.consumeItem(item.id, 1, item.name);
      showToast('护盾已激活 (+200)');
      return;
    }

    if (item.id === 'item_energy_drink') {
      store.heroStore.clearDebuffs(); // 复用净化逻辑恢复力竭
      store.heroStore.consumeItem(item.id, 1, item.name);
      return;
    }

    // 2. 通用效果道具 (Effect 匹配)
    if (item.effect === 'HEAL' && item.value) {
      if (item.value > 2000) {
        // 全能药剂 (value=9999)
        store.heroStore.heal(store.heroStore.realMaxHp); // 补满
        showToast('状态完全恢复！');
      } else {
        store.heroStore.heal(item.value);
        showToast(`${item.name}：HP +${item.value}`);
      }
      store.heroStore.consumeItem(item.id, 1, item.name);
    }
    else if (item.effect === 'EXP' && item.value) {
      store.heroStore.addExp(item.value, `${item.name}效果`, 'ITEM_USE');
      store.heroStore.consumeItem(item.id, 1, item.name);
      showToast(`${item.name}：经验 +${item.value}`);
    }
    else if (item.effect === 'REBIRTH') {
      // 转生药水 - 打开转生界面，不在背包直接消耗，而是在转生确认时消耗
      systemStore.setModal('inventory', false);
      systemStore.setModal('rebirth', true);
    }
    else {
      // 被动道具（时光怀表、沙漏等）
      showToast(`${item.name} 将在需要时自动生效，无需手动使用`);
    }
  }).catch(() => {});
};

const getRarityClass = (price: number) => {
  if (price >= 1000) return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
  if (price >= 500) return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
  if (price >= 300) return 'border-green-500 bg-green-50 dark:bg-green-900/20';
  return 'border-slate-300 bg-slate-50 dark:bg-slate-800';
};
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '75%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      <!-- 标题栏 -->
      <div class="p-4 bg-white dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h2 class="text-xl font-rpg text-slate-800 dark:text-white flex items-center">
          <i class="fas fa-bag-shopping text-purple-600 mr-2"></i>
          {{ systemStore.isPureMode ? '我的物品' : '冒险背包' }}
        </h2>
        <van-icon name="cross" size="20" class="text-slate-400 cursor-pointer" @click="show = false" />
      </div>

      <!-- 背包内容 -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- 空状态 -->
        <div v-if="inventoryItems.length === 0" class="flex flex-col items-center justify-center h-full text-center">
          <div class="text-6xl mb-4">🎒</div>
          <div class="text-slate-500 dark:text-slate-400 mb-2">背包空空如也</div>
          <div class="text-xs text-slate-400 dark:text-slate-500">
            前往商店购买道具吧！
          </div>
        </div>

        <!-- 道具列表 -->
        <div v-else class="space-y-3">
          <div
            v-for="item in inventoryItems"
            :key="item.id"
            class="rounded-xl border-2 p-4 flex items-center shadow-sm hover:shadow-md transition-all relative overflow-hidden"
            :class="getRarityClass(item.price)"
          >
            <!-- 左侧：图标和数量 -->
            <div class="relative mr-4 shrink-0">
              <div class="w-16 h-16 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-4xl shadow-inner">
                {{ item.icon }}
              </div>
              <!-- 数量角标 -->
              <div class="absolute -top-2 -right-2 bg-purple-600 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm font-bold">
                {{ item.count }}
              </div>
            </div>

            <!-- 中间：信息 -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                {{ item.name }}
                <span v-if="item.effect === 'REBIRTH'" class="text-xs px-2 py-0.5 rounded bg-purple-500 text-white">稀有</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                {{ item.desc }}
              </div>
              <!-- 效果预览 -->
              <div v-if="item.value && (item.effect === 'HEAL' || item.effect === 'EXP')" class="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">
                <template v-if="item.effect === 'HEAL'">💚 恢复 {{ item.value > 2000 ? '100%' : item.value }} HP</template>
                <template v-else-if="item.effect === 'EXP'">✨ 获得 {{ item.value }} 经验</template>
              </div>
            </div>

            <!-- 右侧：使用按钮 -->
            <button
              @click="handleUse(item)"
              class="shrink-0 ml-2 px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 bg-purple-600 hover:bg-purple-700 text-white shadow-md"
            >
              使用
            </button>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div v-if="inventoryItems.length > 0" class="border-t dark:border-slate-700 px-4 py-3 bg-white dark:bg-slate-800">
        <div class="text-xs text-slate-400 dark:text-slate-500 text-center">
          💡 提示：时光怀表和时光沙漏会在需要时自动生效
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
