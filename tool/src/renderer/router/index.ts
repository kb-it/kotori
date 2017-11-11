import Vue from 'vue'
import Router from 'vue-router'

import LandingPage from '@/components/LandingPage.vue'
import LoginPage from '@/components/LoginPage.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'landing-page',
      component: LandingPage,
    },
    {
      path: '/login',
      name: 'login-page',
      component: LoginPage,
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
