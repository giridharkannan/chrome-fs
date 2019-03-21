var test = require('tape').test
var fs = require('../../chrome')
let util = require('./util');

test('readdir Sync', (t) => {
    try {
        let list = fs.readdirSync('/');
        t.same(list, []);

        let dir = 'fooSync';
        let errMsg = 'Got readdir resp for non existing folder ' + dir;
        util.catchWrapper(t, 'ENOENT', errMsg, fs.readdirSync, dir);

        fs.mkdirSync(dir);
        list = fs.readdirSync('/');
        t.same(list, [dir]);

        list = fs.readdirSync(dir);
        t.same(list, []);

        fs.rmdirSync(dir);
    } catch (err) {
        t.notOk(!err, "Unknown error " + err);
    }
    t.end();
})

test('readdir', function (t) {
  fs.readdir('/', function (err, list) {
    t.notOk(err)
    t.same(list, [])

    fs.readdir('/foo', function (err, list) {
      t.ok(err)
      t.notOk(list)
      t.same(err.code, 'ENOENT')

      fs.mkdir('/foo', function () {
        fs.readdir('/', function (err, list) {
          t.notOk(err)
          t.same(list, ['foo'])

          fs.readdir('/foo', function (err, list) {
            t.notOk(err)
            t.same(list, [])
            fs.rmdir('/foo', function (err) {
              t.notOk(err)
              t.end()
            })

          })
        })
      })
    })
  })
})

test('readdir not recuesive sync', (t) => {
    try {
        fs.mkdirSync('/foo');
        fs.mkdirSync('/foo/bar');
        fs.mkdirSync('/foo/bar/baz');

        let list = fs.readdirSync('/foo');
        t.same(list, ['bar']);

        list = fs.readdirSync('/foo/bar');
        t.same(list, ['baz']);

        list = fs.readdirSync('/foo/bar/baz');
        t.same(list, []);

        fs.rmdirSync('/foo/bar/baz');
        fs.rmdirSync('/foo/bar');
        fs.rmdirSync('/foo');
    } catch (err) {
        t.notOk(!err, "Unknown error " + err);
    }

    t.end();
})

test('readdir not recursive', function (t) {
  fs.mkdir('/foo', function () {
    fs.mkdir('/foo/bar', function () {
      fs.mkdir('/foo/bar/baz', function () {
        fs.readdir('/foo', function (err, list) {
          t.notOk(err)
          t.same(list, ['bar'])
          fs.readdir('/foo/bar', function (err, list) {
            t.notOk(err)
            t.same(list, ['baz'])
            fs.rmdir('/foo/bar/baz', function (err) {
              t.notOk(err)
              fs.rmdir('/foo/bar', function (err) {
                t.notOk(err)
                fs.rmdir('/foo', function (err) {
                  t.notOk(err)
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
