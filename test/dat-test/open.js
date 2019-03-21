var test = require('tape').test
var fs = require('../../chrome')

test('openfsSync', (t) => {
    try {
        let file = '/testo1_sync.txt';
        let fd = fs.openSync(file, 'w');
        t.same(typeof fd, 'object');
        fs.unlinkSync(file);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

test('openfs', function (t) {
  fs.open('/testo1.txt', 'w', function (err, fd) {
    t.ok(!err)
    t.same(typeof fd, 'object')
    fs.unlink('/testo1.txt', function (err) {
      t.ok(!err)
      t.end()
    })
  })
})

test('open not exist Sync', (t) => {
    let file = '/test2Sync';
    try {
        fs.openSync(file, 'r');
        t.notOk(true, "Able to open non existing file "+file);
    } catch(err) {
        t.ok(err);
        t.same(err.code, 'ENOENT');
    } finally {
        t.end();
    }
});

test('open not exist', function (t) {
  fs.open('/test2', 'r', function (err, fd) {
    t.ok(err)
    t.same(err.code, 'ENOENT')
    fs.open('/test2', 'w', function (err, fd) {
      t.ok(!err)
      t.same(typeof fd, 'object')
      fs.unlink('/test2', function (err) {
        t.ok(!err)
        t.end()
      })
    })
  })
})

test('open w+ Sync', (t) => {
    try {
        let file = '/test3';
        let fd = fs.openSync(file, 'w+');
        t.same(typeof fd, 'object');
        fs.statSync(file);
        fs.unlinkSync(file);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

test('open w+', function (t) {
  fs.open('/test3', 'w+', function (err, fd) {
    t.ok(!err)
    t.same(typeof fd, 'object')

    fs.stat('/test3', function (err, stat) {
      t.ok(!err)
      fs.unlink('/test3', function (err) {
        t.ok(!err)
        t.end()
      })
    })
  })
})
