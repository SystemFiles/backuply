import { join } from 'path/posix'
import { cwd } from 'process'
import { BackupType, RecordTable } from './common/types'
import { DatabaseManager } from './lib/database'
import { FileManager } from './lib/filemanager'
import { v4 as uuid } from 'uuid'
;(async () => {
	// Init db resources
	const db: DatabaseManager = new DatabaseManager(null, join(__dirname, 'data', 'db.json'))
	await db.init()

	const outPath = await FileManager._createDirectory(cwd(), 'backups')
	const backupFileData = await FileManager._makeBackup(
		`${cwd()}/src/lib`,
		'exception-backup',
		outPath,
		true,
		BackupType.Monthly
	)

	// add entry to backups database
	const backupId: string = uuid()
	await db.insert(BackupType.Monthly, RecordTable.BACKUPS, {
		id: backupId,
		name: 'exception-backup',
		date: new Date().toISOString(),
		size: backupFileData.byteLength,
		checksum: backupFileData.md5sum,
		type: null
	})

	await db.archive(backupId)
})()
