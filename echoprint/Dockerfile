FROM ubuntu:17.10
SHELL ["/bin/bash", "-c"]

# libboost1.6.2-dev as latest known to work version
RUN apt-get update && apt-get install -y git wget python build-essential cmake default-jre libboost-dev

# Emscripten 1.37.22 is latest known to work version, if something should break unexpectedly
RUN wget https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz \
    && tar xzf emsdk-portable.tar.gz \
    && rm emsdk-portable.tar.gz \
    && cd emsdk-portable \
    && ./emsdk update \
    && ./emsdk install latest \
    && ./emsdk activate latest

RUN mkdir /include /deps && git clone https://github.com/madler/zlib.git /deps/zlib && ln -s /deps/zlib /include/zlib

ADD ./echoprint-codegen /echoprint-codegen

# Latest known ZLIB version is 1.2.11, if something should break unexpectedly
RUN cd /echoprint-codegen/src && ln -s /usr/include/boost /include/boost

ENV BOOST_CFLAGS -I../../include/ -I../../deps/zlib
RUN source ./emsdk-portable/emsdk_env.sh \
    && cd /echoprint-codegen/src \
    && (cd /deps/zlib && CFLAGS="-O3" emconfigure ./configure --static && emmake make) \
    && make \
    && emcc -O3 -s WASM=1 -s MODULARIZE=1 -s ALLOW_MEMORY_GROWTH=1 -s EXPORT_NAME="'EchoPrint'" -s EXPORTED_FUNCTIONS="['_main']" echoprint-codegen.bc /deps/zlib/libz.a -o codegen.js
