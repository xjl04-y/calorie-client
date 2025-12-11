<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast } from 'vant';
import type { Gender } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();

const show = computed({
  get: () => systemStore.modals.settings,
  set: (val) => systemStore.setModal('settings', val)
});

// 1. 本地暂存状态 (Local State)
const localState = reactive({
  isDarkMode: false,
  isPureMode: false,
  nickname: '',
  gender: 'MALE' as Gender
});

// 2. 初始化逻辑
watch(show, (val) => {
  if (val) {
    localState.isDarkMode = systemStore.isDarkMode;
    localState.isPureMode = systemStore.isPureMode;
    localState.nickname = store.user.nickname;
    localState.gender = store.user.gender;
  }
});

// 3. 提交逻辑
const handleSave = () => {
  if (!localState.nickname.trim()) {
    showToast('名字不能为空');
    return;
  }

  // --- 应用视觉设置 ---
  const themeChanged = systemStore.isDarkMode !== localState.isDarkMode;
  const modeChanged = systemStore.isPureMode !== localState.isPureMode;

  systemStore.isDarkMode = localState.isDarkMode;
  systemStore.isPureMode = localState.isPureMode;

  // 强制处理暗黑模式 CSS 类
  if (localState.isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // --- 应用个人档案 ---
  const profileChanged = (store.user.nickname !== localState.nickname) || (store.user.gender !== localState.gender);

  store.user.nickname = localState.nickname;
  if (store.user.gender !== localState.gender) {
    store.user.gender = localState.gender;
    store.recalcBMR();
  }

  store.saveState();
  show.value = false;

  let msg = '设置已保存';
  if (modeChanged) msg = localState.isPureMode ? '🍃 已开启纯净模式' : '⚔️ 已恢复冒险模式';
  else if (themeChanged) msg = localState.isDarkMode ? '🌙 暗黑模式已开启' : '☀️ 已关闭暗黑模式';
  else if (profileChanged) msg = '📝 信息已更新';

  showToast({ type: 'success', message: msg });
};
</script>

<template>
  <van-popup
    v-model:show="show"
    round
    position="bottom"
    :style="{ height: '60%' }"
    class="dark:bg-slate-900"
    closeable
  >
    <div class="p-6 flex flex-col h-full bg-white dark:bg-slate-900">
      <h3 class="text-xl font-black text-center mb-6 dark:text-white flex items-center justify-center">
        <i class="fas fa-cog text-slate-400 mr-2"></i> {{ localState.isPureMode ? '设置' : '系统设置' }}
      </h3>

      <div class="flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-10">

        <!-- 区域 1: 模式切换 -->
        <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">
            {{ localState.isPureMode ? '显示偏好' : '模式配置' }}
          </div>

          <!-- 暗黑模式开关 -->
          <div class="flex items-center justify-between mb-4 p-2 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg transition-colors" @click="localState.isDarkMode = !localState.isDarkMode">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mr-3 border border-indigo-200 dark:border-indigo-800">
                <i class="fas fa-moon text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm dark:text-slate-200">暗黑模式</div>
                <div class="text-[10px] text-slate-400">Dark Mode</div>
              </div>
            </div>
            <!-- 明确的 Switch 按钮 -->
            <van-switch :model-value="localState.isDarkMode" @update:model-value="localState.isDarkMode = $event" size="24px" active-color="#7c3aed" @click.stop />
          </div>

          <!-- 纯净模式开关 -->
          <div class="flex items-center justify-between p-2 active:bg-slate-200 dark:active:bg-slate-700 rounded-lg transition-colors" @click="localState.isPureMode = !localState.isPureMode">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mr-3 border border-emerald-200 dark:border-emerald-800">
                <i class="fas fa-leaf text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm dark:text-slate-200">纯净模式</div>
                <div class="text-[10px] text-slate-400">仅保留数据，隐藏RPG元素</div>
              </div>
            </div>
            <van-switch :model-value="localState.isPureMode" @update:model-value="localState.isPureMode = $event" size="24px" active-color="#10b981" @click.stop />
          </div>
        </div>

        <!-- 区域 2: 档案修改 (文案动态变化) -->
        <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">
            {{ localState.isPureMode ? '个人信息' : '冒险者档案' }}
          </div>

          <div class="space-y-4">
            <!-- 昵称 -->
            <div>
              <label class="text-[10px] text-slate-500 block mb-1 font-bold">
                {{ localState.isPureMode ? '昵称' : '冒险者代号' }}
              </label>
              <div class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 flex items-center focus-within:border-purple-500 transition-colors">
                <i class="fas fa-user-edit text-slate-400 mr-2 text-xs"></i>
                <input v-model="localState.nickname"
                       class="w-full bg-transparent text-sm font-bold dark:text-white outline-none"
                       placeholder="输入名字" />
              </div>
            </div>

            <!-- 性别 -->
            <div>
              <label class="text-[10px] text-slate-500 block mb-2 font-bold">性别 (影响BMR计算)</label>
              <div class="flex gap-3">
                <div @click="localState.gender = 'MALE'"
                     class="flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                     :class="localState.gender === 'MALE' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-700 dark:border-slate-600'">
                  <i class="fas fa-mars text-lg"></i> <span class="font-bold">男</span>
                </div>
                <div @click="localState.gender = 'FEMALE'"
                     class="flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                     :class="localState.gender === 'FEMALE' ? 'bg-pink-50 border-pink-500 text-pink-600 dark:bg-pink-900/30' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-700 dark:border-slate-600'">
                  <i class="fas fa-venus text-lg"></i> <span class="font-bold">女</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button @click="handleSave" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 active:scale-95 transition-all mt-2 text-base flex items-center justify-center">
          <i class="fas fa-check-circle mr-2"></i> {{ localState.isPureMode ? '保存设置' : '确认并生效' }}
        </button>

        <div class="text-center text-[10px] text-slate-400 opacity-60 pt-2">
          Health RPG v3.5 · {{ localState.isPureMode ? 'Pure Edition' : 'Standard Edition' }}
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
</style>
