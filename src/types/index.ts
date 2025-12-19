// 核心数据接口定义 - V6.0 Updated (Separated Log Types)
export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
// [Refactor V6.0] 分离餐食类型与记录类型
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'HYDRATION' | 'EXERCISE';
export type FoodMealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'; // 仅食物相关
export type LogType = 'FOOD' | 'EXERCISE' | 'HYDRATION'; // 记录类型标识
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

export interface WeightRecord {
  date: string;
  weight: number;
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

// [Refactor V6.0] FoodLog - 仅包含食物相关字段
export interface FoodLog extends FoodItem {
  mealType: MealType; // 保持兼容，实际食物使用 FoodMealType
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
}

// [New V6.0] ExerciseLog - 独立运动记录接口
export interface ExerciseLog {
  id: number | string;
  logType: 'EXERCISE';           // 类型标识
  name: string;                   // 运动名称
  icon: string;                   // 图标
  duration: number;               // 运动时长 (分钟)
  caloriesBurned: number;         // 消耗热量
  timestamp: string;              // 记录时间
  // 计算相关
  userWeight?: number;            // 记录时的用户体重 (用于回溯计算)
  baseExerciseId?: string;        // 基于哪个预设运动
  intensity?: 'LOW' | 'MEDIUM' | 'HIGH'; // 运动强度
  // RPG 模式专属
  healAmount?: number;            // 恢复的 HP
  shieldGained?: number;          // 获得的护盾
  goldGained?: number;            // 溢出转化的金币
  expGained?: number;             // 获得的经验
  tips?: string;                  // 提示信息
  tags?: string[];                // 标签
}

// [New V6.0] HydrationLog - 独立补水记录接口
export interface HydrationLog {
  id: number | string;
  logType: 'HYDRATION';           // 类型标识
  name: string;                   // 饮品名称
  icon: string;                   // 图标 (默认 💧)
  amount: number;                 // 饮水量 (ml)
  timestamp: string;              // 记录时间
  // 可选扩展
  cupSize?: number;               // 使用的杯子容量
  temperature?: 'COLD' | 'WARM' | 'HOT'; // 水温
  type?: 'WATER' | 'TEA' | 'COFFEE' | 'OTHER'; // 饮品类型
  // RPG 模式专属
  healAmount?: number;            // 恢复的 HP (通常为 0 或微量)
  buffEffect?: string;            // 特殊效果 (如清除高盐状态)
}

// [New V6.0] DailyLog - 统一日志联合类型 (向后兼容)
export type DailyLog = FoodLog | ExerciseLog | HydrationLog;

// [New V6.0] 类型守卫函数 - 用于运行时类型判断
export function isExerciseLog(log: DailyLog): log is ExerciseLog {
  return 'logType' in log && log.logType === 'EXERCISE';
}

export function isHydrationLog(log: DailyLog): log is HydrationLog {
  return 'logType' in log && log.logType === 'HYDRATION';
}

export function isFoodLog(log: DailyLog): log is FoodLog {
  // 旧数据没有 logType，通过排除法判断
  if ('logType' in log) return false;
  return 'mealType' in log && !['EXERCISE', 'HYDRATION'].includes((log as FoodLog).mealType);
}

// [New V6.0] 兼容旧数据：判断旧格式的运动/补水记录
export function isLegacyExerciseLog(log: FoodLog): boolean {
  return log.mealType === 'EXERCISE' || log.isExercise === true;
}

export function isLegacyHydrationLog(log: FoodLog): boolean {
  return log.mealType === 'HYDRATION';
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
  // [New V6.1] 记录详情临时状态
  selectedExerciseLog: ExerciseLog | null;
  selectedHydrationLog: HydrationLog | null;
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
