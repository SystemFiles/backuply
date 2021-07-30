import yargs, { argv } from 'yargs'
import { hideBin } from 'yargs/helpers'

// Handle parse args
export function parseArgs(): void {
	const cmd = yargs(hideBin(process.argv))

	// Set options
	cmd.command('config', 'configure backuply', (yargs) => {
		return yargs
			.option('db.path', {
				type: 'string',
				description: 'Configure the path to the local database used to store backup metadata'
			})
	})
	cmd.command('backup', 'performs a custom backup of a select directory(s)', (yargs) => {
		return yargs
		.positional('name', {
			describe: 'the name for this backup',
			type: 'string'
		})
		.positional('source', {
			describe: 'the source directory to use for the backup. This is the directory that will be at the root of your backup',
			type: 'string'
		})
		.positional('dest', {
			describe: 'the destination path which will contain the backup.',
			type: 'string'
		})
		.option('ref.id', {
			description: 'a reference id for the full backup used in generating a differential backup based on the reference.',
			type: 'string'
		})
		.option('ref.name', {
			description: 'a reference name for the full backup used in generating a differential backup based on the reference.',
			type: 'string'
		})
	})

	cmd.command('restore', 'perform a restore from a target backup', (yargs) => {
		yargs.positional('id', {
			describe: 'the full uuid for the backup restore',
			type: 'string'
		})
		.positional('dest', {
			describe: 'path to destination restore directory',
			type: 'string'
		})
		.option('name', {
			description: 'specifies that the id will be a backup name (not this may fail if multiple backups are created for the same day)',
			type: 'boolean'
		})
	})

	// Set general parse config
	cmd.usage('Usage: $0 <command> [options...]')
		.demandCommand(1)
		.argv
}