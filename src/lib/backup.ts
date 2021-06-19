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

export class BackupManager {
	private static instance: BackupManager
	private directoriesBuffer: string[] = []
	private filesBuffer: string[] = []
	private constructor() {
		/* Private constructor to prevent use of `new` with this class */
	}

	public static getInstance(): BackupManager {
		if (!BackupManager.instance) {
			BackupManager.instance = new BackupManager()
		}

		return BackupManager.instance
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

	private async _dirDifference(fullId: string, directories: Directory[]): Promise<[Directory[], Error]> {
		// Note: We don't have to consider added directories since they will be
		//       automatically handled when merged with the referenced full backup
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const [ fullRecord, error ] = db.findRecordById(fullId)
			if (error) {
				throw new DatabaseReadException(`Failed to find record with ID, ${fullId}.`)
			}
			const deleted: Directory[] = []
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

	private async _fileDifference(fullId: string, files: FileData[]): Promise<[FileData[], Error]> {
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
			// Get changed files + mark any deleted files
			for (const ffile of fullRecord.fileList) {
				const match: FileData[] = []
				for (const dfile of files) {
					if (ffile.fullPath === dfile.fullPath) {
						match.push(ffile) // Exists on both backups
						// Compare checksums of files with same path to determine changed files
						if (ffile.md5sum !== dfile.md5sum) {
							// append list of changed files (in the form of FileData) to return at the end of function
							changed.push(dfile) // Modified
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
			// Find any added files and also add them to changed
			for (const dfile of files) {
				const match = fullRecord.fileList.filter((f) => f.fullPath === dfile.fullPath).length !== 0
				if (!match) {
					changed.push(dfile)
				}
			}
			return [ changed, null ]
		} catch (err) {
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

	private _getTotalByteLengthOfBackup(files: FileData[]): [number, Error] {
		try {
			let totalSize = 0
			for (const f of files) {
				if (!f.deleted) totalSize += f.byteLength
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

	private async _copySelectFilesAsync(
		sourceParent: string,
		files: FileData[],
		destParent: string,
		excludeDirs: Directory[] = []
	): Promise<Error> {
		try {
			const copyPromises: Promise<void>[] = []
			for (const f of files) {
				let skip = false
				for (const d of excludeDirs) {
					skip = f.fullPath.startsWith(d.path)
				}
				if (!skip && !f.deleted) {
					copyPromises.push(
						copy(f.fullPath, join(destParent, f.fullPath.split(sourceParent)[1]), {
							overwrite: true,
							preserveTimestamps: true,
							errorOnExist: false
						})
					)
				}
			}
			await Promise.all(copyPromises)
		} catch (err) {
			return err
		}
		return
	}

	public async diffBackup(
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

			// Extract file and directories from backup source
			await this._generateBackupTreeFromRoot(source)
			// Get file and directory individual metadata
			const [ fileData, fileError ] = await this._getFileData(this.filesBuffer)
			const [ dirData, dirError ] = await this._getDirectoryData(this.directoriesBuffer)
			if (fileError || dirError) {
				throw new BackupFilesDiscoveryException(fileError ? fileError.message : dirError.toString())
			}
			// Compare referenced full backup with latest diff backup data to determine deltas to store
			const [ fChanged, fcErr ] = await this._fileDifference(fullId, fileData)
			const [ dChanged, dcErr ] = await this._dirDifference(fullId, dirData)
			if (fcErr || dcErr) {
				throw new BackupException(
					`Failed to calculate file or directory differences. Reason: ${fcErr ? fcErr.message : dcErr.message}`
				)
			}

			// Make the backup directory && Copy all changed files (maintaining path and timestamps)
			const [ _, createErr ] = await this.createDirectory(destination, generatedBackupName)
			if (createErr) {
				throw new IOException(`Could not create the backup directory. Aborting... (${createErr.message})`)
			}
			await this._copySelectFilesAsync(
				source,
				fChanged,
				join(destination, generatedBackupName),
				dChanged.filter((d) => d.deleted)
			)

			// Create && update backup record for this diff backup
			const [ backupSize, sizeError ] = await this._getTotalByteLengthOfBackup(fChanged)
			if (sizeError) {
				throw new BackupException(`Failed to calculate backup size. Reason: ${sizeError.message}`)
			}
			const backupRecord: BackupRecord = {
				id: uuid(),
				basedOn: fullId,
				name: generatedBackupName,
				type: BackupType.DIFF,
				created: timestamp,
				bytelength: backupSize,
				directoryList: dChanged,
				fileList: fChanged
			}

			// Update the database (only after everything else works properly)
			await db.insert(RecordTable.BACKUPS, backupRecord)
			return [ backupRecord, null ]
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
			const [ backupSize, sizeError ] = this._getTotalByteLengthOfBackup(fileData)
			if (sizeError) {
				throw new BackupException(`Failed to calculate backup size. Reason: ${sizeError.message}`)
			}
			const backupRecord: BackupRecord = {
				id: uuid(),
				basedOn: null,
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
			// Note: we can use copy standalone for FULL backups since they require little additional computation
			await copy(source, `${destination}/${generatedBackupName}`, {
				overwrite: true,
				preserveTimestamps: true,
				errorOnExist: false
			})

			// Write changes to database entry (including directories & files)
			await db.insert(RecordTable.BACKUPS, backupRecord)
			return [ backupRecord, null ]
		} catch (err) {
			return [ null, err ]
		}
	}
}
