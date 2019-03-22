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

test('open w already existing Sync', (t) => {
    try {
        let file = 'test4';
        let expected = 'new content';

        fs.writeFileSync(file, expected);
        let stat = fs.statSync(file);

        t.same(stat.size, expected.length, 'content length same');
        let fd = fs.openSync(file, 'w');
        t.same(typeof fd, 'object');
        
        stat = fs.statSync(file);
        t.same(stat.size, 0, 'file truncated');

        fs.unlinkSync(file);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

test('open w already existing', (t) => {
    let file = 'test4';
    let expected = 'd content';

    fs.writeFile(file, expected, (err) => {
        t.ok(!err, err);
        fs.stat(file, (err, stat) => {
            t.ok(!err);
            t.same(stat.size, expected.length, 'content length same');
            fs.open(file, 'w', (err, fd) => {
                t.ok(!err);
                t.same(typeof fd, 'object');

                fs.stat(file, (err, stat) => {
                    t.ok(!err, err);
                    t.same(stat.size, 0, 'file truncated');

                    fs.unlink(file, (err) => {
                        t.ok(!err);
                        t.end();
                    })
                })
            })
        })
    })
});

test('open mode "a" already existing Sync', (t) => {
    try {
        let file = 'test4';
        let expected = 'new content';

        fs.writeFileSync(file, expected);
        let actual = fs.readFileSync(file, 'utf8');
        
        t.same(actual, expected, 'content same');
        let fd = fs.openSync(file, 'a');
        t.same(typeof fd, 'object');

        fs.writeSync(fd, ' append');
        actual = fs.readFileSync(file, 'utf8');
        t.same(actual, expected + ' append', 'content same');

        fs.unlinkSync(file);
    } catch (err) {
        t.ok(!err);
    } finally {
        t.end();
    }
})

test('open mode "a" already existing', (t) => {
    let file = 'test4';
    let expected = 'new content';

    fs.writeFile(file, expected, (err) => {
        t.ok(!err, err);
        fs.readFile(file, 'utf8', (err, actual) => {
            t.ok(!err, err);
            t.same(actual, expected, 'content same');

            fs.open(file, 'a', (err, fd) => {
                t.ok(!err, err);
                t.same(typeof fd, 'object');
                fs.write(fd, ' append', (err) => {
                    t.ok(!err, err);
                    fs.readFile(file, 'utf8', (err, actual) => {
                        t.ok(!err, err);
                        t.same(actual, expected + ' append', 'content same');

                        fs.unlink(file, (err) => {
                            t.ok(!err);
                            t.end();
                        })
                    })
                })
            })

        })
    });
})