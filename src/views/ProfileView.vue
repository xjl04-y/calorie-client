<script lang="ts">
export default { name: 'Profile' };
</script>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, Dialog } from 'vant';
import { getLocalDateStr } from '@/utils/dateUtils';
import { getCombatRank, downloadJsonFile, readJsonFile } from '@/utils/gameUtils';
import type { Achievement } from '@/types';
import type { UploaderFileListItem } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const user = computed(() => store.user);
const heroStats = computed(() => store.heroStats);
const isPure = computed(() => systemStore.isPureMode);

const equipment = computed(() => {
  const slotDefinitions = [
    { id: 'HEAD', name: '头部', icon: 'fas fa-hat-wizard' },
    { id: 'BODY', name: '身体', icon: 'fas fa-tshirt' },
    { id: 'LEGS', name: '腿部', icon: 'fas fa-socks' },
    { id: 'BACK', name: '背部', icon: 'fas fa-user-secret' },
    { id: 'WEAPON', name: '主手', icon: 'fas fa-khanda' },
    { id: 'OFFHAND', name: '副手', icon: 'fas fa-shield-alt' },
    { id: 'ACCESSORY', name: '饰品', icon: 'fas fa-ring' }
  ];
  return slotDefinitions.map(def => {
    const equippedId = user.value.equipped[def.id as keyof typeof user.value.equipped];
    const equippedItem = equippedId
      ? store.achievements.find((a: Achievement) => a.id === equippedId)
      : null;
    return { slotId: def.id, slotName: def.name, defaultIcon: def.icon, item: equippedItem || null };
  });
});

const showEdit = ref(false);
const editData = reactive({ height: 0, weight: 0, age: 0 });
const fileInput = ref<HTMLInputElement | null>(null);

const rankInfo = computed(() => getCombatRank(heroStats.value.combatPower));
const nextRankProgress = computed(() => {
  if (!rankInfo.value.next) return 100;
  return Math.min(100, (heroStats.value.combatPower / rankInfo.value.next) * 100);
});

const bmi = computed(() => {
  const h = user.value.height / 100;
  if (h <= 0) return 0;
  return (user.value.weight / (h * h)).toFixed(1);
});

const bmiStatus = computed(() => {
  const val = parseFloat(String(bmi.value));
  if (val < 18.5) return { text: '偏瘦', color: 'text-blue-500' };
  if (val < 24) return { text: '正常', color: 'text-green-500' };
  if (val < 28) return { text: '超重', color: 'text-orange-500' };
  return { text: '肥胖', color: 'text-red-500' };
});

const onAvatarRead = (items: UploaderFileListItem | UploaderFileListItem[]) => {
  const file = Array.isArray(items) ? items[0] : items;
  if (file && file.content) {
    store.user.avatarType = 'CUSTOM';
    store.user.customAvatar = file.content;
    store.saveState();
    showToast('头像上传成功！');
  } else {
    showToast('图片读取失败');
  }
};

const changeAvatar = () => {
  Dialog.confirm({
    title: isPure.value ? '修改头像' : '重塑容貌',
    message: isPure.value ? '是否随机生成一个新的头像？' : '想要改变你的英雄形象吗？',
    showCancelButton: true,
    confirmButtonText: '随机生成',
    cancelButtonText: '取消',
    confirmButtonColor: '#7c3aed',
  }).then(() => {
    const newSeed = Math.random().toString(36).substring(7);
    store.user.avatarType = 'SEED';
    store.user.avatarSeed = newSeed;
    store.saveState();
    showToast('头像已更新');
  }).catch(() => {});
};

const startEditProfile = () => {
  editData.height = user.value.height;
  editData.weight = user.value.weight;
  editData.age = user.value.age;
  showEdit.value = true;
};

const validate = () => {
  if (editData.height <= 50 || editData.height > 250) {
    showToast('身高必须在 50-250cm 之间');
    return false;
  }
  if (editData.weight <= 20 || editData.weight > 300) {
    showToast('体重必须在 20-300kg 之间');
    return false;
  }
  if (editData.age <= 5 || editData.age > 120) {
    showToast('年龄必须在 5-120 岁之间');
    return false;
  }
  return true;
};

const saveProfile = () => {
  if (!validate()) return;
  store.user.height = editData.height;
  store.updateWeight(editData.weight);
  store.user.age = editData.age;
  store.saveState();
  showToast(isPure.value ? '身体数据已更新' : '档案已更新，Boss数值重算中...');
};

