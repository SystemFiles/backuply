import { mkdir, stat, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { copy, pathExists } from 'fs-extra'
import { BackupRecord, BackupType, Directory, FileData, RecordTable } from '../common/types'
import { MD5 } from '../common/functions'
import { v4 as uuid } from 'uuid'
import {
	BackupException,
	BackupFilesDiscoveryException,
	DatabaseReadException,
	IOException
} from '../common/exceptions'
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
				return [ await mkdir(fullPath, { recursive: true, mode: '755' }), null ]
			} else {
				log(`Directory already exists ... skipping create.`)
				return [ fullPath, null ]
			}
		} catch (err) {
			return [ null, err ]
		}
	}

	public clearBuffers(): void {
		this.filesBuffer = []
		this.directoriesBuffer = []
	}

	private _isFileDeleted(file: FileData, compareFiles: FileData[]): boolean {
		return compareFiles.filter((f) => f.fullPath === file.fullPath).length === 0
	}

	private _isDirDeleted(dir: Directory, compareDirs: Directory[]): boolean {
		return compareDirs.filter((d) => d.path === dir.path).length === 0
	}

	private _dirDifference(fullId: string, directories: Directory[]): [Directory[], Error] {
		// Note: We don't have to consider added directories since they will be
		//       automatically handled when merged with the referenced full backup
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const [ fullRecord, error ] = db.findRecordById(fullId)
			if (error) {
				throw new DatabaseReadException(`Failed to find record with ID, ${fullId}.`)
			}
			const deleted: Directory[] = []
			// for any path in old full directory list
			// there should be a path in the new directory list that matches
			// else the path is deleted
			for (const fdir of fullRecord.directoryList) {
				const dmatch = directories.filter((np) => np.path === fdir.path)
				if (dmatch.length === 0) {
					deleted.push({
						path: fdir.path,
						deleted: true
					})
				}
			}
			return [ deleted, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private _fileDifference(fullId: string, files: FileData[]): [FileData[], Error] {
		// Note: We don't have to consider added files since they will be
		//       automatically handled when merged with the referenced full backup
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const [ fullRecord, error ] = db.findRecordById(fullId)
			if (error) {
				throw new DatabaseReadException(`Failed to find record with ID, ${fullId}.`)
			}
			// Search for all matching files (using abs paths)
			const changed: FileData[] = []
			// for any
			for (const ffile of fullRecord.fileList) {
				const match: FileData[] = []
				for (const dfile of files) {
					if (ffile.fullPath === dfile.fullPath) {
						match.push(ffile)
						// Compare checksums of files with same path to determine changed files
						if (ffile.md5sum !== dfile.md5sum) {
							// append list of changed files (in the form of FileData) to return at the end of function
							changed.push(dfile)
						}
					}
				}
				if (match.length === 0) {
					changed.push({
						fullPath: ffile.fullPath,
						byteLength: ffile.byteLength,
						md5sum: ffile.md5sum,
						deleted: true
					})
				}
			}
			return [ changed, null ]
		} catch (err) {
			log(err)
			return [ null, err ]
		}
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

	private async _getTotalByteLengthOfBuffer(): Promise<[number, Error]> {
		try {
			let totalSize = 0
			for (const file of this.filesBuffer) {
				totalSize += (await stat(file)).size
			}

			return [ totalSize, null ]
		} catch (err) {
			return [ null, err ]
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
			return [ filesSums, null ]
		} catch (err) {
			return [ null, err ]
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
			return [ dirDataFormatted, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	public async differentialBackup(
		fullId: string,
		source: string,
		name: string,
		destination = '/tmp',
		useDate = true
	): Promise<[BackupRecord, Error]> {
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const timestamp = new Date().toISOString()
			const generatedBackupName = useDate
				? `${name}-${BackupType.DIFF.toLowerCase()}-${timestamp.slice(0, 10)}`
				: `${name}`
			// Only backup things that have changed (use checksums
			// + verify exist of all directories from full...any
			// not found will be marked as deleted in diff backup)
			// Copy list of changed files to new backup directory
			// TODO
			// Generate backup tree
			await this._generateBackupTreeFromRoot(source)
			// Get file and directory data
			const [ fileData, fileError ] = await this._getFileData(this.filesBuffer)
			const [ dirData, dirError ] = await this._getDirectoryData(this.directoriesBuffer)
			if (fileError || dirError) {
				throw new BackupFilesDiscoveryException(fileError ? fileError.message : dirError.toString())
			}
			// Compare checksum of each file with that of existing file in full backup to see if they are different (note: if one does not exist in the full backup, consider this file changed (added))
			const [ fChanged, fcErr ] = this._fileDifference(fullId, fileData)
			const [ dChanged, dcErr ] = this._dirDifference(fullId, dirData)
			if (fcErr || dcErr) {
				throw new BackupException(
					`Failed to calculate file or directory differences. Reason: ${fcErr ? fcErr.message : dcErr.message}`
				)
			}

			log(`Files changed: ${fChanged.length}`)
			for (const fd of fChanged) {
				log(`${fd.fullPath} - ${fd.deleted}`)
			}

			for (const dd of dChanged) {
				log(`${dd.path} - ${dd.deleted}`)
			}

			return [ null, null ]

			// Check for all directories from full backup (with fs.stat) that they still exist. If not, mark directory as deleted
			// Ensure any files existing in FULL backup and not in this backup changed (will have to trigger remove when merged with full backup at restore time)
			// Store full absolute paths to any changed files in memory (later in database entry)
			// Somehow create tar containing only changed files
			// Write changed files into database entry as list of absolute paths
		} catch (err) {
			return [ null, err ]
		}
	}

	public async fullBackup(
		source: string,
		name: string,
		destination = '/tmp',
		useDate = true
	): Promise<[BackupRecord, Error]> {
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const timestamp = new Date().toISOString()
			const generatedBackupName = useDate
				? `${name}-${BackupType.FULL.toLowerCase()}-${timestamp.slice(0, 10)}`
				: `${name}`

			// Get full list of all directories recursively && Get full list of all files (with absolute paths)
			await this._generateBackupTreeFromRoot(source)
			// Calculate checksums of entire backup file tree (recursively)
			const [ fileData, fileError ] = await this._getFileData(this.filesBuffer)
			// Create formatted directory data for each directory from root -> leaf
			const [ dirData, dirError ] = await this._getDirectoryData(this.directoriesBuffer)
			if (fileError || dirError) {
				throw new BackupFilesDiscoveryException(fileError ? fileError.message : dirError.toString())
			}
			// Create backup record to store into the database
			const [ backupSize, sizeError ] = await this._getTotalByteLengthOfBuffer()
			if (sizeError) {
				throw new BackupException(`Failed to calculate backup size. Reason: ${sizeError.message}`)
			}
			const backupRecord: BackupRecord = {
				id: uuid(),
				name: generatedBackupName,
				type: BackupType.FULL,
				created: timestamp,
				bytelength: backupSize,
				directoryList: dirData,
				fileList: fileData
			}

			// Create the FULL backup
			const [ _, createErr ] = await this.createDirectory(destination, generatedBackupName)
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
			return [ backupRecord, null ]
		} catch (err) {
			return [ null, err ]
		}
	}
}
