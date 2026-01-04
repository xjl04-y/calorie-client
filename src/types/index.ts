1// 核心数据接口定义 - V5.2 Updated (Quest Types)
export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'HYDRATION' | 'EXERCISE';
export type Gender = 'MALE' | 'FEMALE';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// [New V5.8] 目标与推荐设置
export type DietGoal = 'LOSE' | 'MAINTAIN' | 'GAIN';
export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

export interface TargetConfig {
  mode: 'AUTO' | 'MANUAL'; // 自动推荐 or 手动锁定
  goal: DietGoal;          // 目标
  activityLevel: ActivityLevel; // 活动系数
  manualBMR?: number;      // 手动设定的值
}
export interface Food {
  id: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // 新增 tags 字段，用于存储 ["MEAT", "DRINK", "COOKED"] 等标签
  tags?: string[];
  rarity?: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  image?: string;
  price?: number;
  // ... existing code ...
}
// V2.5: 技能节点
export interface SkillNode {
  id: string;
  tier: number;
  parentId?: string;
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
  reqLevel: number;
  reqCombatPower?: number;
  cost: number;
  type: 'PASSIVE_STAT' | 'PASSIVE_BMR' | 'ACTIVE_BUFF';
  effectParams: { target: string; base: number; scale: number };
  effectType?: string;
}

// V3.2: 任务定义
// [PM Fix] 扩充任务类型：LOW_SUGAR, CUSTOM
export interface Quest {
  id: string;
  title: string;
  desc: string;
  rarity: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
  target: number;
  current: number;
  type: 'COUNT' | 'PROTEIN' | 'VEG' | 'WATER' | 'CALORIE_CONTROL' | 'LOW_CARB' | 'LOW_FAT' | 'LOW_SUGAR' | 'CUSTOM';
  rewardExp: number;
  status: 'AVAILABLE' | 'ACCEPTED' | 'COMPLETED' | 'CLAIMED';
  // 自定义任务的额外校验规则
  template?: {
    keyword?: string;
    tag?: string;
    excludeTag?: string;
    metric?: 'COUNT' | 'CALORIES';
  };
}

// 基础体重记录（两种模式共享）
export interface WeightRecord {
  date: string;               // YYYY-MM-DD
  weight: number;             // 体重 (kg)
  timestamp?: string;         // 记录时间戳 ISO
  bmi?: number;               // BMI指数（可选）
  bodyFatRate?: number;       // 体脂率（可选，未来扩展）
  note?: string;              // 备注（可选）
}

// RPG模式体态趋势数据
export interface RPGTrendData extends WeightRecord {
  // 游戏化数据
  combatPowerChange?: number;    // 战力变化
  attributeChanges?: {           // 属性变化
    str: number;                 // 力量变化
    agi: number;                 // 敏捷变化
    vit: number;                 // 体质变化
  };
  achievements?: string[];       // 解锁的成就ID
  milestones?: {                 // 里程碑事件
    type: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'TARGET_REACHED' | 'BREAKTHROUGH';
    value: number;
    title: string;
    icon: string;
  }[];
  storyNode?: string;            // 故事节点标记
}

// 纯净模式体态趋势数据
export interface PureTrendData extends WeightRecord {
  // 专业数据
  bmi: number;                   // BMI指数（必需）
  bodyFatRate?: number;          // 体脂率（未来扩展）
  changeRate?: number;           // 变化率 (kg/周)
  healthScore?: number;          // 健康评分 0-100
  insights?: TrendInsight[];     // 数据洞察
  professionalMetrics?: {        // 专业指标
    weeklyAverage: number;       // 周平均体重
    monthlyTrend: 'UP' | 'DOWN' | 'STABLE'; // 月度趋势
    targetDiff: number;          // 与目标体重的差距
    volatility: number;          // 波动性指数
  };
}

// 数据洞察接口
export interface TrendInsight {
  type: 'WARNING' | 'SUCCESS' | 'INFO';
  message: string;
  suggestions?: string[];
}

// 联合类型
export type BodyTrendData = WeightRecord | RPGTrendData | PureTrendData;

// 类型守卫函数
export function isRPGTrendData(data: BodyTrendData): data is RPGTrendData {
  return 'attributeChanges' in data || 'achievements' in data || 'milestones' in data;
}

export function isPureTrendData(data: BodyTrendData): data is PureTrendData {
  return 'healthScore' in data || 'insights' in data || 'professionalMetrics' in data;
}

export interface Race {
  name: string;
  icon: string;
  desc: string;
  bonus: string;
  prefixes: string[];
  growth: { str: number; agi: number; vit: number };
}

export interface NpcConfig {
  name: string;
  title: string;
  icon: string;
  greeting: string;
}

export interface EnvironmentEffect {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: 'BUFF' | 'DEBUFF';
  multiplier: number;
  color: string;
}

