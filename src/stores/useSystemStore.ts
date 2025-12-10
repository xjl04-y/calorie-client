import { defineStore } from 'pinia';
import { reactive, ref, onUnmounted } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import type { SystemTempState, ModalState } from '@/types'; // 引入类型

export const useSystemStore = defineStore('system', () => {
  // --- State ---
  const isDarkMode = ref(true);
  const currentDate = ref(getLocalDateStr());
  const analysisRefDate = ref(getLocalDateStr());
  const guideStep = ref(0);

  // 全局心跳时间戳
  const timestamp = ref(Date.now());
  let timerInterval: number | null = null;

  function startHeartbeat() {
    if (timerInterval) return;
    timerInterval = window.setInterval(() => {
      timestamp.value = Date.now();
    }, 1000);
  }

  function stopHeartbeat() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  startHeartbeat();

  onUnmounted(() => {
    stopHeartbeat();
  });

  // [Fix 3.3] 使用严格的类型接口
  const modals = reactive<ModalState>({
    addFood: false,
    quantity: false,
    levelUp: false,
    achievements: false,
    unlock: false,
    onboarding: true,
    itemDetail: false,
    equipmentSwap: false,
    historyDetail: false,
    logDetail: false,
    hpHistory: false,
    questBoard: false,
    skillTree: false,
    npcGuide: false
  });

  // [Fix 3.3] 使用 SystemTempState 接口，消除 any
  const temp = reactive<SystemTempState>({
    activeMealType: 'SNACK',
    isBuilding: false,
    basket: [],
    isShaking: false,
    isDamaged: false,
    searchResetTrigger: 0,
    activeSlot: null,
    selectedHistoryDate: null,
    selectedItem: null,
    unlockedAchievement: null,
    selectedLog: null,
    pendingItem: undefined
  });

  // --- Actions ---
  // [Fix 3.3] 移除 @ts-ignore，key 现在被约束为 ModalState 的键
  function setModal(key: keyof ModalState, val: boolean) {
    modals[key] = val;
  }

  function triggerShake() {
    temp.isShaking = true;
    temp.isDamaged = true;
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  return {
    isDarkMode,
    currentDate,
    analysisRefDate,
    guideStep,
    modals,
    temp,
    timestamp,
    setModal,
    triggerShake
  };
});
