var util = require('util')
var Buffer = require('buffer').Buffer
var Stream = require('stream').Stream
var constants = require('constants')
var p = require('path')
var Readable = Stream.Readable
var Writable = Stream.Writable

var FILESYSTEM_DEFAULT_SIZE = 250 * 1024 * 1024	// 250MB
var DEBUG = false

var O_APPEND = constants.O_APPEND || 0
var O_CREAT = constants.O_CREAT || 0
var O_EXCL = constants.O_EXCL || 0
var O_RDONLY = constants.O_RDONLY || 0
var O_RDWR = constants.O_RDWR || 0
var O_SYNC = constants.O_SYNC || 0
var O_TRUNC = constants.O_TRUNC || 0
var O_WRONLY = constants.O_WRONLY || 0

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem

function nullCheck (path, callback) {
  if (('' + path).indexOf('\u0000') !== -1) {
    var er = new Error('Path must be a string without null bytes.')
    if (!callback) {
      throw er
    }
    process.nextTick(function () {
      callback(er)
    })
    return false
  }
  return true
}

function maybeCallback (cb) {
  return util.isFunction(cb) ? cb : rethrow()
}

function makeCallback (cb) {
  if (util.isNullOrUndefined(cb)) {
    return rethrow()
  }

  if (!util.isFunction(cb)) {
    throw new TypeError('callback must be a function')
  }

  return function () {
    return cb.apply(null, arguments)
  }
}

function rethrow () {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  if (DEBUG) { // eslint-disable-line
    var backtrace = new Error()
    return function (err) {
      if (err) {
        backtrace.stack = err.name + ': ' + err.message +
                          backtrace.stack.substr(backtrace.name.length)
        err = backtrace
        throw err
      }
    }
  }
}

function resolve (path) {
  // Allow null pass through
  if (path === null) {
    return null
  }
  if (typeof path === 'undefined') {
    return null
  }
  // Don't let anything but strings be passed as on
  if (typeof path !== 'string') {
    throw Error('Cannot resolve: Paths must be strings : ' + path.toString())
  }
  var retString = path
  if (retString[0] === '/') {
    retString = retString.slice(1)
  }
  if (retString[retString.length - 1] === '/') {
    retString = retString.slice(0, retString.length - 1)
  }
  return retString
}

function assertEncoding (encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding)
  }
}

function modeNum (m, def) {
  if (util.isNumber(m)) {
    return m
  }
  if (util.isString(m)) {
    return parseInt(m, 8)
  }
  if (def) {
    return modeNum(def)
  }
  return undefined
}

exports.chown = function (path, uid, gid, callback) {
  resolve(path)
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  this.exists(path, function (exists) {
    if (exists) {
      callback()
    } else {
      callback('File does not exist')
    }
  })
}

exports.fchown = function (fd, uid, gid, callback) {
  this.chown(fd.filePath, uid, gid, callback)
}

exports.chmod = function (path, mode, callback) {
  resolve(path)
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  this.exists(path, function (exists) {
    if (exists) {
      callback()
    } else {
      callback('File does not exist')
    }
  })
}

exports.fchmod = function (fd, mode, callback) {
  this.chmod(fd.filePath, mode, callback)
}

exports.exists = function (path, callback) {
  if (path === '/') {
    callback(true)
  }
  path = resolve(path)
  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
      function (cfs) {
        cfs.root.getFile(path, {},
              function (fileEntry) {
                callback(true)
              }, function () {
                cfs.root.getDirectory(path, {},
                  function (dirEntry) {
                    callback(true)
                  }, function () { callback(false) })
              })
      }, function () { callback(false) })
}

exports.mkdir = function (path, mode, callback) {
  path = resolve(path)
  if (util.isFunction(mode)) callback = mode
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  exports.exists(path, function (exists) {
    if (exists) {
      var err = new Error()
      err.code = 'EEXIST'
      err.path = path
      callback(err)
    } else {
      exports.exists(p.dirname(path), function (exists) {
        if (exists || p.dirname(path) === '.') {
          window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
            function (cfs) {
              cfs.root.getDirectory(path, {create: true},
                    function (dirEntry) {
                      callback()
                    }, callback)
            }, callback)
        } else {
          var enoent = new Error()
          enoent.code = 'ENOENT'
          enoent.path = path
          callback(enoent)
        }
      })
    }
  })
}

