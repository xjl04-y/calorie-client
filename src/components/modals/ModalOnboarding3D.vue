<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { RACES } from '@/constants/gameData';
import { showToast } from 'vant';
import type { InitUserForm, RaceType } from '@/types';

// --- Stores ---
const store = useGameStore();
const systemStore = useSystemStore();

// --- State ---
const show = computed(() => store.modals.onboarding);
const step = ref(1); // 1: Mode, 2: Race Select, 3: Profile Form

// --- 3D Animation State Definition ---
const AnimState = {
  SELECTION: 'SELECTION',   // 正常的选人平铺
  BAR_STACK: 'BAR_STACK',   // 收缩成钢笔/条状
  FLY: 'FLY',               // 飞出
  ORBIT: 'ORBIT'            // 3D 环绕 (此时表单出现)
} as const;
type AnimStateType = keyof typeof AnimState;
const animState = ref<AnimStateType>('SELECTION');
const isFormVisible = ref(false); // 控制 Step 3 表单面板的显隐动画

// 表单数据 (保持原有类型定义)
const formData = reactive<InitUserForm>({
  race: 'HUMAN',
  nickname: '',
  gender: 'MALE',
  height: 170,
  weight: 65,
  age: 24
});

// --- Computed Props ---
const currentTitle = computed(() => {
  if (step.value === 1) return '开启旅程';
  if (step.value === 2) return '选择种族';
  return ''; // Step 3 不显示顶部标题，因为表单面板自带
});

const currentRace = computed(() => {
  return formData.race ? RACES[formData.race] : null;
});

// 计算 3D 场景的 CSS 类
const sceneClasses = computed(() => ({
  'state-selection': animState.value === AnimState.SELECTION,
  'state-bar-stack': animState.value === AnimState.BAR_STACK,
  'state-fly': animState.value === AnimState.FLY,
  'state-orbit-scene': animState.value === AnimState.ORBIT
}));

// --- Watchers & Logic ---

// 监听弹窗打开，初始化状态
watch(show, (val) => {
  if (val) {
    resetFlow(false); // 重置 UI 状态，但不清空数据

    // 检查是否是从纯净模式切换过来的老用户 (原有逻辑保留)
    const isFromPureToRpg = store.user.isInitialized &&
      store.user.nickname &&
      (!store.user.race || store.user.race === 'HUMAN') &&
      !systemStore.isPureMode;

    if (isFromPureToRpg) {
    // 回填旧数据
    formData.nickname = store.user.nickname;
    formData.gender = store.user.gender;
    formData.height = store.user.height;
    formData.weight = store.user.weight;
    formData.age = store.user.age;
    // 直接跳到种族选择
    step.value = 2;
    animState.value = 'SELECTION';
  }
  } else {
    resetFlow(true); // 关闭时完全重置
  }
});

// --- Business Methods ---

const resetFlow = (fullReset = false) => {
  step.value = 1;
  animState.value = 'SELECTION';
  isFormVisible.value = false;
  if (fullReset) {
    formData.nickname = '';
    formData.race = 'HUMAN';
  }
};

// Step 1: 模式选择
const selectMode = (isPure: boolean) => {
  systemStore.isPureMode = isPure;

  if (isPure) {
    // 纯净模式：跳过种族选择动画，直接进入表单态
    // 我们让 3D 背景直接进入 ORBIT 状态作为装饰
    step.value = 3;
    animState.value = 'ORBIT';
    setTimeout(() => {
      isFormVisible.value = true;
    }, 100);
  } else {
    // RPG 模式：进入 3D 选人界面
    step.value = 2;
    animState.value = 'SELECTION';
  }
};

// Step 2: 选中某个种族
const selectRace = (key: string) => {
  // 只有在选择阶段才能点击
  if (animState.value !== 'SELECTION') return;
  formData.race = key as RaceType;
};

// Step 2 -> Step 3: 确认选择并触发飞出动画 (核心动画逻辑)
const confirmRaceAndFly = () => {
  if (!formData.race) {
    showToast('请先选择一个种族');
    return;
  }

  // 1. 收缩 (Gathering/Stack)
  animState.value = 'BAR_STACK';

  // 2. 飞出 (Fly)
  setTimeout(() => {
    step.value = 3; // 逻辑进入 Step 3
    animState.value = 'FLY';
  }, 800);

  // 3. 变成 3D 环绕 (Orbit)
  setTimeout(() => {
    animState.value = 'ORBIT';
  }, 1600);

  // 4. 表单浮现
  setTimeout(() => {
    isFormVisible.value = true;
  }, 2800);
};

