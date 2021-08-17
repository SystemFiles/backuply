#! /usr/bin/env node

// Entrypoint to application
import ora from 'ora'
import { listBackups, makeBackup } from './common/commands/backup.js'
import { parseArgs } from './common/commands/parsing.js'
import { restoreBackup } from './common/commands/restore.js'
import { ppRecord, sayHello } from './common/functions.js'
import { AppConfig } from './lib/configuration.js'
import { DatabaseManager } from './lib/database.js'
import { log } from './lib/logger.js'

const run = async () => {
	sayHello()

	// Init: AppConfig instance
	const configStore = AppConfig.getInstance()
	const configInitProgress = ora('Initializing App Config ...').start()
	await configStore.init()
	configInitProgress.stop()

	// Parse commandline options
	const cmdArgs = parseArgs()

	// Handle: Perform all app configurations first
	if (cmdArgs['_'].toString() === 'config') {
		const options = Object.keys(cmdArgs).slice(1)
		for (const opt of options) {
			if (opt !== '$0') {
				const [ newVal, setErr ] = configStore.setValue(opt, cmdArgs[opt])
				if (setErr) {
					log(`FATAL: Failed to set ${opt} in App Config ...`)
					process.exit(1)
				}
				log(`Setting config option ${opt}: ${newVal} ... done ✔`)
			}
		}
		// Cleanly exit
		process.exit(0)
	}

	// Init: Backup Database
	const db = DatabaseManager.getInstance()
	const dbInitProgress = ora('Initializing Backuply Datastore ...').start()
	await db.init()
	dbInitProgress.stop()

	// Handle: Perform backup and restore operations
	switch (cmdArgs['_'].toString()) {
		case 'backup': {
			const [ res, err ] = await makeBackup(cmdArgs['name'], cmdArgs['source'], cmdArgs['dest'], cmdArgs['ref'] || null)

			if (err) {
				log(`Something went wrong creating the backup. Reason: ${err.message}`)
				process.exit(1)
			}

			log(`Backup successfully created. See details below:\n`)
			ppRecord(res) // Print the created record in a pretty way :p
			break
		}
		case 'restore': {
			const [ res, err ] = await restoreBackup(cmdArgs['ref'], cmdArgs['dest'], cmdArgs['full'])

			if (err) {
				log(`Something went wrong when attempting to restore a backup. Reason: ${err.message}`)
				process.exit(1)
			}

			log(`Backup with ID, ${res}, successfully restored to ${cmdArgs['dest']}`)
			break
		}
		case 'list': {
			const err = await listBackups(cmdArgs['name'])
			if (err) {
				log(`Could not list backups. Reason: ${err.message}`)
			}
			break
		}
		default: {
			log(`WARN: Invalid command specified`)
			process.exit(2)
		}
	}
}

// Run from entrypoint
run().then(() => {
	// Do any clean up necessary and exit
	process.exit(0)
})
