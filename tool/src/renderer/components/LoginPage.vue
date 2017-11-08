<template>
    <section class="hero is-fullheight is-medium is-primary is-bold">
        <div class="hero-body">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="back()"></a>
                            <h1 class="title is-2 has-text-centered" style="color:black;">
                                Sign in
                            </h1>
                            <h1 class="subtitle is-6 has-text-centered" style="color:grey;">
                                This is required to use synchronization
                            </h1>
                            <form @submit.prevent="doLogin()">
                                <div class="field">
                                    <div class="control has-icons-left has-icons-right">
                                        <input v-model="user" class="input" type="email" placeholder="Email" required
                                            @change="status.email=!$event.target.matches(':invalid')">
                                        <span class="icon"><i class="fa fa-envelope"></i></span>
                                        <span class="icon is-small is-right">
                                            <i class="fa" v-bind:class="{ 'fa-check': status.email, 'fa-times': !status.email }"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="field">
                                    <div class="control has-icons-left has-icons-right">
                                        <input v-model="password" class="input" type="password" placeholder="Password" required
                                            @change="status.password=!$event.target.matches(':invalid')">
                                        <span class="icon"><i class="fa fa-lock"></i></span>
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
                        </div>
                    </article>
                </div>
            </div>
        </div>
    </section>
</template>

<script lang="ts">
    import {remote} from 'electron'
    import Vue from 'vue'
    import Component from 'vue-class-component'
    import {http} from '../config'
    import {handleHttpError} from '../util'

    @Component
    export default class LoginPage extends Vue {
        status = {email: false, password: false};
        pending = false;
        user = "";
        password = "";

        get prevUser() {
            return this.$store.state.files.user;
        }

        mounted() {
            this.user = this.prevUser;
        }

        doLogin() {
            let user = "" + this.user;
            this.pending = true;
            http.post("v1/user/login", {mail: user, password: this.password})
                .then(response => {
                    this.pending = false;
                    console.log("login resonse ", response);
                    if (response.status == 200) {
                        this.$store.commit('SET_USER', user);
                        this.back();
                    }
                })
                .catch(err => {
                    this.pending = false;
                    handleHttpError("Login failed", err)
                })
        }

        back() {
            this.$router.go(-1);
        }
    }
</script>

<style>
</style>
