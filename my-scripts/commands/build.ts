import { OutputStreamControl } from '@gongt/stillalive';
import { resolve } from 'path';
import { linuxBuild } from '../build-env/codeblocks/build/build-linux';
import { macBuild } from '../build-env/codeblocks/build/build-mac';
import { windowsBuild } from '../build-env/codeblocks/build/build-windows';
import { extractSourceCodeIfNeed } from '../build-env/codeblocks/build/buildExtractSource';
import {
	cleanupBuildResult,
	cleanupZipFiles,
	downloadBuiltinExtensions,
	downloadElectron,
	yarnInstall,
} from '../build-env/codeblocks/build/common-step';
import { creatingZip } from '../build-env/codeblocks/zip';
import { cleanScreen } from '../build-env/misc/clsUtil';
import { ARCH_RELEASE_ROOT, isMac, isWin, RELEASE_ROOT, VSCODE_ROOT } from '../build-env/misc/constants';
import { calcCompileFolderName, getPackageData, getProductData, rename } from '../build-env/misc/fsUtil';
import { runMain, usePretty, useWriteFileStream, whatIsThis } from '../build-env/misc/myBuildSystem';
import { chdir } from '../build-env/misc/pathUtil';
import { timing } from '../build-env/misc/timeUtil';

whatIsThis(__filename, 'build complete release.');

let output: OutputStreamControl;
runMain(async () => {
	cleanScreen();
	chdir(VSCODE_ROOT);
	
	output = usePretty();
	output.pipe(useWriteFileStream(resolve(RELEASE_ROOT, 'build.log')));
	output.write('starting build...\n');
	
	process.env.BUILDING = 'yes';
	
	const product = await getProductData();
	await getPackageData();
	
	const zipStoreDir = resolve(RELEASE_ROOT, 'release-files');
	
	output.write(`Starting build
	Release Root=${RELEASE_ROOT}
	Product Name=${product.applicationName}
	App Title=${product.nameShort}
	Platform=${isWin? 'windows' : isMac? 'mac os' : 'linux'}
	Storage=${zipStoreDir}

`);
	
	chdir(RELEASE_ROOT);
	const wantDirName = await calcCompileFolderName();
	const wantDirPath = resolve(RELEASE_ROOT, wantDirName);
	await cleanupBuildResult(output, wantDirPath);
	
	await extractSourceCodeIfNeed(output);
	await yarnInstall(output);
	await downloadElectron(output);
	await downloadBuiltinExtensions(output);
	
	const timeBuild = timing();
	output.success('Prepare complete. Start building package. This is really slow.').continue();
	
	let compileResultFolder: string;
	chdir(ARCH_RELEASE_ROOT);
	if (isWin) {
		compileResultFolder = await windowsBuild(output);
	} else if (isMac) {
		compileResultFolder = await macBuild(output);
	} else {
		compileResultFolder = await linuxBuild(output);
	}
	output.success('Package Created.' + timeBuild()).continue();
	
	await rename(compileResultFolder, wantDirPath);
	
	await creatingZip(output);
	
	output.success('complete.');
});
