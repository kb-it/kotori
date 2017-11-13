/**
 * File copied from kotori_tool /src/renderer/store/modules/app.ts
 */
/*
import Vue from "vue";
import * as Vuex from "vuex";
*/

export interface AppState {
    // files: {[path:string]: File},
    user: string | null;
}

/*
export interface FileTags {
    title: string,
    artist: string,
    album: string,
    comment: string,
    genre: string,
    year: string,
    track: string,
}

export interface File {
    active: boolean,
    error?: string,
    fp?: number[]
    tags?: FileTags,
}
*/
const state: AppState = {
    // files: {},
    user: localStorage.getItem("user")
};

const mutations = {
    /*
    ADD_FILE(state: AppState, {path, file}: {path:string, file:File}) {
        Vue.set(state.files, path, file);
    },
    UPDATE_FILE(state: AppState, {path, changes}: {path: string, changes:File}) {
        if (!state.files[path]) return;
        Object.assign(state.files[path], changes);
    },
    SET_FILES(state: AppState, files: AppState) {
        Vue.set(state, "files", files);
    },
    */
    RESET_USER(state: AppState) {
        state.user = undefined;
        localStorage.removeItem("user");
    },
    SET_USER(state: AppState, user: string) {
        state.user = user;
        localStorage.setItem("user", user);
    }
};

const actions = {
    /*
    addFile({ commit }: Vuex.Store<AppState>, path:string) {
        var file = {active: false, error: undefined, fp: undefined};
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
            commit("UPDATE_FILE", {path, changes});
        };
        ipcRenderer.on("get-track-result", cb);
        ipcRenderer.send("get-track", path);
        commit("ADD_FILE", {path, file});
    },
    retainFiles({ commit, state }: Vuex.Store<AppState>, closure: (file:File) => boolean) {
        var newState = Object.assign({}, state.files);
        for (let file of Object.keys(newState).filter((key) => !closure(newState[key]))) {
            delete newState[file];
        }
        commit("SET_FILES", newState);
    }
    */
};

export default {
    state,
    mutations,
    actions
};
