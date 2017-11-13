<template>
    <div class="tile is-ancestor">
        <div class="tile is-4 is-vertical is-parent">
            <div class="tile is-child box">
            </div>
        </div>
        <div class="tile is-8 is-vertical is-parent">
            <div class="tile is-child box">
                <h1 class="title is-1 has-text-black">
                    Welcome to Kotori!
                </h1>
                <div class="content">
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
    import Vue from "vue";
    import Component from "vue-class-component";

    @Component({
        name: "Start"
    })
    export default class Start extends Vue {
    }
</script>
<style>
</style>
