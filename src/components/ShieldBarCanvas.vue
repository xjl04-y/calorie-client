<template>
  <div class="shield-canvas-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

// --- Props 定义 ---
// 完全由外部数据驱动，不自己维护状态
const props = defineProps<{
  currentHp: number;
  maxHp: number;
  currentShield: number;
  maxShield: number;
}>();

// --- 核心配置 ---
// 适当缩小尺寸以适应 HUD，或者保持原样通过 CSS 缩放
const CONFIG = {
  // 逻辑画布尺寸 (内部物理计算用)
  canvasWidth: 480,
  canvasHeight: 110, // 紧凑的分层布局

  // 血条在画布中的尺寸
  barWidth: 440,
  barHeight: 28, // 适中的血条高度

  hexRadius: 8, //稍微调小一点
  hexGap: 2,

  colorShield: '#00eaff',
  colorHit: '#ffffff',
  colorBg: 'rgba(20, 25, 30, 0.8)', // 半透明背景适配 HUD
  colorHpStart: '#dc2626',
  colorHpEnd: '#f87171',

  sweepSpeed: 6.0,
  sweepInterval: 180,
  assemblySpeed: 0.05,
  impactForce: 10,
  friction: 0.9,
  shakeIntensity: 6
};

// --- 类型定义 ---
interface ImpactRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  width: number;
}
type SystemState = 'EMPTY' | 'ASSEMBLING' | 'IDLE' | 'SHATTERING';

// --- 工具函数 ---
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// --- 物理类 (HexCell) ---
class HexCell {
  row: number; col: number;
  targetXRel: number; targetYRel: number;
  x: number = 0; y: number = 0;
  vx: number = 0; vy: number = 0;
  shockX: number = 0; shockY: number = 0;
  life: number = 0;
  highlight: number = 0;
  isActive: boolean = false;
  morphProgress: number = 0;
  breathOffset: number;

  constructor(row: number, col: number) {
    this.row = row; this.col = col;
    const r = CONFIG.hexRadius;
    const h = r * Math.sin(Math.PI / 3);
    const xOffset = (col * (2 * h + CONFIG.hexGap)) + (row % 2) * h;
    const yOffset = row * (1.5 * r + CONFIG.hexGap * 0.8);

    // 居中计算，并确保不超出左边界
    this.targetXRel = Math.max(-CONFIG.barWidth / 2, xOffset - CONFIG.barWidth / 2 + 10);
    this.targetYRel = yOffset - CONFIG.barHeight / 2 + 5;
    this.breathOffset = Math.random() * 100;
    this.reset(true);
  }

  reset(hidden = false) {
    if (hidden) {
      this.life = 0; this.isActive = false; return;
    }
    this.life = 1; this.highlight = 0; this.morphProgress = 0;
    this.vx = 0; this.vy = 0; this.shockX = 0; this.shockY = 0;
    this.isActive = true;
  }

  // 生成时从画布外飞入
  spawn(cx: number, cy: number) {
    const angle = random(0, Math.PI * 2);
    const dist = random(100, 200); // 距离改小，适应小画布
    this.x = cx + Math.cos(angle) * dist;
    this.y = cy + Math.sin(angle) * dist;
    this.isActive = true;
    this.life = 1;
  }

