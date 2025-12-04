<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
// 假设这里有一个 AI Service 文件
import { AiService } from '@/utils/aiService.ts';

const store = useGameStore();
const query = ref('');
const loading = ref(false);
const aiResult = ref<any>(null);
const activeCategory = ref('ALL');

// 控制弹窗显示
const show = computed({
  get: () => store.modals.addFood,
  set: (val) => store.setModal('addFood', val)
});

// 计算显示的列表
const filteredList = computed(() => {
  let list = store.foodDb;
  // 过滤逻辑：分类、搜索词...
  if (activeCategory.value !== 'ALL') list = list.filter(i => i.category === activeCategory.value);
  if (query.value) list = list.filter(i => i.name.includes(query.value));
  return list;
});

// 文本搜索处理
const onTextSearch = async () => {
  if (!query.value) return;
  loading.value = true;
  aiResult.value = null;

  // 调用 AI 服务
  const res = await AiService.estimateText(query.value, store.user.race);
  if (res) {
    aiResult.value = res;
  }
  loading.value = false;
};

// 选择食物项
const selectItem = (item: any) => {
  store.temp.pendingItem = item;
  store.setModal('quantity', true); // 打开数量确认弹窗
};

// 监听弹窗关闭，重置状态
watch(show, (val) => {
  if (val) {
    query.value = '';
    aiResult.value = null;
  }
});
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-900">
    <div class="flex flex-col h-full bg-slate-50 dark:bg-[#0b1120]">
      <!-- 头部 -->
      <div class="px-4 py-3 bg-white dark:bg-slate-800 flex justify-between sticky top-0 z-10 border-b dark:border-slate-700">
        <van-icon name="arrow-down" @click="show = false" class="text-slate-400" />
        <div class="font-bold dark:text-white">添加食物</div>
        <div class="w-4"></div>
      </div>

      <!-- 搜索区 -->
      <div class="p-4 pb-0 flex gap-2">
        <div class="flex-1 bg-white dark:bg-slate-800 rounded-full px-4 py-2 flex items-center border border-slate-200 dark:border-slate-700">
          <van-icon name="search" class="text-slate-400 mr-2" />
          <input v-model="query" placeholder="搜索或大贤者鉴定..." class="bg-transparent w-full text-sm outline-none dark:text-white" @keyup.enter="onTextSearch"/>
        </div>
        <!-- 拍照上传按钮 -->
        <van-uploader capture="camera">
          <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
            <i class="fas fa-camera"></i>
          </div>
        </van-uploader>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 overflow-y-auto px-4 mt-4 pb-10">
        <!-- AI 结果卡片 -->
        <div v-if="aiResult" class="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 p-4 rounded-2xl mb-4 border border-purple-100" @click="selectItem(aiResult)">
          <div class="font-bold text-lg dark:text-white">{{ aiResult.name }}</div>
          <div class="text-xs text-purple-500">{{ aiResult.tips }}</div>
          <!-- ... 营养素展示 ... -->
        </div>

        <!-- 列表 -->
        <div class="space-y-2">
          <div v-for="item in filteredList" :key="item.id" @click="selectItem(item)"
               class="flex justify-between p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl">
            <div class="flex items-center">
              <span class="text-2xl mr-3">{{ item.icon }}</span>
              <div>
                <div class="font-bold dark:text-white">{{ item.name }}</div>
                <div class="text-xs text-slate-400">~{{ item.cals }} kcal</div>
              </div>
            </div>
            <van-button size="small" color="#7c3aed">添加</van-button>
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>
