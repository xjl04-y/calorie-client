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
  height: 170,
  weight: 65,
  age: 24
});

const finish = () => {
  if (!formData.nickname) {
    showToast('请输入冒险代号');
    return;
  }
  store.initUser(formData);
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
        <div class="flex gap-3">
          <van-button round block plain class="!bg-transparent !text-slate-400 !border-slate-600" @click="step = 1">返回</van-button>
          <van-button round block color="linear-gradient(to right, #7c3aed, #d946ef)" class="font-bold flex-1 shadow-lg shadow-purple-900/50" @click="finish">开启冒险</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Zcool+KuaiLe&display=swap');
.font-rpg { font-family: 'Zcool KuaiLe', cursive; }
</style>
