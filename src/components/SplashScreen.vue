<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { sqliteFoodService } from '@/utils/sqliteFoodService';

// 定义事件,动画结束后通知父组件销毁自己
const emit = defineEmits(['animation-complete']);

// Refs 绑定
const shatterGridRef = ref<HTMLElement | null>(null);
const loaderRef = ref<HTMLElement | null>(null);
const digit1Ref = ref<HTMLElement | null>(null);
const digit2Ref = ref<HTMLElement | null>(null);
const digit3Ref = ref<HTMLElement | null>(null);
const percentRef = ref<HTMLElement | null>(null); // 百分号
const logoRef = ref<HTMLElement | null>(null);
const logoContainerRef = ref<HTMLElement | null>(null); // Logo 歪头容器
const logoEyeRef = ref<HTMLElement | null>(null); // Logo 眼睛
const progressLineRef = ref<HTMLElement | null>(null);

onMounted(async () => {
  // [New] 检查是否启用了开屏动画 (默认为 true)
  const enableSplash = localStorage.getItem('app_setting_splash') !== 'false';

  // 0. 初始化食物数据库（在加载动画期间完成）
  console.log('[SplashScreen] 开始初始化食物数据...');
  try {
    await sqliteFoodService.initializeFoodData();
    console.log('[SplashScreen] 食物数据初始化完成');
  } catch (error) {
    console.error('[SplashScreen] 食物数据初始化失败:', error);
  }

  // [New] 如果禁用了动画，直接触发完成事件并退出
  if (!enableSplash) {
    emit('animation-complete');
    return;
  }

  // 1. 锁定滚动,防止动画播放时用户滑动页面
  document.body.style.overflow = 'hidden';

  const tl = gsap.timeline();

  // --- 0. 动态生成网格 (保持高密度) ---
  if (shatterGridRef.value) {
    const isMobile = window.innerWidth < 768;
    const rows = isMobile ? 24 : 20;
    const cols = isMobile ? 15 : 30;
    const totalBlocks = rows * cols;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < totalBlocks; i++) {
      const div = document.createElement('div');
      div.classList.add('shatter-block');
      div.style.width = `${100 / cols}vw`;
      div.style.height = `${100 / rows}vh`;
      // 纯黑方块
      div.style.backgroundColor = '#000';
      fragment.appendChild(div);
    }
    shatterGridRef.value.appendChild(fragment);
  }

  // 获取生成的方块用于动画
  // 注意：在Vue中动态生成的DOM需要确保能被选择到
  const blocks = shatterGridRef.value?.querySelectorAll('.shatter-block');

  // --- 1. 计数器动画 ---
  // 进度条
  tl.to(progressLineRef.value, { width: '100%', duration: 2.5, ease: "power2.inOut" }, 0);
  // 数字滚动
  tl.to(digit3Ref.value, { y: "-98%", duration: 2.5, ease: "power2.inOut" }, 0);
  tl.to(digit2Ref.value, { y: "-96.7%", duration: 2.5, ease: "power2.inOut" }, 0);
  tl.to(digit1Ref.value, { y: "-90.9%", duration: 2.5, ease: "power2.inOut" }, 0);

  // --- 2. 离场 & Logo 进场 & 俏皮眨眼 ---
  // 数字和百分号一起离场
  tl.to([
    digit1Ref.value?.parentElement,
    digit2Ref.value?.parentElement,
    digit3Ref.value?.parentElement,
    percentRef.value, // 百分号一起飞走
    progressLineRef.value
  ], {
    y: -100, opacity: 0, duration: 0.5, stagger: 0.05, ease: "back.in(1)"
  });

  // Logo 显现 (弹性弹出)
  tl.set(logoRef.value, { visibility: 'visible' });
  tl.to(logoRef.value, {
    scale: 1, opacity: 1, duration: 1.0, ease: "elastic.out(1, 0.6)"
  }, "-=0.2");

  // === 俏皮眨眼动作 Wink ===
  if (logoEyeRef.value) {
    // 1. 眼睛动作：先微微睁大(惊讶)，然后快速压扁(闭眼)，再弹回
    tl.to(logoEyeRef.value, {
      scale: 1.2, // 微微睁大
      duration: 0.1,
      ease: "power1.out"
    }, "-=0.6");

    tl.to(logoEyeRef.value, {
      scaleY: 0.1, // 闭眼
      scaleX: 1.1, // 稍微变宽
      duration: 0.15,
      ease: "power2.inOut",
      yoyo: true, // 自动恢复
      repeat: 1   // 眨一次
    }, "-=0.5");
  }

  // 2. 配合动作：Logo 整体微微歪头，增加俏皮感
  if (logoContainerRef.value) {
    tl.to(logoContainerRef.value, {
      rotation: 15, // 歪头 15度
      duration: 0.2,
      ease: "back.out(2)", // 有回弹的歪头
      yoyo: true,
      repeat: 1,
      repeatDelay: 0.1
    }, "-=0.6");
  }

  // Logo 稍微停留，让用户看清表情
  tl.to({}, { duration: 0.6 });

  // --- 3. 瞬间结晶化 (Crystallize) ---
  // 显示网格层 (全黑)
  tl.set(shatterGridRef.value, { visibility: 'visible' });
  // 隐藏底部的 Loader 内容，防止穿帮
  tl.set(loaderRef.value, { display: 'none' });

  // 结晶动作：方块微缩，产生裂纹
  if (blocks && blocks.length > 0) {
    tl.to(blocks, {
      scale: 0.9,
      duration: 0.1,
      ease: "power1.out"
    });

    // --- 4. 随机无规律破碎 (Random Chaos) ---
    tl.to(blocks, {
      duration: 1.5,
      x: () => gsap.utils.random(-300, 300),
      y: () => gsap.utils.random(-300, 300),
      z: () => gsap.utils.random(-1000, 1000),
      rotationX: () => gsap.utils.random(-720, 720),
      rotationY: () => gsap.utils.random(-720, 720),
      scale: 0,
      opacity: 0,
      ease: "power3.out",
      stagger: {
        amount: 0.8,
        from: "random" // 随机触发
      },
      onComplete: () => {
        // 动画结束，恢复滚动，并通知父组件销毁
        document.body.style.overflow = '';
        emit('animation-complete');
      }
    });
  } else {
    // 兜底：如果没有方块（极少情况），直接结束
    document.body.style.overflow = '';
    emit('animation-complete');
  }
});

