<template>
  <div class="container">
    <main>
      <button @click="addFile()" class="button is-primary is-fullwidth">
        Datei hinzufügen (Click oder Drag&Drop)
      </button>
      <router-link to="/sync" tag="button">Synchronize Meta Data</router-link>

      <nav class="panel">
        <p class="panel-heading" style="padding-bottom: 16px;">
          <span style="vertical-align: middle;">Zu synchronisierende Dateien</span>
          <button class="button is-outlined is-danger is-pulled-right" @click="deleteSelectedItems()">
            <i class="fa fa-trash-o"></i>
          </button>
        </p>
        <a class="panel-block" v-for="(file, path) in files" v-bind:class="{'is-active': file.active, 'is-danger': file.error != null}" @click="selectFile(path)">
          <span class="panel-icon">
            <i v-if="file.error!=null" class="fa fa-exclamation-triangle"></i>
            <i v-else-if="file.fp!=null" class="fa fa-music"></i>
            <i v-else class="fa fa-cog fa-spin fa-3x fa-fw"></i>
          </span>
          <span class="is-loading"></span>
          {{ path }}
        </a>
      </nav>
    </main>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'

  import {remote} from 'electron';

  const dialog = remote.dialog;

  document.ondragover = document.ondrop = (ev) => ev.preventDefault();

  @Component
  export default class LandingPage extends Vue {
    get files() {
      return this.$store.state.files.files;
    }

    mounted() {
      document.addEventListener("drop", this.onDrop);
    }

    beforeDestroy() {
      document.removeEventListener("drop", this.onDrop);
    }

    // keep all unselected items (=> throw away selected ones)
    deleteSelectedItems() {
      this.$store.dispatch("retainFiles", (file) => !file.active);
    }

    selectFile(path) {
      let changes = {active: !this.files[path].active};
      this.$store.commit("UPDATE_FILE", {path, changes});
    }

    doAddFile(path: string) {
      if (this.files[path]) return;
      // TODO: watch for file changes
      this.$store.dispatch("addFile", path);
    }

    addFile() {
      let paths = dialog.showOpenDialog({ 
        properties: ['openFile']
      });
      if (paths != null) {
        this.doAddFile(paths[0]);
      }
    }

    onDrop(event: DragEvent) {
      for (let file of Array.from(event.dataTransfer.files)) {
        this.doAddFile(file.path);
      }
    }
  }
</script>

<style>
  .panel-block .is-danger {
    background-color: #FFCCCC;
  }
</style>
