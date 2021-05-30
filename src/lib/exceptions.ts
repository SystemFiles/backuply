export class RecordNotFoundException extends Error {
	constructor(private readonly id: string, readonly message: string = null) {
		super(message ? message : `Could not find a record with ${id}`)
	}
}
