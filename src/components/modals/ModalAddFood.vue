<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { AiService } from '@/utils/aiService.ts';
import { TAG_DEFS } from '@/constants/gameData';

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

// 监听弹窗关闭，重置
watch(show, (val) => {
  if (val) {
    query.value = '';
    aiResult.value = null;
    aiSuggestions.value = [];
    loading.value = false;
  }
});

// 新增：监听输入框，为空时清空联想
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
        <div class="font-bold dark:text-white text-lg">添加食物</div>
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
      <div class="flex-1 overflow-y-auto px-4 mt-2 pb-10">
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
                    {{ TAG_DEFS[tag]?.label }}
                  </span>
                </div>
              </div>
              <div class="text-xs text-purple-500 mt-1">{{ aiResult.tips }}</div>
            </div>
            <van-button size="small" color="#7c3aed" class="h-8 px-4 rounded-lg">添加</van-button>
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
                    {{ TAG_DEFS[item.tags[0]]?.label }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 mt-0.5">{{ item.tips || '未知描述' }}</div>
              </div>
            </div>
            <van-button size="small" color="#9333ea" plain class="h-7 px-3 text-xs rounded-lg">选择</van-button>
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
                    {{ TAG_DEFS[tag]?.label || tag }}
                  </span>
                </div>
                <div class="text-xs text-slate-400 mt-1" v-else>
                  <span class="mr-2">{{ item.unit }}</span>
                  <span>~{{ item.cals }} kcal</span>
                </div>
              </div>
            </div>
            <van-button size="small" color="#7c3aed" plain class="h-7 px-3 text-xs rounded-lg">添加</van-button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredList.length === 0 && !loading && !aiResult && aiSuggestions.length === 0" class="py-10 text-center text-slate-400">
          <div class="text-4xl mb-2">🍃</div>
          <p class="text-xs">背包里没有这个食物...</p>
          <p class="text-[10px] mt-1 text-slate-500">输入内容并点击“鉴定”来发现新食物</p>
        </div>
      </div>
    </div>
  </van-popup>
</template>
