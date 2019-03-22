var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util')

test('readFile Sync', (t) => {
    try {
        let fName = 'test.txt';
        fs.writeFileSync(fName, 'hello');
        let data = fs.readFileSync(fName);
        t.ok(Buffer.isBuffer(data), 'Expected buffer ');
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
        let expected = '汉字漢字';
        fs.writeFileSync(fName, expected);

        //hex
        let data = fs.readFileSync(fName, { encoding: 'hex' });
        t.same(data, 'e6b189e5ad97e6bca2e5ad97', 'hex is equal');

        //utf-8
        data = fs.readFileSync(fName, 'utf8');
        t.same(data, expected, 'UTF-8 same');

        //empty
        data = fs.readFileSync(fName, { encoding: null });
        t.same(data.toString(), expected, 'empty encoding is equal');
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
});

test('readFile + encoding', function (t) {
    let expected = 'hello';
    fs.writeFile('/foo.txt', expected, function (err) {
        t.ok(!err, 'Created File /foo')

        //hex
        fs.readFile('/foo.txt', 'hex', function (err, data) {
            t.notOk(err, 'Error in hex')
            t.same(data, '68656c6c6f', 'hex is equal')

            //utf-8
            fs.readFile('/foo.txt', 'utf-8', function (err, data) {
                t.ok(!err, err);
                t.same(data, expected, 'UTF-8 same');

                //empty
                fs.readFile('/foo.txt', { encoding: null }, (err, data) => {
                    t.ok(!err, err);
                    t.same(data.toString(), expected, 'empty encoding is equal');

                    fs.unlink('/foo.txt', function (err) {
                        t.ok(!err, 'unlinked /test.txt')
                        t.end()
                    })
                })
            });

        })
    })
})
