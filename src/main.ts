import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App.vue';
import router from './router';

// 引入样式库
import 'vant/lib/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
// 引入全局自定义样式
import './style.css';
import './styles/rpg-animations.css';
import './styles/theme.css' // [NEW] 引入主题变量系统
import './styles/theme-components.css' // [NEW V2.0] 引入主题化组件样式

// 引入 Vant 组件
import {
  ConfigProvider, Tabbar, TabbarItem, Icon, Button,
  Popup, Cell, Calendar, Slider, Overlay, Tabs, Tab,
  Uploader, SwipeCell, Tag, Dialog, Toast, Notify, ActionSheet, Loading, Switch, Stepper,
  DatePicker
} from 'vant';

// 创建应用实例
const app = createApp(App);

// 1. 注册 Pinia (状态管理)
app.use(createPinia());

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
  } catch (e) {
    console.warn('非 Capacitor 环境，跳过 SplashScreen 调用');
  }

  // B. 安卓物理返回键监听 (Back Button)
  // 逻辑：如果有上一页 -> 返回；如果在首页 -> 退出 App
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const currentRoute = router.currentRoute.value;

      // 如果当前 URL 不是首页 ('/') 且 history 有记录，则后退
      if (canGoBack && currentRoute.path !== '/') {
        router.back();
      } else {
        // 如果在首页，直接退出 App
        CapApp.exitApp();
      }
    });
  } catch (e) {
    console.warn('非 Capacitor 环境，跳过 App 插件调用');
  }
});
