var util = require('util')
var Buffer = require('buffer').Buffer
var Stream = require('stream').Stream
var constants = require('constants')
var p = require('path')
var Readable = Stream.Readable
var Writable = Stream.Writable

var FILESYSTEM_DEFAULT_SIZE = 250 * 1024 * 1024	// 250MB
var DEBUG = false
var fsSize = FILESYSTEM_DEFAULT_SIZE;

var O_APPEND = constants.O_APPEND || 0
var O_CREAT = constants.O_CREAT || 0
var O_EXCL = constants.O_EXCL || 0
var O_RDONLY = constants.O_RDONLY || 0
var O_RDWR = constants.O_RDWR || 0
var O_SYNC = constants.O_SYNC || 0
var O_TRUNC = constants.O_TRUNC || 0
var O_WRONLY = constants.O_WRONLY || 0
var fds = {}
var localAFS = null;
var localFS = null;

var G_KEY = 1;

function isNON(value) {
    return value === undefined || value === null;
}

function getSyncFS() {
    if (localFS) return localFS;
    if(typeof DedicatedWorkerGlobalScope === 'undefined') { //Not running in worker context
        throw new Error('Not in worker context');
    }
    let rfs = window.requestFileSystemSync || window.webkitRequestFileSystemSync;
    localFS = rfs(window.PERSISTENT, fsSize);
    return localFS;
}

function getAsyncFS(successCB, errCB) {
    if (localAFS) return successCB(localAFS);
    else {
        let rfs = window.requestFileSystem || window.webkitRequestFileSystem;
        rfs(window.PERSISTENT, fsSize,
            (cfs) => {
                localAFS = cfs;
                successCB(cfs);
            },
            (err) => errCB(err));
    }
}

