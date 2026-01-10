<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/counter';
import type { SkillNode } from '@/types';

const store = useGameStore();

const show = computed({
  get: () => store.modals.skillTree,
  set: (val) => store.setModal('skillTree', val)
});

const user = computed(() => store.user);
const heroStats = computed(() => store.heroStats);
const skills = computed(() => store.heroStore.skillTree);
const learned = computed(() => user.value.learnedSkills || {});
const sp = computed(() => user.value.skillPoints);

const getSkillLevel = (id: string) => learned.value[id] || 0;
const getTierNodes = (tier: number) => (skills.value || []).filter(s => s.tier === tier);

const canUpgrade = (node: SkillNode) => {
  const currentLevel = getSkillLevel(node.id);
  if (currentLevel >= node.maxLevel) return false;
  if (sp.value < node.cost) return false; // 技能点不足
  if (user.value.level < node.reqLevel) return false;
  if (node.reqCombatPower && heroStats.value.combatPower < node.reqCombatPower) return false;
  if (node.parentId) {
    const parentLv = getSkillLevel(node.parentId);
    if (parentLv === 0) return false;
  }
  return true;
};

// 选中的技能节点（用于显示操作按钮）
const selectedSkillId = ref<string | null>(null);
// 查看详情的技能节点
const detailSkillId = ref<string | null>(null);
// 详情弹窗显示状态
const showDetailPopup = computed({
  get: () => detailSkillId.value !== null,
  set: (val) => { if (!val) detailSkillId.value = null; }
});

// 点击技能节点
const handleSkillClick = (node: SkillNode) => {
  if (hasMoved) return;

  if (selectedSkillId.value === node.id) {
    selectedSkillId.value = null;
  } else {
    selectedSkillId.value = node.id;
  }
};

const viewSkillDetail = (node: SkillNode) => {
  detailSkillId.value = node.id;
};

const closeSkillDetail = () => {
  detailSkillId.value = null;
};

const detailSkill = computed(() => {
  if (!detailSkillId.value) return null;
  return skills.value?.find(n => n.id === detailSkillId.value) || null;
});

const confirmUpgrade = (node: SkillNode) => {
  store.heroStore.upgradeSkill(node.id, heroStats.value.combatPower);
  selectedSkillId.value = null;
};

