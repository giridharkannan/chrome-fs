var test = require('tape').test
var fs = require('../../chrome')
var util = require('./util')

test('mkdir Sync', (t) => {
    setTimeout(() => {
    let path = '/fooSync/barSync';
    try {
        fs.mkdirSync(path);
        t.notOk(true, 'Able to create multiple folders '+path);
    } catch (err) {
        t.ok(err, path + ' is an error');
        t.same(err.code, 'ENOENT', path + ' should be no entry');

        fs.mkdirSync('/fooSync');
        fs.mkdirSync(path);

        util.catchWrapper(t, 'EEXIST', 'Able to create already exisiting folder '+path, fs.mkdirSync, path);

        fs.rmdirSync(path);
        fs.rmdirSync('/fooSync')
    } finally {
        t.end();
    }
}, 2000);
})

test('mkdir', function (t) {
  fs.mkdir('/foo/bar', function (err) {
    t.ok(err, '/foo/bar is an error')
    t.same(err.code, 'ENOENT', '/foo/bar should be no entry')

    fs.mkdir('/foo', function (err) {
      t.notOk(err, '/foo should create')

      fs.mkdir('/foo', function (err) {
        t.ok(err, 'Trying second /foo')
        t.same(err.code, 'EEXIST', 'second foo exists')

        fs.mkdir('/foo/bar', function (err) {
          t.notOk(err)
          t.end()
        })
      })
    })
  })
})

test('mkdir + stat Sync', (t) => {
    try {
        let dir = '/fooSync';
        fs.mkdirSync(dir);
        let stat = fs.statSync(dir);
        t.same(stat.mode, '0777');
        t.ok(stat.isDirectory());

        fs.rmdirSync(dir);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

test('mkdir + stat', function (t) {
  fs.mkdir('/foo', function () {
    fs.stat('/foo', function (err, stat) {
      t.notOk(err)
      t.same(stat.mode, '0777') // eslint-disable-line
      t.ok(stat.isDirectory())
      t.end()
    })
  })
})

test('mkdir with modes Sync', (t) => {
    try {
        let dir = '/fooSync';
        fs.mkdirSync(dir, '0766');
        let stat = fs.statSync(dir);
        t.same(stat.mode, '0777');
        t.ok(stat.isDirectory());

        fs.rmdirSync(dir);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

 // Mode will always default to '0777' on chrome OS
test('mkdir with modes', function (t) {
  fs.mkdir('/foo', '0766', function () { // eslint-disable-line
    fs.stat('/foo', function (err, stat) {
      t.notOk(err)
      t.same(stat.mode, '0777') // eslint-disable-line
      t.ok(stat.isDirectory())
      fs.rmdir('/foo/bar', function (err) {
        console.log('Clean /foo/bar mkdir', 'Error', err)
        fs.rmdir('/foo', function (err) {
          console.log('Clean mkdir', 'Error', err)
        })
      })
      t.end()
    })
  })
})
