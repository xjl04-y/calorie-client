<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { RACE_NPCS } from '@/constants/gameData';
import { useRouter, useRoute } from 'vue-router';

const store = useGameStore();
const systemStore = useSystemStore();
const router = useRouter();
const route = useRoute();

const show = computed({
  get: () => store.modals.npcGuide,
  set: (val) => store.setModal('npcGuide', val)
});

const isPure = computed(() => systemStore.isPureMode);

const npc = computed(() => {
  if (isPure.value) {
    return { name: '助手', title: '系统', icon: '🤖', greeting: '你好，我是你的健康助手。' };
  }
  const race = store.user.race || 'HUMAN';
  return RACE_NPCS[race] || RACE_NPCS.HUMAN || { name: '导师', title: '指引者', icon: '🧚', greeting: '你好！' };
});

// 过渡状态：true 时隐藏 UI，false 时显示
const isTransitioning = ref(false);

// --- 深度定制的引导文案 (纯净模式 & RPG 模式区分) ---
const guideSteps = computed(() => {
  if (isPure.value) {
    // === 纯净模式引导 (全页面覆盖) ===
    return [
      // 1. 首页概览
      {
        title: '纯净模式',
        text: `你好，${store.user.nickname}。你已进入「纯净数据模式」。\n在这个模式下，所有 RPG 元素（战斗、装备、技能）都已隐藏，专注于高效的数据记录。`,
        focusId: null,
        route: '/'
      },
      {
        title: '添加记录',
        text: "这是最核心的功能。点击右下角的悬浮按钮，随时记录饮食。\n我们支持 AI 拍照识别，让记录过程尽可能简单。",
        focusId: 'guide-global-supply',
        route: '/'
      },
      {
        title: '热量看板',
        text: "首页顶部展示了今日的核心数据：摄入热量与 BMR (基础代谢) 的对比。\n保持健康的营养配比（碳水/蛋白/脂肪）是关键。",
        focusId: 'guide-monster',
        route: '/'
      },
      {
        title: '每日打卡',
        text: "这里是你的健康习惯清单。\n包括喝水、吃蔬菜等微习惯，完成打卡有助于养成健康的生活方式。",
        focusId: 'guide-quest',
        route: '/'
      },
      {
        title: '日期导航',
        text: "点击顶部日期，可以补录过去的数据，或者查看之前的记录。",
        focusId: 'guide-date',
        route: '/'
      },

      // 2. 统计页引导
      {
        title: '数据统计',
        text: "接下来，我们去看看统计报表。",
        focusId: 'tour-tab-analysis',
        route: '/'
      },
      {
        title: '多维分析',
        text: "在这里，你可以切换查看【今日热量详情】、【历史周报】以及【体重趋势】。\n持续记录体重能让你更直观地看到身体的变化。",
        focusId: 'guide-analysis-header',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'today'
      },

      // 3. 个人页引导
      {
        title: '个人中心',
        text: "最后是个人设置页面。",
        focusId: 'tour-tab-profile',
        route: '/analysis'
      },
      {
        title: '身体档案',
        text: "这里管理着你的身高、体重等基础数据。\n请定期更新体重，系统会自动重新计算你的 BMR (每日推荐热量)。",
        focusId: null, // 纯净模式下这里是个大卡片，不聚焦具体ID以免错位
        route: '/profile'
      },
      {
        title: '切换模式',
        text: "如果你觉得纯净模式太枯燥，或者想体验「打怪升级」的乐趣，\n点击左上角的【设置】，随时可以切换回「沉浸 RPG 模式」。",
        focusId: 'guide-settings',
        route: '/profile'
      }
    ];
  } else {
    // === RPG 模式引导 (保持原样 + 增加纯净模式提示) ===
    return [
      // === 首页篇 ===
      {
        title: '欢迎来到战场',
        text: `你好，${store.user.nickname}！我是${npc.value.name}。\n这里是你的主战场。准备好用「饮食」作为武器来征服怪物了吗？`,
        focusId: null,
        route: '/'
      },
      {
        title: '时空罗盘',
        text: "顶部是时间控制器。\n漏记了昨天的饮食？点击这里可以「穿越」回过去补录，或者查看历史战绩。",
        focusId: 'guide-date',
        route: '/'
      },
      {
        title: '公会大厅',
        text: "每天记得来公会接取委托！\n完成「控糖」、「增肌」等悬赏任务，能获得大量经验值，这是升级最快的方式。",
        focusId: 'guide-quest',
        route: '/'
      },
      {
        title: 'Boss 状态 (BMR)',
        text: "看见这个怪物了吗？它的血量 = 你的基础代谢 (BMR)。\n你需要吃够热量来击败它，但要注意——吃得太油太甜会给它回血（甚至狂暴）！",
        focusId: 'guide-monster',
        route: '/'
      },

      // === 战报篇 ===
      {
        title: '前往战报室',
        text: "跟我来，我们去详细分析一下你的战斗数据。\n知己知彼，百战不殆。",
        focusId: 'tour-tab-analysis',
        route: '/'
      },
      {
        title: '战术控制台',
        text: "这里是战报总览。\n点击顶部的标签卡，可以切换【今日战况】、【历史战绩】和【体态趋势】三个视图。",
        focusId: 'guide-analysis-header',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'today'
      },
      {
        title: '今日战况 - 仪表盘',
        text: "中间的数字不是简单的卡路里，而是你对 Boss 造成的【真实伤害】。\n下方的进度条显示了 Boss 的剩余血量（距离 BMR 达标还有多远）。",
        focusId: 'guide-analysis-circle',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'today'
      },
      {
        title: '今日战况 - 营养配比',
        text: "注意下方的三色能量条，它们决定了你的攻击效果：\n🔴 蛋白质：修复护甲，提升格挡\n🟡 碳水：行动能量，过低会无力\n🟢 脂肪：储备能源，过高会滋养怪物\n\n只有三者均衡，才能打出「暴击」伤害！",
        focusId: 'guide-analysis-bars',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'today'
      },
      {
        title: '冒险编年史 (History)',
        text: "切换到周视图。这里记录了你过去 7 天的战果：\n🟩 VICTORY (大捷)：热量控制完美\n🟥 DEFEAT (失守)：暴饮暴食或节食过度\n\n点击任意一天的条目，可以查看那天的详细战斗回放。",
        focusId: 'guide-weekly-stats',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'week'
      },
      {
        title: '体态趋势 (Trend)',
        text: "切换到体态视图。这是你的「肉体塑造」曲线。\n\n记住：体重直接影响你的基础属性！\n📉 减重 = 提升【敏捷】(闪避率)\n📈 增肌 = 提升【力量】(格挡值)",
        focusId: 'guide-weight-chart',
        route: '/analysis',
        action: () => systemStore.analysisActiveTab = 'body'
      },

      // === 英雄篇 ===
      {
        title: '英雄档案',
        text: "最后，来看看你的个人状态面板。",
        focusId: 'tour-tab-profile',
        route: '/analysis'
      },
      {
        title: '属性与战力',
        text: "这里显示了你的核心三维：力量、敏捷、体质。\n系统会根据你的体重变化，自动重新计算这些战斗数值。",
        focusId: 'guide-profile-stats',
        route: '/profile'
      },
      {
        title: '装备系统',
        text: "达成成就会解锁稀有装备。\n在这里穿戴它们，可以获得特殊被动（如：连击不中断、暴击翻倍）。",
        focusId: 'guide-equipment',
        route: '/profile'
      },

      // === 模式切换提示 (New) ===
      {
        title: '模式切换',
        text: "如果你觉得 RPG 元素太复杂，只想安安静静记个账，\n点击左上角的【设置】，可以切换到极简的「纯净模式」。",
        focusId: 'guide-settings',
        route: '/profile'
      },

      // === 补给篇 ===
      {
        title: '准备出征',
        text: "好了，特训结束。现在让我们回到战场，开始你的第一次补给吧！",
        focusId: 'tour-tab-home',
        route: '/profile'
      },
      {
        title: '悬浮补给舱',
        text: "这个悬浮按钮是你的「战术背包」。\n无论你在哪个页面，点击它即可呼叫空投补给（记录饮食）。\n\n现在，点击它，开始你的冒险吧！",
        focusId: 'guide-global-supply',
        route: '/'
      }
    ];
  }
});

