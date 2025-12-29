<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { showToast } from 'vant';

const store = useGameStore();

// 动画状态控制
const isRevealed = ref(false); // 是否已展示完前置动画（控制进入第二阶段）
const showContent = ref(false); // 控制详情内容的显隐（用于第二阶段的淡入）

const show = computed({
  get: () => store.modals.unlock,
  set: (val) => store.setModal('unlock', val)
});

const achievement = computed(() => store.temp.unlockedAchievement);

// 监听弹窗打开，重置并执行动画流程
watch(show, (newVal) => {
  if (newVal) {
    // 重置状态
    isRevealed.value = false;
    showContent.value = false;

    // === 动画时间轴 ===
    // 0s: 弹窗打开，显示第一阶段（全屏“成就达成”大字 + 冲击波）

    // 1.2s: 进入第二阶段，隐藏大字，准备显示详情 (缩短时间，防止感觉卡顿)
    setTimeout(() => {
      isRevealed.value = true;

      // 1.3s: 详情内容淡入，按钮滑入
      setTimeout(() => {
        showContent.value = true;
      }, 100);
    }, 1200);
  }
}, { immediate: true }); // 关键修复：增加 immediate: true，防止组件挂载时状态已为 true 但不执行动画

// 放入背包（仅关闭弹窗）
const claim = () => {
  show.value = false;
};

// 立即装备
const equipNow = () => {
  if (achievement.value) {
    store.equipItem(achievement.value);
    showToast({
      message: `⚔️ 已装备 ${achievement.value.reward}！\n战力大幅提升！`,
      type: 'success',
      duration: 2000
    });
    show.value = false;
  }
};
</script>

