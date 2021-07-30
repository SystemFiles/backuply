// Entrypoint to application
import { argv } from 'yargs'
import { makeBackup } from './common/commands/backup';
import { parseArgs } from './common/commands/parsing';
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
	}

	// Init: database
	const db = DatabaseManager.getInstance()
	db.init()

	// Handle: Perform backup and restore operations
	switch (argv['_'].toString()) {
		case 'backup': {
			const [ res, err ] = await makeBackup(argv['name'], argv['source'], argv['dest'], argv['ref'].id || argv['ref'].name)

			if (err) {
				log(`Something went wrong creating the backup. Reason: ${err.message}`)
			}

			ppRecord(res) // Print the created record in a pretty way :p
			break;
		}
		case 'restore': {
			// TODO: restore implementation in /common/commands/restore.ts
			console.log('restore ...')
			break;
		}
		default: {
			console.log('FINISHED!')
		}
	}

	// Do any clean up necessary and exit
	process.exit(0)
}

// Run from entrypoint
run().then(() => {
	// TODO: fill in completion details/handlers
})