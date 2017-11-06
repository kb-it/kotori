// The wrapper component for codegen
// This wraps a emscripten compiled version of `echoprint-codegen`

declare var WebAssembly: any;
declare var __static: any;

import {ipcMain} from 'electron';

var fs = require("fs");
var util = require("util");
var path = require("path");
var zlib = require("zlib");
var child_process = require("child_process");

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
    if (isMain) registerEventHandler();
    return true;
}

// register an asynchronous IPC interface we'll use for communication with renderer
function registerEventHandler() {
    ipcMain.on("get-fingerprint", (event: any, filePath: string) => {
        var dir = path.dirname(process.argv.find((val) => val.endsWith(".js")));
        var forked = child_process.fork(path.join(dir, "index-codegen.js"), [filePath]);
        forked.on("message", (msg: any) => {
            // pass the message along to the renderer
            event.sender.send("get-fingerprint-result", filePath, msg);
        });
        forked.on("error", (err: any) => console.error("child err ", err));
    });
}

type FpCallback = (codes: number[] | null, err: any) => void;

export function getFingerprint(filePath: string, cb: FpCallback | null) {
    // node workaround since emscripten will try to use fetch else
    WebAssembly.instantiateStreaming = undefined;

    var codegen = __non_webpack_require__(path.join(__static, 'codegen.js'));
    var buffer = "";

    (<any>codegen)({
        arguments: [filePath],
        wasmBinaryFile: path.join(__static, "codegen.wasm"),
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
                // https://github.com/spotify/echoprint-server/blob/f9e9b157044ff1b838114c395b83c4187cf6b729/echoprint_server/lib.py
                for (var i = buf.length / 2; i < buf.length; i += 5) {
                    var elem = parseInt("" + buf.subarray(i, i + 5), 16);
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
