# Echoprint Extension for Postgres
This compiles an extension for postgres.  
This is a very initial implementation (that similar to MusicBrainz first version) provides  
an `echoprint_compare` function that compares two given fingerprints.  
It takes the fingerprint as `integer[]` and can be used such as:
```sql
SELECT echoprint_compare('{1,2,3}', '{1}')
```

# Instructions to build a postgres image with the extension installed
```sh
docker build -t postgres-echoprint .
```

# Windows Instructions
These were only used during development and are currently unused.
```sh
set PG_PATH=../postgresql-10.0-1-windows-x64-binaries
set PG_INCLUDES=/I%PG_PATH%/include/server -I%PG_PATH%\include -I%PG_PATH%\include\server\port\win32 -I%PG_PATH%\include\server\port\win32_msvc
cl.exe /O2 /LD %PG_INCLUDES% pg_echoprint.c %PG_PATH%\lib\postgres.lib

# Then copy the .DLL into /postgres/lib and the files from share into /postgres/share/extension and execute this SQL:

CREATE EXTENSION "postgres-echoprint" FROM unpackaged;
```
