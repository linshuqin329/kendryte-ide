"use strict";
/* No use any node_modules deps */
Object.defineProperty(exports, "__esModule", { value: true });
const stillalive_1 = require("@gongt/stillalive");
const fs_1 = require("fs");
const path_1 = require("path");
const disposeList = [];
function mainDispose(dispose) {
    disposeList.push(dispose);
}
exports.mainDispose = mainDispose;
let finalPromise = new Promise((resolve, reject) => {
    setImmediate(resolve);
});
function wit() {
    return process.argv.includes('--what-is-this');
}
function helpTip(cmd, msg) {
    console.log('\x1B[48;5;0;1m * \x1B[38;5;14m%s\x1B[0;48;5;0m - %s.', cmd, msg);
}
exports.helpTip = helpTip;
function whatIsThis(self, title) {
    if (wit()) {
        helpTip(path_1.basename(self, '.js'), title);
    }
}
exports.whatIsThis = whatIsThis;
function runMain(main) {
    if (wit()) {
        return;
    }
    const p = finalPromise = finalPromise.then(main);
    p.then(() => {
        if (finalPromise !== p) {
            return;
        }
        disposeList.forEach((cb) => {
            cb();
        });
    }, (e) => {
        if (e.__programError) {
            console.error('\n\n\x1B[38;5;9mCommand Failed:\n\t%s\x1B[0m\n  Working Directory: %s\n  Program is:\n%s', e.message, e.__cwd, e.__program.replace(/^/g, '    '));
        }
        else {
            console.error('\n\n\x1B[38;5;9mCommand Failed:\n\t%s\x1B[0m', e.stack);
        }
        disposeList.forEach((cb) => {
            cb(e);
        });
    }).then(() => {
        if (finalPromise !== p) {
            return;
        }
        process.exit(0);
    }, () => {
        process.exit(1);
    });
}
exports.runMain = runMain;
function usePretty(opts) {
    const stream = stillalive_1.startWorking();
    Object.assign(stream, { noEnd: true });
    mainDispose((error) => {
        if (error) {
            stream.fail(error.message);
        }
        stream.end();
    });
    return stream;
}
exports.usePretty = usePretty;
function useWriteFileStream(file) {
    const fd = fs_1.openSync(file, 'w');
    fs_1.ftruncateSync(fd);
    const stream = fs_1.createWriteStream(file, { encoding: 'utf8', fd });
    mainDispose((error) => {
        stream.end();
        fs_1.closeSync(fd);
    });
    return stream;
}
exports.useWriteFileStream = useWriteFileStream;
function readFileStream(file) {
    const fd = fs_1.openSync(file, 'r+');
    const stream = fs_1.createReadStream(file, { encoding: 'utf8', fd });
    mainDispose((error) => {
        stream.close();
        fs_1.closeSync(fd);
    });
    return stream;
}
exports.readFileStream = readFileStream;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlCdWlsZFN5c3RlbS5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsiYnVpbGQtZW52L21pc2MvbXlCdWlsZFN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDOztBQUVsQyxrREFBaUY7QUFDakYsMkJBQXNIO0FBQ3RILCtCQUFnQztBQU1oQyxNQUFNLFdBQVcsR0FBc0IsRUFBRSxDQUFDO0FBRTFDLFNBQWdCLFdBQVcsQ0FBQyxPQUF3QjtJQUNuRCxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFGRCxrQ0FFQztBQUVELElBQUksWUFBWSxHQUFrQixJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUNqRSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLEdBQUc7SUFDWCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVELFNBQWdCLE9BQU8sQ0FBQyxHQUFXLEVBQUUsR0FBVztJQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMvRSxDQUFDO0FBRkQsMEJBRUM7QUFFRCxTQUFnQixVQUFVLENBQUMsSUFBWSxFQUFFLEtBQWE7SUFDckQsSUFBSSxHQUFHLEVBQUUsRUFBRTtRQUNWLE9BQU8sQ0FBQyxlQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQ3RDO0FBQ0YsQ0FBQztBQUpELGdDQUlDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLElBQXlCO0lBQ2hELElBQUksR0FBRyxFQUFFLEVBQUU7UUFDVixPQUFPO0tBQ1A7SUFDRCxNQUFNLENBQUMsR0FBRyxZQUFZLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJ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