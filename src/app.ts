import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
import { log } from './lib/logger'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'backups', 'backups.json'))
	await dbRef.init()

	// Perform a full backup
	const [ record, error ] = await FileManager.getInstance().fullBackup(
		join(cwd(), 'dev', 'backup_source'),
		'test-backup',
		join(cwd(), 'dev', 'backup_dest')
	)

	if (error) {
		log(`There was a problem creating the backup. Reason: ${error.message}`)
		process.exit(2)
	}
	log(`(${record.id}) Backup created successfully!`)

	// Perform a diff backup
	const testFullId = '4e9439c0-9792-4d8d-9550-7ad66b5405bf'
	const [ dRecord, dError ] = await FileManager.getInstance().differentialBackup(
		testFullId, // replace with record.id
		join(cwd(), 'dev', 'backup_source'),
		'test-backup',
		join(cwd(), 'dev', 'backup_dest')
	)
	if (dError) {
		log(`Error >> ${dError.message}`)
		process.exit(2)
	}
	// log(`(${dRecord.id}) Backup created successfully!`)
})()
