<script setup lang="ts">
/**
 * ModalAddFood.vue
 * 专注食物录入 (单一职责)
 * - V7.8 Update:
 * 1. [Fix] 彻底修复补水记录出现在历史列表的问题 (检查 logType)
 * 2. [Filter] 增强关键词过滤，屏蔽各类基础水
 */
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCooking } from '@/composables/useCooking';
import { AiService } from '@/utils/aiService';
import { getFoodDisplayName } from '@/utils/foodNameService';
// [Import] 导入图标匹配逻辑、标签推断，移除 getIconColorClass
import { assignIcon, inferTags, isValidIcon } from '@/utils/foodDataMapper';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast, showNotify, showConfirmDialog, List as VanList } from 'vant';
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
const { isBuilding, basket, resetBasket, removeFromBasket, commitBasket } = useCooking(() => {
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
  if (newVal && newVal.trim().length > 0) {
    if (activeCategory.value !== 'ALL') {
      activeCategory.value = 'ALL';
    }
  }
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

// ==========================================
// [Core Logic] Symbol 图标显示逻辑
// ==========================================
const getIconDisplay = (item: FoodItem | null) => {
  if (!item) return { isSymbol: false, content: '' };

  let iconRaw = item.icon || '';

  // 1. 脏数据清洗: 移除可能存在的 HTML 标签
  if (typeof iconRaw === 'string' && iconRaw.includes('<')) {
    iconRaw = iconRaw.replace(/<[^>]*>?/gm, '');
  }

  // 2. 如果数据本身包含 icon- (例如 icon-apple)，提取为 ID
  if (iconRaw.includes('icon-')) {
    const match = iconRaw.match(/icon-[a-zA-Z0-9-_]+/);
    if (match) {
      const extractedId = match[0];
      // [FIX] 查表验证：确保图标真的存在
      if (isValidIcon(extractedId)) {
        return { isSymbol: true, content: extractedId };
      }
    }
  }

  // 3. 运行时热修复 (Hot-fix):
  const effectiveTags = (item.tags && item.tags.length > 0)
    ? item.tags
    : inferTags(item.name || '');

  const assigned = assignIcon(item.name || '', effectiveTags);

  if (assigned) {
    return { isSymbol: true, content: assigned };
  }

  return { isSymbol: false, content: iconRaw };
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
  for (const [, logs] of logEntries.slice(0, 7)) {
    allLogs.push(...logs);
  }
  const uniqueMap = new Map<string, FoodLog>();

  allLogs.forEach(log => {
    // [CRITICAL FIX] 同时检查 mealType 和 logType
    // 之前只检查 mealType，导致新的补水记录(只有logType='HYDRATION')没被过滤
    if (
      log.mealType === 'HYDRATION' ||
      (log as any).logType === 'HYDRATION' ||
      log.mealType === 'EXERCISE' ||
      (log as any).logType === 'EXERCISE'
    ) return;

    // [Fix] 增加针对系统自动生成名称的过滤 (解决“净化之泉”出现在历史列表的问题)
    const name = (log.name || '').trim();
    if (name === '净化之泉' || name === '补水') return;

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // [PM Request] 强力过滤：隐藏所有基础水类目
  // 避免与快捷补水功能重复
  result = result.filter(item => {
    const n = (item.name || '').toLowerCase();
    const t = (item.tags || []).join('');

    // 黑名单关键词
    if (
      n === 'water' ||
      n === '水' ||
      n === '纯净水' ||
      n === '矿泉水' ||
      n === '白开水' ||
      n === '温开水' ||
      n === '凉白开' ||
      n === '净化之泉' || // [Fix] 过滤 RPG 模式下的水
      n === '补水'       // [Fix] 过滤 纯净 模式下的水
    ) return false;

    // 如果名字包含水，且热量为0，且没有味道标签，大概率是纯水
    if (n.includes('水') && (!item.calories || item.calories <= 1)) {
      if (!t.includes('甜') && !t.includes('味') && !n.includes('果') && !n.includes('茶') && !n.includes('咖')) {
        return false;
      }
    }

    return true;
  });

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

// 懒加载回调
const onLoad = async () => {
  if (listFinished.value) return;

  setTimeout(async () => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;

    if (start >= fullFilteredList.value.length) {
      listFinished.value = true;
      listLoading.value = false;
      return;
    }

    const newItems = fullFilteredList.value.slice(start, end);

    if (newItems.length > 0) {
      displayedList.value.push(...newItems);
      currentPage.value++;
      await nextTick();
    }

    if (displayedList.value.length >= fullFilteredList.value.length) {
      listFinished.value = true;
    }

    listLoading.value = false;
  }, 50);
};

watch(fullFilteredList, () => {
  currentPage.value = 1;
  listFinished.value = false;
  listLoading.value = true;
  displayedList.value = [];
  onLoad();
}, { immediate: true });

const getDisplayName = (item: FoodItem) => {
  return getFoodDisplayName(item, !isPure.value, store.user.race);
};

// [Fix] 标签显示净化 - 兼容旧数据字段
const getDisplayTags = (item: FoodItem) => {
  const tags = new Set(item.tags || []);
  const name = item.name || '';

  // 优先读 c/f/p，如果为 0 或 undefined，尝试读 carbs/fat/protein
  const c = Number(item.c ?? item.carbs ?? 0);
  const f = Number(item.f ?? item.fat ?? 0);
  const p = Number(item.p ?? item.protein ?? 0);

  const grams = Number(item.grams) || 100;
  const calories = Number(item.calories) || 0;

  const densityC = c / grams;
  const densityF = f / grams;
  const densityP = p / grams;
  const densityCal = calories / grams;

  if (c > 20 && densityC > 0.2) tags.add('高碳');
  if (f > 10 && densityF > 0.1) tags.add('高油');
  if (p > 15 && densityP > 0.15) tags.add('高蛋白');

  if (name.includes('糖') || name.includes('奶茶') || name.includes('蛋糕') || name.includes('甜点') || name.includes('冰淇淋') || name.includes('巧克力')) tags.add('高糖');
  if (name.includes('咸') || name.includes('腌') || name.includes('酱')) tags.add('高盐');

  if (densityCal < 1.0 && calories < 300 && !tags.has('高油') && !tags.has('高糖')) tags.add('低卡');
  if (grams > 200) tags.add('充饥');

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
  } catch {
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
  } catch {
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
        confirmButtonColor: '#f43f5e',
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
  return { height: '90%', borderRadius: '16px 16px 0 0' };
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
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120] relative text-slate-700 dark:text-slate-200">

      <!-- Top Header: 清除紫色边框和背景 -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700 items-center shadow-sm">
        <div v-if="isPure" @click="show = false" class="text-slate-500 flex items-center cursor-pointer hover:text-slate-800">
          <van-icon name="arrow-left" class="mr-1" /> 返回
        </div>
        <van-icon v-else name="arrow-down" @click="show = false" class="text-slate-400 text-lg active:scale-90 transition" />

        <div class="font-bold dark:text-white text-lg flex items-center gap-2">
          <span>{{ isPure ? '饮食记录' : '添加补给' }}</span>
          <!-- 烹饪模式徽章：从紫色改为橙色 (Fire/Energy) -->
          <span v-if="isBuilding" class="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
            <i class="fas fa-fire-alt mr-1"></i>烹饪模式
          </span>
        </div>

        <div v-if="isBuilding" @click="resetLocalState" class="text-xs text-rose-500 font-bold cursor-pointer active:opacity-70 px-2 py-1 bg-rose-50 dark:bg-rose-900/20 rounded flex items-center">
          <i class="fas fa-trash-alt mr-1"></i>清空
        </div>
        <div v-else class="w-8"></div>
      </div>

      <!-- 战术情报 (Pure模式不显示): 颜色微调为 Sky/Slate -->
      <div v-if="suggestion && !isPure"
           class="mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-3 border shadow-sm bg-white dark:bg-slate-800 border-sky-100 dark:border-slate-700 relative overflow-hidden">

        <div class="text-2xl z-10 flex items-center justify-center w-8 text-sky-500">
          <i v-if="suggestion.icon.includes('icon')" :class="[suggestion.icon, 'text-4xl']"></i>
          <span v-else class="text-4xl">{{ suggestion.icon }}</span>
        </div>

        <div class="flex-1 z-10 ml-2">
          <div class="text-[10px] text-sky-500 font-bold uppercase tracking-wider flex items-center mb-0.5">
            战术顾问 <span class="ml-1 text-[8px] px-1 bg-sky-100 rounded text-sky-600">INTEL</span>
          </div>
          <div class="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{{ suggestion.text }}</div>
        </div>
      </div>

      <!-- Search & AI Tools: 输入框改为 Emerald 聚焦色 -->
      <div class="p-4 pb-0 flex gap-2 items-center bg-white dark:bg-slate-800 pt-3">
        <div class="flex-1 bg-slate-100 dark:bg-slate-700/50 rounded-full px-4 py-2 flex items-center border border-transparent focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          <van-icon name="search" class="text-slate-400 mr-2" />
          <input v-model="query" :placeholder="isPure ? '搜索食物' : '搜索 / 描述食物 (AI)'" class="bg-transparent w-full text-sm outline-none dark:text-white placeholder-slate-400" @keyup.enter="onTextSearch" />
          <button v-if="query" @click="onClearSearch" class="mr-2 text-slate-400 hover:text-slate-600"><van-icon name="clear" /></button>

          <!-- AI按钮：Emerald -->
          <button v-if="query" @click="onTextSearch" class="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-bold whitespace-nowrap active:scale-95 transition flex items-center">
            <i class="fas fa-magic mr-1"></i>{{ isPure ? 'AI识别' : '鉴定' }}
          </button>
        </div>

        <button @click="openManualAdd" class="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 active:bg-slate-200 transition">
          <i class="fas fa-pen-nib"></i>
        </button>

        <van-uploader :after-read="onImageUpload" capture="camera">
          <div class="w-10 h-10 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600 active:scale-95 active:bg-slate-200 transition">
            <i class="fas fa-camera"></i>
          </div>
        </van-uploader>
      </div>

      <!-- Categories Tabs: 选中色改为 Emerald -->
      <div class="px-2 mt-2 bg-white dark:bg-slate-800 pb-2 border-b border-slate-100 dark:border-slate-700">
        <van-tabs v-model:active="activeCategory" background="transparent" color="#10b981" title-active-color="#10b981" shrink line-width="20px">
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
          <van-loading type="spinner" color="#10b981" vertical>
            <span class="text-xs text-emerald-500 mt-2">{{ isPure ? '正在识别...' : loadingText }}</span>
          </van-loading>
        </div>

        <!-- AI Result: 去除 Gradient，使用扁平边框风格 -->
        <div v-if="aiResult && !loading" class="bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 border border-emerald-500 dark:border-emerald-700 shadow-md cursor-pointer active:scale-98 transition relative overflow-hidden group" @click="selectItem(aiResult)">
          <div class="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">AI 结果</div>
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-lg dark:text-white flex items-center gap-2">
                {{ isPure ? (aiResult.originalName || aiResult.name) : aiResult.name }}
                <div v-if="aiResult.tags" class="flex gap-1">
                  <span v-for="tag in getDisplayTags(aiResult)" :key="tag" class="text-[8px] px-1 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
                </div>
              </div>

              <div v-if="!isPure" class="text-xs text-emerald-600 mt-1 flex items-center"><i class="fas fa-sparkles mr-1"></i> {{ aiResult.tips || '未知的食物' }}</div>
              <div class="text-xs text-slate-500 mt-1">
                热量: {{ aiResult.calories }} kcal
              </div>
            </div>
            <van-button size="small" color="#10b981" class="h-8 px-4 rounded-lg font-bold">
              {{ isBuilding ? '加入' : (aiResult.isComposite ? '制作' : '添加') }}
            </van-button>
          </div>
        </div>

        <!-- Suggestions List -->
        <div v-if="aiSuggestions.length > 0 && !loading" class="mb-4">
          <div class="text-xs text-slate-400 mb-2 font-bold tracking-wider">AI 建议</div>
          <div v-for="sugg in aiSuggestions" :key="sugg.name" @click="selectItem(sugg)"
               class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl mb-2 flex justify-between items-center shadow-sm hover:border-emerald-200 transition-colors">
            <div class="flex items-center gap-3">
              <!-- AI 建议列表图标 -->
              <span class="flex items-center justify-center w-10 text-slate-600">
                <template v-if="getIconDisplay(sugg).isSymbol">
                   <svg class="icon text-3xl" aria-hidden="true">
                      <use :xlink:href="'#' + getIconDisplay(sugg).content"></use>
                   </svg>
                </template>
                <template v-else>
                   <span class="text-3xl">{{ getIconDisplay(sugg).content }}</span>
                </template>
              </span>
              <div>
                <div class="font-bold text-sm dark:text-white">{{ sugg.name }}</div>
                <div class="text-[10px] text-slate-500">{{ sugg.calories }} kcal</div>
              </div>
            </div>
            <van-icon name="plus" class="text-emerald-500 bg-emerald-50 rounded-full p-1" />
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && fullFilteredList.length === 0 && !aiResult && aiSuggestions.length === 0" class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4 opacity-30 grayscale">🍃</div>
          <div class="text-sm font-bold text-slate-500 mb-6">暂无此分类项目</div>
          <van-button icon="edit" round color="#10b981" class="font-bold px-8 shadow-sm" @click="openManualAdd">
            找不到？手动录入
          </van-button>
        </div>

        <!-- List Items (Lazy Loaded) -->
        <div class="space-y-2.5">
          <VanList
            v-model:loading="listLoading"
            :finished="listFinished"
            finished-text="没有更多了"
            @load="onLoad"
            :immediate-check="false"
          >
            <div v-for="item in displayedList" :key="item.id" @click="selectItem(item)"
                 class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer shadow-sm mb-2 group">
              <div class="flex items-center flex-1 mr-2 overflow-hidden">
                <!-- [MODIFIED] 主列表图标：Symbol 模式 -->
                <div class="mr-3 w-16 h-16 flex justify-center items-center shrink-0 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-600">
                  <template v-if="getIconDisplay(item).isSymbol">
                    <svg class="icon text-4xl" aria-hidden="true">
                      <use :xlink:href="'#' + getIconDisplay(item).content"></use>
                    </svg>
                  </template>
                  <template v-else>
                    <span class="text-4xl">{{ getIconDisplay(item).content }}</span>
                  </template>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="font-bold dark:text-white text-sm flex items-center mb-1">
                    <span class="truncate">{{ getDisplayName(item) }}</span>
                    <span v-if="item.isComposite" class="ml-2 text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 flex items-center shrink-0"><i class="fas fa-layer-group mr-1"></i>套餐</span>
                  </div>

                  <div v-if="item.tips && !isPure" class="text-[9px] text-slate-400 mb-1.5 truncate flex items-center"><i class="fas fa-info-circle mr-1 text-slate-300"></i> {{ item.tips }}</div>

                  <div class="flex gap-1 mb-1">
                    <span v-for="tag in getDisplayTags(item).slice(0, 3)" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded font-bold border tag-badge" :class="'tag-'+tag">{{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}</span>
                  </div>

                  <div class="text-xs text-slate-400 flex items-center" v-if="getDisplayTags(item).length === 0">
                    <span class="mr-3 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{{ item.unit }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center shrink-0">
                <!-- 列表按钮：更细的边框，更轻的视觉重量 -->
                <van-button size="small" :color="isBuilding ? '#10b981' : (item.isComposite && !item.isPreset ? '#f59e0b' : '#10b981')" plain class="h-8 px-3 text-xs rounded-lg font-bold border border-opacity-50">
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
        <div v-if="isBuilding" class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20 rounded-t-2xl backdrop-blur-md pb-safe">
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm font-bold dark:text-white flex items-center">
              <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-2"><i class="fas fa-utensils"></i></div>
              <span>当前配料 ({{ basket.length }})</span>
            </div>
            <div class="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              已选: <span class="text-orange-500 font-bold">{{ basket.reduce((a, b)=>a+(Number(b.calories)||0),0) }}</span> kcal
            </div>
          </div>
          <div class="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar px-1" v-if="basket.length > 0">
            <div v-for="(item, idx) in basket" :key="idx" class="relative shrink-0 w-16 flex flex-col items-center group">
              <!-- [MODIFIED] 购物篮 -->
              <div class="w-14 h-14 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm group-hover:border-rose-200 transition-colors">
                <template v-if="getIconDisplay(item).isSymbol">
                  <svg class="icon text-4xl" aria-hidden="true">
                    <use :xlink:href="'#' + getIconDisplay(item).content"></use>
                  </svg>
                </template>
                <template v-else>
                  <span class="text-4xl">{{ getIconDisplay(item).content }}</span>
                </template>
              </div>

              <div class="text-[9px] truncate w-full text-center mt-1 dark:text-slate-300 font-medium">{{ item.name }}</div>
              <div class="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-md transform scale-0 group-hover:scale-100 transition-transform" @click.stop="removeFromBasket(idx)"><i class="fas fa-times"></i></div>
            </div>
          </div>
          <div v-else class="text-center text-xs text-slate-400 py-6 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl mb-4">
            <i class="fas fa-arrow-up animate-bounce mb-2 block"></i> 点击上方列表添加食材
          </div>
          <div class="flex gap-3">
            <van-button plain round size="small" class="flex-1 border-slate-300 text-slate-500" @click="resetLocalState">取消</van-button>
            <van-button block color="#10b981" round :disabled="basket.length === 0" @click="commitBasket" class="flex-[3] font-bold shadow-sm"><i class="fas fa-check-circle mr-2"></i>完成料理</van-button>
          </div>
        </div>
      </transition>
    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }

/* Tag styles Refined - More Pastel/Organic */
.tag-badge { @apply font-bold rounded mr-1; }
.tag-高糖 { @apply bg-rose-50 text-rose-600 border-rose-100; }
.tag-高油 { @apply bg-orange-50 text-orange-600 border-orange-100; }
.tag-高盐 { @apply bg-slate-100 text-slate-600 border-slate-200; }
.tag-高碳 { @apply bg-yellow-50 text-yellow-600 border-yellow-100; }
.tag-高蛋白 { @apply bg-emerald-50 text-emerald-600 border-emerald-100; }
.tag-纯净 { @apply bg-sky-50 text-sky-600 border-sky-100; }
.tag-均衡 { @apply bg-indigo-50 text-indigo-600 border-indigo-100; }
.tag-低卡 { @apply bg-teal-50 text-teal-600 border-teal-100; }
.tag-充饥 { @apply bg-amber-50 text-amber-600 border-amber-100; }

.tag-FLAVOR_SPICY { @apply bg-red-50 text-red-600 border-red-100; }
.tag-FLAVOR_SOUR { @apply bg-lime-50 text-lime-600 border-lime-100; }
.tag-FLAVOR_SWEET { @apply bg-pink-50 text-pink-600 border-pink-100; }
.tag-FLAVOR_BITTER { @apply bg-stone-50 text-stone-600 border-stone-100; }
.tag-TEMP_COLD { @apply bg-cyan-50 text-cyan-600 border-cyan-100; }
.tag-TEMP_HOT { @apply bg-orange-50 text-orange-600 border-orange-100; }


/* Symbol Icon Style */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
