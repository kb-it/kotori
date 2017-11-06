// entrypoint for the generated codegen.js

import * as codegen from './codegen';

if (!codegen.init(false)) {
    console.error("Could not find ffmpeg!");
    process.exit(-1);
}

codegen.getFingerprint(process.argv[2], (codes, err) => {
    if (err != null) {
        process.send!({error: err});
        process.exit(-2);
    } else {
        process.send!({codes: codes});
    }
    process.exit(0);
});
