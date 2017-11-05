// The wrapper component for codegen
// This wraps a emscripten compiled version of `echoprint-codegen`
// import { app } from 'electron';

declare var WebAssembly: any;
declare var __static: any;

var fs = require("fs");
var util = require("util");
var path = require("path");
var zlib = require("zlib");

// makes sure ffmpeg exists and is therefore callable
export function init() {
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
    return locations.some((loc) => fs.existsSync(path.join(loc, "ffmpeg" + ext)));
}

export function getFingerprint(filePath: string) {
    // node workaround since emscripten will try to use fetch else
    WebAssembly.instantiateStreaming = undefined;
    var codegen = __non_webpack_require__(path.join(__static, 'codegen.js'));

    (<any>codegen)({
        wasmBinaryFile: path.join(__static, "codegen.wasm"),
        onExit: (code: number) => console.log("exit ", code),
        print: (output: string) => {
            if (output[0] == "{") {
                var data = JSON.parse(output);
                var raw = new Buffer(data.code, "base64");
                var buf = zlib.unzipSync(raw);

                // we already presort & make the codes unique since thats what 
                // the search part of echoprint server also does
                // we stick to that for now.
                var codes = [];
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

                console.log("{" + codes.join(",") + "}")
            }
        },
        // TODO: make sure to redirect stderr printErr: function(){},
    });
}