export interface UserState {
  isInitialized: boolean;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  baseBMR: number;
  nickname: string;
  avatarSeed: string;
  avatarType?: 'SEED' | 'CUSTOM';
  customAvatar?: string;
  race: RaceType;
  gender: Gender;
  height: number;
  weight: number;
  weightHistory: WeightRecord[];
  age: number;
  heroCurrentHp: number;
  heroMaxHp: number;
  heroShield: number; // [New V6.2] 护盾值
  equipped: Record<SlotType, number | null>;
  skillPoints: number;
  learnedSkills: Record<string, number>;
  activeSkillId: string | null;
  activeSkillCd: number;
  loginStreak: number;
  lastLoginDate: string;
  gold: number;
  inventory: Record<string, number>;

  // [修复工单01] 交易历史记录
  transactionHistory?: TransactionRecord[];

  // [体力系统] 新增体力字段
  stamina?: number;
  maxStamina?: number;

  hydration: {
    dailyTargetCups: number;
    cupSizeMl: number;
    reminderInterval: number;
    enableNotifications: boolean;
    lastDrinkTime?: number;
  };
  fasting: {
    isFasting: boolean;
    startTime: number;
    targetHours: number;
  };
  targetConfig: TargetConfig;
}

export interface ModalState {
  addFood: boolean;
  addExercise: boolean;
  quantity: boolean;
  manualAdd: boolean;
  hydration: boolean;
  fasting: boolean;
  targetConfig: boolean;

  levelUp: boolean;
  achievements: boolean;
  skillTree: boolean;
  rebirth: boolean;

  unlock: boolean;
  itemDetail: boolean;
  historyDetail: boolean;
  logDetail: boolean;
  hpHistory: boolean;
  dailyReport: boolean;

  onboarding: boolean;
  equipmentSwap: boolean;
  questBoard: boolean;
  npcGuide: boolean;
  settings: boolean;
  shop: boolean;
  inventory: boolean;  // [背包功能] 新增背包弹窗

  // [New V6.1] 记录详情弹窗
  exerciseLogDetail: boolean;
  hydrationLogDetail: boolean;

  // [New] 体态趋势详情
  bodyTrendDetail: boolean;

  // [交易记录弹窗] 金币和经验流水账本
  transactionHistory: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  effect: 'REBIRTH' | 'HEAL' | 'EXP';
  value?: number;
}

export interface InitUserForm {
  race: RaceType;
  nickname: string;
  gender: Gender;
  height: number;
  weight: number;
  age: number;
}

export interface FoodItem {
  id: number | string;
  name: string;
  originalName?: string;
  displayName?: string;
  icon: string;
  calories: number;
  p: number;
  c: number;
  f: number;
  grams: number;
  unit?: string;
  category?: string;
  tags?: string[];
  tips?: string;
  isComposite?: boolean;
  isPreset?: boolean;
  usageCount?: number;
  ingredients?: FoodItem[];
  isExercise?: boolean;
}

export interface FoodLog extends FoodItem {
  mealType: MealType;
  quantity?: number;
  multiplier?: number;
  comboCount?: number;
  timestamp: string;
  damageTaken?: number;
  blocked?: number;
  dodged?: boolean;
  gainedExp?: number;
  healed?: number;
  skillEffect?: string;
  finalDamageValue?: number;
  fastingHours?: number;

  // [指令1] 新增精确回溯字段 - 解决"无法精确扣除已获得的奖励"问题
  generatedGold?: number;   // 记录该条目产出了多少金币
  generatedExp?: number;    // 记录产出了多少经验
  wasLevelUp?: boolean;     // 标记是否触发了升级(用于高级回滚)
}

// 运动记录类型
export interface ExerciseLog {
  id: number | string;
  logType: 'EXERCISE';
  name: string;
  icon: string;
  duration: number;           // 运动时长（分钟）
  caloriesBurned: number;     // 消耗的卡路里
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH'; // 运动强度
  baseExerciseId?: string;    // 基础运动ID
  userWeight?: number;        // 记录时的体重
  tags?: string[];            // 标签
  tips?: string;              // 备注
  timestamp: string;          // 记录时间

  // RPG 效果字段
  healAmount?: number;        // 治疗量
  shieldGained?: number;      // 获得的护盾
  goldGained?: number;        // 获得的金币
  generatedExp?: number;      // 获得的经验
}

// 补水记录类型
export interface HydrationLog {
  id: number | string;
  logType: 'HYDRATION';
  name: string;
  icon: string;
  amount: number;             // 饮水量（ml）
  type?: 'WATER' | 'TEA' | 'COFFEE' | 'OTHER'; // 饮品类型
  temperature?: 'COLD' | 'WARM' | 'HOT'; // 水温
  tags?: string[];            // 标签
  timestamp: string;          // 记录时间

