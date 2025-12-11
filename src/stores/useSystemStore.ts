import { defineStore } from 'pinia';
import { reactive, ref, onUnmounted } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import type { SystemTempState, ModalState } from '@/types';

export const useSystemStore = defineStore('system', () => {
  // --- State ---
  const isDarkMode = ref(true);
  const isPureMode = ref(false); // [New] 纯净模式开关
  const currentDate = ref(getLocalDateStr());
  const analysisRefDate = ref(getLocalDateStr());

  // 持久化引导步骤
  const guideCurrentStep = ref(0);

  // 全局心跳
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
    npcGuide: false,
    settings: false // [New] 注册设置弹窗
  });

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
    pendingItem: undefined,
    floatingTexts: []
  });

  // --- Actions ---
  function setModal(key: keyof ModalState, val: boolean) {
    modals[key] = val;
  }

  function triggerShake() {
    // 纯净模式下禁用震动和屏幕抖动
    if (isPureMode.value) return;

    temp.isShaking = true;
    temp.isDamaged = true;
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  return {
    isDarkMode,
    isPureMode,
    currentDate,
    analysisRefDate,
    guideCurrentStep,
    modals,
    temp,
    timestamp,
    setModal,
    triggerShake
  };
});
