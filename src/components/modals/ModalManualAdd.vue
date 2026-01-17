<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { formatRpgFoodName } from '@/utils/gameUtils';
import { showToast, showNotify } from 'vant';
import type { FoodItem } from '@/types';
// [本地智能核心] 引入 Fuse.js 进行内存级模糊搜索
import Fuse from 'fuse.js';

// --- Stores ---
const store = useGameStore();
const systemStore = useSystemStore();
const heroStore = useHeroStore();

// --- Computed & State ---
const isPure = computed(() => systemStore.isPureMode);

const show = computed({
  get: () => store.modals.manualAdd,
  set: (val) => store.setModal('manualAdd', val)
});

const activeTab = ref<'QUICK' | 'PRECISE'>('QUICK');
const showIconGrid = ref(false);
const calcExplanation = ref('');
const isSearchMode = ref(false);
const showDetailsInPure = ref(false);
const isSearchingRemote = ref(false);
const remoteResults = ref<any[]>([]);
// [新增] 搜索防抖定时器
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// --- Form & Types ---
interface ManualAddForm {
  name: string;
  icon: string;
  calories: string | number;
  p: string | number;
  c: string | number;
  f: string | number;
  grams: number;
  unit: string;
  tags: string[];
}

const form = reactive<ManualAddForm>({
  name: '',
  icon: 'icon-hanbaoshutiao',
  calories: '',
  p: '',
  c: '',
  f: '',
  grams: 100,
  unit: '份',
  tags: []
});

// ==========================================================
// [本地高频词库 - 中华特供版]
// ==========================================================
const LOCAL_DB_CACHE = [
  // --- 早餐/面点 ---
  { name: '白米饭', alias: 'rice mifan', icon: 'icon-wucan2', cal: 116, p: 2.6, c: 25.9, f: 0.3, unit: '碗', grams: 150, tags: ['高碳'] },
  { name: '小米粥', alias: 'zhou porridge', icon: 'icon-wucan', cal: 46, p: 1.4, c: 8.4, f: 0.7, unit: '碗', grams: 250, tags: ['纯净'] },
  { name: '皮蛋瘦肉粥', alias: 'pidan zhou', icon: 'icon-wucan', cal: 70, p: 4, c: 9, f: 2, unit: '碗', grams: 300, tags: ['均衡'] },
  { name: '油条', alias: 'youtiao', icon: 'icon-shouzhuabing1', cal: 388, p: 6, c: 51, f: 17, unit: '根', grams: 60, tags: ['高油', '高碳'] },
  { name: '豆浆(甜)', alias: 'doujiang milk', icon: 'icon-tingzhuangyinliao1', cal: 45, p: 2.5, c: 6, f: 1.5, unit: '杯', grams: 250, tags: ['高糖'] },
  { name: '肉包子', alias: 'baozi', icon: 'icon-roujiamo', cal: 230, p: 8, c: 35, f: 9, unit: '个', grams: 100, tags: ['高碳', '高油'] },
  { name: '煎饼果子', alias: 'jianbing', icon: 'icon-shouzhuabing1', cal: 210, p: 6, c: 28, f: 10, unit: '个', grams: 300, tags: ['高碳', '高油'] },
  { name: '手抓饼', alias: 'shouzhuabing', icon: 'icon-shouzhuabing1', cal: 300, p: 6, c: 32, f: 18, unit: '个', grams: 150, tags: ['高油'] },
  { name: '煮鸡蛋', alias: 'egg jidan', icon: 'icon-huotuihebaodan', cal: 144, p: 13.3, c: 2.8, f: 8.8, unit: '个', grams: 50, tags: ['高蛋白'] },

  // --- 家常菜/正餐 ---
  { name: '红烧肉', alias: 'hongshaorou pork', icon: 'icon-roupai', cal: 480, p: 10, c: 8, f: 45, unit: '份', grams: 150, tags: ['高油', '高糖'] },
  { name: '鱼香肉丝', alias: 'yuxiangrousi', icon: 'icon-kaochuan', cal: 180, p: 10, c: 12, f: 14, unit: '份', grams: 200, tags: ['高油', '高糖'] },
  { name: '宫保鸡丁', alias: 'gongbao chicken', icon: 'icon-kaochuan', cal: 160, p: 15, c: 9, f: 11, unit: '份', grams: 200, tags: ['高油', '高蛋白'] },
  { name: '番茄炒蛋', alias: 'tomato egg', icon: 'icon-huluobu1', cal: 90, p: 5, c: 6, f: 6, unit: '份', grams: 200, tags: ['均衡'] },
  { name: '土豆丝', alias: 'tudousi potato', icon: 'icon-shousi', cal: 110, p: 2, c: 18, f: 5, unit: '份', grams: 200, tags: ['高碳', '高油'] },
  { name: '麻婆豆腐', alias: 'mapo tofu', icon: 'icon-kaochuan', cal: 130, p: 8, c: 6, f: 10, unit: '份', grams: 200, tags: ['高油'] },
  { name: '清蒸鱼', alias: 'fish', icon: 'icon-haican', cal: 100, p: 18, c: 2, f: 3, unit: '条', grams: 150, tags: ['高蛋白', '纯净'] },
  { name: '煎牛排', alias: 'steak niupai', icon: 'icon-niupai', cal: 200, p: 20, c: 0, f: 12, unit: '块', grams: 150, tags: ['高蛋白', '高油'] },

  // --- 面食/快餐 ---
  { name: '兰州拉面', alias: 'beef noodle', icon: 'icon-paomian1', cal: 120, p: 6, c: 20, f: 3, unit: '碗', grams: 400, tags: ['高碳'] },
  { name: '红烧牛肉面', alias: 'noodle', icon: 'icon-paomian1', cal: 140, p: 6, c: 18, f: 6, unit: '碗', grams: 400, tags: ['高碳', '高油'] },
  { name: '凉皮', alias: 'liangpi', icon: 'icon-paomian1', cal: 160, p: 3, c: 32, f: 4, unit: '碗', grams: 300, tags: ['高碳'] },
  { name: '饺子(猪肉)', alias: 'jiaozi dumpling', icon: 'icon-zhushuijiao', cal: 240, p: 9, c: 22, f: 12, unit: '个', grams: 20, tags: ['均衡'] },
  { name: '麻辣烫(含汤)', alias: 'malatang', icon: 'icon-malatang', cal: 80, p: 4, c: 5, f: 5, unit: '碗', grams: 500, tags: ['高油'] },
  { name: '麦辣鸡腿堡', alias: 'burger', icon: 'icon-hanbaoshutiao', cal: 570, p: 25, c: 45, f: 30, unit: '个', grams: 200, tags: ['高油', '高碳'] },

  // --- 饮品/水果/零食 ---
  { name: '珍珠奶茶', alias: 'bubble tea milk', icon: 'icon-tingzhuangyinliao1', cal: 350, p: 2, c: 60, f: 10, unit: '杯', grams: 500, tags: ['高糖', '高碳'] },
  { name: '美式咖啡', alias: 'americano', icon: 'icon-kafei1', cal: 5, p: 0.2, c: 1, f: 0, unit: '杯', grams: 355, tags: ['纯净'] },
  { name: '拿铁', alias: 'latte', icon: 'icon-kafei1', cal: 140, p: 6, c: 10, f: 7, unit: '杯', grams: 355, tags: ['高糖'] },
  { name: '可乐', alias: 'cola coke', icon: 'icon-kele', cal: 180, p: 0, c: 45, f: 0, unit: '罐', grams: 330, tags: ['高糖'] },
  { name: '蔓越鸡尾酒', alias: 'cocktail alcohol', icon: 'icon-jiweijiu1', cal: 180, p: 0, c: 15, f: 0, unit: '杯', grams: 250, tags: ['高糖'] },
  { name: '苹果', alias: 'apple', icon: 'icon-sheguo', cal: 50, p: 0.3, c: 13, f: 0.2, unit: '个', grams: 200, tags: ['纯净'] },
  { name: '香蕉', alias: 'banana', icon: 'icon-xiangjiao1', cal: 90, p: 1.1, c: 23, f: 0.2, unit: '根', grams: 120, tags: ['高碳'] },
];

