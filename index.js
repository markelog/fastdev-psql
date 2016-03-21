import { resolve } from 'path';
import { copySync as copy } from 'fs-extra';
import { writeFileSync as write } from 'fs';

import DBuilder from 'dbuilder';
import chalk from 'chalk';
import vow from 'vow';
import { Spinner } from 'cli-spinner';
import { dirSync as dir } from 'tmp';

const image = `${__dirname}/../images/Dockerfile`;

const defer = Symbol();
const copies = Symbol();

export default class PSQL {
  /**
   * Our own copy, so we can stub it
   * @static
   * @type {FS}
   */
  static copy = copy;

  /**
   * Our own write, so we can stub it
   * @static
   * @type {FS}
   */
  static write = write;

  /**
   * Our own DBuilder, so we can stub it
   * @static
   * @type {FS}
   */
  static DBuilder = DBuilder;

  constructor(opts = {}) {

    /**
     * Name of the container db
     * @type {String}
     */
    this.name = opts.name;

    /**
     * Host port
     * @type {String}
     */
    this.port = opts.port || 5432;

    /**
     * Database name
     * @type {String}
     */
    this.database = opts.db;

    /**
     * Path to the sql dump
     * @type {String}
     */
    this.dump = resolve(opts.dump);

    /**
     * Environment variables
     * @type {Object}
     */
    this.envs = {
      POSTGRES_USER: process.env.POSTGRES_USER || opts.user,
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || opts.password,
      POSTGRES_DB: process.env.POSTGRES_DB || this.database
    };

    const dirTmp = dir().name;

    /**
     * Path in which dockerfile and associated files will be copied
     * @private
     * @type {String}
     */
    this[copies] = {
      dump: `${dirTmp}/dump.sql`,
      image: `${dirTmp}/Dockerfile`,
      make: `${dirTmp}/make.sh`
    };

    /**
     * Builder instance
     * @type {DBuilder}
     */
    this.builder = new DBuilder({
      name: this.name,
      port: this.port,
      exposed: 5432,
      envs: this.envs,
      image: this[copies].image
    });

    /**
     * Finish promise
     * @private
     * @type {Deferred}
     */
    this[defer] = vow.defer();

    /**
     * Spinner instance
     * @type {Spinner}
     */
    this.spin = new Spinner(`${chalk.blue('>')} Docking... ${chalk.blue('%s')}`);
    this.spin.setSpinnerString('|/-\\');
  }

  /**
   * Start psql db instance
   * @return {Promise}
   */
  up() {
    this.prepare();

    return this.builder.up().then(() => this[defer].promise());
  }

  /**
   * Copy dump and image, prepare make.sh
   */
  prepare() {
    const makeTxt = `#!/bin/bash \n\npsql -d ${this.database} -U postgres -f /dump.sql`;

    PSQL.copy(this.dump, this[copies].dump);
    PSQL.copy(image, this[copies].image);

    PSQL.write(this[copies].make, makeTxt, 'utf8');

    return this;
  }

  /**
   * Pump container actions into the stdout
   */
  pump() {
    this.builder.pump();

    return this;
  }

  /**
   * Message into the console with spinner reset
   * @param {String} message - what should we output
   * @param {String} type - type of message, like "log" or "error"
   */
  console(message, type) {
    this.spin.stop(true);
    this.message(message, type);
    this.spin.start();

    return this;
  }

  /**
   * Message to stdout (easier to stub this in tests)
   */
  message(message, type) {
    type = type || 'log';

    console[type](message);
  }

  /**
   * Log all events into the console
   */
  log() {
    this.spin.start();

    // Stop spin here, so it wouldn't intersect with `docker pull`
    this.builder.on('download', () => this.spin.stop(true));

    this.builder.on('complete', () => {
      this.message(
        `${chalk.green('>')}
        Container "${this.name}" ${chalk.green('builded')} `.replace(/\s+/g, ' ')
      );

      // Re-start spin here, so it wouldn't intersect with `docker pull`
      this.spin.start();
    });

    this.builder.on('stopped and removed', () => {
      this.console(
        `${chalk.red('>')} Container "${this.name}"
        ${chalk.red('stopped and removed')}`.replace(/\s+/g, ' ')
      );
    });

    this.builder.on('error', error => {
      this.console(
        `${chalk.red('>')}
        Error with "${this.name}" - ${error}`.replace(/\s+/g, ' '),
        'error'
      );
    });

    this.builder.on('data', data => {
      if (!~data.indexOf('PostgreSQL init process complete; ready for start up')) {
        return;
      }

      this.spin.stop(true);

      this.message(
        `${chalk.green('>')}
        Container "${this.name}"
        ${chalk.green('started')}\n`.replace(/\s+/g, ' ')
      );

      this[defer].resolve();
    });

    return this;
  }
}
