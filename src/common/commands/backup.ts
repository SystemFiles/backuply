import ora from 'ora'
import { resolve } from 'path/posix'
import { cwd } from 'process'
import { BackupManager } from '../../lib/backup.js'
import { DatabaseManager } from '../../lib/database.js'
import { log } from '../../lib/logger.js'
import { BackupRecord } from '../types.js'

export async function makeBackup(
	name: string,
	src: string,
	dest: string,
	ref?: string
): Promise<[BackupRecord, Error]> {
	try {
		// Validate input
		if (!name || name.length === 0 || !dest || dest.length === 0) {
			return [ null, new Error(`Invalid options specified...`) ]
		}
		log(`Parameters validated ... deciding which backup method to use ...`)

		// Differential backup
		if (ref && ref.length > 0) return await differentialBackup(name, src, dest, ref)

		// Full backup
		if (src && src.length > 0) return await fullBackup(name, src, dest)
	} catch (err) {
		return [ null, err ]
	}
}
export async function listBackups(name?: string): Promise<Error> {
	const db: DatabaseManager = DatabaseManager.getInstance()
	const [ records, err ] = await db.findAllRecords()
	if (err) return err
	let fRecords = records

	if (name && name.length > 0) {
		// Filter by name
		fRecords = fRecords.filter((r) => r.name.match(name))
	}

	if (fRecords.length === 0) {
		log(`No records were found ...`)
		return
	}

	const tableData = fRecords.map((r) => {
		return {
			id: r.id,
			name: r.name,
			created: r.created,
			type: r.type,
			size: `${Math.round(r.bytelength / 1024 / 1024)}MB`
		}
	})

	// Print the result
	log(`Found a total of ${fRecords.length} record(s) matching list criteria...`)
	console.table(tableData)
}

export async function differentialBackup(
	name: string,
	src: string,
	dest: string,
	ref: string
): Promise<[BackupRecord, Error]> {
	try {
		log(`Validating reference backup ID ...`)

		// Check if refID passed or refName
		let refId = ref
		if (!/\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-\b[0-9a-fA-F]{12}\b/.test(ref)) {
			// Translate ref name to an ID to use
			log(`Reference backup was not presented as UUID ... attempting to translate to UUID from presumed name ...`)
			refId = ref
		}

		// Perform the backup and return
		const mgr: BackupManager = BackupManager.getInstance()
		log(`Clearing temporary backup buffers ...`)
		mgr.clearBuffers()

		// Loading indicator (UI)
		const spinner = ora('Creating differential backup ...').start()
		const res = await mgr.diffBackup(refId, resolve(cwd(), src), name, resolve(cwd(), dest))
		spinner.stop()
		return res
	} catch (err) {
		return [ null, err ]
	}
}

export async function fullBackup(name: string, src: string, dest: string): Promise<[BackupRecord, Error]> {
	const mgr: BackupManager = BackupManager.getInstance()
	log(`Clearing temporary backup buffers ...`)
	mgr.clearBuffers()

	// Loading indicator (UI)
	const spinner = ora('Creating full backup ...').start()
	const res = await mgr.fullBackup(resolve(cwd(), src), name, resolve(cwd(), dest))
	spinner.stop()
	return res
}
