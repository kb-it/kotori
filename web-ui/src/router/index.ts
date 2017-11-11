import Vue from 'vue'
import Router from 'vue-router'
import Overview from '@/components/Overview.vue'

Vue.use(Router)

export default new Router({
    routes: [
        {
            path: '/',
            name: 'Overview',
            component: Overview
        }/*,
        {
            path: '/login',
            name: 'login-page',
            component: LoginPage,
        }
        */
    ]
})
