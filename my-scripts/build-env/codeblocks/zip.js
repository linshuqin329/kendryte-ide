"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const path_1 = require("path");
const stream_1 = require("stream");
const complex_1 = require("../childprocess/complex");
const constants_1 = require("../misc/constants");
const fsUtil_1 = require("../misc/fsUtil");
const pathUtil_1 = require("../misc/pathUtil");
const streamUtil_1 = require("../misc/streamUtil");
const common_step_1 = require("./build/common-step");
const _7z = constants_1.isWin ? require('7zip')['7z'] : '7z';
const commonArgs = [
    'a',
    '-y',
    '-r',
    '-ssc',
];
if (!constants_1.isWin) {
    commonArgs.push('-mmt3'); // use 3 threads
}
const zipLzma2Args = [
    ...commonArgs,
    '-t7z',
    '-ms=on',
    '-mx8',
    '-m0=lzma2',
    '-md=256m',
    '-mfb=64',
];
if (constants_1.isWin) {
    zipLzma2Args.push('"-sfx7z.sfx"'); // self extraction
}
else {
    zipLzma2Args.push('-sfx7zCon.sfx'); // self extraction
}
const zipDeflateArgs = [
    ...commonArgs,
    '-tzip',
    '-mx6',
];
async function createPosixSfx(output, whatToZip) {
    output.write('creating posix 7z sfx bin...\n');
    const zipFileName = await distFilePath('7z.bin');
    await complex_1.pipeCommandOut(output, _7z, ...zipLzma2Args, '--', zipFileName, whatToZip + '/*');
    await fs_extra_1.chmod(zipFileName, '777');
}
exports.createPosixSfx = createPosixSfx;
async function createWindowsSfx(output, whatToZip) {
    output.write('creating windows 7z sfx exe...\n');
    return complex_1.pipeCommandOut(output, _7z, ...zipLzma2Args, '--', await distFilePath('exe'), whatToZip + '/*');
}
exports.createWindowsSfx = createWindowsSfx;
async function createWindowsZip(output, whatToZip) {
    output.write('creating windows zip simple...\n');
    return complex_1.pipeCommandOut(output, _7z, ...zipDeflateArgs, '--', await distFilePath('zip'), whatToZip + '/*');
}
exports.createWindowsZip = createWindowsZip;
async function calcZipFileName() {
    if (constants_1.isWin) {
        return [await distFilePath('exe'), await distFilePath('zip')];
    }
    else {
        return [await distFilePath('7z.bin')];
    }
}
exports.calcZipFileName = calcZipFileName;
async function un7zip(output, from, to) {
    await fs_extra_1.mkdirp(to);
    pathUtil_1.chdir(to);
    return complex_1.pipeCommandOut(output, _7z, 'x', '-y', '-r', from);
}
exports.un7zip = un7zip;
async function distFilePath(type) {
    const product = await fsUtil_1.getProductData();
    const packageJson = await fsUtil_1.getPackageData();
    const pv = ('' + packageJson.patchVersion).replace(/\./g, '');
    return `release-files/${os_1.platform()}.${product.applicationName}.v${packageJson.version}-${product.quality}.${pv}.${type}`;
}
async function creatingZip(output) {
    const zipStoreDir = path_1.resolve(constants_1.RELEASE_ROOT, 'release-files');
    pathUtil_1.chdir(constants_1.RELEASE_ROOT);
    await common_step_1.cleanupZipFiles(output, zipStoreDir);
    const wantDirName = await fsUtil_1.calcCompileFolderName();
    if (constants_1.isWin) {
        const convert = new class TransformEncode extends stream_1.Transform {
            constructor() {
                super(...arguments);
                this.noEnd = true;
            }
            _transform(chunk, encoding, callback) {
                const str = chunk.toString('ascii');
                this.push(str, 'utf8');
                callback();
            }
        };
        convert.pipe(output, streamUtil_1.endArg(output));
        await createWindowsSfx(convert, wantDirName);
        await createWindowsZip(convert, wantDirName);
        convert.end();
    }
    else {
        await createPosixSfx(output, wantDirName);
    }
}
exports.creatingZip = creatingZip;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemlwLmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJidWlsZC1lbnYvY29kZWJsb2Nrcy96aXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBeUM7QUFDekMsMkJBQThCO0FBQzlCLCtCQUErQjtBQUMvQixtQ0FBc0Q7QUFDdEQscURBQXlEO0FBQ3pELGlEQUF3RDtBQUN4RCwyQ0FBdUY7QUFDdkYsK0NBQXlDO0FBQ3pDLG1EQUE0QztBQUM1QyxxREFBc0Q7QUFFdEQsTUFBTSxHQUFHLEdBQUcsaUJBQUssQ0FBQSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFFaEQsTUFBTSxVQUFVLEdBQUc7SUFDbEIsR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osTUFBTTtDQUNOLENBQUM7QUFDRixJQUFJLENBQUMsaUJBQUssRUFBRTtJQUNYLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0I7Q0FDMUM7QUFDRCxNQUFNLFlBQVksR0FBRztJQUNwQixHQUFHLFVBQVU7SUFDYixNQUFNO0lBQ04sUUFBUTtJQUNSLE1BQU07SUFDTixXQUFXO0lBQ1gsVUFBVTtJQUNWLFNBQVM7Q0FDVCxDQUFDO0FBQ0YsSUFBSSxpQkFBSyxFQUFFO0lBQ1YsWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtDQUNyRDtLQUFNO0lBQ04sWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtDQUN0RDtBQUVELE1BQU0sY0FBYyxHQUFHO0lBQ3RCLEdBQUcsVUFBVTtJQUNiLE9BQU87SUFDUCxNQUFNO0NBQ04sQ0FBQztBQUVLLEtBQUssVUFBVSxjQUFjLENBQUMsTUFBNkIsRUFBRSxTQUFpQjtJQUNwRixNQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7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