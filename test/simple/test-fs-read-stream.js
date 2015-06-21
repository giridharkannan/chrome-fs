// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common')
var assert = require('assert')

// TODO Improved this test. test_ca.pem is too small. A proper test would
// great a large utf8 (with multibyte chars) file and stream it in,
// performing sanity checks throughout.

var path = require('path')
var fs = require('../../chrome')
var fn = path.join(common.fixturesDir, 'x-stream.txt')
var rangeFile = path.join(common.fixturesDir, 'elipses.txt')

var elipses = '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'

var x = 'xyz'
var callbacks = { open: 0, end: 0, close: 0 }
var paused = false

fs.writeFile(fn, x, function (err) {
  assert.equal(err, null)
  // var ncallbacks1 = 1

  var file = fs.ReadStream(fn)
  file.on('open', function (fd) {
    file.length = 0
    callbacks.open++
    assert.equal('object', typeof fd)
    assert.ok(file.readable)
    // GH-535
    file.pause()
    file.resume()
    file.pause()
    file.resume()
  })

  file.on('data', function (data) {
    assert.ok(data instanceof Object)
    assert.ok(!paused)
    file.length += data.length
    paused = true
    file.pause()

    setTimeout(function () {
      paused = false
      file.resume()
    }, 10)
  })

  file.on('end', function (chunk) {
    callbacks.end++
  })

  file.on('close', function () {
    callbacks.close++
    fs.unlink(fn, function (err) {
      if (err) {
        assert.fail(err)
      }
      console.log('test-fs-read-stream 1 success')
    })
  })
  /*
  process.on('exit', function () {
    assert.equal(1, callbacks.open)
    assert.equal(1, callbacks.end)
    assert.equal(2, callbacks.close)
    assert.equal(30000, file.length)
    assert.equal(10000, file3.length)
    console.error('ok')
  })*/
})

fs.writeFile(rangeFile, elipses, function (e) {
  if (e) {
    console.log(e)
    throw e
  }
  var file3 = fs.createReadStream(rangeFile, {encoding: 'utf8'})
  file3.length = 0
  file3.on('data', function (data) {
    // assert.equal('string', typeof (data))
    file3.length += data.length

    for (var i = 0; i < data.length; i++) {
      // http://www.fileformat.info/info/unicode/char/2026/index.htm
      assert.equal('\u2026', data[i])
    }
  })

  file3.on('close', function () {
    callbacks.close++
    fs.unlink(rangeFile, function (err) {
      if (err) {
        assert.fail(err)
      }
      // assert.equal(2, ncallbacks1, 'test-fs-write-file-1')
      console.log('test-fs-read-stream-2')
    })
  })
})
/*
var file4 = fs.createReadStream(rangeFile, {bufferSize: 1, start: 1, end: 2})
var contentRead = ''
file4.on('data', function (data) {
  contentRead += data.toString('utf-8')
})
file4.on('end', function (data) {
  assert.equal(contentRead, 'yz')
})

var file5 = fs.createReadStream(rangeFile, {bufferSize: 1, start: 1})
file5.data = ''
file5.on('data', function (data) {
  file5.data += data.toString('utf-8')
})
file5.on('end', function () {
  assert.equal(file5.data, 'yz\n')
})

// https://github.com/joyent/node/issues/2320
var file6 = fs.createReadStream(rangeFile, {bufferSize: 1.23, start: 1})
file6.data = ''
file6.on('data', function (data) {
  file6.data += data.toString('utf-8')
})
file6.on('end', function () {
  assert.equal(file6.data, 'yz\n')
})

assert.throws(function () {
  fs.createReadStream(rangeFile, {start: 10, end: 2})
}, /start must be <= end/)

var stream = fs.createReadStream(rangeFile, { start: 0, end: 0 })
stream.data = ''

stream.on('data', function (chunk) {
  stream.data += chunk
})

stream.on('end', function () {
  assert.equal('x', stream.data)
})

// pause and then resume immediately.
var pauseRes = fs.createReadStream(rangeFile)
pauseRes.pause()
pauseRes.resume()

var file7 = fs.createReadStream(rangeFile, {autoClose: false })
file7.on('data', function () {})
file7.on('end', function () {
  process.nextTick(function () {
    assert(!file7.closed)
    assert(!file7.destroyed)
    file7Next()
  })
})

function file7Next () {
  // This will tell us if the fd is usable again or not.
  file7 = fs.createReadStream(null, {fd: file7.fd, start: 0 })
  file7.data = ''
  file7.on('data', function (data) {
    file7.data += data
  })
  file7.on('end', function (err) {
    assert.equal(err, null)
    assert.equal(file7.data, 'xyz\n')
  })
}

// Just to make sure autoClose won't close the stream because of error.
var file8 = fs.createReadStream(null, {fd: 13337, autoClose: false })
file8.on('data', function () {})
file8.on('error', common.mustCall(function () {}))

// Make sure stream is destroyed when file does not exist.
var file9 = fs.createReadStream('/path/to/file/that/does/not/exist')
file9.on('data', function () {})
file9.on('error', common.mustCall(function () {}))

process.on('exit', function () {
  assert(file7.closed)
  assert(file7.destroyed)

  assert(!file8.closed)
  assert(!file8.destroyed)
  assert(file8.fd)

  assert(!file9.closed)
  assert(file9.destroyed)
})
*/
