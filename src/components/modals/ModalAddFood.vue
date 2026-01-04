<script setup lang="ts">
/**
 * ModalAddFood.vue
 * 专注食物录入 (单一职责)
 * - Pure Mode: 全屏窗口
 * - RPG Mode: 底部弹窗
 * - V6.3 Optimization: 懒加载 + 标签净化
 * - V6.4 Fix: 修复 onLoad 未定义报错 (调整代码顺序)
 * - V6.5 Fix: 修复移动端滚动不加载和AI结果残留
 * - V6.6 Fix:
 * 1. 手动引入 VanList 组件解决 [Vue warn]: Failed to resolve component: van-list
 * 2. 增强搜索清空逻辑，确保 AI 结果立即消失
 */
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCooking } from '@/composables/useCooking';
import { AiService } from '@/utils/aiService';
import { getFoodDisplayName } from '@/utils/foodNameService';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast, showNotify, showConfirmDialog, List as VanList } from 'vant'; // [Fix] 显式引入 List 组件
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
const activeCategory = ref('ALL');
const aiResult = ref<FoodItem | null>(null);
const aiSuggestions = ref<FoodItem[]>([]);

// --- 懒加载状态管理 ---
const listLoading = ref(false);
const listFinished = ref(false);
const currentPage = ref(1);
const pageSize = 20;
const displayedList = ref<FoodItem[]>([]);

// [Fix: Search Clear] 监听搜索内容变化
watch(query, (newVal) => {
  // 1. 如果有输入，且当前不是"全部"，切回"全部"以便搜索
  if (newVal && newVal.trim().length > 0) {
    if (activeCategory.value !== 'ALL') {
      activeCategory.value = 'ALL';
    }
  }
  // 2. [New] 如果清空了输入框，立即重置 AI 结果，恢复列表显示
  else if (!newVal || newVal.trim().length === 0) {
    clearSearchState();
  }
});

const clearSearchState = () => {
  aiResult.value = null;
  aiSuggestions.value = [];
  loading.value = false;
};

// [UI Action] 手动清空搜索
const onClearSearch = () => {
  query.value = '';
  clearSearchState();
};

const suggestion = computed(() => store.stageInfo.isOverloaded ? null : store.getTacticalSuggestion());

const openManualAdd = () => {
  store.setModal('manualAdd', true);
};

const resetLocalState = () => {
  query.value = '';
  clearSearchState();
  activeCategory.value = 'ALL';
  resetBasket();
};

// 历史记录计算
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

