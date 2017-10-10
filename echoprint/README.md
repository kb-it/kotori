# Echoprint
This compiles [Echoprint-Codegen](https://github.com/spotify/echoprint-codegen) with a few patches using emscripten
into a native wasm module.  
This allows easy embedding in every usecase and is a very portable solution.  
The resulting wasm module requires ffmpeg to be in the PATH on the executing system to do PCM resampling,  
which is required (and would be too slow to do in wasm).

# Instructions

Requirements: Docker only

```sh
docker build -t kotori_build_helper .
docker run kotori_build_helper cat /echoprint-codegen/src/codegen.js > codegen.js
docker run kotori_build_helper cat /echoprint-codegen/src/codegen.wasm > codegen.wasm
```

