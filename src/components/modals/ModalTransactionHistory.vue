<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';

const systemStore = useSystemStore();
const heroStore = useHeroStore();

// Tab状态: 'GOLD' | 'EXP' | 'ITEM'
const activeTab = ref<'GOLD' | 'EXP' | 'ITEM'>('GOLD');

// [响应SystemStore的Tab状态] 监听弹窗打开事件，同步Tab
watch(() => systemStore.modals.transactionHistory, (isOpen) => {
  if (isOpen) {
    // 弹窗打开时，从 SystemStore 读取预设的 Tab
    activeTab.value = systemStore.temp.transactionTab || 'GOLD';
  }
});

// 从 HeroStore 获取交易历史
const transactionHistory = computed(() => {
  return heroStore.user.transactionHistory || [];
});

// 根据当前Tab筛选数据
const filteredHistory = computed(() => {
  return transactionHistory.value
    .filter(record => record.currency === activeTab.value)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // 倒序排列
});

// 格式化时间戳
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
};

// 获取金额颜色和符号
const getAmountStyle = (amount: number) => {
  if (amount > 0) {
    return {
      color: activeTab.value === 'GOLD' ? 'text-yellow-400' : activeTab.value === 'EXP' ? 'text-blue-400' : 'text-green-400',
      prefix: '+'
    };
  }
  return {
    color: 'text-red-400',
    prefix: ''
  };
};

// [阶段三] 根据交易类型返回图标和样式
const getTransactionIcon = (record: import('@/types').TransactionRecord) => {
  const typeMap: Record<import('@/types').TransactionType, { icon: string; label: string }> = {
    'ITEM_BUY': { icon: '🛒', label: '商店进货' },
    'ITEM_USE': { icon: '🧪', label: '使用消耗' },
    'ITEM_OBTAIN': { icon: '🎁', label: '战利品' },
    'ACHIEVEMENT_REWARD': { icon: '🏆', label: '成就奖励' },
    'CHECKIN_BONUS': { icon: '🎉', label: '签到奖励' },
    'BATTLE_REWARD': { icon: '⚔️', label: '战斗奖励' },
    'QUEST_REWARD': { icon: '📜', label: '任务奖励' },
    'SHOP_PURCHASE': { icon: '💸', label: '商店消费' },
    'SYSTEM_GRANT': { icon: '🎁', label: '系统发放' },
    'LEVEL_UP': { icon: '⬆️', label: '升级奖励' },
    'SYSTEM_ROLLBACK': { icon: '⏪', label: '系统回滚' }
  };
  return typeMap[record.type] || { icon: '💰', label: '其他' };
};

const close = () => {
  systemStore.setModal('transactionHistory', false);
};

const isPure = computed(() => systemStore.isPureMode);
</script>

