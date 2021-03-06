import { lstat, readdir } from 'fs/promises'
import { join, sep } from 'path/posix'
import { copy } from 'fs-extra'
import { BackupRecord, BackupType, Directory, FileData } from '../common/types.js'
import { v4 as uuid } from 'uuid'
import {
	BackupException,
	BackupFilesDiscoveryException,
	DatabaseReadException,
	IOException
} from '../common/exceptions.js'
import { DatabaseManager } from './database.js'
import { createHash } from 'crypto'
import { createReadStream, ReadStream } from 'fs'
import { compareByDepth, createDirectory } from '../common/functions.js'

export class BackupManager {
	private static instance: BackupManager
	private HASH_ALGO = 'md5'
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

	public clearBuffers(): void {
		this.filesBuffer = []
		this.directoriesBuffer = []
	}

	private async _dirDifference(fullId: string, directories: Directory[]): Promise<[Directory[], Error]> {
		/* 
			Capture changes to directories from the current(diff) and referenced full backup (fullId)
		*/
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			const [ fullRecord, error ] = db.findRecordById(fullId)
			if (error) {
				throw new DatabaseReadException(`Failed to find record with ID, ${fullId}.`)
			}
			const changed: Directory[] = []
			for (const fdir of fullRecord.directoryList) {
				const dmatch = directories.filter((np) => np.path === fdir.path)
				if (dmatch.length === 0) {
					changed.push({
						path: fdir.path,
						depth: fdir.depth,
						deleted: true
					})
				}
			}

			// Find any added directories and also add them to changed
			for (const d of directories) {
				const added = fullRecord.directoryList.filter((fd) => fd.path === d.path).length === 0
				if (added) changed.push(d)
			}
			return [ changed, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private async _fileDifference(fullId: string, files: FileData[]): Promise<[FileData[], Error]> {
		/*
			Capture any file changes between current(diff) and a referenced full backup
		*/
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
				const added = fullRecord.fileList.filter((f) => f.fullPath === dfile.fullPath).length === 0
				if (added) changed.push(dfile)
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
				const pStat = await lstat(absPath)

				if (pStat.isDirectory()) {
					// store the directory path in a temporary buffer and recurse
					this.directoriesBuffer.push(absPath)
					await this._generateBackupTreeFromRoot(absPath)
				} else {
					// If not directory or symlink store in temporary files buffer
					if (pStat.isFile() && !pStat.isSocket()) this.filesBuffer.push(absPath)
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
			const fileData: FileData[] = []
			for (const file of files) {
				const [ res, err ] = await this._getFileSizeAndHash(file)
				if (err) {
					return [ null, err ]
				}
				fileData.push({
					fullPath: file,
					byteLength: res.byteLength,
					md5sum: res.checksum,
					deleted: false
				})
			}
			return [ fileData, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private async _getFileSizeAndHash(file: string): Promise<[{ checksum: string; byteLength: number }, Error]> {
		try {
			const hash = createHash(this.HASH_ALGO)
			const rs: ReadStream = createReadStream(file)
			let totalBytesRead = 0
			rs.pipe(hash)

			const endHash: Promise<string> = new Promise((resolve, reject) => {
				rs.on('end', () => {
					resolve(hash.digest('hex'))
				})
				rs.on('error', (err) => {
					reject(new Error(`Failed to calculate hash. Reason: ${err}`))
				})
				rs.on('data', (chunk: Buffer) => {
					totalBytesRead += chunk.byteLength
					hash.update(chunk)
				})
			})

			const checksum: string = await endHash
			return [ { checksum: checksum, byteLength: totalBytesRead }, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private async _getDirectoryData(directories: string[]): Promise<[Directory[], Error]> {
		try {
			const dirDataFormatted: Directory[] = []
			for (const dir of directories) {
				const dInfo = await lstat(dir)
				const dMode = `0${(dInfo.mode & parseInt('755', 8)).toString(8)}`
				const dDepth = dir.split(sep).length

				// Append the related directory data to the formatted output
				dirDataFormatted.push({
					path: dir,
					deleted: false,
					mode: dMode,
					uid: dInfo.uid,
					gid: dInfo.gid,
					depth: dDepth
				})
			}
			return [ dirDataFormatted, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private async _copySelectFilesAsync(
		sourceRoot: string,
		files: FileData[],
		destRoot: string,
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
						copy(f.fullPath, join(destRoot, f.fullPath.split(sourceRoot)[1]), {
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

	private async _createDirectoryStructure(
		directories: Directory[],
		sourceRoot: string,
		destRoot: string
	): Promise<Error> {
		try {
			let processQueue = []
			let depthCatch = 0
			for (const d of directories.sort(compareByDepth)) {
				if (!d.deleted) {
					if (depthCatch !== d.depth) {
						const depthQueue = processQueue
						await Promise.all(depthQueue)

						depthCatch = d.depth
						processQueue = []
					}

					// Append the operation to the queue
					processQueue.push(
						createDirectory(
							destRoot,
							d.path.split(sourceRoot)[1],
							{ mode: d.mode || '0755' },
							{ uid: d.uid, gid: d.gid }
						)
					)
				}
			}
			return
		} catch (err) {
			return err
		}
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

			// Set UMASK to '0' to avoid problems with permission setting
			process.umask('0')

			// Ensure reference backup actually exists and is a full backup
			if (!db.findRecordById(fullId)[0] || db.findRecordById(fullId)[0].type !== BackupType.FULL) {
				throw new BackupException(`Could not find a reference full backup with ID, ${fullId}. Cannot continue`)
			}

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
			const [ _, createErr ] = await createDirectory(destination, generatedBackupName)
			if (createErr) {
				throw new IOException(`Could not create the backup directory. Aborting... (${createErr.message})`)
			}

			// Create backup structure based on directories with changes and copy files
			await this._createDirectoryStructure(dChanged, source, join(destination, generatedBackupName))
			await this._copySelectFilesAsync(
				source,
				fChanged,
				join(destination, generatedBackupName),
				dChanged.filter((d) => d.deleted)
			)

			// Create && update backup record for this diff backup
			const [ backupSize, sizeError ] = this._getTotalByteLengthOfBackup(fChanged)
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
				fileList: fChanged,
				sourceRoot: source,
				destRoot: join(destination, generatedBackupName)
			}

			// Update the database (only after everything else works properly)
			await db.insert(backupRecord)
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

			// Set UMASK to '0' to avoid problems with permission setting
			process.umask('0')

			// Get full list of all directories recursively && Get full list of all files (with absolute paths)
			await this._generateBackupTreeFromRoot(source)
			// Calculate checksums of entire backup file tree (recursively)
			const [ fileData, fileError ] = await this._getFileData(this.filesBuffer)
			// Create formatted directory data for each directory from root -> leaf
			const [ dirData, dirError ] = await this._getDirectoryData(this.directoriesBuffer)
			if (fileError || dirError) {
				throw new BackupFilesDiscoveryException(fileError ? fileError.message : dirError.message)
			}

			// Create the FULL backup
			const [ _, createErr ] = await createDirectory(destination, generatedBackupName)
			if (createErr) {
				throw new IOException(`Could not create the backup directory. Aborting... (${createErr.message})`)
			}

			// Create full structure (and persist permisssions/ownership) and copy files
			await this._createDirectoryStructure(dirData, source, join(destination, generatedBackupName))
			await this._copySelectFilesAsync(source, fileData, join(destination, generatedBackupName))

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
				fileList: fileData,
				sourceRoot: source,
				destRoot: join(destination, generatedBackupName)
			}

			// Write changes to database entry (including directories & files)
			await db.insert(backupRecord)
			return [ backupRecord, null ]
		} catch (err) {
			return [ null, err ]
		}
	}
}
