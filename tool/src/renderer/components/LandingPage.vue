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
        <a class="panel-block" v-for="item of files" v-bind:class="{'is-active': item.active, 'is-danger': item.error != null}" @click="item.active=!item.active">
          <span class="panel-icon">
            <i v-if="item.error!=null" class="fa fa-exclamation-triangle"></i>
            <i v-else-if="item.fp!=null" class="fa fa-music"></i>
            <i v-else class="fa fa-cog fa-spin fa-3x fa-fw"></i>
          </span>
          <span class="is-loading"></span>
          {{ item.text }}
        </a>
      </nav>
    </main>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import Component from 'vue-class-component'

  import {remote, ipcRenderer} from 'electron';

  const dialog = remote.dialog;

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
      
      var file = {text: path, active: false, error: undefined, fp: undefined};
      this.files.push(file);

      // get a fingerprint from codegen in the background, 
      // this goes renderer --> main --> fork and back through 2 layers of IPC
      let cb;
      cb = (event, fileName, msg) => {
        if (fileName != path) return;
        ipcRenderer.removeListener("get-fingerprint-result", cb);
        // TODO: handle error
        file.error = msg.error;
        if (!msg.error && msg.codes) {
          file.fp = msg.codes;
        }
      };
      ipcRenderer.on("get-fingerprint-result", cb);
      ipcRenderer.send("get-fingerprint", path);
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
