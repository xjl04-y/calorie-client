<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { RACES } from '@/constants/gameData';
import { showToast } from 'vant';
import type { InitUserForm } from '@/types'; // Import Type
import type { RaceType } from '@/types'; // Import RaceType

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed(() => store.modals.onboarding);
const step = ref(1);

// 卡牌动画状态
const CardState = {
  ENTERING: 'ENTERING',     // 从底部升起
  INTRO: 'INTRO',           // 入场堆叠
  CHARGING: 'CHARGING',     // 蓄力收缩
  IDLE: 'IDLE',             // 正常悬浮
  LEAVING: 'LEAVING',       // 离场下沉
  GATHERING: 'GATHERING',   // 聚合
  DETAIL: 'DETAIL',         // 展示详情
  FALLING_STACK: 'FALLING_STACK',   // 向下坠落叠在一起
  RISING_RUSH: 'RISING_RUSH',       // 从底部快速冲上来
  SPINNING_EXPAND: 'SPINNING_EXPAND', // 在中心旋转展开
  ORBIT: 'ORBIT'            // 3D 环绕 (档案填写背景)
};
type CardStateType = keyof typeof CardState;
const cardState = ref<CardStateType>(CardState.ENTERING);
const selectedRaceForDetail = ref<RaceType | null>(null);
const isFormVisible = ref(false); // 控制档案填写表单的显隐动画

// [Icon Mapping Upgrade] 升级图标映射，更有 RPG 史诗感
// 如果你想用图片，可以在这里扩展，或者直接在下方 RACES 数据中扩展
const getRaceIconClass = (race: string) => {
  const map: Record<string, string> = {
    // 人类：皇冠/城堡/骑士 -> 代表统御与均衡 (原: fa-user-shield)
    'HUMAN': 'fa-chess-knight',
    // 精灵：羽毛/树叶/弓箭 -> 代表敏捷与自然 (原: fa-wind)
    'ELF': 'fa-feather-pointed',
    // 兽人：战锤/拳头/猛兽 -> 代表纯粹的力量 (原: fa-fist-raised)
    'ORC': 'fa-gavel',
    // 亡灵：骷髅/幽灵/沙漏 -> 代表死亡与不朽 (原: fa-skull)
    'UNDEAD': 'fa-skull'
  };
  return map[race] || 'fa-question';
};

// [Image Mapping] 如果你有立绘图，可以在这里配置 URL
// 目前使用 null，代码会自动降级使用精心设计的 Icon 徽章
const getRaceImage = (race: string): string | null => {
  const map: Record<string, string> = {
    'HUMAN': '', // 'https://your-image-url/human.png'
    'ELF': '',
    'ORC': '',
    'UNDEAD': ''
  };
  return map[race] || null;
};

// [Fix] 监听弹窗打开，如果已有昵称且未选种族，直接跳到步骤2
watch(show, (val) => {
  if (val) {
    // 弹窗打开时，检查是否需要跳过步骤
    // [Fix] 只有在从转生流程来时，才允许进入种族选择
    // 或者是从设置页面切换模式并且从未进入过RPG模式
    const isFromRebirth = systemStore.temp.isFromRebirth;
    const isFromSettings = systemStore.temp.isFromSettings;

    // [Logic Update] 核心逻辑修改：使用 hasEnteredRPGMode 判定
    // 只有明确为 false 时才视为从未进入过 (防止 undefined)
    const neverEnteredRPG = systemStore.hasEnteredRPGMode === false;

    console.log('🔍 [Onboarding] watch show=true, 状态检查:', {
      isFromRebirth,
      isFromSettings,
      neverEnteredRPG,
      isPureMode: systemStore.isPureMode,
      isInitialized: store.user.isInitialized,
      nickname: store.user.nickname,
      hasEnteredRPGMode: systemStore.hasEnteredRPGMode
    });

    // 场景：从纯净模式切换到 RPG，且是第一次（从未真正进入过 RPG）
    const isFromPureToRpg = store.user.isInitialized &&
      store.user.nickname &&
      neverEnteredRPG && // 关键条件：从未进入过 RPG
      isFromSettings && // 必须是从设置页面来的
      !systemStore.isPureMode; // 只有在 RPG 模式下才跳转

    console.log('🔍 [Onboarding] isFromPureToRpg =', isFromPureToRpg);

    if (isFromRebirth || isFromPureToRpg) {
      // 情况1: 从转生流程来
      // 情况2: 从设置页面切换模式，且从未进入过RPG
      console.log('✅ [Onboarding] 跳到步骤2：种族选择');
      formData.nickname = store.user.nickname;
      formData.gender = store.user.gender;
      formData.height = store.user.height;
      formData.weight = store.user.weight;
      formData.age = store.user.age;
      // 跳过模式和档案填写，直接到种族选择
      step.value = 2;
    } else {
      // 否则从头开始
      console.log('❌ [Onboarding] 从步骤1开始');
      step.value = 1;
    }
  } else {
    // 关闭时重置
    step.value = 1;
    cardState.value = CardState.ENTERING;
    selectedRaceForDetail.value = null;
    isFormVisible.value = false;
    // [Fix Bug2] 关闭时清除来源标记
    systemStore.temp.isFromSettings = false;
    systemStore.temp.isFromRebirth = false;
  }
});

