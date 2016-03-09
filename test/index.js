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

  describe('PSQL#copy', () => {
    let action;
    beforeEach(() => {
      sinon.stub(PSQL.fs, 'createReadStream').returns({
        pipe: sinon.stub()
      });
      sinon.stub(PSQL.fs, 'createWriteStream');
      action = instance.copy();
    });

    afterEach(() => {
      PSQL.fs.createReadStream.restore();
      PSQL.fs.createWriteStream.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
    });

    it('should read file', () => {
      expect(PSQL.fs.createReadStream).to.been.calledWith(instance.dump);
    });

    it('should write file', () => {
      expect(PSQL.fs.createWriteStream).to.been.called;
    });
  });

  describe('PSQL#up', () => {
    let action;
    beforeEach(() => {
      sinon.stub(instance, 'copy');
      sinon.stub(instance.spin, 'start');
      sinon.stub(instance.builder, 'up').returns(new Promise(resolve => resolve()));
      action = instance.up();
    });

    afterEach(() => {
      instance.copy.restore();
      instance.spin.start.restore();
      instance.builder.up.restore();
    });

    it('should return promise', () => {
      expect(action).to.have.property('then');
    });

    it('should copy', () => {
      expect(instance.copy).to.have.been.called;
    });

    it('should start spinner', () => {
      expect(instance.spin.start).to.have.been.called;
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
      sinon.stub(instance, 'console');
      sinon.stub(console, 'log');
      action = instance.log();
    });

    afterEach(() => {
      instance.builder.on.restore();
      console.log.restore();
      instance.console.restore();
    });

    it('should return itself', () => {
      expect(action).to.equal(instance);
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
        instance.builder.on.firstCall.args[1]();
        instance.builder.on.secondCall.args[1]();
        instance.builder.on.thirdCall.args[1]();

        calls = {
          first: instance.console.firstCall.args[0],
          second: instance.console.secondCall.args[0],
          third: instance.console.thirdCall.args[0]
        };

        sinon.stub(instance.spin, 'stop');
      });

      afterEach(() => {
        instance.spin.stop.restore();
      });

      it('should pass message to the console for "complete" event', () => {
        expect(calls.first).to.contain('builded');
      });

      it('should pass message to the console for "stopped and removed" event', () => {
        expect(calls.second).to.contain('stopped and removed');
      });

      it('should pass message to the console for "error" event', () => {
        expect(calls.third).to.contain('Error');
      });

      describe('"data" event', () => {
        let message = 'PostgreSQL init process complete; ready for start up';

        it('should not pass message to the console for "data" event without needed string', () => {
          instance.builder.on.getCall(3).args[1]('string');
          expect(instance.console.getCall(3)).to.equal(null);
        });

        it('should pass message to the console for "data" event with needed string', () => {
          instance.builder.on.getCall(3).args[1](message);
          expect(console.log).to.be.called;
        });

        it('should pass message to the console for "data" event with needed string', () => {
          instance.builder.on.getCall(3).args[1](message);
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
