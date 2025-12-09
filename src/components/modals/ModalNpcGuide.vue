<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { RACE_NPCS } from '@/constants/gameData';
import { useRouter } from 'vue-router';

const store = useGameStore();
const router = useRouter();

const show = computed({
  get: () => store.modals.npcGuide,
  set: (val) => store.setModal('npcGuide', val)
});

const npc = computed(() => RACE_NPCS[store.user.race] || RACE_NPCS.HUMAN);

// 优化后的引导步骤
const guideSteps = computed(() => [
  {
    title: '初次见面',
    text: `你好，${store.user.nickname}！我是${npc.value.name}。欢迎来到健康讨伐战场。在这里，你的饮食就是你的武器。`,
    focus: 'none'
  },
  {
    title: '关于战斗',
    text: "看见首页那个怪物了吗？它代表你每日的热量目标。通过【添加食物】来对它造成伤害。吃得越健康，伤害越高！",
    focus: 'home-monster'
  },
  {
    title: '每日委托',
    text: "公会每天会发布委托。记得在首页选择适合你的任务模板（均衡/增肌/减脂），完成后有丰厚奖励。",
    focus: 'daily-quest'
  },
  {
    title: '装备与成长',
    text: "随着等级提升，你会获得装备。去【英雄档案】穿上它们，提升你的基础代谢和战斗力吧！",
    focus: 'profile-tab'
  }
]);

const currentStepIndex = ref(0);
const currentStep = computed(() => guideSteps.value[currentStepIndex.value]);

const nextStep = () => {
  if (currentStepIndex.value < guideSteps.value.length - 1) {
    currentStepIndex.value++;
  } else {
    finish();
  }
};

const finish = () => {
  show.value = false;
  currentStepIndex.value = 0;
};

// 监听打开时重置
watch(show, (val) => {
  if (val) currentStepIndex.value = 0;
});
</script>

<template>
  <van-overlay :show="show" class-name="z-[200] flex items-center justify-center backdrop-blur-sm">
    <div class="w-full h-full relative" @click.stop>

      <!-- NPC 立绘 (左下角半身像) -->
      <div class="absolute bottom-0 left-4 z-20 w-32 h-32 md:w-48 md:h-48 animate-slide-up">
        <!-- 这里用 Emoji 模拟，实际项目可换图 -->
        <div class="w-full h-full flex items-center justify-center text-[8rem] filter drop-shadow-2xl">
          {{ npc.icon }}
        </div>
      </div>

      <!-- 对话框 -->
      <div class="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-800/95 border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6 shadow-2xl z-10 min-h-[180px] flex flex-col">

        <!-- 名字条 -->
        <div class="absolute -top-4 left-6 bg-purple-600 text-white px-4 py-1 rounded-full font-bold text-sm shadow-md border-2 border-white dark:border-slate-800">
          {{ npc.title }} · {{ npc.name }}
        </div>

        <!-- 内容 -->
        <div class="mt-4 flex-1">
          <h3 class="font-bold text-lg mb-2 text-purple-700 dark:text-purple-400">{{ currentStep.title }}</h3>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed typing-effect">
            {{ currentStep.text }}
          </p>
        </div>

        <!-- 按钮组 -->
        <div class="flex justify-end gap-3 mt-4">
          <button @click="finish" class="text-xs text-slate-400 hover:text-slate-600 px-4 py-2">跳过引导</button>
          <button @click="nextStep" class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all">
            {{ currentStepIndex < guideSteps.length - 1 ? '继续' : '开始冒险' }} <i class="fas fa-caret-right ml-1"></i>
          </button>
        </div>

        <!-- 进度指示器 -->
        <div class="flex justify-center gap-1 mt-2">
          <div v-for="(s, i) in guideSteps" :key="i" class="w-2 h-2 rounded-full transition-colors" :class="i === currentStepIndex ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'"></div>
        </div>
      </div>

    </div>
  </van-overlay>
</template>

<style scoped>
.animate-slide-up { animation: slideUp 0.5s ease-out; }
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
