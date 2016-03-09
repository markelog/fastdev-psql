import { resolve } from 'path';
import fs from 'fs';

import DBuilder from 'DBuilder';
import chalk from 'chalk';
import vow from 'vow';
import { Spinner } from 'cli-spinner';
import { dirSync as dir } from 'tmp';

const image = `${__dirname}/../images/Dockerfile`;
const make = `${__dirname}/../images/make.sh`;

const defer = Symbol();
const copies = Symbol();

export default class PSQL {
  /**
   * Our own fs, so we can stub it
   * @static
   * @type {FS}
   */
  static fs = fs;

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
      POSTGRES_DB: process.env.POSTGRES_DB || opts.db
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
    this.copy();
    this.spin.start();
    return this.builder.up().then(() => this[defer].promise());
  }

  /**
   * Copy psql dump
   */
  copy() {
    PSQL.fs.createReadStream(this.dump)
      .pipe(
        fs.createWriteStream(this[copies].dump)
      );

    PSQL.fs.createReadStream(image)
      .pipe(
        fs.createWriteStream(this[copies].image)
      );

    PSQL.fs.createReadStream(make)
      .pipe(
        fs.createWriteStream(this[copies].make)
      );

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
    type = type || 'log';

    this.spin.stop(true);
    console[type](message);
    this.spin.start();

    return this;
  }

  /**
   * Log all events into the console
   */
  log() {
    this.builder.on('complete', () => {
      this.console(
        `${chalk.green('>')}
        Container "${this.name}" ${chalk.green('builded')} `.replace(/\s+/g, ' ')
      );
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
      if (!data.includes('PostgreSQL init process complete; ready for start up')) {
        return;
      }

      this.spin.stop(true);

      console.log(
        `${chalk.green('>')}
        Container "${this.name}"
        ${chalk.green('started')}\n`.replace(/\s+/g, ' ')
      );

      this[defer].resolve();
    });

    return this;
  }
}