const currentStepIndex = computed({
  get: () => systemStore.guideCurrentStep,
  set: (v) => systemStore.guideCurrentStep = v
});

const currentStep = computed(() => guideSteps.value[currentStepIndex.value]);

const spotlightStyle = ref({});
const dialogStyle = ref({});

// [Fix Logic] 增强版查找元素：增加重试次数和间隔，确保移动端渲染完成后能找到
const findElementWithRetry = async (id: string, maxRetries = 10): Promise<HTMLElement | null> => {
  let el = document.getElementById(id);
  let retries = 0;
  while (!el && retries < maxRetries) {
    await new Promise(r => setTimeout(r, 300)); // 延长单次等待时间到 300ms
    el = document.getElementById(id);
    retries++;
  }
  return el;
};

const updateSpotlight = async () => {
  if (!show.value) return;

  isTransitioning.value = true;

  try {
    const step = currentStep.value;

    if (step.route && route.path !== step.route) {
      await router.push(step.route);
      await new Promise(r => setTimeout(r, 600));
    }

    if (step.action) {
      step.action();
      await nextTick();
      await new Promise(r => setTimeout(r, 800)); // 等待 Tab 切换动画
    }

    await nextTick();

    if (!step.focusId) {
      spotlightStyle.value = { display: 'none' };
      dialogStyle.value = { bottom: '20vh' };
      return;
    }

    // [Fix] 使用增强版查找
    const el = await findElementWithRetry(step.focusId);

    if (el) {
      // [Fix] 使用 'nearest' 避免移动端大幅跳动
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch(e) {
        el.scrollIntoView(); // 兼容旧浏览器
      }

      await new Promise(r => setTimeout(r, 500));

      const rect = el.getBoundingClientRect();
      const padding = 8;

      spotlightStyle.value = {
        display: 'block',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
      };

      const vh = window.innerHeight;
      const centerY = rect.top + rect.height / 2;

      // [Fix V4.4] 小屏适配逻辑：强制安全吸附
      const spaceBottom = vh - rect.bottom;
      const spaceTop = rect.top;

      if (spaceBottom < 220) {
        // 底部空间不足，尝试放上方
        if (spaceTop > 250) {
          const bottomPos = vh - rect.top + 20;
          dialogStyle.value = { bottom: `${bottomPos}px` };
        } else {
          // 上下都不足（大元素占满屏幕），强制吸附底部（覆盖部分内容，但保证引导可操作）
          dialogStyle.value = { bottom: '20px' };
        }
      } else {
        // 底部空间充足，正常放下方
        const topPos = rect.bottom + 20;
        dialogStyle.value = { top: `${topPos}px` };
      }

    } else {
      // 兜底：找不到元素时居中显示，保证流程不卡死
      spotlightStyle.value = { display: 'none' };
      dialogStyle.value = { bottom: '20vh' };
    }
  } catch (error) {
    console.error('Guide error:', error);
    // 出错也保证 UI 显示
    spotlightStyle.value = { display: 'none' };
    dialogStyle.value = { bottom: '20vh' };
  } finally {
    // [Fix] 无论成功失败，必须结束过渡状态，否则用户看不见对话框
    isTransitioning.value = false;
  }
};

