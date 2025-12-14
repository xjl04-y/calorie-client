<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { showToast, showNotify } from 'vant';
import type { FoodItem } from '@/types';

const store = useGameStore();
const systemStore = useSystemStore();
const isPure = computed(() => systemStore.isPureMode);

const show = computed({
  get: () => store.modals.manualAdd,
  set: (val) => store.setModal('manualAdd', val)
});

const activeTab = ref<'QUICK' | 'PRECISE'>('QUICK');

// [PM Fix] 定义明确的表单接口，避免类型推断错误
interface ManualAddForm {
  name: string;
  icon: string;
  calories: string | number; // 允许输入字符串，提交时转换
  p: string | number;
  c: string | number;
  f: string | number;
  grams: number;
  unit: string;
  tags: string[];
}

const form = reactive<ManualAddForm>({
  name: '',
  icon: '🥘',
  calories: '',
  p: '',
  c: '',
  f: '',
  grams: 100,
  unit: '份',
  tags: []
});

// 图标库
const ICONS = ['🥘', '🍱', '🍔', '🥩', '🥗', '🍞', '🍜', '🍚', '🍗', '🍟', '🍎', '🍰', '🥤', '☕', '🍺', '🥛', '🍷'];

// 标签选择
const availableTags = ['高碳', '高蛋白', '高油', '高糖', '纯净', '均衡'];

const toggleTag = (tag: string) => {
  if (form.tags.includes(tag)) {
    form.tags = form.tags.filter(t => t !== tag);
  } else {
    if (form.tags.length >= 3) form.tags.shift();
    form.tags.push(tag);
  }
  if (activeTab.value === 'QUICK') applyEstimate();
};

// --- 类型定义 ---
const FOOD_TYPES = [
  { label: '主食/谷物', icon: '🍚', baseCal: 200, tags: ['高碳'], ratio: {p:0.1, c:0.8, f:0.1}, isDrink: false, keys: ['饭','面','粉','饼','粥','包子','馒头','粮'] },
  { label: '肉类/蛋奶', icon: '🥩', baseCal: 250, tags: ['高蛋白'], ratio: {p:0.6, c:0.0, f:0.4}, isDrink: false, keys: ['肉','鸡','鸭','牛','羊','鱼','蛋','排','肠'] },
  { label: '蔬菜/水果', icon: '🥦', baseCal: 60, tags: ['纯净'], ratio: {p:0.1, c:0.8, f:0.1}, isDrink: false, keys: ['菜','沙拉','果','素','菇'] },
  { label: '油炸/快餐', icon: '🍔', baseCal: 450, tags: ['高油', '高碳'], ratio: {p:0.15, c:0.4, f:0.45}, isDrink: false, keys: ['炸','堡','薯','披萨','串'] },
  { label: '甜点/零食', icon: '🍰', baseCal: 350, tags: ['高糖', '高碳'], ratio: {p:0.05, c:0.6, f:0.35}, isDrink: false, keys: ['糕','糖','巧','酥','冻','冰'] },
  { label: '饮品/酒水', icon: '🥤', baseCal: 150, tags: ['高糖'], ratio: {p:0.0, c:0.95, f:0.05}, isDrink: true, keys: ['水','茶','酒','奶','饮','汁','汤','乐','咖','拿铁'] }
];

// 份量系数
const PORTION_FOOD = [
  { label: '尝一口', val: 0.3, desc: '少量', grams: 50 },
  { label: '小份', val: 0.6, desc: '半碗', grams: 150 },
  { label: '标准', val: 1.0, desc: '一碗', grams: 250 },
  { label: '大份', val: 1.5, desc: '大碗', grams: 400 },
];

const PORTION_DRINK = [
  { label: '一口', val: 0.2, desc: '润喉', grams: 50 },
  { label: '小杯', val: 0.8, desc: '250ml', grams: 250 },
  { label: '中杯', val: 1.2, desc: '500ml', grams: 500 },
  { label: '大瓶', val: 2.0, desc: '1L', grams: 1000 },
];

