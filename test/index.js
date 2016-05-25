import { EventEmitter } from 'events';

import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';

import PSQL from '../index.js';

chai.use(sinonChai);
let expect = chai.expect;

describe('fastdev-psql', () => {
  let instance;
  beforeEach(() => {
    instance = new PSQL({
      name: 'test-psql',
      port: 9999,
      user: 'test-user',
      password: 'test-pass',
      db: 'test-db',
      dump: `${__dirname}/fixtures/test.sql`
    });
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(instance.name).to.equal('test-psql');
      expect(instance.port).to.equal(9999);
      expect(instance.dump).to.equal(`${__dirname}/fixtures/test.sql`);

      expect(instance.builder).to.be.instanceof(PSQL.DBuilder);

      expect(instance.envs).to.deep.equal({
        POSTGRES_USER: 'test-user',
        POSTGRES_PASSWORD: 'test-pass',
        POSTGRES_DB: 'test-db'
      });
    });
  });

  describe('Execution flow', () => {
    let action;

    beforeEach(() => {
      instance.builder = new EventEmitter();
      sinon.stub(instance, 'prepare');
      sinon.stub(instance.builder, 'removeListener');
      instance.builder.up = () => new Promise(resolve => resolve());

      instance.builder.on('error', () => {});
      sinon.spy(instance.builder, 'emit');

      action = instance.up();
    });

    afterEach(() => {
      instance.prepare.restore();
    });

    it('should resolve "up" promise', () => {
      instance.builder.emit(
        'data',
        'PostgreSQL init process complete; ready for start up'
      );

      expect(instance.builder.removeListener).calledWith('data');

      return action;
    });

    it('should reject promise and emit the error', () => {
      instance.builder.emit(
        'data',
        'FATAL:  could not extend file "base/1/2658": No space left on device'
      );

      expect(instance.builder.emit).calledWith('error');
      expect(instance.builder.removeListener).calledWith('data');

      return action.catch(() => {});
    });
  });

  describe('PSQL#prepare', () => {
    let action;
    beforeEach(() => {
      sinon.stub(PSQL, 'copy');
      sinon.stub(PSQL, 'write');
      action = instance.prepare();
    });

    afterEach(() => {
      PSQL.copy.restore();
      PSQL.write.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
    });

    it('should have been with instance.dump', () => {
      expect(PSQL.copy).to.been.calledWith(instance.dump);
    });

    it('should have been called twice times', () => {
      expect(PSQL.copy).to.been.calledTwice;
    });

    it('should have been write make.sh', () => {
      expect(PSQL.write).to.been.called;
    });

    it('should have been called with correct arguments', () => {
      let target = PSQL.write.firstCall.args[1];
      expect(target).to.equal('#!/bin/bash \n\npsql -d ' +
        `${instance.database} -U postgres -f /dump.sql`);
    });

    describe('when there is no "dump" option', () => {
      beforeEach(() => {
        instance = new PSQL({
          name: 'test-psql',
          port: 9999,
          user: 'test-user',
          password: 'test-pass',
          db: 'test-db'
        });

        PSQL.copy.restore();
        PSQL.write.restore();

        sinon.stub(PSQL, 'copy');
        sinon.stub(PSQL, 'write');

        instance.prepare();
      });

      it('should copy dockerfile', () => {
        expect(PSQL.copy.firstCall.args[0]).to.contain('Dockerfile');
        expect(PSQL.copy.firstCall.args[1]).to.contain('Dockerfile');
      });

      it('should write empty dump', () => {
        expect(PSQL.write.firstCall.args[0]).to.contain('dump.sql');
        expect(PSQL.write.firstCall.args[1]).to.be.empty;
      });

      it('should write exec command dump', () => {
        expect(PSQL.write.secondCall.args[1]).to.be.empty;
      });
    });
  });

  describe('PSQL#up', () => {
    let action;
    beforeEach(() => {
      sinon.stub(instance, 'prepare');
      sinon.stub(instance.spin, 'start');
      sinon.stub(instance.builder, 'up').returns(new Promise(resolve => resolve()));
      action = instance.up();
    });

    afterEach(() => {
      instance.prepare.restore();
      instance.spin.start.restore();
      instance.builder.up.restore();
    });

    it('should return promise', () => {
      expect(action).to.have.property('then');
    });

    it('should prepare', () => {
      expect(instance.prepare).to.have.been.called;
    });

    it('should start spinner', () => {
      expect(instance.spin.start).to.not.have.been.called;
    });

    it('should build up', () => {
      expect(instance.builder.up).to.have.been.called;
    });

    it('should build up', () => {
      expect(instance.builder.up).to.have.been.called;
    });
  });

  describe('PSQL#pump', () => {
    let action;
    beforeEach(() => {
      sinon.stub(instance.builder, 'pump');
      action = instance.pump();
    });

    afterEach(() => {
      instance.builder.pump.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
    });

    it('should call builder pump', () => {
      expect(instance.builder.pump).to.have.been.called;
    });
  });

  describe('PSQL#log', () => {
    let action;
    beforeEach(() => {
      sinon.stub(instance.builder, 'on');
      sinon.stub(instance, 'message');
      sinon.stub(instance, 'console');
      sinon.stub(instance.spin, 'start');
      action = instance.log();
    });

    afterEach(() => {
      instance.builder.on.restore();
      instance.message.restore();
      instance.console.restore();
      instance.spin.start.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
    });

    it('should add callback for event "download"', () => {
      expect(instance.builder.on).to.have.been.calledWith('download');
    });

    it('should add callback for event "complete"', () => {
      expect(instance.builder.on).to.have.been.calledWith('complete');
    });

    it('should add callback for event "stopped and removed"', () => {
      expect(instance.builder.on).to.have.been.calledWith('stopped and removed');
    });

    it('should add callback for event "error"', () => {
      expect(instance.builder.on).to.have.been.calledWith('error');
    });

    it('should add callback for event "data"', () => {
      expect(instance.builder.on).to.have.been.calledWith('data');
    });

    describe('callbacks', () => {
      let calls;
      beforeEach(() => {
        sinon.stub(instance.spin, 'stop');
        instance.builder.on.firstCall.args[1]();
        instance.builder.on.secondCall.args[1]();
        instance.builder.on.thirdCall.args[1]();
        instance.builder.on.getCall(3).args[1]();

        calls = {
          first: instance.console.firstCall.args[0],
          second: instance.console.secondCall.args[0]
        };
      });

      afterEach(() => {
        instance.spin.stop.restore();
      });

      it('should pass message to the console for "complete" event', () => {
        expect(instance.message.firstCall.args[0]).to.contain('builded');
      });

      it('should have called "spin.stop"', () => {
        expect(instance.spin.stop).to.have.been.calledWith(true);
      });

      it('should start spinner', () => {
        expect(instance.spin.start).to.have.been.called;
      });

      it('should pass message to the console for "stopped and removed" event', () => {
        expect(calls.first).to.contain('stopped and removed');
      });

      it('should pass message to the console for "error" event', () => {
        expect(calls.second).to.contain('Error');
      });

      describe('"data" event', () => {
        let message = 'PostgreSQL init process complete; ready for start up';

        it('should not pass message to the console for "data" event without needed string', () => {
          instance.builder.on.getCall(4).args[1]('string');
          expect(instance.console.getCall(4)).to.equal(null);
        });

        it('should pass message to the console for "data" event with needed string', () => {
          instance.builder.on.getCall(4).args[1](message);
          expect(instance.message).to.be.called;
        });

        it('should pass message to the console for "data" event with needed string', () => {
          instance.builder.on.getCall(4).args[1](message);
          expect(instance.spin.stop).to.be.calledWith(true);
        });
      });
    });
  });

  describe('PSQL#console', () => {
    let action;
    beforeEach(() => {
      sinon.stub(console, 'log');
      sinon.stub(instance.spin, 'start');
      sinon.stub(instance.spin, 'stop');
      action = instance.console('test', 'log');
    });

    afterEach(() => {
      console.log.restore();
      instance.spin.start.restore();
      instance.spin.stop.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
    });

    it('should call console.log', () => {
      expect(console.log).to.have.been.calledWith('test');
    });

    it('should call spin.start', () => {
      expect(instance.spin.start).to.have.been.called;
    });

    it('should call spin.stop', () => {
      expect(instance.spin.stop).to.have.been.calledWith(true);
    });

    it('should call spin.stop console.log', () => {
      expect(instance.spin.stop).to.have.been.calledBefore(console.log);
    });

    it('should call console.log before spin.start', () => {
      expect(console.log).to.have.been.calledBefore(instance.spin.start);
    });
  });
});
