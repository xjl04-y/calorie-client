<script setup lang="ts">
import { computed, reactive, watch, ref, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore'; // [Fix] 导入 HeroStore 用于检查角色初始化
import { showToast, Dialog } from 'vant';
// [Fix] 修正导入路径：getLocalDateStr 位于 dateUtils
import { downloadJsonFile, readJsonFile } from '@/utils/gameUtils';
import { getLocalDateStr } from '@/utils/dateUtils';
import type { Gender } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore(); // [Fix] 初始化 HeroStore

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
  // [Removed] 移除了 apiKey 字段
});

const fileInput = ref<HTMLInputElement | null>(null);

// 2. 初始化逻辑
watch(show, (val) => {
  if (val) {
    localState.isDarkMode = systemStore.isDarkMode;
    localState.isPureMode = systemStore.isPureMode;
    localState.nickname = store.user.nickname;
    localState.gender = store.user.gender;
    // [Removed] 移除了 apiKey 初始化
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

  // [Fix] 模式切换守卫：从 Pure 切到 RPG 需要检查角色初始化
  console.log('🔍 [Settings] handleSave 开始', {
    modeChanged,
    localStatePureMode: localState.isPureMode,
    systemStorePureMode: systemStore.isPureMode
  });

  if (modeChanged && localState.isPureMode === false && systemStore.isPureMode === true) {
    // 想要切换到 RPG 模式
    const hasInitialized = heroStore.user.isInitialized;
    const hasEnteredRPG = systemStore.hasEnteredRPGMode; // [Fix] 检查是否已经进入过RPG模式
    const currentRace = heroStore.user.race;

    console.log('🔍 [Settings] 进入模式切换守卫', {
      hasInitialized,
      hasEnteredRPG,
      userRace: currentRace
    });

    if (!hasInitialized) {
      // 完全未初始化 -> 打开完整引导流程
      console.log('🔍 [Settings] 分支1: 未初始化');
      show.value = false;
      systemStore.setModal('onboarding', true);
      showToast('请先完成角色创建');
      return;
    }
      // [Fix] 核心逻辑修改：
      // 只有在 "从未进入过RPG模式" (!hasEnteredRPG) 且 "种族是默认人类" (race === 'HUMAN') 时，才触发选择。
      // 如果 hasEnteredRPG 为 true，说明用户之前在 RPG 模式下明确选择了人类，不应重选。
    // 如果 race 不是 HUMAN (比如是 ELF)，说明肯定是选过的（或者是旧存档），也不重选。
    else if (!hasEnteredRPG && (currentRace === 'HUMAN' || !currentRace)) {
      console.log('🔍 [Settings] 分支2: 触发种族选择:', {
        reason: '未进入过RPG模式且种族为默认值',
        hasEnteredRPG,
        currentRace
      });

      systemStore.isPureMode = false;
      // [Fix] 也要更新localState，保持一致
      localState.isPureMode = false;
      show.value = false;
      // 设置标记，表示是从设置页面打开的
      systemStore.temp.isFromSettings = true;
      console.log('🔍 [Settings] 打开 Onboarding，isFromSettings =', systemStore.temp.isFromSettings);

      // [Critical Fix] 使用 nextTick 确保 isPureMode 更新完成后再打开弹窗
      nextTick(() => {
        console.log('🔍 [Settings] nextTick 后 isPureMode =', systemStore.isPureMode);
        systemStore.setModal('onboarding', true);
        // watch 会自动检测并跳到种族选择步骤
        showToast('请选择您的种族');
      });
      return;
    } else {
      console.log('🔍 [Settings] 分支3: 已选择种族或已进入RPG，直接切换');
    }
  } else {
    console.log('🔍 [Settings] 未进入模式切换守卫');
  }

  // 应用模式切换
  systemStore.isPureMode = localState.isPureMode;
  // [Removed] 移除了 apiKey 保存逻辑

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

// --- 数据管理逻辑 ---
const handleFileExport = () => {
  const data = store.getExportData();
  if (!data) {
    showToast('没有可导出的数据');
    return;
  }
  const filename = `HEALTH_SAVE_${store.user.nickname}_${getLocalDateStr()}`;
  const success = downloadJsonFile(filename, data);
  if (success) showToast(localState.isPureMode ? '数据备份已下载' : '📜 存档卷轴已生成！');
  else showToast('导出失败');
};

const triggerFileImport = () => {
  fileInput.value?.click();
};

const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const data = await readJsonFile(file);
    Dialog.confirm({
      title: localState.isPureMode ? '导入备份' : '读取神谕 (导入存档)',
      message: '⚠️ 导入将覆盖当前所有进度！确定要继续吗？',
      confirmButtonText: '确定覆盖',
      confirmButtonColor: '#7c3aed'
    }).then(() => {
      const success = store.importSaveDataObj(data);
      if (success) {
        showToast('数据恢复成功，即将刷新...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast('文件格式错误，无法读取。');
      }
    }).catch(() => {
      if (fileInput.value) fileInput.value.value = '';
    });
  } catch (e) {
    showToast('文件格式错误');
  }
};

// [PM Feature] 重置悬浮球位置
const resetFabPosition = () => {
  localStorage.removeItem('health_rpg_fab_pos');
  showToast('位置已重置，请刷新页面');
  setTimeout(() => window.location.reload(), 1000);
};
</script>

<template>
  <van-popup
    v-model:show="show"
    round
    position="bottom"
    :style="{ height: '70%' }"
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

        <!-- 区域 2: 档案修改 -->
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

        <!-- 区域 3: 数据管理 (原高级设置) -->
        <div class="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">
            数据管理
          </div>

          <!-- [Removed] 移除了 AI Key 输入框 -->

          <!-- 数据管理 -->
          <div>
            <label class="text-[10px] text-slate-500 block mb-2 font-bold">数据备份与迁移</label>
            <div class="flex gap-3 mb-3">
              <button @click="handleFileExport" class="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm flex items-center justify-center">
                <i class="fas fa-file-download mr-1.5"></i> 导出存档
              </button>
              <button @click="triggerFileImport" class="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm flex items-center justify-center">
                <i class="fas fa-file-upload mr-1.5"></i> 导入存档
              </button>
              <input type="file" ref="fileInput" accept=".json" class="hidden" @change="onFileSelected" />
            </div>

            <!-- [New] UI 重置 -->
            <button @click="resetFabPosition" class="w-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs py-2 rounded-lg font-bold border border-slate-300 dark:border-slate-500 active:scale-95 transition">
              <i class="fas fa-sync-alt mr-1"></i> 重置操作窗位置 (修复按钮消失)
            </button>
          </div>
        </div>

        <button @click="handleSave" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-500/30 active:scale-95 transition-all mt-2 text-base flex items-center justify-center">
          <i class="fas fa-check-circle mr-2"></i> {{ localState.isPureMode ? '保存设置' : '确认并生效' }}
        </button>

        <div class="text-center text-[10px] text-slate-400 opacity-60 pt-2">
          Health RPG v4.8 · {{ localState.isPureMode ? 'Pure Edition' : 'Standard Edition' }}
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
