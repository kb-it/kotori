<template>
    <div class="tile is-ancestor">
        <div class="tile is-12 is-vertical is-parent">
            <div class="container is-fullhd">
                <div class="columns is-centered">
                    <article class="card is-rounded" style="min-width: 60%">
                        <div class="card-content">
                            <a class="delete is-large is-pulled-right" @click="goToHome()"></a>
                            <h1 class="title is-1 has-text-centered has-text-black">
                                Account activation
                            </h1>
                            <div class="content">
                                <div v-if="pending" class="notification is-info">
                                    <p class="has-text-centered">
                                        Please wait a second... Your account is being activated.
                                    </p>
                                </div>
                                <div v-if="!pending && result.success" class="notification is-success">
                                    Your account has been successfully activated.<br>

                                    You are now able to sign in <router-link to="/login" tag="a">here</router-link>.
                                </div>
                                <div v-if="!pending && !result.success">
                                    <div class="notification is-danger">
                                        {{ result.error }}<br>
                                    </div>

                                    <router-link to="/renewal" tag="button" class="button is-primary is-medium is-fullwidth">
                                        Request new activation link.
                                    </router-link>
                                </div>
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
    import {handleHttpError} from "../util"

    @Component({
        name: "Activation"
    })
    export default class Activation extends Vue {
        pending = true;
        result = {
            success: false,
            error: ""
        }

        constructor() {
            super();
            this.doActivate();
        }

        doActivate() {
            const activationToken = this.$route.params.id;

            http.get("v1/user/activation/" + activationToken)
                .then(response => {
                    this.pending = false;
                    this.result.success = response.data.success;
                    this.result.error = response.data.error;
                })
                .catch(err => {
                    this.pending = false;
                    this.result.success = false;
                    this.result.error = handleHttpError("Activation", err);
                });
        }

        goToHome() {
            this.$router.push({path: "/"});
        }
    }
</script>

<style>
</style>
