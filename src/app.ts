import { join } from 'path/posix'
import { BackupType } from './common/types'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(__dirname, 'backups', 'backups.json'))
	await dbRef.init()

	try {
		await FileManager.getInstance().makeBackup(
			join(__dirname, 'dev', 'backup_source'),
			'test',
			join(__dirname, 'dev', 'backup_dest'),
			true,
			BackupType.FULL,
			dbRef
		)
	} catch (err) {
		console.log(err.message)
	}
})()