// 数据校验 (原有逻辑)
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

// 完成并提交 (原有逻辑适配)
const finish = () => {
  // 判断是补充种族还是全新初始化
  const isOnlySelectingRace = store.user.isInitialized && store.user.nickname && formData.nickname;

  if (isOnlySelectingRace) {
    // 补充种族逻辑
    store.user.race = formData.race;
    store.saveState();
    systemStore.isPureMode = false;
    store.setModal('onboarding', false);
    showToast({ type: 'success', message: `✨ 欢迎加入 ${RACES[formData.race]?.name} 种族！` });
  } else {
    // 全新初始化
    if (!validate()) return;

    store.initUser(formData);

    if (!systemStore.isPureMode) {
      store.setModal('npcGuide', true);
    } else {
      store.setModal('onboarding', false);
      // [Fix] 纯净模式不进入NpcGuide，直接标记引导完成
      systemStore.hasCompletedGuide = true;
      console.log('[🎯 Onboarding] 纯净模式，设置 hasCompletedGuide = true');
      showToast({ type: 'success', message: '✅ 账号创建成功！' });
    }
  }
};

// 重新选择 (返回 Step 2)
const backToRaceSelect = () => {
  isFormVisible.value = false;
  setTimeout(() => {
    step.value = 2;
    animState.value = 'SELECTION';
  }, 500);
};

