<template>
  <main>
    <nav class="panel">
      <section class="hero is-light">
        <div class="hero-body has-text-centered">
          <div class="container">
            <h1 class="title vcenter" v-if="currentUser!=null">
              Logged in as
              <router-link to="/login" tag="button" class="button is-link is-large vcenter">
                <i class="fa fa-user"></i><strong>{{ currentUser }}</strong>
              </router-link>
            </h1>
            <h1 v-else class="title vcenter">
              <router-link to="/login" tag="button" class="button is-link is-large is-fullwidth vcenter">
                Sign In
              </router-link>
            </h1>
          </div>
        </div>
      </section>
      <button @click="addFile()" class="button is-primary is-fullwidth">
        Datei hinzufügen (Click oder Drag&Drop)
      </button>
      <p class="panel-heading" style="padding-bottom: 16px;">
        <span class="vcenter">Zu synchronisierende Dateien</span>
        <router-link to="/sync" tag="button" class="is-pulled-right button is-primary">Synchronize Meta Data</router-link>
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
      <div class="panel-block" v-if="Object.keys(files).length>0">
        <button class="button is-danger is-fullwidth" @click="deleteSelectedItems()">
          Delete
        </button>
      </div>
    </nav>
  </main>
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

    get currentUser() {
        return this.$store.state.files.user;
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
  .vcenter {
    vertical-align: middle;
  }
  .panel-block .is-danger {
    background-color: #FFCCCC;
  }
</style>
