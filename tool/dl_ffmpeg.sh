#!/bin/bash
set -e
echo "Fetching FFMPEG builds and storing them in third-party for bundling..."
rm -rf third-party && mkdir -p third-party third-party/win/x86/ third-party/win/x64/ third-party/linux/x86/ third-party/linux/x64/ third-party/mac/x64/
echo "win32"
wget -q --show-progress https://ffmpeg.zeranoe.com/builds/win32/static/ffmpeg-3.4-win32-static.zip -O tmp.zip && unzip -p tmp.zip *ffmpeg.exe > third-party/win/x86/ffmpeg.exe && rm tmp.zip
echo "win64"
wget -q --show-progress https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-3.4-win64-static.zip -O tmp.zip && unzip -p tmp.zip *ffmpeg.exe > third-party/win/x64/ffmpeg.exe && rm tmp.zip
echo "linux32"
wget -q --show-progress https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-32bit-static.tar.xz -O - | tar xJf - --wildcards *ffmpeg -O > third-party/linux/x86/ffmpeg
echo "linux64"
wget -q --show-progress https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-64bit-static.tar.xz -O - | tar xJf - --wildcards *ffmpeg -O > third-party/linux/x64/ffmpeg
echo "mac64"
wget -q --show-progress https://ffmpeg.zeranoe.com/builds/macos64/static/ffmpeg-20171105-6ea7711-macos64-static.zip -O tmp.zip && unzip -p tmp.zip *ffmpeg > third-party/mac/x64/ffmpeg && rm tmp.zip