// 监听 step 变化，初始化卡牌动画
// [Fix] 增加 oldStep 参数，用于判断来源
watch(step, (newStep, oldStep) => {
  if (newStep === 2 && !systemStore.isPureMode) {
    // [Critical Fix] 如果是从步骤 3 返回步骤 2，不要播放入场动画！
    // 否则会重置为 ENTERING 状态导致瞬移和动画冲突
    if (oldStep === 3) {
      console.log('🔙 从步骤3返回，跳过入场动画，由返回动画接管');
      return;
    }

    // 只有第一次进入步骤 2 (从步骤 1 或初始打开) 时才播放入场动画
    // 进入种族选择步骤，启动卡牌入场动画
    cardState.value = CardState.ENTERING;
    selectedRaceForDetail.value = null;

    // 从底部升起 → 堆叠 → 蓄力收缩 → 爆开
    // 使用 requestAnimationFrame 确保初始状态已渲染
    requestAnimationFrame(() => {
      setTimeout(() => {
        cardState.value = CardState.INTRO;
      }, 100); // 给足够时间让 ENTERING 状态渲染

      setTimeout(() => {
        cardState.value = CardState.CHARGING; // 蓄力收缩
      }, 1600); // 升起动画 1.5s

      setTimeout(() => {
        cardState.value = CardState.IDLE; // 爆开！
      }, 2000); // 蓄力 0.4s
    });
  }
});

// [Fix Type Safety] 显式声明类型
const formData = reactive<InitUserForm>({
  race: 'HUMAN',
  nickname: '',
  gender: 'MALE',
  height: 170,
  weight: 65,
  age: 24
});

const selectMode = (isPure: boolean) => {
  systemStore.isPureMode = isPure;
  console.log('🔍 [Onboarding] selectMode', { isPure, willSetEnteredRPG: !isPure });
  // [REMOVED] 不在这里设置 hasEnteredRPGMode，等到 finish 时再设置
  // 如果选择纯净模式，跳过种族选择，直接到档案填写
  // 如果选择 RPG 模式，进入种族选择
  step.value = 2;
};

const validate = () => {
  if (!formData.nickname.trim()) {
    showToast('请输入您的称呼');
    return false;
  }
  if (formData.height <= 50 || formData.height > 250) {
    showToast('身高数据异常');
    return false;
  }
  if (formData.weight <= 20 || formData.weight > 300) {
    showToast('体重数据异常');
    return false;
  }
  return true;
};

const finish = () => {
  // [Fix] 区分三种情况：完整初始化 vs 补充种族选择 vs 转生选择种族
  const isFromRebirth = systemStore.temp.isFromRebirth;
  // [Fix] isOnlySelectingRace 为真值判断
  const isOnlySelectingRace = !!(store.user.isInitialized && store.user.nickname && formData.nickname);

  console.log('🔍 [Onboarding] finish 调用', {
    isFromRebirth,
    isOnlySelectingRace,
    isPureMode: systemStore.isPureMode,
    currentRace: formData.race
  });

  if (isFromRebirth) {
    // 情况1: 从转生流程来，确认选择种族并执行转生
    console.log('✅ [Onboarding] 情况1: 转生流程');
    // 调用rebirth方法，执行真正的转生逻辑（消耗药水、重置技能等）
    store.heroStore.rebirth(formData.race);
    // 清除转生标记
    systemStore.temp.isFromRebirth = false;
    // 关闭弹窗
    store.setModal('onboarding', false);
  } else if (isOnlySelectingRace) {
    // 情况2: 用户已有账号，只是补充选择种族（从纯净模式切换过来）
    console.log('✅ [Onboarding] 情况2: 补充选择种族');

    // 直接更新种族
    store.user.race = formData.race;
    store.saveState();

    // 确保处于 RPG 模式
    systemStore.isPureMode = false;

    // [Fix Bug] 无论选什么种族（包括 HUMAN），只要通过了这个流程，就代表正式进入 RPG 模式
    systemStore.hasEnteredRPGMode = true;
    console.log('✅ [Onboarding] 设置 hasEnteredRPGMode = true (Case 2)');

    // 关闭弹窗（不打开NPC引导，因为用户已经熟悉了）
    store.setModal('onboarding', false);
    showToast({ type: 'success', message: `✨ 欢迎加入 ${RACES[formData.race]?.name} 种族！` });
  } else {
    // 情况3: 完整的新用户初始化流程
    console.log('✅ [Onboarding] 情况3: 新用户初始化');
    if (!validate()) return;

    store.initUser(formData);

    // [Fix] 只要选择了RPG模式，就标记已进入（不管种族是什么）
    if (!systemStore.isPureMode) {
      systemStore.hasEnteredRPGMode = true;
      console.log('✅ [Onboarding] 设置 hasEnteredRPGMode = true (新用户RPG)');
    } else {
      // 纯净模式直接关闭引导弹窗
      store.setModal('onboarding', false);
      showToast({ type: 'success', message: '✅ 账号创建成功！' });

      // [Fix] 如果是纯净模式初始化，强制将 RPG 标记设为 false
      // 这是为了解决 "首次选纯净 -> 后续切 RPG 不触发种族选择" 的 Bug
      // 因为如果这里不重置，hasEnteredRPGMode 可能因为缓存或默认值而为 true
      systemStore.hasEnteredRPGMode = false;
      console.log('✅ [Onboarding] 纯净模式初始化，重置 hasEnteredRPGMode = false');
    }

    // [Fix] 只有 RPG 模式才打开新手引导
    if (!systemStore.isPureMode) {
      store.setModal('npcGuide', true);
    }
  }
};

