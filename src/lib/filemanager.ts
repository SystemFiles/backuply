import { mkdir, stat, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { copy, exists, pathExists } from 'fs-extra'
import { BackupRecord, BackupType, Directory, FileData, RecordTable } from '../common/types'
import { MD5 } from '../common/functions'
import { v4 as uuid } from 'uuid'
import { BackupFilesDiscoveryException, IOException } from '../common/exceptions'
import { DatabaseManager } from './database'
import { log } from './logger'

export class FileManager {
	private static instance: FileManager
	private directoriesBuffer: string[] = []
	private filesBuffer: string[] = []
	private constructor() {
		/* Singleton private constructor to prevent use of `new` with this class */
	}

	public static getInstance(): FileManager {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager()
		}

		return FileManager.instance
	}

	public async createDirectory(rootPath: string, directoryName: string): Promise<[string, Error]> {
		const fullPath = `${rootPath}/${directoryName}`
		try {
			if (!await pathExists(fullPath)) {
				return [
					await mkdir(fullPath, { recursive: true, mode: '755' }),
					null
				]
			} else {
				log(`Backup directory, ${rootPath}/${directoryName}, already exists ... skipping create.`)
				return [
					fullPath,
					null
				]
			}
		} catch (err) {
			return [
				null,
				err
			]
		}
	}

	private async _difference(latestFull: BackupRecord) {
		// TODO
	}

	private async _generateBackupTreeFromRoot(root: string): Promise<void> {
		try {
			const dirContents = await readdir(root)
			for (const item of dirContents) {
				const absPath = join(root, item)
				const isDir = (await stat(absPath)).isDirectory()

				if (isDir) {
					// store the directory path in a temporary buffer
					this.directoriesBuffer.push(absPath)
					await this._generateBackupTreeFromRoot(absPath)
				} else {
					// If not directory store in temporary files buffer
					this.filesBuffer.push(absPath)
				}
			}
		} catch (err) {
			throw new BackupFilesDiscoveryException(`Error trying to generate backup tree. Reason: ${err.message}`)
		}
	}

	private async _getFileData(files: string[]): Promise<[FileData[], Error]> {
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
			return [
				filesSums,
				null
			]
		} catch (err) {
			return [
				null,
				err
			]
		}
	}

	private async _getDirectoryData(directories: string[]): Promise<[Directory[], Error]> {
		try {
			const dirDataFormatted: Directory[] = []
			for (const dir of directories) {
				dirDataFormatted.push({
					path: dir,
					deleted: false
				})
			}
			return [
				dirDataFormatted,
				null
			]
		} catch (err) {
			return [
				null,
				err
			]
		}
	}

	public async makeBackup(
		source: string,
		name: string,
		db: DatabaseManager,
		destination = '/tmp',
		useDate = true,
		type: BackupType = BackupType.FULL
	): Promise<(FileData | Error)[]> {
		try {
			const timestamp = new Date().toISOString()
			const generatedBackupName = useDate
				? `${name}-${type.toString().toLowerCase()}-${timestamp.slice(0, 10)}`
				: `${name}`

			if (type === BackupType.FULL) {
				// Full backup
				// Get full list of all directories recursively && Get full list of all files (with absolute paths)
				await this._generateBackupTreeFromRoot(source)
				// Calculate checksums of entire backup file tree (recursively)
				const [
					fileData,
					fileError
				] = await this._getFileData(this.filesBuffer)
				// Create formatted directory data for each directory from root -> leaf
				const [
					dirData,
					dirError
				] = await this._getDirectoryData(this.directoriesBuffer)
				if (fileError || dirError) {
					throw new BackupFilesDiscoveryException(fileError ? fileError.message : dirError.toString())
				}
				// Create backup record to store into the database
				const backupRecord: BackupRecord = {
					id: uuid(),
					name: generatedBackupName,
					type: type,
					created: timestamp,
					directoryList: dirData,
					fileList: fileData
				}
				// Create the FULL backup
				const [
					_,
					createErr
				] = await this.createDirectory(destination, generatedBackupName)
				if (createErr) {
					throw new IOException(`Could not create the backup directory. Aborting... (${createErr.message})`)
				}
				await copy(source, `${destination}/${generatedBackupName}`, {
					overwrite: true,
					preserveTimestamps: true,
					errorOnExist: false
				})
				// Write changes to database entry (including directories & files)
				await db.insert(RecordTable.BACKUPS, backupRecord)
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

			return [
				null,
				null
			]
		} catch (err) {
			return [
				null,
				err
			]
		}
	}
}
