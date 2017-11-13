<template>
    <footer class="navbar is-fixed-bottom is-dark no-min-height">
        <div class="container no-min-height">
            <div class="navbar-menu">
                <div class="navbar-start">
                    <router-link to="/legal-notice" tag="a" class="navbar-item">
                        Legal Notice
                    </router-link>
                </div>
                <div class="navbar-end">
                    <div class="navbar-item">
                        Copyright &copy; 2017 Steffen Butzer & Kevin Bittner
                    </div>
                </div>
            </div>
        </div>
    </footer>
</template>
<script lang="ts">
    import Vue from 'vue'
    import Component from "vue-class-component"

    @Component({
        name: "Footer"
    })
    export default class Footer extends Vue{

    }
</script>
<style scoped>
    .no-min-height {
        min-height: auto;
    }
    footer .navbar-item {
        font-size: 12px;
        line-height: 1.25;
    }
</style>
