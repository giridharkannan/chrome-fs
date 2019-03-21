var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util')

test('readFile Sync', (t) => {
    try {
        let fName = 'test.txt';
        fs.writeFileSync(fName, 'hello');
        let data = fs.readFileSync(fName);
        t.ok(Buffer.isBuffer(data), 'Data is buffer');
        t.same(data.toString(), 'hello');
        fs.unlinkSync(fName);
    } catch (err) {
        t.ok(!err, 'Got error ' + err)
    }
    t.end();
})

test('readFile', function (t) {
  fs.writeFile('/test.txt', 'hello', function (err) {
    t.ok(!err, 'readFile /foo')
    fs.readFile('/test.txt', function (err, data) {
      t.notOk(err)
      t.ok(Buffer.isBuffer(data), 'Data is buffer')
      t.same(data.toString(), 'hello')
      fs.unlink('/test.txt', function (err) {
        t.ok(!err, 'unlinked /test.txt')
        t.end()
      })
    })
  })
})

test('cannot readFile dir Sync', (t) => {
    let dir = '/test';
    let errMsg = 'Expected EISDIR exception';

    try {
        fs.mkdirSync(dir);
        util.catchWrapper(t, 'EISDIR', errMsg, fs.readFileSync, dir);
        fs.rmdirSync(dir);
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
})

test('cannot readFile dir', function (t) {
  fs.mkdir('/test', function () {
    fs.readFile('/test', function (err) {
      t.ok(err)
      t.same(err.code, 'EISDIR')
      fs.rmdir('/test', function (err) {
        t.notOk(err)
        t.end()
      })
    })
  })
})

test('readFile + encoding Sync', (t) => {
    let fName = 'foo.txt';
    try {
        fs.writeFileSync(fName, 'hello');

        //hex
        let data = fs.readFileSync(fName, { encoding: 'hex' });
        t.same(data, '68656c6c6f', 'hex is equal');

        //binary
        data = fs.readFileSync(fName, { encoding: null });
        t.same(data.toString(), 'hello', 'binary is equal');
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
});

test('readFile + encoding', function (t) {
  fs.writeFile('/foo.txt', 'hello', function (err) {
    t.ok(!err, 'Created File /foo')
    fs.readFile('/foo.txt', 'hex', function (err, data) {
      t.notOk(err, 'Error in hex')
      t.same(data, '68656c6c6f', 'hex is equal')
      fs.unlink('/foo.txt', function (err) {
        t.ok(!err, 'unlinked /test.txt')
        t.end()
      })
    })
  })
})
