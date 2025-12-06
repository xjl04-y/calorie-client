<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { AiService } from '@/utils/aiService.ts';
import { TAG_DEFS } from '@/constants/gameData';
import { showToast } from 'vant';

const store = useGameStore();
const query = ref('');
const loading = ref(false);
const aiResult = ref<any>(null);
const aiSuggestions = ref<any[]>([]); // 存储多个搜索结果
const activeCategory = ref('ALL');

const show = computed({
  get: () => store.modals.addFood,
  set: (val) => store.setModal('addFood', val)
});

// 配餐模式开关
const isBuilding = computed({
  get: () => store.temp.isBuilding,
  set: (val) => store.temp.isBuilding = val
});

const basket = computed(() => store.temp.basket);

// 计算显示的列表 (优先本地搜索)
const filteredList = computed(() => {
  // 确保 store.foodDb 是数组
  let list = Array.isArray(store.foodDb) ? store.foodDb : [];

  if (activeCategory.value === 'FAV') {
    list = list.filter(i => i.usageCount && i.usageCount > 0).sort((a,b) => (b.usageCount||0) - (a.usageCount||0));
  } else if (activeCategory.value !== 'ALL') {
    list = list.filter(i => i.category === activeCategory.value);
  }

  if (query.value) {
    const q = query.value.toLowerCase();
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.displayName && i.displayName.toLowerCase().includes(q))
    );
  }

  return list;
});

// 文本搜索 (AI)
const onTextSearch = async () => {
  if (!query.value) return;
  loading.value = true;
  aiResult.value = null;
  aiSuggestions.value = [];

  const res = await AiService.estimateText(query.value, store.user.race);

  if (Array.isArray(res)) {
    // 如果返回数组，说明是联想结果
    aiSuggestions.value = res;
  } else if (res) {
    // 单个精准结果
    aiResult.value = res;
  }

  loading.value = false;
};

const onImageUpload = async (file: any) => {
  loading.value = true;
  aiResult.value = null;
  const res = await AiService.identifyImage(file.content || '', store.user.race);
  if (Array.isArray(res)) aiSuggestions.value = res;
  else if (res) aiResult.value = res;
  loading.value = false;
};

const selectItem = (item: any) => {
  store.temp.pendingItem = item;
  store.setModal('quantity', true);
};

// 提交整个餐盘 (配餐模式)
const commitBasket = () => {
  if (basket.value.length === 0) return;

  // 计算总营养
  const total = basket.value.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    p: acc.p + item.p,
    c: acc.c + item.c,
    f: acc.f + item.f,
    grams: acc.grams + item.grams
  }), { calories: 0, p: 0, c: 0, f: 0, grams: 0 });

  const mealName = `自选${store.temp.activeMealType === 'LUNCH' ? '午餐' : store.temp.activeMealType === 'DINNER' ? '晚餐' : '套餐'}`;

  const compositeLog = {
    id: Date.now(),
    name: mealName,
    icon: '🍱',
    ...total,
    unit: '份',
    mealType: store.temp.activeMealType,
    isComposite: true, // 标记为复合食物
    ingredients: [...basket.value], // 保存成分供详情查看
    tags: ['CLEAN'] // 默认标签，实际可根据成分推算
  };

  store.battleCommit(compositeLog);
  store.temp.basket = [];
  isBuilding.value = false;
  store.setModal('addFood', false);
  showToast('丰盛的套餐制作完成！经验大幅增加！');
};

const removeFromBasket = (idx: number) => {
  store.temp.basket.splice(idx, 1);
};

// 监听弹窗关闭，重置
watch(show, (val) => {
  if (val) {
    query.value = '';
    aiResult.value = null;
    aiSuggestions.value = [];
    loading.value = false;
    // 配餐模式保留，方便用户继续
  }
});

