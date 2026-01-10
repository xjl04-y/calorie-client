import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'; // [工单01] Pinia持久化插件
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { showToast } from 'vant'; // [双击退出] 导入Toast提示
import App from './App.vue';
import router from './router';

// 引入样式库
import 'vant/lib/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
// 引入全局自定义样式
import './style.css';
import './styles/rpg-animations.css';
import './styles/theme.css' // [NEW] 引入主题变量系统

// 引入 Vant 组件
import {
  ConfigProvider, Tabbar, TabbarItem, Icon, Button,
  Popup, Cell, Calendar, Slider, Overlay, Tabs, Tab,
  Uploader, SwipeCell, Tag, Dialog, Toast, Notify, ActionSheet, Loading, Switch, Stepper,
  DatePicker
} from 'vant';

// 引入字体图标
import '@/assets/iconfont/iconfont.js';
import '@/assets/iconfont/iconfont.css';


// 创建应用实例
const app = createApp(App);

// 1. 注册 Pinia (状态管理) + [工单01] 添加持久化插件
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate); // 启用持久化，自动保存所有标记persist:true的store
app.use(pinia);

// 2. 注册 Router (路由)
app.use(router);

// 3. 注册 Vant 组件 (按需引入以减少包体积)
app.use(ConfigProvider).use(Tabbar).use(TabbarItem).use(Icon).use(Button)
  .use(Popup).use(Cell).use(Calendar).use(Slider).use(Overlay)
  .use(Tabs).use(Tab).use(Uploader).use(SwipeCell).use(Tag)
  .use(Dialog).use(Toast).use(Notify).use(ActionSheet).use(Loading).use(Switch).use(Stepper)
  .use(DatePicker);

// 4. 等待路由就绪后再挂载，防止路由守卫导致的白屏或闪烁
router.isReady().then(() => {
  app.mount('#app');

  // --- [Capacitor 原生能力增强] ---

  // A. 隐藏启动图 (Splash Screen)
  // 当 Vue 挂载完成后，手动关闭启动图，实现平滑过渡
  try {
    SplashScreen.hide();
  } catch {
    console.warn('非 Capacitor 环境，跳过 SplashScreen 调用');
  }

  // B. 安卓物理返回键监听 (Back Button)
  // [双击退出] 优化逻辑：首页双击退出，非首页直接返回
  let lastBackPressTime = 0; // 记录上次按返回键的时间
  const BACK_PRESS_INTERVAL = 2000; // 2秒内双击有效

  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const currentRoute = router.currentRoute.value;

      // 如果当前 URL 不是首页 ('/') 且 history 有记录，则后退
      if (canGoBack && currentRoute.path !== '/') {
        router.back();
        console.log('[返回键] 执行页面后退');
      } else {
        // 在首页：实现双击退出逻辑
        const now = Date.now();
        
        if (now - lastBackPressTime < BACK_PRESS_INTERVAL) {
          // 2秒内第二次按下，退出应用
          console.log('[返回键] 双击确认，退出应用');
          CapApp.exitApp();
        } else {
          // 第一次按下，显示提示
          lastBackPressTime = now;
          console.log('[返回键] 首次按下，显示提示');
          showToast({
            message: '再按一次退出应用',
            position: 'bottom',
            duration: 1500,
          });
        }
      }
    });
  } catch {
    console.warn('非 Capacitor 环境，跳过 App 插件调用');
  }
});