exports.rmdir = function (path, callback) {
  if (path === '/') {
    var permerr = new Error()
    permerr.code = 'EPERM'
    callback(permerr)
    return
  }
  resolve(path)
  callback = maybeCallback(callback)
  if (!nullCheck(path, callback)) return

  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
      function (cfs) {
        cfs.root.getDirectory(path, {},
              function (dirEntry) {
                dirEntry.remove(function () {
                  callback()
                }, function (err) {
                    if (err.code === 1) {
                      var entryerr = new Error()
                      entryerr.code = 'ENOENT'
                      entryerr.path = path
                      callback(entryerr)
                    } else {
                      callback(err)
                    }
                  })
              }, function (err) {
                    if (err.code === 1) {
                      var entryerr = new Error()
                      entryerr.code = 'ENOENT'
                      entryerr.path = path
                      callback(entryerr)
                    } else {
                      callback(err)
                    }
                  })
      }, callback)
}

exports.readdir = function (path, callback) {
  resolve(path)
  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
      function (cfs) {
        cfs.root.getDirectory(path, {}, function (dirEntry) {
          var dirReader = dirEntry.createReader()
          dirReader.readEntries(function (entries) {
            var fullPathList = []
            for (var i = 0; i < entries.length; i++) {
              fullPathList.push(entries[i].name)
            }
            callback(null, fullPathList)
          }, callback)
        }, callback)
      }, callback)
}

exports.rename = function (oldPath, newPath, callback) {
  callback = makeCallback(callback)

  if (!nullCheck(oldPath, callback)) {
    return
  }

  if (!nullCheck(newPath, callback)) {
    return
  }
  oldPath = resolve(oldPath)
  newPath = resolve(newPath)
  var tmpPath = newPath.split('/')
  var newFileName = tmpPath.pop()
  var toDirectory = tmpPath.join('/')
  if (toDirectory === '') {
    toDirectory = '/'
  }

  window.requestFileSystem(
      window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
      function (cfs) {
        cfs.root.getFile(oldPath, {},
              function (fileEntry) {
                fileEntry.onerror = callback
                cfs.root.getDirectory(toDirectory, {}, function (dirEntry) {
                  fileEntry.moveTo(dirEntry, newFileName)
                  callback()
                }, callback)
                fileEntry.moveTo(toDirectory, newFileName, callback)
              }, callback)
      }, callback)
}

exports.ftruncate = function (fd, len, callback) {
  if (util.isFunction(len)) {
    callback = len
    len = 0
  } else if (util.isUndefined(len)) {
    len = 0
  }
  var cb = makeCallback(callback)
  fd.onerror = cb
  fd.onwriteend = cb
  fd.truncate(len)
}

exports.truncate = function (path, len, callback) {
  if (util.isNumber(path)) {
    return this.ftruncate(path, len, callback)
  }
  if (util.isFunction(len)) {
    callback = len
    len = 0
  } else if (util.isUndefined(len)) {
    len = 0
  }

  callback = maybeCallback(callback)
  this.open(path, 'r+', function (er, fd) {
    if (er) return callback(er)
    fd.onwriteend = callback
    fd.truncate(len)
  })
}

