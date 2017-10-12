# last known to work version is 10.0
FROM postgres:10

RUN apt-get update && apt-get install -y postgresql-server-dev-10 build-essential

ADD src src
RUN ls src

RUN cd src && make && make install

RUN echo "create extension pg_echoprint FROM unpackaged;" > /docker-entrypoint-initdb.d/init-echoprint.sql
