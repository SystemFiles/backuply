// Entrypoint to application
import { join } from 'path/posix';
import { cwd } from 'process';
import { argv } from 'yargs'
import { parseArgs } from './common/commands/parsing';
import { DatabaseManager } from './lib/database';
import { log } from "./lib/logger";

// Define commandline options
parseArgs()

const run = async () => {
	// Init database
	const db = DatabaseManager.getInstance(`${join(cwd(), argv['db'].path)}` || null)
	db.init()

	// Show title for application (figlet)
	
}

// Run from entrypoint
run().then(() => {
	console.log('finished')
})