exports.stat = function (path, callback) {
  path = resolve(path)
  window.requestFileSystem(
        window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
        function (cfs) {
          var opts = {}
          cfs.root.getFile(path, opts, function (fileEntry) {
            fileEntry.file(function (file) {
              var statval = { dev: 0,
                              mode: '0777',
                              nlink: 0,
                              uid: 0,
                              gid: 0,
                              rdev: 0,
                              ino: 0,
                              size: file.size,
                              atime: null,
                              mtime: file.lastModifiedDate,
                              ctime: null }
              statval.isDirectory = function () { return false }
              statval.isFile = function () { return true }
              statval.isSocket = function () { return false }
              statval.isBlockDevice = function () { return false }
              statval.isCharacterDevice = function () { return false }
              statval.isFIFO = function () { return false }
              statval.isSymbolicLink = function () { return false }
              callback(null, statval)
            })
          }, function (err) {
            if (err.name === 'TypeMismatchError') {
              cfs.root.getDirectory(path, opts, function (dirEntry) {
               var statval = { dev: 0,
                                mode: '0777',
                                nlink: 0,
                                uid: 0,
                                gid: 0,
                                rdev: 0,
                                ino: 0,
                                size: 0,
                                atime: null,
                                mtime: new Date(0),
                                ctime: null,
                                blksize: -1,
                                blocks: -1 }
               statval.isDirectory = function () { return true }
               statval.isFile = function () { return false }
               statval.isSocket = function () { return false }
               statval.isBlockDevice = function () { return false }
               statval.isCharacterDevice = function () { return false }
               statval.isFIFO = function () { return false }
               statval.isSymbolicLink = function () { return false }
               callback(null, statval)
             })
            } else {
              callback(err)
            }
          })
        }, callback)
}

exports.fstat = function (fd, callback) {
  this.stat(fd.filePath, callback)
}

exports.open = function (path, flags, mode, callback) {
  path = resolve(path)
  flags = flagToString(flags)
  callback = makeCallback(arguments[arguments.length - 1])
  mode = modeNum(mode, 438 /* =0666 */)

  if (!nullCheck(path, callback)) return
  window.requestFileSystem(
        window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
        function (cfs) {
          var opts = {}
          if (flags.indexOf('w') > -1) {
            opts = {create: true}
          }
          cfs.root.getFile(
                path,
                opts,
                function (fileEntry) {
                  // if its a write then we get the file writer
                  // otherwise we get the file because 'standards'
                  if (flags.indexOf('w') > -1) {
                    fileEntry.createWriter(function (fileWriter) {
                      fileWriter.fullPath = fileEntry.fullPath
                      callback(null, fileWriter)
                    }, callback)
                  } else {
                    fileEntry.file(function (file) {
                      callback(null, file)
                    })
                  }
                }, function (err) {
                  // Work around for directory file descriptor
                  if (err.name === 'TypeMismatchError') {
                    var dird = {}
                    dird.filePath = path
                    callback(null, dird)
                  } else {
                    callback(err)
                  }
                })
        }, callback)
}

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (fd === null) {
    callback(null, 0, '')
    return
  }
  if (!util.isBuffer(buffer)) {
    // fs.read(fd, expected.length, 0, 'utf-8', function (err, str, bytesRead)
    // legacy string interface (fd, length, position, encoding, callback)
    var cb = arguments[4]
    var encoding = arguments[3]

    assertEncoding(encoding)

    position = arguments[2]
    length = arguments[1]
    buffer = new Buffer(length)
    offset = 0

    callback = function (err, bytesRead, data) {
      if (!cb) return
      var str = ''
      if (fd.type === 'text/plain') {
        str = data
      } else {
        str = (bytesRead > 0) ? buffer.toString(encoding, 0, bytesRead) : '' // eslint-disable-line
      }
      (cb)(err, str, bytesRead)
    }
  }
  fd.onerror = callback
  var data = fd.slice(offset, length)
  var fileReader = new FileReader() // eslint-disable-line
  fileReader.onload = function (evt) {
    var result
    if (util.isBuffer(buffer) && typeof this.result === 'string') {
      result = new Buffer(this.result)
    } else {
      result = this.result
    }
    callback(null, result.length, result)
  }
  fileReader.onerror = function (evt) {
    callback(evt, null)
  }
  // no-op the onprogressevent
  fileReader.onprogress = function () {}

  if (fd.type === 'text/plain') {
    fileReader.readAsText(data)
  } else if (fd.type === 'application/octet-binary') {
    fileReader.readAsArrayBuffer(data)
  }
}

exports.readFile = function (path, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: null, flag: 'r' }
  } else if (util.isString(options)) {
    options = { encoding: options, flag: 'r' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }

  var encoding = options.encoding
  assertEncoding(encoding)
  window.requestFileSystem(
      window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
      function (cfs) {
        var opts = {}
        cfs.root.getFile(
              path,
              opts,
              function (fileEntry) {
                fileEntry.file(function (file) {
                  fileEntry.onerror = callback
                  var fileReader = new FileReader() // eslint-disable-line
                  fileReader.onload = function (evt) {
                    window.setTimeout(callback, 0, null, this.result)
                  }
                  fileReader.onerror = function (evt) {
                    callback(evt, null)
                  }

                  if (file.type === 'text/plain') {
                    fileReader.readAsText(file)
                  } else if (file.type === 'application/octet-binary') {
                    fileReader.readAsArrayBuffer(file)
                  }
                })
              }, callback)
      }, callback)
}

