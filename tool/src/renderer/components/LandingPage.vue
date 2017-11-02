<template>
  <div class="container">
    <main>
      <button readonly @click="addFile()" class="button is-primary is-fullwidth">
        Datei hinzufügen (Click oder Drag&Drop)
      </button>

      <nav class="panel">
        <p class="panel-heading">
          Zu synchronisierende Dateien
        </p>
        <a class="panel-block is-active" v-for="item of files">
          <span class="panel-icon">
            <i class="fa fa-music"></i>
          </span>
          {{ item }}
        </a>
      </nav>
    </main>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'

  const {remote} = require("electron");
  const dialog = remote.dialog;
  const codegen = remote.require("./main").codegen;

  console.log(codegen.getFingerprint("test"));

  document.ondragover = document.ondrop = (ev) => ev.preventDefault();

  @Component
  export default class LandingPage extends Vue {
    files: string[] = [];

    mounted() {
      document.addEventListener("drop", this.onDrop);
    }

    beforeDestroy() {
      document.removeEventListener("drop", this.onDrop);
    }

    doAddFile(path: string) {
      if (this.files.indexOf(path) > -1) return;
      // TODO: watch for file changes
      this.files.push(path);
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
</style>
