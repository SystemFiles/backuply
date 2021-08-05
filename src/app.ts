#! /usr/bin/env node

// Entrypoint to application
import { listBackups, makeBackup } from './common/commands/backup.js';
import { parseArgs } from './common/commands/parsing.js';
import { restoreBackup } from './common/commands/restore.js';
import { ppRecord, sayHello } from './common/functions.js';
import { AppConfig } from './lib/configuration.js';
import { DatabaseManager } from './lib/database.js';
import { log } from "./lib/logger.js";

// Define commandline options
const cmdArgs = parseArgs()

const run = async () => {
	sayHello()

	// Handle: Perform all app configurations first
	if (cmdArgs['_'].toString() === 'config') {
		const conf = AppConfig.getInstance()
		const options = Object.keys(cmdArgs).slice(1)
		for (const opt of options) {
			if (opt !== '$0') {
				const [ newVal, setErr ] = conf.setValue(opt, cmdArgs[opt])
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

	// Init: database
	const db = DatabaseManager.getInstance()
	await db.init()

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
			break;
		}
		case 'restore': {
			const [ res, err ] = await restoreBackup(cmdArgs['ref'], cmdArgs['dest'])

			if (err) {
				log(`Something went wrong when attempting to restore a backup. Reason: ${err.message}`)
				process.exit(1)
			}

			log(`Backup with ID, ${res}, successfully restored to ${cmdArgs['dest']}`)
			break;
		}
		case 'list': {
			const err = await listBackups(cmdArgs['name'])
			if (err) {
				log(`Could not list backups. Reason: ${err.message}`)
			}
			break;
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