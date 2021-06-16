import { join } from 'path/posix'
import { cwd } from 'process'
import { BackupType } from './common/types'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(cwd(), 'backups', 'backups.json'))
	await dbRef.init()

	try {
		await FileManager.getInstance().makeBackup(
			join(cwd(), 'dev', 'backup_source'),
			'test-backup',
			dbRef,
			join(cwd(), 'dev', 'backup_dest')
		)
	} catch (err) {
		console.log(err.message)
	}
})()
