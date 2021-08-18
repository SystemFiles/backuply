import { JSONFile, Low } from 'lowdb'
import { BackupRecord, BackupType, RecordType } from '../common/types.js'
import { RecordNotFoundException } from '../common/exceptions.js'
import { AppConfig } from './configuration.js'
import { DB_KEY } from '../common/constants.js'
import { resolve } from 'path/posix'
import { cwd } from 'process'

export class DatabaseManager {
	private static instance: DatabaseManager
	private dbClient: Low<RecordType>

	private constructor(dbPath: string) {
		const adapter = new JSONFile<RecordType>(dbPath)
		this.dbClient = new Low<RecordType>(adapter)
	}

	public static getInstance(path?: string): DatabaseManager {
		if (!DatabaseManager.instance) {
			const [ value, error ] = AppConfig.getInstance().getValue(DB_KEY)
			if (error) {
				throw new Error(`Could not create database instance. Reason: ${error.message}`)
			}
			DatabaseManager.instance = new DatabaseManager(path ? path : resolve(cwd(), value['path'].toString()))
		}

		return DatabaseManager.instance
	}

	async init(): Promise<void> {
		try {
			// Read data as exists (set db.data content)
			await this.dbClient.read()

			// Init data if datafile doesn't exist
			this.dbClient.data ||= { backups: [] }
			await this.dbClient.write()
		} catch (err) {
			throw new Error(`Error occurred when initializing localdb. ${err}`)
		}
	}

	findAllRecords(): [BackupRecord[], Error] {
		try {
			return [ this.dbClient.data.backups, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	findRecordsByName(name: string, backupType?: BackupType): [BackupRecord[], Error] {
		try {
			const data = this.dbClient.data.backups
			const filtered = data.filter((r) => (r.name.match(name) && backupType ? r.type === backupType : true))

			return [ filtered, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	findRecordById(id: string): [BackupRecord, Error] {
		try {
			const backup = this.dbClient.data.backups.find((backup) => backup.id === id)

			if (!backup) {
				throw new RecordNotFoundException(id, `Record could not be found with Id, ${id}`)
			}

			return [ backup, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	async insert(data: BackupRecord): Promise<void> {
		try {
			this.dbClient.data.backups.push({ ...data })
			await this.dbClient.write()
		} catch (err) {
			throw new Error(`Error occurred when inserting new backup record. ${err}`)
		}
	}

	async delete(id: string): Promise<[BackupRecord, Error]> {
		try {
			const [ backupItem, error ] = this.findRecordById(id)
			if (error) {
				return [ null, error ]
			}

			// Delete the record
			this.dbClient.data.backups = this.dbClient.data.backups.filter((backup) => backup.id !== id)
			await this.dbClient.write()

			return [ backupItem, null ]
		} catch (err) {
			return [ null, err ]
		}
	}
}