// --- [Fix] 核心修复：全能的技能效果格式化函数 ---
const formatSkillEffect = (target: string, value: number): string => {
  // 百分比类 (通常是 0.05 这种小数)
  const pct = (val: number) => `${(val * 100).toFixed(0)}%`;
  const pct1 = (val: number) => `${(val * 100).toFixed(1)}%`;

  // 数值类 (通常是整数)
  const flat = (val: number) => Math.round(val);

  switch (target) {
    // 基础属性
    case 'bmr': return `基础代谢 +${flat(value)}`;
    case 'hp_max': return `生命上限 +${flat(value)}`;
    case 'str_mult': return `力量 +${pct(value)}`;
    case 'agi_mult': return `敏捷 +${pct(value)}`;
    case 'vit_mult': return `体质 +${pct(value)}`;
    case 'all_stat': return `全属性 +${pct(value)}`;

    // 资源收益
    case 'exp_rate': return `经验获取 +${pct(value)}`;
    case 'gold_mult': return `金币获取 +${pct(value)}`;
    case 'quest_gold': return `任务金币 +${pct(value)}`;
    case 'quest_exp': return `任务经验 +${pct(value)}`;
    case 'battle_gold': return `战斗金币 +${pct(value)}`;
    case 'all_exp': return `全来源经验 +${pct(value)}`;
    case 'cook_exp': return `烹饪经验 +${pct(value)}`;

    // 战斗属性
    case 'block_pct': return `格挡率 +${pct(value)}`;
    case 'crit_rate': return `暴击率 +${pct(value)}`;
    case 'crit_dmg': return `暴击伤害 +${pct(value)}`;
    case 'dodge_flat': return `闪避率 +${pct(value)}`;
    case 'reflect_dmg': return `反弹伤害 +${pct(value)}`;
    case 'lifesteal': return `攻击吸血 +${pct1(value)}`;
    case 'ignore_def': return `无视防御 +${pct(value)}`;
    case 'dmg_reduce': return `固定减伤 +${flat(value)}`;
    case 'heal_mult': return `治疗效果 +${pct(value)}`;
    case 'shield_cap': return `护盾上限 +${pct(value)}`;
    case 'shield_dmg': return `护盾转攻击 +${pct(value)}`;
    case 'shield_dr': return `护盾减伤 +${pct(value)}`;

    // 特殊机制
    case 'combo_window': return `连击窗口 +${flat(value)}分钟`;
    case 'max_eat': return `进食上限 +${flat(value)}kcal`;
    case 'day_heal': return `日间回复 +${flat(value)}`;
    case 'meat_heal': return `肉类回复 +${pct(value)}`;
    case 'veg_exp': return `蔬菜经验 +${pct(value)}`;
    case 'clean_bonus': return `纯净加成 +${pct(value)}`;
    case 'fruit_bonus': return `水果效果 +${pct(value)}`;
    case 'night_crit': return `夜间暴击 +${pct(value)}`;
    case 'low_hp_dmg': return `低血增伤系数 +${pct1(value)}`;
    case 'low_hp_block': return `低血格挡系数 +${pct1(value)}`;
    case 'bad_food_resist': return `垃圾食品抗性 +${pct(value)}`;

    // 主动技能/终极天赋
    case 'HUMAN_PRAYER': return '主动：双倍经验转化';
    case 'ELF_FOCUS': return '主动：必爆且无视防御';
    case 'ORC_RAGE': return '主动：三倍伤害但扣血';
    case 'DWARF_DRINK': return '主动：格挡反击并吸血';
    case 'reflect': return '格挡反弹50%伤害';
    case 'berserk': return '狂战士：免死+伤害翻倍';
    case 'dodge_cap': return '闪避上限提升';
    case 'meat_master': return '肉类效果翻倍';
    case 'cal_to_gold': return '卡路里转金币';
    case 'combo_lock': return '连击时间锁定';

    default: return `效果系数 +${value}`;
  }
};

// 计算技能效果描述 (Generic)
const getEffectDescription = (node: SkillNode) => {
  const currentLv = getSkillLevel(node.id);
  const nextLv = currentLv + 1;

  if (currentLv >= node.maxLevel) {
    return '已达到最大等级';
  }

  // 对于主动技能或特殊机制，可能没有简单的数值增长
  if (node.type === 'ACTIVE_BUFF' || node.tier >= 4) {
    return node.desc;
  }

  const next = node.effectParams.base + (nextLv - 1) * node.effectParams.scale;
  // const increase = next - (currentLv > 0 ? current : 0); // 这里的增量显示逻辑稍微简化

  // 直接显示下一级的总效果通常更直观
  return formatSkillEffect(node.effectParams.target, next);
};

// 计算下一级效果
const getNextLevelEffect = (node: SkillNode) => {
  const currentLv = getSkillLevel(node.id);
  const nextLv = currentLv + 1;

  if (nextLv > node.maxLevel) return '已满级';

  const next = node.effectParams.base + (nextLv - 1) * node.effectParams.scale;
  return formatSkillEffect(node.effectParams.target, next);
};

// 计算当前等级的总效果
const getCurrentLevelEffect = (node: SkillNode) => {
  const currentLv = getSkillLevel(node.id);

  if (currentLv === 0) return '未学习';

  const current = node.effectParams.base + (currentLv - 1) * node.effectParams.scale;
  return formatSkillEffect(node.effectParams.target, current);
};

const getConnectorClass = (node: SkillNode) => {
  if (!node.parentId) return '';
  const parentUnlocked = getSkillLevel(node.parentId) > 0;
  return parentUnlocked ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-slate-700';
};

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const dragStartX = ref(0);
const dragStartY = ref(0);
let hasMoved = false;

const resetView = () => {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
};

const zoom = (delta: number) => {
  const newScale = scale.value + delta;
  if (newScale >= 0.5 && newScale <= 2.0) {
    scale.value = newScale;
  }
};