function nullCheck(path, callback) {
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

function maybeCallback(cb) {    
    return util.isFunction(cb) ? cb : rethrow()
}

function makeCallback(cb) {
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

function noop() {}

function rethrow() {
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
    } else {
        return noop;
    }
}

function resolve(path) {
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

function assertEncoding(encoding) {
    if (encoding && !Buffer.isEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding)
    }
}

function modeNum(m, def) {
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

exports.setFSSize = (size) => {
    fsSize = Math.max(size, fsSize);
}

exports.chown = function (path, uid, gid, callback) {
    resolve(path)
    callback = makeCallback(callback)
    if (!nullCheck(path, callback)) return

    exports.exists(path, function (exists) {
        if (exists) {
            callback()
        } else {
            callback('File does not exist')
        }
    })
}

exports.utimes = function (name, now, mtime, cb) {
    cb()
}

exports.fchown = function (fd, uid, gid, callback) {
    exports.chown(fd.fullPath, uid, gid, callback)
}

exports.chmod = function (path, mode, callback) {
    resolve(path)
    callback = makeCallback(callback)
    if (!nullCheck(path, callback)) return

    exports.exists(path, function (exists) {
        if (exists) {
            callback()
        } else {
            callback('File does not exist')
        }
    })
}

exports.fchmod = function (fd, mode, callback) {
    exports.chmod(fd.fullPath, mode, callback)
}

function existDirSync(path) {
    try {
        let res = getSyncFS().root.getDirectory(path, {});
        return res && true;
    } catch(err) {
        return false;
    }
}

exports.existsSync = (path) => {
    if(path === '/') return true;
    path = resolve(path);
    try {
        let res = getSyncFS().root.getFile(path, {});
        return res && true;
    } catch (err) {
        return existDirSync(path);
    }
}

exports.exists = function (path, callback) {
    if (path === '/') {
        callback(true)
        return
    }
    path = resolve(path)
    getAsyncFS(function (cfs) {
        cfs.root.getFile(path, {},
            function (fileEntry) {
                setTimeout(callback, 0, true)
            }, function () {
                cfs.root.getDirectory(path, {},
                    function (dirEntry) {
                        setTimeout(callback, 0, true)
                    }, function () {
                        callback(false)
                    })
            })
    }, function () { setTimeout(callback, 0, false) })
}

function createFSErr(code, path) {
    var err = new Error();
    err.code = code;
    if(path) err.path = path;
    return err;
}

exports.mkdirSync = (path, mode) => {
    path = resolve(path);
    if (!nullCheck(path)) return
    
    let exists = exports.existsSync(path);
    if(exists) throw createFSErr('EEXIST', path);
    else {
        exists = exports.existsSync(p.dirname(path));
        if (exists || p.dirname(path) === '.')
            getSyncFS().root.getDirectory(path, {create: true})
        else
            throw createFSErr('ENOENT', path);
    }
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
                    getAsyncFS(function (cfs) {
                        cfs.root.getDirectory(path, { create: true },
                            function (dirEntry) {
                                setTimeout(callback, 0)
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

exports.rmdirSync = (path) => {
    if(path === '/') throw createFSErr('EPERM');
    resolve(path);
    nullCheck(path);
    try {
        let dirEntry = getSyncFS().root.getDirectory(path, {});
        dirEntry.remove();
    } catch (err) {
        if(err.name === 'NotFoundError') throw createFSErr('ENOENT', path);
        throw err;
    }
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

    getAsyncFS(
        function (cfs) {
            cfs.root.getDirectory(path, {},
                function (dirEntry) {
                    dirEntry.remove(function () {
                        callback()
                    }, function (err) {
                        if (err.name === 'NotFoundError') {
                            var entryerr = new Error()
                            entryerr.code = 'ENOENT'
                            entryerr.path = path
                            callback(entryerr)
                        } else {
                            callback(err)
                        }
                    })
                }, function (err) {
                    if (err.name === 'NotFoundError') {
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

exports.readdirSync = (path) => {
    resolve(path);
    try {
        let dirReader = getSyncFS().root.getDirectory(path, {}).createReader();
        let entries = dirReader.readEntries();
        let fullPathList = []
        for (var i = 0; i < entries.length; i++) {
            fullPathList.push(entries[i].name);
        }
        return fullPathList;
    } catch (err) {
        if(err.name === 'NotFoundError') throw createFSErr('ENOENT');
        throw err;
    }
}

exports.readdir = function (path, callback) {
    resolve(path)
    getAsyncFS(
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
            }, function (err) {
                if (err.name === 'NotFoundError') {
                    var enoent = new Error()
                    enoent.code = 'ENOENT'
                    callback(enoent)
                } else {
                    callback(err)
                }
            })
        }, callback)
}

exports.renameSync = (oldPath, newPath) => {
    nullCheck(oldPath);
    nullCheck(newPath);

    oldPath = resolve(oldPath);
    newPath = resolve(newPath);

    let tmpPath = newPath.split('/');
    let newName = tmpPath.pop();
    let toDirectory = tmpPath.join('/');

    let cfs = getSyncFS();
    toDirectory = toDirectory === '' ? cfs.root : toDirectory;
    try {
        let fileEntry = cfs.root.getFile(oldPath, {});
        let toDirEntry = cfs.root.getDirectory(toDirectory, {});
        fileEntry.moveTo(toDirEntry, newName);
    } catch(err) {
        if (err.name === 'TypeMismatchError') // we need to move the directory instead
            cfs.root.getDirectory('/'+oldPath, {}).moveTo(toDirectory, newName);
        else throw err;
    }
}

exports.rename = function (oldPath, newPath, callback) {
    callback = makeCallback(callback)

    if (!nullCheck(oldPath, callback)) {
        return
    }

    if (!nullCheck(newPath, callback)) {
        return
    }
    // Some shennanigans here as folks rename and move
    // at the same time :/
    // First we strip the prefixed /
    oldPath = resolve(oldPath)
    newPath = resolve(newPath)

    // Then we split the new location to get the name and the too directory
    var tmpPath = newPath.split('/')
    var newName = tmpPath.pop()
    // if the directory happens to be root then we need to supply
    // a / because gooogle devs
    var toDirectory = tmpPath.join('/')

    // Leaving us with oldPath the toDirectory and newName
    getAsyncFS(
        function (cfs) {
            // If root is / then we need a pointer to the root dir?
            // Think this needs a couple of sun dir tests
            if (toDirectory === '') {
                toDirectory = cfs.root
            }
            cfs.root.getFile(oldPath, {},
                function (fileEntry) {
                    cfs.root.getDirectory(toDirectory, {}, function (dirEntry) {
                        fileEntry.moveTo(dirEntry, newName, () => callback(null), callback);
                    }, callback)
                }, function (err) {
                    // we need to move the directory instead
                    if (err.name === 'TypeMismatchError') {
                        cfs.root.getDirectory('/' + oldPath, {}, function (dirEntry) {
                            dirEntry.moveTo(toDirectory, newName, () => callback(null), (err) => callback(err));
                        }, callback);
                    } else {
                        callback(err)
                    }
                })
        }, callback)
}
  

exports.ftruncateSync = (fd, len) => {
    len = len || 0;
    fd.truncate(len);
}

exports.ftruncate = function (fd, len, callback) {
    if (util.isFunction(len)) {
        callback = len
        len = 0
    } else if (util.isUndefined(len)) {
        len = 0
    }
    var cb = makeCallback(callback)
    fireDestroyErrCB(fd, cb);
    fireDestroyEndCB(fd, cb);
    fd.truncate(len)
}

exports.truncateSync = (path, len) => {
    if (util.isObject(path)) {
        return exports.ftruncateSync(path, len)
    }
    len = len || 0;
    let fd = exports.openSync(path, 'w');
    fd.truncate(len);
}

exports.truncate = function (path, len, callback) {
    if (util.isObject(path)) {
        return exports.ftruncate(path, len, callback)
    }
    if (util.isFunction(len)) {
        callback = len
        len = 0
    } else if (util.isUndefined(len)) {
        len = 0
    }

    callback = maybeCallback(callback)
    exports.open(path, 'w', function (er, fd) {
        if (er) return callback(er);
        fireDestroyEndCB(fd, callback);
        fd.truncate(len)
    })
}

exports.statSync = function (path) {
    path = resolve(path);
    let cfs = getSyncFS();
    let opts = {};
    try {
        let file = cfs.root.getFile(path, opts).file();
        return new Stats(true, file.size, file.lastModifiedDate);
    } catch (err) {
        if (err.name === 'TypeMismatchError') {
            cfs.root.getDirectory(path, opts); //Just to check if dir exist
            return new Stats(false, 0, new Date(0));
        } else if(err.name === 'NotFoundError') {
            throw createFSErr('ENOENT', path);
        }
        throw err;
    }
}

exports.Stats = Stats;

function Stats(gFile, size, lastModified) {

    if (!(this instanceof Stats)) {
        return new Stats(isFile, size, lastModified)
    }

    this.gFile = gFile;
    this.dev = 0;
    this.mode = '0777';
    this.nlink = 0;
    this.uid = 0;
    this.gid = 0;
    this.rdev = 0;
    this.ino = 0;
    this.size = size;
    this.atime = null;
    this.mtime = lastModified;
    this.ctime = null;
    if (!gFile) {
        this.blksize = -1;
        this.blocks = -1;
    }
}

Stats.prototype.isDirectory = function () { return !this.gFile; };
Stats.prototype.isFile = function () { return this.gFile; };
Stats.prototype.isSocket = function () { return false };
Stats.prototype.isBlockDevice = function () { return false };
Stats.prototype.isCharacterDevice = function () { return false };
Stats.prototype.isFIFO = function () { return false };
Stats.prototype.isSymbolicLink = function () { return false };


exports.stat = function (path, callback) {
    path = resolve(path)
    getAsyncFS(
        function (cfs) {
            var opts = {}
            cfs.root.getFile(path, opts, function (fileEntry) {
                fileEntry.file(function (file) {
                    let statVal = new Stats(true, file.size, file.lastModifiedDate);
                    callback(null, statVal);
                })
            }, function (err) {
                if (err.name === 'TypeMismatchError') {
                    cfs.root.getDirectory(path, opts, function (dirEntry) {
                        let statVal = new Stats(false, 0, new Date(0));
                        callback(null, statVal);
                    })
                } else if(err.name === 'NotFoundError') {
                    callback(createFSErr('ENOENT', path));
                } else {
                    callback(err);
                }
            })
        }, callback)
}

exports.lstatSync = (path) => {
    return exports.statSync(path);
}

exports.lstat = (path, cb) => {
    exports.stat(path, cb);
}

exports.fstatSync = (fd) => {
    if (typeof fds[fd.key] === 'undefined') {
        throw createFSErr('EBADF');
    } else {
        return exports.statSync(fd.fullPath)
    }
}

exports.fstat = function (fd, callback) {
    if (typeof fds[fd.key] === 'undefined') {
        var ebadf = new Error()
        ebadf.code = 'EBADF'
        window.setTimeout(callback, 0, ebadf)
    } else {
        exports.stat(fd.fullPath, callback)
    }
}

function createFD(file, fullPath, flags) {
    let id = G_KEY++;

    if(!isNON(flags)) file.flags = flags
    file.fullPath = fullPath;
    file.key = id;
    fds[file.key] = {};
    fds[file.key].status = 'open';
    return file;
}

function openFileSync(fileEntry, flags) {
    if (isFileModifyFlag(flags)) {

        let fileWriter = fileEntry.createWriter();
        if(needTruncate(fileWriter, flags)) exports.ftruncateSync(fileWriter);
        if(flags.indexOf('a') > -1) fileWriter.seek(fileWriter.length);

        return createFD(fileWriter, fileEntry.fullPath, flags);
    } else {
        return createFD(fileEntry.file(), fileEntry.fullPath);
    }
}

exports.openSync = (path, flags, mode) => {
    nullCheck(path);
    path = resolve(path);
    flags = flagToString(flags);
    mode = modeNum(mode, 438 /* =0666 */)

    try {
        let opts = {};
        if(isFileModifyFlag(flags)) opts.create = true;
        flags.indexOf('x') > -1 && (opts.exclusive = true);
        let cfs = getSyncFS();
        let fileEntry = cfs.root.getFile(path, opts);
        return openFileSync(fileEntry, flags);
    } catch (err) {
        if (err.name === 'NotFoundError') throw createFSErr('ENOENT');
        else if (err.name === 'TypeMismatchError' || err.name === 'SecurityError') {
            // Work around for directory file descriptor
            // It's a write on a directory
            if (isFileModifyFlag(flags)) throw createFSErr('EISDIR');
            else return { fullPath: path };
        } else if (err.name === 'InvalidModificationError') throw createFSErr('EEXIST');
        throw err;
    }
}

function isFileModifyFlag(flags) {
    return flags.indexOf('w') > -1 || flags.indexOf('a') > -1;
}

function needTruncate(fileWriter, flags) {
    return fileWriter.length > 0 && flags.indexOf('w') > -1;
}

exports.open = function (path, flags, mode, callback) {
    if (!nullCheck(path, callback)) return;
    path = resolve(path)
    flags = flagToString(flags)
    callback = makeCallback(arguments[arguments.length - 1])
    mode = modeNum(mode, 438 /* =0666 */)
    
    getAsyncFS(
        function (cfs) {
            var opts = {}
            if (isFileModifyFlag(flags)) opts = { create: true };
            if (flags.indexOf('x') > -1) opts.exclusive = true;
            cfs.root.getFile(
                path,
                opts,
                function (fileEntry) {
                    // if its a write then we get the file writer
                    // otherwise we get the file because 'standards'
                    if (isFileModifyFlag(flags)) {
                        fileEntry.createWriter(function (fileWriter) {
                            function actualWork() {
                                if(flags.indexOf('a') > -1) fileWriter.seek(fileWriter.length);
                                createFD(fileWriter, fileEntry.fullPath, flags);
                                callback(null, fileWriter);
                            }
                            if (needTruncate(fileWriter, flags)) exports.ftruncate(fileWriter, (err) => {
                                if (!isNON(err)) return callback(err);
                                else actualWork();
                            });
                            else {
                                actualWork();
                            }
                        }, callback)
                    } else {
                        fileEntry.file(function (file) {
                            createFD(file, fileEntry.fullPath);
                            callback(null, file)
                        })
                    }
                }, function (err) {
                    if (err.name === 'NotFoundError') {
                        var enoent = new Error()
                        enoent.code = 'ENOENT'
                        callback(enoent)
                    } else if (err.name === 'TypeMismatchError' || err.name === 'SecurityError') {
                        // Work around for directory file descriptor
                        // It's a write on a directory
                        if (isFileModifyFlag(flags) > -1) {
                            var eisdir = new Error()
                            eisdir.code = 'EISDIR'
                            callback(eisdir)
                        } else {
                            var dird = {}
                            dird.fullPath = path
                            callback(null, dird)
                        }

                    } else if (err.name === 'InvalidModificationError') {
                        var eexists = new Error()
                        eexists.code = 'EEXIST'
                        callback(eexists)
                    } else {
                        callback(err)
                    }
                })
        }, callback)
}

exports.readSync = (fd, buffer, offset, length, position) => {
    if (fd === null) return 0;
    if (typeof fds[fd.key] === 'undefined') fds[fd.key].readpos = 0;
    if (!isNON(position) && position >= 0) fds[fd.key].readpos = position;

    //Not supporting legacy read
    if (offset < fds[fd.key].readpos) offset = fds[fd.key].readpos;
    let data = fd.slice(offset, offset + length);
    let fileReader = new FileReaderSync();

    try {
        let res;
        if (fd.type === 'text/plain') {
            res = new Buffer(fileReader.readAsText(data));
        } else {
            let arr = fileReader.readAsArrayBuffer(data);
            res = new Buffer(new Uint8Array(arr));
        }
        res.copy(buffer);
        fds[fd.key].readpos = offset + length;
        return res.length;
    } catch (err) {
        if (err.name === 'NotFoundError') throw createFSErr('ENOENT');
        throw err;
    }
}

exports.read = function (fd, buffer, offset, length, position, callback) {
    if (fd === null) {
        callback(null, 0, '')
        return
    }
    if (typeof fds[fd.key] === 'undefined') {
        fds[fd.key].readpos = 0
    }
    if (position !== null) {
        if (position >= 0) {
            fds[fd.key].readpos = position
        }
    }
    if (!util.isBuffer(buffer)) {
        throw new TypeError('The buffer argument must be of type Buffer');
    }
    fd.onerror = function (err) {
        fd.onerror = null;
        if (err.name === 'NotFoundError') {
            var enoent = new Error()
            enoent.code = 'ENOENT'
            callback(enoent)
        } else {
            callback(err)
        }
    }
    if (offset < fds[fd.key].readpos) {
        offset = fds[fd.key].readpos
    }
    var data = fd.slice(offset, offset + length)
    var fileReader = new FileReader() // eslint-disable-line
    fileReader.onload = function (evt) {
        var result
        if (fd.type === 'text/plain') {
            result = new Buffer(this.result)
        } else {
            result = new Buffer(new Uint8Array(this.result))
        }
        result.copy(buffer)
        fds[fd.key].readpos = offset + length
        callback(null, result.length, result)
    }
    fileReader.onerror = function (err) {
        if (err.name === 'NotFoundError') {
            var enoent = new Error()
            enoent.code = 'ENOENT'
            callback(enoent)
        } else {
            callback(err)
        }
    }
    // no-op the onprogressevent
    fileReader.onprogress = function () { }
    if (fd.type === 'text/plain') {
        fileReader.readAsText(data)
    } else {
        fileReader.readAsArrayBuffer(data)
    }
}

function getEncData(data, encoding) {
    encoding = encoding && encoding.toLocaleLowerCase();
    if (encoding === null) {
        return new Buffer(data, 'binary');
    } else {
        return new Buffer(data).toString(encoding);
    }
}

function isTextEnc(encoding) {
    if(isNON(encoding)) return false;
    encoding = encoding.toLocaleLowerCase();
    return encoding === 'utf8' || encoding === 'utf-8' || encoding === 'ascii';
}

exports.readFileSync = (path, options) => {
    options = options || { encoding: null, flag: 'r' };
    if (util.isString(options)) {
        options = { encoding: options, flag: 'r' };
    } else if (!util.isObject(options)) {
        throw new TypeError('Bad arguments');
    }
    let encoding = options.encoding;
    assertEncoding(encoding);

    try {
        let file = getSyncFS().root.getFile(path, {}).file();
        let fileReader = new FileReaderSync();
        let res = isTextEnc(encoding) && file.type === 'text/plain' ?
            fileReader.readAsText(file) :
            fileReader.readAsArrayBuffer(file);

        return getEncData(res, encoding);
    } catch (err) {
        if (err.name === 'TypeMismatchError') throw createFSErr('EISDIR');
        throw err;
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
    getAsyncFS(
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
                            let res = getEncData(this.result, encoding);
                            window.setTimeout(callback, 0, null, res);
                        }
                        fileReader.onerror = function (evt) {
                            callback(evt, null)
                        }

                        if (isTextEnc(encoding) && file.type === 'text/plain') fileReader.readAsText(file);
                        else fileReader.readAsArrayBuffer(file);
                    })
                }, function (err) {
                    if (err.name === 'TypeMismatchError') {
                        var eisdir = new Error()
                        eisdir.code = 'EISDIR'
                        callback(eisdir)
                    } else {
                        callback(err)
                    }
                })
        }, callback)
}

exports.writeSync = (fd, buffer, arg1, arg2, arg3) => {
    //TODO: check if fd is typeof FileWriterSync
    if(util.isBuffer(buffer)) {
        let offset = arg1;
        let length = arg2;
        let position = arg3;
        let tmpbuf = buffer.slice(offset, length);
        let bufblob = new Blob([tmpbuf], { type: 'application/octet-binary' });    
        
        !isNON(position) && fd.seek(position);
        fd.write(bufblob);
        
        return tmpbuf.length;
    } else {
        if (util.isString(buffer)) {
            buffer += ''
        }
        let position = arg1;

        let blob = new Blob([buffer], { type: 'text/plain' });
        let buf = new Buffer(buffer);

        !isNON(position) && fd.seek(position); //TODO: check append case

        fd.write(blob);
        return buf.length;
    }
}

function fireDestroyErrCB(fd, cb) {
    fd.onerror = (err) => {
        fd.onerror = null;
        if(err) fd.onwriteend = null; //error must not bubble
        cb(err);
    }
}

function fireDestroyEndCB(fd, cb, ...args) {
    fd.onwriteend = (ev) => {
        fd.onwriteend = null;
        if(ev.currentTarget && ev.currentTarget.error) {
            cb(ev.currentTarget.error);
        } else {
            cb(null, ...args);
        }
    }
}

exports.write = function (fd, buffer, offset, length, position, callback) {
    if (util.isBuffer(buffer)) {
        if (util.isFunction(position)) {
            callback = position
            position = null
        }
        callback = maybeCallback(callback)

        fireDestroyErrCB(fd, callback);
        fd.onprogress = function () { }
        var tmpbuf = buffer.slice(offset, length)
        var bufblob = new Blob([tmpbuf], { type: 'application/octet-binary' }) // eslint-disable-line
        
        function actualWrite() {
            if (position !== null) fd.seek(position);
            fireDestroyEndCB(fd, callback, tmpbuf.length, tmpbuf);
            fd.write(bufblob);
        }
        
        if (fd.readyState === 1) {
            fireDestroyEndCB(fd, (err) => {
                if(err) callback(err);
                else actualWrite();
            });
        } else {
            actualWrite();
        }
    } else {
        // offset -> position, length -> encoding, position -> callback
        // write(fd, buffer, offset, length, position, callback)
        // write(fd, string[, position[, encoding]], callback)
        if (util.isString(buffer)) {
            buffer += ''
        }
        
        if (!util.isFunction(position)) {
            if (util.isFunction(offset)) {
                callback = offset;
                offset = null;
                position = null;
            } else {
                position = offset;
                callback = length
            }
            length = 'utf8';
        }
        callback = maybeCallback(callback)
        fireDestroyErrCB(fd, callback);
        var blob = new Blob([buffer], { type: 'text/plain' }) // eslint-disable-line

        var buf = new Buffer(buffer)

        function actualWrite() {
            if (position !== null) fd.seek(position);
            fireDestroyEndCB(fd, callback, buf.length);
            fd.write(blob);
        }

        if (fd.readyState === 1) {
            fireDestroyEndCB(fd, (err) =>  {
                if(err) callback(err);
                else actualWrite();
            })
        } else {
            actualWrite();
        }
    }
}

exports.unlinkSync = (path) => {
    path = resolve(path);
    let exists = exports.existsSync(path);
    try {
        if (exists) getSyncFS().root.getFile(path, {}).remove();
        else throw createFSErr('ENOENT', path);
    } catch (err) {
        if (err.name === 'TypeMismatchError') throw createFSErr('EISDIR', path);
        throw err;
    }
}

exports.unlink = function (path, callback) {
    path = resolve(path)
    exports.exists(path, function (exists) {
        if (exists) {
            getAsyncFS(
                function (cfs) {
                    cfs.root.getFile(
                        path,
                        {},
                        function (fileEntry) {
                            fileEntry.remove(callback)
                        }, function (err) {
                            if (err.name === 'TypeMismatchError') {
                                var eisdir = new Error()
                                eisdir.code = 'EISDIR'
                                eisdir.path = path
                                callback(eisdir)
                            } else {
                                callback(err)
                            }
                        })
                }, callback)
        } else {
            var enoent = new Error()
            enoent.code = 'ENOENT'
            enoent.path = path
            callback(enoent)
        }
    })
}

exports.writeFileSync = (path, data, options) => {
    options = options || { encoding: 'utf8', mode: 438, flag: 'w' };
    options = util.isString(options) ? { encoding: 'utf8', mode: 438, flag: 'w' } : options;
    if (!util.isObject(options)) {
        throw new TypeError('Bad arguments')
    }
    assertEncoding(options.encoding);

    let flag = options.flag || 'w';
    let cfs = getSyncFS();
    let opts = {};
    if (isFileModifyFlag(flag)) opts.create = true;
    else {
        let err = new Error();
        err.code = 'UNKNOWN';
        err.message = 'flag not supported: ' + flag;
        throw err;
    }
    if (flag.indexOf('x') > -1) opts.exclusive = true;

    try {
        let fileWriter = cfs.root.getFile(path, opts).createWriter();
        
        //Have to truncate file
        if(needTruncate(fileWriter, flag)) exports.ftruncateSync(fileWriter);

        if(flag.indexOf('a') > -1) fileWriter.seek(fileWriter.length);

        let blob;
        if (typeof data === 'string') {
            blob = new Blob([data], { type: 'text/plain' });
        } else {
            if (options.encoding === 'hex') {
                // convert the hex data to a string then save it.
                blob = new Blob([new Buffer(data, 'hex').toString('hex')], { type: 'text/plain' });
            } else {
                blob = new Blob([data], { type: 'application/octet-binary' });
            }
        }
        fileWriter.write(blob);
    } catch (err) {
        if (err.name === 'TypeMismatchError') throw createFSErr('EISDIR');
        throw err;
    }
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
    getAsyncFS(
        function (cfs) {
            var opts = {}
            if (isFileModifyFlag(flag)) {
                opts = { create: true }
            }
            if (flag.indexOf('x') > -1) {
                opts.exclusive = true
            }
            cfs.root.getFile(
                path,
                opts,
                function (fileEntry) {
                    // if its a write then we get the file writer
                    // otherwise we get the file because 'standards'
                    if (isFileModifyFlag(flag)) {
                        fileEntry.createWriter(function (fileWriter) {
                            function actualWrite() {
                                fileWriter.onerror = callback
                                // make sure we have an empty file
                                // fileWriter.truncate(0)
                                fireDestroyEndCB(fileWriter, callback);

                                var blob
                                if (typeof data === 'string') {
                                    blob = new Blob([data], { type: 'text/plain' }) // eslint-disable-line
                                } else {
                                    if (options.encoding === 'hex') {
                                        // convert the hex data to a string then save it.
                                        blob = new Blob([new Buffer(data, 'hex').toString('hex')], { type: 'text/plain' }) // eslint-disable-line
                                    } else {
                                        blob = new Blob([data], { type: 'application/octet-binary' }) // eslint-disable-line
                                    }
                                }

                                if (flag.indexOf('a') > -1) fileWriter.seek(fileWriter.length);
                                fileWriter.write(blob);
                            }

                            if(needTruncate(fileWriter, flag)) exports.ftruncate(fileWriter, (err) => {
                                if(!isNON(err)) return callback(err);
                                actualWrite();
                            });
                            else actualWrite();

                        }, callback);
                    } else {
                        var err = new Error()
                        err.code = 'UNKNOWN'
                        err.message = 'flag not supported: ' + flag
                        callback(err)
                    }
                }, function (err) {
                    if (err.name === 'TypeMismatchError') {
                        var eisdir = Error()
                        eisdir.code = 'EISDIR'
                        callback(eisdir)
                    } else {
                        callback(err)
                    }
                })
        }, function (evt) {
            if (evt.type !== 'writeend') {
                callback(evt)
            } else {
                callback()
            }
        })
}

exports.appendFileSync = (path, data, options) => {
    options = options || { encoding: 'utf8', mode: 438, flag: 'a' };
    options = util.isString(options) ? { encoding: 'utf8', mode: 438, flag: 'a' } : options;
    if (!util.isObject(options)) {
        throw new TypeError('Bad arguments')
    }

    let flag = options.flag || 'a';
    if(flag !== 'a') throw new Error('incorrect flag');

    exports.writeFileSync(path, data, options);
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

    getAsyncFS(
        function (cfs) {
            var opts = {}
            if (flag === 'a') {
                opts = { create: true }
            }
            cfs.root.getFile(
                path,
                opts,
                function (fileEntry) {
                    // if its a write then we get the file writer
                    // otherwise we get the file because 'standards'
                    if (flag === 'a') {
                        fileEntry.createWriter(function (fileWriter) {
                            fireDestroyErrCB(fileWriter, callback);
                            fireDestroyEndCB(fileWriter, callback);
                            fileWriter.seek(fileWriter.length);
                            var blob = new Blob([data], { type: 'text/plain' }) // eslint-disable-line
                            fileWriter.write(blob)
                        }, callback)
                    } else {
                        callback('incorrect flag')
                    }
                }, callback)
        }, callback)
}

exports.fsyncSync = (fd) => {
    if (typeof fds[fd.key] === 'undefined') throw createFSErr('EBADF');
}

exports.fsync = function (fd, cb) {
    if (!cb) cb = function () { }
    if (typeof fds[fd.key] === 'undefined') {
        var ebadf = new Error()
        ebadf.code = 'EBADF'
        window.setTimeout(cb, 0, ebadf)
    } else {
        window.setTimeout(cb, 0)
    }
}

exports.closeSync = (fd) => {
    delete fds[fd.key];
}

exports.close = function (fd, callback) {
    delete fds[fd.key]
    let cb = makeCallback(callback)
    if (fd.readyState !== 1 ) cb(null);
    else fireDestroyEndCB(fd, callback);
}

exports.createReadStream = function (path, options) {
    return new ReadStream(path, options)
}

util.inherits(ReadStream, Readable)
exports.ReadStream = ReadStream

function ReadStream(path, options) {
    if (!(this instanceof ReadStream)) {
        return new ReadStream(path, options)
    }

    // debugger // eslint-disable-line
    // a little bit bigger buffer and water marks by default
    options = util._extend({
        highWaterMark: 33554432 // 1024 * 1024
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

    if (this.pos > this.fd.size) {
        return this.push(null)
    }

    if (this.fd.size === 0) {
        return this.push(null)
    }
    var self = this
    // Sketchy implementation that pushes the whole file to the stream
    // But maybe fd has a size that we can iterate to?
    var onread = function (err, length, data) {
        if (err) {
            if (self.autoClose) {
                self.destroy()
            }
            self.emit('error', err)
        }
        self.push(data)
        // self.once('finish', self.close)
    }

    // calculate the offset so read doesn't carry too much
    if (this.end === 0) {
        this.end = this._readableState.highWaterMark
    } else {
        this.end = this.end - this.start + 1
    }

    // exports.read(this.fd, new Buffer(this.fd.size), this.start, this.end, 0, onread)
    exports.read(this.fd, new Buffer(this.fd.size), this.start, this.end, this.pos, onread)
    this.pos += this._readableState.highWaterMark

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
    function close(fd) {
        self.emit('close')
        self.fd = null
    }
}

exports.createWriteStream = function (path, options) {
    return new WriteStream(path, options)
}

util.inherits(WriteStream, Writable)
exports.WriteStream = WriteStream
function WriteStream(path, options) {
    if (!(this instanceof WriteStream)) {
        return new WriteStream(path, options)
    }

    options = options || {}

    Writable.call(this, options)

    this.path = path
    this.fd = null
    this.dataQueue = [];

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

WriteStream.prototype._addToQueue = (self, data, enc, cb) => {
    self.dataQueue.push({data: data, enc: enc, cb: cb});
}

WriteStream.prototype.open = function () {
    exports.open(this.path, this.flags, this.mode, function (er, fd) {
        if (er) {
            this.destroy()
            this.emit('error', er)
            return
        }
        this.fd = fd
        if (this.flags.indexOf('a') > -1) {
            this.fd.seek(this.fd.length)
        }
        this.emit('open', fd)
    }.bind(this))
}
// WriteStream.prototype.totalsize = 0
WriteStream.prototype._write = function (data, encoding, callback) {
    /*
    This will be called only when the buffer has been filled and the data must be written
    to the underlying layer
    */

    if (!util.isBuffer(data)) {
        return this.emit('error', new Error('Invalid data'))
    }

    if (this.fd === null || !util.isObject(this.fd)) {
        return this.once('open', function () {
            this._write(data, encoding, callback)
        })
    }

    var self = this;

    this.fd.onerror = function (err) {
        if (err.name === 'TypeMismatchError') {
            // It's a write on a directory
            if (isFileModifyFlag(flags)) {
                callback(createFSErr('EISDIR'))
            } else {
                callback(err)
            }
        } else if (err.name === 'InvalidModificationError') {
            callback(createFSErr('EEXIST'))
        } else {
            callback(err)
        }
    }

    this._actualwrite(self, data, encoding, callback);
}

WriteStream.prototype._drainQueue = (self) => {
    if(self.dataQueue.length == 0) return;
    let entry = self.dataQueue.pop(); //Dequeue FIFO
    process.nextTick(() => self._actualwrite(self, entry.data, entry.enc, entry.cb));
}

WriteStream.prototype._actualwrite = function (self, data, encoding, cb) {
    if(self.dataQueue.length > 0 || self.fd.readyState === 1) { //WAITING
        //Wait for old write to complete
        self._addToQueue(self, data, encoding, cb);
    } else {
        self.fd.onwriteend = () => {
            self.fd.onwriteend = null;
            self._drainQueue(self);
            process.nextTick(() => cb());
        }
        self.fd.write(new Blob([data]));
    }
}

WriteStream.prototype.destroy = ReadStream.prototype.destroy
WriteStream.prototype.close = function (cb) {
    let self = this
    if (cb) this.once('close', cb)
    if (this.closed) return this.emit('close')
    if(this.closeTriggered) return; //Already some 1 else had trigged it
    
    this.closeTriggered = true;
    if (isNON(self.fd)) {
        self.emit('close');
        this.closed = true;
    } else {
        exports.close(self.fd, () => {
            this.closed = true;
            self.emit('close');
        });
        self.fd = null;
    }
}

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end

function flagToString(flag) {
    // Only mess with strings
    if (util.isString(flag)) {
        return flag
    }

    switch (flag) {
        case O_RDONLY: return 'r'
        case O_RDONLY | O_SYNC: return 'sr'
        case O_RDWR: return 'r+'
        case O_RDWR | O_SYNC: return 'sr+'

        case O_TRUNC | O_CREAT | O_WRONLY: return 'w'
        case O_TRUNC | O_CREAT | O_WRONLY | O_EXCL: return 'xw'

        case O_TRUNC | O_CREAT | O_RDWR: return 'w+'
        case O_TRUNC | O_CREAT | O_RDWR | O_EXCL: return 'xw+'

        case O_APPEND | O_CREAT | O_WRONLY: return 'a'
        case O_APPEND | O_CREAT | O_WRONLY | O_EXCL: return 'xa'

        case O_APPEND | O_CREAT | O_RDWR: return 'a+'
        case O_APPEND | O_CREAT | O_RDWR | O_EXCL: return 'xa+'
    }

    throw new Error('Unknown file open flag: ' + flag)
}