exports.write = function (fd, buffer, offset, length, position, callback) {
  if (util.isBuffer(buffer)) {
    if (util.isFunction(position)) {
      callback = position
      position = null
    }
    callback = maybeCallback(callback)

    fd.onerror = callback
    fd.onprogress = function () {}
    var tmpbuf = buffer.slice(offset, length)
    var bufblob = new Blob([tmpbuf], {type: 'application/octet-binary'}) // eslint-disable-line
    if (fd.readyState > 0) {
      // when the ready state is greater than 1 we have to wait until the write end has finished
      // but this causes the stream to keep sending write events.
      fd.onwriteend = function () {
        fd.write(bufblob)
      }
      callback(null, tmpbuf.length)
    } else {
      fd.write(bufblob)
      if (typeof callback === 'function') {
        callback(null, tmpbuf.length)
      }
    }
  } else {
    if (util.isString(buffer)) {
      buffer += ''
    }
    if (!util.isFunction(position)) {
      if (util.isFunction(offset)) {
        position = offset
        offset = null
      } else {
        position = length
      }
      length = 'utf8'
    }
    callback = maybeCallback(position)
    fd.onerror = callback
    var blob = new Blob([buffer], {type: 'text/plain'}) // eslint-disable-line

    var buf = new Buffer(buffer)

    if (fd.readyState > 0) {
      fd.onwriteend = function () {
        if (position !== null) {
          fd.seek(position)
        }
        fd.write(blob)
        if (typeof callback === 'function') {
          callback(null, buf.length)
        }
      }
    } else {
      if (position !== null) {
        fd.seek(position)
      }
      fd.write(blob)
      if (typeof callback === 'function') {
        callback(null, buf.length)
      }
    }
  }
}

exports.unlink = function (fd, callback) {
  var path = resolve(fd)
  window.requestFileSystem(
        window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
        function (cfs) {
          cfs.root.getFile(
                path,
                {},
                function (fileEntry) {
                  fileEntry.remove(callback)
                })
        }, callback)
}

exports.writeFile = function (path, data, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: 'utf8', mode: 438, flag: 'w' }
  } else if (util.isString(options)) {
    options = { encoding: options, mode: 438, flag: 'w' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }

  assertEncoding(options.encoding)

  var flag = options.flag || 'w' // eslint-disable-line
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      if (flag === 'w') {
        opts = {create: true}
      }
      cfs.root.getFile(
            path,
            opts,
            function (fileEntry) {
              // if its a write then we get the file writer
              // otherwise we get the file because 'standards'
              if (flag === 'w') {
                fileEntry.createWriter(function (fileWriter) {
                  fileWriter.onerror = callback
                  if (typeof callback === 'function') {
                    fileWriter.onwriteend = function (evt) {
                      window.setTimeout(callback, 0, null, evt)
                    }
                  } else {
                    fileWriter.onwriteend = function () {}
                  }
                  fileWriter.onprogress = function () {}
                  var blob = new Blob([data], {type: 'text/plain'}) // eslint-disable-line
                  fileWriter.write(blob)
                }, function (evt) {
                     if (evt.type !== 'writeend') {
                       callback(evt)
                     }
                   })
              } else {
                callback('incorrect flag')
              }
            }, function () {})
    }, callback)
}