// 完整过滤列表 (数据源)
const fullFilteredList = computed(() => {
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

// [Fix: Mobile Scroll] 懒加载回调 - 增强版
const onLoad = async () => {
  if (listFinished.value) return;

  // 使用 setTimeout 确保 UI 线程释放，避免渲染阻塞
  setTimeout(async () => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;

    // 边界检查
    if (start >= fullFilteredList.value.length) {
      listFinished.value = true;
      listLoading.value = false;
      return;
    }

    const newItems = fullFilteredList.value.slice(start, end);

    if (newItems.length > 0) {
      displayedList.value.push(...newItems);
      currentPage.value++;

      // [关键] 等待 DOM 更新，确保 van-list 能检测到高度变化
      await nextTick();
    }

    // 检查是否已加载所有数据
    if (displayedList.value.length >= fullFilteredList.value.length) {
      listFinished.value = true;
    }

    listLoading.value = false;
  }, 50); // 增加一点延迟，给手机端更多缓冲时间
};

// 监听数据源变化，重置懒加载状态
watch(fullFilteredList, () => {
  currentPage.value = 1;
  listFinished.value = false;
  listLoading.value = true; // 手动置为 loading，避免闪烁
  displayedList.value = [];

  // 手动触发一次加载
  onLoad();
}, { immediate: true });

const getDisplayName = (item: FoodItem) => {
  return getFoodDisplayName(item, !isPure.value, store.user.race);
};

// [UI Logic] 标签显示净化
const getDisplayTags = (item: FoodItem) => {
  const tags = new Set(item.tags || []);
  const name = item.name || '';

  // --- 实时营养计算 ---
  const c = Number(item.c) || 0;
  const f = Number(item.f) || 0;
  const p = Number(item.p) || 0;
  const grams = Number(item.grams) || 100;
  const calories = Number(item.calories) || 0;

  const densityC = c / grams;
  const densityF = f / grams;
  const densityP = p / grams;
  const densityCal = calories / grams;

  // 核心营养阈值
  if (c > 20 && densityC > 0.2) tags.add('高碳');
  if (f > 10 && densityF > 0.1) tags.add('高油');
  if (p > 15 && densityP > 0.15) tags.add('高蛋白');

  // 简易启发式
  if (name.includes('糖') || name.includes('奶茶') || name.includes('蛋糕') || name.includes('甜点') || name.includes('冰淇淋') || name.includes('巧克力')) tags.add('高糖');
  if (name.includes('咸') || name.includes('腌') || name.includes('酱')) tags.add('高盐');

  // 补位标签
  if (densityCal < 1.0 && calories < 300 && !tags.has('高油') && !tags.has('高糖')) tags.add('低卡');
  if (grams > 200) tags.add('充饥');

  // 黑名单：隐藏基础分类、物理状态、感官风味
  const HIDDEN_TAGS = [
    'DRINK', 'ALCOHOL', 'MEAT', 'RED_MEAT', 'POULTRY', 'SEAFOOD',
    'VEGETABLE', 'FRUIT', 'STAPLE', 'SNACK', 'VEG', 'OTHER',
    'STATE_DRIED', 'STATE_PRESERVED', 'STATE_COOKED', 'STATE_RAW',
    'FLAVOR_SPICY', 'FLAVOR_SOUR', 'FLAVOR_SWEET', 'FLAVOR_BITTER',
    'TEMP_COLD', 'TEMP_HOT'
  ];

  return Array.from(tags).filter(t => !HIDDEN_TAGS.includes(t));
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

const selectItem = (item: FoodItem) => {
  if (store.user.fasting?.isFasting) {
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
        store.heroStore.stopFasting();
        store.saveState();
        proceedSelection(item);
      }).catch(() => {});
      return;
    }
  }
  proceedSelection(item);
};

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
    activeCategory.value = 'ALL';
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
          <button v-if="query" @click="onClearSearch" class="mr-2 text-slate-400 hover:text-slate-600"><van-icon name="clear" /></button>
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
          <van-tab title="全部" name="ALL"></van-tab>
          <van-tab title="🕒 最近" name="RECENT"></van-tab>
          <van-tab title="❤️ 常吃" name="FAV"></van-tab>
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
                  <!-- [UI Fix] 使用增强后的 getDisplayTags(item) -->
                  <span v-for="tag in getDisplayTags(aiResult)" :key="tag" class="text-[8px] px-1 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
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
        <div v-if="!loading && fullFilteredList.length === 0 && !aiResult && aiSuggestions.length === 0" class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4 opacity-50 grayscale">🍃</div>
          <div class="text-sm font-bold text-slate-500 mb-6">暂无此分类项目</div>
          <van-button icon="edit" round color="linear-gradient(to right, #7c3aed, #6366f1)" class="shadow-lg shadow-purple-200 dark:shadow-none font-bold px-8" @click="openManualAdd">
            找不到？手动录入
          </van-button>
        </div>

        <!-- List Items (Lazy Loaded) -->
        <div class="space-y-2.5">
          <!-- [Fix: Resolve Component] 手动使用 VanList 代替 van-list -->
          <VanList
            v-model:loading="listLoading"
            :finished="listFinished"
            finished-text="没有更多了"
            @load="onLoad"
            :immediate-check="false"
          >
            <div v-for="item in displayedList" :key="item.id" @click="selectItem(item)"
                 class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer shadow-sm hover:shadow-md hover:border-purple-100 dark:hover:border-slate-600 mb-2">
              <div class="flex items-center flex-1 mr-2 overflow-hidden">
                <span class="text-3xl mr-4 w-8 text-center">{{ item.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-bold dark:text-white text-sm flex items-center">
                    <span class="truncate">{{ getDisplayName(item) }}</span>
                    <span v-if="item.isComposite" class="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center shrink-0"><i class="fas fa-layer-group mr-1"></i>套餐</span>
                  </div>
                  <div v-if="item.tips && !isPure" class="text-[9px] text-slate-400 mt-1 truncate flex items-center"><i class="fas fa-info-circle mr-1 text-slate-300"></i> {{ item.tips }}</div>

                  <!-- [UI Update] Use getDisplayTags(item) -->
                  <div class="flex gap-1 mt-1.5">
                    <span v-for="tag in getDisplayTags(item).slice(0, 3)" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
                  </div>

                  <div class="text-xs text-slate-400 mt-1 flex items-center" v-if="getDisplayTags(item).length === 0">
                    <span class="mr-3 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{{ item.unit }}</span>
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
          </VanList>
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

/* 补充新标签样式 */
.tag-FLAVOR_SPICY { @apply bg-red-50 text-red-600 border-red-200; }
.tag-FLAVOR_SOUR { @apply bg-yellow-50 text-yellow-600 border-yellow-200; }
.tag-FLAVOR_SWEET { @apply bg-pink-50 text-pink-600 border-pink-200; }
.tag-FLAVOR_BITTER { @apply bg-stone-100 text-stone-600 border-stone-200; }
.tag-TEMP_COLD { @apply bg-cyan-50 text-cyan-600 border-cyan-200; }
.tag-TEMP_HOT { @apply bg-orange-50 text-orange-600 border-orange-200; }
.tag-低卡 { @apply bg-emerald-50 text-emerald-600 border-emerald-200; }
.tag-充饥 { @apply bg-amber-50 text-amber-600 border-amber-200; }
</style>
