import { readFileSync, writeFileSync } from 'fs'
import { mkdirpSync } from 'fs-extra'
import path, { join } from 'path/posix'
import { getAppDataPath } from '../common/functions.js'
import { AppConfigObject, ConfigStoreOptions, SomeConfigData } from '../common/types.js'
import { defaults } from '../config/backuply.js'

export class ConfigStore {
	private path: string
	private data: AppConfigObject

	constructor(opts: ConfigStoreOptions) {
		const userDataPath = getAppDataPath()
		this.path = join(userDataPath, `${opts.configName}.json`)
		this.data = this.parseDataFile(
			opts.defaults || {
				...defaults
			}
		)
	}

	get(key: string): [SomeConfigData, Error] {
		try {
			const data = this.data[key]

			if (!data) {
				throw new Error(`Config data not found for key ${key}...`)
			}
			return [ data, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	set(key: string, val: SomeConfigData): Error {
		try {
			this.data[key] = val
			writeFileSync(this.path, JSON.stringify(this.data))
		} catch (err) {
			return err
		}
	}

	has(key: string): [boolean, Error] {
		try {
			const data = this.data[key]
			return [ data === null || data === undefined, null ]
		} catch (err) {
			return [ null, err ]
		}
	}

	private parseDataFile(defaults?: AppConfigObject): AppConfigObject {
		try {
			return JSON.parse(readFileSync(this.path).toString('utf8'))
		} catch (err) {
			// Use defaults
			mkdirpSync(path.dirname(this.path))

			this.data = defaults
			writeFileSync(this.path, JSON.stringify(defaults), { flag: 'w' })
			return defaults
		}
	}
}
