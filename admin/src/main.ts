import { createApp } from 'vue';
import App from './App.vue';
import './style/index.css';
import { permissionDirective } from './directives/permission';
import { pinia } from './store';
import { router } from './router';

const app = createApp(App);
app.use(pinia);
app.use(router);
app.directive('permission', permissionDirective);
app.mount('#app');
