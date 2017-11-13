<template>
    <div class="tile is-ancestor">
        <div class="tile is-12 is-vertical is-parent">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article id="reset" class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="goToHome()"></a>
                            <h2 class="title is-1 has-text-centered has-text-black">
                                Set new password
                            </h2>
                            <div v-if="started">
                                <div v-if="pending" class="notification is-info">
                                    <p class="has-text-centered">
                                        Please wait a second... Your new password is being set.
                                    </p>
                                </div>
                                <div v-if="!pending && result.success" class="notification is-success">
                                    Your new password has been successfully set.<br>

                                    Click <router-link to="/login" tag="a">here</router-link> to check it out.
                                </div>
                                <div v-if="!pending && !result.success">
                                    <div class="notification is-danger">
                                        {{ result.error || "Resetting password failed. Please try again later." }}
                                    </div>
                                </div>
                            </div>
                            <form @submit.prevent="doReset()" v-else>
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
                                            <span class="icon"><i class="fa fa-unlock"></i></span>
                                            <span>Change password</span>
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
    import {handleHttpError, goToHome} from "../util"

    @Component({
        name: "ResetPw"
    })
    export default class ResetPw extends Vue {
        goToHome = goToHome;
        status = {password: false, repeatedPw: false};
        pending = false;
        password = "";
        repeatedPw = "";
        started = false;
        result = {
            success: false,
            error: ""
        };

        checkPassword($event) {
            return !$event.target.matches(':invalid');
        }

        checkRepeatedPassword($event) {
            let pwInputs = document.querySelectorAll("#reset input.password"),
                pwsEqual = (<any>pwInputs[0]).value === (<any>pwInputs[1]).value;

            return pwsEqual;
        }

        focusElement(elementSelector) {
            (<any> document.querySelector("#reset " + elementSelector)).focus();
        }

        doReset() {
            const resetPwToken = this.$route.params.id;
            this.pending = true;
            this.started = true;
            if (!this.status.password) {
                this.focusElement("input.password");
            } else if (!this.status.repeatedPw) {
                this.focusElement("input.password-repeat");
            } else {
                http.post("v1/user/resetpw/" + resetPwToken, {password: this.password})
                    .then(response => {
                        this.pending = false;
                        this.result.success = response.data.success;
                        this.result.error = response.data.error;
                    })
                    .catch(err => {
                        this.pending = false;
                        this.result.success = false;
                        this.result.error = handleHttpError("ResetPw", err);
                    });
            }
        }
    }
</script>

<style>
</style>
