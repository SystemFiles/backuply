import figlet from 'figlet'
import { MakeDirectoryOptions } from 'fs'
import { pathExists } from 'fs-extra'
import { chown, readdir, mkdir } from 'fs/promises'
import { userInfo } from 'os'
import { join } from 'path/posix'
import { DatabaseManager } from '../lib/database.js'
import { log } from '../lib/logger.js'
import { PACKAGE_NAME } from './constants.js'
import { BackupRecord, BackupType, Directory } from './types.js'

// Pure getAppDataPath
export function getAppDataPath(): string {
	switch (process.platform) {
		case 'win32':
			return `%appdata%/localLow/${PACKAGE_NAME}`
		case 'linux':
			return `/home/${userInfo().username}/.config/${PACKAGE_NAME}`
		case 'darwin':
			// Mac OSX
			return `/Users/${userInfo().username}/Library/Application Support/${PACKAGE_NAME}`
		default:
			throw new Error(`Failed to determine appropriate AppData path for this OS.`)
	}
}

// App Say
export function sayHello(): void {
	console.clear()
	console.log(`${figlet.textSync(PACKAGE_NAME, { horizontalLayout: 'full' })}\n\n`)
}

// Record display (pretty print)
export function ppRecord(record: BackupRecord): void {
	const tableData = [
		{ attribute: 'id', value: record.id },
		{ attribute: 'name', value: record.name },
		{ attribute: 'created', value: record.created },
		{ attribute: 'type', value: record.type.toString() },
		{ attribute: 'reference_backup', value: record.basedOn },
		{ attribute: 'size', value: `${Math.round(record.bytelength / 1024 / 1024)} MB` },
		{ attribute: 'source', value: record.sourceRoot },
		{ attribute: 'location', value: record.destRoot }
	]
	console.table(tableData)
}

// Used to sort directories by depth (ascending order)
export function compareByDepth(dirA: Directory, dirB: Directory): number {
	if (dirA.depth < dirB.depth) return -1
	if (dirA.depth > dirB.depth) return 1
	return 0
}

// Used to sort backup records by name (alphabetical, ascending)
export function compareRecordsByCreationTime(recordA: BackupRecord, recordB: BackupRecord): number {
	const dateA = new Date(recordA.created)
	const dateB = new Date(recordB.created)

	if (dateA < dateB) return 1
	if (dateA > dateB) return -1
	return 0
}

// Translate name to uuid
export function getLatestBackupByName(name: string, type?: BackupType): [BackupRecord, Error] {
	try {
		const db = DatabaseManager.getInstance()
		const [ res, err ] = db.findRecordsByName(name, type)
		if (err || res.length === 0) {
			throw new Error(`Failed to get any records for the given name, ${name}`)
		}
		return [ res.sort(compareRecordsByCreationTime).shift(), null ]
	} catch (err) {
		return [ null, err ]
	}
}

// Create a directory with optional permissions modes
export async function createDirectory(
	rootPath: string,
	directoryName: string,
	options: MakeDirectoryOptions = { mode: '0755' },
	ownership?: { uid: number; gid: number }
): Promise<[string, Error]> {
	try {
		const fullPath = join(rootPath, directoryName)
		if (!await pathExists(fullPath)) {
			await mkdir(fullPath, { recursive: false, ...options })

			// Append ownership information to directory
			if (ownership) await chown(fullPath, ownership.uid, ownership.gid)
			return [ fullPath, null ]
		} else {
			log(`Directory already exists ... skipping create.`)
			return [ fullPath, null ]
		}
	} catch (err) {
		if (!err.message.includes('EPERM')) {
			log(`ERROR creating directory: ${err}`)
			return [ null, err ]
		}
	}
}

// Check whether a given directory is empty or not
export async function isDirEmpty(path: string): Promise<boolean> {
	return readdir(path).then((files) => {
		return files.length === 0
	})
}
