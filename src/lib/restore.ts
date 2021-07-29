import { copy } from 'fs-extra'
import { join } from 'path/posix'
import { DatabaseReadException, RestoreException } from '../common/exceptions'
import { BackupRecord, BackupType, Directory, FileData } from '../common/types'
import { DatabaseManager } from './database'

export class RestoreManager {
	private static instance: RestoreManager
	private constructor() {
		/* Private constructor to prevent use of `new` with this class */
	}

	public static getInstance(): RestoreManager {
		if (!this.instance) {
			this.instance = new RestoreManager()
		}
		return this.instance
	}

	private async _updatePathRoot(absPath: string, sourceRoot: string, targetRoot: string): Promise<string> {
		return absPath.replace(sourceRoot, targetRoot)
	}

	private async _mergeBackups(fullBackup: BackupRecord, diffBackup: BackupRecord): Promise<[BackupRecord, Error]> {
		/*
			Merge differential backup with referenced full backup record
		*/
		try {
			const mergeSize = fullBackup.bytelength + diffBackup.bytelength
			const fileSet: Set<FileData> = new Set()
			const dirSet: Set<Directory> = new Set()

			// Add all deleted directories (unique)
			for (const dir of fullBackup.directoryList) {
				dir.path = await this._updatePathRoot(dir.path, fullBackup.sourceRoot, fullBackup.destRoot)
				if (dir.deleted) dirSet.add(dir)
			}
			for (const dir of diffBackup.directoryList) {
				dir.path = await this._updatePathRoot(dir.path, diffBackup.sourceRoot, diffBackup.destRoot)
				if (dir.deleted) dirSet.add(dir)
			}

			// Add all non-deleted files (unique) - Should also automatically account for files in deleted dirs
			for (const ff of fullBackup.fileList) {
				ff.fullPath = await this._updatePathRoot(ff.fullPath, fullBackup.sourceRoot, fullBackup.destRoot)
				const fbRelPath = ff.fullPath.split(fullBackup.name).reverse()[0]

				// Add each file from full backup (we will make adjustments next for modified or deleted files)
				fileSet.add(ff)

				// Validate against files in the differential backup (and make modifications/replacements as necessary)
				for (const df of diffBackup.fileList) {
					df.fullPath = await this._updatePathRoot(df.fullPath, diffBackup.sourceRoot, diffBackup.destRoot)
					const dbRelPath = df.fullPath.split(diffBackup.name).reverse()[0]
					
					if (fbRelPath === dbRelPath) {
						// File Deleted
						if (df.deleted) fileSet.delete(ff)

						// File Modified
						if (df.md5sum !== ff.md5sum) {
							fileSet.delete(ff)
							fileSet.add(df)
						}
					}
					// File Added
					fileSet.add(df)
				}
			}

			// Combine to create a new merged backup record
			const record: BackupRecord = {
				id: '9999-9999-9999-9999',
				name: 'restore',
				type: BackupType.DIFF,
				created: new Date().toISOString(),
				bytelength: mergeSize,
				basedOn: null,
				fileList: Array.from(fileSet),
				directoryList: Array.from(dirSet),
				sourceRoot: diffBackup.sourceRoot,
				destRoot: diffBackup.destRoot
			}
			return [ record, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private async _restoreFilesAsync(
		refRoot: string,
		rootPath: string,
		record: BackupRecord,
		target: string,
		excludeDirs: Directory[] = []
	): Promise<Error> {
		/*
			Useful for restoring files from either differential backup record
			or simple full backup
		*/
		try {
			const copyPromises: Promise<void>[] = []
			const files: FileData[] = record.fileList
			for (const f of files) {
				let skip = false
				for (const d of excludeDirs) {
					skip = f.fullPath.startsWith(d.path)
				}
				if (!skip && !f.deleted) {
					const fileRoot = refRoot && f.fullPath.includes(refRoot) ? refRoot : rootPath
					copyPromises.push(
						copy(f.fullPath, join(target, f.fullPath.split(fileRoot)[1]), {
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
	}

	public async restore(id: string, target: string): Promise<Error> {
		/*
			Restore selected backup with ID to the target location
		*/
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			// Get backup record from database
			const [ backupRecord, fbError ] = db.findRecordById(id)
			if (fbError) {
				throw new DatabaseReadException(`Failed to find a backup with ID, ${id}`)
			}
			// Check restore for base (full backup, if exists)
			if (backupRecord.basedOn) {
				// Restoring from differential backup (r = referenced backup record)
				const [ rBackupRecord, dbError ] = db.findRecordById(backupRecord.basedOn)
				if (dbError) {
					throw new DatabaseReadException(`Failed to find a full reference backup with ID, ${backupRecord.basedOn}`)
				}
				const [ merged, mError ] = await this._mergeBackups(rBackupRecord, backupRecord)
				if (mError) {
					throw new RestoreException(`Failed to restore backup: ${backupRecord.name}. Reason: ${mError.message}`)
				}
				const err = await this._restoreFilesAsync(
					rBackupRecord.destRoot,
					backupRecord.destRoot,
					merged,
					target,
					merged.directoryList
				)
				if (err) {
					throw new RestoreException(`Failed to restore backup: ${backupRecord.name}. Reason: ${err.message}`)
				}
			} else {
				// Restoring from full backup
				for (const f of backupRecord.fileList) {
					f.fullPath = await this._updatePathRoot(f.fullPath, backupRecord.sourceRoot, backupRecord.destRoot)
				}
				for (const d of backupRecord.directoryList) {
					d.path = await this._updatePathRoot(d.path, backupRecord.sourceRoot, backupRecord.destRoot)
				}
				const err = await this._restoreFilesAsync(null, backupRecord.destRoot, backupRecord, target)
				if (err) {
					throw new RestoreException(`Failed to restore backup: ${backupRecord.name}. Reason: ${err.message}`)
				}
			}
		} catch (err) {
			return err
		}
	}
}
