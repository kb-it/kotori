<template>
    <div>
        <h1>Sychronize</h1>
        <button @click="back()">Back</button>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue'
    import Component from 'vue-class-component'

    @Component
    export default class LandingPage extends Vue {
        back() {
            this.$router.go(-1);
        }
    }
</script>

<style>

</style>
