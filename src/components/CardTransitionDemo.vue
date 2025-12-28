<template>
  <!--
    主容器
    注意：移除了原 HTML body 上的 w-screen h-screen，改为 w-full h-full，
    这样你可以把它放在任何容器（如 Modal）里填满父级。
  -->
  <div class="w-full h-full relative flex items-center justify-center stage-perspective bg-gray-900 text-white overflow-hidden font-sans">

    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600 blur-[120px] opacity-30"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] opacity-30"></div>
    </div>

    <div
      class="flip-container w-[90vw] max-w-[1000px] h-[60vh] min-h-[600px] z-10"
      :class="{ 'is-flipped': appState === 'CONTENT' }"
    >
      <!-- 正面：卡牌层 -->
      <div class="cards-face relative pointer-events-none">
        <div
          v-for="(card, index) in cards"
          :key="card.id"
          class="card-item card-base w-[220px] h-[320px] rounded-2xl shadow-2xl cursor-pointer pointer-events-auto"
          :class="[
                    appState === 'IDLE' ? 'state-idle' : '',
                    card.gradientClass
                ]"
          :style="getCardStyle(index)"
          @click="triggerTransition"
        >
          <!-- 内部浮动层：负责内容承载和浮动动画 -->
          <div class="card-floater p-6">
            <div class="flex justify-between items-start">
              <!-- 注意：确保你的项目中已引入 phosphor 图标库，或者替换为你自己的图标组件 -->
              <i :class="['ph', card.icon, 'text-3xl text-white/90']"></i>
              <span class="text-white/60 text-xs font-bold tracking-widest">0{{ index + 1 }}</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white mb-1">{{ card.title }}</h3>
              <p class="text-white/70 text-sm">{{ card.subtitle }}</p>
            </div>
          </div>
        </div>

        <!-- 提示文字 -->
        <div
          class="absolute bottom-[-60px] w-full text-center transition-all duration-1000 delay-500"
          :class="appState === 'IDLE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'"
        >
          <button
            @click="triggerTransition"
            class="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-medium transition-all flex items-center gap-2 mx-auto backdrop-blur-md"
          >
            点击卡牌进入详情 <i class="ph ph-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- 背面：主内容层 -->
      <div class="content-face glass-panel rounded-3xl p-10 flex flex-col relative overflow-hidden">
        <div class="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <div class="flex items-center gap-4">
            <button @click="reset" class="p-2 rounded-full hover:bg-white/10 transition-colors group">
              <i class="ph ph-arrow-u-up-left text-xl text-white/70 group-hover:text-white"></i>
            </button>
            <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              核心数据面板
            </h1>
          </div>
          <div class="flex gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500"></span>
            <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span class="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
        </div>

        <div class="flex-1 grid grid-cols-12 gap-6">
          <div class="col-span-8 bg-black/20 rounded-xl p-6 relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="h-full flex items-center justify-center flex-col gap-4">
              <i class="ph ph-chart-line-up text-6xl text-white/20"></i>
              <p class="text-white/40">数据加载完成</p>
            </div>
          </div>
          <div class="col-span-4 flex flex-col gap-4">
            <div v-for="i in 3" :key="i" class="bg-black/20 rounded-xl p-4 h-full">
              <div class="w-8 h-8 rounded bg-white/10 mb-2"></div>
              <div class="h-2 w-2/3 bg-white/10 rounded mb-1"></div>
              <div class="h-2 w-1/2 bg-white/10 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 状态机枚举
const AppState = {
  INTRO: 'INTRO',         // 入场初始化（堆叠）
  IDLE: 'IDLE',           // 正常：散开 + 浮动
  GATHERING: 'GATHERING', // 离场：下沉聚合
  CONTENT: 'CONTENT'      // 内容：翻转展示
};

// 定义当前状态类型
type AppStateType = keyof typeof AppState;

// 初始状态设为 INTRO，让它们一开始就叠在一起
const appState = ref<AppStateType>(AppState.INTRO);

