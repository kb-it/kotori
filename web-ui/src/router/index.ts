import Vue from "vue";
import Router from "vue-router";
import StartPage from "@/pages/StartPage.vue";
import Start from "@/components/Start.vue";
import Login from "@/components/Login.vue";
import Registration from "@/components/Registration.vue";
import ForgotPw from "@/components/ForgotPw.vue";
import ResetPw from "@/components/ResetPw.vue";
import Activation from "@/components/Activation.vue";
import ActivationRenewal from "@/components/ActivationRenewal.vue";
import ChangePw from "@/components/ChangePw.vue";
import LegalNotice from "@/components/LegalNotice.vue";

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: "/",
            component: StartPage,
            children: [
                {
                    path: "/",
                    component: Start
                },
                {
                    path: "login",
                    component: Login
                },
                {
                    path: "activate/renew",
                    component: ActivationRenewal
                },
                {
                    path: "activate/:id",
                    component: Activation
                },
                {
                    path: "register",
                    component: Registration
                },
                {
                    path: "forgotpw",
                    component: ForgotPw
                },
                {
                    path: "reset/:id",
                    component: ResetPw
                },
                {
                    path: "changepw",
                    component: ChangePw
                },
                {
                    path: "legal-notice",
                    component: LegalNotice
                }
            ]
        }
    ]
});
