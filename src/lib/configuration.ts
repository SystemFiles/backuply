import { JSONFile, Low } from 'lowdb'
import { join } from 'path/posix'
import { getAppDataPath } from '../common/functions.js'
import { AppConfigObject, SomeConfigData } from '../common/types.js'
import { defaults } from '../config/backuply.js'

export class AppConfig {
	private static instance: AppConfig
	private store: Low<AppConfigObject>

	private constructor() {
		const path = join(getAppDataPath(), 'user-preferences.json')
		const adapter = new JSONFile<AppConfigObject>(path)
		this.store = new Low<AppConfigObject>(adapter)
	}

	public static getInstance(): AppConfig {
		if (!AppConfig.instance) {
			AppConfig.instance = new AppConfig()
		}

		return AppConfig.instance
	}

	async init(): Promise<void> {
		try {
			// Read data as exists (set appconfig content)
			await this.store.read()

			// Init data if datafile doesn't exist
			this.store.data ||= defaults
			await this.store.write()
		} catch (err) {
			throw new Error(`Error occurred when initializing AppConfig. Reason: ${err}`)
		}
	}

	getValue(key: string): [SomeConfigData, Error] {
		try {
			const value = this.store.data[key]
			return [ value, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	setValue(key: string, value: SomeConfigData): [string, Error] {
		try {
			this.store.data[key] = value
			return [ JSON.stringify(value), null ]
		} catch (err) {
			return [ null, err ]
		}
	}
}
