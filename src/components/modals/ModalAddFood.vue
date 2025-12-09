<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue';
import { useGameStore } from '@/stores/counter';
import { AiService } from '@/utils/aiService';
import { formatRpgFoodName } from '@/utils/gameUtils';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast } from 'vant';
import type { FoodItem } from '@/types';

const store = useGameStore();
const query = ref('');
const loading = ref(false);
const aiResult = ref<FoodItem | null>(null);
const aiSuggestions = ref<FoodItem[]>([]);
const activeCategory = ref('ALL');

const show = computed({
  get: () => store.modals.addFood,
  set: (val) => store.setModal('addFood', val)
});

const isBuilding = computed(() => store.temp.isBuilding);
const basket = computed(() => store.temp.basket);

const filteredList = computed(() => {
  const list = (store.foodDb && Array.isArray(store.foodDb)) ? store.foodDb : [];
  let result = list;

  if (activeCategory.value === 'FAV') {
    result = list.filter((i) => i.usageCount && i.usageCount > 0).sort((a, b) => (b.usageCount||0) - (a.usageCount||0));
  } else if (activeCategory.value !== 'ALL') {
    result = list.filter((i) => i.category === activeCategory.value);
  }

  if (query.value) {
    const q = query.value.toLowerCase();
    result = result.filter((i) =>
      (i.name && i.name.toLowerCase().includes(q)) ||
      (i.displayName && i.displayName.toLowerCase().includes(q))
    );
  }
  return result;
});

const getDisplayName = (item: FoodItem) => {
  if (item.displayName) return item.displayName;
  return formatRpgFoodName(item.name, store.user.race, item.originalName);
};

const onTextSearch = async () => {
  if (!query.value) return;
  loading.value = true;
  aiResult.value = null;
  aiSuggestions.value = [];
  try {
    const res = await AiService.estimateText(query.value, store.user.race);
    if (Array.isArray(res)) aiSuggestions.value = res;
    else if (res) aiResult.value = res as FoodItem;
  } catch (e) {
    console.error(e);
    showToast('鉴定失败');
  } finally {
    loading.value = false;
  }
};

const onImageUpload = async (file: any) => {
  loading.value = true;
  aiResult.value = null;
  try {
    const res = await AiService.identifyImage(file.content || '', store.user.race);
    if (Array.isArray(res)) aiSuggestions.value = res;
    else if (res) aiResult.value = res as FoodItem;
  } catch (e) {
    console.error(e);
    showToast('图片识别失败');
  } finally {
    loading.value = false;
  }
};

const selectItem = (item: FoodItem) => {
  if (item.isComposite && !isBuilding.value) {
    store.temp.basket = [];
    store.temp.isBuilding = true;
    store.temp.basket.push({ ...item, isComposite: false });
    showToast(`正在制作：${item.name}`);
    return;
  }

  const finalItem: FoodItem = {
    ...item,
    name: getDisplayName(item),
    originalName: item.originalName || item.name
  };

  store.temp.pendingItem = finalItem;
  store.setModal('quantity', true);
};

const commitBasket = () => {
  if (basket.value.length === 0) return;

  const total = basket.value.reduce((acc, item) => ({
    calories: acc.calories + (Number(item.calories) || 0),
    p: acc.p + (Number(item.p) || 0),
    c: acc.c + (Number(item.c) || 0),
    f: acc.f + (Number(item.f) || 0),
    grams: acc.grams + (Number(item.grams) || 0)
  }), { calories: 0, p: 0, c: 0, f: 0, grams: 0 });

  const baseItem = basket.value[0];
  let mealName = `自选${store.temp.activeMealType === 'LUNCH' ? '午餐' : '套餐'}`;

  if (baseItem && (baseItem.isComposite || baseItem.category === 'DISH')) {
    mealName = `特制·${baseItem.name}`;
  }

  if (basket.value.length > 1 && !mealName.includes('特制')) {
    mealName += ` (+${basket.value.length - 1})`;
  }

  const aggregatedTags = new Set<string>();
  basket.value.forEach(i => {
    if (i.tags) i.tags.forEach(t => aggregatedTags.add(t));
  });

  const compositeLog: FoodItem = {
    id: Date.now(),
    name: mealName,
    originalName: mealName,
    icon: baseItem?.icon || '🍱',
    ...total,
    unit: '份',
    category: 'DISH',
    isComposite: true,
    ingredients: JSON.parse(JSON.stringify(toRaw(basket.value))),
    tags: Array.from(aggregatedTags)
  };

  store.battleCommit(compositeLog);

  store.temp.basket = [];
  store.temp.isBuilding = false;
  store.setModal('addFood', false);
  showToast('料理完成！');
};

