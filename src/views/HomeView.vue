<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';
import AppHud from '@/components/AppHud.vue';
import DateNavigator from '@/components/DateNavigator.vue';
import ModalNpcGuide from '@/components/modals/ModalNpcGuide.vue'; // 引入 NPC 组件
import { showConfirmDialog } from 'vant'

const store = useGameStore();
const { user, stageInfo, dailyTarget } = storeToRefs(store);

// 计算属性：HP 条颜色
const hpPercent = computed(() => {
  if (!stageInfo.value.currentObj) return 0;
  return Math.floor((stageInfo.value.currentHpRemaining / stageInfo.value.currentObj.maxHp) * 100);
});

const hpBarColor = computed(() => {
  if (stageInfo.value.isOverloaded) return 'bg-red-600';
  if (hpPercent.value < 20) return 'bg-red-500';
  if (hpPercent.value < 50) return 'bg-yellow-500';
  return 'bg-green-500';
});

// 弱点颜色映射
const weaknessColor = computed(() => {
  const type = stageInfo.value.currentObj?.data?.weaknessType;
  if (type === 'LOW_CARB') return 'text-orange-400 border-orange-400 bg-orange-900/20';
  if (type === 'LOW_FAT') return 'text-yellow-400 border-yellow-400 bg-yellow-900/20';
  if (type === 'HIGH_PRO') return 'text-red-400 border-red-400 bg-red-900/20';
  return 'text-blue-400 border-blue-400 bg-blue-900/20';
});

// 撤销日志 (滑动删除)
const confirmDelete = (log: any) => {
  showConfirmDialog({
    title: '时光倒流',
    message: '确定要撤销这条记录吗？\n这也将回滚获得的经验值和造成的伤害。',
    confirmButtonText: '发动魔法',
    confirmButtonColor: '#7c3aed'
  })
    .then(() => {
      store.deleteLog(log);
    })
    .catch(() => {
      // 取消
    });
};

const rpgMeals = [
  { key: 'BREAKFAST', label: '早餐', rpgName: '晨间补给', icon: '🌅' },
  { key: 'LUNCH', label: '午餐', rpgName: '营火烹饪', icon: '⛺' },
  { key: 'DINNER', label: '晚餐', rpgName: '庆功晚宴', icon: '🏰' },
  { key: 'SNACK', label: '零食', rpgName: '炼金药剂', icon: '🧪' }
];

const openAddFood = (key: any) => {
  store.temp.activeMealType = key;
  store.setModal('addFood', true);
}

const openLogDetail = (log: any) => {
  store.temp.selectedLog = log;
  store.setModal('logDetail', true);
}
</script>