<template>
  <van-popup 
    :show="systemStore.modals.transactionHistory" 
    position="bottom" 
    round
    :style="{ height: '85vh' }"
    @update:show="(val: boolean) => !val && close()"
  >
    <div class="h-full flex flex-col bg-white dark:bg-slate-900">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700">
        <h2 class="text-lg font-bold" :class="isPure ? 'text-slate-800 dark:text-slate-100' : 'text-purple-600 dark:text-purple-400'">
          {{ isPure ? '💰 财务流水' : '📜 财富账本' }}
        </h2>
        <van-icon name="cross" size="20" class="text-slate-400 cursor-pointer" @click="close" />
      </div>

      <!-- Tab切换 -->
      <div class="flex border-b dark:border-slate-700">
        <div 
          class="flex-1 text-center py-3 cursor-pointer transition-all"
          :class="activeTab === 'GOLD' 
            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 dark:text-yellow-400 font-bold border-b-2 border-yellow-500' 
            : 'text-slate-400 dark:text-slate-500'"
          @click="activeTab = 'GOLD'"
        >
          <div class="flex items-center justify-center gap-2">
            <span class="text-xl">💰</span>
            <span>金币</span>
          </div>
        </div>
        <div 
          class="flex-1 text-center py-3 cursor-pointer transition-all"
          :class="activeTab === 'EXP' 
            ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 font-bold border-b-2 border-blue-500' 
            : 'text-slate-400 dark:text-slate-500'"
          @click="activeTab = 'EXP'"
        >
          <div class="flex items-center justify-center gap-2">
            <span class="text-xl">⭐</span>
            <span>经验</span>
          </div>
        </div>
        <!-- [阶段三] 新增Tab：物资 -->
        <div 
          class="flex-1 text-center py-3 cursor-pointer transition-all"
          :class="activeTab === 'ITEM' 
            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-600 dark:text-green-400 font-bold border-b-2 border-green-500' 
            : 'text-slate-400 dark:text-slate-500'"
          @click="activeTab = 'ITEM'"
        >
          <div class="flex items-center justify-center gap-2">
            <span class="text-xl">📦</span>
            <span>物资</span>
          </div>
        </div>
      </div>

      <!-- 列表内容 -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- 空状态 -->
        <div v-if="filteredHistory.length === 0" class="flex flex-col items-center justify-center h-full text-center">
          <div class="text-6xl mb-4">{{ activeTab === 'GOLD' ? '🪙' : activeTab === 'EXP' ? '✨' : '📦' }}</div>
          <div class="text-slate-400 dark:text-slate-500">
            暂无{{ activeTab === 'GOLD' ? '金币' : activeTab === 'EXP' ? '经验' : '物资' }}流水记录
          </div>
          <div v-if="activeTab === 'ITEM'" class="text-xs text-slate-400 dark:text-slate-500 mt-2">
            在商店购买道具或获得战利品后，将显示在此
          </div>
        </div>

        <!-- 记录列表 -->
        <div v-else class="space-y-2">
          <div 
            v-for="(record, index) in filteredHistory" 
            :key="index"
            class="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <!-- 左侧：图标、类型和时间 -->
            <div class="flex items-center flex-1 gap-3">
              <!-- [阶段三] 类型图标 -->
              <div class="text-2xl shrink-0">
                {{ getTransactionIcon(record).icon }}
              </div>
              
              <div class="flex-1 min-w-0">
                <!-- 来源描述 -->
                <div class="font-medium text-slate-800 dark:text-slate-100 mb-1">
                  <template v-if="activeTab === 'ITEM' && record.itemName">
                    {{ record.itemName }}
                  </template>
                  <template v-else>
                    {{ record.source }}
                  </template>
                </div>
                <!-- 交易类型标签 + 时间 -->
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {{ getTransactionIcon(record).label }}
                  </span>
                  <span class="text-slate-400 dark:text-slate-500">
                    {{ formatTimestamp(record.timestamp) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 右侧：金额/数量 -->
            <div 
              class="text-xl font-bold shrink-0 ml-2"
              :class="getAmountStyle(record.amount).color"
            >
              <!-- [修复] 金币减少显示负号 -->
              <template v-if="activeTab === 'GOLD'">
                {{ record.amount > 0 ? '+' : '' }}{{ record.amount }}
              </template>
              <template v-else>
                {{ getAmountStyle(record.amount).prefix }}{{ Math.abs(record.amount) }}
              </template>
              <span class="text-sm ml-1">{{ activeTab === 'GOLD' ? 'G' : activeTab === 'EXP' ? 'XP' : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部统计（可选） -->
      <div 
        v-if="filteredHistory.length > 0"
        class="border-t dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800"
      >
        <div class="flex justify-between items-center">
          <span class="text-sm text-slate-500 dark:text-slate-400">
            共 {{ filteredHistory.length }} 条记录
          </span>
          <span class="text-sm font-medium" :class="activeTab === 'GOLD' ? 'text-yellow-600 dark:text-yellow-400' : activeTab === 'EXP' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'">
            <template v-if="activeTab !== 'ITEM'">
              当前余额: {{ activeTab === 'GOLD' ? heroStore.user.gold : heroStore.user.currentExp }}
              {{ activeTab === 'GOLD' ? 'G' : 'XP' }}
            </template>
            <template v-else>
              总计 {{ filteredHistory.length }} 条记录
            </template>
          </span>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
/* 平滑滚动 */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}
</style>
