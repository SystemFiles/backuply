import { getAppDataPath } from "../common/functions";
import { AppConfigObject } from "../common/types";

export const defaults: AppConfigObject = {
	db: {
		path: `${getAppDataPath()}/backup_data.json`
	},
	log: {
		level: 'INFO'
	}
}