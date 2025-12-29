<template>
  <div class="shield-canvas-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, reactive } from 'vue';

// --- Props 定义 ---
const props = withDefaults(defineProps<{
  currentHp: number;
  maxHp: number;
  currentShield: number;
  maxShield: number;
  // 新增 theme 属性，默认为 dark
  theme?: 'light' | 'dark';
}>(), {
  theme: 'dark'
});

// --- 配色系统 ---
interface ColorPalette {
  bgOuter: string;      // 外层背景
  bgInner: string;      // 内层背景（血条槽位）
  border: string;       // 边框颜色
  shadow: string;       // 阴影颜色
  textHpLabel: string;  // HP 标签文字
  textShieldLabel: string; // Shield 标签文字
  textHpValue: string;  // HP 数值
  textShieldValue: string; // Shield 数值
  shieldMain: string;   // 护盾主色（粒子）
  shieldFaint: string;  // 护盾微弱填充色
  shieldHit: string;    // 受击反白
  hpStart: string;      // 血条渐变始
  hpEnd: string;        // 血条渐变终
  gloss: string;        // 高光反射
  sweep: string;        // 扫光颜色
}

const THEMES: Record<string, ColorPalette> = {
  dark: {
    bgOuter: 'rgba(20, 25, 30, 0.8)',
    bgInner: 'rgba(15, 20, 25, 0.9)',
    border: 'rgba(255, 255, 255, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    textHpLabel: 'rgba(255, 107, 107, 0.7)',
    textShieldLabel: 'rgba(0, 234, 255, 0.7)',
    textHpValue: '#ffffff',
    textShieldValue: '#00E5FF',
    shieldMain: '#00eaff',
    shieldFaint: 'rgba(0, 234, 255, 0.05)',
    shieldHit: '#ffffff',
    hpStart: '#dc2626',
    hpEnd: '#f87171',
    gloss: 'rgba(255, 255, 255, 0.25)',
    sweep: 'rgba(0, 255, 255, 0.2)'
  },
  light: {
    bgOuter: 'rgba(255, 255, 255, 0.4)',
    bgInner: '#ffffff',
    border: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(0, 0, 0, 0)',
    textHpLabel: 'rgba(220, 38, 38, 0.8)',
    textShieldLabel: 'rgba(2, 136, 209, 0.8)',
    textHpValue: '#1a1a1a',
    textShieldValue: '#0288D1',
    shieldMain: '#00bcd4',
    shieldFaint: 'rgba(0, 188, 212, 0.05)',
    shieldHit: '#ffffff',
    hpStart: '#ef5350',
    hpEnd: '#e57373',
    gloss: 'rgba(255, 255, 255, 0.8)',
    sweep: 'rgba(0, 188, 212, 0.2)'
  }
};

// --- 核心配置 ---
const CONFIG = reactive({
  // 逻辑画布尺寸
  canvasWidth: 480,
  canvasHeight: 110,
  barWidth: 440,
  barHeight: 28,
  hexRadius: 8,
  hexGap: 2,

  // 物理参数
  sweepSpeed: 6.0,
  sweepInterval: 180,
  assemblySpeed: 0.05,
  impactForce: 10,
  friction: 0.9,
  shakeIntensity: 6,

  // 颜色配置
  colors: { ...THEMES.dark }
});

// --- 监听主题变化 ---
watch(() => props.theme, (newTheme) => {
  const palette = THEMES[newTheme] || THEMES.dark;
  Object.assign(CONFIG.colors, palette);
}, { immediate: true });

// --- 类型定义 ---
interface ImpactRing {
  x: number; y: number; r: number; maxR: number; alpha: number; width: number;
}
type SystemState = 'EMPTY' | 'ASSEMBLING' | 'IDLE' | 'SHATTERING';

