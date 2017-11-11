// entrypoint for the generated codegen.js

import * as codegen from './codegen';

if (!codegen.init(false)) {
    console.error("Could not find ffmpeg!");
    process.exit(-1);
}

function handleError(err: any) {
    if (err) {
        process.send!({error: err});
        process.exit(-2);
    }
}

codegen.getFingerprint(process.argv[2], (codes, err) => {
    handleError(err);
    codegen.metaData(process.argv[2], null, (tags, err) => {
        handleError(err);
        process.send!({ codes, tags });
        process.exit(0);
    });
});