// Fuse 实例
const fuse = ref<Fuse<typeof LOCAL_DB_CACHE[0]> | null>(null);

const initSearchEngine = () => {
  const data = [...LOCAL_DB_CACHE];

  fuse.value = new Fuse(data, {
    keys: [
      { name: 'name', weight: 0.8 },
      { name: 'alias', weight: 0.2 }
    ],
    ignoreLocation: true,
    threshold: 0.3,
    minMatchCharLength: 1,
    includeScore: true
  });
};

onMounted(() => {
  initSearchEngine();
});

// [自动] OpenFoodFacts 免费 API 搜索
// 策略：当本地库无结果时，自动触发此函数
const searchRemote = async () => {
  if (!form.name) return;

  isSearchingRemote.value = true;
  remoteResults.value = [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(form.name)}&search_simple=1&action=process&json=1&cc=cn&page_size=10&fields=product_name,nutriments,image_front_thumb_url,quantity`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();

    if (data.products && data.products.length > 0) {
      remoteResults.value = data.products.map((p: any) => {
        const nutriments = p.nutriments || {};
        let defaultGrams = 100;

        // 自动计算标签 (Smart Tagging)
        const autoTags: string[] = [];
        const cal = Math.round(nutriments['energy-kcal_100g'] || 0);
        const pro = Math.round(nutriments['proteins_100g'] || 0);
        const carb = Math.round(nutriments['carbohydrates_100g'] || 0);
        const fat = Math.round(nutriments['fat_100g'] || 0);

        if (cal > 350) autoTags.push('高卡');
        if (cal < 50 && cal > 0) autoTags.push('低卡');
        if (pro > 15) autoTags.push('高蛋白');
        if (carb > 40) autoTags.push('高碳');
        if (fat > 20) autoTags.push('高油');
        if ((nutriments['sugars_100g'] || 0) > 15) autoTags.push('高糖');

        return {
          name: p.product_name || form.name,
          icon: p.image_front_thumb_url || 'icon-hanbaoshutiao',
          isRemoteImage: !!p.image_front_thumb_url,
          cal: cal,
          p: pro,
          c: carb,
          f: fat,
          unit: '100g',
          grams: defaultGrams,
          tags: autoTags, // 使用计算出的真实标签，而不是 '云端'
          source: 'remote' // 内部标记来源
        };
      }).filter((p: any) => p.cal > 0);
    }
  } catch (error: any) {
    console.error("OFF search error:", error);
  } finally {
    isSearchingRemote.value = false;
  }
};

// 搜索结果 (Local) - 用于 computed 显示
const localSearchResults = computed(() => {
  if (!form.name || !isSearchMode.value || !fuse.value) return [];
  const keyword = form.name.trim();
  if (!keyword) return [];
  return fuse.value.search(keyword).slice(0, 6).map(r => r.item);
});

// [核心] 智能自动搜索逻辑
watch(() => form.name, (newName) => {
  // 1. 清空状态
  if (!newName) {
    isSearchMode.value = false;
    isSearchingRemote.value = false;
    remoteResults.value = [];
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    return;
  }

  isSearchMode.value = true;

  // 2. 图标反馈
  if (newName.includes('面')) form.icon = 'icon-paomian1';
  else if (newName.includes('饭')) form.icon = 'icon-wucan2';
  else if (newName.includes('酒') || newName.includes('啤') || newName.includes('鸡尾')) form.icon = 'icon-jiweijiu1';
  else if (newName.includes('咖') || newName.includes('茶')) form.icon = 'icon-kafei1';
  else if (newName.includes('奶')) form.icon = 'icon-tingzhuangyinliao1';
  else if (newName.includes('果')) form.icon = 'icon-guopan1';
  else if (newName.includes('蛋')) form.icon = 'icon-huotuihebaodan';
  else if (newName.includes('菜')) form.icon = 'icon-sharpicons_corn';
  else if (newName.includes('肉')) form.icon = 'icon-roupai';
  else if (newName.includes('包')) form.icon = 'icon-roujiamo';

  // 3. 搜索策略: 本地优先 -> 自动云端
  const keyword = newName.trim();
  const localHits = fuse.value ? fuse.value.search(keyword) : [];

  if (localHits.length > 0) {
    // A. 命中本地: 立即取消云端搜索，优先显示本地
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    isSearchingRemote.value = false;
    remoteResults.value = [];
  } else {
    // B. 本地无结果: 延迟自动触发云端搜索
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    // 设置为 Loading 状态 (可选，这里我们等防抖结束再 Loading，避免输入闪烁)
    searchDebounceTimer = setTimeout(() => {
      searchRemote();
    }, 600); // 600ms 防抖，等待用户停止打字
  }

  // 4. 自动估算兜底 (UI下方展示)
  if (activeTab.value === 'QUICK' || (activeTab.value === 'PRECISE' && !form.calories)) {
    applyEstimate(true);
  }
});

const selectPreset = (item: any) => {
  form.name = item.name;

  if (item.isRemoteImage) {
    form.icon = 'icon-hanbaoshutiao';
  } else {
    form.icon = item.icon;
  }

  form.grams = item.grams || 100;
  form.unit = item.unit || '份';

  const ratio = form.grams / 100;

  if (item.source === 'remote') { // 检查 source 属性，而不是 tags
    form.calories = Math.round(item.cal * ratio);
    form.p = Math.round(item.p * ratio);
    form.c = Math.round(item.c * ratio);
    form.f = Math.round(item.f * ratio);
    calcExplanation.value = `OpenFoodFacts数据 (每100g: ${item.cal}kcal)`;
  } else {
    form.calories = item.cal;
    form.p = item.p;
    form.c = item.c;
    form.f = item.f;
    calcExplanation.value = `本地库匹配: ${item.name}`;
  }

  form.tags = item.tags ? [...item.tags] : [];

  isSearchMode.value = false;
  activeTab.value = 'PRECISE';
};

// [新增] 强制使用手动录入 (搜索无结果时的兜底)
const forceManualInput = () => {
  isSearchMode.value = false;
  // 确保估算值已应用
  if (!form.calories) applyEstimate(true);
};

// ==========================================================
// 密度规则引擎 v2.0 (兜底逻辑)
// ==========================================================
const FOOD_TYPES = [
  { label: '谷物主食', icon: 'icon-tusimianbao', baseCal: 200, tags: ['高碳'], ratio: {p:0.1, c:0.8, f:0.1}, isDrink: false, keys: ['饭','面','粉','饼','粥','包子','馒头','粮'] },
  { label: '优质蛋白', icon: 'icon-roupai', baseCal: 250, tags: ['高蛋白'], ratio: {p:0.6, c:0.0, f:0.4}, isDrink: false, keys: ['肉','鸡','鸭','牛','羊','鱼','蛋','排','肠'] },
  { label: '蔬果纤维', icon: 'icon-sharpicons_corn', baseCal: 60, tags: ['纯净'], ratio: {p:0.1, c:0.8, f:0.1}, isDrink: false, keys: ['菜','沙拉','果','素','菇'] },
  { label: '高能快餐', icon: 'icon-hanbaoshutiao', baseCal: 450, tags: ['高油', '高碳'], ratio: {p:0.15, c:0.4, f:0.45}, isDrink: false, keys: ['炸','堡','薯','披萨','串'] },
  { label: '零食甜点', icon: 'icon-tiantianquan', baseCal: 350, tags: ['高糖', '高碳'], ratio: {p:0.05, c:0.6, f:0.35}, isDrink: false, keys: ['糕','糖','巧','酥','冻','冰'] },
  { label: '饮品酒水', icon: 'icon-kele', baseCal: 150, tags: ['高糖'], ratio: {p:0.0, c:0.95, f:0.05}, isDrink: true, keys: ['水','茶','酒','奶','饮','汁','汤','乐','咖','拿铁'] }
];

const PORTION_FOOD = [
  { label: '尝一口', val: 0.3, desc: '少量', grams: 50 },
  { label: '小份', val: 0.6, desc: '半碗', grams: 150 },
  { label: '标准', val: 1.0, desc: '一碗', grams: 250 },
  { label: '大份', val: 1.5, desc: '豪迈', grams: 400 },
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
  return type?.isDrink ? PORTION_DRINK : PORTION_FOOD;
});

const DENSITY_DB = {
  // Level 1: 成品/混合菜
  composites: [
    { keys: ['披萨', 'pizza', '必胜客'], val: 2.6, label: '披萨(面+酪+肉)' },
    { keys: ['汉堡', '巨无霸', '堡'], val: 2.8, label: '汉堡组合' },
    { keys: ['薯条', '薯饼'], val: 3.2, label: '油炸淀粉' },
    { keys: ['意面', '意大利面', '肉酱面'], val: 1.6, label: '意面(含酱)' },
    { keys: ['三文治', '三明治', '赛百味'], val: 2.2, label: '三明治' },
    { keys: ['沙拉', '轻食'], val: 0.8, label: '混合沙拉(含酱)' },
    { keys: ['肉夹馍', '夹馍'], val: 2.8, label: '肉夹馍(饼+肉)' },
    { keys: ['煎饼', '手抓饼', '葱油饼', '灌饼'], val: 2.8, label: '油烙饼' },
    { keys: ['炒饭', '盖饭', '盖浇饭', '煲仔饭', '炒面', '炒粉'], val: 1.8, label: '油炒主食' },
    { keys: ['牛肉面', '排骨面', '肥肠面', '螺蛳粉', '酸辣粉', '汤面'], val: 1.1, label: '汤面(连汤)' },
    { keys: ['拌面', '热干面', '炸酱面'], val: 1.9, label: '拌面(酱+油)' },
    { keys: ['饺子', '云吞', '馄饨', '包子', '小笼包', '锅贴'], val: 2.0, label: '带馅面食' },
    { keys: ['凉皮', '凉面'], val: 1.4, label: '凉拌主食' },
    { keys: ['油条', '麻球'], val: 3.8, label: '油炸面食' },
    { keys: ['寿司', '饭团', '手卷'], val: 1.6, label: '寿司/饭团' },
    { keys: ['石锅拌饭', '拌饭'], val: 1.5, label: '韩式拌饭' },
    { keys: ['火锅', '冒菜', '麻辣烫', '串串'], val: 1.2, label: '火锅(平均)' },
    { keys: ['麻辣香锅', '干锅'], val: 2.2, label: '香锅(重油)' },
    { keys: ['咖喱'], val: 1.8, label: '咖喱浓汁' },
  ],
  // Level 2: 基础食材
  ingredients: [
    { keys: ['油', '脂', '黄油', '奶油'], val: 8.0, label: '纯油脂' },
    { keys: ['坚果', '花生', '瓜子', '核桃', '巴旦木', '芝麻'], val: 6.0, label: '坚果/籽类' },
    { keys: ['巧克', '糖果', '酥', '脆', '曲奇', '薯片', '威化'], val: 5.0, label: '高糖油零食' },
    { keys: ['蛋糕', '甜点', '派', '挞', '面包', '吐司'], val: 3.5, label: '烘焙甜点' },
    { keys: ['培根', '香肠', '腊肠', '午餐肉', '火腿'], val: 3.5, label: '加工肉' },
    { keys: ['五花', '肥牛', '肥羊', '猪蹄', '红烧肉', '扣肉'], val: 3.0, label: '高脂肉' },
    { keys: ['猪', '牛', '羊', '排骨', '肉', '瘦肉'], val: 2.0, label: '一般红肉' },
    { keys: ['鸡', '鸭', '鹅', '禽', '翅', '腿'], val: 1.8, label: '禽肉' },
    { keys: ['胸', '里脊'], val: 1.3, label: '低脂瘦肉' },
    { keys: ['鱼', '虾', '蟹', '海鲜', '贝', '鱿鱼'], val: 1.1, label: '水产' },
    { keys: ['蛋'], val: 1.4, label: '蛋类' },
    { keys: ['饭', '米', '粥', '粮'], val: 1.2, label: '米饭类' },
    { keys: ['面', '粉', '饼', '馍', '馒头', '燕麦'], val: 1.8, label: '面食干粮' },
    { keys: ['薯', '芋', '玉米', '土豆', '藕', '根茎'], val: 1.0, label: '根茎淀粉' },
    { keys: ['豆', '腐', '干'], val: 1.2, label: '豆制品' },
    { keys: ['奶', '酪', '乳', '芝士'], val: 1.5, label: '乳制品' },
    { keys: ['果', '莓', '橘', '橙', '苹果', '梨', '桃', '瓜', '蕉', '榴莲'], val: 0.6, label: '水果' },
    { keys: ['菜', '蔬', '菇', '笋', '瓜', '叶', '苗'], val: 0.3, label: '蔬菜' }
  ],
  // Level 3: 修正系数
  modifiers: [
    { keys: ['干', '脱水', '脯', '肉干'], val: 2.5, label: '风干浓缩' },
    { keys: ['炸', '酥', '天妇罗', '油淋'], val: 1.6, label: '油炸吸油' },
    { keys: ['爆炒', '干煸', '红烧', '糖醋', '蜜汁', '拔丝'], val: 1.3, label: '重油糖' },
    { keys: ['炒', '煎', '烧', '焖', '烩', '焗'], val: 1.15, label: '常规烹饪' },
    { keys: ['烤', '烘', '焙', '熏'], val: 1.1, label: '烘烤失水' },
    { keys: ['蒸', '煮', '白灼', '清炖', '凉拌', '刺身', '生'], val: 0.95, label: '清淡/水煮' },
    { keys: ['汤', '水', '粥', '茶', '酒', '拿铁', '美式', '汁', '饮', '奶', '啤', '咖'], val: 0.4, label: '液体稀释' },
    { keys: ['无糖', '低卡', '轻', '0糖', '脱脂'], val: 0.7, label: '减脂/代糖' }
  ]
};

const ICONS = [
  'icon-tusimianbao', 'icon-tusimianbao1', 'icon-jiaxinmianbao', 'icon-paomian1', 'icon-shouzhuabing1', 'icon-roujiamo',
  'icon-roupai', 'icon-niupai', 'icon-huotui1', 'icon-huoji1', 'icon-xiangchang', 'icon-yazi',
  'icon-hanbaoshutiao', 'icon-pisa1', 'icon-regou', 'icon-kaochuan', 'icon-malatang',
  'icon-dangao2', 'icon-tiantianquan', 'icon-bingqilin1', 'icon-qiaokeli1', 'icon-yuebing', 'icon-nengliangbang',
  'icon-huluobu1', 'icon-sharpicons_corn', 'icon-sharpicons_eggplant', 'icon-xigua1', 'icon-caomeijiang', 'icon-xiangjiao1',
  'icon-kafei1', 'icon-kele', 'icon-tingzhuangyinliao1', 'icon-yezizhi', 'icon-pijiu', 'icon-wucan', 'icon-jiweijiu1'
];

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

const onTypeChange = (idx: number) => {
  selectedTypeIdx.value = idx;
  const type = FOOD_TYPES[idx];
  if (type) {
    form.icon = type.icon;
    applyEstimate();
  }
};

const applyEstimate = (isAutoSuggestion = false) => {
  if (isAutoSuggestion && form.calories) return;

  const fallbackType = FOOD_TYPES[selectedTypeIdx.value];
  const portionOptions = fallbackType.isDrink ? PORTION_DRINK : PORTION_FOOD;
  const pIdx = Math.min(selectedPortionIdx.value, portionOptions.length - 1);
  const portion = portionOptions[pIdx];
  if (!portion) return;

  const name = form.name.toLowerCase();
  let explanationParts: string[] = [];
  let calculatedDensity = 0;

  // === 规则引擎 v2.0 核心逻辑 (兜底) ===
  let bestComposite = null;
  let maxCompLen = 0;

  DENSITY_DB.composites.forEach(comp => {
    if (comp.keys.some(k => name.includes(k))) {
      const matchedKey = comp.keys.find(k => name.includes(k)) || '';
      if (matchedKey.length >= maxCompLen) {
        maxCompLen = matchedKey.length;
        bestComposite = comp;
      }
    }
  });

  if (bestComposite) {
    calculatedDensity = bestComposite.val;
    explanationParts.push(`${bestComposite.label}(${bestComposite.val})`);
  } else {
    let bestIngredient = null;
    let maxIngVal = 0;

    DENSITY_DB.ingredients.forEach(ing => {
      if (ing.keys.some(k => name.includes(k))) {
        if (ing.val > maxIngVal) {
          maxIngVal = ing.val;
          bestIngredient = ing;
        }
      }
    });

    if (bestIngredient) {
      calculatedDensity = bestIngredient.val;
      explanationParts.push(`${bestIngredient.label}(${bestIngredient.val})`);
    } else {
      calculatedDensity = fallbackType.baseCal / 250;
      explanationParts.push(`${fallbackType.label}基准(${calculatedDensity.toFixed(1)})`);
    }

    DENSITY_DB.modifiers.forEach(mod => {
      if (mod.keys.some(k => name.includes(k))) {
        calculatedDensity *= mod.val;
        explanationParts.push(`×`);
        explanationParts.push(`${mod.label}(${mod.val})`);
      }
    });
  }

  if (fallbackType.isDrink && calculatedDensity > 1.2 && !explanationParts.some(p => p.includes('液体') || p.includes('饮') || p.includes('茶'))) {
    calculatedDensity *= 0.5;
    explanationParts.push(`× 饮品修正(0.5)`);
  }

  if (form.tags.includes('高油')) {
    calculatedDensity *= 1.25;
    explanationParts.push(`× 高油(1.25)`);
  }
  if (form.tags.includes('高糖')) {
    calculatedDensity *= 1.15;
    explanationParts.push(`× 高糖(1.15)`);
  }
  if (form.tags.includes('纯净') && !form.tags.includes('高油')) {
    calculatedDensity *= 0.85;
    explanationParts.push(`× 纯净(0.85)`);
  }

  let finalCals = Math.round(calculatedDensity * portion.grams);

  form.calories = finalCals;
  form.grams = portion.grams;
  form.unit = portion.desc.split(' ')[0] || '份';
  calcExplanation.value = explanationParts.join(' ');

  let { p: rp, c: rc, f: rf } = fallbackType.ratio;
  if (calculatedDensity > 2.5) { rf += 0.3; rc -= 0.15; rp -= 0.15; }
  else if (calculatedDensity > 1.5) { rf += 0.1; }

  if (form.tags.includes('高蛋白')) { rp += 0.3; rc -= 0.1; rf -= 0.2; }
  if (form.tags.includes('高油')) { rf += 0.3; rc -= 0.2; rp -= 0.1; }
  if (form.tags.includes('高碳') || form.tags.includes('高糖')) { rc += 0.25; rp -= 0.1; rf -= 0.15; }

  const sum = Math.max(0.1, rp + rc + rf);
  rp /= sum; rc /= sum; rf /= sum;

  form.p = Math.round((finalCals * rp) / 4);
  form.c = Math.round((finalCals * rc) / 4);
  form.f = Math.round((finalCals * rf) / 9);
};

watch([selectedPortionIdx, activeTab], () => {
  if (activeTab.value === 'QUICK') applyEstimate();
});

const submit = () => {
  const trimmedName = form.name.trim();

  if (!trimmedName) {
    showToast('食物名称不能为空');
    return;
  }

  const cals = Number(form.calories);
  if (isNaN(cals) || cals <= 0) {
    showToast('热量数值无效');
    return;
  }

  const newItem: FoodItem = {
    id: Date.now(),
    name: trimmedName,
    icon: form.icon,
    calories: cals,
    p: Number(form.p) || 0,
    c: Number(form.c) || 0,
    f: Number(form.f) || 0,
    grams: Number(form.grams) || 100,
    unit: form.unit || '份',
    category: 'CUSTOM',
    tags: [...form.tags],
    originalName: trimmedName,
    tips: activeTab.value === 'QUICK' ? '快速估算' : '精确录入'
  };

  if (!isPure.value) {
    const rpgFormatted = formatRpgFoodName(trimmedName, heroStore.user.race, trimmedName);
    newItem.name = rpgFormatted;
  }

  if (systemStore.temp.isBuilding) {
    systemStore.temp.basket.push({ ...newItem, isComposite: false });
    showNotify({ type: 'success', message: `已添加: ${newItem.name}`, background: '#10b981' });
    show.value = false;
  } else {
    show.value = false;
    store.setModal('addFood', false);
    setTimeout(() => {
      store.battleCommit(newItem);
    }, 300);
  }
};

watch(show, (val) => {
  if (val) {
    form.name = '';
    activeTab.value = isPure.value ? 'PRECISE' : 'QUICK';
    showDetailsInPure.value = false;
    isSearchMode.value = false;
    isSearchingRemote.value = false;
    remoteResults.value = [];
    selectedTypeIdx.value = 0;
    selectedPortionIdx.value = 2;
    calcExplanation.value = '';
    if (!isPure.value) {
      applyEstimate();
    }
  }
});
</script>

<template>
  <van-popup
    v-model:show="show"
    :position="isPure ? 'right' : 'bottom'"
    :round="!isPure"
    :style="{
      height: isPure ? '100%' : 'auto',
      width: isPure ? '100%' : '100%',
      maxHeight: isPure ? '100%' : '92%',
      zIndex: 3000
    }"
    class="manual-add-popup"
    teleport="body"
    safe-area-inset-bottom
  >
    <!-- 全局容器 -->
    <div class="flex flex-col h-full bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-slate-200 relative">

      <!-- 1. 顶部导航栏 -->
      <div class="px-4 py-3 bg-white dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700 sticky top-0 z-20 flex items-center justify-between shadow-sm">

        <!-- 左侧 -->
        <div class="flex items-center">
          <button v-if="isPure" @click="show = false" class="mr-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
            <i class="fas fa-arrow-left text-lg"></i>
          </button>

          <div>
            <h3 class="text-lg font-bold flex items-center"
                :class="isPure ? 'font-sans tracking-tight' : 'font-serif tracking-wide'">
              <span v-if="!isPure" class="mr-2 text-emerald-500">
                <i class="fas fa-scroll"></i>
              </span>
              {{ isPure ? '添加记录' : '物资鉴定' }}
            </h3>
            <p v-if="!isPure" class="text-[10px] text-slate-400 mt-0.5">IDENTIFY UNKNOWN ITEMS</p>
          </div>
        </div>

        <!-- 模式切换 Tabs (RPG模式) -->
        <div v-if="!isPure" class="bg-slate-100 dark:bg-zinc-700 p-1 rounded-lg flex text-xs font-bold">
          <button @click="activeTab = 'QUICK'"
                  class="px-3 py-1.5 rounded-md transition-all duration-300"
                  :class="activeTab === 'QUICK' ? 'bg-white dark:bg-zinc-600 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
            估算
          </button>
          <button @click="activeTab = 'PRECISE'"
                  class="px-3 py-1.5 rounded-md transition-all duration-300"
                  :class="activeTab === 'PRECISE' ? 'bg-white dark:bg-zinc-600 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'">
            精确
          </button>
        </div>

        <!-- 纯净模式右侧按钮 -->
        <button v-if="isPure" @click="submit" class="text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm px-4 py-1.5 font-bold transition-colors shadow-sm shadow-emerald-200 dark:shadow-none">
          保存
        </button>
      </div>

      <!-- 2. 内容滚动区 -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

        <!-- 名字输入框 (SearchBar Style in Pure Mode) -->
        <div class="relative group z-30">
          <div class="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all"
               :class="isPure ? 'bg-white dark:bg-zinc-800 border-emerald-500/20 shadow-sm' : 'border-transparent'">
            <button @click="showIconGrid = !showIconGrid"
                    class="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-zinc-700 hover:bg-emerald-50 hover:text-emerald-500 transition-colors flex items-center justify-center shadow-inner">
              <svg v-if="form.icon.startsWith('icon-')" class="icon text-xl" aria-hidden="true">
                <use :xlink:href="'#' + form.icon"></use>
              </svg>
              <span v-else class="text-xl">{{ form.icon }}</span>
            </button>

            <div class="flex-1">
              <input v-model="form.name"
                     type="text"
                     :placeholder="isPure ? '搜索或输入食物名称 (如: 牛肉面)' : '未知道具名称...'"
                     class="w-full bg-transparent text-lg font-bold placeholder-slate-300 dark:placeholder-zinc-600 border-none outline-none focus:ring-0 p-0"
              />
            </div>

            <button v-if="form.name" @click="form.name = ''; isSearchMode=false; remoteResults=[]" class="text-slate-300 hover:text-slate-500 ml-1">
              <i class="fas fa-times-circle"></i>
            </button>
          </div>

          <!-- Icon Grid - Optimized with Backdrop -->
          <!-- [新增] 遮罩层: 点击外部关闭 -->
          <div v-if="showIconGrid" class="fixed inset-0 z-40" @click="showIconGrid = false"></div>

          <transition name="van-fade">
            <div v-if="showIconGrid" class="absolute top-16 left-0 w-full bg-white dark:bg-zinc-800 shadow-xl rounded-xl border border-slate-100 dark:border-zinc-700 z-50 p-3">
              <div class="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                <button v-for="ic in ICONS" :key="ic"
                        @click="form.icon = ic; showIconGrid = false"
                        class="aspect-square flex items-center justify-center rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                  <svg v-if="ic.startsWith('icon-')" class="icon text-xl" aria-hidden="true">
                    <use :xlink:href="'#' + ic"></use>
                  </svg>
                  <span v-else class="text-xl">{{ ic }}</span>
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- [新增] 搜索结果列表 (Fuse.js 驱动) -->
        <transition name="van-fade">
          <div v-if="isSearchMode" class="space-y-4">

            <!-- 本地结果 -->
            <div v-if="localSearchResults.length > 0" class="space-y-2">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">本地库 (Local)</div>
              <div v-for="item in localSearchResults" :key="item.name"
                   @click="selectPreset(item)"
                   class="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-100 dark:border-zinc-700 flex justify-between items-center cursor-pointer hover:border-emerald-400 transition-colors active:scale-[0.99]">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                    <svg v-if="item.icon.startsWith('icon-')" class="icon text-xl" aria-hidden="true">
                      <use :xlink:href="'#' + item.icon"></use>
                    </svg>
                  </div>
                  <div>
                    <div class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ item.name }}</div>
                    <div class="text-[10px] text-slate-400">{{ item.cal }}kcal / {{ item.unit }} ({{ item.grams }}g)</div>
                  </div>
                </div>
                <div class="text-emerald-500"><i class="fas fa-plus-circle text-lg"></i></div>
              </div>
            </div>

            <!-- [云端搜索结果/空状态] -->
            <!-- 当本地无结果时显示 -->
            <div v-if="localSearchResults.length === 0" class="space-y-2">
              <div class="flex justify-between items-end px-1">
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {{ isSearchingRemote ? '云端搜索中 (OFF)...' : (remoteResults.length > 0 ? '云端结果 (OpenFoodFacts)' : '暂无数据') }}
                </div>
              </div>

              <!-- Loading -->
              <div v-if="isSearchingRemote" class="flex flex-col items-center justify-center py-6 text-slate-400">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mb-2"></div>
                <span class="text-xs">正在搜索全球数据库...</span>
              </div>

              <!-- 云端结果列表 -->
              <div v-else-if="remoteResults.length > 0" class="space-y-2">
                <div v-for="(item, idx) in remoteResults" :key="idx"
                     @click="selectPreset(item)"
                     class="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-100 dark:border-zinc-700 flex justify-between items-center cursor-pointer hover:border-blue-400 transition-colors active:scale-[0.99]">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <i class="fas fa-globe text-lg"></i>
                    </div>
                    <div>
                      <div class="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{{ item.name }}</div>
                      <div class="text-[10px] text-slate-400 flex gap-2">
                        <span>{{ item.cal }}kcal/100g</span>
                        <span class="text-blue-400">OFF(CN)</span>
                      </div>
                    </div>
                  </div>
                  <div class="text-blue-500"><i class="fas fa-cloud-download-alt"></i></div>
                </div>
              </div>

              <!-- [兜底方案] 空状态 + 手动录入引导 -->
              <div v-else class="text-center py-6 px-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-700">
                <div class="flex flex-col gap-2 items-center">
                  <i class="fas fa-search-minus text-2xl text-slate-300"></i>
                  <p class="text-xs text-slate-400">本地和云端暂无此食物</p>
                  <!-- [新增] 兜底按钮: 使用智能估算 -->
                  <button @click="forceManualInput"
                          class="mt-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-200 transition-colors">
                    使用智能估算 ({{ form.calories }} kcal)
                  </button>
                </div>
              </div>
            </div>

          </div>
        </transition>

        <!-- Mode A: 快速估算 -->
        <div v-if="activeTab === 'QUICK' && !isSearchMode" class="space-y-6 animate-enter-up">

          <section>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">类别 Category</div>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="(t, idx) in FOOD_TYPES" :key="idx"
                   @click="onTypeChange(idx)"
                   class="relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1 group overflow-hidden"
                   :class="selectedTypeIdx === idx
                     ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                     : 'border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-emerald-200'">
                <div class="z-10 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center h-8">
                  <svg v-if="t.icon.startsWith('icon-')" class="icon text-2xl" aria-hidden="true">
                    <use :xlink:href="'#' + t.icon"></use>
                  </svg>
                  <span v-else class="text-2xl">{{ t.icon }}</span>
                </div>
                <div class="text-xs font-bold z-10" :class="selectedTypeIdx === idx ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-400'">{{ t.label }}</div>

                <div v-if="!isPure && selectedTypeIdx === idx" class="absolute -right-2 -bottom-2 w-8 h-8 bg-emerald-500/10 rounded-full blur-md"></div>
              </div>
            </div>
          </section>

          <section>
            <div class="flex justify-between items-end mb-3">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">份量 Size</div>
              <div class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                {{ currentPortionOptions[selectedPortionIdx].grams }}{{ currentPortionOptions[0].label === '一口' ? 'ml' : 'g' }}
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <div v-for="(p, idx) in currentPortionOptions" :key="idx"
                   @click="selectedPortionIdx = idx"
                   class="flex flex-col items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all"
                   :class="selectedPortionIdx === idx
                     ? 'border-emerald-500 bg-white dark:bg-zinc-800 shadow-sm'
                     : 'border-transparent bg-slate-100 dark:bg-zinc-700/50 opacity-60 hover:opacity-100'">
                <div class="flex items-end gap-0.5 mb-1 h-4">
                  <div v-for="i in (idx + 1)" :key="i"
                       class="w-1 bg-emerald-400 rounded-t-sm"
                       :style="{ height: `${40 + (i * 15)}%` }"></div>
                </div>
                <span class="text-[10px] font-bold">{{ p.label }}</span>
              </div>
            </div>
          </section>

          <section>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">特征 Tags</div>
            <div class="flex flex-wrap gap-2">
              <button v-for="tag in availableTags" :key="tag"
                      @click="toggleTag(tag)"
                      class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                      :class="form.tags.includes(tag)
                         ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-zinc-900 dark:border-slate-100'
                         : 'bg-white dark:bg-zinc-800 text-slate-500 border-slate-200 dark:border-zinc-700 hover:border-slate-300'">
                {{ tag }}
              </button>
            </div>
          </section>

          <div class="mt-4 p-5 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div class="flex justify-between items-center mb-4">
              <div class="flex flex-col gap-1">
                <span class="text-xs text-slate-400 font-bold uppercase">Estimated Energy</span>
                <div class="flex items-baseline gap-1">
                  <span class="text-3xl font-black text-slate-800 dark:text-white">{{ form.calories }}</span>
                  <span class="text-sm font-medium text-slate-400">kcal</span>
                </div>
              </div>

              <div class="flex gap-3 text-center">
                <div class="flex flex-col">
                  <span class="text-[10px] text-slate-400 mb-0.5">P</span>
                  <div class="w-8 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-1">
                    <div class="h-full bg-emerald-500" :style="{width: '60%'}"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ form.p }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] text-slate-400 mb-0.5">C</span>
                  <div class="w-8 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-1">
                    <div class="h-full bg-amber-400" :style="{width: '80%'}"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ form.c }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] text-slate-400 mb-0.5">F</span>
                  <div class="w-8 h-1 bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-1">
                    <div class="h-full bg-rose-400" :style="{width: '40%'}"></div>
                  </div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ form.f }}</span>
                </div>
              </div>
            </div>

            <!-- [新增] 热量计算公式展示 -->
            <div v-if="calcExplanation" class="pt-3 border-t border-slate-100 dark:border-zinc-700">
              <div class="text-[10px] text-slate-400 mb-1 font-bold">计算依据:</div>
              <div class="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-zinc-700/50 p-2 rounded leading-relaxed">
                {{ calcExplanation }} <br>= {{ form.calories }} kcal
              </div>
            </div>
          </div>
        </div>

        <!-- Mode B: 精确录入 (当不处于搜索模式，或用户决定自己输入时) -->
        <div v-else-if="activeTab === 'PRECISE'" class="space-y-4 animate-enter-up">

          <div v-if="!isPure" class="p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs leading-relaxed flex items-start gap-2">
            <i class="fas fa-barcode mt-0.5"></i>
            <span>请查看食品包装背面的营养成分表，输入每 <strong class="underline">100g</strong> 或 <strong class="underline">每份</strong> 的数值。</span>
          </div>

          <!-- 卡片式输入区，填补纯净模式空白 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-slate-100 dark:border-zinc-700 shadow-sm">
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 block">
                {{ isPure ? '热量 (可修改)' : '热量 (Energy)' }}
              </label>
            </div>
            <div class="relative">
              <input v-model.number="form.calories" type="number" placeholder="0"
                     class="w-full h-16 pl-4 pr-12 rounded-xl bg-slate-50 dark:bg-zinc-800 border-2 border-slate-100 dark:border-zinc-700 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none text-3xl font-black transition-colors" />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">kcal</span>
            </div>
            <div v-if="calcExplanation" class="mt-2 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-zinc-700/50 p-1.5 rounded">
              <i class="fas fa-database mr-1"></i> {{ calcExplanation }}
            </div>
          </div>

          <div class="bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-slate-100 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">营养成分 (g)</div>
            <div class="grid grid-cols-3 gap-4">
              <div v-for="(item, key) in {p: '蛋白质', c: '碳水', f: '脂肪'}" :key="key">
                <label class="text-[10px] font-bold text-slate-500 text-center block mb-1.5">{{ item }}</label>
                <div class="relative">
                  <input v-model.number="form[key]" type="number" placeholder="-"
                         class="w-full h-12 text-center rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-emerald-500 outline-none font-bold text-lg" />
                </div>
              </div>
            </div>
          </div>

          <!-- Tags 在纯净模式下也显示，但样式更素 -->
          <div class="bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-slate-100 dark:border-zinc-700 shadow-sm">
            <div class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">标签 (Tags)</div>
            <div class="flex flex-wrap gap-2">
              <button v-for="tag in availableTags" :key="tag"
                      @click="toggleTag(tag)"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                      :class="form.tags.includes(tag) ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-zinc-900' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'">
                {{ tag }}
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- 3. 底部按钮 (仅 RPG 模式显示，纯净模式按钮在顶部) -->
      <div v-if="!isPure" class="p-5 bg-white dark:bg-zinc-800 border-t border-slate-100 dark:border-zinc-700 sticky bottom-0 z-20">
        <button @click="submit"
                class="w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm tracking-wide bg-emerald-500 hover:bg-emerald-600">
          <span>{{ activeTab === 'QUICK' ? '确认添加' : '保存记录' }}</span>
          <i class="fas fa-arrow-right text-xs opacity-70"></i>
        </button>
      </div>

    </div>
  </van-popup>
</template>

<style scoped>
/* 优化滚动条 */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* 必须保留，用于覆盖 van-popup 默认圆角 */
.manual-add-popup {
  overflow: hidden;
  /* 如果不是 Pure 模式，保留顶部圆角；如果是 Pure，则不需要 */
  /* 这里通过动态 style 已经控制了 height 100% 和 round prop，但 CSS 优先级可能较高，所以微调一下 */
}

/* 简单的进入动画 */
.animate-enter-up {
  animation: enterUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes enterUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 去除输入框默认样式 */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Symbol 通用样式 */
.icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
