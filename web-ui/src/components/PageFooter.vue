<template>
    <footer class="footerbar is-fixed-bottom is-dark">
        <div class="footerbar-container no-min-height">
            <div class="footerbar-menu is-active">
                <div class="footerbar-start">
                    <router-link to="/legal-notice" tag="a" class="footerbar-item">
                        Legal Notice
                    </router-link>
                </div>
                <div class="footerbar-end">
                    <div class="footerbar-item">
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
    .footerbar.is-fixed-bottom {
        left: 0;
        position: fixed;
        right: 0;
        z-index: 30;
        bottom: 0;
    }
    .footerbar.is-dark {
        background-color: #363636;
        color: #f5f5f5;
    }
    .footerbar-container {
        max-width: 960px;
        margin: 0 auto;
    }
    .footerbar-item {
        font-size: 12px;
        line-height: 1.25;
        padding: .5rem 1.5rem;
        position: relative;
    }
    .footerbar-menu {
        display: flex;
    }
    .footerbar-menu .footerbar-start,
    .footerbar-menu .footerbar-end {
        -webkit-box-align: stretch;
        -ms-flex-align: stretch;
        align-items: stretch;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }
    .footerbar-menu .footerbar-start {
        -webkit-box-pack: start;
        -ms-flex-pack: start;
        justify-content: flex-start;
        margin-right: auto;
    }
    .footerbar-menu .footerbar-end {
        -webkit-box-pack: end;
        -ms-flex-pack: end;
        justify-content: flex-end;
        margin-left: auto;
    }
</style>