// --- Style Helpers ---
const getCuboidStyle = (key: string) => {
  const keys = Object.keys(RACES);
  const idx = keys.indexOf(key);

  // 1. SELECTION: 平铺展示
  if (animState.value === AnimState.SELECTION) {
    const offset = (idx - 1.5) * 280;
    return {
      transform: `translateX(${offset}px) translateZ(0) rotateY(0deg)`,
      opacity: 1
    };
  }

  // 2. BAR_STACK: 堆叠成条
  if (animState.value === AnimState.BAR_STACK) {
    return {
      transform: `translate3d(0, 0, ${idx * -30}px) rotateZ(0deg)`,
      zIndex: 4 - idx,
      opacity: 1
    };
  }

  // 其他状态由 CSS class 控制
  return {};
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] bg-[#0f172a] text-white flex flex-col overflow-hidden font-inter">

    <!-- 背景氛围层 -->
    <div class="ambient-bg">
      <div class="light-blob bg-purple-600 w-[500px] h-[500px] top-[-10%] left-[-10%]"></div>
      <div class="light-blob bg-blue-600 w-[500px] h-[500px] bottom-[-10%] right-[-10%]"></div>
      <div class="bg-texture"></div>
    </div>

    <!-- 舞台容器 -->
    <div class="stage-container">

      <!-- 顶部标题 (仅在 Step 1/2 显示) -->
      <div class="header-bar" :class="{ 'hide': step === 3 }">
        <h1 class="text-3xl font-black italic tracking-wide">
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            {{ currentTitle }}
          </span>
        </h1>
        <div class="h-1 w-12 bg-purple-500 rounded-full mx-auto mt-2"></div>
      </div>

      <!-- STEP 1: 模式选择 -->
      <transition name="fade">
        <div v-if="step === 1" class="ui-panel mode-panel">
          <div class="text-center mb-8">
            <h2 class="text-xl font-bold text-white">选择你的旅程</h2>
            <p class="text-slate-400 text-sm mt-1">稍后可在设置中更改</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- RPG 模式 -->
            <div @click="selectMode(false)"
                 class="group relative p-6 rounded-2xl border-2 border-purple-500/50 bg-slate-800/50 hover:bg-slate-700 hover:border-purple-400 cursor-pointer transition-all active:scale-95">
              <div class="absolute -top-3 left-6 bg-purple-600 text-[10px] font-bold px-2 py-0.5 rounded text-white shadow-lg">推荐</div>
              <div class="flex items-center gap-3 mb-3">
                <span class="text-3xl">⚔️</span>
                <span class="text-lg font-bold text-purple-300">沉浸 RPG 模式</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                打怪升级、收集装备。将枯燥的记录变成一场史诗冒险。
              </p>
            </div>

            <!-- 纯净模式 -->
            <div @click="selectMode(true)"
                 class="group relative p-6 rounded-2xl border-2 border-slate-600/50 bg-slate-800/30 hover:bg-slate-700 hover:border-slate-500 cursor-pointer transition-all active:scale-95">
              <div class="flex items-center gap-3 mb-3">
                <span class="text-3xl">🍃</span>
                <span class="text-lg font-bold text-green-300">纯净数据模式</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">
                回归本质。极简界面，专注数据，无游戏元素打扰。
              </p>
            </div>
          </div>
        </div>
      </transition>

      <!-- 3D 场景 (承载 Step 2 & Step 3 的背景) -->
      <div v-show="step >= 2" class="scene" :class="sceneClasses">

        <!-- 4个种族卡牌 (Cuboids) -->
        <div
          v-for="(race, key) in RACES"
          :key="key"
          class="cuboid"
          :class="{ 'selected': formData.race === key }"
          :style="getCuboidStyle(key as string)"
          @click="selectRace(key as string)"
        >
          <div class="face face-front">
            <div class="text-6xl mb-4 opacity-90">{{ race.icon }}</div>
            <div class="text-xl font-bold text-white tracking-wide">{{ race.name }}</div>
            <div class="text-[10px] text-purple-300 uppercase tracking-widest mt-1 opacity-70">Race Class</div>

            <!-- 选中勾选 -->
            <div v-if="formData.race === key" class="mt-6 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg animate-bounce">
              <i class="fas fa-check"></i>
            </div>
          </div>
          <!-- 侧面增加厚度感 -->
          <div class="face face-side face-right"></div>
          <div class="face face-side face-left"></div>
          <div class="face face-side face-top"></div>
          <div class="face face-side face-bottom"></div>
          <div class="face face-back"></div>
        </div>
      </div>

      <!-- Step 2 辅助面板: 种族详情 -->
      <div class="race-detail-panel" :class="{ 'show': step === 2 && formData.race }">
        <template v-if="currentRace">
          <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h2 class="text-xl font-bold text-white">{{ currentRace.name }}</h2>
            <span class="text-3xl">{{ currentRace.icon }}</span>
          </div>

          <div class="space-y-4 mb-6">
            <div class="bg-slate-800/50 p-3 rounded-lg border border-white/5">
              <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">简介</div>
              <p class="text-xs text-slate-300 leading-relaxed">{{ currentRace.desc }}</p>
            </div>

            <div class="bg-purple-900/20 p-3 rounded-lg border border-purple-500/20">
              <div class="text-[10px] text-purple-400 uppercase font-bold mb-1">种族天赋</div>
              <p class="text-xs text-purple-200">{{ currentRace.bonus }}</p>
            </div>

            <!-- 属性预览 -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-slate-800 p-2 rounded">
                <div class="text-[9px] text-slate-400">STR</div>
                <div class="text-sm font-bold text-blue-400">{{ currentRace.growth?.str }}</div>
              </div>
              <div class="bg-slate-800 p-2 rounded">
                <div class="text-[9px] text-slate-400">AGI</div>
                <div class="text-sm font-bold text-green-400">{{ currentRace.growth?.agi }}</div>
              </div>
              <div class="bg-slate-800 p-2 rounded">
                <div class="text-[9px] text-slate-400">VIT</div>
                <div class="text-sm font-bold text-orange-400">{{ currentRace.growth?.vit }}</div>
              </div>
            </div>
          </div>

          <!-- 确认按钮：触发酷炫动画的关键 -->
          <button @click="confirmRaceAndFly"
                  class="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-purple-900/50 hover:scale-[1.02] active:scale-95 transition-all">
            确定并继续 <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </template>
      </div>

      <!-- STEP 3: 档案填写 (带输入反馈动画) -->
      <div class="ui-panel profile-panel" :class="{ 'active': isFormVisible }">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-white">建立档案</h2>
          <p class="text-xs text-slate-400 mt-1">根据你的身体数据计算初始属性</p>
        </div>

        <div class="space-y-5">
          <!-- 昵称输入 -->
          <div class="input-group bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition-colors"
               :class="{ 'completed': !!formData.nickname }">
            <label class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block transition-colors">
              {{ systemStore.isPureMode ? '您的称呼' : 'Hero Name' }}
            </label>
            <input
              v-model="formData.nickname"
              class="input-field w-full bg-transparent text-lg font-bold text-white placeholder-slate-600 outline-none"
              placeholder="输入你的大名..."
            />
            <!-- 动态图标 -->
            <div class="status-indicator text-blue-500">
              <i class="fas fa-check-circle text-xl"></i>
            </div>
          </div>

          <!-- 性别选择 -->
          <div class="grid grid-cols-2 gap-4">
            <div @click="formData.gender = 'MALE'"
                 class="gender-card p-3 rounded-xl border cursor-pointer flex items-center justify-center gap-2"
                 :class="{ 'active': formData.gender === 'MALE', 'bg-slate-800/50 border-slate-700 text-slate-500': formData.gender !== 'MALE', 'text-blue-400': formData.gender === 'MALE' }">
              <i class="fas fa-mars text-lg"></i> <span>男</span>
            </div>
            <div @click="formData.gender = 'FEMALE'"
                 class="gender-card p-3 rounded-xl border cursor-pointer flex items-center justify-center gap-2"
                 :class="{ 'active': formData.gender === 'FEMALE', 'bg-slate-800/50 border-slate-700 text-slate-500': formData.gender !== 'FEMALE', 'text-pink-400': formData.gender === 'FEMALE' }">
              <i class="fas fa-venus text-lg"></i> <span>女</span>
            </div>
          </div>

          <!-- 身体数值 -->
          <div class="grid grid-cols-3 gap-3">
            <div class="input-group bg-slate-800/50 p-3 rounded-xl border border-slate-700"
                 :class="{ 'completed': !!formData.height }">
              <label class="text-[9px] text-slate-500 block mb-1">身高 (cm)</label>
              <input type="number" v-model.number="formData.height" class="input-field w-full bg-transparent font-bold text-center text-white outline-none" />
              <div class="status-indicator text-blue-500" style="right: 5px; top: 10px; transform-origin: center; transform: scale(0.6) rotate(-90deg) !important;">
                <i class="fas fa-check text-sm"></i>
              </div>
            </div>

            <div class="input-group bg-slate-800/50 p-3 rounded-xl border border-slate-700"
                 :class="{ 'completed': !!formData.weight }">
              <label class="text-[9px] text-slate-500 block mb-1">体重 (kg)</label>
              <input type="number" v-model.number="formData.weight" class="input-field w-full bg-transparent font-bold text-center text-white outline-none" />
            </div>

            <div class="input-group bg-slate-800/50 p-3 rounded-xl border border-slate-700"
                 :class="{ 'completed': !!formData.age }">
              <label class="text-[9px] text-slate-500 block mb-1">年龄</label>
              <input type="number" v-model.number="formData.age" class="input-field w-full bg-transparent font-bold text-center text-white outline-none" />
            </div>
          </div>

          <!-- 最终按钮 -->
          <div class="flex gap-3 pt-4">
            <button v-if="!systemStore.isPureMode" @click="backToRaceSelect" class="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm transition-colors">
              重选
            </button>
            <button @click="finish" class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/50 hover:scale-[1.02] active:scale-95 transition-all">
              开启冒险 !
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 引入外部字体模拟 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');

:root {
  --card-width: 240px;
  --card-height: 340px;
  --card-depth: 20px;
}

.font-inter {
  font-family: 'Inter', sans-serif;
}

/* --- 背景氛围 --- */
.ambient-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.light-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}
.bg-texture {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
}

