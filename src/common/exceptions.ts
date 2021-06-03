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
