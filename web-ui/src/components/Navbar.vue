<template>
    <nav class="navbar is-fixed-top is-dark" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <a class="navbar-item navbar-logo" href="/">
                <img :src="require('@/assets/logo.png')" alt="Logo">
                <span class="title is-4 has-text-light">Kotori</span>
            </a>
        </div>
        <div class="navbar-menu">
            <div class="navbar-end">
                <div class="navbar-item has-dropdown is-hoverable" v-if="currentUser !== null">
                    <a class="navbar-link">
                        <span class="icon"><i class="fa fa-user-circle"></i></span>
                        <span>{{currentUser}}</span>
                    </a>

                    <div class="navbar-dropdown is-boxed">
                        <router-link to="/changepw" tag="a" class="navbar-item">
                            Change password
                        </router-link>
                        <a class="navbar-item">
                            <span class="icon"><i class="fa fa-sign-out"></i></span>
                            <span>Sign out</span>
                        </a>
                    </div>
                </div>
                <div class="navbar-item" v-if="currentUser === null">
                    <router-link to="/register" tag="button" class="button is-primary vcenter">
                        <span class="icon"><i class="fa fa-user-plus"></i></span>
                        <span>Sign Up</span>
                    </router-link>
                </div>
                <div class="navbar-item" v-if="currentUser === null">
                    <router-link to="/login" tag="button" class="button is-link vcenter">
                        <span class="icon"><i class="fa fa-sign-in"></i></span>
                        <span>Login</span>
                    </router-link>
                </div>

                <span class="navbar-item">
                    <a class="button is-primary is-inverted">
                        <span class="icon">
                            <i class="fa fa-github"></i>
                        </span>
                        <span>Download</span>
                    </a>
                </span>
            </div>
        </div>
    </nav>
</template>
<script lang="ts">
    import Vue from "vue";
    import Component from "vue-class-component";

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
    }
</script>
<style>
    @import "~bulma/css/bulma.css";
    .navbar-logo {
        padding: 0 1.5rem;
    }
    .navbar-logo img {
        height: 68px;
        margin-bottom: -16px;
        max-height: none;
    }
</style>
