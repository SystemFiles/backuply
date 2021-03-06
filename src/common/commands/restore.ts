import ora from 'ora'
import { resolve } from 'path/posix'
import { cwd } from 'process'
import { log } from '../../lib/logger.js'
import { RestoreManager } from '../../lib/restore.js'
import { getLatestBackupByName } from '../functions.js'
import { BackupType } from '../types.js'

export async function restoreBackup(ref: string, dest: string, full = false): Promise<[string, Error]> {
	if (!ref || ref.length === 0 || !dest || dest.length === 0) {
		return [ null, new Error('Invalid reference ID or destination specified ...') ]
	}

	log(`Parameter validation completed ... checking ID format`)

	// Check if refID passed or refName
	let refId = ref
	if (!/\b[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-\b[0-9a-fA-F]{12}\b/.test(ref)) {
		// Translate ref name to an ID to use
		log(`Reference backup was not presented as UUID ... attempting to translate to UUID from presumed name ...`)

		// Translate ref name to an ID to use
		const [ latest, err ] = getLatestBackupByName(ref, full ? BackupType.FULL : null)
		if (err) {
			log(`Failed to translate backup for backup reference, ${ref} ... Reason: ${err.message}`)
			process.exit(2)
		}

		refId = latest.id
		log(`Translation complete. NAME (${latest.name}) > UUID (${refId})`)
	}

	// Loading indicator (UI)
	const spinner = ora(`Restoring backup for ${refId} ...`).start()
	const mgr: RestoreManager = RestoreManager.getInstance()
	const err = await mgr.restore(refId, resolve(cwd(), dest))
	spinner.stop()

	if (err) {
		return [ null, err ]
	}
	return [ refId, null ]
}
