// Entrypoint to application
import { argv } from 'yargs'
import { makeBackup } from './common/commands/backup';
import { parseArgs } from './common/commands/parsing';
import { restoreBackup } from './common/commands/restore';
import { ppRecord, sayHello } from './common/functions';
import { AppConfig } from './lib/configuration';
import { DatabaseManager } from './lib/database';
import { log } from "./lib/logger";

// Define commandline options
parseArgs()

const run = async () => {
	sayHello()
	// Handle: Perform all app configurations first
	if (argv['_'].toString() === 'config') {
		const conf = AppConfig.getInstance()
		const options = Object.keys(argv).slice(1)
		for (const opt of options) {
			if (opt !== '$0') {
				const [ newVal, setErr ] = conf.setValue(opt, argv[opt])
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
	switch (argv['_'].toString()) {
		case 'backup': {
			const [ res, err ] = await makeBackup(argv['name'], argv['source'], argv['dest'], argv['ref'] || null)

			if (err) {
				log(`Something went wrong creating the backup. Reason: ${err.message}`)
				process.exit(1)
			}

			log(`Backup successfully created. See details below:\n`)
			ppRecord(res) // Print the created record in a pretty way :p
			break;
		}
		case 'restore': {
			const [ res, err ] = await restoreBackup(argv['ref'], argv['dest'])

			if (err) {
				log(`Something went wrong when attempting to restore a backup. Reason: ${err.message}`)
				process.exit(1)
			}

			log(`Backup with ID, ${res}, successfully restored to ${argv['dest']}`)
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