const nextStep = async () => {
  // [Fix] 防止重复点击
  if (isTransitioning.value) return;

  if (currentStepIndex.value < guideSteps.value.length - 1) {
    isTransitioning.value = true;
    await new Promise(r => setTimeout(r, 300));
    currentStepIndex.value++;
    // updateSpotlight 会在 watcher 中触发并处理后续逻辑
  } else {
    finish();
  }
};

const prevStep = async () => {
  if (isTransitioning.value) return;

  if (currentStepIndex.value > 0) {
    isTransitioning.value = true;
    await new Promise(r => setTimeout(r, 300));
    currentStepIndex.value--;
  }
};

const finish = () => {
  show.value = false;
  currentStepIndex.value = 0;
};

watch(currentStepIndex, () => {
  updateSpotlight();
});

watch(show, (val) => {
  if (val) {
    currentStepIndex.value = 0;
    updateSpotlight();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  window.addEventListener('resize', updateSpotlight);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateSpotlight);
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9990]">

    <!-- Spotlight -->
    <div class="guide-spotlight transition-opacity duration-300"
         :class="isTransitioning ? 'opacity-0' : 'opacity-100'"
         :style="spotlightStyle"></div>

    <!-- Mask -->
    <div v-if="!currentStep.focusId" class="absolute inset-0 bg-black/70 backdrop-blur-sm transition-all duration-500"></div>

    <!-- Interaction Layer -->
    <div class="w-full h-full relative pointer-events-auto z-[9995]" @click.stop>

      <!-- Dialog Box -->
      <div class="absolute left-4 right-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-500 z-40"
           :class="[isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100']"
           :style="dialogStyle">

        <!-- 名字条 -->
        <div class="absolute -top-4 left-6 bg-slate-800 text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg border-2 border-white dark:border-slate-600">
          {{ npc.title }} · {{ npc.name }}
        </div>

        <!-- 内容区域 -->
        <div class="mt-3 flex-1">
          <h3 class="font-bold text-lg mb-2 text-purple-700 dark:text-purple-400 flex items-center">
            {{ currentStep?.title || '' }}
            <span class="text-xs text-slate-400 ml-2 font-normal">({{ currentStepIndex + 1 }}/{{ guideSteps.length }})</span>
          </h3>
          <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-line font-medium min-h-[3em]">
            {{ currentStep?.text || '' }}
          </p>
        </div>

        <!-- 按钮组 -->
        <div class="flex justify-end gap-3 mt-5">
          <button v-if="currentStepIndex > 0" @click="prevStep" class="text-xs text-slate-500 hover:text-purple-500 font-bold px-3 py-2 flex items-center transition-colors">
            <i class="fas fa-arrow-left mr-1"></i> 上一步
          </button>

          <div class="flex-1"></div>

          <button @click="finish" class="text-xs text-slate-400 hover:text-slate-600 px-4 py-2 font-bold transition-colors">跳过</button>
          <button @click="nextStep" class="bg-slate-800 text-white px-6 py-2.5 rounded-full font-bold shadow-lg hover:bg-slate-700 active:scale-95 transition-all flex items-center text-sm">
            {{ currentStepIndex < guideSteps.length - 1 ? '下一步' : '开始使用' }} <i class="fas fa-caret-right ml-2"></i>
          </button>
        </div>

        <!-- 进度条 -->
        <div class="absolute bottom-1 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700 rounded-b-2xl overflow-hidden">
          <div class="h-full bg-slate-800 transition-all duration-300" :style="{ width: ((currentStepIndex + 1) / guideSteps.length) * 100 + '%' }"></div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 核心光圈样式 */
.guide-spotlight {
  position: absolute;
  /* 使用超大阴影遮挡周围 */
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  /* 增加白色高亮边框 */
  border: 4px solid rgba(255, 255, 255, 0.8);
  /* 禁用鼠标事件，允许点击穿透（如果需要交互的话） */
  pointer-events: none;
  z-index: 9991;
  /* 呼吸动画 */
  animation: spotlight-pulse 2s infinite;
  /* 位置过渡 */
  transition: top 0.4s cubic-bezier(0.25, 1, 0.5, 1),
  left 0.4s cubic-bezier(0.25, 1, 0.5, 1),
  width 0.4s cubic-bezier(0.25, 1, 0.5, 1),
  height 0.4s cubic-bezier(0.25, 1, 0.5, 1),
  opacity 0.3s ease; /* 透明度过渡 */
}

@keyframes spotlight-pulse {
  0% { border-color: rgba(255, 255, 255, 0.6); transform: scale(1); }
  50% { border-color: rgba(255, 255, 255, 1); transform: scale(1.02); }
  100% { border-color: rgba(255, 255, 255, 0.6); transform: scale(1); }
}
</style>
