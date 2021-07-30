// Entrypoint to application
import { argv } from 'yargs'
import { parseArgs } from './common/commands/parsing';
import { sayHello } from './common/functions';
import { AppConfig } from './lib/configuration';
import { DatabaseManager } from './lib/database';
import { log } from "./lib/logger";

// Define commandline options
parseArgs()

const run = async () => {
	sayHello()
	// Perform all app configurations first
	if (`${argv['_']}` === 'config') {
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

	// Init database
	const db = DatabaseManager.getInstance()
	db.init()

}

// Run from entrypoint
run().then(() => {
	console.log('finished')
})