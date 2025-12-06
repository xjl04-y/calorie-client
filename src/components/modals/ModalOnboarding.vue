<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { RACES } from '@/constants/gameData';
import { showToast } from 'vant';

const store = useGameStore();

const show = computed(() => store.modals.onboarding);
const step = ref(1);
const formData = reactive({
  race: 'HUMAN',
  nickname: '',
  gender: 'MALE',
  height: 170,
  weight: 65,
  age: 24
});

const validate = () => {
  if (!formData.nickname.trim()) {
    showToast('请输入冒险代号');
    return false;
  }
  if (formData.height <= 50 || formData.height > 250) {
    showToast('身高必须在 50-250cm 之间');
    return false;
  }
  if (formData.weight <= 20 || formData.weight > 300) {
    showToast('体重必须在 20-300kg 之间');
    return false;
  }
  if (formData.age <= 5 || formData.age > 120) {
    showToast('年龄必须在 5-120 岁之间');
    return false;
  }
  return true;
};

const finish = () => {
  if (validate()) {
    // @ts-ignore
    store.initUser(formData);
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[999] bg-slate-900 text-white flex flex-col items-center justify-center p-6 overflow-hidden">
    <!-- 背景动效 -->
    <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div class="absolute top-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px]"></div>
      <div class="absolute bottom-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px]"></div>
    </div>

    <div class="relative w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-rpg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">异世界契约</h1>
        <p class="text-slate-400 text-sm">请设定你的冒险者身份</p>
      </div>

      <!-- Step 1: 种族选择 -->
      <div v-if="step === 1" class="space-y-4 animate-fade-in">
        <div v-for="(race, key) in RACES" :key="key" @click="formData.race = key"
             class="bg-slate-800/50 border-2 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all"
             :class="formData.race === key ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700 hover:border-slate-600'">
          <div class="text-4xl">{{ race.icon }}</div>
          <div class="flex-1">
            <div class="font-bold text-lg" :class="formData.race === key ? 'text-purple-300' : 'text-slate-200'">{{ race.name }}</div>
            <div class="text-xs text-slate-400">{{ race.desc }}</div>
            <div class="text-[10px] text-yellow-500 mt-1">天赋: {{ race.bonus }}</div>
          </div>
        </div>
        <van-button block round color="linear-gradient(to right, #7c3aed, #d946ef)" class="mt-8 font-bold shadow-lg shadow-purple-900/50" @click="step = 2">下一步</van-button>
      </div>

      <!-- Step 2: 基础信息 -->
      <div v-if="step === 2" class="space-y-6 animate-fade-in">
        <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
          <div class="mb-4">
            <label class="text-xs text-slate-400 block mb-1">冒险代号 (昵称)</label>
            <input v-model="formData.nickname" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" placeholder="例如: 屠龙勇士" />
          </div>

          <!-- 性别选择 -->
          <div class="mb-4">
            <label class="text-xs text-slate-400 block mb-2">性别 (影响基础代谢)</label>
            <div class="flex gap-4">
              <div @click="formData.gender = 'MALE'" class="flex-1 p-3 rounded-lg border-2 text-center cursor-pointer transition-all"
                   :class="formData.gender === 'MALE' ? 'border-blue-500 bg-blue-900/20 text-blue-300' : 'border-slate-600 text-slate-500'">
                <i class="fas fa-mars mr-2"></i>男
              </div>
              <div @click="formData.gender = 'FEMALE'" class="flex-1 p-3 rounded-lg border-2 text-center cursor-pointer transition-all"
                   :class="formData.gender === 'FEMALE' ? 'border-pink-500 bg-pink-900/20 text-pink-300' : 'border-slate-600 text-slate-500'">
                <i class="fas fa-venus mr-2"></i>女
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-400 block mb-1">身高 (cm)</label>
              <input type="number" v-model.number="formData.height" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">体重 (kg)</label>
              <input type="number" v-model.number="formData.weight" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">年龄</label>
              <input type="number" v-model.number="formData.age" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none" />
            </div>
          </div>
        </div>
        <!-- 按钮布局调整：返回占小部分，开始冒险占大部分 -->
        <div class="flex gap-3">
          <van-button round plain class="!bg-transparent !text-slate-400 !border-slate-600 flex-[1]" @click="step = 1">返回</van-button>
          <van-button round color="linear-gradient(to right, #7c3aed, #d946ef)" class="font-bold flex-[2] shadow-lg shadow-purple-900/50" @click="finish">开启冒险</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zcool+KuaiLe&display=swap');
.font-rpg { font-family: 'Zcool KuaiLe', cursive; }
</style>