const onTouchStart = (e: TouchEvent | MouseEvent) => {
  isDragging.value = true;
  hasMoved = false;
  let clientX = 0;
  let clientY = 0;

  if ('touches' in e && e.touches && e.touches.length > 0 && e.touches[0]) {
    const touchEvent = e as TouchEvent;
    if (touchEvent.touches && touchEvent.touches.length > 0 && touchEvent.touches[0]) {
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    }
  } else if ('clientX' in e) {
    const mouseEvent = e as MouseEvent;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  startX.value = clientX - translateX.value;
  startY.value = clientY - translateY.value;
  dragStartX.value = clientX;
  dragStartY.value = clientY;
};

const onTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return;

  let clientX = 0;
  let clientY = 0;

  if ('touches' in e && e.touches && e.touches.length > 0 && e.touches[0]) {
    const touchEvent = e as TouchEvent;
    if (touchEvent.touches && touchEvent.touches.length > 0 && touchEvent.touches[0]) {
      clientX = touchEvent.touches[0].clientX;
      clientY = touchEvent.touches[0].clientY;
    }
  } else if ('clientX' in e) {
    const mouseEvent = e as MouseEvent;
    clientX = mouseEvent.clientX;
    clientY = mouseEvent.clientY;
  }

  const deltaX = Math.abs(clientX - dragStartX.value);
  const deltaY = Math.abs(clientY - dragStartY.value);

  if (deltaX > 5 || deltaY > 5) {
    hasMoved = true;
    if ('preventDefault' in e) {
      e.preventDefault();
    }
  }

  const newX = clientX - startX.value;
  const newY = clientY - startY.value;

  translateX.value = newX;
  translateY.value = newY;
};

const onTouchEnd = () => {
  isDragging.value = false;
  setTimeout(() => {
    hasMoved = false;
  }, 50);
};

onMounted(() => {
  window.addEventListener('mouseup', onTouchEnd);
  window.addEventListener('touchend', onTouchEnd);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', onTouchEnd);
  window.removeEventListener('touchend', onTouchEnd);
});
</script>

