<script setup lang="ts">
/**
 * ModalAddFood.vue
 * 食物添加与烹饪核心模块 - V2.5.8 Robust Edition
 * * 核心功能：
 * 1. 食物列表展示与筛选（支持搜索、分类）
 * 2. AI 图像/文本识别接口
 * 3. 复合套餐制作系统（Cooking Mode）
 * 4. 严格的逻辑校验（防止套娃、数据清洗）
 */
import { ref, computed, watch, toRaw, onUnmounted, nextTick } from 'vue';
import { useGameStore } from '@/stores/counter';
import { AiService } from '@/utils/aiService';
import { formatRpgFoodName } from '@/utils/gameUtils';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';
import type { FoodItem } from '@/types';

// --- Store & Global State ---
const store = useGameStore();

// --- Local UI State ---
const query = ref('');
const loading = ref(false);
const activeCategory = ref('ALL');

// --- AI Result State ---
const aiResult = ref<FoodItem | null>(null);
const aiSuggestions = ref<FoodItem[]>([]);

// --- Computed Visibility ---
const show = computed({
  get: () => store.modals.addFood,
  set: (val) => store.setModal('addFood', val)
});

// --- Cooking / Basket State ---
const isBuilding = computed(() => store.temp.isBuilding);
const basket = computed(() => store.temp.basket);

// --- Core Helper Functions ---

/**
 * 重置所有临时状态
 * 无论提交成功、取消还是意外关闭，都必须调用此方法清理现场
 */
const resetState = () => {
  query.value = '';
  aiResult.value = null;
  aiSuggestions.value = [];
  loading.value = false;

  // 核心清理：强制清空篮子和构建标记，防止内存泄漏或状态残留
  store.temp.basket = [];
  store.temp.isBuilding = false;
  store.temp.pendingItem = undefined;
};

/**
 * 列表过滤核心逻辑
 * 负责处理：分类筛选、热度排序、关键词模糊匹配
 */
