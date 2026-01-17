import { defineStore } from 'pinia';
import { ref } from 'vue';
// [修复] 将类型引入拆分为 import type，解决 verbatimModuleSyntax 报错
import { LocalNotifications } from '@capacitor/local-notifications';
import type { ScheduleOptions, ActionPerformed } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { showConfirmDialog, showToast } from 'vant';
import { useGameStore } from '@/stores/counter';

// 常量定义
const NOTIFICATION_IDS = {
  DAILY_REMINDER: 1001,
  TEST_REMINDER: 9999,
};

const STORAGE_KEY_ASKED = 'health_rpg_notif_asked';

// 文案库：随机化内容配置
const RANDOM_TITLES = [
  '📅 冒险日志缺失',
  '⚠️ 连击中断警告',
  '🍖 补给时间到',
  '🐉 你的英雄饿了',
  '📜 公会日常提醒'
];

const RANDOM_BODIES = [
  '勇士，你今天还没有记录饮食哦！保持记录才能维持战斗力 (HP) 💪',
  '今天的冒险还没有记录？这样下去经验值会停滞不前的！',
  '你的宠物正在看着空空的食盆发呆...快来记录一下吧！',
  '只有自律的勇者才能拔出石中剑。记录今天的饮食吗？',
  '检测到生命体征平稳，但数据记录中断。请立即更新日志！'
];

export const useNotificationStore = defineStore('notification', () => {
  const hasPermission = ref<boolean>(false);
  const isInitialized = ref(false);

  /**
   * 内部方法：获取随机文案
   */
  const getRandomContent = () => {
    const title = RANDOM_TITLES[Math.floor(Math.random() * RANDOM_TITLES.length)];
    const body = RANDOM_BODIES[Math.floor(Math.random() * RANDOM_BODIES.length)];
    return { title, body };
  };

  /**
   * 初始化基础配置 (仅创建通道，不主动申请权限)
   */
  const initNotificationChannel = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const check = await LocalNotifications.checkPermissions();
      hasPermission.value = check.display === 'granted';

      // 仅当已有权限时，才创建通道，避免过早触碰系统 API
      if (hasPermission.value) {
        await createChannel();
      }
      isInitialized.value = true;
    } catch (error) {
      console.error('[Notification] Init failed:', error);
    }
  };

  /**
   * 创建 Android 通道
   */
  const createChannel = async () => {
    await LocalNotifications.createChannel({
      id: 'daily_reminders',
      name: '日常提醒',
      description: '提醒用户记录饮食和运动',
      importance: 5,
      visibility: 1,
      sound: 'default.wav',
      vibration: true,
    });
  };

  /**
   * 核心逻辑：场景化权限申请
   * 场景：用户刚刚成功记录了一条食物，此时触发询问
   */
  const tryPromptForPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. 如果已经有权限，直接返回
    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') {
      hasPermission.value = true;
      return;
    }

    // 2. 检查是否已经询问过（避免每次记录都弹窗骚扰）
    const alreadyAsked = localStorage.getItem(STORAGE_KEY_ASKED);
    if (alreadyAsked) return;

    // 3. 弹出应用内引导 Modal (软询问)
    try {
      await showConfirmDialog({
        title: '记录成功！✨',
        message: '为了防止连击中断，需要每天定时提醒你记录饮食吗？',
        confirmButtonText: '好，提醒我',
        cancelButtonText: '暂不需要',
        confirmButtonColor: '#10b981'
      });

      // 4. 用户同意软询问后，发起系统权限请求
      const request = await LocalNotifications.requestPermissions();

      // 标记已询问
      localStorage.setItem(STORAGE_KEY_ASKED, 'true');

      if (request.display === 'granted') {
        hasPermission.value = true;
        await createChannel();
        await refreshInactivityReminder(); // 立即调度
        showToast({ type: 'success', message: '提醒已开启' });
      } else {
        showToast({ type: 'fail', message: '权限被拒绝' });
      }
    } catch {
      // 用户点击了取消
      localStorage.setItem(STORAGE_KEY_ASKED, 'true');
      console.log('[Notification] User declined soft prompt');
    }
  };

  /**
   * 刷新“不活跃”提醒
   * 策略：取消旧的 -> 设定明天的随机文案 -> 携带 Deep Link 数据
   */
  const refreshInactivityReminder = async () => {
    if (!Capacitor.isNativePlatform() || !hasPermission.value) return;

    try {
      // 1. 取消旧提醒
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS.DAILY_REMINDER }] });

      // 2. 时间设定：明天上午 10:00 (或者根据用户习惯动态调整，这里先固定)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      // 3. 获取随机文案
      const { title, body } = getRandomContent();

      // 4. 准备 Deep Link 数据 (Extra)
      // 这是一个具体的动作指令
      const extraData = {
        action: 'OPEN_MODAL',
        target: 'addFood',
        payload: {
          category: 'BREAKFAST', // 默认预选早餐，可根据时间动态判断
          autoSearch: ''
        }
      };

      const options: ScheduleOptions = {
        notifications: [
          {
            id: NOTIFICATION_IDS.DAILY_REMINDER,
            title: title,
            body: body,
            schedule: { at: tomorrow, allowWhileIdle: true },
            sound: 'default',
            channelId: 'daily_reminders',
            extra: extraData, // 关键：注入数据
            smallIcon: 'ic_stat_icon_config_sample',
          },
        ],
      };

      await LocalNotifications.schedule(options);
      console.log(`[Notification] Scheduled for ${tomorrow.toLocaleString()} with content: ${title}`);

    } catch (error) {
      console.error('[Notification] Schedule failed:', error);
    }
  };

  /**
   * 全局监听器设置 (应在 App.vue 挂载时调用)
   */
  const setupListeners = () => {
    if (!Capacitor.isNativePlatform()) return;

    LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction: ActionPerformed) => {
      console.log('[Notification] Action Received:', notificationAction);

      const extra = notificationAction.notification.extra;

      if (extra && extra.action === 'OPEN_MODAL') {
        // 处理 Deep Link
        const gameStore = useGameStore();

        // 1. 如果是打开 AddFood
        if (extra.target === 'addFood') {
          // 这里可以加入一些逻辑，比如设置当前餐段
          // 目前 GameStore 好像没有显式的 setMealType 暴露给外部，但我们可以通过 temp state 注入
          if (extra.payload?.category === 'BREAKFAST') {
            // 假设 store.temp.activeMealType 存在，如果不存在可忽略
            // gameStore.temp.activeMealType = 'BREAKFAST';
          }

          // 延迟一点点，确保 App 唤起动画完成
          setTimeout(() => {
            gameStore.setModal('addFood', true);
            console.log('[Notification] Deep link executed: addFood');
          }, 500);
        }
      }
    });
  };

  // 测试逻辑保持不变
  const testTriggerNotification = async () => {
    if (!Capacitor.isNativePlatform()) {
      showToast('请在真机测试');
      return;
    }
    const { title, body } = getRandomContent();
    await LocalNotifications.schedule({
      notifications: [{
        title: `[测试] ${title}`,
        body,
        id: NOTIFICATION_IDS.TEST_REMINDER,
        schedule: { at: new Date(Date.now() + 5000) },
        channelId: 'daily_reminders',
        extra: { action: 'OPEN_MODAL', target: 'addFood', payload: { category: 'TEST' } }
      }]
    });
  };

  return {
    hasPermission,
    initNotificationChannel,
    refreshInactivityReminder,
    tryPromptForPermission,
    setupListeners,
    testTriggerNotification
  };
});
