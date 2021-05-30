import { join } from 'path/posix'
import { cwd } from 'process'
import { DatabaseManager } from './data'
import { FileManager } from './lib/filemanager'
;(async () => {
	// Init db resources
	const db: DatabaseManager = new DatabaseManager(null, join(__dirname, 'data', 'db.json'))
	await db.init()

	const outPath = await FileManager._createDirectory('.', 'backups')
	FileManager._makeBackup(`${cwd()}/src/lib`, 'exception-backup', outPath)
})()