// 卡牌数据
const raceCards = computed(() => {
  return Object.entries(RACES).map(([key, race]) => ({
    id: key,
    race: key as RaceType,
    ...race
  }));
});

// 卡牌样式计算
const getCardStyle = (index: number) => {
  const stackAngles = [-5, 3, -2, 4];
  const angle = stackAngles[index % 4];

  // 0. 从底部进入状态 - 所有卡牌从底部升起
  if (cardState.value === CardState.ENTERING) {
    return {
      transform: `translateX(-50%) translateY(150%) scale(0.8) rotate(${angle}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 0.3
    };
  }

  // 1. 入场堆叠状态 - 升到中间堆叠
  else if (cardState.value === CardState.INTRO) {
    return {
      transform: `translateX(-50%) translateY(-50%) scale(0.8) rotate(${angle}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 2. 蓄力收缩状态 - 向内收缩并微微旋转，准备爆开
  else if (cardState.value === CardState.CHARGING) {
    return {
      transform: `translateX(-50%) translateY(-50%) scale(0.65) rotate(${angle * 1.5}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 3. 正常悬浮 - 2x2 网格
  else if (cardState.value === CardState.IDLE) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    // [Visual Tune] 稍微拉大一点间距，适应新卡牌尺寸
    const gapX = 175;
    const gapY = 250;
    const offsetX = (col - 0.5) * gapX;
    const offsetY = (row - 0.5) * gapY;

    return {
      transform: `translateX(calc(-50% + ${offsetX}px)) translateY(calc(-50% + ${offsetY}px)) scale(1) rotate(0deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 4. 离场下沉状态 - 收缩并沉入底部
  else if (cardState.value === CardState.LEAVING) {
    return {
      transform: `translateX(-50%) translateY(150%) scale(0.6) rotate(${angle * 2}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 0
    };
  }

  // 5. 聚合/详情状态
  else if (cardState.value === CardState.GATHERING || cardState.value === CardState.DETAIL) {
    return {
      transform: `translateX(-50%) translateY(20%) scale(0.85) rotate(${angle}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 0.3
    };
  }

  // 6. 向下坠落叠在一起 (新增) - 强调坠落感
  else if (cardState.value === CardState.FALLING_STACK) {
    return {
      transform: `translateX(-50%) translateY(140%) scale(0.7) rotate(${angle * 0.8}deg)`,
      left: '50%',
      top: '50%',
      zIndex: 4 - index, // 反向层级，最后一张在最上面
      opacity: 0.9
    };
  }

  // 7. 从底部平滑上升到中心聚集 (修复瞬移)
  else if (cardState.value === CardState.RISING_RUSH) {
    return {
      transform: `translateX(-50%) translateY(-50%) scale(0.9) rotate(0deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 8. 在中心旋转展开 (新增) - 3D立体扇形展开
  else if (cardState.value === CardState.SPINNING_EXPAND) {
    // 每张卡片在中心位置进行3D旋转，形成立体扇形
    const rotations = [
      { rotY: -45, rotX: 20, offsetX: -60, offsetY: -30 },
      { rotY: 45, rotX: 20, offsetX: 60, offsetY: -30 },
      { rotY: -30, rotX: -15, offsetX: -60, offsetY: 30 },
      { rotY: 30, rotX: -15, offsetX: 60, offsetY: 30 }
    ];
    const rot = rotations[index];
    return {
      transform: `translateX(calc(-50% + ${rot.offsetX}px)) translateY(calc(-50% + ${rot.offsetY}px)) rotateY(${rot.rotY}deg) rotateX(${rot.rotX}deg) translateZ(30px) scale(1.05)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 9. 3D 环绕背景状态 - 散开到四周形成立体环绕
  else if (cardState.value === CardState.ORBIT) {
    const orbitPositions = [
      { x: -200, y: -60, z: -150, rotY: 65, rotX: 20 },
      { x: 200, y: -60, z: -150, rotY: -65, rotX: 20 },
      { x: -120, y: 120, z: -250, rotY: 85, rotX: -25 },
      { x: 120, y: 120, z: -250, rotY: -85, rotX: -25 }
    ];
    const pos = orbitPositions[index];
    return {
      transform: `translateX(-50%) translateY(-50%) translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateY(${pos.rotY}deg) rotateX(${pos.rotX}deg) scale(0.95)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 0.35,
      filter: 'brightness(0.35) grayscale(0.6)'
    };
  }

  return {};
};

// 点击卡牌查看详情
const showRaceDetail = (race: RaceType) => {
  if (cardState.value !== CardState.IDLE) {
    return;
  }
  selectedRaceForDetail.value = race;
  cardState.value = CardState.GATHERING;
  setTimeout(() => {
    cardState.value = CardState.DETAIL;
  }, 700);
};

// 选择种族并继续
const selectRaceAndContinue = (race: RaceType) => {
  formData.race = race;
  showToast({ type: 'success', message: `已选择 ${RACES[race].name}` });

  // 先隐藏详情面板
  cardState.value = CardState.GATHERING;
  selectedRaceForDetail.value = null;

  // 播放从底部升起的动画
  setTimeout(() => {
    cardState.value = CardState.ENTERING;
  }, 500);

  requestAnimationFrame(() => {
    setTimeout(() => {
      cardState.value = CardState.INTRO;
    }, 600);

    setTimeout(() => {
      cardState.value = CardState.CHARGING; // 蓄力收缩
    }, 2100); // 升起动画 1.5s

    setTimeout(() => {
      cardState.value = CardState.IDLE; // 爆开！
    }, 2500); // 蓄力 0.4s
  });
};

// 返回卡牌选择
const backToCards = () => {
  cardState.value = CardState.GATHERING;
  setTimeout(() => {
    cardState.value = CardState.IDLE;
    selectedRaceForDetail.value = null;
  }, 600);
};

// 前往下一步（档案填写）- 带向下坠落 + 向上冲到中心 + 3D立体旋转展开 + 环绕散开动画
const goToNextStep = () => {
  if (!formData.race) {
    showToast('请先选择种族');
    return;
  }

  // 1. 向下坠落叠在一起 (700ms 动画)
  cardState.value = CardState.FALLING_STACK;

  // 2. 等待坠落完成后，切换到 Step 3，并立即开始上升 (800ms，0.7s 动画 + 100ms 缓冲)
  setTimeout(() => {
    step.value = 3;

    // 立即开始从底部平滑上升到中心 (800ms 平滑上升)
    requestAnimationFrame(() => {
      cardState.value = CardState.RISING_RUSH;
    });
  }, 800);

  // 3. 等待上升完成后，在中心位置3D旋转展开 (1100ms，0.8s 动画 + 300ms 缓冲)
  setTimeout(() => {
    cardState.value = CardState.SPINNING_EXPAND;
  }, 1900);

  // 4. 等待旋转展开完成后，散开到四周形成3D环绕 (1000ms，0.7s 动画 + 300ms 缓冲)
  setTimeout(() => {
    cardState.value = CardState.ORBIT;
  }, 2900);

  // 5. 等待环绕完成后，表单浮现 (1200ms，0.9s 动画 + 300ms 缓冲)
  setTimeout(() => {
    isFormVisible.value = true;
  }, 4100);
};

// 返回上一步 - 倒序播放动画（严格按照前进动画的倒序）
const goToPrevStep = () => {
  if (step.value === 3) {
    // 1. 隐藏表单
    isFormVisible.value = false;

    // 2. ORBIT → SPINNING_EXPAND (等待 400ms 表单淡出)
    setTimeout(() => {
      cardState.value = CardState.SPINNING_EXPAND;
    }, 400);

    // 3. SPINNING_EXPAND → RISING_RUSH (等待 800ms)
    setTimeout(() => {
      cardState.value = CardState.RISING_RUSH;
    }, 1200);

    // 4. RISING_RUSH → IDLE (等待 800ms)
    setTimeout(() => {
      step.value = 2; // 这会触发 watch，但已被 oldStep 拦截

      // 在下一帧设置为 IDLE，卡牌从中心堆叠直接飞向各自位置
      requestAnimationFrame(() => {
        cardState.value = CardState.IDLE;
      });
    }, 2000);

  } else if (step.value === 2) {
    // [Fix] 根据来源决定返回目标
    if (systemStore.temp.isFromRebirth) {
      // 从转生流程来，返回到转生弹窗（取消转生）
      systemStore.temp.isFromRebirth = false;
      store.setModal('onboarding', false);
      systemStore.setModal('rebirth', true);
      showToast('已取消转生');
    } else if (systemStore.temp.isFromSettings) {
      // 从设置页面打开的，返回到设置页面
      store.setModal('onboarding', false);
      systemStore.setModal('settings', true);
      systemStore.temp.isFromSettings = false;
    } else {
      // 其他情况，先让卡牌离场
      cardState.value = CardState.LEAVING;
      setTimeout(() => {
        step.value--;
      }, 800);
    }
  } else {
    // 其他情况，先让卡牌离场
    cardState.value = CardState.LEAVING;
    setTimeout(() => {
      step.value--;
    }, 800);
  }
};

// 获取选中详情种族的信息
const detailRace = computed(() => {
  if (!selectedRaceForDetail.value) return null;
  return RACES[selectedRaceForDetail.value];
});
</script>
<template>
  <div v-if="show" class="fixed inset-0 z-[999] bg-[#0f172a] text-white flex flex-col overflow-hidden font-sans">
    <!-- 背景氛围 - 极简纯色 -->
    <div class="absolute inset-0 pointer-events-none bg-[#0a0f1c]">
      <!-- 仅保留极淡的网格线，增加科技感而不杂乱 -->
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10"></div>
    </div>

    <!-- 顶部标题 - 全中文 -->
    <div class="relative z-10 pt-12 px-8 mb-4">
      <div class="flex items-center gap-3 mb-2">
        <div class="h-[2px] w-8 bg-blue-500"></div>
        <div class="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">系统初始化</div>
      </div>
      <h1 class="text-4xl font-black tracking-wide text-white" style="text-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        开启旅程
      </h1>
      <div class="text-xs text-slate-500 mt-1 font-medium tracking-wider">初始化完成，请建立您的档案</div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 relative z-10 overflow-y-auto px-6 pb-24 no-scrollbar">

      <!-- 全局卡牌层 -->
      <!-- [Layout Fix] 添加 top-24 (96px) 偏移，确保卡牌区域在标题栏下方，不被遮挡 -->
      <div v-if="step >= 2 && !systemStore.isPureMode"
           class="absolute inset-x-6 top-24 h-[500px] stage-perspective"
           :class="{
             'z-30': step === 2 && cardState !== CardState.DETAIL,
             'z-0': step !== 2 || cardState === CardState.DETAIL,
             'state-orbit-scene': cardState === CardState.ORBIT
           }">
        <div class="cards-container absolute inset-0">
          <div
            v-for="(card, index) in raceCards"
            :key="card.id"
            class="race-card-item absolute"
            :class="[
              cardState === CardState.IDLE ? 'state-idle' : '',
              cardState === CardState.ENTERING ? 'state-entering' : '',
              cardState === CardState.CHARGING ? 'state-charging' : '',
              cardState === CardState.LEAVING ? 'state-leaving' : '',
              cardState === CardState.FALLING_STACK ? 'state-falling-stack' : '',
              cardState === CardState.RISING_RUSH ? 'state-rising-rush' : '',
              cardState === CardState.SPINNING_EXPAND ? 'state-spinning-expand' : '',
              cardState === CardState.ORBIT ? 'state-orbit' : '',
              formData.race === card.race ? 'selected' : '',
              step === 2 && cardState === CardState.IDLE ? 'cursor-pointer' : 'cursor-default'
            ]"
            :style="getCardStyle(index)"
            @click="() => { showRaceDetail(card.race); }"
          >
            <!-- [UI Redesign] 升级版机能风卡牌：支持背景图/纹理，以及徽章式 Icon -->
            <div class="card-floater w-[160px] h-[230px] bg-[#161e2e] relative transition-all duration-300 group overflow-hidden border-2 rounded-lg"
                 :class="[
                   formData.race === card.race
                     ? `border-${getRaceColor(index)}-500 shadow-xl shadow-${getRaceColor(index)}-900/40 scale-[1.02]`
                     : `border-slate-700 hover:border-${getRaceColor(index)}-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black`
                 ]">

              <!-- 1. 动态背景层: 如果有图片则显示图片，否则显示高科技网格纹理 -->
              <div class="absolute inset-0 z-0">
                <!-- 如果配置了图片 -->
                <img v-if="getRaceImage(card.race)"
                     :src="getRaceImage(card.race)!"
                     class="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                     alt="" />
                <!-- 否则使用 CSS 渐变纹理 -->
                <div v-else class="w-full h-full opacity-30"
                     :class="`bg-gradient-to-br from-${getRaceColor(index)}-900/50 to-transparent`">
                  <div class="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                </div>
              </div>

              <!-- 2. Watermark: 巨大的背景水印 (更加隐晦) -->
              <div class="absolute -bottom-8 -right-8 text-[140px] opacity-10 select-none pointer-events-none transform rotate-12 transition-transform duration-500 group-hover:rotate-0"
                   :class="`text-${getRaceColor(index)}-500`">
                <i :class="['fas', getRaceIconClass(card.race)]"></i>
              </div>

              <!-- 顶部装饰条 -->
              <div class="absolute top-0 left-0 w-full h-1 z-10" :class="`bg-${getRaceColor(index)}-500`"></div>

              <!-- 3. 内容层 -->
              <div class="relative z-10 h-full flex flex-col p-4 items-center">

                <!-- 顶部编号 -->
                <div class="w-full flex justify-between items-start mb-2 opacity-60">
                  <span class="text-[9px] font-mono border border-current px-1 rounded text-white tracking-widest">NO.0{{index + 1}}</span>
                </div>

                <!-- 核心图标：徽章式设计 -->
                <div class="flex-1 flex flex-col items-center justify-center py-2">
                  <!-- 发光底座 -->
                  <div class="relative w-20 h-20 flex items-center justify-center rounded-full border-2 bg-slate-900/80 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                       :class="[
                         `border-${getRaceColor(index)}-500/30 group-hover:border-${getRaceColor(index)}-400`,
                         `group-hover:shadow-${getRaceColor(index)}-500/20`
                       ]">

                    <!-- 图标本体 -->
                    <div class="text-4xl filter drop-shadow-md transform transition-all duration-300 group-hover:scale-110 relative z-10"
                         :class="`text-${getRaceColor(index)}-100`">
                      <i :class="['fas', getRaceIconClass(card.race)]"></i>
                    </div>

                    <!-- 内部光晕 -->
                    <div class="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                         :class="`bg-${getRaceColor(index)}-500`"></div>
                  </div>
                </div>

                <!-- 底部文字 -->
                <div class="w-full text-center mt-auto pb-2">
                  <h3 class="text-xl font-black text-white mb-1 tracking-[0.2em] group-hover:text-white transition-colors duration-300 font-sans shadow-black drop-shadow-md">
                    {{ card.name }}
                  </h3>
                  <div class="h-[1px] w-12 mx-auto my-2 transition-all duration-300 group-hover:w-full"
                       :class="`bg-${getRaceColor(index)}-500/50`"></div>
                  <p class="text-[10px] text-slate-300 font-medium tracking-wide opacity-80">
                    {{ card.desc.substring(0, 10) }}...
                  </p>
                </div>
              </div>

              <!-- 选中状态角标 -->
              <transition name="scale-in">
                <div v-if="formData.race === card.race" class="absolute top-0 right-0 z-20">
                  <div class="w-10 h-10 flex items-start justify-end pr-1 pt-1 text-white text-sm shadow-lg"
                       :class="`bg-${getRaceColor(index)}-600`"
                       style="clip-path: polygon(0 0, 100% 0, 100% 100%);">
                    <i class="fas fa-check text-xs"></i>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: 模式选择 -->
      <transition name="fade-slide">
        <div v-if="step === 1" class="space-y-6 mt-4">
          <p class="text-slate-400 text-xs font-bold border-l-2 border-slate-600 pl-3 tracking-wider">选择你的冒险模式</p>

          <div class="grid grid-cols-1 gap-4">
            <!-- RPG 模式 -->
            <div @click="selectMode(false)"
                 class="relative p-6 bg-[#161e2e] border-2 border-blue-600 hover:bg-blue-900/10 transition-all cursor-pointer group active:scale-[0.98]">
              <div class="flex items-center justify-between mb-3">
                <div class="text-2xl text-blue-500"><i class="fas fa-gamepad"></i></div>
                <div class="text-[10px] font-black text-blue-400 bg-blue-900/30 px-2 py-1 rounded tracking-wider">强烈推荐</div>
              </div>
              <div class="font-black text-xl text-white mb-1 group-hover:text-blue-300 font-sans">沉浸 RPG 模式</div>
              <div class="text-[10px] text-slate-400 leading-relaxed font-medium mt-2">
                将减肥变成一场冒险。打怪升级、收集装备、解锁成就，让枯燥的记录变得有趣。
              </div>
            </div>

            <!-- 纯净模式 -->
            <div @click="selectMode(true)"
                 class="relative p-6 bg-[#161e2e] border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-all cursor-pointer group active:scale-[0.98]">
              <div class="flex items-center justify-between mb-3">
                <div class="text-2xl text-emerald-500"><i class="fas fa-leaf"></i></div>
              </div>
              <div class="font-black text-xl text-white mb-1 group-hover:text-slate-300 font-sans">纯净数据模式</div>
              <div class="text-[10px] text-slate-400 leading-relaxed font-medium mt-2">
                回归本质。极简的界面，专注于热量统计、体重追踪和营养分析，无干扰。
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Step 2: 种族选择 (详情页) -->
      <transition name="fade-slide">
        <!-- [Fix] 添加 top-24 偏移 -->
        <div v-if="step === 2 && !systemStore.isPureMode" class="relative h-[500px] top-24 z-10 pointer-events-none">
          <div class="w-full h-full relative">
            <!-- 详情层 -->
            <transition name="fade">
              <div
                v-if="cardState === CardState.DETAIL && detailRace"
                class="detail-panel absolute inset-0 bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700 rounded-none p-6 flex flex-col z-20 pointer-events-auto shadow-2xl"
              >
                <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                  <button @click="backToCards"
                          class="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <i class="fas fa-arrow-left text-lg"></i>
                  </button>
                  <div class="text-center">
                    <div class="text-[10px] text-slate-500 font-bold tracking-widest">当前选择</div>
                    <h2 class="text-2xl font-black text-white tracking-widest">{{ detailRace.name }}</h2>
                  </div>
                  <div class="text-3xl text-slate-200">
                    <!-- FIX: detailRace.id -> selectedRaceForDetail -->
                    <!-- detailRace 不一定有 id 字段，直接用选中的 ID -->
                    <i :class="['fas', getRaceIconClass(selectedRaceForDetail!)]"></i>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto space-y-6">
                  <!-- 描述 -->
                  <div>
                    <div class="text-[10px] text-blue-500 font-bold mb-2 tracking-wider flex items-center gap-2">
                      <span class="w-1 h-1 bg-blue-500 rounded-full"></span> 种族背景
                    </div>
                    <p class="text-sm text-slate-300 leading-relaxed font-medium text-justify">{{ detailRace.desc }}</p>
                  </div>

                  <!-- 属性成长 - 数据条风格 -->
                  <div>
                    <div class="text-[10px] text-blue-500 font-bold mb-3 tracking-wider flex items-center gap-2">
                      <span class="w-1 h-1 bg-blue-500 rounded-full"></span> 初始面板
                    </div>
                    <div class="space-y-3">
                      <!-- 力量 -->
                      <div>
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-slate-400 font-bold">力量 (STR)</span>
                          <span class="text-white font-mono font-bold">{{ detailRace.growth?.str?.toFixed(1) }}</span>
                        </div>
                        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full bg-blue-600" :style="`width: ${(detailRace.growth?.str || 0) * 10}%`"></div>
                        </div>
                      </div>
                      <!-- 敏捷 -->
                      <div>
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-slate-400 font-bold">敏捷 (AGI)</span>
                          <span class="text-white font-mono font-bold">{{ detailRace.growth?.agi?.toFixed(1) }}</span>
                        </div>
                        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full bg-emerald-500" :style="`width: ${(detailRace.growth?.agi || 0) * 10}%`"></div>
                        </div>
                      </div>
                      <!-- 体质 -->
                      <div>
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-slate-400 font-bold">体质 (VIT)</span>
                          <span class="text-white font-mono font-bold">{{ detailRace.growth?.vit?.toFixed(1) }}</span>
                        </div>
                        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div class="h-full bg-orange-500" :style="`width: ${(detailRace.growth?.vit || 0) * 10}%`"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 种族特性 -->
                  <div class="bg-yellow-900/10 border border-yellow-700/30 p-4 relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-1">
                      <i class="fas fa-star text-yellow-700/20 text-4xl"></i>
                    </div>
                    <div class="text-[10px] text-yellow-500 font-bold mb-1 tracking-wider">专属天赋</div>
                    <p class="text-sm text-yellow-100/90 font-medium relative z-10">{{ detailRace.bonus }}</p>
                  </div>
                </div>

                <!-- 确认按钮 -->
                <button
                  @click="selectRaceAndContinue(selectedRaceForDetail!)"
                  class="mt-4 w-full bg-blue-600 text-white font-black py-4 tracking-widest hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-lg shadow-blue-900/30"
                >
                  确认身份
                </button>
              </div>
            </transition>

            <!-- 提示文字 - 调整位置至可视区域 -->
            <div
              class="absolute bottom-[-20px] w-full text-center transition-all duration-1000 delay-500 z-10"
              :class="cardState === CardState.IDLE ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'"
            >
              <div class="text-[10px] text-slate-500 tracking-widest animate-pulse">
                [ 点击卡牌查看详情 ]
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Step 3: 档案填写 -->
      <transition name="fade-slide">
        <div v-if="(step === 3 && !systemStore.isPureMode) || (step === 2 && systemStore.isPureMode)" class="relative z-10 pt-10">
          <!-- 档案表单面板 -->
          <div class="profile-form-panel" :class="{ 'active': isFormVisible || systemStore.isPureMode }">
            <div class="mb-8 border-l-2 border-blue-500 pl-4">
              <h3 class="text-xl font-black text-white tracking-wide">冒险者登记</h3>
              <p class="text-slate-400 text-[10px] font-medium mt-1 tracking-wider">录入基础身体数据 // BMR 核心计算</p>
            </div>

            <div class="space-y-5">
              <!-- 昵称 -->
              <div class="bg-[#161e2e] p-1 border-b-2 border-slate-700 focus-within:border-blue-500 transition-colors">
                <label class="text-[9px] text-slate-500 font-bold tracking-wider mb-1 block pl-2 pt-2">{{ systemStore.isPureMode ? '您的称呼' : '冒险者代号' }}</label>
                <input v-model="formData.nickname" class="w-full bg-transparent text-xl font-bold text-white placeholder-slate-700 outline-none px-2 pb-2" placeholder="输入代号..." />
              </div>

              <!-- 性别 (纯色块选择) -->
              <div class="grid grid-cols-2 gap-4">
                <div @click="formData.gender = 'MALE'"
                     class="p-4 border-2 flex items-center justify-center gap-3 cursor-pointer transition-all bg-[#161e2e]"
                     :class="formData.gender === 'MALE' ? 'border-blue-500 text-white' : 'border-slate-800 text-slate-600 hover:border-slate-600'">
                  <i class="fas fa-mars text-lg"></i> <span class="font-black text-sm">男</span>
                </div>
                <div @click="formData.gender = 'FEMALE'"
                     class="p-4 border-2 flex items-center justify-center gap-3 cursor-pointer transition-all bg-[#161e2e]"
                     :class="formData.gender === 'FEMALE' ? 'border-pink-500 text-white' : 'border-slate-800 text-slate-600 hover:border-slate-600'">
                  <i class="fas fa-venus text-lg"></i> <span class="font-black text-sm">女</span>
                </div>
              </div>

              <!-- 身体数值 -->
              <div class="grid grid-cols-3 gap-3">
                <div class="bg-[#161e2e] p-3 border border-slate-700 text-center">
                  <label class="text-[9px] text-slate-500 block mb-1 font-bold">身高 (CM)</label>
                  <input type="number" v-model.number="formData.height" class="w-full bg-transparent font-black text-xl text-center text-white outline-none font-mono" />
                </div>
                <div class="bg-[#161e2e] p-3 border border-slate-700 text-center">
                  <label class="text-[9px] text-slate-500 block mb-1 font-bold">体重 (KG)</label>
                  <input type="number" v-model.number="formData.weight" class="w-full bg-transparent font-black text-xl text-center text-white outline-none font-mono" />
                </div>
                <div class="bg-[#161e2e] p-3 border border-slate-700 text-center">
                  <label class="text-[9px] text-slate-500 block mb-1 font-bold">年龄</label>
                  <input type="number" v-model.number="formData.age" class="w-full bg-transparent font-black text-xl text-center text-white outline-none font-mono" />
                </div>
              </div>

              <div class="text-[9px] text-slate-600 text-center mt-4 tracking-tight">
                // 隐私保护：数据仅本地存储，不上传服务器 //
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 底部操作栏 -->
    <div class="absolute bottom-0 left-0 right-0 p-6 bg-[#0f172a] border-t border-slate-800 z-20">
      <!-- Step 1 只有选项，不需要下一步按钮 -->

      <div v-if="step > 1" class="flex gap-4">
        <button @click="goToPrevStep" class="w-1/3 bg-slate-800 text-slate-400 font-bold py-4 hover:bg-slate-700 hover:text-white transition-all tracking-wider text-sm">
          返回
        </button>
        <!-- 下一步 / 完成 -->
        <button v-if="(step === 2 && !systemStore.isPureMode && !formData.nickname)"
                @click="goToNextStep"
                class="flex-1 bg-blue-600 text-white font-black py-4 shadow-lg shadow-blue-900/20 hover:bg-blue-500 active:bg-blue-700 transition-all tracking-wider text-sm">
          下一步
        </button>
        <button v-else-if="(step === 2 && !systemStore.isPureMode && formData.nickname)"
                @click="finish"
                class="flex-1 bg-emerald-600 text-white font-black py-4 shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:bg-emerald-700 transition-all tracking-wider text-sm">
          开启冒险
        </button>
        <button v-else
                @click="finish"
                class="flex-1 bg-emerald-600 text-white font-black py-4 shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 active:bg-emerald-700 transition-all tracking-wider text-sm">
          {{ systemStore.isPureMode ? '开始记录' : '开启冒险' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 种族主题色辅助函数 */
</style>

<script lang="ts">
// 增加一个辅助函数用于获取颜色名
function getRaceColor(index: number) {
  const colors = ['blue', 'emerald', 'orange', 'purple'];
  return colors[index % 4];
}
</script>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-20px); }

.fade-enter-active, .fade-leave-active { transition: all 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.scale-in-enter-active { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.scale-in-enter-from { opacity: 0; transform: scale(0); }

/* 3D 舞台设置 */
.stage-perspective {
  perspective: 1200px;
  transform-style: preserve-3d;
}

/* 3D 环绕场景的整体旋转 */
.state-orbit-scene {
  transform: rotateX(10deg) rotateY(-10deg);
  transition: transform 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 卡牌基础容器 */
.race-card-item {
  transform-style: preserve-3d;
  /* 分离不同属性的过渡效果 - 让移动更平滑 */
  transition: transform 1.5s cubic-bezier(0.22, 0.61, 0.36, 1),
  opacity 1.2s ease,
  filter 1.2s ease,
  box-shadow 0.3s ease;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* ENTERING 状态：立即生效，无过渡 */
.race-card-item.state-entering {
  transition: none !important;
}

/* CHARGING 状态：蓄力收缩，使用快速缓动 */
.race-card-item.state-charging {
  transition: transform 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53),
  opacity 0.3s ease,
  box-shadow 0.3s ease;
}

/* LEAVING 状态：离场下沉，快速消失 */
.race-card-item.state-leaving {
  transition: transform 0.8s cubic-bezier(0.6, 0.04, 0.98, 0.335),
  opacity 0.6s ease,
  filter 0.6s ease,
  box-shadow 0.3s ease;
}

/* FALLING_STACK 状态：向下坠落叠在一起 - 快速重力下坠 */
.race-card-item.state-falling-stack {
  transition: transform 0.7s cubic-bezier(0.6, 0.04, 0.98, 0.335),
  opacity 0.7s ease,
  filter 0.7s ease,
  box-shadow 0.3s ease;
}

.race-card-item.state-falling-stack .card-floater {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

/* RISING_RUSH 状态：从底部平滑上升到中心聚集 */
.race-card-item.state-rising-rush {
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
  opacity 0.7s ease,
  filter 0.7s ease,
  box-shadow 0.3s ease;
}

.race-card-item.state-rising-rush .card-floater {
  box-shadow: 0 10px 40px rgba(168, 85, 247, 0.2);
}

/* SPINNING_EXPAND 状态：在中心3D旋转展开 - 立体扇形 */
.race-card-item.state-spinning-expand {
  transition: transform 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55),
  opacity 0.7s ease,
  filter 0.7s ease,
  box-shadow 0.3s ease;
}

.race-card-item.state-spinning-expand .card-floater {
  box-shadow: 0 15px 50px rgba(168, 85, 247, 0.25);
}

/* ORBIT 状态：3D环绕背景 - 散开到四周 */
.race-card-item.state-orbit {
  pointer-events: none;
  transition: transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1),
  opacity 0.8s ease,
  filter 0.8s ease,
  box-shadow 0.3s ease;
}

/* IDLE 状态：爆开时使用强力弹性效果增加打击感 */
.race-card-item.state-idle {
  transition: transform 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55),
  opacity 0.8s ease,
  box-shadow 0.3s ease;
}

/* 内部浮动容器 */
.card-floater {
  transition: transform 0.3s ease;
}

/* 浮动动画 */
@keyframes float-up-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

/* 状态: IDLE - 悬浮效果 */
.state-idle .card-floater {
  animation: float-up-down 4s ease-in-out infinite;
}

/* 爆开时的错落延迟，增加打击感 */
.state-idle:nth-child(1) .card-floater { animation-delay: 0s; }
.state-idle:nth-child(2) .card-floater { animation-delay: 0.8s; }
.state-idle:nth-child(3) .card-floater { animation-delay: 1.6s; }
.state-idle:nth-child(4) .card-floater { animation-delay: 2.4s; }

/* 档案表单面板动画 */
.profile-form-panel {
  position: relative;
  z-index: 10;
  opacity: 0;
  transform: translateY(-40px) scale(0.95);
  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
  pointer-events: none;
}

.profile-form-panel.active {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
</style>
