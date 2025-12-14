import { defineStore } from 'pinia';
import { reactive, ref, onUnmounted } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import type { SystemTempState, ModalState, FoodItem } from '@/types'; // Import FoodItem

export const useSystemStore = defineStore('system', () => {
  // --- State ---
  const isDarkMode = ref(true);
  const isPureMode = ref(false);
  const currentDate = ref(getLocalDateStr());
  const analysisRefDate = ref(getLocalDateStr());

  // [Removed] 移除了 aiApiKey，因为 AI 服务尚未开发完成

  const analysisActiveTab = ref('daily');
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

  // [V4.0 Update] 注册商店和转生弹窗
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
    settings: false,
    shop: false,
    rebirth: false,
    hydration: false,
    dailyReport: false,
    // [New V4.7]
    manualAdd: false
  });

  // [Layer 1 & 3] 动画状态定义
  const temp = reactive<SystemTempState & {
    attackVfx: string | null;
    projectile: { show: boolean, icon: string, id: number } | null; // 飞行道具状态
  }>({
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
    floatingTexts: [],
    reportData: null,
    // [V4.3] 特效状态
    isHealing: false,
    isCrit: false,
    // [V4.4] 攻击动画
    attackVfx: null,
    // [V4.5] 飞行道具 (投掷物)
    projectile: null
  });

  // --- Actions ---
  function setModal(key: keyof ModalState, val: boolean) {
    modals[key] = val;
  }

  function triggerShake() {
    if (isPureMode.value) return;
    temp.isShaking = true;
    temp.isDamaged = true;
    if(typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  // 触发治疗特效 (蓝色柔光)
  function triggerHealEffect() {
    if (isPureMode.value) return;
    temp.isHealing = true;
    setTimeout(() => { temp.isHealing = false; }, 800);
  }

  // 触发暴击特效 (金色闪光)
  function triggerCritEffect() {
    if (isPureMode.value) return;
    temp.isCrit = true;
    if(typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 200]);
    setTimeout(() => { temp.isCrit = false; }, 300);
  }

  // 触发攻击特效 (Boss受击)
  function triggerAttackEffect(type: 'slash' | 'magic' = 'slash') {
    if (isPureMode.value) return;
    temp.attackVfx = type;
    setTimeout(() => { temp.attackVfx = null; }, 400);
  }

  // [New V4.5] 触发投掷动画 (Source -> Trajectory -> Hit)
  function triggerProjectile(icon: string) {
    if (isPureMode.value) return;
    // 重置状态以支持连续触发
    temp.projectile = { show: true, icon, id: Date.now() };
    // 动画时长与 CSS 保持一致 (0.6s)
    setTimeout(() => {
      temp.projectile = null;
      // 投掷结束后，触发命中特效
      triggerAttackEffect('slash');
    }, 550);
  }

  return {
    isDarkMode,
    isPureMode,
    currentDate,
    analysisRefDate,
    analysisActiveTab,
    guideCurrentStep,
    // [Removed] aiApiKey
    modals,
    temp,
    timestamp,
    setModal,
    triggerShake,
    triggerHealEffect,
    triggerCritEffect,
    triggerAttackEffect,
    triggerProjectile // Export
  };
});
