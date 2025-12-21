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

// [Fix] 监听弹窗打开，如果已有昵称且未选种族，直接跳到步骤2
watch(show, (val) => {
  if (val) {
    // 弹窗打开时，检查是否需要跳过步骤
    const isFromPureToRpg = store.user.isInitialized && 
                            store.user.nickname && 
                            (!store.user.race || store.user.race === 'HUMAN') && 
                            !systemStore.isPureMode; // 只有在 RPG 模式下才跳转
    
    if (isFromPureToRpg) {
      // 已有用户信息但未选种族（从纯净模式切换过来）
      formData.nickname = store.user.nickname;
      formData.gender = store.user.gender;
      formData.height = store.user.height;
      formData.weight = store.user.weight;
      formData.age = store.user.age;
      // 跳过模式和档案填写，直接到种族选择
      step.value = 2;
    } else {
      // 否则从头开始
      step.value = 1;
    }
  } else {
    // 关闭时重置
    step.value = 1;
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
  // [Fix] 区分两种情况：完整初始化 vs 只是补充种族选择
  const isOnlySelectingRace = store.user.isInitialized && store.user.nickname && formData.nickname;
  
  if (isOnlySelectingRace) {
    // 情况1：用户已有账号，只是补充选择种族（从纯净模式切换过来）
    // [Fix] 允许选择任意种族，包括 HUMAN
    // 直接更新种族
    store.user.race = formData.race;
    store.saveState();
    // 确保处于 RPG 模式
    systemStore.isPureMode = false;
    // 关闭弹窗（不打开NPC引导，因为用户已经熟悉了）
    store.setModal('onboarding', false);
    showToast({ type: 'success', message: `✨ 欢迎加入 ${RACES[formData.race]?.name} 种族！` });
  } else {
    // 情况2：完整的新用户初始化流程
    if (!validate()) return;
    
    store.initUser(formData);
    
    // 确保模式正确设置
    // systemStore.isPureMode 在 selectMode 时已经设置了，这里不需要再改
    
    // [Fix] 只有 RPG 模式才打开新手引导
    if (!systemStore.isPureMode) {
      store.setModal('npcGuide', true);
    } else {
      // 纯净模式直接关闭引导弹窗
      store.setModal('onboarding', false);
      showToast({ type: 'success', message: '✅ 账号创建成功！' });
    }
  }
};

// [Fix] 从纯净模式切换到 RPG 时，跳过昵称步骤，保留已有昵称
const startRaceSelection = () => {
  // 保留用户当前昵称和其他基础信息
  formData.nickname = store.user.nickname || formData.nickname;
  formData.gender = store.user.gender || formData.gender;
  formData.height = store.user.height || formData.height;
  formData.weight = store.user.weight || formData.weight;
  formData.age = store.user.age || formData.age;
  
  // 直接跳到种族选择（step 2）
  step.value = 2;
};

const currentRace = computed(() => RACES[formData.race] || RACES.HUMAN);
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] bg-[#0f172a] text-white flex flex-col overflow-hidden">
    <!-- 背景氛围 -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[100px]"></div>
      <div class="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[100px]"></div>
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
    </div>

    <!-- 顶部标题 -->
    <div class="relative z-10 pt-10 px-6 mb-4">
      <div class="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">Welcome</div>
      <h1 class="text-3xl font-black italic tracking-wide">
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">开启旅程</span>
      </h1>
      <div class="h-1 w-12 bg-purple-500 rounded-full mt-2"></div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 relative z-10 overflow-y-auto px-6 pb-24 no-scrollbar">

      <!-- Step 1: 模式选择 (New) -->
      <transition name="fade-slide">
        <div v-if="step === 1" class="space-y-6">
          <p class="text-slate-300 text-sm">请选择您偏好的使用方式（稍后可在设置中更改）：</p>

          <div class="grid grid-cols-1 gap-4">
            <!-- RPG 模式 -->
            <div @click="selectMode(false)"
                 class="relative p-5 rounded-2xl border-2 border-purple-500/50 bg-slate-800/60 hover:bg-slate-800 transition-all cursor-pointer group active:scale-95">
              <div class="flex items-center justify-between mb-2">
                <div class="text-2xl">⚔️</div>
                <div class="text-xs font-bold text-purple-400 border border-purple-500 rounded px-2 py-0.5">推荐</div>
              </div>
              <div class="font-bold text-lg text-white mb-1 group-hover:text-purple-300">沉浸 RPG 模式</div>
              <div class="text-xs text-slate-400 leading-relaxed">
                将减肥变成一场冒险。打怪升级、收集装备、解锁成就，让枯燥的记录变得有趣。
              </div>
            </div>

            <!-- 纯净模式 -->
            <div @click="selectMode(true)"
                 class="relative p-5 rounded-2xl border-2 border-slate-600 bg-slate-800/30 hover:bg-slate-800 transition-all cursor-pointer group active:scale-95">
              <div class="flex items-center justify-between mb-2">
                <div class="text-2xl">🍃</div>
              </div>
              <div class="font-bold text-lg text-white mb-1 group-hover:text-green-300">纯净数据模式</div>
              <div class="text-xs text-slate-400 leading-relaxed">
                回归本质。极简的界面，专注于热量统计、体重追踪和营养分析。无游戏元素打扰。
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Step 2: 种族选择 (卡片式) - 仅 RPG 模式显示或从纯净切换过来 -->
      <transition name="fade-slide">
        <div v-if="step === 2 && !systemStore.isPureMode" class="space-y-6">
          <p v-if="formData.nickname" class="text-slate-400 text-xs mb-2">欢迎，{{ formData.nickname }}！</p>
          <p class="text-slate-300 text-sm">选择你的出身种族，这决定了你的基础属性倾向。</p>

          <div class="grid grid-cols-2 gap-3">
            <div v-for="(race, key) in RACES" :key="key" @click="formData.race = key as RaceType"
                 class="relative p-4 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group min-h-[140px] flex flex-col justify-between"
                 :class="formData.race === key
                   ? 'bg-purple-900/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                   : 'bg-slate-800/40 border-slate-700 opacity-70 hover:opacity-100 hover:bg-slate-800'">

              <div class="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300 origin-left">{{ race.icon }}</div>
              <div>
                <div class="font-bold text-lg" :class="formData.race === key ? 'text-white' : 'text-slate-300'">{{ race.name }}</div>
                <div class="text-[10px] text-slate-400 leading-tight mt-1">{{ race.desc }}</div>
              </div>

              <!-- 选中标记 -->
              <div v-if="formData.race === key" class="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <i class="fas fa-check text-[10px] text-white"></i>
              </div>
            </div>
          </div>

          <!-- 种族详情预览 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 backdrop-blur-sm">
            <div class="text-xs text-slate-400 mb-2 font-bold uppercase">天赋预览</div>
            <div class="flex items-center gap-3">
              <div class="flex-1 text-center border-r border-slate-700">
                <div class="text-[10px] text-slate-500">力量成长</div>
                <div class="font-black text-lg text-blue-400">{{ currentRace?.growth?.str?.toFixed(2) }}</div>
              </div>
              <div class="flex-1 text-center border-r border-slate-700">
                <div class="text-[10px] text-slate-500">敏捷成长</div>
                <div class="font-black text-lg text-green-400">{{ currentRace?.growth?.agi?.toFixed(2) }}</div>
              </div>
              <div class="flex-1 text-center">
                <div class="text-[10px] text-slate-500">体质成长</div>
                <div class="font-black text-lg text-orange-400">{{ currentRace?.growth?.vit?.toFixed(2) }}</div>
              </div>
            </div>
            <div class="mt-3 text-xs text-yellow-500 bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-500/20">
              <i class="fas fa-star mr-1"></i> 特性: {{ currentRace?.bonus }}
            </div>
          </div>
        </div>
      </transition>

      <!-- Step 3 (or Step 2 if Pure): 档案填写 -->
      <transition name="fade-slide">
        <div v-if="(step === 3 && !systemStore.isPureMode) || (step === 2 && systemStore.isPureMode)" class="space-y-6">
          <p class="text-slate-300 text-sm">登记你的基础信息，我们将以此计算你的每日热量代谢 (BMR)。</p>

          <div class="space-y-4">
            <!-- 昵称 -->
            <div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus-within:border-purple-500 transition-colors">
              <label class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">{{ systemStore.isPureMode ? '您的称呼' : 'Hero Name' }}</label>
              <input v-model="formData.nickname" class="w-full bg-transparent text-xl font-bold text-white placeholder-slate-600 outline-none" placeholder="输入名字..." />
            </div>

            <!-- 性别 (图标选择) -->
            <div class="grid grid-cols-2 gap-4">
              <div @click="formData.gender = 'MALE'"
                   class="p-4 rounded-xl border-2 flex items-center justify-center gap-2 cursor-pointer transition-all"
                   :class="formData.gender === 'MALE' ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'">
                <i class="fas fa-mars text-xl"></i> <span class="font-bold">男</span>
              </div>
              <div @click="formData.gender = 'FEMALE'"
                   class="p-4 rounded-xl border-2 flex items-center justify-center gap-2 cursor-pointer transition-all"
                   :class="formData.gender === 'FEMALE' ? 'bg-pink-900/30 border-pink-500 text-pink-400' : 'bg-slate-800/50 border-slate-700 text-slate-500'">
                <i class="fas fa-venus text-xl"></i> <span class="font-bold">女</span>
              </div>
            </div>

            <!-- 身体数值 -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <label class="text-[9px] text-slate-500 block mb-1">身高 (cm)</label>
                <input type="number" v-model.number="formData.height" class="w-full bg-transparent font-bold text-center text-white outline-none" />
              </div>
              <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <label class="text-[9px] text-slate-500 block mb-1">体重 (kg)</label>
                <input type="number" v-model.number="formData.weight" class="w-full bg-transparent font-bold text-center text-white outline-none" />
              </div>
              <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <label class="text-[9px] text-slate-500 block mb-1">年龄</label>
                <input type="number" v-model.number="formData.age" class="w-full bg-transparent font-bold text-center text-white outline-none" />
              </div>
            </div>

            <div class="text-[10px] text-slate-500 text-center mt-2">
              * 数据仅用于本地计算 BMR，绝不上传
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 底部操作栏 -->
    <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent z-20">
      <!-- Step 1 只有选项，不需要下一步按钮 -->

      <div v-if="step > 1" class="flex gap-4">
        <button @click="step--" class="w-1/3 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl active:scale-95 transition-all">
          返回
        </button>
        <!-- 下一步 / 完成 -->
        <button v-if="(step === 2 && !systemStore.isPureMode && !formData.nickname)"
                @click="step = 3"
                class="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/50 hover:scale-[1.02] active:scale-95 transition-all text-lg">
          下一步
        </button>
        <button v-else-if="(step === 2 && !systemStore.isPureMode && formData.nickname)"
                @click="finish"
                class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/50 hover:scale-[1.02] active:scale-95 transition-all text-lg">
          开启冒险 !
        </button>
        <button v-else
                @click="finish"
                class="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/50 hover:scale-[1.02] active:scale-95 transition-all text-lg">
          {{ systemStore.isPureMode ? '开始记录' : '开启冒险 !' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(20px); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
