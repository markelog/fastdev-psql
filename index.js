import { resolve } from 'path';
import { stringify } from 'querystring';
import fs from 'fs';

import DBuilder from 'DBuilder';
import chalk from 'chalk';
import vow from 'vow';
import { Spinner } from 'cli-spinner';
import { fileSync as file } from 'tmp';

const image = resolve('./images/psql.Dockerfile');

const defer = Symbol();
const dumpCopy = Symbol();

export default class PSQL {
  /**
   * Our own fs, so we can stub it
   * @static
   * @type {FS}
   */
  static fs = fs;

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

    /**
     * Builder instance
     * @type {DBuilder}
     */
    this.builder = new DBuilder({
      name: this.name,
      port: this.port,
      exposed: 5432,
      envs: this.envs,
      image: image
    });

    /**
     * Finish promise
     * @private
     * @type {Deferred}
     */
    this[defer] = vow.defer();

    /**
     * Path on which copy of the dump will be stored
     * @private
     * @type {String}
     */
    this[dumpCopy] = file().name;

    /**
     * Spinner instance
     * @type {Spinner}
     */
    this.spin = new Spinner('Docking... %s');
    this.spin.setSpinnerString('|/-\\');
  }

  /**
   * Start psql db instance
   * @return {Promise}
   */
  up() {
    this.copy();
    this.spin.start();
    return this.builder.up().then(() => {
      return this[defer].promise();
    });
  }

  /**
   * Copy psql dump
   */
  copy() {
    PSQL.fs.createReadStream(this.dump)
      .pipe(
        fs.createWriteStream(this[dumpCopy])
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

    return this
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
      if (~data.indexOf('PostgreSQL init process complete; ready for start up')) {
        this.spin.stop(true);
        console.log(123);
        console.log(
          `${chalk.green('>')}
          Container "${this.name}"
          ${chalk.green('started')}\n`.replace(/\s+/g, ' ')
        );
        this[defer].resolve();
      }
    });

    return this;
  }
}
