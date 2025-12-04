import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// 引入样式库
import 'vant/lib/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
// 假设这是你自己配置的 tailwind 入口
// import './style.css';

// 引入 Vant 组件 (按需引入或全局引入)
// 简便起见，这里演示全局引入常用组件
import {
  ConfigProvider, Tabbar, TabbarItem, Icon, Button,
  Popup, Cell, Calendar, Slider, Overlay, Tabs, Tab,
  Uploader, SwipeCell, Tag, Dialog, Toast, Notify
} from 'vant';

const app = createApp(App);

// 注册 Pinia
app.use(createPinia());

// 注册 Router
app.use(router);

// 注册 Vant 组件
app.use(ConfigProvider).use(Tabbar).use(TabbarItem).use(Icon).use(Button)
  .use(Popup).use(Cell).use(Calendar).use(Slider).use(Overlay)
  .use(Tabs).use(Tab).use(Uploader).use(SwipeCell).use(Tag)
  .use(Dialog).use(Toast).use(Notify);

app.mount('#app');
