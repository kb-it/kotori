// The wrapper component for codegen
// This wraps a emscripten compiled version of `echoprint-codegen`

declare var WebAssembly: any;
declare var __static: any;

import {FileTags} from '../renderer/store/modules/app'

var fs = require("fs");
var util = require("util");
var path = require("path");
var zlib = require("zlib");

// makes sure ffmpeg exists and is therefore callable
export function init(isMain: boolean) {
    var platform = process.platform === "win32" ? "win" : process.platform;
    var devPath = util.format("third-party/%s/%s", platform, process.arch);
    var locations = [""];

    // make sure that in development builds (non-bundled) we'll be able to find ffmpeg
    if (process.env.NODE_ENV === 'development') {
        var fragments = process.env.PATH!.split(path.delimiter);
        var loc: any = path.join(process.cwd(), devPath);
        locations.push(loc);
        fragments.push(loc);
        process.env.PATH = fragments.join(path.delimiter);
    }

    var ext = platform === "win" ? ".exe" : "";
    if (!locations.some((loc) => fs.existsSync(path.join(loc, "ffmpeg" + ext)))) {
        return false;
    }
    return true;
}

export type FpCallback = (codes: number[] | null, err: any) => void;

// TODO: kill the electron-webpack guys, this is ugly!!!
const staticPath = (!__static || __static.indexOf("undefined") == 0) ? process.argv[2] : __static;

export function getFingerprint(filePath: string, cb: FpCallback | null) {
    // node workaround since emscripten will try to use fetch else
    WebAssembly.instantiateStreaming = undefined;

    var codegen = __non_webpack_require__(path.join(staticPath, "codegen.js"));
    var buffer = "";

    (<any>codegen)({
        arguments: [filePath],
        wasmBinaryFile: path.join(staticPath, "codegen.wasm"),
        onExit: (code: number) => {
            var codes: number[] | null = null;
            if (buffer[0] == "[") {
                var data = JSON.parse(buffer);
                if (data.length != 1) {
                    console.warn("Got more than one file back from codegen (", buffer.length, ")");
                }
                var raw = new Buffer(data[0].code, "base64");
                var buf = zlib.unzipSync(raw);

                // we already presort & make the codes unique since thats what
                // the search part of echoprint server also does
                // we stick to that for now.
                codes = [];
                // we skip the offsets, as spotify doesn't seem to use them anymore
                // echoprint-codegen generates ASCII-Hex numbers which are zlib compressed
                // https://github.com/spotify/echoprint-server/blob/f9e9b157044ff1b838114c395b83c4187cf6b729/echoprint_server/lib.py
                for (var i = buf.length / 2; i < buf.length; i += 5) {
                    var elem = parseInt(buf.toString("ascii", i, i + 5), 16);
                    codes.push(elem);
                }
                codes.sort(function (a, b) { return a - b; });
                codes = codes.filter(function(item, pos, arr) {
                    return pos == 0 || item != arr[pos - 1];
                });
            }
            if (cb) cb(codes, null); cb = null;
        },
        print: (output: string) => {
            buffer += output;
        },
        printErr: () => console.log("An error occurred"),
        // errors land on stderr anyways (due to child_process.execSync handling pretty much all errors than can occur)
        // so no need to print them again
        quit: (status: any, err: any) => { if (cb) cb(null, err); cb = null; },
    });
}

export function metaData(filePath: string, tags: FileTags | null, cb: (tags: FileTags | null, err?: any) => void) {
    // node workaround since emscripten will try to use fetch else
    WebAssembly.instantiateStreaming = undefined;

    var taglib = __non_webpack_require__(path.join(staticPath, "taglib.js"));
    var buffer = fs.readFileSync(filePath);

    (<any>taglib)({
        wasmBinaryFile: path.join(staticPath, "taglib.wasm"),
        io_buffer: buffer,
        tags: tags,
        onExit: function(code: number) {
            if (code == 0) {
                if (tags) {
                    // create a backup, TODO: make configurable?
                    fs.writeFileSync(filePath + ".bak", buffer);
                    fs.writeFileSync(filePath, this.io_buffer);
                }
                cb(this.tags, null);
            } else cb(null, code);
        },
        print: (output: string) => {
            console.log("metaDataOut: ", output);
        },
        printErr: (e: any) => console.log("metaData/An error occurred: ", e),
        quit: (status: any, err: any) => { console.log("metaData/quit"); }
    });
}
