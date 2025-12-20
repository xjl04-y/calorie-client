import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import { showNotify } from 'vant';
import type { SystemTempState, ModalState, FoodItem, DailyStreak } from '@/types';

export const useSystemStore = defineStore('system', () => {
  // --- State: 基础设置 ---
  const isDarkMode = ref(true);
  const isPureMode = ref(false);
  const currentDate = ref(getLocalDateStr());
  const analysisRefDate = ref(getLocalDateStr());

  // [PM Add] 连胜系统状态
  const streak = ref<DailyStreak>({
    currentStreak: 0,
    lastLoginDate: '',
    maxStreak: 0
  });

  const analysisActiveTab = ref('daily');
  const guideCurrentStep = ref(0);

  // --- State: 全局心跳 ---
  const timestamp = ref(Date.now());
  let timerInterval: number | null = null;
  let lastDateCheck = Date.now(); // 内部变量，用于 heartbeat 节流

  function startHeartbeat() {
    if (timerInterval) return;
    timerInterval = window.setInterval(() => {
      const now = Date.now();
      timestamp.value = now;

      // [Feature] 跨天自动检测逻辑 (每分钟检查一次)
      if (now - lastDateCheck > 60000) {
        const realDate = getLocalDateStr();
        if (realDate !== currentDate.value) {
          console.log(`[System] Cross-day detected: ${currentDate.value} -> ${realDate}`);
          currentDate.value = realDate;
          analysisRefDate.value = realDate; // 同步重置分析日期

          // 提示用户
          showNotify({
            type: 'primary',
            message: '📅 新的一天开始了！怪物已刷新。',
            duration: 3000,
            background: '#7c3aed'
          });
        }
        lastDateCheck = now;
      }
    }, 1000);
  }

  function stopHeartbeat() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // 启动心跳
  startHeartbeat();

  // --- Getters ---

  // [PM Add] 连胜加成计算: 每连胜1天+5%奖励，最高50%
  const streakBonusMultiplier = computed(() => {
    const bonus = 1 + Math.min(streak.value.currentStreak * 0.05, 0.5);
    return Number(bonus.toFixed(2));
  });

  // --- State: 模态框管理 (保留你原有的完整列表) ---
  const modals = reactive<ModalState>({
    addFood: false,
    addExercise: false,
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
    manualAdd: false,
    fasting: false,
    targetConfig: false,
    bodyTrendDetail: false,        // [New] 体态趋势详情弹窗
    exerciseLogDetail: false,      // [Existing] 运动记录详情
    hydrationLogDetail: false      // [Existing] 补水记录详情
  });

  // --- State: 临时/动画状态 (保留你原有的逻辑) ---
  const temp = reactive<SystemTempState & {
    attackVfx: string | null;
    projectile: { show: boolean, icon: string, id: number } | null;
    selectedBodyTrendPoint: import('@/types').RPGTrendData | import('@/types').PureTrendData | null;  // [New] 选中的体态趋势数据点
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
    isHealing: false,
    isCrit: false,
    attackVfx: null,
    projectile: null,
    selectedBodyTrendPoint: null  // [New] 初始化
  });

  // --- Actions ---

  function setModal(key: keyof ModalState, val: boolean) {
    modals[key] = val;
  }

  // [工单03] 切换模式方法
  function toggleMode() {
    isPureMode.value = !isPureMode.value;
    // Pinia persist 会自动保存，但为了确保即时生效，我们手动触发一次
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('system-isPureMode', String(isPureMode.value));
    }
  }

  /**
   * [PM Add] 核心逻辑：检查每日登录并处理连胜
   * 此方法由 HomeView 在 onMounted 时调用
   */
  function checkDailyLogin() {
    const today = getLocalDateStr(); // 使用你工具类里的日期获取

    // 1. 如果今天已经结算过了，直接返回
    if (streak.value.lastLoginDate === today) {
      return { isNewDay: false, streakBonus: 0, message: '' };
    }

    const lastLogin = streak.value.lastLoginDate;
    let isStreakKept = false;

    // 2. 连胜判断逻辑
    if (!lastLogin) {
      // 首次登录
      streak.value.currentStreak = 1;
    } else {
      const oneDay = 24 * 60 * 60 * 1000;
      const lastTime = new Date(lastLogin).getTime();
      const thisTime = new Date(today).getTime();
      const diff = thisTime - lastTime;

      // 允许 48 小时内的登录算作“连续”（容错1天）
      // 比如：昨天没登，今天登了，如果时间差在合理范围内，可以通过道具补签（道具逻辑在 HeroStore），
      // 但这里 SystemStore 做基础的日期判定。
      // 简化逻辑：只要是昨天或今天，就算连续。

      // 判断是否是“昨天”
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStr(yesterday);

      if (lastLogin === yesterdayStr) {
        streak.value.currentStreak += 1;
        isStreakKept = true;
      } else {
        // 断签重置
        streak.value.currentStreak = 1;
        isStreakKept = false;
      }
    }

    // 更新历史最高
    if (streak.value.currentStreak > streak.value.maxStreak) {
      streak.value.maxStreak = streak.value.currentStreak;
    }

    // 更新最后登录日期
    streak.value.lastLoginDate = today;

    const message = isStreakKept
      ? `🔥 连胜延续！当前连胜：${streak.value.currentStreak} 天`
      : `⚔️ 新的冒险开始！连胜：1 天`;

    return {
      isNewDay: true,
      streakBonus: streak.value.currentStreak * 10, // 基础金币奖励
      message
    };
  }

  // --- VFX Actions (保留原逻辑) ---

  function triggerShake() {
    if (isPureMode.value) return;
    temp.isShaking = true;
    temp.isDamaged = true;
    if(typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  function triggerHealEffect() {
    if (isPureMode.value) return;
    temp.isHealing = true;
    setTimeout(() => { temp.isHealing = false; }, 800);
  }

  function triggerCritEffect() {
    if (isPureMode.value) return;
    temp.isCrit = true;
    if(typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 200]);
    setTimeout(() => { temp.isCrit = false; }, 300);
  }

  function triggerAttackEffect(type: 'slash' | 'magic' = 'slash') {
    if (isPureMode.value) return;
    temp.attackVfx = type;
    setTimeout(() => { temp.attackVfx = null; }, 400);
  }

  function triggerProjectile(icon: string) {
    if (isPureMode.value) return;
    temp.projectile = { show: true, icon, id: Date.now() };
    setTimeout(() => {
      temp.projectile = null;
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
    modals,
    temp,
    timestamp,
    streak, // Export state
    streakBonusMultiplier, // Export getter
    setModal,
    toggleMode, // [工单03] 导出切换方法
    triggerShake,
    triggerHealEffect,
    triggerCritEffect,
    triggerAttackEffect,
    triggerProjectile,
    checkDailyLogin // Export action
  };
}, {
  persist: true
});
