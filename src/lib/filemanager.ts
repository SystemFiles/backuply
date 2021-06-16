import { mkdir, stat, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { BackupRecord, BackupType, Directory, FileData, RecordTable } from '../common/types'
import { MD5 } from '../common/functions'
import { v4 as uuid } from 'uuid'
import { BackupFilesDiscoveryException, IOException } from '../common/exceptions'
import { DatabaseManager } from './database'

export class FileManager {
	private static instance: FileManager
	private directoriesBuffer: string[]
	private filesBuffer: string[]
	private constructor() {
		/* Singleton private constructor to prevent use of `new` with this class */
	}

	public static getInstance(): FileManager {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager()
		}

		return FileManager.instance
	}

	public async createDirectory(rootPath: string, directoryName: string): Promise<string> {
		const fullPath = `${rootPath}/${directoryName}`

		try {
			if (!await stat(fullPath)) {
				return mkdir(fullPath, { recursive: true, mode: '755' })
			} else {
				console.log(`Backup directory, ${rootPath}/${directoryName}, already exists ... skipping create.`)
				return fullPath
			}
		} catch (err) {
			throw new Error(err)
		}
	}

	private async _difference(latestFull: BackupRecord) {
		// TODO
	}

	private async _generateBackupTreeFromRoot(root: string): Promise<void> {
		const dirContents = await readdir(root)
		dirContents.forEach((item) => {
			const absPath = join(root, item)
			const isDir = stat(absPath).then((info) => info.isDirectory())

			if (isDir) {
				// store the directory path in a temporary buffer
				this.directoriesBuffer.push(absPath)
				return this._generateBackupTreeFromRoot(absPath)
			}
			// If not directory store in temporary files buffer
			return this.filesBuffer.push(absPath)
		})
	}

	private async _getFileData(files: string[]): Promise<{ data: FileData[]; error: Error }> {
		try {
			const filesSums: FileData[] = []
			for (const file of files) {
				const buffer = await readFile(file)
				filesSums.push({
					fullPath: file,
					byteLength: buffer.byteLength,
					md5sum: MD5(buffer.toString()),
					deleted: false
				})
			}
			return { data: filesSums, error: null }
		} catch (err) {
			return { data: null, error: err }
		}
	}

	private async _getDirectoryData(directories: string[]): Promise<{ data: Directory[]; error: Error }> {
		const dirDataFormatted: Directory[] = []
		for (const dir in directories) {
			dirDataFormatted.push({
				path: dir,
				deleted: false
			})
		}

		return { data: dirDataFormatted, error: null }
	}

	public async makeBackup(
		source: string,
		name: string,
		destination = '/tmp',
		useDate = true,
		type: BackupType = BackupType.FULL,
		db: DatabaseManager
	): Promise<FileData> {
		try {
			const generatedBackupName = useDate
				? `${destination}/${name}-${type.toString().toLowerCase()}-${new Date().toISOString()}`
				: `${destination}/${name}`

			if (type === BackupType.FULL) {
				// Full backup
				// Get full list of all directories recursively && Get full list of all files (with absolute paths)
				await this._generateBackupTreeFromRoot(source)
				// Calculate checksums of entire backup file tree (recursively)
				const fileData = await this._getFileData(this.filesBuffer)
				// Create formatted directory data for each directory from root -> leaf
				const dirData = await this._getDirectoryData(this.directoriesBuffer)
				if (fileData.error || dirData.error) {
					throw new BackupFilesDiscoveryException(fileData.error ? fileData.error.message : dirData.error.message)
				}
				// Create backup record to store into the database
				const backupRecord: BackupRecord = {
					id: uuid(),
					name: generatedBackupName,
					type: type,
					date: new Date().toISOString(),
					directoryList: dirData.data,
					fileList: fileData.data
				}
				// Store checksums with absolute paths to files (db entry after operation completed successfully)
				await db.insert(RecordTable.BACKUPS, backupRecord)
				// Create the FULL backup
				// Write changes to database entry (including directories & files)
				// Done
			} else {
				// Differential backup
				// TODO
				// Calculate checksum of entire backup file tree (for all files)
				// Check for all directories from full backup (with fs.stat) that they still exist. If not, mark directory as deleted
				// Compare checksum of each file with that of existing file in full backup to see if they are different (note: if one does not exist in the full backup, consider this file changed (added))
				// Ensure any files existing in FULL backup and not in this backup changed (will have to trigger remove when merged with full backup at restore time)
				// Store full absolute paths to any changed files in memory (later in database entry)
				// Somehow create tar containing only changed files
				// Write changed files into database entry as list of absolute paths
			}

			return null
		} catch (err) {
			throw new Error(err)
		}
	}
}
