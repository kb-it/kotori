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

// write tags to the given file
if (process.argv[2] == "--write") {
    // wait until we get the new metadata from the parent process
    process.on('message', (m) => {
        codegen.metaData(process.argv[3], m, (tags, err) => {
            handleError(err);
            process.send!({});
            process.exit(0);
        });
    });
} else {
    codegen.getFingerprint(process.argv[2], (codes, err) => {
        handleError(err);
        codegen.metaData(process.argv[2], null, (tags, err) => {
            handleError(err);
            process.send!({ codes, tags });
            process.exit(0);
        });
    });
}
