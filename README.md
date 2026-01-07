# 🎮 健康乐园 RPG - Calorie Client

一款创新的健康管理应用，将饮食追踪、运动记录与RPG游戏元素完美结合。通过游戏化的方式，让健康管理变得有趣且富有成就感！

## ✨ 核心特性

### 🎯 双模式体验
- **⚔️ RPG 冒险模式**：化身冒险者，通过饮食和运动对抗怪物Boss，升级角色，解锁技能树
- **🍃 纯净记录模式**：简洁的健康数据追踪界面，专注于饮食和运动记录

### 🍽️ 智能饮食管理
- **AI 智能识别**：支持自然语言输入，AI自动识别食物并计算营养成分
- **海量食物库**：内置丰富的食物数据库，支持自定义食物和烹饪配方
- **营养分析**：精准追踪蛋白质、碳水化合物、脂肪等宏量营养素
- **餐次管理**：早餐、午餐、晚餐、零食分类记录

### 🏃 运动追踪系统
- **多种运动类型**：跑步、骑行、游泳、力量训练等多种运动模式
- **热量消耗计算**：根据运动强度和时长精准计算消耗
- **体力系统**：运动消耗体力，升级恢复，增加策略性

### 💧 补水提醒
- **每日目标设定**：自定义每日饮水量目标
- **多种饮品记录**：水、茶、咖啡等不同类型饮品
- **温度标记**：冷饮、温饮、热饮分类记录

### 🎲 RPG 游戏系统（RPG模式专属）
- **种族选择**：人类、精灵、兽人、矮人，各具特色的种族天赋
- **技能树系统**：多达数十种被动和主动技能，打造独特Build
- **装备系统**：通过成就解锁装备，提升角色属性
- **任务委托**：每日任务系统，完成目标获得经验和金币
- **道具商店**：购买药剂、盲盒、转生药水等特殊道具
- **战斗机制**：暴击、连击、格挡、闪避等丰富的战斗系统

### 📊 数据分析
- **趋势图表**：体重、BMI、体脂率的长期趋势可视化
- **营养分析**：宏量营养素分布和摄入趋势
- **战斗数据**：伤害统计、Boss血量变化（RPG模式）
- **历史记录**：完整的饮食和运动日志

### 🌙 完善的用户体验
- **深色模式**：护眼的暗黑主题，自动适配系统设置
- **数据持久化**：本地存储，数据永不丢失
- **导入导出**：支持数据备份和跨设备迁移
- **响应式设计**：适配手机、平板等多种设备
- **离线可用**：无需网络即可正常使用（AI功能除外）

## 🛠️ 技术栈

### 前端框架
- **Vue 3.5** - 采用 Composition API 和 `<script setup>` 语法
- **TypeScript** - 完整的类型支持，保证代码质量
- **Vite 7.2** - 极速的开发体验和构建性能

### 状态管理
- **Pinia 3.0** - Vue 3 官方推荐的状态管理库
- **pinia-plugin-persistedstate** - 状态持久化插件

### UI 组件
- **Vant 4.9** - 移动端 UI 组件库
- **Tailwind CSS 3.4** - 原子化 CSS 框架
- **FontAwesome 7.1** - 图标库
- **GSAP 3.14** - 高性能动画库

### 移动端支持
- **Capacitor 8.0** - 跨平台移动应用框架
- **@capacitor-community/sqlite** - 本地数据库支持
- **Android** - 支持打包为原生 Android 应用

### 代码质量
- **ESLint** - 代码规范检查
- **Prettier** - 代码格式化
- **vue-tsc** - TypeScript 类型检查

## 📦 环境要求

- **Node.js**: `^20.19.0` 或 `>=22.12.0`
- **npm**: 推荐使用最新版本
- **推荐编辑器**: VS Code + Volar 插件

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动（端口可能不同，请查看终端输出）

### 3. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 4. 预览生产构建

```bash
npm run preview
```

## 📱 移动端构建（可选）

### Android 应用打包