  // RPG 效果字段
  healAmount?: number;        // 治疗量
  buffEffect?: string;        // Buff 效果描述
  generatedGold?: number;     // 获得的金币
  generatedExp?: number;      // 获得的经验
}

export interface Monster {
  name: string;
  icon: string;
  weakness: string;
  weaknessType: string;
  desc?: string;
}

export interface Achievement {
  id: number;
  name: string;
  desc: string;
  condition: string;
  icon: string;
  unlocked: boolean;
  reward: string;
  slot: SlotType;
  rarity: ItemRarity;
  flavor: string;
  stats: string;
  combatPower: number;
  bonusBMR: number;
}

export interface DailyReportData {
  date: string;
  totalCalories: number;
  targetBMR: number;
  status: 'VICTORY' | 'DEFEAT' | 'DRAW';
  expGained: number;
  goldGained: number;
  monsterName: string;
  loginStreak: number;
}

export interface SystemTempState {
  activeMealType: MealType;
  isBuilding: boolean;
  basket: FoodItem[];
  isShaking: boolean;
  isDamaged: boolean;
  searchResetTrigger: number;
  activeSlot: SlotType | null;
  selectedHistoryDate: string | null;
  selectedItem: FoodItem | null;
  unlockedAchievement: Achievement | null;
  selectedLog: FoodLog | null;
  selectedExerciseLog: ExerciseLog | null;  // 选中的运动记录
  selectedHydrationLog: HydrationLog | null; // 选中的补水记录
  pendingItem?: FoodItem;
  floatingTexts: FloatingText[];
  reportData: DailyReportData | null;
  isHealing: boolean;
  isCrit: boolean;
  attackVfx: string | null;
  projectile: { show: boolean, icon: string, id: number } | null;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP';
  x: number;
  y: number;
}

// --- [PM Add] 新增：AI 分析服务接口 ---
// 用于 aiService.ts 的类型检查，完全独立，不影响上方任何类型

export interface AIAnalysisRequest {
  user: UserState;         // 传入完整用户状态以便 AI 判断等级、种族、BMR
  logs: FoodLog[];         // 传入今日记录
  targetBMR: number;       // 今日目标热量
  prompt?: string;         // 用户自定义提问
}

export interface AIAnalysisResponse {
  success: boolean;
  analysis: string;        // 核心分析文本
  suggestions: string[];   // 建议列表 ( bullet points )
  score: number;           // 健康评分 0-100
  buffGranted?: {          // AI 可能会给予的临时 Buff
    type: 'EXP' | 'GOLD' | 'ATK';
    value: number;
    desc: string;
  };
  error?: string;
}

// [PM Add] 连胜系统辅助接口 (State 中已有 UserState.loginStreak，此接口用于 UI 展示)
export interface DailyStreakInfo {
  days: number;
  bonusExp: number;
  bonusGold: number;
  isFrozen: boolean; // 是否使用了时光怀表
}

// [PM Add] 连胜系统核心状态接口 (Fix: 之前遗漏的接口定义)
export interface DailyStreak {
  currentStreak: number;
  lastLoginDate: string; // ISO Date String YYYY-MM-DD
  maxStreak: number;
}

// === [阶段一] 资产闭环 - 交易类型与流水定义 ===

// 交易类型：覆盖所有资产流转场景
export type TransactionType =
  // 基础货币交易
  | 'BATTLE_REWARD'      // 战斗胜利奖励
  | 'QUEST_REWARD'       // 任务完成奖励
  | 'SHOP_PURCHASE'      // 商店消费
  | 'SYSTEM_GRANT'       // 系统发放
  | 'LEVEL_UP'           // 升级奖励
  // 物品相关交易
  | 'ITEM_BUY'           // 商店购买道具（金币→道具）
  | 'ITEM_USE'           // 使用道具（消耗库存）
  | 'ITEM_OBTAIN'        // 战斗/任务/宝箱掉落获得道具
  // 特殊奖励
  | 'ACHIEVEMENT_REWARD' // 成就解锁奖励
  | 'CHECKIN_BONUS'      // 每日签到/连胜奖励
  | 'SYSTEM_ROLLBACK';   // 系统回滚

// 交易记录接口：支持金币、经验、物品三种资产
export interface TransactionRecord {
  timestamp: string;           // 交易时间戳（ISO格式）
  type: TransactionType;       // 交易类型（可溯源）
  currency: 'GOLD' | 'EXP' | 'ITEM'; // 资产类型
  amount: number;              // 变动数量（正数=收入，负数=支出）
  balanceAfter?: number;       // 交易后余额（用于核对）
  itemId?: string;             // 物品ID（当currency为ITEM时必填）
  itemName?: string;           // 物品名称（用于显示）
  source: string;              // 来源描述（用户可读）
}
