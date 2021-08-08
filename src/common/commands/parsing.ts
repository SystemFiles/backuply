import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

// Handle parse args
export function parseArgs():
	| {
			[x: string]: unknown
			_: (string | number)[]
			$0: string
		}
	| Promise<{
			[x: string]: unknown
			_: (string | number)[]
			$0: string
		}> {
	const cmd = yargs(hideBin(process.argv))

	// Set options
	cmd.command('config', 'configure backuply', (yargs) => {
		return yargs
			.option('db.path', {
				type: 'string',
				description: 'Configure the path to the local database used to store backup metadata'
			})
			.option('log.level', {
				type: 'string',
				description: 'Configure the logging level '
			})
	})

	cmd.command(
		'list',
		'displays a list of all backups that are currently known by the system. Use --name to filter backups by name',
		(yargs) => {
			return yargs.option('name', {
				describe: 'An optional variable used for some info commands to refine info operations',
				type: 'string'
			})
		}
	)

	// Configure custom backups
	cmd.command('backup', 'performs a custom backup of a select directory(s)', (yargs) => {
		return yargs
			.positional('name', {
				describe: 'the name for this backup',
				type: 'string'
			})
			.positional('source', {
				describe:
					'the source directory to use for the backup. This is the directory that will be at the root of your backup',
				type: 'string'
			})
			.positional('dest', {
				describe: 'the destination path which will contain the backup.',
				type: 'string'
			})
			.option('ref', {
				description:
					'a reference id or name for the full backup used in generating a differential backup based on the reference.',
				type: 'string'
			})
	})

	// Restore from backup
	cmd.command('restore', 'perform a restore from a target backup', (yargs) => {
		yargs
			.positional('ref', {
				describe: 'the full uuid or name for the backup to restore',
				type: 'string'
			})
			.positional('dest', {
				describe: 'path to destination restore directory',
				type: 'string'
			})
			.option('full', {
				describe:
					'If using a name reference, tells backuply whether to restore only the latest full backup (if exists with ref)',
				type: 'boolean'
			})
	})

	// Set general parse config
	return cmd.usage('Usage: $0 <command> [options...]').demandCommand(1).version().argv
}
