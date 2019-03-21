var test = require('tape').test
var fs = require('../../chrome')
var util = require('./util')

function writeFileAndCheck(t, fName, data, opt) {
    try {
        fs.writeFileSync(fName, data, opt);
        let fd = fs.openSync(fName, 'r');
        let stat = fs.fstatSync(fd);
        t.ok(stat.size, data.length);
        fs.closeSync(fd);
    } catch (err) {
        t.ok(!err, "Unexpected Exception " + err);
    }
}

test('fstat root and folder Sync', (t) => {
    let fName = '/foofstatSync'
    let data = 'bar';
    let opt = { encoding: 'utf8', mode: 438, flag: 'w' };
    
    // string
    writeFileAndCheck(t, fName, data, opt);

    //hex
    data = new Buffer('hex data');
    opt.encoding = 'hex';
    writeFileAndCheck(t, fName, data, opt);

    //binary
    data = new Buffer('bin data');
    opt.encoding = 'binary';
    writeFileAndCheck(t, fName, data, opt);

    t.end();
})

test('fstat root and folder', function (t) {
  fs.writeFile('/foofstat.txt', 'bar', function () {
    fs.open('/foofstat.txt', 'r', function (err, fd) {
      t.ok(!err, 'first open')
      fs.fstat(fd, function (err, stat) {
        t.notOk(err)
        t.ok(stat.size, 3)
        fs.unlink('/foofstat.txt', function (err) {
          t.ok(!err)
          t.end()
        })
      })
    })
  })
})

test('fstat not exist Sync', (t) => {
    let errMsg = 'Expected "EBADF" exception while opening unknow fd';
    util.catchWrapper(t, 'EBADF', errMsg, fs.fstatSync, 42);
    t.end();
})

test('fstat not exist', function (t) {
  fs.fstat(42, function (err) {
    t.ok(err)
    t.same(err.code, 'EBADF')
    t.end()
  })
})
