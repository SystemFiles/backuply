import { JSONFile, Low } from 'lowdb'
import { join } from 'path/posix'

export type Data = {
  backups: string[]
  archive: string[]
}

export class DatabaseManager {
	constructor(private dbClient: Low, databasePath: string) {
		const adapter = new JSONFile<Data>(databasePath)
    this.dbClient = new Low(adapter)
	}

  async init(): Promise<void> {
    // Read data as exists (set db.data content)
    await this.dbClient.read()
    
    // Init data if datafile doesn't exist
    this.dbClient.data ||= { backups: [], archive: [] }
    await this.dbClient.write()
  }

  async getFullData(): Promise<void> {
    return this.dbClient.read()
  }
}
