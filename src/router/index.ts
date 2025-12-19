import { createRouter, createWebHashHistory } from 'vue-router';
// 首页包含核心逻辑，建议保持静态引入以保证首屏速度
import HomeView from '@/views/HomeView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: {
      title: '讨伐战场',
      keepAlive: true // 首页战斗状态必须缓存，防止切回时重置
    }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    // 路由懒加载：只有点击"冒险手札"时才加载此代码块
    component: () => import('@/views/AnalysisView.vue'),
    meta: {
      title: '冒险手札',
      keepAlive: false // 战报数据通常需要实时刷新
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: {
      title: '英雄档案',
      keepAlive: true // 避免频繁切换导致3D人物模型重新渲染卡顿
    }
  },
  // [New V4.6] 纯净模式专属 - 食物详情页
  {
    path: '/food-detail',
    name: 'FoodDetail',
    component: () => import('@/views/FoodDetailView.vue'),
    meta: {
      title: '食物详情',
      keepAlive: false
    }
  },
  // [New V6.0] 运动记录页面
  {
    path: '/exercise',
    name: 'Exercise',
    component: () => import('@/views/ExerciseDetailView.vue'),
    meta: {
      title: '记录运动',
      keepAlive: false
    }
  },
  // [New V6.0] 补水记录页面
  {
    path: '/hydration',
    name: 'Hydration',
    component: () => import('@/views/HydrationView.vue'),
    meta: {
      title: '补水站',
      keepAlive: false
    }
  },
  // [New V6.1] 记录详情页面
  {
    path: '/exercise-log-detail',
    name: 'ExerciseLogDetail',
    component: () => import('@/views/ExerciseLogDetailView.vue'),
    meta: {
      title: '运动详情',
      keepAlive: false
    }
  },
  {
    path: '/hydration-log-detail',
    name: 'HydrationLogDetail',
    component: () => import('@/views/HydrationLogDetailView.vue'),
    meta: {
      title: '补水详情',
      keepAlive: false
    }
  },
  {
    path: '/food-log-detail',
    name: 'FoodLogDetail',
    component: () => import('@/views/FoodLogDetailView.vue'),
    meta: {
      title: '食物详情',
      keepAlive: false
    }
  },

  // --- [PM Add] 纯净模式专属路由 End ---
];

const router = createRouter({
  // 使用 Hash 模式 (/#/home) 是 Capacitor/Hybrid App 的最佳实践
  // 它可以避免 file:// 协议下的路径解析错误
  history: createWebHashHistory(),
  routes,
  // 切换路由时重置窗口滚动位置 (虽然主要滚动在 div 中，但这能防止部分弹窗导致 body 错位)
  scrollBehavior() {
    return { top: 0 };
  }
});

// 全局后置钩子：动态修改页面标题
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title as string} - 健康乐园 RPG`;
  }
});

export default router;
