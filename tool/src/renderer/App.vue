<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'

  @Component
  export default class App extends Vue {
    name = 'Kotori Tool'
  }
</script>

<style>
  @import "~bulma/css/bulma.css";
  @import "~font-awesome/css/font-awesome.min.css";
</style>
