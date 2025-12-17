<script setup lang="ts">
/**
 * ModalAddFood.vue
 * 专注食物录入 (单一职责)
 * - Pure Mode: 全屏窗口
 * - RPG Mode: 底部弹窗
 * - V5.6 Feature: 新增“最近”历史记录 tab
 * - V5.7 Feature: 断食拦截 & Tab 顺序调整
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCooking } from '@/composables/useCooking';
import { AiService } from '@/utils/aiService';
import { formatRpgFoodName } from '@/utils/gameUtils';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast, showNotify, showConfirmDialog } from 'vant';
import type { FoodItem, FoodLog } from '@/types';
import type { UploaderFileListItem } from 'vant';

const store = useGameStore();
const systemStore = useSystemStore();

const isPure = computed(() => systemStore.isPureMode);

const show = computed({
  get: () => store.modals.addFood,
  set: (val) => store.setModal('addFood', val)
});

// 使用烹饪组合式函数
const { isBuilding, basket, resetBasket, addToBasket, removeFromBasket, commitBasket } = useCooking(() => {
  show.value = false;
});

const query = ref('');
const loading = ref(false);
const loadingText = ref('AI 思考中...');
const activeCategory = ref('ALL'); // [Fix] 默认为“全部”
const aiResult = ref<FoodItem | null>(null);
const aiSuggestions = ref<FoodItem[]>([]);

// [PM Fix] 监听搜索内容，如果有输入，自动切换到“全部”Tab，避免用户在分类 Tab 下搜不到东西
watch(query, (newVal) => {
  if (newVal && newVal.trim().length > 0 && activeCategory.value !== 'ALL') {
    activeCategory.value = 'ALL';
  }
});

const suggestion = computed(() => store.stageInfo.isOverloaded ? null : store.getTacticalSuggestion());

const openManualAdd = () => {
  store.setModal('manualAdd', true);
};

const resetLocalState = () => {
  query.value = '';
  aiResult.value = null;
  aiSuggestions.value = [];
  loading.value = false;
  activeCategory.value = 'ALL';
  resetBasket();
};

// 从最近的日志中计算历史记录
const historyList = computed(() => {
  const allLogs: FoodLog[] = [];
  const logEntries = Object.entries(store.logs).sort((a, b) => b[0].localeCompare(a[0]));
  for (const [date, logs] of logEntries.slice(0, 7)) {
    allLogs.push(...logs);
  }
  const uniqueMap = new Map<string, FoodLog>();
  allLogs.forEach(log => {
    if (log.mealType === 'HYDRATION' || log.mealType === 'EXERCISE') return;
    const key = log.originalName || log.name;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, log);
    }
  });
  return Array.from(uniqueMap.values());
});

const filteredList = computed(() => {
  const rawList = (store.foodDb && Array.isArray(store.foodDb)) ? store.foodDb : [];
  let result: FoodItem[] = [];

  if (activeCategory.value === 'RECENT') {
    result = historyList.value.map(log => {
      const { mealType, timestamp, damageTaken, blocked, dodged, gainedExp, healed, skillEffect, finalDamageValue, ...baseItem } = log;
      return baseItem as FoodItem;
    });
  } else if (activeCategory.value === 'FAV') {
    result = rawList
      .filter((i) => i.usageCount && i.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else if (activeCategory.value !== 'ALL') {
    result = rawList.filter((i) => i.category === activeCategory.value);
  } else {
    result = rawList;
  }

  if (query.value.trim()) {
    const q = query.value.toLowerCase().trim();
    result = result.filter((i) =>
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.displayName && i.displayName.toLowerCase().includes(q)) ||
      (i.originalName && i.originalName.toLowerCase().includes(q)) ||
      (i.tips && i.tips.toLowerCase().includes(q))
    );
  }
  return result;
});

const getDisplayName = (item: FoodItem) => {
  if (isPure.value) return item.originalName || item.name;
  if (item.displayName) return item.displayName;
  return formatRpgFoodName(item.name, store.user.race, item.originalName);
};

const onTextSearch = async () => {
  if (!query.value.trim()) return;
  loading.value = true;
  loadingText.value = '大贤者正在查阅古籍...';
  aiResult.value = null;
  aiSuggestions.value = [];
  try {
    const res = await AiService.estimateText(query.value, store.user.race);
    if (Array.isArray(res) && res.length > 0) aiSuggestions.value = res;
    else if (res && !Array.isArray(res)) aiResult.value = res as FoodItem;
  } catch (e) {
    showToast({ type: 'fail', message: '服务正忙' });
  } finally {
    loading.value = false;
  }
};

const onImageUpload = async (items: UploaderFileListItem | UploaderFileListItem[]) => {
  const file = Array.isArray(items) ? items[0] : items;
  if (!file) return;
  loading.value = true;
  loadingText.value = '正在解析图像魔力...';
  aiResult.value = null;
  try {
    const res = await AiService.identifyImage(file.content || '', store.user.race);
    if (Array.isArray(res) && res.length > 0) aiSuggestions.value = res;
    else if (res && !Array.isArray(res)) aiResult.value = res as FoodItem;
  } catch (e) {
    showToast({ type: 'fail', message: '图像解析失败' });
  } finally {
    loading.value = false;
  }
};

// --- [Fix Logic] 断食拦截与记录处理 ---
const selectItem = (item: FoodItem) => {
  // 1. 判断是否正在断食
  if (store.user.fasting?.isFasting) {
    // 允许喝水/零热量饮料 (DRINK 分类且热量极低)
    const isSafeDrink = (item.category === 'DRINK' && (!item.calories || item.calories < 5));

    if (!isSafeDrink) {
      showConfirmDialog({
        title: isPure.value ? '断食提醒' : '打破冥想？',
        message: isPure.value
          ? '当前处于断食模式，记录食物将自动结束断食。\n确定要进食吗？'
          : '⚠️ 警告：进食将打断「虚空冥想」蓄力状态！\n确定要放弃当前的加成吗？',
        confirmButtonText: '进食 (结束断食)',
        confirmButtonColor: '#ef4444',
        cancelButtonText: '忍住'
      }).then(() => {
        // 用户确认要吃 -> 结束断食
        store.heroStore.stopFasting();
        store.saveState();
        proceedSelection(item);
      }).catch(() => {
        // 用户取消 -> 什么都不做
      });
      return;
    }
  }

  proceedSelection(item);
};

// 提取原有的处理逻辑
const proceedSelection = (item: FoodItem) => {
  if (isBuilding.value) {
    if (item.isComposite || item.isPreset) {
      showNotify({ type: 'danger', message: '🚫 套餐内不允许包含其他套餐！' });
      return;
    }
    const finalItem = { ...item, name: getDisplayName(item), originalName: item.originalName || item.name };
    store.temp.pendingItem = finalItem;
    store.setModal('quantity', true);
    return;
  }

  if (item.isComposite && !item.isPreset && (!item.usageCount || item.usageCount === 0)) {
    store.temp.basket = [];
    store.temp.isBuilding = true;
    const base = JSON.parse(JSON.stringify(item));
    delete base.ingredients;
    delete base.isComposite;
    store.temp.basket.push(base);
    showToast({ type: 'success', message: `👨‍🍳 已开启烹饪：${item.name}` });
    return;
  }

  const finalItem = { ...item, name: getDisplayName(item), originalName: item.originalName || item.name };
  store.temp.pendingItem = finalItem;
  store.setModal('quantity', true);
};

watch(show, (val) => {
  if (val) {
    query.value = '';
    activeCategory.value = 'ALL'; // [Fix] 每次打开优先显示全部
    if (!store.foodDb || store.foodDb.length === 0) store.loadState();
  } else {
    if (!store.modals.quantity && !store.temp.pendingItem) {
      resetLocalState();
    }
  }
});

onUnmounted(() => resetLocalState());

// UI Style Logic
const popupStyles = computed(() => {
  if (isPure.value) {
    return { width: '100%', height: '100%', borderRadius: '0' };
  }
  return { height: '90%', borderRadius: '24px 24px 0 0' };
});
const popupPosition = computed(() => isPure.value ? 'right' : 'bottom');
</script>

<template>
  <van-popup
    v-model:show="show"
    :position="popupPosition"
    :style="popupStyles"
    class="dark:bg-slate-900 flex flex-col transition-all duration-300"
    safe-area-inset-bottom
  >
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120] relative">

      <!-- Top Header -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700 items-center shadow-sm">
        <div v-if="isPure" @click="show = false" class="text-slate-500 flex items-center cursor-pointer">
          <van-icon name="arrow-left" class="mr-1" /> 返回
        </div>
        <van-icon v-else name="arrow-down" @click="show = false" class="text-slate-400 text-lg active:scale-90 transition" />

        <div class="font-bold dark:text-white text-lg flex items-center gap-2">
          <span>{{ isPure ? '饮食记录' : '添加补给' }}</span>
          <span v-if="isBuilding" class="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full animate-pulse border border-purple-200">
            <i class="fas fa-fire-alt mr-1"></i>烹饪模式
          </span>
        </div>

        <div v-if="isBuilding" @click="resetLocalState" class="text-xs text-red-500 font-bold cursor-pointer active:opacity-70 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded flex items-center">
          <i class="fas fa-trash-alt mr-1"></i>清空
        </div>
        <div v-else class="w-8"></div>
      </div>

      <!-- 战术情报 (Pure模式不显示) -->
      <div v-if="suggestion && !isPure"
           class="mx-4 mt-2 px-3 py-2 rounded-xl flex items-center gap-3 border shadow-sm bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 border-purple-100 dark:border-slate-600 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div class="text-2xl z-10">{{ suggestion.icon }}</div>
        <div class="flex-1 z-10">
          <div class="text-[10px] text-purple-500 font-bold uppercase tracking-wider flex items-center">
            战术顾问 <span class="ml-1 text-[8px] px-1 bg-purple-100 rounded text-purple-600">INTEL</span>
          </div>
          <div class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ suggestion.text }}</div>
        </div>
      </div>

      <!-- Search & AI Tools -->
      <div class="p-4 pb-0 flex gap-2 items-center bg-white dark:bg-slate-800 pt-2">
        <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-2 flex items-center border border-transparent focus-within:border-purple-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
          <van-icon name="search" class="text-slate-400 mr-2" />
          <input v-model="query" :placeholder="isPure ? '搜索食物' : '搜索 / 描述食物 (AI)'" class="bg-transparent w-full text-sm outline-none dark:text-white placeholder-slate-400" @keyup.enter="onTextSearch" />
          <button v-if="query" @click="query = ''" class="mr-2 text-slate-400 hover:text-slate-600"><van-icon name="clear" /></button>
          <button v-if="query" @click="onTextSearch" class="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full font-bold whitespace-nowrap active:scale-95 transition flex items-center">
            <i class="fas fa-magic mr-1"></i>{{ isPure ? 'AI识别' : '鉴定' }}
          </button>
        </div>

        <button @click="openManualAdd" class="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 active:bg-slate-200 transition">
          <i class="fas fa-pen-nib"></i>
        </button>

        <van-uploader :after-read="onImageUpload" capture="camera">
          <div class="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 active:bg-slate-200 transition">
            <i class="fas fa-camera"></i>
          </div>
        </van-uploader>
      </div>

      <!-- Categories Tabs -->
      <div class="px-2 mt-2 bg-white dark:bg-slate-800 pb-2 border-b border-slate-100 dark:border-slate-700">
        <van-tabs v-model:active="activeCategory" background="transparent" color="#7c3aed" title-active-color="#7c3aed" shrink line-width="20px">
          <van-tab title="全部" name="ALL"></van-tab> <!-- [Fix] 已移至最前 -->
          <van-tab title="🕒 最近" name="RECENT"></van-tab>
          <van-tab title="❤️ 常吃" name="FAV"></van-tab>
          <van-tab title="🍱 套餐" name="DISH"></van-tab>
          <van-tab title="🍞 主食" name="STAPLE"></van-tab>
          <van-tab title="🥩 肉类" name="MEAT"></van-tab>
          <van-tab title="🥦 素食" name="VEG"></van-tab>
          <van-tab title="🥤 饮品" name="DRINK"></van-tab>
        </van-tabs>
      </div>

      <!-- Main Scrollable List -->
      <div class="flex-1 overflow-y-auto px-4 mt-2 pb-32 custom-scrollbar">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-10 space-y-3">
          <van-loading type="spinner" color="#7c3aed" vertical>
            <span class="text-xs text-purple-500 mt-2">{{ isPure ? '正在识别...' : loadingText }}</span>
          </van-loading>
        </div>

        <!-- AI Result -->
        <div v-if="aiResult && !loading" class="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-700 p-4 rounded-2xl mb-4 border border-purple-100 dark:border-slate-600 shadow-sm cursor-pointer active:scale-98 transition relative overflow-hidden group" @click="selectItem(aiResult)">
          <div class="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">AI 结果</div>
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-lg dark:text-white flex items-center gap-2">
                {{ isPure ? (aiResult.originalName || aiResult.name) : aiResult.name }}
                <div v-if="aiResult.tags" class="flex gap-1">
                  <span v-for="tag in aiResult.tags" :key="tag" class="text-[8px] px-1 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
                </div>
              </div>
              <div class="text-xs text-purple-500 mt-1 flex items-center"><i class="fas fa-sparkles mr-1"></i> {{ aiResult.tips || '未知的食物' }}</div>
              <div class="text-xs text-slate-500 mt-1">
                热量: {{ aiResult.calories }} kcal
              </div>
            </div>
            <van-button size="small" color="#7c3aed" class="h-8 px-4 rounded-lg font-bold shadow-md shadow-purple-200 dark:shadow-none">
              {{ isBuilding ? '加入' : (aiResult.isComposite ? '制作' : '添加') }}
            </van-button>
          </div>
        </div>

        <!-- Suggestions List -->
        <div v-if="aiSuggestions.length > 0 && !loading" class="mb-4">
          <div class="text-xs text-slate-400 mb-2">AI 建议结果:</div>
          <div v-for="sugg in aiSuggestions" :key="sugg.name" @click="selectItem(sugg)"
               class="bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 p-3 rounded-xl mb-2 flex justify-between items-center shadow-sm">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ sugg.icon }}</span>
              <div>
                <div class="font-bold text-sm dark:text-white">{{ sugg.name }}</div>
                <div class="text-[10px] text-slate-500">{{ sugg.calories }} kcal</div>
              </div>
            </div>
            <van-icon name="plus" class="text-purple-500" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && filteredList.length === 0 && !aiResult && aiSuggestions.length === 0" class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4 opacity-50 grayscale">🍃</div>
          <div class="text-sm font-bold text-slate-500 mb-6">暂无此分类项目</div>
          <van-button icon="edit" round color="linear-gradient(to right, #7c3aed, #6366f1)" class="shadow-lg shadow-purple-200 dark:shadow-none font-bold px-8" @click="openManualAdd">
            找不到？手动录入
          </van-button>
        </div>

        <!-- List Items -->
        <div class="space-y-2.5">
          <div v-for="item in filteredList" :key="item.id" @click="selectItem(item)"
               class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer shadow-sm hover:shadow-md hover:border-purple-100 dark:hover:border-slate-600">
            <div class="flex items-center flex-1 mr-2 overflow-hidden">
              <span class="text-3xl mr-4 w-8 text-center">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-bold dark:text-white text-sm flex items-center">
                  <span class="truncate">{{ getDisplayName(item) }}</span>
                  <span v-if="item.isComposite" class="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center shrink-0"><i class="fas fa-layer-group mr-1"></i>套餐</span>
                </div>
                <div v-if="item.tips && !isPure" class="text-[9px] text-slate-400 mt-1 truncate flex items-center"><i class="fas fa-info-circle mr-1 text-slate-300"></i> {{ item.tips }}</div>

                <div class="flex gap-1 mt-1.5" v-if="item.tags && item.tags.length">
                  <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
                </div>

                <div class="text-xs text-slate-400 mt-1 flex items-center" v-if="!item.tags || item.tags.length === 0">
                  <span class="mr-3 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{{ item.unit }}</span>
                  <span class="font-mono text-orange-400">摄入 ~{{ item.calories }} kcal</span>
                </div>
              </div>
            </div>
            <div class="flex items-center shrink-0">
              <van-button size="small" :color="isBuilding ? '#10b981' : (item.isComposite && !item.isPreset ? '#f59e0b' : '#7c3aed')" plain class="h-8 px-3 text-xs rounded-xl font-bold border-2">
                <template v-if="isBuilding"><i class="fas fa-plus mr-1"></i>加入</template>
                <template v-else-if="item.isComposite && !item.isPreset"><i class="fas fa-utensils mr-1"></i>制作</template>
                <template v-else><i class="fas fa-check mr-1"></i>记录</template>
              </van-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Basket Drawer -->
      <transition name="van-slide-up">
        <div v-if="isBuilding" class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 rounded-t-3xl backdrop-blur-md pb-safe">
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm font-bold dark:text-white flex items-center">
              <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 animate-bounce"><i class="fas fa-utensils"></i></div>
              <span>当前配料 ({{ basket.length }})</span>
            </div>
            <div class="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              已选: <span class="text-purple-600 font-bold">{{ basket.reduce((a, b)=>a+(Number(b.calories)||0),0) }}</span> kcal
            </div>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar px-1" v-if="basket.length > 0">
            <div v-for="(item, idx) in basket" :key="idx" class="relative shrink-0 w-16 flex flex-col items-center group">
              <div class="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 dark:border-slate-700 shadow-sm group-hover:border-red-200 transition-colors">{{ item.icon }}</div>
              <div class="text-[9px] truncate w-full text-center mt-1 dark:text-slate-300 font-medium">{{ item.name }}</div>
              <div class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-md transform scale-0 group-hover:scale-100 transition-transform" @click.stop="removeFromBasket(idx)"><i class="fas fa-times"></i></div>
            </div>
          </div>
          <div v-else class="text-center text-xs text-slate-400 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-4 bg-slate-50/50">
            <i class="fas fa-arrow-up animate-bounce mb-2 block"></i> 点击上方列表添加食材
          </div>
          <div class="flex gap-3">
            <van-button plain round size="small" class="flex-1 border-slate-300 text-slate-500" @click="resetLocalState">取消烹饪</van-button>
            <van-button block color="linear-gradient(to right, #10b981, #059669)" round :disabled="basket.length === 0" @click="commitBasket" class="shadow-lg shadow-green-500/30 flex-[3] font-bold"><i class="fas fa-check-circle mr-2"></i>完成料理</van-button>
          </div>
        </div>
      </transition>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d8b4fe; border-radius: 4px; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
/* Tag styles reuse from global */
.tag-badge { @apply font-bold rounded mr-1; }
.tag-高糖 { @apply bg-red-100 text-red-800 border-red-200; }
.tag-高油 { @apply bg-yellow-100 text-yellow-800 border-yellow-200; }
.tag-高盐 { @apply bg-slate-200 text-slate-700 border-slate-300; }
.tag-高碳 { @apply bg-orange-100 text-orange-800 border-orange-200; }
.tag-高蛋白 { @apply bg-green-100 text-green-800 border-green-200; }
.tag-纯净 { @apply bg-cyan-100 text-cyan-800 border-cyan-200; }
.tag-均衡 { @apply bg-purple-100 text-purple-800 border-purple-200; }
</style>
