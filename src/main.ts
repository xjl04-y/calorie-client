import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// 引入样式库
import 'vant/lib/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
// 引入全局自定义样式 (包含 Tailwind 和 RPG 样式)
import './style.css';

// 引入 Vant 组件
// 修复：添加 ActionSheet 和 Loading
import {
  ConfigProvider, Tabbar, TabbarItem, Icon, Button,
  Popup, Cell, Calendar, Slider, Overlay, Tabs, Tab,
  Uploader, SwipeCell, Tag, Dialog, Toast, Notify, ActionSheet, Loading
} from 'vant';

const app = createApp(App);

// 注册 Pinia
app.use(createPinia());

// 注册 Router
app.use(router);

// 注册 Vant 组件
// 修复：注册 ActionSheet 和 Loading
app.use(ConfigProvider).use(Tabbar).use(TabbarItem).use(Icon).use(Button)
  .use(Popup).use(Cell).use(Calendar).use(Slider).use(Overlay)
  .use(Tabs).use(Tab).use(Uploader).use(SwipeCell).use(Tag)
  .use(Dialog).use(Toast).use(Notify).use(ActionSheet).use(Loading);

app.mount('#app');