/* --- 舞台 & 场景 --- */
.stage-container {
  perspective: 1200px;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 10;
}

.scene {
  position: relative;
  transform-style: preserve-3d;
  width: 0;
  height: 0;
  transition: transform 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* --- 3D 盒体 (Cuboid) --- */
.cuboid {
  position: absolute;
  width: 240px; /* var(--card-width) */
  height: 340px; /* var(--card-height) */
  top: -170px;   /* -0.5 * height */
  left: -120px;  /* -0.5 * width */
  transform-style: preserve-3d;
  transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease;
  cursor: pointer;
}

.face {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(30, 41, 59, 0.95);
}

.face-front {
  width: 240px; height: 340px;
  transform: translateZ(10px); /* depth / 2 */
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
  box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
  flex-direction: column;
  padding: 24px;
  text-align: center;
}

/* 侧面 */
.face-side { background: rgba(147, 51, 234, 0.2); border: 1px solid rgba(147, 51, 234, 0.3); }
.face-right { width: 20px; height: 340px; right: 0; transform: rotateY(90deg) translateZ(-10px); transform-origin: right center; }
.face-left { width: 20px; height: 340px; left: 0; transform: rotateY(-90deg) translateZ(-10px); transform-origin: left center; }
.face-top { width: 240px; height: 20px; top: 0; transform: rotateX(90deg) translateZ(-10px); transform-origin: top center; }
.face-bottom { width: 240px; height: 20px; bottom: 0; transform: rotateX(-90deg) translateZ(-10px); transform-origin: bottom center; }
.face-back { width: 240px; height: 340px; transform: rotateY(180deg) translateZ(10px); background: #0f172a; }

.cuboid.selected .face-front {
  border: 2px solid #a855f7;
  box-shadow: 0 0 30px rgba(168, 85, 247, 0.4);
}

/* --- 动画状态 --- */
.state-selection .cuboid:hover { transform: translateY(-20px) scale(1.05) !important; z-index: 50; }
.state-bar-stack .cuboid { transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); }
.state-fly .cuboid:nth-child(1) { transform: translate3d(0, 0, 400px) rotateY(-5deg); }
.state-fly .cuboid:nth-child(2) { transform: translate3d(0, 0, 250px) rotateY(5deg); }
.state-fly .cuboid:nth-child(3) { transform: translate3d(0, 0, 100px) rotateY(-5deg); }
.state-fly .cuboid:nth-child(4) { transform: translate3d(0, 0, -50px) rotateY(5deg); }

.scene.state-orbit-scene { transform: rotateX(10deg) rotateY(-10deg); }
.state-orbit .cuboid { filter: brightness(0.4) grayscale(0.5); pointer-events: none; }
.state-orbit .cuboid:nth-child(1) { transform: translate3d(-180px, -40px, -100px) rotateY(60deg) rotateX(10deg); }
.state-orbit .cuboid:nth-child(2) { transform: translate3d(180px, -40px, -100px) rotateY(-60deg) rotateX(10deg); }
.state-orbit .cuboid:nth-child(3) { transform: translate3d(-100px, 140px, -200px) rotateY(80deg) rotateX(-20deg); }
.state-orbit .cuboid:nth-child(4) { transform: translate3d(100px, 140px, -200px) rotateY(-80deg) rotateX(-20deg); }

/* --- UI 面板 --- */
.ui-panel {
  position: absolute;
  z-index: 100;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border-radius: 20px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.mode-panel { width: 800px; max-width: 90%; padding: 40px; }

.profile-panel {
  width: 460px;
  max-width: 90%;
  padding: 40px;
  opacity: 0;
  transform: translate(-50%, -40%) scale(0.9) rotateX(-10deg);
  transition: all 1s cubic-bezier(0.19, 1, 0.22, 1);
  pointer-events: none;
}
.profile-panel.active { opacity: 1; transform: translate(-50%, -50%) scale(1) rotateX(0deg); pointer-events: auto; }

.race-detail-panel {
  position: absolute;
  right: 5%;
  top: 50%;
  transform: translateY(-50%) translateX(50px);
  width: 320px;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 20px;
  padding: 24px;
  opacity: 0;
  transition: all 0.5s ease;
  pointer-events: none;
  border: 1px solid rgba(168, 85, 247, 0.2);
  z-index: 50;
}
.race-detail-panel.show { opacity: 1; transform: translateY(-50%) translateX(0); pointer-events: auto; }

.header-bar { position: absolute; top: 40px; left: 0; right: 0; text-align: center; z-index: 50; pointer-events: none; transition: opacity 0.5s; }
.header-bar.hide { opacity: 0; }

/* 简单的过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* =========================================
   输入框动画反馈 (Industrial V8 Style)
   ========================================= */

.input-group {
  position: relative;
  transition: all 0.3s ease;
}

.input-field {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 完成态：边框变蓝，背景微亮 */
.input-group.completed .input-field {
  border-color: rgba(59, 130, 246, 0.6); /* Blue-500 opacity */
  background-color: rgba(59, 130, 246, 0.05);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.1);
}

.input-group.completed label {
  color: #60a5fa; /* Blue-400 */
}

/* 状态图标动画 */
.status-indicator {
  position: absolute;
  right: 15px;
  top: 42px; /* 调整垂直位置以对齐输入框中心 */
  width: 16px;
  height: 16px;
  pointer-events: none;
  opacity: 0;
  transform: scale(0) rotate(-90deg);
}

.input-group.completed .status-indicator {
  animation: tech-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* 性别卡片特殊动画 */
.gender-card {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.gender-card.active {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.15) !important;
  border-color: #a855f7 !important;
}
.gender-card:active { transform: scale(0.95); }

/* 扫描线特效 */
.input-group::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0%;
  height: 1px;
  background: #3b82f6;
  transition: width 0.4s ease;
  box-shadow: 0 0 8px #3b82f6;
}
.input-group.completed::after {
  width: 100%;
}

@keyframes tech-pop-in {
  0% { opacity: 0; transform: scale(0) rotate(-90deg); }
  80% { transform: scale(1.2) rotate(10deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
</style>