  update(state: SystemState, originX: number, originY: number, sweepPos: number, shieldPixelWidth: number) {
    const targetX = originX + this.targetXRel;
    const targetY = originY + this.targetYRel;
    const relativeRightBound = -CONFIG.barWidth / 2 + shieldPixelWidth;
    const isInRange = this.targetXRel < relativeRightBound;

    if (state === 'ASSEMBLING') {
      if (isInRange) {
        this.isActive = true;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = CONFIG.assemblySpeed + (dist > 50 ? 0.05 : 0.1);
        this.x += dx * speed;
        this.y += dy * speed;
        // 限制不超出左边界
        this.x = Math.max(originX - CONFIG.barWidth / 2, this.x);
        this.life = Math.min(1, this.life + 0.05);
        if (dist < 10) this.morphProgress += 0.1;
        else this.morphProgress = 0;
        if (this.morphProgress > 1) this.morphProgress = 1;
      } else {
        this.isActive = false; this.life = 0;
      }
    } else if (state === 'IDLE') {
      if (isInRange) {
        this.isActive = true;
        this.life = Math.min(1, this.life + 0.1);
        this.morphProgress = 1;
      } else {
        this.isActive = false;
        this.life = Math.max(0, this.life - 0.2);
      }
      if (this.isActive) {
        const desiredX = targetX + this.shockX;
        const desiredY = targetY + this.shockY;
        this.shockX *= CONFIG.friction; this.shockY *= CONFIG.friction;
        if (Math.abs(this.shockX) < 0.1) this.shockX = 0;
        if (Math.abs(this.shockY) < 0.1) this.shockY = 0;
        // 限制不超出左边界
        this.x = Math.max(originX - CONFIG.barWidth / 2, desiredX);
        this.y = desiredY;
        const distToSweep = Math.abs(this.targetXRel - sweepPos);
        if (distToSweep < 40) this.highlight = Math.max(this.highlight, (40 - distToSweep) / 40);
        this.highlight *= 0.92;
        const breath = Math.sin(Date.now() * 0.002 + this.breathOffset);
        if (breath > 0.95) this.highlight += 0.05;
      }
    } else if (state === 'SHATTERING') {
      if (this.isActive) {
        this.morphProgress -= 0.08;
        if (this.morphProgress < 0) this.morphProgress = 0;
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.4;
        const fadeSpeed = this.morphProgress < 0.1 ? 0.05 : 0.02;
        this.life -= fadeSpeed;
      } else {
        this.life = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, isHit: boolean) {
    if (this.life <= 0) return;
    const r = CONFIG.hexRadius - 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.morphProgress < 0.8) {
      const size = (1 + this.morphProgress * 3);
      ctx.fillStyle = isHit ? CONFIG.colorHit : CONFIG.colorShield;
      ctx.globalAlpha = isHit ? 1.0 : this.life * 0.8;
      ctx.beginPath(); ctx.fillRect(-size / 2, -size / 2, size, size); ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i;
        const px = r * Math.cos(angle); const py = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const breath = Math.sin(Date.now() * 0.002 + this.breathOffset);
      let baseAlpha = 0.15 + this.highlight * 0.6;
      if (!isHit && breath > 0.8) baseAlpha += 0.1;
      const alpha = isHit ? 0.9 : baseAlpha * this.life;
      ctx.fillStyle = isHit ? CONFIG.colorHit : CONFIG.colorShield;
      ctx.globalAlpha = alpha; ctx.fill();
      ctx.strokeStyle = isHit ? CONFIG.colorHit : CONFIG.colorShield;
      ctx.lineWidth = 1; ctx.globalAlpha = isHit ? 1.0 : 0.4 * this.life; ctx.stroke();
      if ((this.row + this.col) % 3 === 0 && !isHit) {
        ctx.fillStyle = CONFIG.colorShield; ctx.globalAlpha = 0.8 * this.life;
        ctx.fillRect(-1, -1, 2, 2);
      }
    }
    ctx.restore();
  }

  applyImpact(impactX: number, impactY: number, force: number) {
    if (!this.isActive) return;
    const dx = this.x - impactX; const dy = this.y - impactY;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
    if (dist < 100) {
      const power = (100 - dist) / 100;
      const move = power * force;
      this.shockX += (dx/dist) * move; this.shockY += (dy/dist) * move;
    }
  }

  explode() {
    if (!this.isActive) return;
    const angle = random(0, Math.PI * 2); const speed = random(3, 8);
    this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
    this.morphProgress = random(0.5, 0.9);
  }
}

// --- 物理系统 ---
class ShieldSystem {
  cells: HexCell[] = [];
  state: SystemState = 'EMPTY';

