# TagLib JS wrapper
This is a wrapper around taglib used to read or write tags from a given file.  

# Read tags from a file
```js
var taglib = require("./taglib.js");
var buf = fs.readFileSync("example.mp3");

taglib({
    io_buffer: buf,
    onExit: function(code) {
        // TODO: you should check if code == 0
        console.log(this.tags);
    }
})
```

# Writing tags to a file
```js
var taglib = require("./taglib.js");
var buf = fs.readFileSync("example.mp3");
taglib({
    io_buffer: buf,
    tags: {artist: "test2 hallo"},
    onExit: function(code) {
        // TODO: you should check if code == 0
        fs.writeFileSync("test.mp3", this.io_buffer);
    }
})
```

# Build Instructions
This requires docker.

```sh
docker build -t taglib_builder .
docker run --rm taglib_builder cat taglib.js > taglib.js
docker run --rm taglib_builder cat taglib.wasm > taglib.wasm
```
