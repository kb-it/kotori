-- Database generated with pgModeler (PostgreSQL Database Modeler).
-- pgModeler  version: 0.9.0
-- PostgreSQL version: 9.6
-- Project Site: pgmodeler.com.br
-- Model Author: ---


-- Database creation must be done outside an multicommand file.
-- These commands were put in this file only for convenience.
-- -- object: postgres | type: DATABASE --
-- -- default administrative connection database --
-- -- DROP DATABASE IF EXISTS postgres;
-- CREATE DATABASE postgres
-- 	TABLESPACE = pg_default
-- 	OWNER = postgres
-- ;
-- -- ddl-end --
-- 

-- object: "uuid-ossp" | type: EXTENSION --
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION "uuid-ossp"
      WITH SCHEMA public
      VERSION '1.1';
-- ddl-end --
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
-- ddl-end --

-- object: "uuid-ossp" | type: EXTENSION --
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION "pgcrypto"
      WITH SCHEMA public
      VERSION '1.3';
-- ddl-end --
COMMENT ON EXTENSION "pgcrypto" IS 'provides cryptographic functions for PostgreSQL';
-- ddl-end --

-- object: public."user" | type: TABLE --
-- DROP TABLE IF EXISTS public."user" CASCADE;
CREATE TABLE public."user"(
	id bigserial NOT NULL,
	mail text NOT NULL,
	password text NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	is_deleted boolean NOT NULL DEFAULT false,
	CONSTRAINT user_pk PRIMARY KEY (id)

);
-- ddl-end --
COMMENT ON COLUMN public."user".mail IS 'TODO: citext?';
-- ddl-end --
ALTER TABLE public."user" OWNER TO postgres;
-- ddl-end --

-- object: public.tag_type | type: TABLE --
-- DROP TABLE IF EXISTS public.tag_type CASCADE;
CREATE TABLE public.tag_type(
	id serial NOT NULL,
	name text NOT NULL,
	CONSTRAINT tag_type_pk PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tag_type OWNER TO postgres;
-- ddl-end --

-- object: public.tag | type: TABLE --
-- DROP TABLE IF EXISTS public.tag CASCADE;
CREATE TABLE public.tag(
	id bigserial NOT NULL,
	id_tag_type integer NOT NULL,
	id_track bigint NOT NULL,
	id_user bigint NOT NULL,
	revision integer NOT NULL,
	meta jsonb,
	value bytea NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT tag_revision_positive CHECK ((revision > 0)),
	CONSTRAINT tag_pk PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.tag OWNER TO postgres;
-- ddl-end --

-- object: public.fingerprint | type: TABLE --
-- DROP TABLE IF EXISTS public.fingerprint CASCADE;
CREATE TABLE public.fingerprint(
	id bigserial NOT NULL,
	hash integer[] NOT NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT fingerprint_pk PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.fingerprint OWNER TO postgres;
-- ddl-end --

-- object: public.user_token | type: TABLE --
-- DROP TABLE IF EXISTS public.user_token CASCADE;
CREATE TABLE public.user_token(
	id bigserial NOT NULL,
	id_user bigint NOT NULL,
	registration boolean NOT NULL,
	token uuid NOT NULL DEFAULT uuid_generate_v4(),
	created_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT user_token_pk PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.user_token OWNER TO postgres;
-- ddl-end --

-- object: public.track | type: TABLE --
-- DROP TABLE IF EXISTS public.track CASCADE;
CREATE TABLE public.track(
	id bigserial NOT NULL,
	id_user bigint NOT NULL,
	id_fingerprint bigint NOT NULL,
	created_at timestamp NOT NULL DEFAULT NOW(),
	CONSTRAINT track_pk PRIMARY KEY (id)

);
-- ddl-end --
ALTER TABLE public.track OWNER TO postgres;
-- ddl-end --

-- object: tag_user_fk | type: CONSTRAINT --
-- ALTER TABLE public.tag DROP CONSTRAINT IF EXISTS tag_user_fk CASCADE;
ALTER TABLE public.tag ADD CONSTRAINT tag_user_fk FOREIGN KEY (id_user)
REFERENCES public."user" (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: tag_tag_type_fk | type: CONSTRAINT --
-- ALTER TABLE public.tag DROP CONSTRAINT IF EXISTS tag_tag_type_fk CASCADE;
ALTER TABLE public.tag ADD CONSTRAINT tag_tag_type_fk FOREIGN KEY (id_tag_type)
REFERENCES public.tag_type (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: tag_track_fk | type: CONSTRAINT --
-- ALTER TABLE public.tag DROP CONSTRAINT IF EXISTS tag_track_fk CASCADE;
ALTER TABLE public.tag ADD CONSTRAINT tag_track_fk FOREIGN KEY (id_track)
REFERENCES public.track (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: user_token_user_fk | type: CONSTRAINT --
-- ALTER TABLE public.user_token DROP CONSTRAINT IF EXISTS user_token_user_fk CASCADE;
ALTER TABLE public.user_token ADD CONSTRAINT user_token_user_fk FOREIGN KEY (id_user)
REFERENCES public."user" (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: track_user_fk | type: CONSTRAINT --
-- ALTER TABLE public.track DROP CONSTRAINT IF EXISTS track_user_fk CASCADE;
ALTER TABLE public.track ADD CONSTRAINT track_user_fk FOREIGN KEY (id_user)
REFERENCES public."user" (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: track_fingerprint_fk | type: CONSTRAINT --
-- ALTER TABLE public.track DROP CONSTRAINT IF EXISTS track_fingerprint_fk CASCADE;
ALTER TABLE public.track ADD CONSTRAINT track_fingerprint_fk FOREIGN KEY (id_fingerprint)
REFERENCES public.fingerprint (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --


