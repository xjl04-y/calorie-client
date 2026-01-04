import type { FoodItem } from '@/types';

interface VocabSet {
  origin: string[];    // 地名/产地
  material: string[];  // 材质/等级 (皇家, 粗糙, 秘制)
  prefix: string[];    // 形容词前缀 (美味的, 发光的)
  suffix: string[];    // 名词后缀 (大餐, 篮子)
}

// --- 海量词库定义 (大幅扩充以解决单一化问题) ---

const CULTURAL_FLAVOR: Record<string, Record<string, VocabSet>> = {
  // ================= HUMAN (人类) =================
  HUMAN: {
    general: {
      origin: [
        '暴风城', '闪金镇', '赤脊山', '西部荒野', '洛丹伦', '库尔提拉斯',
        '达拉然', '南海镇', '米奈希尔', '狮王之傲', '湖畔镇', '夜色镇', '北郡修道院'
      ],
      material: [
        '宫廷', '皇家', '贵族', '骑士', '老式', '经典', '手工', '秘制', '特选',
        '酒馆', '行军', '庆典', '丰收', '港口', '花园'
      ],
      prefix: [
        '热腾腾的', '金色的', '著名的', '主厨推荐', '母亲的', '士兵的',
        '传奇的', '国王的', '狮心的', '联盟的', '温暖的'
      ],
      suffix: ['定食', '便当', '拼盘', '套餐', '烩饭', '派', '篮子', '大餐', '特饮', '锅']
    }
  },

  // ================= ORC (兽人) =================
  ORC: {
    meat: {
      origin: [
        '奥格瑞玛', '战歌峡谷', '霜狼氏族', '纳格兰', '地狱火', '黑石山',
        '屠魔峡谷', '怒水河', '十字路口', '剃刀岭', '格罗姆高'
      ],
      material: [
        '雷霆', '猛犸', '裂蹄', '塔布羊', '狂暴', '酋长', '督军',
        '先祖', '荣耀', '鲜血', '怒火', '战争', '部落'
      ],
      prefix: [
        '带骨', '厚切', '生猛', '巨型', '撕裂', '血腥', '烧焦的',
        '烟熏', '风干', '大块', '血淋淋的', '充满力量的'
      ],
      suffix: ['排', '肉块', '盛宴', '腿肉', '碎块', '杂碎', '堆', '大肉']
    },
    general: {
      origin: [
        '贫瘠之地', '雷霆崖', '回音群岛', '杜隆塔尔', '森金村', '棘齿城', '试炼谷'
      ],
      material: [
        '粗糙', '坚硬', '带刺', '荆棘', '仙人掌', '巫毒', '萨满', '图腾', '苦工'
      ],
      prefix: [
        '战地', '掠夺', '野战', '行军', '军团', '氏族', '力量', '幸存者'
      ],
      suffix: ['口粮', '供给', '残渣', '糊', '杂烩', '干粮', '补给']
    }
  },

  // ================= ELF (精灵) =================
  ELF: {
    meat: {
      origin: ['奎尔萨拉斯', '银月城', '远行者居所', '晴风村', '逐日岛'],
      material: ['秘制', '风行者', '游侠', '陆行鸟', '山猫', '凤凰', '逐日者'],
      prefix: ['月光', '净化', '仪式', '优雅的', '清淡的', '微光的', '附魔的'],
      suffix: ['膳食', '薄片', '肉卷', '肉糜', '前菜']
    },
    fruit: {
      origin: [
        '泰达希尔', '月光林地', '海加尔', '苏拉玛', '阿苏纳', '瓦尔莎拉',
        '永歌森林', '太阳井', '梦境林地'
      ],
      material: [
        '永恒', '星光', '晨露', '魔力', '太阳', '远古', '虚空', '幻象',
        '水晶', '翡翠', '奥术', '法力', '月神'
      ],
      prefix: [
        '发光的', '纯净的', '世界树的', '低语的', '神圣的', '禁忌的', '晶莹的'
      ],
      suffix: ['果实', '甘露', '精华', '切片', '之种', '花蜜', '沙拉']
    },
    general: {
      origin: ['达纳苏斯', '黑海岸', '灰谷', '费伍德', '冬泉谷'],
      material: ['高阶', '上层精灵', '德鲁伊', '月神', '织法者', '守望者', '哨兵'],
      prefix: ['精致的', '魔法', '祝福的', '自然的', '星界', '森林'],
      suffix: ['点心', '饼干', '脆饼', '小食', '茶点']
    }
  },

  // ================= DWARF (矮人) =================
  DWARF: {
    drink: {
      origin: ['铁炉堡', '黑石深渊', '鹰巢山', '卡兹莫丹', '烈酒村'],
      material: ['黑铁', '铜须', '蛮锤', '雷酒', '深渊', '熔炉', '国王', '探险者'],
      prefix: ['烈性', '窖藏', '起泡的', '陈年', '桶装', '高山', '加冰', '火焰'],
      suffix: ['麦酒', '酿', '黑啤', '大杯酒', '特饮', '狂欢']
    },
    general: {
      origin: [
        '丹莫罗', '洛克莫丹', '湿地', '暮光高地', '格瑞姆巴托', '荒芜之地'
      ],
      material: [
        '岩石', '矿石', '花岗岩', '玄武岩', '蒸汽', '机械', '火药', '符文', '工匠'
      ],
      prefix: [
        '烟熏', '石化', '坚固的', '风干', '腌制', '油炸', '高热量', '矿工'
      ],
      suffix: ['砖', '干粮', '配给', '肉肠', '炖菜', '块', '铁板']
    }
  }
};