<template>
  <van-popup v-model:show="show" position="bottom" round :style="{ height: '90%' }" class="dark:bg-slate-950 overflow-hidden flex flex-col">
    <div class="flex flex-col h-full bg-[#0f172a] text-white relative overflow-hidden">
      <!-- 装饰背景 -->
      <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 pointer-events-none"></div>
      <div class="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

      <!-- Header -->
      <div class="p-4 bg-slate-900/90 backdrop-blur border-b border-slate-700 z-50 flex justify-between items-center shadow-lg relative">
        <div>
          <h2 class="text-xl font-rpg text-yellow-400 tracking-wider flex items-center">
            <i class="fas fa-dungeon mr-2"></i>天赋地牢
          </h2>
          <div class="text-[10px] text-slate-400 mt-1">
            <span class="mr-2"><i class="fas fa-user"></i> {{ heroStats.raceName }}</span>
            <span><i class="fas fa-fist-raised"></i> 战力 {{ heroStats.combatPower }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex flex-col items-end mr-4">
            <div class="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <i class="fas fa-coins"></i> 技能点余额
            </div>
            <div class="text-2xl font-black drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]"
                 :class="sp > 0 ? 'text-yellow-400 animate-pulse' : 'text-slate-500'">
              {{ sp }}
            </div>
          </div>
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95" @click="show = false">
            <i class="fas fa-times"></i>
          </div>
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="absolute bottom-6 right-6 z-50 flex flex-col gap-2">
        <button @click="zoom(0.1)" class="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 text-white shadow-lg active:scale-95 text-xl flex items-center justify-center">+</button>
        <button @click="resetView" class="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 text-white shadow-lg active:scale-95 text-xs flex items-center justify-center">1:1</button>
        <button @click="zoom(-0.1)" class="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 text-white shadow-lg active:scale-95 text-xl flex items-center justify-center">-</button>
      </div>

      <!-- Draggable Area -->
      <div class="flex-1 overflow-hidden relative bg-slate-900/50 cursor-grab active:cursor-grabbing"
           style="touch-action: none;"
           @mousedown="onTouchStart" @mousemove="onTouchMove"
           @touchstart="onTouchStart" @touchmove="onTouchMove"
           @click="(e) => { if (e.target === e.currentTarget && !hasMoved) selectedSkillId = null; }"
           @touchend="(e) => { if (e.target === e.currentTarget && !hasMoved) selectedSkillId = null; }">

        <div class="absolute inset-0 flex items-start justify-center pt-20 origin-top will-change-transform"
             :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
             @click="(e) => { if (e.target === e.currentTarget && !hasMoved) selectedSkillId = null; }"
             @touchend="(e) => { if (e.target === e.currentTarget && !hasMoved) selectedSkillId = null; }">

          <div class="flex flex-col items-center gap-24 pb-32">

            <!-- Tier 1 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label">Tier 1 · 基础</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(1)" :key="node.id" class="skill-node-wrapper">
                  <div class="skill-node"
                       :class="[
                         getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked'),
                         selectedSkillId === node.id ? 'selected' : ''
                       ]"
                       @click.stop="handleSkillClick(node)"
                       @touchend.stop="(e) => { if (!hasMoved) { e.preventDefault(); handleSkillClick(node); } }">
                    <div class="node-icon">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>

                  <!-- 操作按钮 -->
                  <div v-if="selectedSkillId === node.id" class="action-button-container">
                    <button v-if="getSkillLevel(node.id) === 0 && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn learn">
                      <i class="fas fa-star"></i> 学习
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <button v-else-if="getSkillLevel(node.id) > 0 && getSkillLevel(node.id) < node.maxLevel && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn upgrade">
                      <i class="fas fa-arrow-up"></i> 升级
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <div v-else-if="getSkillLevel(node.id) >= node.maxLevel" class="action-btn maxed">
                      <i class="fas fa-check-circle"></i> 已学满
                    </div>
                    <div v-else class="action-btn disabled">
                      <i class="fas fa-lock"></i> 条件不足
                    </div>
                    <button @click.stop="viewSkillDetail(node)"
                            @touchend.stop="(e) => { e.preventDefault(); viewSkillDetail(node); }"
                            class="action-btn detail">
                      <i class="fas fa-info-circle"></i> 详情
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tier 2 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label">Tier 2 · 进阶</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(2)" :key="node.id" class="skill-node-wrapper relative">
                  <div class="connector-line-vertical" :class="getConnectorClass(node)"></div>

                  <div class="skill-node"
                       :class="[
                         getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked'),
                         selectedSkillId === node.id ? 'selected' : ''
                       ]"
                       @click.stop="handleSkillClick(node)"
                       @touchend.stop="(e) => { if (!hasMoved) { e.preventDefault(); handleSkillClick(node); } }">
                    <div class="node-icon">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>

                  <div v-if="selectedSkillId === node.id" class="action-button-container">
                    <button v-if="getSkillLevel(node.id) === 0 && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn learn">
                      <i class="fas fa-star"></i> 学习
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <button v-else-if="getSkillLevel(node.id) > 0 && getSkillLevel(node.id) < node.maxLevel && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn upgrade">
                      <i class="fas fa-arrow-up"></i> 升级
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <div v-else-if="getSkillLevel(node.id) >= node.maxLevel" class="action-btn maxed">
                      <i class="fas fa-check-circle"></i> 已学满
                    </div>
                    <div v-else class="action-btn disabled">
                      <i class="fas fa-lock"></i> 条件不足
                    </div>
                    <button @click.stop="viewSkillDetail(node)"
                            @touchend.stop="(e) => { e.preventDefault(); viewSkillDetail(node); }"
                            class="action-btn detail">
                      <i class="fas fa-info-circle"></i> 详情
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tier 3 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label">Tier 3 · 专精</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(3)" :key="node.id" class="skill-node-wrapper relative">
                  <div class="connector-line-vertical" :class="getConnectorClass(node)"></div>

                  <div class="skill-node ultimate"
                       :class="[
                         getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked'),
                         selectedSkillId === node.id ? 'selected' : ''
                       ]"
                       @click.stop="handleSkillClick(node)"
                       @touchend.stop="(e) => { if (!hasMoved) { e.preventDefault(); handleSkillClick(node); } }">
                    <div class="node-icon text-3xl">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>

                  <div v-if="selectedSkillId === node.id" class="action-button-container">
                    <button v-if="getSkillLevel(node.id) === 0 && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn learn">
                      <i class="fas fa-star"></i> 学习
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <button v-else-if="getSkillLevel(node.id) > 0 && getSkillLevel(node.id) < node.maxLevel && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn upgrade">
                      <i class="fas fa-arrow-up"></i> 升级
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <div v-else-if="getSkillLevel(node.id) >= node.maxLevel" class="action-btn maxed">
                      <i class="fas fa-check-circle"></i> 已学满
                    </div>
                    <div v-else class="action-btn disabled">
                      <i class="fas fa-lock"></i> 条件不足
                    </div>
                    <button @click.stop="viewSkillDetail(node)"
                            @touchend.stop="(e) => { e.preventDefault(); viewSkillDetail(node); }"
                            class="action-btn detail">
                      <i class="fas fa-info-circle"></i> 详情
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tier 4 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label text-red-500">Tier 4 · 终极奥义</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(4)" :key="node.id" class="skill-node-wrapper relative">
                  <div class="connector-line-vertical" :class="getConnectorClass(node)"></div>

                  <div class="skill-node legendary"
                       :class="[
                         getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked'),
                         selectedSkillId === node.id ? 'selected' : ''
                       ]"
                       @click.stop="handleSkillClick(node)"
                       @touchend.stop="(e) => { if (!hasMoved) { e.preventDefault(); handleSkillClick(node); } }">
                    <div class="node-icon text-4xl">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>

                  <div v-if="selectedSkillId === node.id" class="action-button-container">
                    <button v-if="getSkillLevel(node.id) === 0 && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn learn">
                      <i class="fas fa-star"></i> 学习
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <button v-else-if="getSkillLevel(node.id) > 0 && getSkillLevel(node.id) < node.maxLevel && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn upgrade">
                      <i class="fas fa-arrow-up"></i> 升级
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <div v-else-if="getSkillLevel(node.id) >= node.maxLevel" class="action-btn maxed">
                      <i class="fas fa-check-circle"></i> 已学满
                    </div>
                    <div v-else class="action-btn disabled">
                      <i class="fas fa-lock"></i> 条件不足
                    </div>
                    <button @click.stop="viewSkillDetail(node)"
                            @touchend.stop="(e) => { e.preventDefault(); viewSkillDetail(node); }"
                            class="action-btn detail">
                      <i class="fas fa-info-circle"></i> 详情
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tier 5 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label text-purple-400 text-base font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]">Tier 5 · 巅峰传说</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(5)" :key="node.id" class="skill-node-wrapper relative">
                  <div class="connector-line-vertical" :class="getConnectorClass(node)"></div>

                  <div class="skill-node legendary"
                       :class="[
                         getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked'),
                         selectedSkillId === node.id ? 'selected' : ''
                       ]"
                       @click.stop="handleSkillClick(node)"
                       @touchend.stop="(e) => { if (!hasMoved) { e.preventDefault(); handleSkillClick(node); } }">
                    <div class="node-icon text-5xl animate-pulse">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>

                  <div v-if="selectedSkillId === node.id" class="action-button-container">
                    <button v-if="getSkillLevel(node.id) === 0 && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn learn">
                      <i class="fas fa-star"></i> 觉醒
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <button v-else-if="getSkillLevel(node.id) > 0 && getSkillLevel(node.id) < node.maxLevel && canUpgrade(node)"
                            @click.stop="confirmUpgrade(node)"
                            @touchend.stop="(e) => { e.preventDefault(); confirmUpgrade(node); }"
                            class="action-btn upgrade">
                      <i class="fas fa-arrow-up"></i> 强化
                      <div class="effect-hint">{{ getEffectDescription(node) }}</div>
                    </button>
                    <div v-else-if="getSkillLevel(node.id) >= node.maxLevel" class="action-btn maxed">
                      <i class="fas fa-check-circle"></i> 已登峰
                    </div>
                    <div v-else class="action-btn disabled">
                      <i class="fas fa-lock"></i> 条件不足
                    </div>
                    <button @click.stop="viewSkillDetail(node)"
                            @touchend.stop="(e) => { e.preventDefault(); viewSkillDetail(node); }"
                            class="action-btn detail">
                      <i class="fas fa-info-circle"></i> 详情
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </van-popup>

  <!-- 技能详情弹窗 -->
  <van-popup v-model:show="showDetailPopup" position="center" round :style="{ width: '90%', maxWidth: '400px' }" class="dark:bg-slate-950">
    <div v-if="detailSkill" class="bg-slate-900 text-white p-6 rounded-2xl">
      <!-- 标题 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="text-4xl">{{ detailSkill.icon }}</div>
          <div>
            <h3 class="text-xl font-bold text-yellow-400">{{ detailSkill.name }}</h3>
            <div class="text-xs text-slate-400">{{ detailSkill.desc }}</div>
          </div>
        </div>
        <button @click="closeSkillDetail" class="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- 当前等级 -->
      <div class="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div class="flex justify-between items-center">
          <span class="text-sm text-slate-300">当前等级</span>
          <span class="text-lg font-bold text-cyan-400">Lv.{{ getSkillLevel(detailSkill.id) }} / {{ detailSkill.maxLevel }}</span>
        </div>
      </div>

      <!-- 当前效果 -->
      <div v-if="getSkillLevel(detailSkill.id) > 0" class="mb-4">
        <div class="text-sm text-slate-400 mb-2">当前效果</div>
        <div class="p-3 bg-emerald-900/30 rounded-lg border border-emerald-700/50">
          <div class="text-emerald-300 font-medium">{{ getCurrentLevelEffect(detailSkill) }}</div>
        </div>
      </div>

      <!-- 下一级效果 -->
      <div v-if="getSkillLevel(detailSkill.id) < detailSkill.maxLevel" class="mb-4">
        <div class="text-sm text-slate-400 mb-2">下一级效果</div>
        <div class="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <div class="text-blue-300 font-medium">{{ getNextLevelEffect(detailSkill) }}</div>
        </div>
      </div>

      <!-- 需求信息 -->
      <div class="mb-4">
        <div class="text-sm text-slate-400 mb-2">学习条件</div>
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-coins w-4" :class="store.heroStore.user.skillPoints >= detailSkill.cost ? 'text-yellow-400' : 'text-red-400'"></i>
            <span :class="store.heroStore.user.skillPoints >= detailSkill.cost ? 'text-slate-300' : 'text-red-400'">
              技能点: {{ detailSkill.cost }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <i class="fas fa-level-up-alt w-4" :class="store.heroStore.user.level >= detailSkill.reqLevel ? 'text-yellow-400' : 'text-red-400'"></i>
            <span :class="store.heroStore.user.level >= detailSkill.reqLevel ? 'text-slate-300' : 'text-red-400'">
              等级: Lv.{{ detailSkill.reqLevel }}
            </span>
          </div>
          <div v-if="detailSkill.reqCombatPower" class="flex items-center gap-2 text-sm">
            <i class="fas fa-fist-raised w-4" :class="heroStats.combatPower >= detailSkill.reqCombatPower ? 'text-yellow-400' : 'text-red-400'"></i>
            <span :class="heroStats.combatPower >= detailSkill.reqCombatPower ? 'text-slate-300' : 'text-red-400'">
              战力: {{ detailSkill.reqCombatPower }}
            </span>
          </div>
          <div v-if="detailSkill.parentId" class="flex items-center gap-2 text-sm">
            <i class="fas fa-link w-4" :class="getSkillLevel(detailSkill.parentId) > 0 ? 'text-yellow-400' : 'text-red-400'"></i>
            <span :class="getSkillLevel(detailSkill.parentId) > 0 ? 'text-slate-300' : 'text-red-400'">
              前置技能已学习
            </span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2">
        <button v-if="getSkillLevel(detailSkill.id) < detailSkill.maxLevel && canUpgrade(detailSkill)"
                @click="confirmUpgrade(detailSkill); closeSkillDetail();"
                class="flex-1 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:from-yellow-600 hover:to-orange-600 transition-all">
          <i class="fas fa-star mr-2"></i>{{ getSkillLevel(detailSkill.id) === 0 ? '学习' : '升级' }}
        </button>
        <button @click="closeSkillDetail"
                class="px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-all">
          关闭
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.bg-grid {
  background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

.tier-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tier-label {
  font-size: 10px;
  color: #64748b;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 24px;
  background: rgba(15, 23, 42, 0.8);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #334155;
}

.skill-node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 80px;
}
.skill-node-wrapper:hover {
  z-index: 50;
}

/* 操作按钮容器 */
.action-button-container {
  position: absolute;
  top: 100%;
  margin-top: 8px;
  z-index: 100;
  animation: fadeInUp 0.2s ease-out;
  pointer-events: auto; /* 按钮可以点击 */
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 操作按钮样式 */
.action-btn {
  min-width: 120px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

/* 学习按钮 */
.action-btn.learn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  border: 2px solid #fbbf24;
}
.action-btn.learn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(251, 191, 36, 0.4);
}
.action-btn.learn:active {
  transform: translateY(0);
}

/* 升级按钮 */
.action-btn.upgrade {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: 2px solid #10b981;
}
.action-btn.upgrade:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
}
.action-btn.upgrade:active {
  transform: translateY(0);
}

