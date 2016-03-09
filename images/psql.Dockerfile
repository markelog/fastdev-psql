FROM postgres:9.5

COPY make.sh /docker-entrypoint-initdb.d/
COPY dump.sql /
RUN chmod 755 /docker-entrypoint-initdb.d/make.sh

