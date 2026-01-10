<script setup lang="ts">
import { computed, reactive, watch, ref, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, Dialog } from 'vant';
// [Fix] 修正导入路径：getLocalDateStr 位于 dateUtils
import { downloadJsonFile, readJsonFile } from '@/utils/gameUtils';
import { getLocalDateStr } from '@/utils/dateUtils';
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
  enableWeather: true, // [New] 天气特效开关
  enableSplash: true,  // [New] 开屏动画开关
  nickname: '',
  gender: 'MALE' as Gender
});

const fileInput = ref<HTMLInputElement | null>(null);

// 2. 初始化逻辑
watch(show, (val) => {
  if (val) {
    localState.isDarkMode = systemStore.isDarkMode;
    localState.isPureMode = systemStore.isPureMode;
    // [New] 从 LocalStorage 读取设置 (默认为 true)
    localState.enableWeather = localStorage.getItem('app_setting_weather') !== 'false';
    localState.enableSplash = localStorage.getItem('app_setting_splash') !== 'false';

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

  // [New] 保存新设置到 LocalStorage
  localStorage.setItem('app_setting_weather', String(localState.enableWeather));
  localStorage.setItem('app_setting_splash', String(localState.enableSplash));

  // [New] 触发全局事件，通知 HomeView 更新天气状态
  window.dispatchEvent(new Event('settings-changed'));

  // [Fix] 模式切换守卫：从 Pure 切到 RPG 需要检查角色初始化
  console.log('🔍 [Settings] handleSave 开始', {
    modeChanged,
    localStatePureMode: localState.isPureMode,
    systemStorePureMode: systemStore.isPureMode
  });

  if (modeChanged && localState.isPureMode === false && systemStore.isPureMode === true) {
    // 想要切换到 RPG 模式
    const hasInitialized = store.user.isInitialized;
    const hasEnteredRPG = systemStore.hasEnteredRPGMode;

    console.log('🔍 [Settings] 进入模式切换守卫', {
      hasInitialized,
      hasEnteredRPG,
    });

    if (!hasInitialized) {
      // 完全未初始化 -> 打开完整引导流程
      console.log('🔍 [Settings] 分支1: 未初始化');
      show.value = false;
      systemStore.setModal('onboarding', true);
      showToast('请先完成角色创建');
      return;
    }
    // 只要进过一次RPG模式，hasEnteredRPG 就会是 true
    else if (!hasEnteredRPG) {
      console.log('🔍 [Settings] 分支2: 触发种族选择:', {
        reason: '从未真正进入过RPG模式',
        hasEnteredRPG
      });

      systemStore.isPureMode = false;
      localState.isPureMode = false;
      show.value = false;
      // 设置标记，表示是从设置页面打开的
      systemStore.temp.isFromSettings = true;
      console.log('🔍 [Settings] 打开 Onboarding，isFromSettings =', systemStore.temp.isFromSettings);

      nextTick(() => {
        console.log('🔍 [Settings] nextTick 后 isPureMode =', systemStore.isPureMode);
        systemStore.setModal('onboarding', true);
        showToast('请选择您的种族');
      });
      return;
    } else {
      console.log('🔍 [Settings] 分支3: 已进入过RPG模式，直接切换，无需重选种族');
    }
  } else {
    console.log('🔍 [Settings] 未进入模式切换守卫');
  }

  // 应用模式切换
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
      confirmButtonColor: '#10b981'
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
  } catch {
    showToast('文件格式错误');
  }
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
    <!-- 主容器：移除紫色系，使用 Slate/Gray 营造干净的健康感 -->
    <div class="p-6 flex flex-col h-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">

      <!-- 标题栏：简洁化 -->
      <h3 class="text-lg font-bold text-center mb-6 flex items-center justify-center">
        <i class="fas fa-cog text-slate-400 mr-2"></i> {{ localState.isPureMode ? '设置' : '系统设置' }}
      </h3>

      <div class="flex-1 overflow-y-auto space-y-6 custom-scrollbar pb-10">

        <!-- 区域 1: 模式配置 -->
        <div class="rounded-xl p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center">
            <i class="fas fa-sliders-h mr-1.5 opacity-70"></i>
            {{ localState.isPureMode ? '显示偏好' : '模式配置' }}
          </div>

          <!-- 暗黑模式开关 -->
          <div class="flex items-center justify-between mb-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer" @click="localState.isDarkMode = !localState.isDarkMode">
            <div class="flex items-center">
              <!-- 图标容器：使用 Slate/Neutral 色系 -->
              <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center mr-3">
                <i class="fas fa-moon text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm">深色模式</div>
                <div class="text-[10px] text-slate-400">Dark Mode</div>
              </div>
            </div>
            <!-- 使用健康绿 -->
            <van-switch :model-value="localState.isDarkMode" @update:model-value="localState.isDarkMode = $event" size="24px" active-color="#10b981" inactive-color="#e2e8f0" @click.stop />
          </div>

          <!-- 纯净模式开关 -->
          <div class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer" @click="localState.isPureMode = !localState.isPureMode">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mr-3">
                <i class="fas fa-leaf text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm">纯净模式</div>
                <div class="text-[10px] text-slate-400">仅保留数据，隐藏RPG元素</div>
              </div>
            </div>
            <van-switch :model-value="localState.isPureMode" @update:model-value="localState.isPureMode = $event" size="24px" active-color="#10b981" inactive-color="#e2e8f0" @click.stop />
          </div>
        </div>

        <!-- 区域 2: 视觉特效 [New] -->
        <div class="rounded-xl p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center">
            <i class="fas fa-magic mr-1.5 opacity-70"></i>
            {{ localState.isPureMode ? '界面效果' : '视觉特效' }}
          </div>

          <!-- 天气特效开关 -->
          <div class="flex items-center justify-between mb-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer" @click="localState.enableWeather = !localState.enableWeather">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 flex items-center justify-center mr-3">
                <i class="fas fa-cloud-sun-rain text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm">{{ localState.isPureMode ? '天气背景' : '环境特效' }}</div>
                <div class="text-[10px] text-slate-400">雨雪、云雾等动态效果</div>
              </div>
            </div>
            <van-switch :model-value="localState.enableWeather" @update:model-value="localState.enableWeather = $event" size="24px" active-color="#0ea5e9" inactive-color="#e2e8f0" @click.stop />
          </div>

          <!-- 开屏动画开关 -->
          <div class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer" @click="localState.enableSplash = !localState.enableSplash">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center mr-3">
                <i class="fas fa-film text-lg"></i>
              </div>
              <div>
                <div class="font-bold text-sm">开屏动画</div>
                <div class="text-[10px] text-slate-400">启动时的加载动画</div>
              </div>
            </div>
            <van-switch :model-value="localState.enableSplash" @update:model-value="localState.enableSplash = $event" size="24px" active-color="#f59e0b" inactive-color="#e2e8f0" @click.stop />
          </div>
        </div>

        <!-- 区域 3: 档案修改 -->
        <div class="rounded-xl p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center">
            <i class="fas fa-id-card mr-1.5 opacity-70"></i>
            {{ localState.isPureMode ? '个人信息' : '冒险者档案' }}
          </div>

          <div class="space-y-4">
            <!-- 昵称 -->
            <div>
              <label class="text-[10px] text-slate-500 block mb-1 font-bold">
                {{ localState.isPureMode ? '昵称' : '冒险者代号' }}
              </label>
              <div class="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 flex items-center focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                <i class="fas fa-user-edit text-slate-400 mr-2 text-xs"></i>
                <input v-model="localState.nickname"
                       class="w-full bg-transparent text-sm font-bold dark:text-white outline-none placeholder-slate-400"
                       placeholder="输入名字" />
              </div>
            </div>

            <!-- 性别 -->
            <div>
              <label class="text-[10px] text-slate-500 block mb-2 font-bold">性别 (影响BMR计算)</label>
              <div class="flex gap-3">
                <div @click="localState.gender = 'MALE'"
                     class="flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 select-none"
                     :class="localState.gender === 'MALE' ? 'bg-sky-50 border-sky-500 text-sky-600 dark:bg-sky-900/20' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'">
                  <i class="fas fa-mars"></i> <span class="font-bold text-sm">男</span>
                </div>
                <div @click="localState.gender = 'FEMALE'"
                     class="flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 select-none"
                     :class="localState.gender === 'FEMALE' ? 'bg-rose-50 border-rose-500 text-rose-500 dark:bg-rose-900/20' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'">
                  <i class="fas fa-venus"></i> <span class="font-bold text-sm">女</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 区域 4: 数据管理 -->
        <div class="rounded-xl p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
          <div class="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center">
            <i class="fas fa-database mr-1.5 opacity-70"></i> 数据管理
          </div>

          <!-- 数据管理 -->
          <div>
            <label class="text-[10px] text-slate-500 block mb-2 font-bold">数据备份与迁移</label>
            <div class="flex gap-3 mb-3">
              <button @click="handleFileExport" class="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2.5 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 flex items-center justify-center font-medium">
                <i class="fas fa-file-download mr-1.5 text-slate-400"></i> 导出存档
              </button>
              <button @click="triggerFileImport" class="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2.5 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 flex items-center justify-center font-medium">
                <i class="fas fa-file-upload mr-1.5 text-slate-400"></i> 导入存档
              </button>
              <input type="file" ref="fileInput" accept=".json" class="hidden" @change="onFileSelected" />
            </div>
          </div>
        </div>

        <!-- 保存按钮：去除渐变，使用纯色 Emerald -->
        <button @click="handleSave" class="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all mt-4 text-sm flex items-center justify-center tracking-wide">
          <i class="fas fa-check-circle mr-2"></i> {{ localState.isPureMode ? '保存设置' : '确认并生效' }}
        </button>

        <div class="text-center text-[10px] text-slate-300 dark:text-slate-600 pt-4 font-mono">
          Health RPG v4.8 · {{ localState.isPureMode ? 'Pure Edition' : 'Standard Edition' }}
        </div>

      </div>
    </div>
  </van-popup>
</template>

<style scoped>
/* 滚动条美化：更细更淡 */
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
</style>