const selectedTypeIdx = ref(0);
const selectedPortionIdx = ref(2);

const currentPortionOptions = computed(() => {
  const type = FOOD_TYPES[selectedTypeIdx.value];
  return type.isDrink ? PORTION_DRINK : PORTION_FOOD;
});

// 监听输入名称，智能推断类型和图标
watch(() => form.name, (newName) => {
  if (!newName) return;
  // 1. 图标匹配
  if (newName.includes('面')) form.icon = '🍜';
  else if (newName.includes('饭')) form.icon = '🍚';
  else if (newName.includes('酒') || newName.includes('啤')) form.icon = '🍺';
  else if (newName.includes('咖') || newName.includes('茶')) form.icon = '☕';
  else if (newName.includes('奶')) form.icon = '🥛';
  else if (newName.includes('果')) form.icon = '🍎';

  // 2. 类型推断
  const foundTypeIdx = FOOD_TYPES.findIndex(t => t.keys.some(k => newName.includes(k)));
  if (foundTypeIdx !== -1 && foundTypeIdx !== selectedTypeIdx.value) {
    selectedTypeIdx.value = foundTypeIdx;
    form.tags = [...FOOD_TYPES[foundTypeIdx].tags];
    applyEstimate();
  }
});

const onTypeChange = (idx: number) => {
  selectedTypeIdx.value = idx;
  const type = FOOD_TYPES[idx];
  form.icon = type.icon;
  form.tags = [...type.tags];
  applyEstimate();
};

const applyEstimate = () => {
  if (activeTab.value !== 'QUICK') return;

  const type = FOOD_TYPES[selectedTypeIdx.value];
  const portionOptions = type.isDrink ? PORTION_DRINK : PORTION_FOOD;
  const pIdx = Math.min(selectedPortionIdx.value, portionOptions.length - 1);
  const portion = portionOptions[pIdx];

  let estimatedCals = Math.round(type.baseCal * portion.val);

  // 标签修正
  if (form.tags.includes('高油')) estimatedCals = Math.round(estimatedCals * 1.3);
  if (form.tags.includes('高糖')) estimatedCals = Math.round(estimatedCals * 1.2);
  if (form.tags.includes('纯净') && !form.tags.includes('高油')) estimatedCals = Math.round(estimatedCals * 0.7);

  form.calories = estimatedCals;
  form.grams = portion.grams;
  form.unit = portion.desc;

  // 宏量计算
  let { p: rp, c: rc, f: rf } = type.ratio;
  if (form.tags.includes('高蛋白')) { rp += 0.3; rc -= 0.15; rf -= 0.15; }
  if (form.tags.includes('高油')) { rf += 0.3; rc -= 0.2; rp -= 0.1; }
  if (form.tags.includes('高碳') || form.tags.includes('高糖')) { rc += 0.3; rp -= 0.1; rf -= 0.2; }

  const sum = Math.max(0.1, rp + rc + rf);
  rp /= sum; rc /= sum; rf /= sum;

  form.p = Math.round((estimatedCals * rp) / 4);
  form.c = Math.round((estimatedCals * rc) / 4);
  form.f = Math.round((estimatedCals * rf) / 9);
};

watch(selectedPortionIdx, () => {
  if (activeTab.value === 'QUICK') applyEstimate();
});

const submit = () => {
  if (!form.name.trim()) {
    showToast('请给食物起个名字');
    return;
  }
  const cals = Number(form.calories);
  if (isNaN(cals) || cals <= 0) {
    showToast('热量数值无效');
    return;
  }

  const newItem: FoodItem = {
    id: Date.now(),
    name: form.name,
    icon: form.icon,
    calories: cals,
    p: Number(form.p) || 0,
    c: Number(form.c) || 0,
    f: Number(form.f) || 0,
    grams: Number(form.grams) || 100,
    unit: form.unit || '份',
    category: 'CUSTOM',
    tags: [...form.tags],
    originalName: form.name,
    tips: activeTab.value === 'QUICK' ? '基于经验估值' : '手动精确录入'
  };

  if (systemStore.temp.isBuilding) {
    systemStore.temp.basket.push({ ...newItem, isComposite: false });
    showNotify({ type: 'success', message: `已添加: ${newItem.name}` });
  } else {
    store.battleCommit(newItem);
  }

  show.value = false;
};