onUnmounted(() => {
  // 保险起见，组件销毁时恢复滚动
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="splash-screen-root font-inter">
    <!-- 破碎网格层 -->
    <div id="shatter-grid" ref="shatterGridRef"></div>

    <!-- 加载动画层 -->
    <div id="loader-content" ref="loaderRef">

      <div class="counter-container">
        <!-- 滚动的数字 -->
        <div class="text-8xl md:text-[10rem] font-bold text-white tracking-tighter flex items-center select-none">

          <div class="digit-column relative h-[1em]">
            <div ref="digit1Ref" class="digit-strip">
              <span v-for="n in 10" :key="'d1-'+n">{{ (n-1) % 10 }}</span>
              <span>1</span>
            </div>
          </div>

          <div class="digit-column relative h-[1em]">
            <div ref="digit2Ref" class="digit-strip">
              <span v-for="n in 30" :key="'d2-'+n">{{ (n-1) % 10 }}</span>
              <span>0</span>
            </div>
          </div>

          <div class="digit-column relative h-[1em]">
            <div ref="digit3Ref" class="digit-strip">
              <span v-for="n in 50" :key="'d3-'+n">{{ (n-1) % 10 }}</span>
              <span>0</span>
            </div>
          </div>

          <!-- 百分号 -->
          <span ref="percentRef" class="text-4xl md:text-6xl self-start mt-4 ml-2 text-gray-500">%</span>
        </div>

        <!-- Logo -->
        <div ref="logoRef" class="absolute inset-0 flex flex-col items-center justify-center opacity-0 scale-50" style="visibility: hidden;">
          <!-- Logo 容器，包含眨眼的部分 -->
          <div ref="logoContainerRef" class="logo-container relative w-32 h-32 md:w-48 md:h-48 border-4 border-white flex items-center justify-center rounded-full">
            <div class="w-full h-[1px] bg-white absolute top-1/2 left-0 -translate-y-1/2 rotate-45"></div>
            <div class="w-full h-[1px] bg-white absolute top-1/2 left-0 -translate-y-1/2 -rotate-45"></div>

            <!-- 核心 "眼睛" 部分，用于眨眼动画 -->
            <div ref="logoEyeRef" class="logo-eye w-8 h-8 bg-white rounded-full z-10 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.8)]">
              <div class="w-2.5 h-2.5 bg-black rounded-full"></div>
            </div>
          </div>
          <div class="mt-6 text-sm tracking-[0.5em] text-white uppercase font-light">
            System Ready
          </div>
        </div>
      </div>

      <!-- 底部加载条 -->
      <div class="absolute bottom-32 left-12 right-12 h-[2px] bg-gray-900">
        <div ref="progressLineRef" class="h-full bg-white w-0 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 引入字体 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap');

.font-inter {
  font-family: 'Inter', sans-serif;
}

.splash-screen-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999; /* 确保在最顶层 */
  pointer-events: none; /* 整体不阻挡交互，但内部元素可以阻挡 */
}

/* 破碎网格层 */
#shatter-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  visibility: hidden;
  background-color: transparent;
  pointer-events: none; /* 破碎方块本身不响应点击 */
}

/* 动态生成的方块样式 - 使用 :deep 穿透 scoped */
:deep(.shatter-block) {
  background-color: #000;
  will-change: transform, opacity;
  box-sizing: border-box;
}

/* 加载内容层 */
#loader-content {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 30;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  pointer-events: auto; /* 加载层阻挡点击 */
}

/* 计数器样式 */
.counter-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  height: 12rem;
  width: 100%;
}

.digit-column {
  display: inline-flex;
  flex-direction: column;
  height: 1em;
  overflow: hidden;
  line-height: 1;
}

.digit-strip {
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.logo-eye {
  transform-origin: center;
}

.logo-container {
  transform-origin: center;
}
</style>