const removeFromBasket = (idx: number) => {
  store.temp.basket.splice(idx, 1);
  if (store.temp.basket.length === 0) {
    store.temp.isBuilding = false;
  }
};

watch(show, (val) => {
  if (val) {
    query.value = '';
    aiResult.value = null;
    aiSuggestions.value = [];
    loading.value = false;

    if (!store.foodDb || store.foodDb.length === 0) {
      console.warn('[ModalAddFood] FoodDB empty, forcing reload...');
      store.loadState();
    }

    if (store.temp.basket.length === 0) store.temp.isBuilding = false;
  }
});
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120]">
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b dark:border-slate-700 items-center">
        <van-icon name="arrow-down" @click="show = false" class="text-slate-400 text-lg" />
        <div class="font-bold dark:text-white text-lg flex items-center gap-2">
          添加食物
          <span v-if="isBuilding" class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full animate-pulse">
            烹饪中...
          </span>
        </div>
        <div class="w-4"></div>
      </div>

      <div class="p-4 pb-0 flex gap-2 items-center">
        <div class="flex-1 bg-white dark:bg-slate-800 rounded-full px-4 py-2 flex items-center border border-slate-200 dark:border-slate-700 shadow-sm transition-colors focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
          <van-icon name="search" class="text-slate-400 mr-2" />
          <input
            v-model="query"
            placeholder="搜索本地或大贤者鉴定..."
            class="bg-transparent w-full text-sm outline-none dark:text-white placeholder-slate-400"
            @keyup.enter="onTextSearch"
          />
          <button v-if="query" @click="query = ''" class="mr-2 text-slate-400">
            <van-icon name="clear" />
          </button>
          <button v-if="query" @click="onTextSearch" class="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full font-bold whitespace-nowrap active:scale-95 transition">
            🔮 鉴定
          </button>
        </div>
        <van-uploader :after-read="onImageUpload" capture="camera">
          <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800 active:scale-95 transition">
            <i class="fas fa-camera"></i>
          </div>
        </van-uploader>
      </div>

      <div class="px-2 mt-2">
        <van-tabs v-model:active="activeCategory" background="transparent" color="#7c3aed" shrink line-width="20px">
          <van-tab title="全部" name="ALL"></van-tab>
          <van-tab title="常吃" name="FAV"></van-tab>
          <van-tab title="主食" name="STAPLE"></van-tab>
          <van-tab title="肉类" name="MEAT"></van-tab>
          <van-tab title="菜肴" name="DISH"></van-tab>
          <van-tab title="素食" name="VEG"></van-tab>
          <van-tab title="饮品" name="DRINK"></van-tab>
        </van-tabs>
      </div>

      <div class="flex-1 overflow-y-auto px-4 mt-2 pb-24">
        <div v-if="aiResult && !loading" class="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-700 p-4 rounded-2xl mb-4 border border-purple-100 dark:border-slate-600 shadow-sm cursor-pointer active:scale-98 transition" @click="selectItem(aiResult)">
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
              <div class="text-xs text-purple-500 mt-1">{{ aiResult.tips }}</div>
            </div>
            <van-button size="small" color="#7c3aed" class="h-8 px-4 rounded-lg">{{ isBuilding ? '加入配料' : (aiResult.isComposite ? '制作' : '添加') }}</van-button>
          </div>
          <div class="flex space-x-3 text-xs text-slate-500 mt-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
            <span>🔥 ~{{ aiResult.calories }}</span><span>🥚 ~{{ aiResult.p }}</span><span>🍞 ~{{ aiResult.c }}</span><span>🥑 ~{{ aiResult.f }}</span>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10">
          <van-loading type="spinner" color="#7c3aed" vertical>正在向大贤者祈祷...</van-loading>
        </div>

        <div v-if="!loading && filteredList.length === 0" class="text-center py-10 text-slate-400">
          <div class="text-4xl mb-2">🍃</div>
          <div>暂无此分类食物</div>
          <div class="text-xs mt-2">试试搜索或切换分类</div>
        </div>

        <div class="space-y-2">
          <div v-for="item in filteredList" :key="item.id" @click="selectItem(item)"
               class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer">
            <div class="flex items-center">
              <span class="text-2xl mr-3 w-8 text-center">{{ item.icon }}</span>
              <div>
                <div class="font-bold dark:text-white text-sm flex items-center">
                  {{ getDisplayName(item) }}
                  <span v-if="item.isComposite" class="ml-2 text-[8px] bg-yellow-100 text-yellow-700 px-1 rounded border border-yellow-200">复合</span>
                </div>
                <div class="flex gap-1 mt-1" v-if="item.tags && item.tags.length">
                  <span v-for="tag in item.tags" :key="tag"
                        class="text-[8px] px-1.5 py-0.5 rounded font-bold border"
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
                <div class="text-xs text-slate-400 mt-1" v-else>
                  <span class="mr-2">{{ item.unit }}</span>
                  <span>~{{ item.calories }} kcal</span>
                </div>
              </div>
            </div>
            <van-button size="small" :color="isBuilding ? '#10b981' : (item.isComposite ? '#f59e0b' : '#7c3aed')" plain class="h-7 px-3 text-xs rounded-lg">
              <i class="fas" :class="isBuilding ? 'fa-plus' : (item.isComposite ? 'fa-utensils' : 'fa-check')"></i>
              {{ isBuilding ? '加入' : (item.isComposite ? '制作' : '添加') }}
            </van-button>
          </div>
        </div>
      </div>

      <transition name="van-slide-up">
        <div v-if="isBuilding" class="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 shadow-2xl z-20 rounded-t-2xl">
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm font-bold dark:text-white">
              <i class="fas fa-utensils mr-2 text-purple-500"></i> 当前配料 ({{ basket.length }})
            </div>
            <div class="text-xs text-slate-400" v-if="basket.length > 0">已选热量: {{ basket.reduce((a, b)=>a+(b.calories||0),0) }} kcal</div>
          </div>

          <div class="flex gap-3 overflow-x-auto pb-2 mb-2 no-scrollbar" v-if="basket.length > 0">
            <div v-for="(item, idx) in basket" :key="idx" class="relative shrink-0 w-16 flex flex-col items-center">
              <div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl border dark:border-slate-700">{{ item.icon }}</div>
              <div class="text-[9px] truncate w-full text-center mt-1 dark:text-slate-300">{{ item.name }}</div>
              <div class="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-sm" @click.stop="removeFromBasket(idx)">×</div>
            </div>
          </div>
          <div v-else class="text-center text-xs text-slate-400 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-3">
            点击上方列表添加配料
          </div>

          <div class="flex gap-3">
            <van-button plain round size="small" class="flex-1" @click="store.temp.isBuilding = false; store.temp.basket = []">取消</van-button>
            <van-button block color="linear-gradient(to right, #10b981, #059669)" round :disabled="basket.length === 0" @click="commitBasket" class="shadow-lg shadow-green-500/20 flex-[3]">
              完成料理
            </van-button>
          </div>
        </div>
      </transition>
    </div>
  </van-popup>
</template>
