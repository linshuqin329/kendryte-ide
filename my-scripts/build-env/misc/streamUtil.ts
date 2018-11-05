import { resolve } from 'path';
import { Transform, Writable } from 'stream';
import { VSCODE_ROOT } from './constants';
import { yarnPackageDir } from './pathUtil';

export class CollectingStream extends Writable {
	private buffer = '';
	
	_write(chunk: Buffer, encoding: string, callback: (error?: Error|null) => void): void {
		if (!encoding) {
			encoding = 'utf8';
		} else if (encoding === 'buffer') {
			encoding = 'utf8';
		}
		this.buffer += chunk.toString(encoding);
		callback();
	}
	
	getOutput() {
		return this.buffer;
	}
}

export class BlackHoleStream extends Writable {
	_write(chunk: Buffer, encoding: string, callback: (error?: Error|null) => void): void {
		callback();
	}
}

function escapeRegExpCharacters(value: string): string {
	return value.replace(/[\-\\\{\}\*\+\?\|\^\$\.\[\]\(\)\#]/g, '\\$&');
}

const winSep = /\\/g;
const posixSep = '/';

const SOURCE_ROOT = resolve(VSCODE_ROOT, 'src').replace(winSep, posixSep);
const MODULES_ROOT1 = resolve(VSCODE_ROOT, 'node_modules').replace(winSep, posixSep);
const MODULES_ROOT2 = resolve(yarnPackageDir('devDependencies'), 'node_modules').replace(winSep, posixSep);

const toReplaceRoot = new RegExp(escapeRegExpCharacters(SOURCE_ROOT), 'g');
const toReplaceModule1 = new RegExp(escapeRegExpCharacters(MODULES_ROOT1), 'g');
const toReplaceModule2 = new RegExp(escapeRegExpCharacters(MODULES_ROOT2), 'g');

const toReplaceStart = /Starting (?:\x1B\[[\d;]+m)?compilation/mg;

export class TypescriptCompileOutputStream extends Transform {
	private passFirst = false;
	
	_transform(buff: Buffer, encoding: string, callback: Function) {
		if (!encoding) {
			encoding = 'utf8';
		} else if (encoding === 'buffer') {
			encoding = 'utf8';
		}
		let str = buff.toString(encoding);
		str = str.replace(toReplaceStart, (m0) => {
			if (this.passFirst) {
				return '\r\x1Bc' + m0;
			}
			this.passFirst = true;
			return m0;
		});
		str = str.replace(toReplaceModule1, '[NM]');
		str = str.replace(toReplaceModule2, '[NM]');
		str = str.replace(toReplaceRoot, '.');
		this.push(str, encoding);
		callback();
	}
}