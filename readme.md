[![Build Status](https://travis-ci.org/markelog/fastdev-psql.svg?branch=master)](https://travis-ci.org/markelog/fastdev-psql)
[![Coverage Status](https://coveralls.io/repos/github/markelog/fastdev-psql/badge.svg?branch=master)](https://coveralls.io/github/markelog/fastdev-psql?branch=master)

# Quickly start Postgres DB
## Use-case
You need to quickly spin postgres and you don't afraid to use docker.

## Usage
```js
import PSQL from 'fastdev-psql';

let psql = new PSQL({
  name: 'test-psql', // Name of the container
  port: 9999, // Host port
  user: 'test-user', // Database user
  password: 'test-pass', // Database password
  db: 'test-db', // Database name
  dump: `${__dirname}/dump.sql` // dump (optional)
});

psql.pump(); // Pump **all** info into stdout

psql.log(); // Show "pretty" output

psql.up().then(() => console.log('done and done'));
```
