var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util')

test('closeSync', function (t) {
    let file = '/testcloseSync';
    let fd = null;
    try {
        fd = fs.openSync(file, 'w');
        fs.closeSync(fd);
        util.catchWrapper(t, 'EBADF', 'Expected EBADF error', fs.fsyncSync, fd);
        fs.unlinkSync(file);
    } catch (err) {
        t.ok(!err, 'Unknown error ' + err);
    }
    t.end();
})

test('close', function (t) {
  fs.open('/testclose', 'w', function (err, fd) {
    t.ok(!err)
    fs.close(fd, function (err) {
      t.ok(!err)
      fs.fsync(fd, function (err) {
        t.ok(err)
        t.same(err.code, 'EBADF')
        fs.unlink('/testclose', function (err) {
          t.ok(!err)
          t.end()
        })
      })
    })
  })
})