exports.appendFile = function (path, data, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: 'utf8', mode: 438, flag: 'a' }
  } else if (util.isString(options)) {
    options = { encoding: options, mode: 438, flag: 'a' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }

  var flag = options.flag || 'a' // eslint-disable-line

  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      if (flag === 'a') {
        opts = {create: true}
      }
      cfs.root.getFile(
            path,
            opts,
            function (fileEntry) {
              // if its a write then we get the file writer
              // otherwise we get the file because 'standards'
              if (flag === 'a') {
                fileEntry.createWriter(function (fileWriter) {
                  fileWriter.onerror = callback
                  if (typeof callback === 'function') {
                    fileWriter.onwriteend = function (evt) {
                      window.setTimeout(callback, 0, null, evt)
                    }
                  } else {
                    fileWriter.onwriteend = function () {}
                  }
                  fileWriter.onprogress = function () {}
                  fileWriter.seek(fileWriter.length)
                  var blob = new Blob([data], {type: 'text/plain'}) // eslint-disable-line
                  fileWriter.write(blob)
                }, callback)
              } else {
                callback('incorrect flag')
              }
            }, callback)
    }, callback)
}

exports.close = function (fd, callback) {
  fd.onwriteend = function (progressinfo) {
    var cb = makeCallback(callback)
    cb(null, progressinfo)
  }
}

exports.createReadStream = function (path, options) {
  return new ReadStream(path, options)
}

util.inherits(ReadStream, Readable)
exports.ReadStream = ReadStream

function ReadStream (path, options) {
  if (!(this instanceof ReadStream)) {
    return new ReadStream(path, options)
  }
  // debugger // eslint-disable-line
  // a little bit bigger buffer and water marks by default
  options = util._extend({
    highWaterMark: 64 * 1024
  }, options || {})

  Readable.call(this, options)

  this.path = path
  this.fd = options.hasOwnProperty('fd') ? options.fd : null
  this.flags = options.hasOwnProperty('flags') ? options.flags : 'r'
  this.mode = options.hasOwnProperty('mode') ? options.mode : 438 /* =0666 */

  this.start = options.hasOwnProperty('start') ? options.start : 0
  this.end = options.hasOwnProperty('end') ? options.end : 0
  this.autoClose = options.hasOwnProperty('autoClose') ?
      options.autoClose : true
  this.pos = undefined

  if (!util.isUndefined(this.start)) {
    if (!util.isNumber(this.start)) {
      throw TypeError('start must be a Number')
    }
    if (util.isUndefined(this.end)) {
      this.end = Infinity
    } else if (!util.isNumber(this.end)) {
      throw TypeError('end must be a Number')
    }

    if (this.start > this.end) {
      throw new Error('start must be <= end')
    }

    this.pos = this.start
  }
  if (this.fd === null) {
    this.pause()
  }

  if (this.path !== null) {
    this.open()
  }
  this.on('end', function () {
    if (this.autoClose) {
      this.destroy()
    }
  })
}

exports.FileReadStream = exports.ReadStream // support the legacy name

ReadStream.prototype.open = function () {
  var self = this

  if (this.flags === null) {
    this.flags = 'r'
  }

  exports.open(this.path, this.flags, this.mode, function (er, fd) {
    if (er) {
      if (self.autoClose) {
        self.destroy()
      }
      self.emit('error', er)
      return
    }
    self.resume()
    self.fd = fd
    self.emit('open', fd)
    self.read()
  })
}

ReadStream.prototype._read = function (n) {
  if (this.fd === null) {
    return this.once('open', function () {
      this._read(n)
    })
  }
  if (this.destroyed) {
    return
  }

  if (this.ispaused) {
    return
  }

  if (this.pos === this.fd.size) {
    return this.push(null)
  }
  this.pos = this.fd.size
  if (this.fd.size === 0) {
    return this.push(null)
  }

  var self = this
  // Sketchy implementation that pushes the whole file to the the stream
  // But maybe fd has a size that we can iterate to?
  var onread = function (err, length, data) {
    if (err) {
      if (self.autoClose) {
        self.destroy()
      }
      self.emit('error', err)
    }
    self.push(data)
  }

  exports.read(this.fd, new Buffer(this.fd.size), 0, this.fd.size, 0, onread)

}

ReadStream.prototype.destroy = function () {
  if (this.destroyed) {
    return
  }

  this.destroyed = true
  this.close()
}

ReadStream.prototype.close = function (cb) {
  var self = this

  if (cb) {
    this.once('close', cb)
  }
  if (this.closed) {
    this.emit('close')
  }
  this.closed = true
  close()
  function close (fd) {
    self.emit('close')
    self.fd = null
  }
}

