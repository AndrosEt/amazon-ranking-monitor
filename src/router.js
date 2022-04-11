import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

/*配置路由*/
const routes = [

    {
        path: '/',
        name: 'root',
        component: () => import('./App'),
        redirect: () => {
            return {name: 'home'}
        },
        children: [
            {
                path: 'home',
                name: 'home',
                component: () => import('./components/Home'),
            },
            {
                path: 'keyword',
                name: 'keyword',
                component: () => import('./components/Keyword'),
            }
        ]
    }
];

/*实例化路由*/
const router = new VueRouter({
    mode: "hash",   //模式修改
    routes // （简写）相当于 routes: routes
});
export default router