// 初始化
watch(show, (val) => {
  if (val) {
    form.name = '';
    activeTab.value = 'QUICK';
    selectedTypeIdx.value = 0;
    selectedPortionIdx.value = 2;
    applyEstimate();
  }
});
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: 'auto', maxHeight: '90%', zIndex: 3000 }"
    class="dark:bg-slate-900 flex flex-col manual-add-popup"
    teleport="body"
    safe-area-inset-bottom
  >
    <div class="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative">

      <div class="px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h3 class="font-black text-lg dark:text-white flex items-center">
            <i class="fas fa-magic mr-2 text-purple-500"></i>
            {{ isPure ? '快速估算' : '物品鉴定' }}
          </h3>
          <div class="text-[10px] text-slate-400 mt-0.5">不知道数值？输入名字，我们来算。</div>
        </div>
        <span class="text-xs text-slate-400 p-2 -mr-2 cursor-pointer active:opacity-50" @click="show = false">
          <i class="fas fa-times text-lg"></i>
        </span>
      </div>

      <!-- Tabs -->
      <div class="p-2 flex justify-center bg-white dark:bg-slate-800">
        <div class="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex w-full max-w-xs">
          <button @click="activeTab = 'QUICK'"
                  class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                  :class="activeTab === 'QUICK' ? 'bg-white dark:bg-slate-600 text-purple-600 shadow-sm' : 'text-slate-400'">
            快速估算
          </button>
          <button @click="activeTab = 'PRECISE'"
                  class="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                  :class="activeTab === 'PRECISE' ? 'bg-white dark:bg-slate-600 text-purple-600 shadow-sm' : 'text-slate-400'">
            精准录入
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

        <!-- 1. 名字与图标 (共用) -->
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div class="flex gap-4">
            <!-- Icon Picker -->
            <div class="shrink-0 relative group">
              <div class="text-[10px] text-slate-400 mb-1 ml-1 text-center">图标</div>
              <div class="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-3xl border border-slate-200 dark:border-slate-600 cursor-pointer overflow-hidden relative">
                {{ form.icon }}
                <select v-model="form.icon" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
                  <option v-for="ic in ICONS" :key="ic" :value="ic">{{ ic }}</option>
                </select>
              </div>
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">更换</div>
            </div>

            <div class="flex-1">
              <div class="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">这是什么？</div>
              <!-- 输入框 -->
              <input v-model="form.name" type="text" placeholder="例如: 冰美式 / 炸鸡腿" class="w-full bg-slate-100 dark:bg-slate-700 h-10 rounded-xl px-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 ring-purple-500/50 transition-all placeholder-slate-400 text-sm" />
            </div>
          </div>
        </div>

        <!-- Mode 1: 快速估算 -->
        <div v-if="activeTab === 'QUICK'" class="space-y-6 animate-fade-in">

          <!-- 类型选择 -->
          <div>
            <label class="text-xs font-bold text-slate-500 mb-2 block ml-1">它是哪一类？</label>
            <div class="grid grid-cols-3 gap-2">
              <div v-for="(t, idx) in FOOD_TYPES" :key="idx"
                   @click="onTypeChange(idx)"
                   class="p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center gap-1"
                   :class="selectedTypeIdx === idx
                     ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                     : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-70'">
                <span class="text-2xl">{{ t.icon }}</span>
                <span class="text-[10px] font-bold dark:text-slate-200">{{ t.label }}</span>
              </div>
            </div>
          </div>

          <!-- 份量选择 -->
          <div>
            <label class="text-xs font-bold text-slate-500 mb-2 block ml-1">份量大小</label>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(p, idx) in currentPortionOptions" :key="idx"
                   @click="selectedPortionIdx = idx"
                   class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                   :class="selectedPortionIdx === idx
                     ? 'border-purple-500 bg-white dark:bg-slate-800 shadow-md ring-1 ring-purple-500'
                     : 'border-transparent bg-slate-100 dark:bg-slate-700/50 text-slate-500'">
                <div class="flex flex-col">
                  <span class="text-xs font-bold">{{ p.label }}</span>
                  <span class="text-[9px] opacity-60">{{ p.desc }}</span>
                </div>
                <div class="flex gap-0.5">
                  <div v-for="i in (idx + 1)" :key="i" class="w-1 h-3 bg-purple-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 特征标签 -->
          <div>
            <label class="text-xs font-bold text-slate-500 mb-2 block ml-1">特征 (点击微调)</label>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in availableTags" :key="tag"
                    @click="toggleTag(tag)"
                    class="px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none"
                    :class="form.tags.includes(tag)
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'">
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 结果预览 -->
          <div class="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-4 rounded-2xl border border-purple-100 dark:border-slate-600 relative overflow-hidden">
            <div class="flex justify-between items-center mb-2 relative z-10">
              <div class="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center">
                <i class="fas fa-calculator mr-1"></i> 估算结果
              </div>
              <div class="text-xl font-black text-slate-800 dark:text-white">~{{ form.calories }} <span class="text-xs font-normal text-slate-500">kcal</span></div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center relative z-10">
              <div class="bg-white/60 dark:bg-slate-700/50 p-1.5 rounded-lg">
                <div class="text-[8px] text-slate-400">蛋白质</div>
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">{{ form.p }}g</div>
              </div>
              <div class="bg-white/60 dark:bg-slate-700/50 p-1.5 rounded-lg">
                <div class="text-[8px] text-slate-400">碳水</div>
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">{{ form.c }}g</div>
              </div>
              <div class="bg-white/60 dark:bg-slate-700/50 p-1.5 rounded-lg">
                <div class="text-[8px] text-slate-400">脂肪</div>
                <div class="font-bold text-slate-700 dark:text-slate-200 text-xs">{{ form.f }}g</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mode 2: 精准录入 -->
        <div v-else class="space-y-4 animate-fade-in">
          <div class="bg-blue-50 dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-slate-700 mb-4 text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            <i class="fas fa-info-circle mr-1"></i> 请参考包装背后的营养成分表进行填写。
          </div>

          <div>
            <label class="text-[10px] text-slate-400 mb-1 block">能量 (kcal)</label>
            <input v-model.number="form.calories" type="number" placeholder="0" class="w-full h-12 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 font-black text-xl outline-none focus:border-purple-500 transition-colors" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-[10px] text-slate-400 mb-1 block text-center">蛋白质 (g)</label>
              <input v-model.number="form.p" type="number" class="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-center font-bold outline-none" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 mb-1 block text-center">碳水 (g)</label>
              <input v-model.number="form.c" type="number" class="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-center font-bold outline-none" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 mb-1 block text-center">脂肪 (g)</label>
              <input v-model.number="form.f" type="number" class="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 text-center font-bold outline-none" />
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-500 mb-2 block ml-1">特征 (可选)</label>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in availableTags" :key="tag"
                    @click="toggleTag(tag)"
                    class="px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none"
                    :class="form.tags.includes(tag)
                      ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 sticky bottom-0 z-20">
        <button @click="submit" class="w-full bg-slate-900 dark:bg-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all text-sm flex items-center justify-center">
          <i class="fas fa-check mr-2"></i> {{ activeTab === 'QUICK' ? '使用估算值' : '确认录入' }}
        </button>
      </div>

    </div>
  </van-popup>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
/* 强制覆盖层级，确保在其他弹窗之上 */
.manual-add-popup { z-index: 3000 !important; }
</style>
