var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util');

test('rmdir Sync', (t) => {
    try {
        util.catchWrapper(t, 'EPERM', 'Unexpected error', fs.rmdirSync, '/');
        fs.mkdirSync('/foorm');
        fs.rmdirSync('/foorm');
        util.catchWrapper(t, 'ENOENT', 'Unexpected error', fs.rmdirSync, '/foorm');
    } catch (err) {
        t.ok(!err, "Unknown error "+err);
    } finally {
        t.end();
    }
})

test('rmdir', function (t) {
  fs.rmdir('/', function (err) {
    t.ok(err, 'Delete / should fail')
    t.same(err.code, 'EPERM', 'Error code should be EPERM')

    fs.mkdir('/foorm', function () {
      fs.rmdir('/foorm', function (err) {
        t.notOk(err, 'rmdir /foorm should work')
        fs.rmdir('/foorm', function (err) {
          t.ok(err, 'rmdir /foorm should have an error')
          t.same(err.code, 'ENOENT')
          t.end()
        })
      })
    })
  })
})