// --- 辅助函数 ---

const getCategory = (tags: string[]) => {
  if (tags.includes('ALCOHOL') || tags.includes('DRINK')) return 'drink';
  if (tags.includes('MEAT')) return 'meat';
  if (tags.includes('FRUIT')) return 'fruit';
  return 'general';
};

// 确定性随机：保证同一个 Food ID 在同一个种族下，永远叫同一个名字
const getStableRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 10000) / 10000;
};

// 从数组中安全获取元素
const pick = (arr: string[], rand: number) => {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(rand * 1000) % arr.length];
};

// --- 核心命名逻辑 ---

export const getFoodDisplayName = (food: FoodItem, isRpgMode: boolean, userRace: string = 'HUMAN'): string => {
  if (!isRpgMode) return food.originalName || food.name;

  // 1. 获取词库
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raceConfig = CULTURAL_FLAVOR[userRace] || CULTURAL_FLAVOR['HUMAN'];
  const category = getCategory(food.tags || []);
  const vocab = raceConfig[category] || raceConfig.general || CULTURAL_FLAVOR['HUMAN'].general;

  // 2. 随机种子
  const foodId = String(food.id || 'temp');
  const baseSeed = foodId + userRace;
  const randPattern = getStableRandom(baseSeed + 'pattern');
  const rand1 = getStableRandom(baseSeed + '1');
  const rand2 = getStableRandom(baseSeed + '2');

  const originalName = food.originalName || food.name;

  // 3. 智能清洗：只保留核心名称
  // 移除括号、空格后的说明文等 (例: "Cranberry Juice (Frozen)" -> "Cranberry Juice")
  const baseName = originalName.replace(/[\(（\[【].*?[\)）\]】]/g, '').trim();

  let rpgName = baseName;
  const isLongName = baseName.length > 4;

  if (isLongName) {
    // --- “特产化” 逻辑 (针对长名字) ---
    // 目标：让长名字听起来像是一个有来头的特产，而不仅仅是加个形容词

    if (randPattern < 0.3) {
      // 模式 A: [地名]·[认证/材质] + [基名] (30%)
      // 例：暴风城·宫廷 蔓越莓汁 / 铁炉堡·陈年 蔓越莓汁
      // 这种格式非常有RPG特产感，中间的点号增加了仪式感
      const origin = pick(vocab.origin, rand1);
      const material = pick(vocab.material, rand2);
      // 如果基名里已经包含了材质词，就只用地名
      rpgName = baseName.includes(material) ? `${origin}特产·${baseName}` : `${origin}·${material}${baseName}`;
    }
    else if (randPattern < 0.6) {
      // 模式 B: [认证/材质] + [基名] + [短后缀] (30%)
      // 例：皇家 蔓越莓汁 特饮 / 雷酒 蔓越莓汁 酿
      const material = pick(vocab.material, rand1);
      // 尝试找一个短后缀
      const shortSuffixes = vocab.suffix.filter(s => s.length <= 2);
      const suffix = shortSuffixes.length > 0 ? pick(shortSuffixes, rand2) : '';

      rpgName = `${material}${baseName}${suffix}`;
    }
    else if (randPattern < 0.8) {
      // 模式 C: [地名]特供·[基名] (20%)
      // 例：狮王之傲特供·蔓越莓汁
      const origin = pick(vocab.origin, rand2);
      rpgName = `${origin}特供·${baseName}`;
    }
    else {
      // 模式 D: [形容词] + [地名] + [基名] (20%)
      // 例：美味的 达拉然 蔓越莓汁 (仅当形容词短时使用)
      const prefix = pick(vocab.prefix, rand1);
      const origin = pick(vocab.origin, rand2);
      // 如果名字实在太长，就简化
      if (baseName.length > 6) {
        rpgName = `${origin}·${baseName}`;
      } else {
        rpgName = `${prefix}${origin}·${baseName}`;
      }
    }

  } else {
    // --- 完整丰富模式 (短名字专用) ---
    // 名字短，可以加更多修饰

    if (randPattern < 0.25) {
      // 地名 + 材质 + 名
      const origin = pick(vocab.origin, rand1);
      const material = pick(vocab.material, rand2);
      rpgName = `${origin}·${material}${baseName}`;
    }
    else if (randPattern < 0.50) {
      // 地名 + 前缀 + 名
      const origin = pick(vocab.origin, rand1);
      const prefix = pick(vocab.prefix, rand2);
      rpgName = `${origin}·${prefix}${baseName}`;
    }
    else if (randPattern < 0.75) {
      // 材质 + 名 + 后缀
      const material = pick(vocab.material, rand1);
      const suffix = pick(vocab.suffix, rand2);
      rpgName = `${material}${baseName}${suffix}`;
    }
    else {
      // 前缀 + 名 + 后缀
      const prefix = pick(vocab.prefix, rand1);
      const suffix = pick(vocab.suffix, rand2);
      rpgName = `${prefix}${baseName}${suffix}`;
    }
  }

  // 5. 最终组合
  return `${rpgName} [${originalName}]`;
};

export const getFoodDisplayDesc = (food: FoodItem, isRpgMode: boolean, userRace: string = 'HUMAN'): string => {
  if (!isRpgMode) return food.tips || '';

  const category = getCategory(food.tags || []);
  const rand = getStableRandom((food.id?.toString() || 'temp') + 'desc');

  if (userRace === 'ORC') {
    if (category === 'meat') return rand > 0.5 ? '充满野性的肉块，能极大地补充怒气！' : '为了部落！吃饱了才有力气战斗。';
    return '虽然粗糙，但能让你在贫瘠之地活下去。';
  }

  if (userRace === 'ELF') {
    if (category === 'fruit') return '这种果实沐浴着太阳井的光辉生长，异常甜美。';
    if (category === 'meat') return '经过净化的食材，去除了所有野性与血腥。';
    return '一份优雅的膳食，哪怕在冒险中也不能失去体面。';
  }

  if (userRace === 'DWARF') {
    if (category === 'drink') return '铜须家族的最爱！一杯下去暖洋洋的。';
    return '像岩石一样坚硬，但这正是矮人喜欢的口感，非常耐饿。';
  }

  return `一份${userRace}风格的食物，看起来很有特色。`;
};
