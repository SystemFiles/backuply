import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './lib/database'
import { BackupManager } from './lib/backup'
import { log } from './lib/logger'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'backups', 'backups.json'))
	await dbRef.init()

	// Perform a full backup
	const [ record, error ] = await BackupManager.getInstance().fullBackup(
		join(cwd(), 'dev', 'backup_source'),
		'test-backup',
		join(cwd(), 'dev', 'backup_dest')
	)

	if (error) {
		log(`There was a problem creating the backup. Reason: ${error.message}`)
		process.exit(2)
	}
	log(`(${record.id}) Backup created successfully!`)
	BackupManager.getInstance().clearBuffers()

	// Perform a diff backup
	const testFullId = 'd1c15b67-e567-4773-b540-7a67fb137093'
	const [ dRecord, dError ] = await BackupManager.getInstance().diffBackup(
		testFullId, // replace with record.id
		join(cwd(), 'dev', 'backup_source'),
		'test-backup',
		join(cwd(), 'dev', 'backup_dest')
	)
	if (dError) {
		log(`Error >> ${dError.message}`)
		process.exit(2)
	}
	log(`(${dRecord.id}) Backup created successfully!`)
})()
