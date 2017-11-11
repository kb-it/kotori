#include <emscripten.h>
#include <tag.h>
#include <fileref.h>

#include <mpegfile.h>
#include <id3v2tag.h>
#include <attachedpictureframe.h>

#include <tiostream.h>

using namespace std;
using namespace TagLib;

/* This is a wrapper for an external nodejs input stream that directly uses a given input buffer
 * (passed as Module.io_buffer)
 */
class JsIOStream : public TagLib::IOStream {
    long pos = 0;
public:
    FileName name() const {
        /* TODO, this might be used for recognition, so pass it in properly e.g. through Module["io_filename"] */
        return ".mp3";
    }
    bool readOnly() const { return false; }
    bool isOpen() const { return true; }

    ByteVector readBlock(unsigned long length) {
        ByteVector ret = ByteVector(length, 0);
        length = EM_ASM_INT({
            var buf = Module["io_buffer"];
            var len = Math.min($1, buf.length - $2);
            HEAPU8.set(buf.subarray($2, $2 + len), $0);
            return len;
        }, ret.data(), length, this->pos);
        ret.setData(ret.data(), length);
        this->pos += length;
        return ret;
    }

    void writeBlock(const ByteVector &data) {
        EM_ASM_(({
            var buf = Module["io_buffer"];
            var bufs = [
                buf.slice(0, $2),
                new Buffer(HEAPU8.subarray($0, $0 + $1)),
                buf.slice($2 + $1),
            ];
            Module["io_buffer"] = Buffer.concat(bufs);
            return bufs[1].length;
        }), data.data(), data.size(), this->pos);
        this->pos += data.size();
    }

    void removeBlock(unsigned long start = 0, unsigned long length = 0) {
        EM_ASM_({
            var buf = Module["io_buffer"];
            Module["io_buffer"] = Buffer.concat([buf.slice(0, $0), buf.slice($0 + $1)]);
        }, start, length);
        this->pos = this->length();
    }

    void insert(const ByteVector &data, unsigned long start = 0, unsigned long replace = 0) {
        EM_ASM_({
            var buf = Module["io_buffer"];
            Module["io_buffer"] = Buffer.concat([
                buf.slice(0, $2),                           // the fragment before
                new Buffer(HEAPU8.subarray($0, $0 + $1)),   // the newly inserted data
                buf.slice($2 + $3)                          // the remaining data after the replace
            ]);
        }, data.data(), data.size(), start, replace);
        this->pos = start + data.size();
    }

    long length() {
        return EM_ASM_INT(return Module["io_buffer"].length);
    }

    void truncate(long length) {
        EM_ASM_(Module["io_buffer"].slice(0, $1), length);
    }

    long tell() const { return pos; }

    void seek(long offset, Position p = Beginning) {
        if (p == Beginning) {
            this->pos = offset;
        } else if (p == Current) {
            this->pos += offset;
        } else if (p == End) {
            this->pos = this->length() + offset;
        } else {
            throw std::invalid_argument("position: not supported seek point");
        }
    }
};

/* WriteXY: Fetch a given <type> value from JS and serialize it to the given input buffer */
#define WRITE_TAG_INT(attr, cb) do { \
    int val = EM_ASM_INT(return Module["tags"][attr]||0); \
    cb; \
} while(0);

#define WRITE_TAG_STRING(attr, cb) do { \
    /* First fetch the length, so we know how much to allocate on the heap */ \
    int len = EM_ASM_INT({ \
        if (Module["tags"].hasOwnProperty(attr)) { \
            if (Module["tags"][attr] === null) return 0; \
            var buf = new Buffer(Module["tags"][attr]); \
            Module["tags"][attr] = buf; \
            return buf.length; \
        } else { \
            return -1; \
        } \
    }); \
    /* If there's a value available, wrap it in a ByteVector and call the callback */ \
    if (len >= 0) { \
        auto vec = ByteVector::null; \
        if (len > 0) { \
            vector<char> str(len); \
            EM_ASM_({ \
                HEAPU8.set(Module["tags"][attr], $0); \
            }, str.data()); \
            vec = ByteVector(str.data(), len); \
        } \
        cb; \
    } \
} while (0);

/* ReadXY: Store a given <type> value in the JS tags object */
#define READ_TAG_INT(attr, cb) EM_ASM_((Module["tags"]attr = $0 || Module["tags"]attr), cb);
#define READ_TAG_STRING(attr, cb) EM_ASM_((Module["tags"][attr] = Pointer_stringify($0) || Module["tags"][attr]), cb);

int main(int argc, char *argv[])
{
    TagLib::FileRef f(new JsIOStream());
    int modeRead = EM_ASM_INT(return !Module["tags"]);

    /* transmutes a given input pointer & length into the respective nodejs buffer */
    EM_ASM((Module["Pointer_bufferify"] = function(data, len) { return new Buffer(HEAPU8.subarray(data, data + len)); }));

    // perform a read (if no tags are set)
    if (modeRead) {
        EM_ASM((Module["tags"] = {}));

        if (auto file = dynamic_cast<TagLib::MPEG::File *>(f.file())) {
            if (auto tag = file->ID3v2Tag()) {
                EM_ASM((Module["tags"]["id3v2"] = {}));
                READ_TAG_STRING("title", tag->title().toCString());
                READ_TAG_STRING("artist", tag->artist().toCString());
                READ_TAG_STRING("album", tag->album().toCString());
                READ_TAG_STRING("comment", tag->comment().toCString());
                READ_TAG_STRING("genre", tag->genre().toCString());
                READ_TAG_INT(["year"], tag->year());
                READ_TAG_INT(["track"], tag->track());

                auto list = tag->frameList();
                for (auto i = list.begin(); i != list.end(); ++i) {
                    cout << "FRAME " << (*i)->frameID() << " " << (*i)->toString() << "\n";

                    if (auto frame = dynamic_cast<TagLib::ID3v2::AttachedPictureFrame *>(*i)) {
                        cout << "ATTACHED PICTURE " << frame << "\n";
                        EM_ASM_(((Module["tags"]["id3v2"]["attachedPicture"] = (Module["tags"]["id3v2"]["attachedPicture"] || [])).push({
                                type: $0,
                                mime: Pointer_stringify($1),
                                descr: Pointer_stringify($2),
                                data: Module["Pointer_bufferify"]($3, $4),
                            })),
                            frame->type(),
                            frame->mimeType().toCString(),
                            frame->description().toCString(),
                            frame->picture().data(),
                            frame->picture().size()
                        );
                    }
                }
            }
        }
    }
    // ... or a write, if some tags are given
    else {
        WRITE_TAG_STRING("title", f.tag()->setTitle(vec));
        WRITE_TAG_STRING("artist", f.tag()->setArtist(vec));
        WRITE_TAG_STRING("album", f.tag()->setAlbum(vec));
        WRITE_TAG_STRING("comment", f.tag()->setComment(vec));
        WRITE_TAG_STRING("genre", f.tag()->setGenre(vec));
        WRITE_TAG_INT("year", f.tag()->setYear(val));
        WRITE_TAG_INT("track", f.tag()->setTrack(val));

        // TODO:
        EM_ASM({
            if (Module["tags"]["id3v2"] && Module["tags"]["id3v2"]["attachedPicture"])
                throw "attachedPicture write not implemented yet";
        });
        f.save();
    }
}
