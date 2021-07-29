import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './lib/database'
import { BackupManager } from './lib/backup'
import { log } from './lib/logger'
import { RestoreManager } from './lib/restore'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'dev', 'backup_db.json'))
	await dbRef.init()

	// Perform a full backup
	// const [ record, error ] = await BackupManager.getInstance().fullBackup(
	// 	join(cwd(), 'dev', 'backup_source'),
	// 	'sonar-backup',
	// 	join(cwd(), 'dev', 'backup_dest')
	// )

	// if (error) {
	// 	log(`There was a problem creating the backup. Reason: ${error.message}`)
	// 	process.exit(2)
	// }
	// log(`(${record.id}) Backup created successfully!`)
	// BackupManager.getInstance().clearBuffers()

	// Perform a diff backup
	// const testFullId = '43101254-27dc-4852-bf80-360a258d3897'
	// const [ dRecord, dError ] = await BackupManager.getInstance().diffBackup(
	// 	testFullId, // replace with record.id
	// 	join(cwd(), 'dev', 'backup_source'),
	// 	'test-backup',
	// 	join(cwd(), 'dev', 'backup_dest')
	// )
	// if (dError) {
	// 	log(`Error >> ${dError.message}`)
	// 	process.exit(2)
	// }
	// log(`(${dRecord.id}) Backup created successfully!`)

	// Perform restore from differential backup
	const testRestoreId = '460a5b33-58ab-4da8-8dfe-0204d4779556'
	const err = await RestoreManager.getInstance().restore(testRestoreId, join(cwd(), 'dev', 'restore'))
	if (err) {
		log(`Error >> ${err.message}`)
		process.exit(2)
	}
	log(`Restoring ${testRestoreId} was successful!`)

	// Perform restore from full backup
	// const testRestoreId = '9dabb607-0ec7-433f-aa60-9514b4578a9f'
	// const err = await RestoreManager.getInstance().restore(testRestoreId, join(cwd(), 'backups', 'restore'))
	// if (err) {
	// 	log(`Error >> ${err.message}`)
	// 	process.exit(2)
	// }
	// log(`Restoring ${testRestoreId} was successful!`)
})()
