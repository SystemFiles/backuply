import { getAppDataPath } from '../common/functions.js'
import { AppConfigObject } from '../common/types.js'

export const defaults: AppConfigObject = {
	db: {
		path: `${getAppDataPath()}/backup_data.json`
	},
	log: {
		level: 'INFO'
	}
}
