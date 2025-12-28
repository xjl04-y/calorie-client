<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showConfirmDialog, showToast } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.rebirth,
  set: (val) => systemStore.setModal('rebirth', val)
});

const hasPotion = computed(() => (store.user.inventory?.['item_rebirth_potion'] || 0) > 0);

// [Fix] 转生流程改进：先打开种族选择，选完后再执行转生
const handleRebirth = () => {
  if (!hasPotion.value) {
    showToast('缺少道具，请先去商店购买转生药水');
    return;
  }

  showConfirmDialog({
    title: '⚠️ 签订转生契约',
    message: `确定要消耗一瓶转生药水，进行灵魂洗煈吗？

1. 重置所有技能点和已学技能
2. 保留等级、经验、金币和背包
3. 保留所有历史饮食记录
4. 转生后可重新选择种族

点击确认后将进入种族选择页面`,
    confirmButtonText: '确认转生',
    confirmButtonColor: '#7c3aed'
  }).then(() => {
    // 关闭转生弹窗
    show.value = false;
    // 设置标记，表示是从转生流程来的
    systemStore.temp.isFromRebirth = true;
    systemStore.temp.isFromSettings = false;
    // 临时将种族设为HUMAN，触发种族选择逻辑
    store.user.race = 'HUMAN';
    // 打开种族选择弹窗
    store.setModal('onboarding', true);
    showToast({ type: 'success', message: '请选择新的种族' });
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

      <!-- [Fix Bug2] 删除种族选择部分，转生后会自动打开选择种族弹窗 -->
      <div class="mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div class="flex items-start gap-2">
          <i class="fas fa-info-circle text-blue-500 mt-1"></i>
          <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p class="font-bold mb-1">转生效果：</p>
            <ul class="space-y-1 ml-3">
              <li>• 清空所有已学技能，返还技能点</li>
              <li>• 保留等级、经验、金币和背包</li>
              <li>• 保留所有历史饮食记录</li>
              <li>• <strong>转生后可重新选择种族</strong></li>
            </ul>
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
