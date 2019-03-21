var test = require('tape').test
var fs = require('../../chrome')

test('rename Sync', (t) => {
    try {
        //rename folder
        fs.mkdirSync('/foo');
        fs.renameSync('/foo', '/bar');
        let list = fs.readdirSync('/');
        t.same(list, ['bar'], '/bar exists');

        //rename file
        fs.writeFileSync('/bar/test.txt', 'data');
        fs.renameSync('/bar/test.txt', '/bar/grr.txt');

        list = fs.readdirSync('/bar');
        t.same(list, ['grr.txt'], 'grr.txt exists');

        //rename to different folder
        fs.mkdirSync('/foo');
        fs.renameSync('/bar/grr.txt', '/foo/test.txt');
        list = fs.readdirSync('/foo');
        t.same(list, ['test.txt'], 'test.txt exists');

        fs.rmdirSync('/bar');
        fs.unlinkSync('/foo/test.txt');
        fs.unlinkSync('/foo');
    } catch (err) {
        t.notOk(!err, "Unknown exception " + err);
    }
    t.end();
})

test('rename', function (t) {
    fs.mkdir('/foo', function () {
        fs.rename('/foo', '/bar', function (err) {
            t.notOk(err, 'rename /foo /bar');

            fs.readdir('/', function (err, list) {
                t.notOk(err, 'readdir /foo /bar')
                t.same(list, ['bar'], '/bar exists')

                fs.writeFile('/bar/test.txt', 'data', null, (err) => {
                    t.notOk(err, 'created file /bar/test.txt')
                    fs.rename('/bar/test.txt', '/bar/grr.txt', (err) => {
                        t.notOk(err, 'renamed file /bar/test.txt /bar/grr.txt');
                        fs.readdir('/bar', (err, list) => {
                            t.notOk(err);
                            t.same(list, ['grr.txt'], 'grr.txt exists')
                            fs.unlink('/bar/grr.txt', (err) => {
                                t.notOk(err);
                                fs.rmdir('/bar', function (err) {
                                    t.ok(!err, 'rrmdir /bar shouldn\'t have an error')
                                    t.end()
                                })
                            })
                        })
                    })
                });
            })
        })
    })
})

// test('rename to non empty dir', function (t) {
//   fs.mkdir('/foo', function () {
//     fs.mkdir('/bar', function () {
//       fs.mkdir('/bar/baz', function () {
//         fs.rename('/foo', '/bar', function (err) {
//           t.ok(err)
//           t.same(err.code, 'ENOTEMPTY')
//
//           fs.readdir('/', function (err, list) {
//             t.notOk(err)
//             t.same(list.sort(), ['bar', 'foo'])
//             t.end()
//           })
//         })
//       })
//     })
//   })
// })
