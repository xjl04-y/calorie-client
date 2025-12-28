<script setup lang="ts">
/**
 * HeroBackground.vue
 * 英雄档案页面的动态背景组件
 * 包含：环境光晕、滚动文字动画、扫描线纹理
 */
</script>

<template>
  <div class="hero-bg-container">
    <!-- 1. 环境光效层 (Ambient Lighting) -->
    <div class="ambient-layer">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <!-- 2. 动态文字层 (Kinetic Typography) -->
    <div class="kinetic-bg">
      <!-- Row 1: 辅助信息 -->
      <div class="marquee-row animate-left speed-slow">
        <!-- 为了无缝滚动，内容重复两遍 -->
        <span class="marquee-item style-tech">/// SYSTEM.INIT [READY] /// PROTOCOL: HERO ///&nbsp;</span>
        <span class="marquee-item style-tech">/// SYSTEM.INIT [READY] /// PROTOCOL: HERO ///&nbsp;</span>
      </div>

      <!-- Row 2: 大号描边字 -->
      <div class="marquee-row animate-right speed-fast">
        <span class="marquee-item style-outline">UNSTOPPABLE ✦ FORCE ✦&nbsp;</span>
        <span class="marquee-item style-outline">UNSTOPPABLE ✦ FORCE ✦&nbsp;</span>
        <span class="marquee-item style-outline">UNSTOPPABLE ✦ FORCE ✦&nbsp;</span>
        <span class="marquee-item style-outline">UNSTOPPABLE ✦ FORCE ✦&nbsp;</span>
      </div>

      <!-- Row 3: 核心高亮行 + 故障效果 -->
      <div class="marquee-row animate-left speed-fast">
        <span class="marquee-item style-accent glitch-text">LEGENDARY ⚡ STATUS&nbsp;</span>
        <span class="marquee-item style-accent glitch-text">LEGENDARY ⚡ STATUS&nbsp;</span>
        <span class="marquee-item style-accent glitch-text">LEGENDARY ⚡ STATUS&nbsp;</span>
        <span class="marquee-item style-accent glitch-text">LEGENDARY ⚡ STATUS&nbsp;</span>
      </div>

      <!-- Row 4: 背景填充字 -->
      <div class="marquee-row animate-right speed-slow">
        <span class="marquee-item style-filled text-giant">MAXIMUM POWER ///&nbsp;</span>
        <span class="marquee-item style-filled text-giant">MAXIMUM POWER ///&nbsp;</span>
      </div>
    </div>

    <!-- 3. 纹理层：扫描线与暗角 -->
    <div class="scanlines"></div>
    <div class="vignette"></div>
  </div>
</template>

<style scoped>
/* =========================================
   基础变量与容器
   ========================================= */
.hero-bg-container {
  /* 确保填满父容器 */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none; /* 关键：点击穿透 */
  z-index: 0;

  /* 局部变量定义 */
  --text-primary: #ffffff;
  --accent-purple: #7c3aed; /* Violet 600 */
  --accent-cyan: #06b6d4; /* Cyan 500 */
  --accent-yellow: #fbbf24; /* Amber 400 */
  --font-stack: 'Impact', 'Arial Black', sans-serif;
  
  /* [New] 深色模式/浅色模式自适应 */
  /* 注意：ProfileView的RPG模式header使用固定深色背景，所以这里不需要响应dark模式 */
  /* 背景色由父容器的 gradient 决定，这里保持透明 */
  background-color: transparent;
}

/* =========================================
   1. 背景光效层
   ========================================= */
.ambient-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 20s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
}

.blob-1 {
  width: 80%;
  height: 80%;
  background: var(--accent-purple);
  top: -20%;
  left: -20%;
  animation-duration: 25s;
}

.blob-2 {
  width: 60%;
  height: 60%;
  background: #1e3a8a;
  bottom: -10%;
  right: -10%;
  animation-duration: 30s;
  animation-direction: alternate-reverse;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10%, 10%) scale(1.1); }
  100% { transform: translate(-5%, 5%) scale(0.9); }
}

/* =========================================
   2. 动态文字层
   ========================================= */
.kinetic-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transform: skewY(-4deg);
  mix-blend-mode: hard-light;
  opacity: 0.8; /* 整体微调透明度 */
}

.marquee-row {
  display: flex;
  width: fit-content;
  margin-bottom: 4%; /* 使用百分比适配不同屏幕 */
  transform: translateZ(0); /* 开启硬件加速 */
  will-change: transform;
}

.marquee-item {
  font-family: var(--font-stack);
  font-size: 10vh; /* 视口高度自适应 */
  line-height: 0.9;
  white-space: nowrap;
  padding-right: 40px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 1px;
}

.text-giant {
  font-size: 15vh;
}

/* 风格定义 */
.style-outline {
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
}

.style-filled {
  color: rgba(255, 255, 255, 0.08);
}

.style-accent {
  color: var(--accent-yellow);
  opacity: 0.9;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
}

.style-tech {
  font-family: monospace;
  font-size: 4vh;
  color: var(--accent-cyan);
  opacity: 0.6;
  letter-spacing: 4px;
}

/* =========================================
   3. 动画定义
   ========================================= */
@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes scroll-right {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

.animate-left { animation: scroll-left 30s linear infinite; }
.animate-right { animation: scroll-right 35s linear infinite; }

.speed-fast { animation-duration: 20s; }
.speed-slow { animation-duration: 60s; }

/* 故障效果 */
.glitch-text {
  position: relative;
  animation: glitch-anim 5s infinite;
}

@keyframes glitch-anim {
  0% { opacity: 1; transform: translate(0); text-shadow: 4px 4px 0px rgba(0,0,0,0.2); }
  92% { opacity: 1; transform: translate(0); text-shadow: 4px 4px 0px rgba(0,0,0,0.2); }
  93% { opacity: 0.8; transform: translate(-2px, 2px); text-shadow: -2px 0 red, 2px 0 blue; }
  94% { opacity: 1; transform: translate(2px, -2px); text-shadow: 4px 4px 0px rgba(0,0,0,0.2); }
  96% { opacity: 0.5; transform: skewX(10deg); }
  97% { opacity: 1; transform: skewX(0); }
  100% { opacity: 1; }
}

/* =========================================
   4. 纹理层
   ========================================= */
.scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255,255,255,0),
    rgba(255,255,255,0) 50%,
    rgba(0,0,0,0.1) 50%,
    rgba(0,0,0,0.1)
  );
  background-size: 100% 4px;
  z-index: 3;
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 50%, rgba(2, 6, 23, 0.9) 100%);
  z-index: 4;
}
</style>