<template>
  <van-overlay :show="show" :z-index="200" class-name="flex items-center justify-center bg-black/95 backdrop-blur-xl">
    <!-- 全屏容器 -->
    <div class="relative w-full h-full flex flex-col items-center justify-center overflow-hidden font-sans select-none" @click.stop>

      <!-- ================= 阶段一：开场冲击波动画 ================= -->
      <!-- 只有在未揭示详情时显示 -->
      <div v-if="!isRevealed" class="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
        <!-- 1. 核心闪光 (瞬间放大消失) -->
        <div class="w-10 h-10 bg-white rounded-full absolute animate-ping-once"></div>

        <!-- 2. 横向光束 (展开后消失) -->
        <div class="w-full h-[2px] bg-yellow-400 absolute animate-expand-line"></div>

        <!-- 3. 文字炸出 (修改为纯色，去除渐变) -->
        <h1 class="text-5xl md:text-7xl font-black italic text-amber-500 scale-0 animate-pop-text tracking-widest drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] z-10">
          成就达成
        </h1>

        <!-- 4. 粒子背景装饰 -->
        <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
      </div>

      <!-- ================= 阶段二：物品详情展示 ================= -->

      <!-- 背景层：温和的金色光晕 (仅在揭示后显示) -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ease-in-out"
           :class="isRevealed ? 'opacity-100' : 'opacity-0'">
        <div class="w-[90vmin] h-[90vmin] bg-amber-600/10 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <!-- 内容主体容器 (带过渡动画) -->
      <div v-if="isRevealed"
           class="relative z-10 w-full max-w-sm px-6 flex flex-col items-center transition-all duration-700 ease-out transform"
           :class="showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'">

        <!-- 顶部装饰字 -->
        <div class="mb-6 relative">
          <div class="absolute inset-x-0 top-1/2 h-px bg-amber-500/30"></div>
          <span class="relative bg-black px-4 text-amber-500 font-bold tracking-[0.3em] text-sm uppercase">里程碑解锁</span>
        </div>

        <!-- 成就图标 (带呼吸灯效) -->
        <div class="relative py-4 mb-6 group">
          <!-- 图标背后的光 -->
          <div class="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full group-hover:bg-amber-500/30 transition-all duration-500"></div>

          <!-- 实际图标 -->
          <div class="text-[8rem] relative z-10 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-float cursor-help">
            {{ achievement?.icon || '🏆' }}
          </div>
        </div>

        <!-- 物品信息卡片 (深色玻璃风格) -->
        <div class="w-full bg-slate-900 border border-amber-500/30 rounded-lg p-[1px] shadow-2xl relative overflow-hidden group">
          <!-- 卡片边框流光 -->
          <div class="absolute inset-0 bg-white/10 opacity-30 animate-shimmer pointer-events-none z-20"></div>

          <div class="bg-slate-900 rounded-[7px] p-5 text-center relative z-10 h-full">
            <!-- 物品名称 -->
            <h3 class="text-2xl font-bold text-white mb-2 drop-shadow-md tracking-wide">{{ achievement?.name }}</h3>
            <!-- 描述 -->
            <p class="text-sm text-slate-400 leading-relaxed px-2 mb-4 font-medium">{{ achievement?.desc }}</p>

            <!-- 奖励区域 -->
            <div class="bg-black/40 rounded border border-white/5 p-3 flex flex-col items-center gap-1 relative overflow-hidden">
              <!-- 奖励背景光 -->
              <div class="absolute inset-0 bg-amber-500/5"></div>

              <span class="text-[10px] text-green-400 font-bold tracking-widest relative z-10">获得奖励</span>
              <span class="text-lg font-bold text-amber-400 relative z-10 drop-shadow-sm">{{ achievement?.reward }}</span>
              <span class="text-xs font-mono text-slate-500 relative z-10">{{ achievement?.stats }}</span>
            </div>

            <!-- 趣味文字 -->
            <div class="mt-4 pt-2 border-t border-white/5 text-[11px] text-slate-600 italic">“{{ achievement?.flavor }}”</div>
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="w-full mt-8 flex flex-col gap-3">
          <!-- 立即装备 (主按钮 - 纯色风格) -->
          <button @click="equipNow" class="group w-full h-14 bg-amber-600 hover:bg-amber-500 rounded-lg relative overflow-hidden shadow-[0_4px_0_#78350f] active:shadow-none active:translate-y-[4px] transition-all border-t border-amber-400">

            <div class="flex items-center justify-center gap-2 text-white font-bold text-lg tracking-widest h-full">
              <i class="fas fa-sword text-amber-200 group-hover:rotate-45 transition-transform duration-300"></i>
              <span>立即装备</span>
            </div>
          </button>

          <!-- 放入背包 (副按钮) -->
          <button @click="claim" class="w-full py-3 text-slate-500 hover:text-white text-sm font-bold tracking-wider hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-box-open opacity-70"></i>
            放入背包
          </button>
        </div>

      </div>

      <!-- 右上角关闭 -->
      <div v-if="isRevealed" class="absolute top-6 right-6 z-50 animate-fade-in">
        <button class="text-white/30 hover:text-white transition-colors p-2" @click="claim">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>

    </div>
  </van-overlay>
</template>

<style scoped>
/* === 动画关键帧定义 === */

/* 1. 核心光点爆炸 */
@keyframes ping-once {
  0% { transform: scale(0); opacity: 1; }
  50% { transform: scale(8); opacity: 0.5; }
  100% { transform: scale(15); opacity: 0; }
}

/* 2. 文字弹出 */
@keyframes pop-text {
  0% { transform: scale(0.5); opacity: 0; filter: blur(10px); }
  50% { transform: scale(1.1); opacity: 1; filter: blur(0); }
  100% { transform: scale(1); opacity: 1; }
}

/* 3. 线条展开 */
@keyframes expand-line {
  0% { transform: scaleX(0); opacity: 0; }
  30% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1.2); opacity: 0; }
}

/* 4. 卡片流光 */
@keyframes shimmer {
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(150%) skewX(-20deg); }
}

/* 5. 悬浮 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* 6. 淡入 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* === Utility Classes === */
.animate-ping-once {
  animation: ping-once 0.6s cubic-bezier(0.2, 0, 0.2, 1) forwards;
}

.animate-pop-text {
  animation: pop-text 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards;
}

.animate-expand-line {
  animation: expand-line 0.7s ease-out forwards;
}

.animate-shimmer {
  animation: shimmer 3s infinite linear;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
}
</style>
