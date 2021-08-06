import { LOG_DEBUG, LOG_KEY, PACKAGE_NAME } from "../common/constants.js"
import { AppConfig } from "./configuration.js"

function _getCallingFn(): Record<string, string> {
	try {
		const e = new Error()
		// matches this function, the caller and the parent
		const allMatches = e.stack.match(/(\w+)@|at (\w+) \((.*)/g)

		// match parent function name and path
		const allMatchesValid = allMatches[allMatches.length-1] || allMatches[1]
		const parentMatches = allMatchesValid.match(/(\w+)@|at (\w+) \((.*)/)

		// return caller function name and file
		return {
			functionName: parentMatches[1] || parentMatches[2],
			fileName: parentMatches[3].split(`${PACKAGE_NAME}/`)[1].match(/^(.+)\/([^/]+)$/)[0].replace(')', '')
		}
	} catch (err) {
		return {
			functionName: 'unknown',
			fileName: 'unknown'
		}
	}
}

export function log(message: string): void {
	const [logConf, err] = AppConfig.getInstance().getValue(LOG_KEY)

	if (err) {
		console.warn('Failed to determine log level automatically ... defaulting to INFO')
	}

	let debug = false
	let callingFunction: Record<string, unknown>
	if (logConf['level'] === LOG_DEBUG) {
		debug = true
		callingFunction = _getCallingFn()
	}

	console.log(`[${new Date().toISOString()}] [${logConf['level']}]${debug ? ` [${callingFunction.functionName}:${callingFunction.fileName}]` : ''} >>> ${message}`)
}
