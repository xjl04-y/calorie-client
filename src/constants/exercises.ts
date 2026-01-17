import type { FoodItem } from '@/types';

/**
 * 默认运动项目配置
 * 扩充版 v3.2：Iconfont Symbol (彩色/多色) 适配版
 * * 注意：
 * 此配置中的 icon 字段使用了 Symbol ID (如 'icon-quanji')。
 * 前端渲染时，请使用 svg + use 标签进行引用。
 * 未找到对应 Icon 的项目保留了 Emoji，渲染时请做判断。
 */
export const DEFAULT_EXERCISES: FoodItem[] = [
  // ==========================================
  // 有氧心肺 (基础代谢/耐力)
  // ==========================================
  { id: 'ex_run', name: '跑步 (中速)', originalName: '跑步', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-benpaojiance', tags: ['有氧'], isExercise: true, tips: '持续的奔跑能提升心肺耐力，如同追逐猎物。' },
  { id: 'ex_run_fast', name: '跑步 (高速)', originalName: '快跑', calories: 450, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-kuaipao', tags: ['有氧', '高强度'], isExercise: true, tips: '风驰电掣，燃烧极限卡路里。' },
  { id: 'ex_run_slow', name: '跑步 (慢跑)', originalName: '慢跑', calories: 250, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-zoulu_huabanfuben', tags: ['有氧'], isExercise: true, tips: '保持节奏，调整呼吸，为长途跋涉做准备。' },
  { id: 'ex_walk', name: '快走', originalName: '快走', calories: 150, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-Union', tags: ['有氧'], isExercise: true, tips: '轻松的战备巡逻，积少成多。' },
  { id: 'ex_walk_leisure', name: '散步', originalName: '散步', calories: 100, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-guangjie-moren', tags: ['有氧', '恢复'], isExercise: true, tips: '饭后百步走，活到九十九。' },
  { id: 'ex_swim', name: '游泳 (中速)', originalName: '游泳', calories: 400, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-youyong', tags: ['有氧', '全身'], isExercise: true, tips: '在水中克服阻力，锻炼全身肌肉协调性。' },
  { id: 'ex_swim_leisure', name: '游泳 (慢游)', originalName: '慢游', calories: 250, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-youyong', tags: ['有氧', '恢复'], isExercise: true, tips: '在水中放松身心，享受浮力。' },
  { id: 'ex_cycle', name: '骑行 (户外)', originalName: '骑行', calories: 300, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-qihang', tags: ['有氧'], isExercise: true, tips: '像风骑士一样疾驰，强化腿部力量。' },
  { id: 'ex_spin_cycle', name: '动感单车', originalName: '动感单车', calories: 450, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-donggandanche', tags: ['有氧', '高强度'], isExercise: true, tips: '跟随音乐节奏，疯狂燃烧脂肪。' },
  { id: 'ex_jump_rope', name: '跳绳', originalName: '跳绳', calories: 350, p: 0, c: 0, f: 0, grams: 20, unit: '分钟', icon: 'icon-ic_keep_hiit', tags: ['有氧', '高强度'], isExercise: true, tips: '提升敏捷度与爆发力，虽然枯燥但极有效率。' },
  { id: 'ex_elliptical', name: '椭圆机', originalName: '椭圆机', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-tuoyuanji', tags: ['有氧'], isExercise: true, tips: '模拟太空漫步，保护膝盖的同时燃烧热量。' },
  { id: 'ex_rowing', name: '划船机', originalName: '划船机', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-huachuanji', tags: ['有氧', '背部'], isExercise: true, tips: '模拟划船动作，极大地强化背部与核心。' },
  { id: 'ex_aerobics', name: '健身操', originalName: '健身操', calories: 250, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-wenyiyanchu', tags: ['有氧'], isExercise: true, tips: '跟随节奏律动，提升身体协调性。' },
  { id: 'ex_zumba', name: '尊巴', originalName: '尊巴', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-yundongleixing-tiaowu', tags: ['有氧', '舞蹈'], isExercise: true, tips: '热情奔放的舞蹈，快乐燃脂。' },

  // ==========================================
  // 力量增肌 (攻击力/格挡/护盾)
  // ==========================================
  { id: 'ex_gym_upper', name: '力量训练(上肢)', originalName: '上肢训练', calories: 200, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-yaling1', tags: ['增肌', '力量'], isExercise: true, tips: '强化臂力与肩背，提升武器挥舞的威力。' },
  { id: 'ex_gym_lower', name: '力量训练(下肢)', originalName: '下肢训练', calories: 250, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-shendun', tags: ['增肌', '力量'], isExercise: true, tips: '扎实的马步是战斗的基础，提升负重能力。' },
  { id: 'ex_gym_full', name: '力量训练(全身)', originalName: '全身训练', calories: 300, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-jianshen-', tags: ['增肌', '全身'], isExercise: true, tips: '综合强化，打造无懈可击的身体。' },
  { id: 'ex_pushups', name: '俯卧撑', originalName: '俯卧撑', calories: 50, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-icon_fuwocheng', tags: ['自重', '胸肌'], isExercise: true, tips: '最基础的自重训练，随时随地磨练意志。' },
  { id: 'ex_pullups', name: '引体向上', originalName: '引体向上', calories: 60, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-yintixiangshang', tags: ['自重', '背部'], isExercise: true, tips: '克服地心引力，打造宽阔的背部护甲。' },
  { id: 'ex_squats', name: '深蹲', originalName: '深蹲', calories: 70, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-shendun', tags: ['自重', '腿部'], isExercise: true, tips: '力量之王，能够极大地刺激全身激素分泌。' },
  { id: 'ex_plank', name: '平板支撑', originalName: '平板支撑', calories: 40, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-pingbanzhicheng', tags: ['核心', '耐力'], isExercise: true, tips: '如磐石般静止，锻炼核心肌群的绝对稳定性。' },
  { id: 'ex_crunches', name: '卷腹', originalName: '卷腹', calories: 50, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-juanfu', tags: ['核心', '腹肌'], isExercise: true, tips: '雕刻腹部线条，增强核心爆发力。' },
  { id: 'ex_deadlift', name: '硬拉', originalName: '硬拉', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-dantuiyingla', tags: ['力量', '全身'], isExercise: true, tips: '这一拉，是向大地宣战，调动全身的肌肉链。' },
  { id: 'ex_bench_press', name: '卧推', originalName: '卧推', calories: 200, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-yalingshangxiewotui', tags: ['力量', '胸肌'], isExercise: true, tips: '推开压在身上的重担，强化推力肌群。' },
  { id: 'ex_shoulder_press', name: '推举', originalName: '推举', calories: 180, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-yaling', tags: ['力量', '肩部'], isExercise: true, tips: '举起胜利的荣耀，强化肩部力量。' },
  { id: 'ex_kettlebell', name: '壶铃训练', originalName: '壶铃', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-huling', tags: ['力量', '爆发'], isExercise: true, tips: '结合力量与有氧的全身性训练。' },

  // ==========================================
  // 高强燃脂 (爆发力/连击)
  // ==========================================
  { id: 'ex_hiit', name: 'HIIT', originalName: 'HIIT', calories: 450, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-ic_keep_hiit', tags: ['高强度', '燃脂'], isExercise: true, tips: '高强度间歇训练，让心率如过山车般起伏。' },
  { id: 'ex_boxing', name: '拳击/搏击', originalName: '拳击', calories: 400, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-quanji', tags: ['高强度', '敏捷'], isExercise: true, tips: '挥洒汗水与怒火，提升出拳速度与反应。' },
  { id: 'ex_kickboxing', name: '自由搏击', originalName: '自由搏击', calories: 450, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-quanji', tags: ['高强度', '全身'], isExercise: true, tips: '拳腿并用，全身性的格斗训练。' },
  { id: 'ex_crossfit', name: 'CrossFit', originalName: 'CrossFit', calories: 500, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-a-291', tags: ['高强度', '综合'], isExercise: true, tips: '勇者的试炼场，全面挑战体能极限。' },
  { id: 'ex_burpee', name: '波比跳', originalName: '波比跳', calories: 100, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-icon_bobitiao', tags: ['高强度', '全身'], isExercise: true, tips: '最强减脂动作，每一个都令人想要放弃。' },
  { id: 'ex_sprint', name: '冲刺跑', originalName: '冲刺', calories: 150, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-a-50mipao', tags: ['高强度', '爆发'], isExercise: true, tips: '如猎豹般迅猛，极限速度的爆发。' },

  // ==========================================
  // 柔韧平衡 (闪避/恢复)
  // ==========================================
  { id: 'ex_yoga', name: '瑜伽', originalName: '瑜伽', calories: 100, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-zhiyu', tags: ['柔韧', '恢复'], isExercise: true, tips: '通过古老的体式与呼吸，恢复身心平衡。' },
  { id: 'ex_stretch', name: '拉伸放松', originalName: '拉伸', calories: 50, p: 0, c: 0, f: 0, grams: 15, unit: '分钟', icon: 'icon-lashen', tags: ['恢复'], isExercise: true, tips: '战斗后的整备，缓解肌肉僵硬与疲劳。' },
  { id: 'ex_meditation', name: '冥想', originalName: '冥想', calories: 10, p: 0, c: 0, f: 0, grams: 15, unit: '分钟', icon: 'icon-mingxiang', tags: ['恢复', '精神'], isExercise: true, tips: '静心凝神，清除杂念，提升精神抗性。' },
  { id: 'ex_dance', name: '舞蹈', originalName: '舞蹈', calories: 200, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-yundongleixing-tiaowu', tags: ['柔韧', '有氧'], isExercise: true, tips: '用优雅的步伐迷惑敌人，提升魅力属性。' },
  { id: 'ex_ballet', name: '芭蕾', originalName: '芭蕾', calories: 200, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-baleiwu', tags: ['柔韧', '核心'], isExercise: true, tips: '优雅与力量的结合，极致的控制力。' },
  { id: 'ex_tai_chi', name: '太极', originalName: '太极', calories: 120, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-taiji', tags: ['柔韧', '平衡'], isExercise: true, tips: '以柔克刚，调和阴阳。' },

  // ==========================================
  // 球类竞技 (敏捷/技巧)
  // ==========================================
  { id: 'ex_basketball', name: '篮球', originalName: '篮球', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-lanqiu', tags: ['球类', '爆发'], isExercise: true, tips: '包含跑动、跳跃与对抗的综合训练。' },
  { id: 'ex_soccer', name: '足球', originalName: '足球', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-zuqiu', tags: ['球类', '耐力'], isExercise: true, tips: '在绿茵场上奔跑，大幅提升体能储备。' },
  { id: 'ex_badminton', name: '羽毛球', originalName: '羽毛球', calories: 250, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-yumaoqiu', tags: ['球类', '反应'], isExercise: true, tips: '极速的折返跑与挥拍，锻炼动态视力。' },
  { id: 'ex_tennis', name: '网球', originalName: '网球', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-wangqiu', tags: ['球类', '爆发'], isExercise: true, tips: '贵族的运动，需要强大的臂力与预判。' },
  { id: 'ex_pingpong', name: '乒乓球', originalName: '乒乓球', calories: 150, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-pingpangqiu', tags: ['球类', '反应'], isExercise: true, tips: '国球荣耀，锻炼极速反应能力。' },
  { id: 'ex_volleyball', name: '排球', originalName: '排球', calories: 200, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-paiqiu', tags: ['球类', '爆发'], isExercise: true, tips: '跳跃扣杀，团队配合。' },
  { id: 'ex_baseball', name: '棒球', originalName: '棒球', calories: 180, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-bangqiu', tags: ['球类', '爆发'], isExercise: true, tips: '击球瞬间的爆发力。' },
  { id: 'ex_golf', name: '高尔夫', originalName: '高尔夫', calories: 120, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-gaoerfu', tags: ['球类', '技巧'], isExercise: true, tips: '优雅的挥杆，专注于精准度。' },
  { id: 'ex_billiards', name: '台球', originalName: '台球', calories: 80, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-taiqiu', tags: ['球类', '技巧'], isExercise: true, tips: '冷静的思考与精准的走位。' },
  { id: 'ex_bowling', name: '保龄球', originalName: '保龄球', calories: 100, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: '🎳', tags: ['球类', '技巧'], isExercise: true, tips: '力量与控制的平衡。' },

  // ==========================================
  // 户外休闲 (探索/冒险)
  // ==========================================
  { id: 'ex_hiking', name: '徒步/登山', originalName: '徒步', calories: 300, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-dengshan', tags: ['户外', '耐力'], isExercise: true, tips: '征服山川，开拓视野，在大自然中修行。' },
  { id: 'ex_climbing', name: '攀岩', originalName: '攀岩', calories: 400, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-panyan-', tags: ['户外', '力量'], isExercise: true, tips: '岩壁上的芭蕾，挑战重力与恐惧。' },
  { id: 'ex_skiing', name: '滑雪', originalName: '滑雪', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-huaxue', tags: ['户外', '平衡'], isExercise: true, tips: '雪山飞狐，享受速度与激情的碰撞。' },
  { id: 'ex_snowboarding', name: '单板滑雪', originalName: '单板', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-danbanhuaxue', tags: ['户外', '平衡'], isExercise: true, tips: '雪地冲浪，炫酷的技巧与控制。' },
  { id: 'ex_skating', name: '滑冰', originalName: '滑冰', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-huabingbisai', tags: ['户外', '平衡'], isExercise: true, tips: '冰上起舞，优雅与速度并存。' },
  { id: 'ex_surfing', name: '冲浪', originalName: '冲浪', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-a-03_chonglang', tags: ['户外', '平衡'], isExercise: true, tips: '驾驭波涛，与海洋共舞。' },
  { id: 'ex_skateboarding', name: '滑板', originalName: '滑板', calories: 250, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-huaban', tags: ['户外', '技巧'], isExercise: true, tips: '街头疾驰，挑战平衡与技巧。' },
  { id: 'ex_fishing', name: '钓鱼', originalName: '钓鱼', calories: 80, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-diaoyu', tags: ['户外', '耐心'], isExercise: true, tips: '耐心的博弈，享受静谧时光。' },
  { id: 'ex_camping', name: '露营活动', originalName: '露营', calories: 150, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-louying', tags: ['户外', '综合'], isExercise: true, tips: '搭建营地，野外生存的轻体验。' },

  // ==========================================
  // 生活日常 (日常活跃度)
  // ==========================================
  { id: 'ex_housework', name: '做家务', originalName: '家务', calories: 100, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: 'icon-zhouwudasaochu', tags: ['日常'], isExercise: true, tips: '扫除尘埃，净化居所，也是一种修行。' },
  { id: 'ex_heavy_cleaning', name: '大扫除', originalName: '大扫除', calories: 200, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-zhouwudasaochu', tags: ['日常', '高强度'], isExercise: true, tips: '彻底的清洁，堪比一场健身。' },
  { id: 'ex_walk_dog', name: '遛狗', originalName: '遛狗', calories: 120, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-liugou', tags: ['日常'], isExercise: true, tips: '与忠诚的伙伴一同巡视领地。' },
  { id: 'ex_play_kids', name: '带娃/陪玩', originalName: '带娃', calories: 180, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-daiwarichang', tags: ['日常', '耐力'], isExercise: true, tips: '神兽出笼，比高强度间歇训练还累。' },
  { id: 'ex_stairs', name: '爬楼梯', originalName: '爬楼梯', calories: 100, p: 0, c: 0, f: 0, grams: 10, unit: '分钟', icon: 'icon-palouti', tags: ['日常', '腿部'], isExercise: true, tips: '放弃电梯，征服垂直高度。' },
  { id: 'ex_shopping', name: '逛街', originalName: '逛街', calories: 100, p: 0, c: 0, f: 0, grams: 60, unit: '分钟', icon: 'icon-guangjie-moren', tags: ['日常'], isExercise: true, tips: '负重（购物袋）行走，考验耐心的试炼。' },
  { id: 'ex_moving', name: '搬运重物', originalName: '搬运', calories: 300, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: 'icon-a-291', tags: ['日常', '力量'], isExercise: true, tips: '生活中的大力士，注意保护腰部。' },
  { id: 'ex_cooking', name: '烹饪', originalName: '烹饪', calories: 80, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: '🍳', tags: ['日常'], isExercise: true, tips: '洗切炒煮，为美味付出的劳动。' }
];