<template>
  <div class="pb-24">
    <!-- 头部 HUD 组件 -->
    <AppHud @open-achievements="store.setModal('achievements', true)" />

    <!-- 日期选择器组件 -->
    <DateNavigator />

    <!-- 怪物战斗卡片 -->
    <div class="mx-4 mt-4 bg-slate-900 dark:bg-black rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border-2 transition-all duration-300"
         :class="stageInfo.isOverloaded ? 'border-red-500 shadow-red-500/50' : 'border-slate-700'">

      <!-- 背景纹理 -->
      <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      <!-- Boss 信息与 HP 条 -->
      <div class="relative z-10 flex items-center justify-between mb-4">
        <div class="flex items-center">
          <!-- 怪物图标容器 -->
          <div class="relative">
            <div class="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl border border-slate-600 shadow-inner"
                 :class="{'animate-bounce': stageInfo.isOverloaded}">
              {{ stageInfo.currentObj?.data?.icon || '❓' }}
            </div>
            <!-- Boss 标记 -->
            <div v-if="stageInfo.isBoss" class="absolute -top-2 -right-2 bg-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-white/20">BOSS</div>
          </div>

          <div class="ml-4">
            <div class="text-xl font-rpg tracking-wider">{{ stageInfo.currentObj?.data?.name || '未知敌人' }}</div>
            <!-- 弱点展示：高亮显示 -->
            <div class="text-[10px] mt-1 flex items-center">
              <span class="mr-1 text-slate-400">弱点:</span>
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide" :class="weaknessColor">
                {{ stageInfo.currentObj?.data?.weakness || '无' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 数值 -->
        <div class="text-right">
          <div class="text-2xl font-black font-mono tracking-tight">{{ stageInfo.currentHpRemaining }}</div>
          <div class="text-[9px] text-slate-500 uppercase tracking-widest">Enemy HP</div>
        </div>
      </div>

      <!-- HP Bar -->
      <div class="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
        <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold z-10 drop-shadow-md">
          {{ hpPercent }}%
        </div>
        <div class="h-full transition-all duration-1000 ease-out relative" :class="hpBarColor" :style="{ width: hpPercent + '%' }">
          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      <!-- 进度指示器 -->
      <div class="flex justify-between items-center px-1">
        <div class="flex gap-1">
          <div v-for="(s, idx) in stageInfo.stages" :key="idx"
               class="w-1.5 h-1.5 rounded-full transition-all"
               :class="idx <= stageInfo.currentIndex ? 'bg-green-500 scale-125' : 'bg-slate-700'">
          </div>
        </div>
        <div class="text-[9px] text-slate-500">
          {{ stageInfo.isBoss ? '最终决战' : `第 ${stageInfo.currentIndex + 1} 波` }}
        </div>
      </div>
    </div>

    <!-- 膳食/行动入口 -->
    <div class="px-4 mt-6 mb-2 flex justify-between items-center">
      <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">冒险行动</h3>
      <!-- 新增：NPC 引导按钮 -->
      <button @click="store.setModal('npcGuide', true)" class="text-[10px] bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 active:scale-95 transition flex items-center">
        <i class="fas fa-comment-dots mr-1"></i> 导师通讯
      </button>
    </div>
    <div class="px-4 grid grid-cols-2 gap-3 mb-6">
      <div v-for="m in rpgMeals" :key="m.key" @click="openAddFood(m.key)"
           class="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-slate-700 active:scale-95 transition cursor-pointer hover:border-purple-300 dark:hover:border-purple-700">
        <div class="text-2xl bg-slate-50 dark:bg-slate-700 w-10 h-10 flex items-center justify-center rounded-lg">{{ m.icon }}</div>
        <div>
          <div class="text-sm font-bold dark:text-slate-200">{{ m.rpgName }}</div>
          <div class="text-[10px] text-slate-400">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- 战斗日志列表 (使用 SwipeCell) -->
    <div class="bg-white dark:bg-slate-800 rounded-t-3xl min-h-[300px] p-5 pb-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm">战斗记录</h3>
        <span class="text-[10px] text-slate-400">左滑撤销 / 点击详情</span>
      </div>

      <div v-if="store.todayLogs.length === 0" class="text-center py-10 text-slate-400">
        <div class="text-4xl mb-2 grayscale opacity-50">📜</div>
        <div class="text-xs">暂无记录，快去出刀！</div>
      </div>

      <transition-group name="van-slide-up">
        <van-swipe-cell v-for="log in store.logsReverse" :key="log.id" class="mb-3 rounded-2xl overflow-hidden shadow-sm">

          <!-- 核心卡片内容 -->
          <div class="p-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between relative"
               :class="{'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10': log.damageTaken}"
               @click="openLogDetail(log)">

            <div class="flex items-center gap-3 relative z-10">
              <div class="text-2xl w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                {{ log.icon }}
              </div>
              <div>
                <div class="font-bold text-sm dark:text-slate-200 flex items-center">
                  {{ log.name }}
                  <!-- 抵抗/暴击/复合 标签 -->
                  <span v-if="log.isComposite" class="ml-2 text-[8px] px-1 rounded bg-purple-100 text-purple-600 font-bold border border-purple-200">复合</span>
                  <span v-if="(log.multiplier || 1) < 1" class="ml-2 text-[8px] px-1 rounded bg-red-100 text-red-600 font-bold border border-red-200">抵抗</span>
                  <span v-else-if="(log.multiplier || 1) > 1" class="ml-2 text-[8px] px-1 rounded bg-yellow-100 text-yellow-600 font-bold border border-yellow-200">暴击</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5" v-if="!log.damageTaken">
                  {{ log.grams }}g · {{ log.mealType }}
                </div>
                <div class="text-[10px] text-red-400 font-bold mt-0.5" v-else>
                  反击伤害 -{{ log.damageTaken }} (格挡 {{ log.blocked }})
                </div>
              </div>
            </div>

            <div class="text-right relative z-10">
              <div v-if="!log.damageTaken">
                <div class="font-rpg font-bold text-lg" :class="(log.multiplier || 1) < 1 ? 'text-slate-400' : 'text-red-500'">
                  -{{ Math.floor(log.calories * (log.multiplier || 1)) }}
                </div>
                <div class="text-[8px] text-slate-400">DMG</div>
              </div>
              <div v-else>
                <div class="text-2xl">💔</div>
              </div>
            </div>
          </div>

          <!-- 右侧滑动操作 -->
          <template #right>
            <div class="h-full flex">
              <van-button square type="danger" text="撤销" class="h-full !rounded-none" @click="confirmDelete(log)" />
            </div>
          </template>
        </van-swipe-cell>
      </transition-group>
    </div>

    <!-- 全局挂载 NPC 弹窗 -->
    <ModalNpcGuide />
  </div>
</template>

<style scoped>
/* 简单的进入动画 */
.van-slide-up-enter-active, .van-slide-up-leave-active { transition: all 0.3s ease; }
.van-slide-up-enter-from, .van-slide-up-leave-to { opacity: 0; transform: translateY(20px); }

/* Vant Swipe Cell 样式微调 */
:deep(.van-swipe-cell__right) {
  display: flex;
  align-items: center;
}
</style>
