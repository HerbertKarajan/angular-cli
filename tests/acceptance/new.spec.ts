// tslint:disable:max-line-length no-unused-expression
import * as fs from 'fs-extra';
import { expect } from 'chai';
import * as path from 'path';
import * as util from 'util';
import { EOL } from 'os';
import { forEach } from 'lodash';

const ng = require('../helpers/ng');
const tmp = require('../helpers/tmp');
const walkSync = require('walk-sync');
const SilentError = require('silent-error');
const Blueprint = require('@angular/cli/ember-cli/lib/models/blueprint');

const root = process.cwd();


describe('Acceptance: ng new', function () {
  beforeEach(function () {
    return tmp.setup('./tmp').then(function () {
      process.chdir('./tmp');
    });
  });

  afterEach(function () {
    this.timeout(10000);

    return tmp.teardown('./tmp');
  });

  function confirmBlueprintedForDir(dir: string) {
    return function () {
      let blueprintPath = path.join(root, dir, 'files');
      let expected: string[] = walkSync(blueprintPath);
      let actual = walkSync('.').sort();
      let directory = path.basename(process.cwd());

      forEach(Blueprint.renamedFiles, function (destFile, srcFile) {
        expected[expected.indexOf(srcFile)] = destFile;
      });

      expected.forEach(function (file, index) {
        expected[index] = file.replace(/__name__/g, '@angular/cli');
      });

      expected.sort();

      expect(directory).to.equal('foo');
      expect(expected).to.deep.equal(
        actual,
        EOL + ' expected: ' + util.inspect(expected) + EOL + ' but got: ' + util.inspect(actual));

    };
  }

  function confirmBlueprinted() {
    return confirmBlueprintedForDir('blueprints/ng');
  }

  it('requires a valid name (!)', () => {
    return ng(['new', '!', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => { throw new Error(); }, () => {});
  });
  it('requires a valid name (abc-.)', () => {
    return ng(['new', 'abc-.', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => { throw new Error(); }, () => {});
  });
  it('requires a valid name (abc-)', () => {
    return ng(['new', 'abc-', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => { throw new Error(); }, () => {});
  });
  it('requires a valid name (abc-def-)', () => {
    return ng(['new', 'abc-def-', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => { throw new Error(); }, () => {});
  });
  it('requires a valid name (abc-123)', () => {
    return ng(['new', 'abc-123', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => { throw new Error(); }, () => {});
  });
  it('requires a valid name (abc)', () => {
    return ng(['new', 'abc', '--skip-install', '--skip-git', '--inline-template']);
  });
  it('requires a valid name (abc-def)', () => {
    return ng(['new', 'abc-def', '--skip-install', '--skip-git', '--inline-template']);
  });

  it('ng new foo, where foo does not yet exist, works', function () {
    return ng(['new', 'foo', '--skip-install']).then(confirmBlueprinted);
  });

  it('ng new with empty app does throw exception', function () {
    expect(ng(['new', ''])).to.throw;
  });

  it('ng new without app name does throw exception', function () {
    expect(ng(['new', ''])).to.throw;
  });

  it('ng new with app name creates new directory and has a dasherized package name', function () {
    return ng(['new', 'FooApp', '--skip-install', '--skip-git']).then(function () {
      expect(!fs.pathExistsSync('FooApp'));

      const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      expect(pkgJson.name).to.equal('foo-app');
    });
  });

  it('ng new has a .editorconfig file', function () {
    return ng(['new', 'FooApp', '--skip-install', '--skip-git']).then(function () {
      expect(!fs.pathExistsSync('FooApp'));

      const editorConfig = fs.readFileSync('.editorconfig', 'utf8');
      expect(editorConfig).to.exist;
    });
  });

  it('Cannot run ng new, inside of Angular CLI project', function () {
    return ng(['new', 'foo', '--skip-install', '--skip-git'])
      .then(function () {
        return ng(['new', 'foo', '--skip-install', '--skip-git']).then(() => {
          throw new SilentError('Cannot run ng new, inside of Angular CLI project should fail.');
        }, () => {
          expect(!fs.pathExistsSync('foo'));
        });
      })
      .then(confirmBlueprinted);
  });

  it('ng new without skip-git flag creates .git dir', function () {
    return ng(['new', 'foo', '--skip-install']).then(function () {
      expect(fs.pathExistsSync('.git'));
    });
  });

  it('ng new with --dry-run does not create new directory', function () {
    return ng(['new', 'foo', '--dry-run']).then(function () {
      const cwd = process.cwd();
      expect(cwd).to.not.match(/foo/, 'does not change cwd to foo in a dry run');
      expect(!fs.pathExistsSync(path.join(cwd, 'foo')), 'does not create new directory');
      expect(!fs.pathExistsSync(path.join(cwd, '.git')), 'does not create git in current directory');
    });
  });

  it('ng new with --directory uses given directory name and has correct package name', function () {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--directory=bar'])
      .then(function () {
        const cwd = process.cwd();
        expect(cwd).to.not.match(/foo/, 'does not use app name for directory name');
        expect(!fs.pathExistsSync(path.join(cwd, 'foo')), 'does not create new directory with app name');

        expect(cwd).to.match(/bar/, 'uses given directory name');
        expect(fs.pathExistsSync(path.join(cwd, 'bar')), 'creates new directory with specified name');

        const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        expect(pkgJson.name).to.equal('foo', 'uses app name for package name');
      });
  });

  it('ng new --inline-template does not generate a template file', () => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--inline-template'])
      .then(() => {
        const templateFile = path.join('src', 'app', 'app.component.html');
        expect(fs.pathExistsSync(templateFile)).to.equal(false);
      });
  });

  it('ng new --inline-style does not gener a style file', () => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--inline-style'])
      .then(() => {
        const styleFile = path.join('src', 'app', 'app.component.css');
        expect(fs.pathExistsSync(styleFile)).to.equal(false);
      });
  });

  it('should skip spec files when passed --skip-tests', () => {
    return ng(['new', 'foo', '--skip-install', '--skip-git', '--skip-tests'])
      .then(() => {
        const specFile = path.join('src', 'app', 'app.component.spec.ts');
        expect(fs.pathExistsSync(specFile)).to.equal(false);
      });
  });

});
