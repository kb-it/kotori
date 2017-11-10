import Vue from 'vue'
import * as Vuex from 'vuex'
import {ipcRenderer} from 'electron';

export interface AppState {
    files: {[path:string]: File},
    user: string | null,
}

export interface FileTags {
    title: string,
    artist: string,
    album: string,
    comment: string,
    genre: string,
    year: string,
    track: string,
}

export interface RemoteId {
    id: number,
    remote: boolean,
}

export interface File {
    path: string,
    active: boolean,
    error?: string,
    fp?: number[]
    tags?: FileTags,
    tracks?: any[],
    // the index of the selected remote track
    remote?: RemoteId,
}

const state: AppState = {
    files: {},
    user: null,
}

const mutations = {
    ADD_FILE(state: AppState, {path, file}: {path:string, file:File}) {
        Vue.set(state.files, path, Object.assign({path}, file));
    },
    UPDATE_FILE(state: AppState, {path, changes}: {path: string, changes:File}) {
        if (!state.files[path]) return;
        Object.assign(state.files[path], changes);
    },
    SET_FILES(state: AppState, files: AppState) {
        Vue.set(state, "files", files);
    },
    SET_USER(state: AppState, user: string) {
        state.user = user;
    }
}

const actions = {
    addFile({ commit }: Vuex.Store<AppState>, path:string) {
        var file = {active: false, error: undefined, fp: undefined, remote: {}};
        // get a fingerprint & meta info from codegen in the background,
        // this goes renderer --> main --> fork and back through 2 layers of IPC
        let cb: any;
        cb = (event: any, fileName: string, msg: any) => {
            if (fileName != path) return;
            ipcRenderer.removeListener("get-track-result", cb);
            // TODO: handle error
            let changes = {
                error: msg.error,
                fp: !msg.error && msg.codes ? msg.codes : undefined,
                tags: !msg.error && msg.tags ? msg.tags : undefined,
            };
            commit('UPDATE_FILE', {path, changes});
        };
        ipcRenderer.on("get-track-result", cb);
        ipcRenderer.send("get-track", path);
        commit('ADD_FILE', {path, file});
    },
    retainFiles({ commit, state }: Vuex.Store<AppState>, closure: (file:File) => boolean) {
        var newState = Object.assign({}, state.files);
        for (let file of Object.keys(newState).filter((key) => !closure(newState[key]))) {
            delete newState[file];
        }
        commit('SET_FILES', newState);
    }
}

export default {
    state,
    mutations,
    actions
}
