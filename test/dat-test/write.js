var test = require('tape').test
var fs = require('../../chrome')

test('write Sync', (t) => {
    let fName = 'test1.txt';
    let data = new Buffer('hello world');

    try {
        let fd = fs.openSync(fName, 'w');
        let wrote = fs.writeSync(fd, data, 0, 11, null);

        t.same(wrote, data.length);
        fs.closeSync(fd);

        let gotData = fs.readFileSync(fName, null);
        t.same(gotData, data, 'Wrote and got data are same');

        fs.unlinkSync(fName);
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
})

test('write', function (t) {
  fs.open('/test1.txt', 'w', function (err, fd) {
    t.notOk(err)
    fs.write(fd, new Buffer('hello world'), 0, 11, null, function (err, written, buf) {
      t.ok(!err)
      t.ok(buf, 'Buffer exists')
      t.same(written, 11)
      fs.close(fd, function () {
        fs.readFile('/test1.txt', 'utf-8', function (err, buf) {
          t.notOk(err)
          t.same(buf, 'hello world')
          fs.unlink('/test1.txt', function (err) {
            t.ok(!err, 'unlinked /test1.txt')
            t.end()
          })
        })
      })
    })
  })
})

test('write + partial Sync', (t) => {
    let fName = 'testpartial.txt';

    try {
        let fd = fs.openSync(fName, 'w');
        let data = new Buffer('hello');

        fs.writeSync(fd, data, 0, data.length);
        data = new Buffer(' world');
        let wrote = fs.writeSync(fd, data, 0, data.length);
        t.same(wrote, data.length, 'Wrote data length same');
        fs.closeSync(fd);

        data = fs.readFileSync(fName, { encoding: 'utf-8' });
        t.same(data, 'hello world');
        fs.unlinkSync(fName);
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
})

test('write + partial', function (t) {
    fs.open('/testpartial.txt', 'w', function (err, fd) {
        t.notOk(err)
        fs.write(fd, new Buffer('hello'), 0, 5, null, function (err, written, buf) {
            t.notOk(err)
            fs.write(fd, new Buffer(' world'), 0, 6, null, function (err, written, buf) {
                t.ok(!err, err)
                t.ok(buf)
                t.same(written, 6)
                fs.readFile('/testpartial.txt', 'utf-8', function (err, buf) {
                    t.notOk(err, err);
                    if(err) return;
                    t.same(buf, 'hello world')
                    fs.unlink('/testpartial.txt', function (err) {
                        t.ok(!err, 'unlinked /testpartial.txt '+err)
                        t.end()
                    })
                })
            })
        })
    })
})

test('write + pos Sync 1', (t) => {
    let fName = 'testpos.txt';

    try {
        let fd = fs.openSync(fName, 'w');

        fs.writeSync(fd, new Buffer('111111'), 0, 6, 0);
        fs.writeSync(fd, new Buffer('222222'), 0, 1, 4);
        fs.writeSync(fd, new Buffer('333333'), 0, 1, 3);
        fs.writeSync(fd, new Buffer('444444'), 0, 1, 2);
        fs.writeSync(fd, new Buffer('555555'), 0, 1, 1);
        fs.writeSync(fd, new Buffer('666666'), 0, 1, 0);

        let data = fs.readFileSync(fName, 'utf-8');
        t.same(data, '654321');
    } catch (err) {
        t.ok(!err, 'Got err ' + err);
    }
    t.end();
})

test('write + position 1', function (t) {
    fs.open('/testpos.txt', 'w', function (err, fd) {
        t.notOk(err)
        fs.write(fd, new Buffer('111111'), 0, 6, 0, function () {
            fs.write(fd, new Buffer('222222'), 0, 1, 4, function () {
                fs.write(fd, new Buffer('333333'), 0, 1, 3, function () {
                    fs.write(fd, new Buffer('444444'), 0, 1, 2, function () {
                        fs.write(fd, new Buffer('555555'), 0, 1, 1, function () {
                            fs.write(fd, new Buffer('666666'), 0, 1, 0, function () {
                                fs.close(fd, function () {
                                    fs.readFile('/testpos.txt', 'utf-8', function (err, buf) {
                                        t.notOk(err)
                                        t.same(buf, '654321')
                                        fs.unlink('/testpos.txt', function (err) {
                                            t.ok(!err, 'unlinked /testpos.txt')
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
    })
})


test('write + position Sync 2', (t) => {
    let fName = 'testpos.txt';

    try {
        let fd = fs.openSync(fName, 'w');

        fs.writeSync(fd, new Buffer('111111'), 0, 6, 0);
        fs.writeSync(fd, new Buffer('222222'), 0, 5, 0);
        fs.writeSync(fd, new Buffer('333333'), 0, 4, 0);
        fs.writeSync(fd, new Buffer('444444'), 0, 3, 0);
        fs.writeSync(fd, new Buffer('555555'), 0, 2, 0);
        fs.writeSync(fd, new Buffer('666666'), 0, 1, 0);

        let data = fs.readFileSync(fName, 'utf-8');
        t.same(data, '654321');
    } catch (err) {
        t.ok(!err, 'Got err ' + err);
    }
    t.end();
})

test('write + position', function (t) {
  fs.open('/testpos.txt', 'w', function (err, fd) {
    t.notOk(err)
    fs.write(fd, new Buffer('111111'), 0, 6, 0, function () {
      fs.write(fd, new Buffer('222222'), 0, 5, 0, function () {
        fs.write(fd, new Buffer('333333'), 0, 4, 0, function () {
          fs.write(fd, new Buffer('444444'), 0, 3, 0, function () {
            fs.write(fd, new Buffer('555555'), 0, 2, 0, function () {
              fs.write(fd, new Buffer('666666'), 0, 1, 0, function () {
                fs.close(fd, function () {
                  fs.readFile('/testpos.txt', 'utf-8', function (err, buf) {
                    t.notOk(err)
                    t.same(buf, '654321')
                    fs.unlink('/testpos.txt', function (err) {
                      t.ok(!err, 'unlinked /testpos.txt')
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
  })
})


test('write + append', (t) => {
    let fName = 'testappend.txt';

    try {
        fs.writeFileSync(fName, 'hello world');
        let fd = fs.openSync(fName, 'a');
        fs.writeSync(fd, new Buffer(' world'), 0, 6);
        fs.closeSync(fd);
        let buf = fs.readFileSync(fName, 'utf-8');
        t.same(buf, 'hello world world')

        fs.unlinkSync(fName);
    } catch (err) {
        t.ok(!err, 'Got error ' + err);
    }
    t.end();
})

test('write + append', function (t) {
    fs.writeFile('/testappend.txt', 'hello world', function () {
      fs.open('/testappend.txt', 'a', function (err, fd) {
        t.notOk(err)
        fs.write(fd, new Buffer(' world'), 0, 6, null, function () {
          fs.close(fd, function () {
            fs.readFile('/testappend.txt', 'utf-8', function (err, buf) {
              t.notOk(err)
              t.same(buf, 'hello world world')
              fs.unlink('/testappend.txt', function (err) {
                t.ok(!err, 'unlinked /testappend.txt')
                t.end()
              })
            })
          })
        })
      })
    })
})
