export class RecordNotFoundException extends Error {
	constructor(private readonly id: string, readonly message: string = null) {
		super(message ? message : `Could not find a record with ${id}`)
	}
}
export class IOException extends Error {
	constructor(readonly message: string = null) {
		super(message ? message : `Unknown error occurred when doing some IO operation...`)
	}
}
export class BackupFilesDiscoveryException extends Error {
	constructor(readonly message: string = 'Unknown Cause') {
		super(`There was a problem trying to discover files or directories for the backup metadata. Error: ${message}`)
	}
}
export class BackupException extends Error {
	// A general backup exception
	constructor(readonly message: string = 'Unknown Cause') {
		super(`Something went wrong creating the backup. Error: ${message}`)
	}
}
