import { DatabaseReadException } from '../common/exceptions'
import { BackupRecord } from '../common/types'
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

	private async _mergeBackups(fullBackup: BackupRecord, diffBackup: BackupRecord): Promise<[BackupRecord, Error]> {
		// TODO
	}

	public async restore(id: string, target: string): Promise<Error> {
		try {
			const db: DatabaseManager = DatabaseManager.getInstance()
			// Get backup record from database
			const [ fBackupRecord, fbError ] = db.findRecordById(id)
			if (fbError) {
				throw new DatabaseReadException(`Failed to find a backup with ID, ${id}`)
			}
			// Check restore base
			if (fBackupRecord.basedOn) {
				// Restoring from differential backup
				const [ dBackupRecord, dbError ] = db.findRecordById(fBackupRecord.basedOn)
				if (dbError) {
					throw new DatabaseReadException(`Failed to find a differential backup with ID, ${fBackupRecord.basedOn}`)
				}
				const [ merged, mError ] = await this._mergeBackups(fBackupRecord, dBackupRecord)
			} else {
				// Restoring from full backup
			}
			// TODO: implement restore
		} catch (err) {
			return err
		}
	}
}