watch(query, (newVal) => {
  if (!newVal || newVal.trim() === '') {
    aiResult.value = null;
    aiSuggestions.value = [];
    loading.value = false;
  }
});
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120]">
      <!-- 头部 -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b dark:border-slate-700 items-center">
        <van-icon name="arrow-down" @click="show = false" class="text-slate-400 text-lg" />
        <div class="font-bold dark:text-white text-lg flex items-center gap-2">
          添加食物
          <!-- 配餐模式开关 -->
          <div class="flex items-center bg-slate-100 dark:bg-slate-700 rounded-full p-0.5 ml-2 cursor-pointer" @click="isBuilding = !isBuilding">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all" :class="!isBuilding ? 'bg-white shadow text-slate-800' : 'text-slate-400'">单品</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center" :class="isBuilding ? 'bg-purple-500 shadow text-white' : 'text-slate-400'">
              <i class="fas fa-layer-group mr-1"></i> 配餐
            </span>
          </div>
        </div>
        <div class="w-4"></div>
      </div>

      <!-- 搜索区 -->
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
        <!-- 拍照上传 -->
        <van-uploader :after-read="onImageUpload" capture="camera">
          <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center border border-purple-200 dark:border-purple-800 active:scale-95 transition">
            <i class="fas fa-camera"></i>
          </div>
        </van-uploader>
      </div>

      <!-- 分类 Tab -->
      <div class="px-2 mt-2">
        <van-tabs v-model:active="activeCategory" background="transparent" color="#7c3aed" shrink line-width="20px">
          <van-tab title="全部" name="ALL"></van-tab>
          <van-tab title="常吃" name="FAV"></van-tab>
          <van-tab title="干粮" name="STAPLE"></van-tab>
          <van-tab title="肉类" name="MEAT"></van-tab>
          <van-tab title="素食" name="VEG"></van-tab>
          <van-tab title="饮品" name="DRINK"></van-tab>
        </van-tabs>
      </div>

      <!-- 内容列表区 -->
      <div class="flex-1 overflow-y-auto px-4 mt-2 pb-24"> <!-- 底部留白给餐篮 -->
        <!-- Loading -->
        <div v-if="loading" class="py-10 text-center">
          <div class="text-4xl animate-bounce mb-2">🔮</div>
          <p class="text-xs text-purple-500 font-bold">大贤者正在翻阅古籍...</p>
        </div>

        <!-- 1. AI 鉴定结果 (单条) -->
        <div v-if="aiResult && !loading" class="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-700 p-4 rounded-2xl mb-4 border border-purple-100 dark:border-slate-600 shadow-sm cursor-pointer active:scale-98 transition" @click="selectItem(aiResult)">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-lg dark:text-white flex items-center gap-2">
                {{ aiResult.name }}
                <div v-if="aiResult.tags" class="flex gap-1">
                  <span v-for="tag in aiResult.tags" :key="tag" class="text-[8px] px-1 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-purple-500 mt-1">{{ aiResult.tips }}</div>
            </div>
            <van-button size="small" color="#7c3aed" class="h-8 px-4 rounded-lg">{{ isBuilding ? '加入餐盘' : '添加' }}</van-button>
          </div>
          <div class="flex space-x-3 text-xs text-slate-500 mt-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
            <span>🔥 ~{{ aiResult.cals }}</span><span>🥚 ~{{ aiResult.p }}</span><span>🍞 ~{{ aiResult.c }}</span><span>🥑 ~{{ aiResult.f }}</span>
          </div>
        </div>

        <!-- 2. AI 联想建议列表 (多条) -->
        <div v-if="aiSuggestions.length > 0 && !loading" class="mb-4 space-y-2">
          <div class="text-xs text-slate-400 px-1 font-bold flex justify-between items-center">
            <span>🔮 大贤者的联想</span>
            <span class="text-[10px] font-normal cursor-pointer" @click="aiSuggestions = []">清空</span>
          </div>
          <div v-for="item in aiSuggestions" :key="item.name" @click="selectItem(item)"
               class="flex justify-between p-3 bg-purple-50 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900/50 rounded-xl active:scale-98 transition cursor-pointer">
            <div class="flex items-center">
              <span class="text-2xl mr-3 w-8 text-center">{{ item.icon }}</span>
              <div>
                <div class="font-bold dark:text-white text-sm flex items-center gap-2">
                  {{ item.name }}
                  <span v-if="item.tags?.[0]" class="text-[8px] px-1 rounded bg-white/50 dark:bg-black/30 text-purple-600">
                    {{ TAG_DEFS[item.tags[0] as keyof typeof TAG_DEFS]?.label }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 mt-0.5">{{ item.tips || '未知描述' }}</div>
              </div>
            </div>
            <van-button size="small" color="#9333ea" plain class="h-7 px-3 text-xs rounded-lg">{{ isBuilding ? '选入' : '选择' }}</van-button>
          </div>
        </div>

        <!-- 3. 本地数据库列表 -->
        <div class="space-y-2">
          <div v-if="filteredList.length > 0" class="text-xs text-slate-400 px-1 font-bold mt-4 mb-2">📦 背包/历史</div>

          <div v-for="item in filteredList" :key="item.id" @click="selectItem(item)"
               class="flex justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl active:bg-slate-50 dark:active:bg-slate-700 transition cursor-pointer">
            <div class="flex items-center">
              <span class="text-2xl mr-3 w-8 text-center">{{ item.icon }}</span>
              <div>
                <div class="font-bold dark:text-white text-sm">{{ item.name }}</div>
                <!-- 标签展示 -->
                <div class="flex gap-1 mt-1" v-if="item.tags && item.tags.length">
                  <span v-for="tag in item.tags" :key="tag"
                        class="text-[8px] px-1.5 py-0.5 rounded font-bold border"
                        :class="[
                          tag === 'HIGH_SUGAR' ? 'bg-red-50 text-red-700 border-red-100' :
                          tag === 'HIGH_FAT' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          tag === 'HIGH_PRO' ? 'bg-green-50 text-green-700 border-green-100' :
                          tag === 'CLEAN' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        ]">
                    {{ TAG_DEFS[tag as keyof typeof TAG_DEFS]?.label || tag }}
                  </span>
                </div>
                <div class="text-xs text-slate-400 mt-1" v-else>
                  <span class="mr-2">{{ item.unit }}</span>
                  <span>~{{ item.cals }} kcal</span>
                </div>
              </div>
            </div>
            <!-- 动态按钮文字 -->
            <van-button size="small" :color="isBuilding ? '#10b981' : '#7c3aed'" plain class="h-7 px-3 text-xs rounded-lg">
              <i class="fas" :class="isBuilding ? 'fa-plus' : 'fa-check'"></i> {{ isBuilding ? '加入' : '添加' }}
            </van-button>
          </div>
        </div>
      </div>

      <!-- 配餐模式底部栏 -->
      <transition name="van-slide-up">
        <div v-if="isBuilding" class="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 shadow-2xl z-20 rounded-t-2xl">
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm font-bold dark:text-white">
              <i class="fas fa-utensils mr-2 text-purple-500"></i> 当前餐盘 ({{ basket.length }})
            </div>
            <div class="text-xs text-slate-400" v-if="basket.length > 0">已选热量: {{ basket.reduce((a,b)=>a+b.calories,0) }} kcal</div>
          </div>

          <!-- 横向滚动餐盘 -->
          <div class="flex gap-3 overflow-x-auto pb-2 mb-2 no-scrollbar" v-if="basket.length > 0">
            <div v-for="(item, idx) in basket" :key="idx" class="relative shrink-0 w-16 flex flex-col items-center">
              <div class="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl border dark:border-slate-700">{{ item.icon }}</div>
              <div class="text-[9px] truncate w-full text-center mt-1 dark:text-slate-300">{{ item.name }}</div>
              <div class="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] cursor-pointer shadow-sm" @click.stop="removeFromBasket(idx)">×</div>
            </div>
          </div>
          <div v-else class="text-center text-xs text-slate-400 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-3">
            点击上方列表添加食材
          </div>

          <van-button block color="linear-gradient(to right, #10b981, #059669)" round :disabled="basket.length === 0" @click="commitBasket" class="shadow-lg shadow-green-500/20">
            完成配餐 (获得额外经验)
          </van-button>
        </div>
      </transition>
    </div>
  </van-popup>
</template>
