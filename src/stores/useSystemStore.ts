import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';

export const useSystemStore = defineStore('system', () => {
  // --- State ---
  const isDarkMode = ref(true);

  // 修复：使用本地日期工具初始化，解决 UTC 跨天 bug
  const currentDate = ref(getLocalDateStr());

  // 战报分析的基准日期
  const analysisRefDate = ref(getLocalDateStr());

  // 引导步骤 (0: 欢迎, 1: 首页介绍, 2: 战报介绍, 3: 档案介绍, 4: 结束)
  const guideStep = ref(0);

  // 所有弹窗的状态管理
  const modals = reactive({
    addFood: false, quantity: false, levelUp: false, achievements: false,
    unlock: false, onboarding: true, itemDetail: false, equipmentSwap: false,
    historyDetail: false, logDetail: false, hpHistory: false,
    npcGuide: false
  });

  // UI 临时状态
  const temp = reactive({
    activeMealType: 'SNACK' as const,
    isBuilding: false,
    basket: [] as any[], // 即使我们有 FoodItem 类型，这里暂保持 any 以兼容 UI 层的灵活性，但在逻辑层要转换
    isShaking: false,
    isDamaged: false,
    searchResetTrigger: 0,
    activeSlot: null as string | null,
    selectedHistoryDate: null as string | null,
    selectedItem: null as any,
    unlockedAchievement: null as any,
    selectedLog: null as any
  });

  // --- Actions ---
  function setModal(key: keyof typeof modals, val: boolean) {
    modals[key] = val;
  }

  function triggerShake() {
    temp.isShaking = true;
    temp.isDamaged = true;
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  return { isDarkMode, currentDate, analysisRefDate, guideStep, modals, temp, setModal, triggerShake };
});
