<template>
    <div class="tile is-ancestor">
        <div class="tile is-12 is-vertical is-parent">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="goToHome()"></a>
                            <h1 class="title is-2 has-text-centered has-text-black">
                                Forgot password
                            </h1>
                            <h2 class="subtitle is-6 has-text-centered has-text-dark">
                                Enter your email address below. You'll receive a mail with further instructions in a minute.
                            </h2>
                            <div v-if="started">
                                <div v-if="pending" class="notification is-info">
                                    <p class="has-text-centered">
                                        Please wait a second... A password reset link is being generated.
                                    </p>
                                </div>
                                <div v-if="!pending && result.success" class="notification is-success">
                                    Your password reset link has been successfully generated and sent to you via mail.<br>

                                    Please check your mail account, open the reset link and follow the instructions.
                                </div>
                                <div v-if="!pending && !result.success">
                                    <div class="notification is-danger">
                                        {{ result.error }}
                                    </div>
                                </div>
                            </div>
                            <form @submit.prevent="doRequest()" v-else>
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
                                    <div class="control">
                                        <button v-bind:class="{'is-loading': pending}" class="button is-primary is-medium is-fullwidth login-button" type="submit">
                                            <span class="icon"><i class="fa fa-unlock"></i></span>
                                            <span>Request password reset</span>
                                        </button>
                                    </div>
                                </div>
                            </form>
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
    import {handleHttpError} from "../util"

    @Component({
        name: "ForgotPw"
    })
    export default class ForgotPw extends Vue {
        status = {email: false};
        pending = false;
        user = "";
        started = false;
        result = {
            success: false,
            error: ""
        };

        doRequest() {
            let user = "" + this.user;
            this.pending = true;
            this.started = true;
            http.post("v1/user/forgotpw", {mail: user})
                .then(response => {
                    this.pending = false;
                    this.result.success = response.data.success;
                    this.result.error = response.data.error;
                })
                .catch(err => {
                    this.pending = false;
                    this.result.success = false;
                    this.result.error = handleHttpError("ForgotPw", err);
                });
        }

        goToHome() {
            this.$router.push({path: "/"});
        }
    }
</script>

<style>
</style>
