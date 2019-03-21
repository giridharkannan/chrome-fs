exports.catchWrapper = (t, errCode, errMsg, actualFun, ...args) => {
    try {
        actualFun(...args);
        t.notOk(false, "Expected exception");
    } catch (err) {
        t.ok(err, errMsg);
        t.same(err.code, errCode, errMsg);
    }
}