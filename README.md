# Kotori
Kotori (japanese: songbird) is a server- and client-side application for managing and tagging local music-files, which offers features for detecting file duplicates by checking audio-fingerprints.

## Concept

### Managing application (Web UI)

* Web application for managing and editing track information
* Authorization required for editing
* Datasets can be filtered
* Snapshots are created on each dataset modification
* Modifications shall be explicitly saved, so multiple datasets may be executed at once
* Abusing users may be reported by authorized users
* Modifications may be reverted to a previous snapshot by privileged users
* Supported tags are described on:
  http://id3.org/id3v2.4.0-frames
* Supported file types for uploading album covers are:
    * *.jpg
    * *.png

### Match tool (Local tool)

* Native client-side application
* Receives track information for local music-files
* Supported file types are:
    * *.mp3
* Capable of overwriting or merging ID3 tags of specified files with received values
* GUI and CLI
* CLI:
    * Node.js script
    * Usage:
        node run kotori.js [OPTIONS] file
    * Options can be specified by flags available:
        * -b, --backup
        Create backup of each edited file in specified directory
        * -h, --help
        Show help on how to use this monster
        * -l, --listduplicate
        Find and print paths of all duplicates to stdout, sorted by quality, best quality first
        * -m, --merge
        Merge existing ID3 tag values of specified tracks with received information
        * -o, --overwrite
        Overwrite existing ID3 tag values of specified files with received values
        * -r, --report
        List received information per specified track and print to stdout 
        * -v, --verbose
        Print further information during progress
    * Examples:
        * List all duplicates of mp3-files in current path and write to file:
        node run kotori.js -l *.mp3 > output.txt
        * Merge received information with ID3 tags of mp3-files in current path and print status during progress:
        node run kotori.js -m -v *.mp3
        * Print all received track information for specified file
        node run kotori.js -r "foo - bar.mp3" 

* GUI:
    * Wrapper for CLI
    * Drag-and-drop functionality for selecting tracks (folders / files)
    * Offers different actions for handling each duplicate:
        * Keep file with best quality only
        * Write paths of duplicates to file
        * Ignore
    * A selected action may be marked as default for current process

## Use cases

* Detect duplicates of tracks on your HDD

Kotori is capable of detecting duplicates of locally stored tracks, by creating audio-fingerprints. By creating audio-fingerprints even unnamed duplicated files will be recognized or duplicates of different quality, size and track length.

* Add proper ID3 tags to your tracks

Missing or incomplete ID3 tags of tracks in a huge music collection can be easily set and merged from our database, which can be collaboratively completed on our web application.

## Functionality

### Backend

#### Technology

* PostgreSQL
* NodeJS
* NodeJS packages:
    * Express
* RESTful API

#### REST-API

##### Paths

* /v1/tracks/query
    * Method: POST
    * Accept: application/json
    * Description:
        Returns all available song information from DB for specific songs, which must be determined by its fingerprints.
        Fingerprints of songs must be passed as JSON in request-body.
    * Example:
        * Request-Body:
            ```
            [
                {
                    "fingerprint": [0, 0, 0],
                },
                {
                    "fingerprint": [0, 0],
                },
                ...
            ]
        * Response-Body:
            ```
            [
                {
                    "fingerprint": [0, 0, 0],
                    "results": [
                        {
                            "trackId": "1",
                            "artist": "John Doe",
                            ...
                        },
                        {
                            "trackId": "20",
                        },
                        ...
                    ]
                },
                {
                    "fingerprint": [0, 0],
                    "results": [
                        {
                            "trackId": "12",
                            "artist": "Jane Doe",
                            ...
                        },
                        {
                            "trackId": "2",
                            ...
                        },
                        ...
                    ]
                },
                ...
            ]
* /v1/tracks
    * Method: PUT
    * Accept: application/json
    * Description:
        Updates stored information of specific songs stored on server with passed values. 
        Expects several song information grouped by its related fingerprints as JSON in request-body. 
    * Example:
        * Request-Body:
            ```
            [
                {
                    "fingerprint": [1, 1, 1],
                    "tags": {
                        "year": 1981
                    }
                },
                {
                    "fingerprint": [0, 0],
                    "tags": {
                        "artist": "Jane Doe",
                        "title": "Foo",
                        ...
                    }
                },
                {
                    "fingerprint": [0, 1],
                    "tags": {
                        "album": "Baz Bat - Part 1"
                        ...
                    }
                },
                {
                    "fingerprint": [1, 0],
                    "tags": {
                        ...
                    }
                },
                ...
            ]