1. 确保已安装 Android Studio 和 SDK
2. 同步 Capacitor 配置：

```bash
npx cap sync android
```

3. 在 Android Studio 中打开项目：

```bash
npx cap open android
```

4. 在 Android Studio 中构建和运行

## 🧪 测试指南

详细的测试指南请参考 [TESTING.md](./TESTING.md) 文件。

快速测试检查清单：

- [ ] 首次启动和新用户引导
- [ ] 添加食物和饮食记录
- [ ] 添加运动记录
- [ ] 补水记录功能
- [ ] 数据统计和图表
- [ ] 模式切换（RPG ↔️ 纯净）
- [ ] 深色模式切换
- [ ] 数据导入导出
- [ ] RPG系统（仅RPG模式）

## 📂 项目结构

```
src/
├── assets/          # 静态资源（字体、图标等）
├── components/      # Vue 组件
│   ├── modals/     # 弹窗组件
│   └── trend/      # 趋势图组件
├── composables/     # 组合式函数
├── constants/       # 常量和游戏数据
├── router/          # 路由配置
├── stores/          # Pinia 状态管理
├── styles/          # 全局样式
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── views/           # 页面视图
├── App.vue          # 根组件
└── main.ts          # 应用入口
```

## 🔧 可用脚本

```bash
# 开发环境启动
npm run dev

# 生产构建（包含类型检查）
npm run build

# 仅构建（不含类型检查）
npm run build-only

# TypeScript 类型检查
npm run type-check

# 代码规范检查和自动修复
npm run lint

# 代码格式化
npm run format

# 预览生产构建
npm run preview
```

## 🎯 核心模块说明

### 状态管理 (Stores)

- **useHeroStore**: 角色数据、等级、技能、装备、金币等
- **useLogStore**: 饮食和运动日志
- **useBattleStore**: 战斗系统、怪物、伤害计算
- **useSystemStore**: 系统设置、模态框状态、主题
- **useCollectionStore**: 成就、装备收藏
- **useHydrationStore**: 补水记录和配置
- **useExerciseStore**: 运动记录管理

### 关键组件

- **AppHud.vue**: 游戏HUD，显示角色状态、金币、经验等
- **ModalAddFood.vue**: 添加食物弹窗，支持AI识别
- **ModalAddExercise.vue**: 添加运动记录
- **ModalSkillTree.vue**: 技能树界面
- **ModalShop.vue**: 道具商店
- **ModalSettings.vue**: 设置面板

### 工具函数

- **sqliteFoodService.ts**: 食物数据库服务
- **sqliteLogService.ts**: 日志数据库服务
- **aiService.ts**: AI 食物识别服务
- **gameUtils.ts**: 游戏逻辑工具函数
- **dateUtils.ts**: 日期处理工具

## 🌐 浏览器支持

- Chrome (推荐)
- Edge
- Firefox
- Safari
- 移动端浏览器

**推荐使用 Vue Devtools 进行开发调试**

## 🐛 常见问题

### Q: 启动时提示 Node 版本不匹配？
A: 请确保使用 Node.js 20.19+ 或 22.12+ 版本

### Q: AI 识别功能无法使用？
A: AI 功能需要配置后端 API 服务，请检查 `aiService.ts` 中的配置

### Q: 数据丢失了怎么办？
A: 应用使用 localStorage 存储数据，建议定期使用「设置-数据管理-导出存档」功能备份

### Q: 如何切换模式？
A: 进入「英雄/我的」页面，点击右上角设置按钮，在「外观设置」中切换

### Q: 暗黑模式怎么开启？
A: 在设置中可以手动切换，也可以设置为跟随系统

## 📄 许可证

本项目仅供学习和个人使用。

## 🙏 致谢

- Vue.js 团队提供优秀的框架
- Vant UI 提供精美的移动端组件
- 所有开源社区的贡献者

## 📮 联系方式

如有问题或建议，欢迎通过 GitHub Issues 反馈。

---

**开始你的健康冒险之旅吧！⚔️🍎**