const onBeforeClose = (action: string) => {
  if (action === 'confirm') return validate();
  return true;
};

const openSwap = (slotId: string) => {
  if (isPure.value) return;
  store.temp.activeSlot = slotId as any;
  store.setModal('equipmentSwap', true);
};

const handleFileExport = () => {
  const data = store.getExportData();
  if (!data) {
    showToast('没有可导出的数据');
    return;
  }
  const filename = `HEALTH_SAVE_${store.user.nickname}_${getLocalDateStr()}`;
  const success = downloadJsonFile(filename, data);
  if (success) showToast(isPure.value ? '数据备份已下载' : '📜 存档卷轴已生成！');
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
      title: isPure.value ? '导入备份' : '读取神谕 (导入存档)',
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

const expPercent = computed(() => {
  if (user.value.nextLevelExp <= 0) return 0;
  return Math.min(100, (user.value.currentExp / user.value.nextLevelExp) * 100);
});

// [New] 打开模态框
const openRebirth = () => {
  systemStore.setModal('rebirth', true);
};
const openShop = () => {
  systemStore.setModal('shop', true);
};
</script>

<template>
  <div class="pb-24 bg-slate-50 dark:bg-slate-900 min-h-full text-slate-800 dark:text-white transition-colors duration-300">

    <!-- Header -->
    <div class="relative transition-all duration-500"
         :class="isPure ? 'h-72 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700' : 'h-72 bg-gradient-to-b from-purple-900 to-slate-900'">

      <div v-if="!isPure" class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>

      <!-- Settings & Avatar -->
      <div class="absolute top-4 left-0 right-0 px-4 z-30 flex justify-between">
        <div id="guide-settings" @click="store.setModal('settings', true)"
             class="px-3 py-1 rounded-full text-xs flex items-center active:scale-95 transition cursor-pointer"
             :class="isPure ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600' : 'bg-black/30 backdrop-blur text-white border border-white/20 hover:bg-black/50'">
          <i class="fas fa-cog mr-1"></i> 设置
        </div>

        <van-uploader :after-read="onAvatarRead">
          <div class="px-3 py-1 rounded-full text-xs flex items-center active:scale-95 transition cursor-pointer"
               :class="isPure ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600' : 'bg-black/30 backdrop-blur text-white border border-white/20'">
            <i class="fas fa-camera mr-1"></i> {{ isPure ? '更换头像' : '头像' }}
          </div>
        </van-uploader>
      </div>

      <!-- User Card -->
      <div class="absolute inset-0 flex flex-col items-center justify-start z-20 pt-16">

        <div class="relative group cursor-pointer mb-3" @click="changeAvatar">
          <div class="w-24 h-24 rounded-full p-1 relative z-10 overflow-hidden shadow-xl"
               :class="isPure ? 'bg-white dark:bg-slate-700 ring-4 ring-slate-100 dark:ring-slate-600' : 'bg-slate-700 border-4 border-slate-800'">
            <img v-if="user.avatarType === 'CUSTOM' && user.customAvatar" :src="user.customAvatar" class="w-full h-full rounded-full object-cover" />
            <img v-else :src="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.avatarSeed" class="w-full h-full rounded-full bg-slate-200 dark:bg-slate-600" />
          </div>
          <div v-if="!isPure" class="absolute bottom-0 right-0 bg-yellow-500 text-slate-900 text-xs font-bold px-3 py-0.5 rounded-full border-2 border-slate-800 shadow-lg z-20">Lv.{{ user.level }}</div>
        </div>

        <h2 class="text-2xl font-bold tracking-wide mb-1"
            :class="isPure ? 'text-slate-800 dark:text-white' : 'font-rpg text-yellow-400'">
          {{ user.nickname }}
        </h2>

        <!-- EXP & Gold (RPG Only) -->
        <div v-if="!isPure" class="flex flex-col items-center">
          <div class="w-48 mb-2">
            <div class="flex justify-between text-[10px] text-slate-400 px-1 mb-0.5">
              <span>EXP</span>
              <span>{{ Math.floor(user.currentExp) }} / {{ user.nextLevelExp }}</span>
            </div>
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div class="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-500" :style="{ width: expPercent + '%' }"></div>
            </div>
          </div>

          <!-- [New] 金币显示 (纯净模式隐藏) -->
          <div class="bg-black/40 px-3 py-0.5 rounded-full border border-yellow-500/30 flex items-center text-xs text-yellow-400 font-mono font-bold cursor-pointer hover:scale-105 transition" @click="openShop">
            <i class="fas fa-coins mr-1.5"></i> {{ user.gold || 0 }}
          </div>
        </div>

        <!-- Pure Mode Info -->
        <div v-else class="flex gap-4 mt-2">
          <div class="text-center px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
            <div class="text-[10px] text-slate-400 uppercase">BMI</div>
            <div class="text-lg font-black" :class="bmiStatus.color">{{ bmi }}</div>
          </div>
          <div class="text-center px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
            <div class="text-[10px] text-slate-400 uppercase">BMR</div>
            <div class="text-lg font-black text-slate-700 dark:text-slate-200">{{ store.dailyTarget }}</div>
          </div>
        </div>

        <div v-if="!isPure" class="flex items-center justify-center gap-2 text-slate-400 text-xs mt-1">
          <span><i :class="user.gender === 'MALE' ? 'fas fa-mars text-blue-400' : 'fas fa-venus text-pink-400'"></i> {{ user.age }}岁</span>
          <span>|</span><span>{{ user.height }}cm</span><span>|</span><span>{{ user.weight }}kg</span>
        </div>
      </div>
    </div>

    <!-- RPG Content -->
    <div v-if="!isPure">
      <!-- [New] 功能入口区 (纯净模式隐藏) -->
      <div class="px-6 mt-4 flex gap-3">
        <button @click="openShop" class="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-2 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition flex items-center justify-center border border-yellow-400/30">
          <i class="fas fa-store mr-1.5"></i> 道具商店
        </button>
        <button @click="openRebirth" class="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 py-2 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition flex items-center justify-center border border-slate-600">
          <i class="fas fa-dungeon mr-1.5"></i> 转生洗点
        </button>
      </div>

      <!-- Base Stats & Rank -->
      <div class="mt-4 text-center px-6">
        <div class="flex justify-center mb-4">
          <span class="bg-slate-800 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-bold flex items-center">
              <span class="mr-1 text-lg">{{ heroStats.raceIcon }}</span> {{ heroStats.raceName }}
          </span>
        </div>

        <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner mb-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div class="absolute -right-4 -top-4 text-6xl opacity-10 rotate-12 group-hover:scale-110 transition-transform">{{ heroStats.rankIcon }}</div>

          <div class="text-xs text-slate-400 uppercase tracking-widest mb-1">Combat Rank</div>
          <div class="text-2xl font-black flex items-center justify-center gap-2 mb-2" :class="heroStats.rankColor">
            {{ heroStats.rankTitle }} <span class="text-sm text-slate-500 font-mono">({{ heroStats.combatPower }})</span>
          </div>

          <div class="bg-black/30 rounded-lg py-2 px-3 text-xs inline-block border border-white/5 mb-3">
            <span class="text-yellow-500 font-bold mr-1">✦ 阶位特权:</span>
            <span class="text-slate-300">{{ rankInfo.passive }}</span>
          </div>

          <div v-if="rankInfo.next" class="mt-2 px-4">
            <div class="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>距离下一阶位</span>
              <span>{{ heroStats.combatPower }} / {{ rankInfo.next }}</span>
            </div>
            <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-yellow-600 transition-all duration-500" :style="{ width: nextRankProgress + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <button @click="startEditProfile" class="text-xs text-slate-500 underline hover:text-purple-400">修改档案数据</button>
        </div>
      </div>

      <!-- Core Attributes -->
      <div class="px-4 mt-6">
        <div id="guide-profile-stats" class="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <h3 class="text-sm font-bold text-slate-400 mb-5 flex items-center"><i class="fas fa-chart-bar mr-2 text-purple-500"></i> 核心属性</h3>
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <span class="text-xs text-blue-400 w-16">力量 (STR)</span>
              <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-blue-500" :class="{'stat-bar-overflow': heroStats.rawStr > heroStats.maxStat}" :style="{width: Math.min((heroStats.str / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
              <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawStr > heroStats.maxStat}">{{ heroStats.str }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-green-400 w-16">敏捷 (AGI)</span>
              <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-green-500" :class="{'stat-bar-overflow': heroStats.rawAgi > heroStats.maxStat}" :style="{width: Math.min((heroStats.agi / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
              <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawAgi > heroStats.maxStat}">{{ heroStats.agi }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-orange-400 w-16">体质 (VIT)</span>
              <div class="flex-1 mx-3 h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-full bg-orange-500" :class="{'stat-bar-overflow': heroStats.rawVit > heroStats.maxStat}" :style="{width: Math.min((heroStats.vit / heroStats.maxStat) * 100, 100)+'%'}"></div></div>
              <span class="text-xs font-bold w-12 text-right" :class="{'text-red-500': heroStats.rawVit > heroStats.maxStat}">{{ heroStats.vit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment -->
      <div class="px-4 mt-4" id="guide-equipment">
        <div class="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20 pointer-events-none"></div>
          <div class="flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-sm font-bold text-slate-300 flex items-center"><i class="fas fa-shield-alt mr-2 text-yellow-600"></i> 英雄装备</h3>
            <span class="text-[10px] text-slate-500 font-normal">点击槽位更换</span>
          </div>

          <div class="grid grid-cols-4 gap-3 relative z-10">
            <div v-for="slot in equipment" :key="slot.slotId" @click="openSwap(slot.slotId)"
                 class="aspect-square bg-slate-800 rounded-lg flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group cursor-pointer hover:border-purple-500 active:scale-95"
                 :class="[slot.item ? ('border-' + slot.item.rarity + ' shadow-md') : 'border-slate-700 border-dashed opacity-60']">
              <i v-if="!slot.item" :class="slot.defaultIcon" class="text-3xl text-slate-600"></i>
              <span v-if="!slot.item" class="text-[8px] text-slate-600 mt-1 font-bold">{{ slot.slotName }}</span>
              <div v-if="slot.item" class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <span v-if="slot.item" class="text-4xl mb-1 filter drop-shadow-md transform transition-transform group-hover:scale-110">{{ slot.item.icon }}</span>
              <div v-if="slot.item" class="absolute bottom-0 w-full text-center bg-slate-900/80 backdrop-blur-sm py-0.5">
                <span class="text-[8px] font-bold block truncate px-1" :class="'text-' + slot.item.rarity">{{ slot.item.reward }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pure Mode Card -->
    <div v-else class="px-4 mt-6 space-y-4">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center">
            <i class="fas fa-ruler-combined mr-2 text-blue-500"></i> 身体档案
          </h3>
          <button @click="startEditProfile" class="text-xs text-blue-500 font-bold bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">修改</button>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-black text-slate-800 dark:text-white">{{ user.height }}</div>
            <div class="text-xs text-slate-400">身高 (cm)</div>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800 dark:text-white">{{ user.weight }}</div>
            <div class="text-xs text-slate-400">体重 (kg)</div>
          </div>
          <div>
            <div class="text-2xl font-black text-slate-800 dark:text-white">{{ user.age }}</div>
            <div class="text-xs text-slate-400">年龄</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Data Management -->
    <div class="px-4 mt-6 mb-6">
      <div class="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-slate-500 mb-3 flex items-center">
          <i class="fas fa-save mr-2"></i> {{ isPure ? '数据管理' : '记忆水晶 (存档管理)' }}
        </h3>
        <div class="flex gap-3">
          <button @click="handleFileExport" class="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm">
            <i class="fas fa-file-download mr-1"></i> {{ isPure ? '导出备份' : '下载卷轴 (JSON)' }}
          </button>
          <button @click="triggerFileImport" class="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs py-2 rounded-lg transition border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm">
            <i class="fas fa-file-upload mr-1"></i> {{ isPure ? '导入备份' : '读取卷轴' }}
          </button>
          <input type="file" ref="fileInput" accept=".json" class="hidden" @change="onFileSelected" />
        </div>
        <p class="text-[10px] text-slate-400 mt-2 text-center" v-if="!isPure">存档已启用 RPG 协议，请妥善保管您的卷轴。</p>
      </div>
    </div>

    <van-dialog v-model:show="showEdit" title="修改档案" show-cancel-button :before-close="onBeforeClose" @confirm="saveProfile" class="dark:bg-slate-800 dark:text-white">
      <div class="p-4 space-y-4">
        <div><label class="text-xs text-slate-500 block mb-1">身高 (cm)</label><input type="number" v-model.number="editData.height" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-white"></div>
        <div><label class="text-xs text-slate-500 block mb-1">体重 (kg)</label><input type="number" v-model.number="editData.weight" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-white"></div>
        <div><label class="text-xs text-slate-500 block mb-1">年龄</label><input type="number" v-model.number="editData.age" class="w-full bg-slate-100 dark:bg-slate-700 rounded px-3 py-2 text-sm text-slate-800 dark:text-white"></div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.stat-bar-overflow { background: repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #b91c1c 10px, #b91c1c 20px); }
</style>
