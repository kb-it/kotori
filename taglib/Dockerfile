FROM ubuntu:17.10
SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y git wget python build-essential default-jre cmake

# Emscripten 1.37.22 is latest known to work version, if something should break unexpectedly
RUN wget https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz \
    && tar xzf emsdk-portable.tar.gz \
    && rm emsdk-portable.tar.gz \
    && cd emsdk-portable \
    && ./emsdk update \
    && ./emsdk install latest \
    && ./emsdk activate latest

# Latest known to work is cb9f07d9dcd791b63e622da43f7b232adaec0a9a, if something should break unexpectedly
RUN git clone https://github.com/taglib/taglib.git

RUN source ./emsdk-portable/emsdk_env.sh && \
    (cd taglib && emcmake cmake . && make && make install)

ADD pre.js pre.js
ADD wrapper.cpp wrapper.cpp

RUN chmod +x taglib/taglib-config && source ./emsdk-portable/emsdk_env.sh && \
    em++ -std=c++11 -O3 -s WASM=1 -s MODULARIZE=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORT_NAME="'TagLib'" -s EXPORTED_FUNCTIONS="['_main']" \
    `taglib/taglib-config --cflags` wrapper.cpp taglib/taglib/libtag.a --pre-js pre.js -o taglib.js