const filteredList = computed(() => {
  // 1. 数据源获取与空值防御
  const rawList = (store.foodDb && Array.isArray(store.foodDb)) ? store.foodDb : [];
  let result = rawList;

  // 2. 分类筛选逻辑
  if (activeCategory.value === 'FAV') {
    // [常吃]：筛选使用次数 > 0 的项目，并按次数倒序排列
    result = rawList
      .filter((i) => i.usageCount && i.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } else if (activeCategory.value !== 'ALL') {
    // [普通分类]：精确匹配 category 字段
    result = rawList.filter((i) => i.category === activeCategory.value);
  }

  // 3. 搜索逻辑 (支持多字段匹配)
  if (query.value.trim()) {
    const q = query.value.toLowerCase().trim();
    result = result.filter((i) =>
      (i.name && i.name.toLowerCase().includes(q)) || // 匹配显示名
      (i.displayName && i.displayName.toLowerCase().includes(q)) || // 匹配别名
      (i.originalName && i.originalName.toLowerCase().includes(q)) || // 匹配原名
      (i.tips && i.tips.toLowerCase().includes(q)) // 匹配描述/配料表
    );
  }

  return result;
});

/**
 * 格式化显示名称
 * 为普通食物添加 RPG 前缀，增加代入感
 */
const getDisplayName = (item: FoodItem) => {
  if (item.displayName) return item.displayName;
  return formatRpgFoodName(item.name, store.user.race, item.originalName);
};

// --- AI Interaction Logic ---

const onTextSearch = async () => {
  if (!query.value.trim()) return;
  loading.value = true;
  aiResult.value = null;
  aiSuggestions.value = [];
  try {
    const res = await AiService.estimateText(query.value, store.user.race);
    if (Array.isArray(res) && res.length > 0) {
      aiSuggestions.value = res;
    } else if (res && !Array.isArray(res)) {
      aiResult.value = res as FoodItem;
    }
  } catch (e) {
    console.error('[AI Error]', e);
    showToast({ type: 'fail', message: '大贤者正忙，请稍后再试' });
  } finally {
    loading.value = false;
  }
};

const onImageUpload = async (file: any) => {
  loading.value = true;
  aiResult.value = null;
  try {
    const res = await AiService.identifyImage(file.content || '', store.user.race);
    if (Array.isArray(res) && res.length > 0) {
      aiSuggestions.value = res;
    } else if (res && !Array.isArray(res)) {
      aiResult.value = res as FoodItem;
    }
  } catch (e) {
    console.error('[AI Error]', e);
    showToast({ type: 'fail', message: '图像解析失败，请检查网络' });
  } finally {
    loading.value = false;
  }
};

// --- Selection & Interaction Logic (Critical) ---

/**
 * 核心选择逻辑
 * 严格控制：普通添加 vs 烹饪模式 vs 套娃拦截
 */
const selectItem = (item: FoodItem) => {
  // =================================================
  // 场景 A: 正在制作套餐中 (Basket is active)
  // =================================================
  if (isBuilding.value) {
    // [STRICT BLOCK] 严禁套娃！
    // 如果试图往篮子里加入一个“复合食物”或“预设套餐”
    // 直接拦截，不允许作为单品加入，防止数据结构无限嵌套
    if (item.isComposite || item.isPreset) {
      showNotify({
        type: 'danger',
        message: '🚫 制作失败：套餐内不允许包含其他套餐！\n请添加基础食材 (如: 牛肉, 蔬菜...)',
        duration: 3000
      });
      // 震动警告
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return; // 直接返回，不做任何操作
    }

    // 正常流程：加入基础食材
    const finalItem = {
      ...item,
      name: getDisplayName(item),
      originalName: item.originalName || item.name
    };
    store.temp.pendingItem = finalItem;
    store.setModal('quantity', true);
    return;
  }

  // =================================================
  // 场景 B: 普通模式 (Basket is empty)
  // =================================================

  // 检查是否为复合食物
  if (item.isComposite) {
    // B1: 已保存的预设套餐 (isPreset = true)
    // 行为：视为一个完整的单品，直接吃，不进入编辑模式
    if (item.isPreset || (item.usageCount && item.usageCount > 0)) {
      const finalItem = {
        ...item,
        name: item.name // 套餐直接用原名，不加 RPG 前缀
      };
      store.temp.pendingItem = finalItem;
      store.setModal('quantity', true);
      return;
    }

    // B2: 系统模版/未保存的复合菜 (如“炖菜”模板)
    // 行为：开启制作模式，以此为基础继续加料
    store.temp.basket = [];
    store.temp.isBuilding = true;

    // 深拷贝基础模板，移除嵌套属性，将其作为底料放入篮子
    const base = JSON.parse(JSON.stringify(item));
    delete base.ingredients; // 移除成分表，避免递归
    delete base.isComposite; // 移除复合标记

    store.temp.basket.push(base);
    showToast({ type: 'primary', message: `👨‍🍳 已开启烹饪：${item.name}\n请继续添加配料` });
    return;
  }

  // =================================================
  // 场景 C: 普通单品
  // =================================================
  const finalItem: FoodItem = {
    ...item,
    name: getDisplayName(item),
    originalName: item.originalName || item.name
  };

  store.temp.pendingItem = finalItem;
  store.setModal('quantity', true);
};

/**
 * 提交料理篮子 -> 生成套餐
 * 在此环节生成 tips，解决用户不知道套餐里有什么的问题
 */
const commitBasket = () => {
  if (basket.value.length === 0) return;

  // 1. 计算总数值
  const total = basket.value.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    p: acc.p + (Number(item.p) || 0),
    c: acc.c + (Number(item.c) || 0),
    f: acc.f + (Number(item.f) || 0),
    grams: acc.grams + (Number(item.grams) || 0)
  }), { calories: 0, p: 0, c: 0, f: 0, grams: 0 });

  // 2. 生成 RPG 命名
  const baseItem = basket.value[0];
  let mealName = `冒险者便当`;

  if (baseItem) {
    const origin = baseItem.originalName || baseItem.name.split('·').pop()?.split(' ')[0] || '食物';
    mealName = `旅人定食·${origin}`;

    // 动态后缀
    if (basket.value.length > 3) {
      mealName += `·豪华版`;
    } else if (basket.value.length > 1) {
      mealName += `·双拼`;
    }
  }

  // 3. 聚合标签 & 生成配料表 (Tips)
  const aggregatedTags = new Set<string>();
  const ingredientsNames: string[] = [];

  basket.value.forEach(i => {
    if (i.tags) i.tags.forEach(t => aggregatedTags.add(t));
    const cleanName = i.originalName || i.name.split('·').pop()?.split(' ')[0] || i.name;
    ingredientsNames.push(cleanName);
  });

  // [Fix] 关键修复：生成清晰的 Tips 字符串
  // 例如：包含: 牛肉 + 土豆 + 西兰花
  const descTips = `包含: ${ingredientsNames.slice(0, 4).join(' + ')}${ingredientsNames.length > 4 ? ' 等' : ''}`;

  // 4. 构造最终对象
  const compositeLog: FoodItem = {
    id: Date.now(), // 生成唯一 ID
    name: mealName,
    originalName: mealName,
    icon: '🍱', // 统一图标
    ...total,
    unit: '份',
    category: 'DISH',
    isComposite: true, // 标记为复合
    isPreset: true,    // [Key] 标记为预设套餐，确保下次点击直接吃
    tips: descTips,    // [Key] 写入配料详情，供 UI 展示
    ingredients: JSON.parse(JSON.stringify(toRaw(basket.value))), // 保存完整配料表
    tags: Array.from(aggregatedTags)
  };

  // 5. 提交战斗
  store.battleCommit(compositeLog);

  // 6. 重置状态
  resetState();
  store.setModal('addFood', false);
  showNotify({ type: 'success', message: '🍱 套餐制作完成！已存入食谱，下次可直接选用。' });
};

