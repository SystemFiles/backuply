import { join } from 'path/posix'
import { cwd } from 'process'
import { BackupType, RecordTable } from './common/types'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
import { v4 as uuid } from 'uuid'
;(async () => {
	// Init db resources
	const dbRef = DatabaseManager.getInstance(join(__dirname, 'backups', 'backups.json'))
	await dbRef.init()

	try {
		await dbRef.findRecord('udwiuhad', RecordTable.BACKUPS)
	} catch (err) {
		console.log(err.message)
	}
})()
