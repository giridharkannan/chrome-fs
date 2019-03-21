var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util');

test('unlink Sync', (t) => {
    try {
        let errMsg = 'Able to delete non existing file';
        util.catchWrapper(t, 'ENOENT', errMsg, fs.unlinkSync, '/test');

        fs.writeFileSync('test', 'hello');
        let exists = fs.existsSync('test');
        t.ok(exists, 'File exists');

        fs.unlinkSync('test');
        exists = fs.existsSync('test');
        t.notOk(exists, 'File deleted');
    } catch (err) {
        t.ok(!err, 'Unknown error ' + err);
    }
    t.end();
})

test('unlink', function (t) {
  fs.unlink('/test', function (err) {
    t.ok(err)
    t.same(err.code, 'ENOENT')
    fs.writeFile('/test', 'hello', function () {
      fs.unlink('/test', function (err) {
        t.notOk(err)
        fs.exists('/test', function (exists) {
          t.notOk(exists)
          t.end()
        })
      })
    })
  })
})

test('cannot unlink dir Sync', (t) => {
    try {
        let dir = '/test';
        fs.mkdirSync(dir);
        util.catchWrapper(t, 'EISDIR', '', fs.unlinkSync, dir);

        fs.rmdirSync(dir);
    } catch (err) {
        t.ok(!err, 'Unknown error ' + err);
    }
    t.end();
})

test('cannot unlink dir', function (t) {
  fs.mkdir('/test', function () {
    fs.unlink('/test', function (err) {
      t.ok(err)
      t.same(err.code, 'EISDIR')
      fs.rmdir('/test', function (err) {
        t.ok(!err)
        t.end()
      })
    })
  })
})