/* 已学满 */
.action-btn.maxed {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
  border: 2px solid rgba(168, 85, 247, 0.3);
  cursor: default;
}

/* 条件不足 */
.action-btn.disabled {
  background: rgba(71, 85, 105, 0.5);
  color: #94a3b8;
  border: 2px solid rgba(71, 85, 105, 0.3);
  cursor: not-allowed;
}

/* 详情按钮 */
.action-btn.detail {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: 2px solid #3b82f6;
  margin-top: 4px;
}
.action-btn.detail:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
}
.action-btn.detail:active {
  transform: translateY(0);
}

/* 效果提示 */
.effect-hint {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.9;
  font-weight: normal;
}

/* 选中状态 */
.skill-node.selected {
  animation: selectedPulse 0.3s ease-out;
  border-width: 3px;
}

@keyframes selectedPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.connector-line-vertical {
  position: absolute;
  top: -100px;
  left: 50%;
  width: 2px;
  height: 100px;
  transform: translateX(-50%);
  z-index: 0;
  transition: background-color 0.5s ease;
}

.skill-node {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  position: relative;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  background-color: #1e293b;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  pointer-events: auto; /* 确保可以点击 */
}

.skill-node:active { transform: scale(0.95); }

.skill-node.ultimate {
  width: 72px; height: 72px; border-width: 3px; border-radius: 50%;
}
.skill-node.legendary {
  width: 80px; height: 80px; border-width: 3px; border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}
.skill-node.legendary.locked { border-color: #450a0a; box-shadow: none; }
.skill-node.legendary.available { animation: pulse-red 2s infinite; }

.skill-node.locked {
  border-color: #334155; color: #475569; filter: grayscale(100%); background-color: #0f172a;
}
.skill-node.available {
  border-color: #fbbf24; color: #fbbf24; animation: pulse-gold 2s infinite; background-color: #1e293b;
}
.skill-node.unlocked {
  border-color: #a855f7;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(126, 34, 206, 0.4));
  color: #fff;
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.node-icon { font-size: 26px; margin-bottom: 2px; }

.node-level {
  font-size: 9px; font-weight: bold; background: rgba(0,0,0,0.8);
  padding: 1px 5px; border-radius: 4px; position: absolute; bottom: -6px;
  border: 1px solid rgba(255,255,255,0.1);
  pointer-events: none; /* 防止阻挡点击 */
}

.node-info {
  display: none; /* 隐藏悬停提示，使用操作按钮代替 */
}

@keyframes pulse-gold {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
}
@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
</style>
