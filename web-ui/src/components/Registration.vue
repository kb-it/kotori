<template>
    <div class="tile is-ancestor">
        <div class="tile is-12 is-vertical is-parent">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article id="registration" class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="goToHome()"></a>
                            <div v-if="started">
                                <div v-if="pending" class="notification is-info">
                                    <p class="has-text-centered">
                                        Please wait a second... Your account is being created.
                                    </p>
                                </div>
                                <div v-if="!pending && !result.success" class="notification is-danger">
                                    {{ result.error }}
                                </div>

                                <div v-if="started && !pending && result.success">
                                    <h2 class="title is-2 has-text-centered has-text-black">Account successfully created</h2>
                                    <div class="notification is-success">
                                        An activation link has been sent to you via mail.<br>

                                        Please check your mail account and open the activation link for being able to signing in.
                                    </div>
                                </div>
                            </div>
                            <div v-else>
                                <h2 class="title is-1 has-text-centered has-text-black">
                                    Sign up
                                </h2>
                                <h3 class="subtitle is-6 has-text-centered has-text-grey">
                                    Passwords must contain at least 12 characters
                                </h3>

                                <form @submit.prevent="doRegister()">
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
                                            <input v-model="password" class="input password" type="password" placeholder="Password" required
                                                title="Password must contain at least 12 characters" pattern=".{12,}" @change="status.password = checkPassword($event)">
                                            <span class="icon is-small is-right">
                                                <i class="fa" v-bind:class="{ 'fa-check': status.password, 'fa-times': !status.password }"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="field">
                                        <div class="control has-icons-left has-icons-right">
                                            <input v-model="repeatedPw" class="input password password-repeat" type="password" placeholder="Repeat your password" required
                                                title="Value must equal password" pattern=".{12,}" @change="status.repeatedPw = checkPassword($event) && checkRepeatedPassword($event)">
                                            <span class="icon is-small is-right">
                                                <i class="fa" v-bind:class="{ 'fa-check': status.repeatedPw, 'fa-times': !status.repeatedPw }"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div class="field">
                                        <div class="control">
                                            <button v-bind:class="{'is-loading': pending}" class="button is-primary is-medium is-fullwidth login-button" type="submit">
                                                <span class="icon"><i class="fa fa-user-plus"></i></span>
                                                <span>Sign up</span>
                                            </button>
                                        </div>
                                    </div>
                                </form>
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
        name: "Registration"
    })
    export default class Registration extends Vue {
        goToHome = goToHome;
        status = {email: false, password: false, repeatedPw: false};
        pending = false;
        started = false;
        user = "";
        password = "";
        repeatedPw = "";
        result = {
            success: false,
            error: ""
        };

        get prevUser() {
            return this.$store.state.app.user;
        }

        checkPassword($event) {
            return !$event.target.matches(':invalid');
        }

        checkRepeatedPassword($event) {
            let pwInputs = document.querySelectorAll("#registration input.password"),
                pwsEqual = (<any>pwInputs[0]).value === (<any>pwInputs[1]).value;

            return pwsEqual;
        }

        mounted() {
            this.user = this.prevUser;
        }

        focusElement(elementSelector) {
            (<any> document.querySelector("#registration " + elementSelector)).focus();
        }

        doRegister() {
            if (!this.status.email) {
                this.focusElement("input[type='email']");
            } else if (!this.status.password) {
                this.focusElement("input.password");
            } else if (!this.status.repeatedPw) {
                this.focusElement("input.password-repeat");
            } else {
                let user = "" + this.user;
                this.pending = true;
                this.started = true;
                http.post("v1/user", {mail: user, password: this.password})
                    .then(response => {
                        this.pending = false;
                        this.result.success = response.data.success;
                        this.result.error = response.data.error;
                    })
                    .catch(err => {
                        this.pending = false;
                        this.result.success = false;
                        this.result.error = handleHttpError("Registration", err);
                    });
            }
        }
    }
</script>

<style>
</style>
