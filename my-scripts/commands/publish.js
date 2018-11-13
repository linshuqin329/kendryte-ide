"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = require("aws-sdk");
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const path_1 = require("path");
const url_1 = require("url");
const util_1 = require("util");
const complex_1 = require("../build-env/childprocess/complex");
const downloadFile_1 = require("../build-env/codeblocks/downloadFile");
const zip_1 = require("../build-env/codeblocks/zip");
const constants_1 = require("../build-env/misc/constants");
const fsUtil_1 = require("../build-env/misc/fsUtil");
const globalOutput_1 = require("../build-env/misc/globalOutput");
const myBuildSystem_1 = require("../build-env/misc/myBuildSystem");
const pathUtil_1 = require("../build-env/misc/pathUtil");
const streamUtil_1 = require("../build-env/misc/streamUtil");
const timeUtil_1 = require("../build-env/misc/timeUtil");
const usePretty_1 = require("../build-env/misc/usePretty");
const { compress } = require('targz');
const { loadCredentialsFromEnv, loadCredentialsFromIniFile, loadRegionFromEnv, loadRegionFromIniFile } = require('awscred');
require('awscred').credentialsCallChain = [loadCredentialsFromEnv, loadCredentialsFromIniFile];
require('awscred').regionCallChain = [loadRegionFromEnv, loadRegionFromIniFile];
const loadCredentialsAndRegion = util_1.promisify(require('awscred').loadCredentialsAndRegion);
const OBJKEY_IDE_JSON = 'release/IDE.json';
myBuildSystem_1.runMain(async () => {
    const output = usePretty_1.usePretty('publish');
    globalOutput_1.globalInterruptLog('HTTP_PROXY=%s', process.env.HTTP_PROXY);
    const compiledResult = path_1.resolve(constants_1.RELEASE_ROOT, await fsUtil_1.calcCompileFolderName());
    const targetZipFiles = (await zip_1.calcZipFileName()).map(fn => path_1.resolve(constants_1.RELEASE_ROOT, fn));
    if (await fsUtil_1.isExists(compiledResult)) {
        globalOutput_1.globalInterruptLog('read data from ' + compiledResult);
    }
    else {
        globalOutput_1.globalInterruptLog('read data from ' + targetZipFiles[0]);
        await zip_1.un7zip(output, targetZipFiles[0], constants_1.RELEASE_ROOT);
    }
    const prodData = await fsUtil_1.getProductData(path_1.resolve(compiledResult, 'resources/app'));
    const packData = await fsUtil_1.getPackageData(path_1.resolve(compiledResult, 'resources/app'));
    const awsConfig = await loadCred(output, process.env.HOME) || await loadCred(output, process.env.ORIGINAL_HOME);
    if (!awsConfig) {
        throw new Error('Not able to load AWS config. see https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/setup-credentials.html');
    }
    const s3 = new aws_sdk_1.S3({
        ...awsConfig,
        logger: {
            write: output.write.bind(output),
            log(...messages) {
                output.writeln(util_1.format(...messages));
            },
        },
    });
    const Bucket = prodData.applicationName;
    const patchVersionStr = packData.patchVersion.toString();
    output.writeln('loading IDE.json from AWS.');
    const json = await s3.getObject({ Bucket, Key: OBJKEY_IDE_JSON })
        .createReadStream()
        .pipe(new streamUtil_1.CollectingStream(), { end: true })
        .promise();
    const ideState = JSON.parse(json);
    if (!ideState.patches) {
        ideState.patches = [];
    }
    let lastPatch = (ideState.patches || []).find((item) => {
        return (item.version || '').toString() === patchVersionStr;
    }) || {};
    output.writeln(`remote version=${ideState.version} patch=${lastPatch.version || 'Null'}`);
    output.writeln(`local  version=${packData.version} patch=${patchVersionStr}`);
    if (ideState.version === packData.version || ideState.version === `${packData.version}-${prodData.quality}`) {
        output.writeln('ide version has not change: ' + ideState.version);
        const alreadyPost = lastPatch.version === patchVersionStr && lastPatch[platformKey()];
        if (alreadyPost) {
            output.success('already published same version');
            await timeUtil_1.timeout(1000);
        }
        else {
            await publishSubVersion();
        }
    }
    else {
        await publishMainVersion();
    }
    async function publishSubVersion() {
        output.writeln('publishing sub version: ' + packData.patchVersion);
        if (!lastPatch.version) { // no current patch
            lastPatch.version = patchVersionStr;
            ideState.patches.push(lastPatch);
        }
        const oldPackageAt = url_1.resolve(bucketUrl(Bucket, OBJKEY_IDE_JSON), ideState[platformKey()]);
        const oldPackageLocal = path_1.resolve(constants_1.RELEASE_ROOT, 'create-patch', 'old.7z');
        output.writeln('download old version from: ' + oldPackageAt);
        await downloadFile_1.downloadFile(output, oldPackageAt, oldPackageLocal);
        output.success('downloaded old version.');
        output.writeln('extract it');
        await zip_1.un7zip(output, oldPackageLocal, path_1.resolve(constants_1.RELEASE_ROOT, 'create-patch', 'prev-version'));
        output.success('extract complete.');
        for (const file of targetZipFiles) {
            ideState[platformKey()] = await new Promise((resolve, reject) => {
                s3.upload({ ACL: 'public-read', Bucket, Key: 'release/download/' + path_1.basename(file), Body: fs_1.createReadStream(file) }, { partSize: 10 * 1024 * 1024, queueSize: 4 }, (err, data) => err ? reject(err) : resolve(data.Location));
            });
        }
        const createdPatchTarball = await createPatch(output, path_1.resolve(constants_1.RELEASE_ROOT, 'create-patch', 'prev-version'), compiledResult);
        const patchUrl = await new Promise((resolve, reject) => {
            s3.upload({ ACL: 'public-read', Bucket, Key: 'release/patches/' + path_1.basename(createdPatchTarball) }, { partSize: 10 * 1024 * 1024, queueSize: 4 }, (err, data) => err ? reject(err) : resolve(data.Location));
        });
        lastPatch[platformKey()] = {
            generic: patchUrl,
        };
    }
    async function publishMainVersion() {
        output.writeln('publishing main version: ' + packData.version);
    }
    output.writeln('Done.');
});
async function createPatch(output, baseVer, newVer) {
    baseVer = path_1.resolve(baseVer, 'resources/app');
    newVer = path_1.resolve(newVer, 'resources/app');
    pathUtil_1.chdir(baseVer);
    await complex_1.pipeCommandOut(output, 'git', 'init', '.');
    await complex_1.pipeCommandOut(output.screen, 'git', 'add', '.');
    await complex_1.pipeCommandOut(output.screen, 'git', 'commit', '-m', 'init');
    await fs_extra_1.copy(newVer, baseVer);
    await complex_1.pipeCommandOut(output.screen, 'git', 'commit', '-m', 'init');
    await complex_1.pipeCommandOut(output.screen, 'git', 'add', '.');
    const fileList = await complex_1.getOutputCommand('git', 'diff', '--name-only', 'HEAD');
    const realFileList = fileList.split('\n').filter((e) => {
        return e && !e.startsWith('node_modules');
    });
    const packData = await fsUtil_1.getPackageData(baseVer);
    const patchFile = path_1.resolve(constants_1.RELEASE_ROOT, 'release-files', `${packData.version}_${packData.patchVersion}_${os_1.platform()}.tar.gz`);
    const config = {
        src: baseVer,
        dest: patchFile,
        tar: {
            entries: realFileList,
            dmode: 493,
            fmode: 420,
            strict: false,
        },
        gz: {
            level: 6,
            memLevel: 6,
        },
    };
    await new Promise((resolve, reject) => {
        const wrappedCallback = (err) => err ? reject(err) : resolve();
        compress(config, wrappedCallback);
    });
    return patchFile;
}
function platformKey() {
    if (constants_1.isWin) {
        return 'windows';
    }
    else if (constants_1.isMac) {
        return 'mac';
    }
    else {
        return 'linux';
    }
}
async function loadCred(output, home) {
    output.writeln('try load aws key from ' + home);
    const saveHome = process.env.HOME;
    process.env.HOME = home;
    const p = loadCredentialsAndRegion();
    process.env.HOME = saveHome;
    return p.then((cfg) => {
        if (cfg) {
            output.success('success load config from ' + home);
        }
        return cfg;
    }, () => {
        output.writeln('not able to load.');
        return null;
    });
}
function bucketUrl(Bucket, Key) {
    return `https://s3.cn-northwest-1.amazonaws.com.cn/${Bucket}/${Key}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGlzaC5qcyIsInNvdXJjZVJvb3QiOiIuLyIsInNvdXJjZXMiOlsiY29tbWFuZHMvcHVibGlzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHFDQUE2QjtBQUU3QiwyQkFBc0M7QUFDdEMsdUNBQWdDO0FBQ2hDLDJCQUE4QjtBQUM5QiwrQkFBeUM7QUFDekMsNkJBQTRDO0FBQzVDLCtCQUF5QztBQUN6QywrREFBcUY7QUFDckYsdUVBQW9FO0FBQ3BFLHFEQUFzRTtBQUN0RSwyREFBeUU7QUFDekUscURBQTJHO0FBQzNHLGlFQUFvRTtBQUNwRSxtRUFBMEQ7QUFDMUQseURBQW1EO0FBQ25ELDZEQUFnRTtBQUNoRSx5REFBcUQ7QUFDckQsMkRBQXdEO0FBR3hELE1BQU0sRUFBQyxRQUFRLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFcEMsTUFBTSxFQUFDLHNCQUFzQixFQUFFLDBCQUEwQixFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzFILE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLHNCQUFzQixFQUFFLDBCQUEwQixDQUFDLENBQUM7QUFDL0YsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxDQUFDLGlCQUFpQixFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDaEYsTUFBTSx3QkFBd0IsR0FBRyxnQkFBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRXhGLE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDO0FBRTNDLHVCQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7SUFDbEIsTUFBTSxNQUFNLEdBQUcscUJBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVwQyxpQ0FBa0IsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUU1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