  // 内部数值缓存
  maxHp = 100; hp = 100;
  maxShield = 100; shield = 0;

  sweepTimer = 0; shakeTimer = 0; shakePower = 0;
  impactRings: ImpactRing[] = [];

  // 画布中心 (逻辑坐标)
  cx = CONFIG.canvasWidth / 2;
  cy = CONFIG.canvasHeight / 2;

  constructor() {
    this.initGrid();
  }

  initGrid() {
    this.cells = [];
    const r = CONFIG.hexRadius;
    const h = r * Math.sin(Math.PI / 3);
    const cols = Math.ceil(CONFIG.barWidth / (2 * h)) + 2;
    const rows = Math.ceil(CONFIG.barHeight / (1.5 * r)) + 2;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        this.cells.push(new HexCell(i, j));
      }
    }
  }

  // 同步 HP (不触发特效)
  syncHp(cur: number, max: number) {
    this.hp = cur; this.maxHp = max;
  }

  // 护盾增加
  addShieldEffect(cur: number, max: number) {
    const isNewAssembly = this.state === 'EMPTY' || this.state === 'SHATTERING';
    this.shield = cur; this.maxShield = max;
    if (isNewAssembly && cur > 0) {
      this.cells.forEach(p => { p.reset(); p.spawn(this.cx, this.cy); });
      this.state = 'ASSEMBLING';
      this.sweepTimer = -200;
      setTimeout(() => { if (this.state === 'ASSEMBLING') this.state = 'IDLE'; }, 1000);
    } else {
      // 如果是从有盾状态增加，确保状态正确
      if (this.state === 'SHATTERING') this.state = 'IDLE';
    }
  }

  // 护盾受伤/减少 - 增强打击感
  takeDamageEffect(cur: number, max: number, damageAmount: number) {
    this.shield = cur; this.maxShield = max;
    // 如果没有处于破碎状态，才播放受击
    if (this.state !== 'SHATTERING' && this.state !== 'EMPTY') {
      const isCrit = damageAmount > 20;
      const force = isCrit ? 18 : 8; // 增强冲击力
      const shieldPixelW = (this.shield / this.maxShield * CONFIG.barWidth);
      // 受击点限制在护盾条范围内
      const hitX = this.cx - CONFIG.barWidth / 2 + Math.random() * shieldPixelW;
      const hitY = this.cy + (Math.random() - 0.5) * CONFIG.barHeight;

      this.shakeTimer = isCrit ? 10 : 5; // 增强震动时长
      this.shakePower = isCrit ? CONFIG.shakeIntensity * 1.5 : CONFIG.shakeIntensity * 0.8; // 增强震动强度

      this.cells.forEach(c => c.applyImpact(hitX, hitY, force));
      // 多重冲击波提升打击感
      this.impactRings.push({ x: hitX, y: hitY, r: 5, maxR: isCrit ? 80 : 40, alpha: 1.0, width: isCrit ? 4 : 2 });
      if (isCrit) {
        setTimeout(() => {
          this.impactRings.push({ x: hitX, y: hitY, r: 10, maxR: 120, alpha: 0.6, width: 2 });
        }, 50);
      }
    }
  }

  // 护盾破碎 - 增强破碎打击感
  shatterEffect() {
    if (this.state === 'SHATTERING' || this.state === 'EMPTY') return;
    this.state = 'SHATTERING';
    this.shield = 0;
    this.cells.forEach(c => c.explode());
    this.shakeTimer = 15; this.shakePower = 15; // 加强破碎震动
    // 多层冲击波营造爆炸感
    this.impactRings.push({ x: this.cx, y: this.cy, r: 10, maxR: 250, alpha: 0.8, width: 5 });
    setTimeout(() => {
      this.impactRings.push({ x: this.cx, y: this.cy, r: 20, maxR: 200, alpha: 0.5, width: 3 });
    }, 80);
    setTimeout(() => {
      this.impactRings.push({ x: this.cx, y: this.cy, r: 5, maxR: 150, alpha: 0.3, width: 2 });
    }, 150);
  }

  draw(ctx: CanvasRenderingContext2D) {
    let sx = 0, sy = 0;
    if (this.shakeTimer > 0) {
      sx = (Math.random() - 0.5) * this.shakePower;
      sy = (Math.random() - 0.5) * this.shakePower;
      this.shakeTimer--; this.shakePower *= 0.85;
    }

    ctx.save();
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight); // 局部清除
    ctx.translate(sx, sy);

    const bx = this.cx - CONFIG.barWidth / 2;
    const by = this.cy - CONFIG.barHeight / 2;

    // 1. 精致的背景容器（带圆角和内阴影）
    const cornerRadius = 18;
    
    // 外层光晕
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 3;
    
    // 背景容器
    ctx.fillStyle = CONFIG.colorBg;
    ctx.beginPath();
    ctx.roundRect(bx - 4, by - 4, CONFIG.barWidth + 8, CONFIG.barHeight + 8, cornerRadius);
    ctx.fill();
    ctx.restore();
    
    // 内部容器（深色背景）
    ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
    ctx.fill();

    // 2. HP 条前景（带渐变和光泽）
    const safeMaxHp = this.maxHp || 100;
    const hpW = (this.hp / safeMaxHp) * CONFIG.barWidth;
    if (hpW > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
      ctx.clip();
      
      // HP 渐变
      const grad = ctx.createLinearGradient(bx, by, bx, by + CONFIG.barHeight);
      grad.addColorStop(0, CONFIG.colorHpStart);
      grad.addColorStop(0.5, CONFIG.colorHpEnd);
      grad.addColorStop(1, CONFIG.colorHpStart);
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, hpW, CONFIG.barHeight);
      
      // 高光效果
      const glossGrad = ctx.createLinearGradient(bx, by, bx, by + CONFIG.barHeight * 0.5);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(bx, by, hpW, CONFIG.barHeight * 0.5);
      
      ctx.restore();
    }

    // 3. 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
    ctx.stroke();

    // 2. 护盾逻辑
    if (this.state !== 'EMPTY') {
      const safeMaxShield = this.maxShield || 100;
      let shieldW = (this.shield / safeMaxShield) * CONFIG.barWidth;
      const isHit = this.shakeTimer > 0;

      this.sweepTimer += CONFIG.sweepSpeed;
      const cycle = CONFIG.barWidth + CONFIG.sweepInterval;
      let sweepPos = (this.sweepTimer % cycle) - CONFIG.barWidth / 2;

      ctx.save();
      if (this.state !== 'SHATTERING') {
        ctx.beginPath(); ctx.rect(bx, by, shieldW, CONFIG.barHeight); ctx.clip();
        if (this.shield > 0 && !isHit) {
          ctx.fillStyle = 'rgba(0, 234, 255, 0.05)';
          ctx.fillRect(bx, by, shieldW, CONFIG.barHeight);
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      let activeCount = 0;
      this.cells.forEach(c => {
        c.update(this.state, this.cx, this.cy, sweepPos, shieldW);
        c.draw(ctx, isHit);
        if (c.life > 0) activeCount++;
      });
      // 扫描高光
      if (this.state === 'IDLE') {
        const absSweepX = this.cx + sweepPos;
        if (absSweepX > bx && absSweepX < bx + shieldW) {
          const grad = ctx.createLinearGradient(absSweepX, by, absSweepX + 40, by);
          grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
          grad.addColorStop(0.2, 'rgba(0, 255, 255, 0.2)');
          grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
          ctx.fillStyle = grad; ctx.fillRect(absSweepX, by, 40, CONFIG.barHeight);
        }
      }
      ctx.restore();
      // 冲击波
      ctx.globalCompositeOperation = 'source-over';
      for (let i = this.impactRings.length - 1; i >= 0; i--) {
        const ring = this.impactRings[i];
        ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`;
        ctx.lineWidth = ring.width; ctx.stroke();
        ring.r += (ring.maxR - ring.r) * 0.15; ring.alpha -= 0.08;
        if (ring.alpha <= 0) this.impactRings.splice(i, 1);
      }
      if (this.state === 'SHATTERING' && activeCount === 0) this.state = 'EMPTY';
    }

    // === 分层主次式布局 ===
    
    // 第一层：信息标签层（最上方，次要信息）
    const labelY = by - 32;
    ctx.textBaseline = 'middle';
    
    // 左侧 HP 标签
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.fillText('❤️ HEALTH POINT', bx, labelY);
    
    // 右侧护盾标签（仅在有护盾时显示）
    if (this.shield > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(0, 234, 255, 0.7)';
      ctx.fillText('🛡️ SHIELD', bx + CONFIG.barWidth, labelY);
    }
    
    // 第二层：数值显示层（标签下方，主要信息）
    const valueY = by - 12;
    
    // 左侧 HP 数值（大号粗体）
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 5;
    const hpText = `${Math.ceil(this.hp)} / ${Math.ceil(this.maxHp)}`;
    ctx.fillText(hpText, bx, valueY);
    
    // 右侧护盾数值（大号，青色发光）
    if (this.shield > 0) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 18px "Segoe UI", -apple-system, sans-serif';
      ctx.fillStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
      const shieldText = `${Math.ceil(this.shield)}`;
      ctx.fillText(shieldText, bx + CONFIG.barWidth, valueY);
    }
    
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.restore();
  }
}

// --- Vue 逻辑 ---
const wrapperRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const system = new ShieldSystem();
let animId = 0;

// 监听数据变化，驱动物理引擎
// 修复：处理 watch 首次执行时 oldValue 为 undefined 的情况
watch(
  () => [props.currentHp, props.maxHp, props.currentShield, props.maxShield],
  (newValues, oldValues) => {
    const [newHp, newMaxHp, newShield, newMaxShield] = newValues as number[];
    const [oldHp, oldMaxHp, oldShield, oldMaxShield] = (oldValues || []) as number[];

    // 1. 同步 HP
    system.syncHp(newHp, newMaxHp);

    // 2. 处理护盾逻辑
    // 如果是首次运行（oldValues 为 undefined），我们只做初始化同步，不播放变化动画
    if (!oldValues) {
      // 初始化时，如果有盾，直接显示
      if (newShield > 0) {
        system.addShieldEffect(newShield, newMaxShield);
      }
      return;
    }

    if (newShield > oldShield) {
      // 增加护盾
      system.addShieldEffect(newShield, newMaxShield);
    } else if (newShield < oldShield) {
      if (newShield <= 0 && oldShield > 0) {
        // 破碎
        system.shatterEffect();
      } else {
        // 受伤
        system.takeDamageEffect(newShield, newMaxShield, oldShield - newShield);
      }
    }
  },
  { immediate: true }
);

const animate = () => {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (ctx) system.draw(ctx);
  animId = requestAnimationFrame(animate);
};

onMounted(() => {
  if (canvasRef.value) {
    // 设置固定的逻辑分辨率，保证物理一致性
    canvasRef.value.width = CONFIG.canvasWidth;
    canvasRef.value.height = CONFIG.canvasHeight;
    animate();
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animId);
});
</script>

<style scoped>
.shield-canvas-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible; /* 允许粒子飞出一点点 */
}

canvas {
  /* 强制 Canvas 适应容器宽度，保持比例 */
  width: 100%;
  height: auto;
  display: block;
  /* 可以在这里添加滤镜增强效果 */
  filter: drop-shadow(0 0 5px rgba(0, 234, 255, 0.1));
}
</style>
