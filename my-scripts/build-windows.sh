#!/usr/bin/env bash

############# prepare
set -e
cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
source fn.sh
source common.sh "$@"

if [ ! -e "${NODEJS}" ]; then
	bash ./prepare-release.sh

	source common.sh "$@"
	if [ ! -e "${NODEJS}" ]; then
		die "没有运行prepare-release.sh，请按照文档执行。
		https://doc.b-bug.org/pages/viewpage.action?pageId=4228204"
	fi
fi

cd ..
source ./scripts/env.sh

source ./my-scripts/build-env/build-common-source.sh

############# define const to create filenames
pushd "${VSCODE_ROOT}" &>/dev/null
BUILD_VERSION=$(node -p "require(\"./package.json\").version")
BUILD_NAME=$(node -p "require(\"./product.json\").applicationName")
BUILD_QUALITY=$(node -p "require(\"./product.json\").quality")
BUILD_COMMIT=$(node -p "require(\"./product.json\").commit")
popd &>/dev/null

############# download electron executable
step "Get Electron" \
	npm run gulp -- "electron-$ARCH"

############# install production deps
step "Install distro dependencies" \
	node build/tfs/common/installDistro.js

############# build internal extensions
step "Build extensions" \
	node build/lib/builtInExtensions.js

############# minify source code
step "Build minified" \
	npm run gulp -- "vscode-win32-$ARCH-min"

############# copy updater
step "copy inno updater" \
	npm run gulp -- "vscode-win32-$ARCH-copy-inno-updater"

############# create zip
TARBALL_FILENAME="${BUILD_NAME}-${BUILD_VERSION}.${ARCH}.exe"
TARBALL_PATH="${RELEASE_ROOT}/${TARBALL_FILENAME}"

step "Create archive folder" \
	npm run gulp -- "vscode-win32-${ARCH}-archive"

RESULT="${RELEASE_ROOT}/VSCode-win32-${ARCH}"

step "Compile custom extensions" \
	bash my-scripts/build-env/custom-extensions-build-all.sh "${RESULT}"

step "Create archive file" \
	7za a -y -sfx "${TARBALL_PATH}" "${RESULT}"

echo "Build success, the result file is ${TARBALL_PATH}"