exports.createWriteStream = function (path, options) {
  return new WriteStream(path, options)
}

util.inherits(WriteStream, Writable)
exports.WriteStream = WriteStream
function WriteStream (path, options) {
  if (!(this instanceof WriteStream)) {
    return new WriteStream(path, options)
  }
  options = options || {}

  Writable.call(this, options)

  this.path = path
  this.fd = null

  this.fd = options.hasOwnProperty('fd') ? options.fd : null
  this.flags = options.hasOwnProperty('flags') ? options.flags : 'w'
  this.mode = options.hasOwnProperty('mode') ? options.mode : 438 /* =0666 */

  this.start = options.hasOwnProperty('start') ? options.start : undefined
  this.pos = undefined
  this.bytesWritten = 0

  if (!util.isUndefined(this.start)) {
    if (!util.isNumber(this.start)) {
      throw TypeError('start must be a Number')
    }
    if (this.start < 0) {
      throw new Error('start must be >= zero')
    }

    this.pos = this.start
  }

  if (this.fd === null) {
    this.open()
  }

  // dispose on finish.
  this.once('finish', this.close)
}

exports.FileWriteStream = exports.WriteStream // support the legacy name

WriteStream.prototype.open = function () {
  exports.open(this.path, this.flags, this.mode, function (er, fd) {
    if (er) {
      this.destroy()
      this.emit('error', er)
      return
    }
    this.fd = fd
    this.emit('open', fd)
  }.bind(this))
}

WriteStream.prototype._write = function (data, encoding, callbk) {

  if (!util.isBuffer(data)) {
    return this.emit('error', new Error('Invalid data'))
  }
  if (!util.isObject(this.fd)) {
    return this.once('open', function () {
      this._write(data, encoding, callbk)
    })
  }

  if (this.fd === null) {
    return this.once('open', function () {
      this._write(data, encoding, callbk)
    })
  }

  var callback = maybeCallback(callbk)
  this.toCall = callback
  this.isWriting = false
  var self = this
  this.fd.onerror = callback
  var bufblob = new Blob([data], {type: 'application/octet-binary'}) // eslint-disable-line
  if (this.fd.readyState > 0) {
    if (typeof this.tmpbuffer === 'undefined') {
      this.tmpbuffer = []
    }
    this.tmpbuffer += data
    this.isWriting = false
  } else {
    this.fd.write(bufblob)
    this.bytesWritten += data.length
    callback(null, bufblob.length)
  }
  this.fd.onwriteend = function (e) {
    if (!self.isWriting) {
      if (self.tmpbuffer.length > 0) {
        self.isWriting = true
        var tmpblob = new Blob([self.tmpbuffer], {type: 'application/octet-binary'}) // eslint-disable-line
        self.tmpbuffer = []
        self.fd.write(tmpblob)
        callback(null, tmpblob.length)
        self.bytesWritten += self.tmpbuffer.length
      }
    }
  }
}

WriteStream.prototype.destroy = ReadStream.prototype.destroy
WriteStream.prototype.close = ReadStream.prototype.close

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end

function flagToString (flag) {
  // Only mess with strings
  if (util.isString(flag)) {
    return flag
  }

  switch (flag) {
    case O_RDONLY : return 'r'
    case O_RDONLY | O_SYNC : return 'sr'
    case O_RDWR : return 'r+'
    case O_RDWR | O_SYNC : return 'sr+'

    case O_TRUNC | O_CREAT | O_WRONLY : return 'w'
    case O_TRUNC | O_CREAT | O_WRONLY | O_EXCL : return 'xw'

    case O_TRUNC | O_CREAT | O_RDWR : return 'w+'
    case O_TRUNC | O_CREAT | O_RDWR | O_EXCL : return 'xw+'

    case O_APPEND | O_CREAT | O_WRONLY : return 'a'
    case O_APPEND | O_CREAT | O_WRONLY | O_EXCL : return 'xa'

    case O_APPEND | O_CREAT | O_RDWR : return 'a+'
    case O_APPEND | O_CREAT | O_RDWR | O_EXCL : return 'xa+'
  }

  throw new Error('Unknown file open flag: ' + flag)
}
