import Vue from 'vue'
import * as Vuex from 'vuex'
import {ipcRenderer} from 'electron';

interface FileState {
    files: {[path:string]: File},
    user: string | null,
}

export interface File {
    active: boolean,
    error?: string,
    fp?: number[]
}

const state: FileState = {
    files: {},
    user: null,
}

const mutations = {
    ADD_FILE(state: FileState, {path, file}: {path:string, file:File}) {
        Vue.set(state.files, path, file);
    },
    UPDATE_FILE(state: FileState, {path, changes}: {path: string, changes:File}) {
        if (!state.files[path]) return;
        Object.assign(state.files[path], changes);
    },
    SET_FILES(state: FileState, files: FileState) {
        Vue.set(state, "files", files);
    },
    SET_USER(state: FileState, user: string) {
            state.user = user;
    }
}

const actions = {
    addFile({ commit }: Vuex.Store<FileState>, path:string) {
        var file = {active: false, error: undefined, fp: undefined};
        // get a fingerprint from codegen in the background,
        // this goes renderer --> main --> fork and back through 2 layers of IPC
        let cb: any;
        cb = (event: any, fileName: string, msg: any) => {
            if (fileName != path) return;
            ipcRenderer.removeListener("get-fingerprint-result", cb);
            // TODO: handle error
            let changes = {
                error: msg.error,
                fp: !msg.error && msg.codes ? msg.codes : undefined,
            };
            commit('UPDATE_FILE', {path, changes});
        };
        ipcRenderer.on("get-fingerprint-result", cb);
        ipcRenderer.send("get-fingerprint", path);
        commit('ADD_FILE', {path, file});
    },
    retainFiles({ commit, state }: Vuex.Store<FileState>, closure: (file:File) => boolean) {
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
