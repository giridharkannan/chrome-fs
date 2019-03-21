var test = require('tape').test
var fs = require('../../chrome')

test('existsSync', (t) => {
    try {
        let exists = fs.existsSync('/');
        t.ok(exists, '/ exists');

        let p = '/fooxSync';
        let f = p + '/a.txt';

        exists = fs.existsSync(p);
        t.notOk(exists, p + ' does not exist');

        fs.mkdirSync(p);
        // check folder exists
        exists = fs.existsSync(p);
        t.ok(exists, p + ' exists after mkdir');

        // check file exists
        fs.writeFileSync(f, "test");
        exists = fs.existsSync(f);
        t.ok(exists, f + ' exists file');

        fs.unlinkSync(f);
        fs.rmdirSync(p);
    } catch (err) {
        t.ok(!err, 'Unknown error ' + err);
    }
    t.end();
});

test('exists', function (t) {
  fs.exists('/', function (exists) {
    t.ok(exists, '/ exists')
    fs.exists('/foox', function (exists) {
      t.notOk(exists, '/foox does not exist')
      fs.mkdir('/foox', function () {
        fs.exists('/foox', function (exists) {
          t.ok(exists, '/foox exists second')
          fs.rmdir('/foox', function (err) {
            t.ok(!err, 'rmdir /foox')
            t.end()
          })
        })
      })
    })
  })
})
