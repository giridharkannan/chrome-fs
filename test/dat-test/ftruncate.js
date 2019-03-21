var test = require('tape').test
var fs = require('../../chrome')

test('ftruncateSync', (t) => {
    try {
        let fName = '/testftruncateSync.txt';
        let truncateLen = 10000;
        fs.writeFileSync(fName, new Buffer(1));
        let fd = fs.openSync(fName, 'w');
        fs.ftruncateSync(fd, truncateLen);
        let stat = fs.fstatSync(fd);
        t.same(stat.size, truncateLen);

        truncateLen = 1235;
        fs.ftruncateSync(fd, truncateLen);
        stat = fs.fstatSync(fd);
        t.same(stat.size, truncateLen);
        let buf = fs.readFileSync(fName);
        t.same(buf.length, truncateLen, 'buffer is correct size')
        fs.unlinkSync(fName);
    } catch (err) {
        t.ok(!err, "Unexpected err " + err);
    } finally {
        t.end();
    }
})

test('ftruncate', function (t) {
  fs.writeFile('/testftruncate.txt', new Buffer(1), function () {
    fs.open('/testftruncate.txt', 'w', function (err, fd) {
      t.ok(!err, 'Open failed')
      fs.ftruncate(fd, 10000, function (err) {
        t.ok(!err, 'first truncate')
        fs.fstat(fd, function (err, stat) {
          t.ok(!err, 'fstat error')
          t.same(stat.size, 10000)
          fs.ftruncate(fd, 1235, function () {
            fs.fstat(fd, function (err, stat) {
              t.ok(!err, 'fstat 2 error')
              t.same(stat.size, 1235)
              fs.readFile('/testftruncate.txt', function (err, buf) {
                t.ok(!err, 'readfile failed')
                t.same(buf.length, 1235, 'buffer is correct size')
                fs.unlink('/testftruncate.txt', function (err) {
                  t.ok(!err, '/testftruncate.txt delete')
                  t.end()
                })
              })
            })
          })
        })
      })
    })
  })
})
