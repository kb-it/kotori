<template>
    <main>
        <nav class="panel">
            <section class="hero is-light">
                <div class="hero-body has-text-centered" style="padding-top: 2px;">
                    <div class="container">
                        <h1 class="title vcenter" v-if="currentUser!=null">
                            <router-link to="/login" tag="button" class="button is-link is-large is-fullwidth vcenter">
                                <span class="icon"><i class="fa fa-user"></i></span>
                                <strong>{{ currentUser }}</strong>
                            </router-link>
                        </h1>
                        <h1 v-else class="title vcenter">
                            <router-link to="/login" tag="button" class="button is-link is-large is-fullwidth vcenter">
                                Sign In
                            </router-link>
                        </h1>
                        <button @click="addFile()" class="button is-primary is-fullwidth">
                            Add File (Click or via Drag & Drop)
                        </button>
                    </div>
                </div>
            </section>

            <p class="panel-heading sync-preview-header">
                <span class="vcenter">Selected Files</span>
                <button class="button is-primary vcenter"
                    v-bind:class="{'is-loading': pendingSync}" @click="sync()"
                    v-bind:disabled="!currentUser || !Object.keys(files).length">
                    Sync Preview
                </button>
            </p>
            <a v-for="(file, path) in files" v-bind:class="{'is-active': file.active, 'is-danger': file.error != null}" @click="selectFile(path)"
                class="panel-block">
                <span class="panel-icon">
                    <i v-if="file.error!=null" class="fa fa-exclamation-triangle"></i>
                    <i v-else-if="file.fp!=null" class="fa fa-music"></i>
                    <i v-else class="fa fa-cog fa-spin fa-3x fa-fw"></i>
                </span>

                <div v-bind:title="path" class="is-clipped">
                    <div>{{ file.tags ? file.tags.title : path }}</div>
                    <div v-if="file.tags" class="is-size-7 has-text-grey" style="white-space: nowrap;">{{ path }}</div>
                </div>
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

    import {handleHttpError} from '../util'
    import {File} from '../store/modules/files'
    import {http} from '../config'

    const dialog = remote.dialog;

    document.ondragover = document.ondrop = (ev) => ev.preventDefault();

    @Component
    export default class LandingPage extends Vue {
        pendingSync = false;

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
            this.$store.dispatch("retainFiles", (file:File) => !file.active);
        }

        selectFile(path:string) {
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

        sync() {
            this.pendingSync = true;
            let requestedTracks = Object.values(this.files);
            let fpToTrack = Object.assign(...requestedTracks.map((obj, i) => ({[obj.fp]: obj})));

            let unwatch;
            let startSync = () => {
                unwatch();
                http.post("v1/tracks/query", requestedTracks.map((file) => ({fingerprint: file.fp})))
                    .then((response) => {
                        for (let responseTrack of response.data) {
                            let requestedTrack = fpToTrack[responseTrack.fingerprint];
                            requestedTrack.tracks = responseTrack.tracks;
                        }
                        this.pendingSync = false;
                    })
                    .catch((err) => {
                        this.pendingSync = false;
                        handleHttpError("Request failed", err);
                    })
            };
            let checkReady = (state) => !Object.values(state.files.files).some((file) => file.fp == null);
            unwatch = this.$store.watch(
                checkReady,
                (ready) => {if (ready) startSync()},
                {deep: true}
            );
            if (checkReady(this.$store.state)) startSync();
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
    .panel-icon {
        margin-right: 1.75em;
    }
    .sync-preview-header {
        padding-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center
    }
</style>
