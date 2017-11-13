<template>
    <div class="tile is-ancestor">
        <div class="tile is-12 is-vertical is-parent">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="goToHome()"></a>
                            <h1 class="title is-1 has-text-centered has-text-black">
                                Login
                            </h1>
                            <h2 class="subtitle is-6 has-text-centered has-text-grey">
                                This is required to use synchronization
                            </h2>
                            <form @submit.prevent="doLogin()">
                                <div v-if="started && !pending && !result.success" style="margin-bottom: 20px;">
                                    <div class="notification is-danger">
                                        {{ result.error }}
                                        <div v-if="/not activated/i.test(result.error)">
                                            You can request a new activation-link
                                            <router-link to="/activate/renew" tag="a">here</router-link>.
                                        </div>
                                    </div>
                                </div>

                                <div class="field">
                                    <div class="control has-icons-left has-icons-right">
                                        <input v-model="user" class="input" type="email" placeholder="Email" required
                                            @change="status.email=!$event.target.matches(':invalid')">
                                        <span class="icon is-small is-right">
                                            <i class="fa" v-bind:class="{ 'fa-check': status.email, 'fa-times': !status.email }"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left has-icons-right">
                                        <input v-model="password" class="input" type="password" placeholder="Password" required
                                            @change="status.password=!$event.target.matches(':invalid')">
                                        <span class="icon is-small is-right">
                                            <i class="fa" v-bind:class="{ 'fa-check': status.password, 'fa-times': !status.password }"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control">
                                        <button v-bind:class="{'is-loading': pending}" class="button is-primary is-medium is-fullwidth login-button" type="submit">
                                            <span class="icon"><i class="fa fa-user"></i></span>
                                            <span>Login</span>
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div style="margin-top: 10px;">
                                <router-link to="/forgotpw" tag="a" class="has-text-grey">
                                    Reset password
                                </router-link>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue'
    import Component from "vue-class-component"
    import {http} from "../config"
    import {handleHttpError, goToHome} from "../util"

    @Component({
        name: "Login"
    })
    export default class Login extends Vue {
        goToHome = goToHome;
        status = {email: false, password: false};
        pending = false;
        started = false;
        result = {
            success: false,
            error: ""
        }
        user = "";
        password = "";

        get prevUser() {
            return this.$store.state.app.user;
        }

        mounted() {
            this.user = this.prevUser;
        }

        doLogin() {
            let user = "" + this.user;
            this.pending = true;
            this.started = true;
            http.post("v1/user/login", {mail: user, password: this.password})
                .then(response => {
                    this.pending = false;
                    this.result.success = response.data.success;
                    this.result.error = response.data.error;

                    if (response.status == 200) {
                        this.$store.commit('SET_USER', user);
                        goToHome();
                    }
                })
                .catch(err => {
                    this.pending = false;
                    this.result.success = false;
                    this.result.error = handleHttpError("Login", err);
                });
        }
    }
</script>

<style>
</style>
