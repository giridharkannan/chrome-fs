window = typeof window === "undefined" ? self : window;
let tape = require('tape');
tape.onFailure((err) => {
    if(typeof err !== "undefined") console.error(err);
    else console.error('fail');
})
let path = require('path');
let fs = require('../../chrome');


rmDir = function (dirPath) {
    let files = [];
    try { 
        files = fs.readdirSync(dirPath);
    } catch (e) { 
        return; 
    }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = path.join(dirPath,  files[i]);
            if (fs.statSync(filePath).isFile()) {
                console.log('Going to delete '+filePath);
                fs.unlinkSync(filePath);
            }
            else
                rmDir(filePath);
        }
    if(dirPath !== '/') {
        console.log('Going to delete '+dirPath);
        fs.rmdirSync(dirPath);
    }
}
if(typeof DedicatedWorkerGlobalScope !== "undefined") rmDir('/');

tape.onFinish(() => {
    require('../simple/test-fs-stat')
    require('../simple/test-fs-exists')
    require('../simple/test-fs-write-file')
    require('../simple/test-fs-append-file')
    require('../simple/test-fs-mkdir')
    require('../simple/test-fs-readdir')
    require('../simple/test-fs-write')
    require('../simple/test-fs-write-buffer')
    require('../simple/test-fs-read')
    require('../simple/test-fs-read-buffer')
    require('../simple/test-fs-read-stream-fd')
    require('../simple/test-fs-read-stream')
    require('../simple/test-fs-empty-read-stream')
    require('../libs/mkdirp-test')
})

require('../dat-test/mkdir')
require('../dat-test/rmdir')
require('../dat-test/write-stream')
require('../dat-test/read-stream')
require('../dat-test/append-file')
require('../dat-test/close')
require('../dat-test/exists')
require('../dat-test/open')
require('../dat-test/read')
require('../dat-test/readdir')
require('../dat-test/rename')
require('../dat-test/read-file')
require('../dat-test/unlink')
require('../dat-test/truncate')
require('../dat-test/ftruncate')
require('../dat-test/write-file')
require('../dat-test/write')
require('../dat-test/fstat')
require('../libs/https-test.js')

// UI integration

if (typeof DedicatedWorkerGlobalScope === "undefined") {
    var chooseFileButton = document.querySelector('#choose_file')
    var accepts = [{
        mimeTypes: ['text/*'],
        extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']
    }]

    chooseFileButton.addEventListener('click', function (e) {
        chrome.fileSystem.chooseEntry({ type: 'openFile', accepts: accepts }, function (theEntry) { // eslint-disable-line
            if (!theEntry) {
                document.querySelector('#textfileoutput').innerHTML = 'No file selected.'
                return
            }
            fs.open(theEntry, 'r', function (err, fd) {
                if (err) {
                    document.querySelector('#textfileoutput').innerHTML = err.toString()
                }
                var b = new Buffer(1024)
                fs.read(fd, b, 0, 11, null, function (err, read) {
                    if (err) {
                        document.querySelector('#textfileoutput').innerHTML = err.toString()
                    }
                    document.querySelector('#textfileoutput').innerHTML = 'First 11 chars are: ' + b.slice(0, 11).toString()
                })
            })
        })
    })
}