// --- 工具函数 ---
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// [Fix] 兼容性更好的圆角矩形绘制函数，避免部分浏览器 roundRect 闪烁或报错
const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

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

  spawn(cx: number, cy: number) {
    const angle = random(0, Math.PI * 2);
    const dist = random(100, 200);
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
    const currentColor = CONFIG.colors.shieldMain;
    const hitColor = CONFIG.colors.shieldHit;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.morphProgress < 0.8) {
      const size = (1 + this.morphProgress * 3);
      ctx.fillStyle = isHit ? hitColor : currentColor;
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

      ctx.fillStyle = isHit ? hitColor : currentColor;
      ctx.globalAlpha = alpha; ctx.fill();

      ctx.strokeStyle = isHit ? hitColor : currentColor;
      ctx.lineWidth = 1; ctx.globalAlpha = isHit ? 1.0 : 0.4 * this.life; ctx.stroke();

      if ((this.row + this.col) % 3 === 0 && !isHit) {
        ctx.fillStyle = currentColor; ctx.globalAlpha = 0.8 * this.life;
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

  maxHp = 100; hp = 100;
  maxShield = 100; shield = 0;

  sweepTimer = 0; shakeTimer = 0; shakePower = 0;
  impactRings: ImpactRing[] = [];

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

  syncHp(cur: number, max: number) {
    this.hp = cur;
    // [Fix] 防止 MaxHp 为 0 或负数导致计算错误
    this.maxHp = max > 0 ? max : 100;
  }

  addShieldEffect(cur: number, max: number) {
    const isNewAssembly = this.state === 'EMPTY' || this.state === 'SHATTERING';
    this.shield = cur; this.maxShield = max;
    if (isNewAssembly && cur > 0) {
      this.cells.forEach(p => { p.reset(); p.spawn(this.cx, this.cy); });
      this.state = 'ASSEMBLING';
      this.sweepTimer = -200;
      setTimeout(() => { if (this.state === 'ASSEMBLING') this.state = 'IDLE'; }, 1000);
    } else {
      if (this.state === 'SHATTERING') this.state = 'IDLE';
    }
  }

  takeDamageEffect(cur: number, max: number, damageAmount: number) {
    this.shield = cur; this.maxShield = max;
    if (this.state !== 'SHATTERING' && this.state !== 'EMPTY') {
      const isCrit = damageAmount > 20;
      const force = isCrit ? 18 : 8;
      const shieldPixelW = (this.shield / this.maxShield * CONFIG.barWidth);
      const hitX = this.cx - CONFIG.barWidth / 2 + Math.random() * shieldPixelW;
      const hitY = this.cy + (Math.random() - 0.5) * CONFIG.barHeight;

      this.shakeTimer = isCrit ? 10 : 5;
      this.shakePower = isCrit ? CONFIG.shakeIntensity * 1.5 : CONFIG.shakeIntensity * 0.8;

      this.cells.forEach(c => c.applyImpact(hitX, hitY, force));
      this.impactRings.push({ x: hitX, y: hitY, r: 5, maxR: isCrit ? 80 : 40, alpha: 1.0, width: isCrit ? 4 : 2 });
      if (isCrit) {
        setTimeout(() => {
          this.impactRings.push({ x: hitX, y: hitY, r: 10, maxR: 120, alpha: 0.6, width: 2 });
        }, 50);
      }
    }
  }

  shatterEffect() {
    if (this.state === 'SHATTERING' || this.state === 'EMPTY') return;
    this.state = 'SHATTERING';
    this.shield = 0;
    this.cells.forEach(c => c.explode());
    this.shakeTimer = 15; this.shakePower = 15;
    this.impactRings.push({ x: this.cx, y: this.cy, r: 10, maxR: 250, alpha: 0.8, width: 5 });
    setTimeout(() => {
      this.impactRings.push({ x: this.cx, y: this.cy, r: 20, maxR: 200, alpha: 0.5, width: 3 });
    }, 80);
    setTimeout(() => {
      this.impactRings.push({ x: this.cx, y: this.cy, r: 5, maxR: 150, alpha: 0.3, width: 2 });
    }, 150);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const C = CONFIG.colors;

    let sx = 0, sy = 0;
    if (this.shakeTimer > 0) {
      sx = (Math.random() - 0.5) * this.shakePower;
      sy = (Math.random() - 0.5) * this.shakePower;
      this.shakeTimer--; this.shakePower *= 0.85;
    }

    ctx.save();
    ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.translate(sx, sy);

    const bx = this.cx - CONFIG.barWidth / 2;
    const by = this.cy - CONFIG.barHeight / 2;
    const cornerRadius = 18;

    // --- 背景层 ---
    ctx.save();
    ctx.shadowColor = C.shadow;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = C.bgOuter;
    // [Fix] 使用兼容性更好的绘制方法
    drawRoundRect(ctx, bx - 4, by - 4, CONFIG.barWidth + 8, CONFIG.barHeight + 8, cornerRadius);
    ctx.fill();
    ctx.restore();

    // --- 内层槽位 ---
    ctx.fillStyle = C.bgInner;
    drawRoundRect(ctx, bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
    ctx.fill();

    // --- HP 条前景 ---
    const safeMaxHp = this.maxHp || 100;
    const hpW = (this.hp / safeMaxHp) * CONFIG.barWidth;
    if (hpW > 0) {
      ctx.save();
      // Clip
      drawRoundRect(ctx, bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
      ctx.clip();

      const grad = ctx.createLinearGradient(bx, by, bx, by + CONFIG.barHeight);
      grad.addColorStop(0, C.hpStart);
      grad.addColorStop(0.5, C.hpEnd);
      grad.addColorStop(1, C.hpStart);
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, hpW, CONFIG.barHeight);

      // 高光
      const glossGrad = ctx.createLinearGradient(bx, by, bx, by + CONFIG.barHeight * 0.5);
      glossGrad.addColorStop(0, C.gloss);
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(bx, by, hpW, CONFIG.barHeight * 0.5);

      ctx.restore();
    }

    // --- 边框 ---
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, bx, by, CONFIG.barWidth, CONFIG.barHeight, cornerRadius - 2);
    ctx.stroke();

    // --- 护盾逻辑 ---
    if (this.state !== 'EMPTY') {
      const safeMaxShield = this.maxShield || 100;
      const shieldW = (this.shield / safeMaxShield) * CONFIG.barWidth;
      const isHit = this.shakeTimer > 0;

      this.sweepTimer += CONFIG.sweepSpeed;
      const cycle = CONFIG.barWidth + CONFIG.sweepInterval;
      const sweepPos = (this.sweepTimer % cycle) - CONFIG.barWidth / 2;

      ctx.save();
      if (this.state !== 'SHATTERING') {
        ctx.beginPath(); ctx.rect(bx, by, shieldW, CONFIG.barHeight); ctx.clip();
        if (this.shield > 0 && !isHit) {
          ctx.fillStyle = C.shieldFaint;
          ctx.fillRect(bx, by, shieldW, CONFIG.barHeight);
        }
      }

      if (props.theme === 'dark') {
        ctx.globalCompositeOperation = 'lighter';
      }

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
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(0.2, C.sweep);
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad; ctx.fillRect(absSweepX, by, 40, CONFIG.barHeight);
        }
      }
      ctx.restore();

      // 冲击波
      ctx.globalCompositeOperation = 'source-over';
      for (let i = this.impactRings.length - 1; i >= 0; i--) {
        const ring = this.impactRings[i];
        ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = ring.width > 2 ? C.shieldHit : C.shieldMain;
        ctx.globalAlpha = ring.alpha;
        ctx.lineWidth = ring.width; ctx.stroke();
        ctx.globalAlpha = 1.0;

        ring.r += (ring.maxR - ring.r) * 0.15; ring.alpha -= 0.08;
        if (ring.alpha <= 0) this.impactRings.splice(i, 1);
      }
      if (this.state === 'SHATTERING' && activeCount === 0) this.state = 'EMPTY';
    }

    // --- UI 文字层 ---
    const labelY = by - 32;
    ctx.textBaseline = 'middle';

    // 左侧 HP 标签
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.fillStyle = C.textHpLabel;

    if (props.theme === 'dark') {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 2;
    } else {
      ctx.shadowBlur = 0;
    }

    // 右侧护盾标签
    if (this.shield > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = C.textShieldLabel;
      ctx.fillText('🛡️ SHIELD', bx + CONFIG.barWidth, labelY);
    }

    // 数值层
    const valueY = by - 12;

    // 左侧 HP 数值
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px "Segoe UI", -apple-system, sans-serif';
    ctx.fillStyle = C.textHpValue;
    if (props.theme === 'dark') {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 5;
    }
    // [Fix] 使用 Math.round 替代 Math.ceil，防止浮点数计算导致的 100/101 闪烁问题
    const hpText = `${Math.round(this.hp)} / ${Math.round(this.maxHp)}`;
    ctx.fillText(hpText, bx, valueY);

    // 右侧护盾数值
    if (this.shield > 0) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 18px "Segoe UI", -apple-system, sans-serif';
      ctx.fillStyle = C.textShieldValue;
      if (props.theme === 'dark') {
        ctx.shadowColor = C.textShieldValue;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 2;
      }
      const shieldText = `${Math.round(this.shield)}`;
      ctx.fillText(shieldText, bx + CONFIG.barWidth, valueY);
    }

    // 重置阴影
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

watch(
  () => [props.currentHp, props.maxHp, props.currentShield, props.maxShield],
  (newValues, oldValues) => {
    const [newHp, newMaxHp, newShield, newMaxShield] = newValues as number[];
    const [oldHp, oldMaxHp, oldShield, oldMaxShield] = (oldValues || []) as number[];

    system.syncHp(newHp, newMaxHp);

    if (!oldValues) {
      if (newShield > 0) {
        system.addShieldEffect(newShield, newMaxShield);
      }
      return;
    }

    if (newShield > oldShield) {
      system.addShieldEffect(newShield, newMaxShield);
    } else if (newShield < oldShield) {
      if (newShield <= 0 && oldShield > 0) {
        system.shatterEffect();
      } else {
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
  overflow: visible;
}

canvas {
  width: 100%;
  height: auto;
  display: block;
}
</style>
