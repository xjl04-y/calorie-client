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
// 按层级获取节点，用于渲染树
const getTierNodes = (tier: number) => skills.value.filter(s => s.tier === tier);

const canUpgrade = (node: SkillNode) => {
  if (getSkillLevel(node.id) >= node.maxLevel) return false;
  if (sp.value < node.cost) return false;
  if (user.value.level < node.reqLevel) return false;
  if (node.reqCombatPower && heroStats.value.combatPower < node.reqCombatPower) return false;
  if (node.parentId) {
    const parentLv = getSkillLevel(node.parentId);
    if (parentLv === 0) return false;
  }
  return true;
};

const handleUpgrade = (node: SkillNode) => {
  store.heroStore.upgradeSkill(node.id, heroStats.value.combatPower);
};

// 修复 2: 动态计算连接线样式，增加对复杂父子关系的支持
// 简单逻辑：假设同列或相邻列，这里做通用垂直连线
const getConnectorClass = (node: SkillNode) => {
  if (!node.parentId) return '';
  const parentUnlocked = getSkillLevel(node.parentId) > 0;
  // 不同的父子关系可能需要不同的角度，这里简化为垂直高亮
  return parentUnlocked ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-slate-700';
};

// --- 手搓 Pan & Zoom 逻辑 ---
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);

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
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  startX.value = clientX - translateX.value;
  startY.value = clientY - translateY.value;
};

const onTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault(); // 防止页面滚动
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  translateX.value = clientX - startX.value;
  translateY.value = clientY - startY.value;
};

const onTouchEnd = () => {
  isDragging.value = false;
};

// 确保在 PC 上也能拖拽
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

      <!-- 动态网格背景 -->
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
            <div class="text-xs text-slate-400 mb-1">可用 SP 点数</div>
            <div class="text-2xl font-black text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]">{{ sp }}</div>
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
      <div class="flex-1 overflow-hidden relative cursor-move bg-slate-900/50"
           @mousedown="onTouchStart" @mousemove="onTouchMove"
           @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove">

        <div class="absolute inset-0 flex items-start justify-center pt-20 transition-transform duration-75 ease-linear origin-top"
             :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }">

          <div class="flex flex-col items-center gap-24 pb-32">

            <!-- Tier 1 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label">Tier 1 · 基础</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(1)" :key="node.id" class="skill-node-wrapper">
                  <div class="skill-node"
                       :class="[getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked')]"
                       @click.stop="handleUpgrade(node)">
                    <div class="node-icon">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>
                  <div class="node-info">
                    <div class="font-bold text-sm mb-1 text-white">{{ node.name }}</div>
                    <div class="text-[10px] text-slate-300 leading-tight">{{ node.desc }}</div>
                    <div v-if="getSkillLevel(node.id) < node.maxLevel" class="mt-2 text-[10px] font-bold" :class="canUpgrade(node) ? 'text-yellow-400' : 'text-red-500'">
                      {{ canUpgrade(node) ? `消耗 ${node.cost} SP` : '条件未满足' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tier 2 -->
            <div class="relative z-10 tier-group">
              <div class="tier-label">Tier 2 · 进阶</div>
              <div class="flex gap-16 justify-center">
                <div v-for="node in getTierNodes(2)" :key="node.id" class="skill-node-wrapper relative">
                  <!-- 连接线 -->
                  <div class="connector-line-vertical" :class="getConnectorClass(node)"></div>

                  <div class="skill-node"
                       :class="[getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked')]"
                       @click.stop="handleUpgrade(node)">
                    <div class="node-icon">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>
                  <!-- ... 信息浮层 ... -->
                  <div class="node-info">
                    <div class="font-bold text-sm mb-1 text-white">{{ node.name }}</div>
                    <div class="text-[10px] text-slate-300 leading-tight">{{ node.desc }}</div>
                    <div v-if="getSkillLevel(node.id) < node.maxLevel" class="mt-2 text-[10px] font-bold" :class="canUpgrade(node) ? 'text-yellow-400' : 'text-red-500'">
                      {{ canUpgrade(node) ? `消耗 ${node.cost} SP` : '条件未满足' }}
                    </div>
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
                       :class="[getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked')]"
                       @click.stop="handleUpgrade(node)">
                    <div class="node-icon text-3xl">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>
                  <div class="node-info">
                    <div class="font-bold text-sm text-yellow-400 mb-1">{{ node.name }}</div>
                    <div class="text-[10px] text-slate-300 leading-tight">{{ node.desc }}</div>
                    <div v-if="getSkillLevel(node.id) < node.maxLevel" class="mt-2 text-[10px] font-bold" :class="canUpgrade(node) ? 'text-yellow-400' : 'text-red-500'">
                      {{ canUpgrade(node) ? `消耗 ${node.cost} SP` : '条件未满足' }}
                    </div>
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
                       :class="[getSkillLevel(node.id) > 0 ? 'unlocked' : (canUpgrade(node) ? 'available' : 'locked')]"
                       @click.stop="handleUpgrade(node)">
                    <div class="node-icon text-4xl">{{ node.icon }}</div>
                    <div class="node-level">{{ getSkillLevel(node.id) }}/{{ node.maxLevel }}</div>
                  </div>
                  <div class="node-info">
                    <div class="font-bold text-sm text-red-400 mb-1">{{ node.name }}</div>
                    <div class="text-[10px] text-slate-300 leading-tight">{{ node.desc }}</div>
                    <div v-if="getSkillLevel(node.id) < node.maxLevel" class="mt-2 text-[10px] font-bold" :class="canUpgrade(node) ? 'text-yellow-400' : 'text-red-500'">
                      {{ canUpgrade(node) ? `消耗 ${node.cost} SP` : '条件未满足' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
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

/* 修复 Hover 时的遮挡问题 */
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

/* 连接线样式 */
.connector-line-vertical {
  position: absolute;
  top: -100px; /* 向上连接到上一层 */
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
}

.node-info {
  margin-top: 12px;
  text-align: center;
  background: rgba(15, 23, 42, 0.95);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #475569;
  width: 140px;
  position: absolute;
  top: 100%;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-10px) scale(0.9);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.skill-node-wrapper:hover .node-info {
  opacity: 1; transform: translateY(0) scale(1);
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