const removeFromBasket = (idx: number) => {
  store.temp.basket.splice(idx, 1);
  if (store.temp.basket.length === 0) {
    store.temp.isBuilding = false;
  }
};

// --- Lifecycle & Watchers ---

watch(show, (val) => {
  if (val) {
    query.value = '';
    // 兜底加载
    if (!store.foodDb || store.foodDb.length === 0) {
      store.loadState();
    }
  } else {
    // 关闭时清理，除非是跳转去 Quantity 页面
    if (!store.modals.quantity && !store.temp.pendingItem) {
      resetState();
    }
  }
});

onUnmounted(() => {
  resetState();
});
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: '90%' }"
    class="dark:bg-slate-900 flex flex-col"
    safe-area-inset-bottom
  >
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120] relative">

      <!-- Top Header -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-700 items-center shadow-sm">
        <van-icon name="arrow-down" @click="show = false" class="text-slate-400 text-lg active:scale-90 transition" />

        <div class="font-bold dark:text-white text-lg flex items-center gap-2">
          <span>添加补给</span>
          <span v-if="isBuilding" class="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full animate-pulse border border-purple-200">
            <i class="fas fa-fire-alt mr-1"></i>烹饪模式
          </span>
        </div>

        <!-- 清空按钮 -->
        <div v-if="isBuilding" @click="resetState" class="text-xs text-red-500 font-bold cursor-pointer active:opacity-70 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded">
          <i class="fas fa-trash-alt mr-1"></i>清空
        </div>
        <div v-else class="w-8"></div>
      </div>

      <!-- Search & AI Tools -->
      <div class="p-4 pb-0 flex gap-2 items-center bg-white dark:bg-slate-800 pt-2">
        <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full px-4 py-2 flex items-center border border-transparent focus-within:border-purple-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
          <van-icon name="search" class="text-slate-400 mr-2" />
          <input
            v-model="query"
            placeholder="搜索 / 描述食物 (AI)"
            class="bg-transparent w-full text-sm outline-none dark:text-white placeholder-slate-400"
            @keyup.enter="onTextSearch"
          />
          <button v-if="query" @click="query = ''" class="mr-2 text-slate-400 hover:text-slate-600">
            <van-icon name="clear" />
          </button>
          <button v-if="query" @click="onTextSearch" class="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full font-bold whitespace-nowrap active:scale-95 transition flex items-center">
            <i class="fas fa-magic mr-1"></i>鉴定
          </button>
        </div>

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

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-10 space-y-3">
          <van-loading type="spinner" color="#7c3aed" vertical>
            <span class="text-xs text-purple-500 mt-2">正在向大贤者祈祷...</span>
          </van-loading>
        </div>

        <!-- AI Result Card -->
        <div v-if="aiResult && !loading" class="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-700 p-4 rounded-2xl mb-4 border border-purple-100 dark:border-slate-600 shadow-sm cursor-pointer active:scale-98 transition relative overflow-hidden group" @click="selectItem(aiResult)">
          <div class="absolute top-0 right-0 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">AI 鉴定结果</div>
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-lg dark:text-white flex items-center gap-2">
                {{ aiResult.name }}
                <div v-if="aiResult.tags" class="flex gap-1">
                  <span v-for="tag in aiResult.tags" :key="tag" class="text-[8px] px-1 rounded font-bold border"
                        :class="[
                          tag === '高糖' ? 'bg-red-50 text-red-700 border-red-100' :
                          tag === '高油' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          tag === '高蛋白' ? 'bg-green-50 text-green-700 border-green-100' :
                          tag === '纯净' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        ]">
                    {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-purple-500 mt-1 flex items-center">
                <i class="fas fa-sparkles mr-1"></i> {{ aiResult.tips || '未知的神秘食物' }}
              </div>
            </div>
            <van-button size="small" color="#7c3aed" class="h-8 px-4 rounded-lg font-bold shadow-md shadow-purple-200 dark:shadow-none">
              {{ isBuilding ? '加入配料' : (aiResult.isComposite ? '制作套餐' : '添加') }}
            </van-button>
          </div>
          <div class="flex space-x-3 text-xs text-slate-500 mt-3 bg-white/60 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm">
            <span>🔥 ~{{ aiResult.calories }}</span>
            <span>🥚 ~{{ aiResult.p }}</span>
            <span>🍞 ~{{ aiResult.c }}</span>
            <span>🥑 ~{{ aiResult.f }}</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && filteredList.length === 0" class="text-center py-16 text-slate-400">
          <div class="text-5xl mb-4 opacity-50 grayscale">🍃</div>
          <div class="text-sm font-bold text-slate-500">暂无此分类食物</div>
          <div class="text-xs mt-2 opacity-70">试试搜索或切换分类，或者拍个照？</div>
        </div>

        <!-- Food List Items -->
        <div class="space-y-2.5">
          <div v-for="item in filteredList" :key="item.id" @click="selectItem(item)"
               class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer shadow-sm hover:shadow-md hover:border-purple-100 dark:hover:border-slate-600">

            <div class="flex items-center flex-1 mr-2 overflow-hidden">
              <span class="text-3xl mr-4 w-8 text-center">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-bold dark:text-white text-sm flex items-center">
                  <span class="truncate">{{ getDisplayName(item) }}</span>
                  <span v-if="item.isComposite" class="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center shrink-0">
                    <i class="fas fa-layer-group mr-1"></i>套餐
                  </span>
                </div>

                <!-- [Fix] 在列表里直接显示 Tips (配料表)，解决用户不知道里面有啥的问题 -->
                <div v-if="item.tips" class="text-[9px] text-slate-400 mt-1 truncate flex items-center">
                  <i class="fas fa-info-circle mr-1 text-slate-300"></i> {{ item.tips }}
                </div>

                <!-- Tags View -->
                <div class="flex gap-1 mt-1.5" v-if="item.tags && item.tags.length">
                  <span v-for="tag in item.tags.slice(0, 3)" :key="tag"
                        class="text-[9px] px-1.5 py-0.5 rounded font-bold border"
                        :class="[
                          tag === '高糖' ? 'bg-red-50 text-red-700 border-red-100' :
                          tag === '高油' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          tag === '高蛋白' ? 'bg-green-50 text-green-700 border-green-100' :
                          tag === '纯净' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        ]">
                    {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
                  </span>
                </div>

                <!-- Details View -->
                <div class="text-xs text-slate-400 mt-1 flex items-center" v-if="!item.tags || item.tags.length === 0">
                  <span class="mr-3 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{{ item.unit }}</span>
                  <span class="text-orange-400 font-mono">~{{ item.calories }} kcal</span>
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="flex items-center shrink-0">
              <van-button
                size="small"
                :color="isBuilding ? '#10b981' : (item.isComposite && !item.isPreset ? '#f59e0b' : '#7c3aed')"
                plain
                class="h-8 px-3 text-xs rounded-xl font-bold border-2"
              >
                <template v-if="isBuilding">
                  <i class="fas fa-plus mr-1"></i>加入
                </template>
                <template v-else-if="item.isComposite && !item.isPreset">
                  <i class="fas fa-utensils mr-1"></i>制作
                </template>
                <template v-else>
                  <i class="fas fa-check mr-1"></i>记录
                </template>
              </van-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Basket Drawer (Cooking Mode) -->
      <transition name="van-slide-up">
        <div v-if="isBuilding" class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 rounded-t-3xl backdrop-blur-md">

          <div class="flex justify-between items-center mb-3">
            <div class="text-sm font-bold dark:text-white flex items-center">
              <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-2 animate-bounce">
                <i class="fas fa-utensils"></i>
              </div>
              <span>当前配料 ({{ basket.length }})</span>
            </div>
            <div class="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              已选: <span class="text-purple-600 font-bold">{{ basket.reduce((a, b)=>a+(b.calories||0),0) }}</span> kcal
            </div>
          </div>

          <!-- Ingredients Scroll -->
          <div class="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar px-1" v-if="basket.length > 0">
            <div v-for="(item, idx) in basket" :key="idx" class="relative shrink-0 w-16 flex flex-col items-center group">
              <div class="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 dark:border-slate-700 shadow-sm group-hover:border-red-200 transition-colors">
                {{ item.icon }}
              </div>
              <div class="text-[9px] truncate w-full text-center mt-1 dark:text-slate-300 font-medium">{{ item.name }}</div>

              <!-- Remove Button -->
              <div class="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-md transform scale-0 group-hover:scale-100 transition-transform" @click.stop="removeFromBasket(idx)">
                <i class="fas fa-times"></i>
              </div>
            </div>
          </div>

          <!-- Empty Basket Hint -->
          <div v-else class="text-center text-xs text-slate-400 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-4 bg-slate-50/50">
            <i class="fas fa-arrow-up animate-bounce mb-2 block"></i>
            点击上方列表添加食材，组合出你的专属套餐
          </div>

          <!-- Bottom Actions -->
          <div class="flex gap-3">
            <van-button plain round size="small" class="flex-1 border-slate-300 text-slate-500" @click="resetState">
              取消烹饪
            </van-button>
            <van-button
              block
              color="linear-gradient(to right, #10b981, #059669)"
              round
              :disabled="basket.length === 0"
              @click="commitBasket"
              class="shadow-lg shadow-green-500/30 flex-[3] font-bold"
            >
              <i class="fas fa-check-circle mr-2"></i>完成料理
            </van-button>
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
</style>