const cards = ref([
  { id: 1, title: '用户增长', subtitle: 'User Growth', icon: 'ph-users', gradientClass: 'gradient-card-1' },
  { id: 2, title: '营收分析', subtitle: 'Revenue', icon: 'ph-currency-circle-dollar', gradientClass: 'gradient-card-2' },
  { id: 3, title: '系统性能', subtitle: 'Performance', icon: 'ph-lightning', gradientClass: 'gradient-card-3' },
  { id: 4, title: '安全审计', subtitle: 'Security', icon: 'ph-shield-check', gradientClass: 'gradient-card-4' }
]);

// 页面加载后的自动流程
onMounted(() => {
  // 延迟一小会儿，让用户看清堆叠的状态，然后炸开
  setTimeout(() => {
    appState.value = AppState.IDLE;
  }, 600);
});

/**
 * 核心样式计算逻辑
 */
const getCardStyle = (index: number) => {
  // 随机角度，用于堆叠时的自然感
  const stackAngles = [-5, 3, -2, 4];
  const angle = stackAngles[index % 4];

  // 1. 入场状态 (INTRO) - 屏幕正中心堆叠
  if (appState.value === AppState.INTRO) {
    return {
      transform: `translateX(-50%) translateY(-50%) scale(0.8) rotate(${angle}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1,
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    };
  }

  // 2. 正常悬浮状态 (IDLE) - 改为 2x2 网格布局
  else if (appState.value === AppState.IDLE) {
    // 计算行列：0,1为第一行；2,3为第二行
    const col = index % 2; // 0 或 1
    const row = Math.floor(index / 2); // 0 或 1

    // 网格参数
    const gapX = 260; // 水平间距
    const gapY = 350; // 垂直间距 (卡牌高320 + 间隙)

    // 计算中心偏移量
    const offsetX = (col - 0.5) * gapX;
    const offsetY = (row - 0.5) * gapY;

    return {
      // 使用 calc 将卡牌定位到各自的网格点
      transform: `translateX(calc(-50% + ${offsetX}px)) translateY(calc(-50% + ${offsetY}px)) scale(1) rotate(0deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      opacity: 1
    };
  }

  // 3. 离场聚合状态 (GATHERING/CONTENT) - 下沉堆叠
  else {
    return {
      // 向下移动 (translateY 20%) 并且聚合
      transform: `translateX(-50%) translateY(20%) scale(0.9) rotate(${angle}deg)`,
      left: '50%',
      top: '50%',
      zIndex: index,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    };
  }
};

const triggerTransition = () => {
  if (appState.value !== AppState.IDLE) return;
  appState.value = AppState.GATHERING;
  setTimeout(() => {
    appState.value = AppState.CONTENT;
  }, 900);
};

const reset = () => {
  appState.value = AppState.GATHERING;
  setTimeout(() => {
    appState.value = AppState.IDLE;
  }, 800);
};
</script>

<style scoped>
/* --- 核心动画样式 --- */

/* 3D 舞台设置 */
.stage-perspective {
  perspective: 1200px;
}

/* 卡牌基础容器：负责位移（散开/聚合） */
.card-base {
  transform-style: preserve-3d;
  /* 调整缓动函数，让散开的动作更有张力 */
  transition: all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: absolute;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/* 内部浮动容器：负责上下浮动动画 */
.card-floater {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 浮动动画 Keyframes */
@keyframes float-up-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

/* 状态: IDLE - 仅在 IDLE 状态下，内部容器进行浮动 */
/* 注意：这里把动画加在 .card-floater 上，避免与父级的 transform 冲突 */
.state-idle .card-floater {
  animation: float-up-down 5s ease-in-out infinite;
}

/* 为每个卡牌内部添加延迟，制造错落感 */
.state-idle:nth-child(1) .card-floater { animation-delay: 0s; }
.state-idle:nth-child(2) .card-floater { animation-delay: 0.8s; }
.state-idle:nth-child(3) .card-floater { animation-delay: 1.6s; }
.state-idle:nth-child(4) .card-floater { animation-delay: 2.4s; }

/* 翻转容器 */
.flip-container {
  transform-style: preserve-3d;
  transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  width: 100%;
  height: 100%;
}

.content-face {
  transform: rotateY(180deg);
  backface-visibility: hidden;
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
}

.cards-face {
  backface-visibility: hidden;
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
}

.is-flipped {
  transform: rotateY(180deg);
}

.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.gradient-card-1 { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); }
.gradient-card-2 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.gradient-card-3 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.gradient-card-4 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
</style>
