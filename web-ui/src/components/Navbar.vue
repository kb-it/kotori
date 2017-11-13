<template>
    <nav class="navbar is-fixed-top is-dark" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <router-link to="/" tag="a" class="navbar-item navbar-logo">
                <img :src="require('@/assets/logo.png')" alt="Logo">
                <span class="title is-4 has-text-light">Kotori</span>
            </router-link>
            <div class="navbar-item has-dropdown is-hoverable is-hidden-desktop" v-if="currentUser">
                <router-link to="/changepw" tag="a" class="navbar-item" title="Change password">
                    <span class="icon"><i class="fa fa-user-circle"></i></span>
                </router-link>

                <div class="navbar-item">
                    <a @click.prevent="logout()" class="navbar-item" title="Sign out">
                        <span class="icon"><i class="fa fa-sign-out"></i></span>
                    </a>
                </div>
            </div>
            <router-link v-if="!currentUser" to="/register" tag="a" class="navbar-item is-hidden-desktop" title="Sign up">
                <span class="icon"><i class="fa fa-user-plus"></i></span>
            </router-link>
            <router-link v-if="!currentUser" to="/login" tag="a" class="navbar-item is-hidden-desktop" title="Login">
                <span class="icon"><i class="fa fa-sign-in"></i></span>
            </router-link>
        </div>
        <div class="navbar-menu">
            <div class="navbar-end">
                <div class="navbar-item has-dropdown is-hoverable" v-if="currentUser">
                    <a class="navbar-link">
                        <span class="icon"><i class="fa fa-user-circle"></i></span>
                        <span>{{currentUser}}</span>
                    </a>

                    <div class="navbar-dropdown is-boxed">
                        <router-link to="/changepw" tag="a" class="navbar-item">
                            Change password
                        </router-link>
                        <a @click.prevent="logout()" class="navbar-item">
                            <span class="icon"><i class="fa fa-sign-out"></i></span>
                            <span>Sign out</span>
                        </a>
                    </div>
                </div>
                <div class="navbar-item">
                    <div class="field is-grouped">
                        <div v-if="!currentUser" class="control">
                            <router-link to="/register" tag="button" class="button is-primary vcenter">
                                <span class="icon"><i class="fa fa-user-plus"></i></span>
                                <span>Sign Up</span>
                            </router-link>
                        </div>
                        <div v-if="!currentUser"  class="control">
                            <router-link to="/login" tag="button" class="button is-link vcenter">
                                <span class="icon"><i class="fa fa-sign-in"></i></span>
                                <span>Login</span>
                            </router-link>
                        </div>
                        <div class="control">
                            <a class="button is-primary is-inverted" href="https://kotorimusic.ga/bin/kotori_tool_v.1.0.0.exe" title="Download Kotori Tool">
                                <span class="icon">
                                    <i class="fa fa-windows"></i>
                                </span>
                                <span>Download</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>
</template>
<script lang="ts">
    import Vue from "vue";
    import Component from "vue-class-component";
    import {goToHome} from "../util";

    @Component({
        name: "Navbar"
    })
    export default class Navbar extends Vue {
        user = "";

        get currentUser() {
            return this.$store.state.app.user;
        }

        mounted() {
            this.user = this.currentUser;
        }

        logout() {
            this.$store.commit("RESET_USER");
            localStorage.removeItem("token");
            goToHome.call(this);

        }
    }
</script>
<style>
    @import "~bulma/css/bulma.css";
    .hero .navbar.is-dark {
        background-color: #363636;
    }
    .navbar-logo {
        padding: 0 1.5rem;
    }
    .navbar-logo img {
        height: 68px;
        margin-bottom: -16px;
        max-height: none;
    }
</style>
