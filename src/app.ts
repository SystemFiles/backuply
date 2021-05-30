import { cwd } from 'process'
import { FileManager } from './lib/filemanager'
;(async () => {
	const outPath = await FileManager._createDirectory('.', 'backups')
	FileManager._makeBackup(`${cwd()}/src/lib`, 'exception-backup', true, outPath)
})()
