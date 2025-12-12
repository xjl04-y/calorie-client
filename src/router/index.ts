import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue'; // 首页通常包含核心逻辑，建议预加载

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: {
      title: '讨伐战场',
      keepAlive: true // 首页战斗状态建议缓存
    }
  },
  {
    path: '/analysis',
    name: 'Analysis',
    // 路由懒加载：只有访问时才加载此 chunk
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
      keepAlive: true // 避免频繁切换导致人物模型重新渲染
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
  }
];

const router = createRouter({
  // 使用 Hash 模式 (/#/home) 兼容性更好，不需要服务器配置
  history: createWebHashHistory(),
  routes
});

// 全局后置钩子：在此处修改页面标题
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 健康乐园 RPG`;
  }
});

export default router;
