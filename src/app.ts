import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
import { log } from './lib/logger'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'backups', 'backups.json'))
	await dbRef.init()

	const [ record, error ] = await FileManager.getInstance().makeBackup(
		join(cwd(), 'dev', 'backup_source'),
		'test-backup',
		dbRef,
		join(cwd(), 'dev', 'backup_dest')
	)

	if (error) {
		log(`There was a problem creating the backup. Reason: ${error.message}`)
	}
	log(`(${record.id}) Backup created successfully!`)
})()
