<template>
    <div class="columns">
        <div class="column is-6 is-vertical">
            <figure>
                <img class="image bordered" :src="require('@/assets/screenshot_tool.png')" alt="Screenshot Kotori Tool">
                <figcaption class="has-text-centered">
                    Screenshot Kotori Tool
                </figcaption>
            </figure>
        </div>
        <div class="column is-6">
            <h1 class="title is-1 has-text-light has-text-centered">
                Welcome to Kotori!
            </h1>
            <div class="content">
                <div class="columns">
                    <div class="column">
                        <a class="button is-large is-link" href="https://kotorimusic.ga/bin/kotori_tool_v.1.0.0.exe" title="Download Kotori Tool">
                            <span class="icon"><i class="fa fa-windows"></i></span>
                            <span>Download</span>
                        </a>
                    </div>
                    <div class="column">
                        <a class="button is-large is-link" disabled>
                            <span class="icon"><i class="fa fa-apple"></i></span>
                            <span>Coming soon</span>
                        </a>
                    </div>
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
    .image.bordered {
        border: 1px solid #ECECEC;
    }
</style>
