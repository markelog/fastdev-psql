--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.1
-- Dumped by pg_dump version 9.5.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: test; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE test (
    test character(5) NOT NULL,
    title character varying(40) NOT NULL,
    did integer NOT NULL
);


ALTER TABLE test OWNER TO postgres;

--
-- Data for Name: test; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY test (test, title, did) FROM stdin;
\.


--
-- Name: firstkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY test
    ADD CONSTRAINT firstkey PRIMARY KEY (test);


--
-- Name: public; Type: ACL; Schema: -; Owner: arkel
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM arkel;
GRANT ALL ON SCHEMA public TO arkel;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

