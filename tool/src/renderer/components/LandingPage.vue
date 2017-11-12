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
                                Sign In to Synchronize
                            </router-link>
                        </h1>
                        <button @click="addFileThroughDialog()" class="button is-primary is-fullwidth">
                            Add File (Click or via Drag & Drop)
                        </button>
                    </div>
                </div>
            </section>

            <div class="panel-heading sync-preview-header">
                <span class="vcenter">Selected Files</span>
                <div>
                    <button class="button is-primary vcenter"
                        v-if="Object.keys(files).length"
                        v-bind:class="{'is-loading': pendingSync}" @click="sync(currentUser && supportedTags)">
                        {{ supportedTags && currentUser ? "Sync" : "Save" }}
                    </button>
                    <button class="button is-danger vcenter"
                        v-if="Object.keys(files).length && Object.values(files).some((f) => JSON.stringify(f.tags) != JSON.stringify(f.lastTags))"
                        v-bind:class="{'is-loading': pendingSync}" @click="revertChanges()">
                        Revert Changes
                    </button>
                    <button class="button is-primary vcenter"
                        v-if="Object.keys(files).length && currentUser && !supportedTags"
                        v-bind:class="{'is-loading': pendingSync}" @click="syncPreview()">
                        Sync Preview
                    </button>
                </div>
            </div>
            <a v-for="(file, path) in files" v-bind:class="{'is-active': file.active, 'is-danger': file.error != null}" @click="selectFile(file)"
                class="panel-block">
                <span class="panel-icon">
                    <i v-if="file.error!=null" class="fa fa-exclamation-triangle"></i>
                    <i v-else-if="file.fp!=null" class="fa fa-music"></i>
                    <i v-else class="fa fa-cog fa-spin fa-3x fa-fw"></i>
                </span>

                <div v-bind:title="path" class="is-clipped" style="width: 98%;">
                    <div>{{ file.tags ? file.tags.title : path }}</div>
                    <div v-if="file.tags" class="is-size-7 has-text-grey" style="white-space: nowrap;">{{ path }}</div>
                    <br>
                    <table class="table is-bordered is-hoverable is-narrow is-fullwidth" v-if="file.tags">
                        <thead>
                            <tr>
                                <th colspan="2" class="has-text-centered" style="width: 50%;">Local</th>
                                <th v-if="file.tracks" colspan="3" class="has-text-centered" style="width: 50%;">
                                    Remote Value
                                </th>
                            </tr>
                            <tr>
                                <th class="has-text-centered">Tag</th>
                                <th class="has-text-centered">Value</th>
                                <th v-if="file.tracks && file.remote > -1" class="is-narrow"></th>
                                <th v-if="file.tracks" class="has-text-centered">
                                    <select class="select is-fullwidth" v-bind:value="file.remote"
                                        @change="changeRemoteTrack(file, $event.target)">
                                        <option disabled selected="selected" value="">Choose track</option>
                                        <option value="-1">New track version</option>
                                        <option disabled>──────────</option>
                                        <option v-for="(track, id) of file.tracks" v-bind:value="id">{{id+1}}. {{ track }}</option>
                                    </select>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(value, key) in getZippedTags(file)"
                                v-if="typeof value.local != 'object' || !value.local">
                                <td>{{ key }}</td>
                                <td><input v-bind:value="value.local" type="text" class="input" @input="setTagValue(file, key, $event.target.value)"></input></td>
                                <td v-if="file.tracks && file.remote > -1">
                                    <p class="field" style="white-space: nowrap;">
                                        <a class="button" @click="file.tags[key] = value.remote||null;">
                                            <span class="icon is-small">
                                                <i class="fa fa-arrow-left"></i>
                                            </span>
                                        </a>
                                        <a class="button" @click="file.tracks[file.remote][key] = value.local||null;">
                                            <span class="icon is-small">
                                                <i class="fa fa-arrow-right"></i>
                                            </span>
                                        </a>
                                    </p>
                                </td>
                                <td v-if="file.tracks" class="vcenter">{{ value.remote }}</input></td>
                            </tr>
                        </tbody>
                    </table>
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
    import {File, FILE_TAG_KEYS} from '../store/modules/app'
    import {http} from '../config'

    const dialog = remote.dialog;

    document.ondragover = document.ondrop = (ev) => ev.preventDefault();

    @Component
    export default class LandingPage extends Vue {
        pendingSync = false;
        supportedTags = null;

        get files() {
            return this.$store.state.app.files;
        }

        get currentUser() {
            return this.$store.state.app.user;
        }

        mounted() {
            document.addEventListener("drop", this.onDrop);
        }

        beforeDestroy() {
            document.removeEventListener("drop", this.onDrop);
        }

        setTagValue(file: File, key: string, value: string) {
            let tags = Object.assign({},  file.tags, {[key]: value});
            this.$store.commit("UPDATE_FILE", {path: file.path, changes: {tags}});
        }

        // zip the local file and remote file for a given file into one object (grouped by tags)
        // e.g. {tag: {local: "local", remote: "remote"}, ...} from a given File
        getZippedTags(file: File) {
            if (!file.tags) return {};
            let zippedArr = Object.keys(file.tags).map((key) => (
                {tag: key, local: file.tags[key], remote: file.remote > -1 ? file.tracks[file.remote][key] : null}
            ));
            return Object.assign({}, ...zippedArr.map(({tag, local, remote}) => ({[tag]: {local, remote}})));
        }

        // change the synchronisation "partner" (remote side) of a given track
        changeRemoteTrack(file: File, element: any) {
            let givenRemote = element.value;
            if (givenRemote < 0) {
                let newRemote = file.tracks.length;
                let newTracks = file.tracks.concat([{}]),
                    lastTracks = file.lastTracks.concat([{}]);
                this.$store.commit("UPDATE_FILE", {path: file.path, changes: {tracks: newTracks, lastTracks, remote: newRemote}});
                Vue.nextTick(() => element.value = newRemote);
            } else {
                this.$store.commit("UPDATE_FILE", {path: file.path, changes: {remote: givenRemote}});
            }
        }

        // keep all unselected items (=> throw away selected ones)
        deleteSelectedItems() {
            this.$store.dispatch("retainFiles", (file:File) => !file.active);
        }

        selectFile(file: File) {
            let changes = {active: !file.active};
            this.$store.commit("UPDATE_FILE", {path: file.path, changes});
        }

        addFile(path: string) {
            if (this.files[path]) return;
            // TODO: watch for file changes
            this.$store.dispatch("addFile", path);
        }

        addFileThroughDialog() {
            let paths = dialog.showOpenDialog({
                properties: ['openFile']
            });
            if (paths != null) {
                this.AddFile(paths[0]);
            }
        }

        onDrop(event: DragEvent) {
            for (let file of Array.from(event.dataTransfer.files)) {
                this.addFile(file.path);
            }
        }

        // Fetch matching tracks for the given files and provide opportunity to align and synchronize those
        syncPreview() {
            this.pendingSync = true;

            let unwatch: () => void;
            let startSync = () => {
                let requestedTracks = Object.values(this.files);
                let fpToTrack = Object.assign({}, ...requestedTracks.map((obj, i) => ({[obj.fp]: obj})));
                unwatch();
                http.post("v1/tracks/query", requestedTracks.map((file) => ({fingerprint: file.fp})))
                    .then((response) => {
                        for (let responseTrack of response.data) {
                            let requestedTrack = fpToTrack[responseTrack.fingerprint];
                            requestedTrack.tracks = responseTrack.tracks;
                            requestedTrack.lastTracks = JSON.parse(JSON.stringify(responseTrack.tracks));
                        }
                        http.get("/v1/tagnames")
                            .then((response) => {
                                this.supportedTags = response.data;
                                this.pendingSync = false;
                            })
                            .catch((err) => handleHttpError("Could not get supported tags", err));
                    })
                    .catch((err) => {
                        this.pendingSync = false;
                        handleHttpError("Request failed", err);
                    })
            };
            let checkReady = (state: any) => !Object.values(state.app.files).some((file) => file.fp == null);
            unwatch = this.$store.watch(
                checkReady,
                (ready) => {if (ready) startSync()},
                {deep: true}
            );
            if (checkReady(this.$store.state)) startSync();
        }

        // Perform the synchronisation the user picked
        sync(syncRemote: boolean) {
            this.pendingSync = true;
            let newTracks = [],
                updateTracks = [];

            let onlyTags = (obj) => Object.assign({},
                ...Object.keys(obj).filter((key) => this.supportedTags.includes(key))
                                      .map((key) => ({[key]: obj[key]}))
            );

            // Build a list of tracks to update on the server
            if (syncRemote) {
                for (let file of Object.values(this.files)) {
                    if (file.remote > -1) {
                        console.log(this.supportedTags);
                        let track = file.tracks[file.remote];
                        let tags = onlyTags(track);
                        // make sure something actually changed since the last time
                        if (!Object.keys(tags).some((key) => track[key] != file.lastTracks[file.remote][key])) {
                            continue;
                        }
                        if (!track.trackId) {
                            newTracks.push({fingerprint: file.fp, tags});
                        } else {
                            updateTracks.push({trackId: track.trackId, tags});
                        }
                    }
                }
            }

            // First perform the client --> remote sync part
            let promises = [];
            if (newTracks.length) {
                promises.push(http.post("v1/tracks/", newTracks));
            }
            if (updateTracks.length) {
                promises.push(http.put("v1/tracks", updateTracks));
            }
            Promise.all(promises)
                .then((responses) => {
                    console.log("sync responses", responses);

                    // write local changes into the files
                    let writes = [];
                    for (let file of Object.values(this.files)) {
                        console.log(file, Object.keys(file.tags));
                        if (JSON.stringify(file.tags) != JSON.stringify(file.lastTags)) {
                            console.log("locally updating ", file);
                            writes.push(this.$store.dispatch("updateFileTags", {file, meta: file.tags}));
                        }
                    }
                    // wait until local files are updated
                    Promise.all(writes)
                        .then(() => this.pendingSync = false)
                        .catch((err) => handleHttpError("Writing to files failed ", err));
                })
                .catch((err) => handleHttpError("Remote Sync failed", err))
        }

        revertChanges() {
            // abort the current synchronizations
            for (let file of Object.values(this.files)) {
                // revert local changes too
                let tags = JSON.parse(JSON.stringify(file.lastTags));
                let changes = {remote: -1, tracks: undefined, lastTracks: undefined, tags};
                this.$store.commit("UPDATE_FILE", {path: file.path, changes});
            }
            this.supportedTags = null;
        }
    }
</script>

<style>
    .vcenter {
        vertical-align: middle !important;
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
