<template>
    <div class="hero is-primary is-fullheight is-bold">
        <div class="hero-head">
            <navbar></navbar>
        </div>
        <main class="hero-body">
            <router-view></router-view>
        </main>
        <div class="hero-foot">
            <page-footer></page-footer>
        </div>
    </div>
</template>
<script lang="ts">
    import Vue from "vue";
    import Component from "vue-class-component";
    import Navbar from "@/components/Navbar.vue";
    import PageFooter from "@/components/PageFooter.vue";

    @Component({
        name: "StartPage",
        components: {
            Navbar,
            PageFooter
        }
    })
    export default class StartPage extends Vue {

    }
</script>
<style>
    .modal {
        z-index: 30;
    }
</style>
