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
var path = require('path')
var fs = require('../../chrome')
var filepath = path.join(common.tmpDir, 'x.txt')
var expected = 'xyz\n'
var buffer = new Buffer(1024);
fs.writeFile(filepath, expected, function (err) {
  assert.ok(!err)
  fs.open(filepath, 'r', '0644', function (err, fd) {
    assert.ok(!err)
    fs.read(fd, buffer, 0, 8192, -1, function (err, len, data) {
    // fs.read(fd, expected.length, 0, 'utf-8', function (err, str, bytesRead) {
      assert.ok(!err)
      assert.equal(data, expected, 'read value failed')
      assert.equal(len, expected.length, 'read length failed')
      fs.unlink(filepath, function (err) {
        assert.ok(!err)
        console.log('test-fs-read success')
      })
    })
  })
})
