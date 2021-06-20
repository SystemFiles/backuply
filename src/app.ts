import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './lib/database'
import { BackupManager } from './lib/backup'
import { log } from './lib/logger'
import { RestoreManager } from './lib/restore'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'backups', 'backups.json'))
	await dbRef.init()

	// Perform a full backup
	// const [ record, error ] = await BackupManager.getInstance().fullBackup(
	// 	join(cwd(), 'dev', 'backup_source'),
	// 	'test-backup',
	// 	join(cwd(), 'dev', 'backup_dest')
	// )

	// if (error) {
	// 	log(`There was a problem creating the backup. Reason: ${error.message}`)
	// 	process.exit(2)
	// }
	// log(`(${record.id}) Backup created successfully!`)
	// BackupManager.getInstance().clearBuffers()

	// Perform a diff backup
	// const testFullId = '9dabb607-0ec7-433f-aa60-9514b4578a9f'
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
	// const testRestoreId = '29bbd081-4f1f-45ec-acbe-10c3cdfeb2e7'
	// const err = await RestoreManager.getInstance().restore(testRestoreId, join(cwd(), 'backups', 'restore'))
	// if (err) {
	// 	log(`Error >> ${err.message}`)
	// 	process.exit(2)
	// }
	// log(`Restoring ${testRestoreId} was successful!`)

	// Perform restore from full backup
	const testRestoreId = '9dabb607-0ec7-433f-aa60-9514b4578a9f'
	const err = await RestoreManager.getInstance().restore(testRestoreId, join(cwd(), 'backups', 'restore'))
	if (err) {
		log(`Error >> ${err.message}`)
		process.exit(2)
	}
	log(`Restoring ${testRestoreId} was successful!`)
})()
