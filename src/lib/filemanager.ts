import { readFile } from 'fs-extra'
import { mkdir, stat } from 'fs/promises'
import * as tar from 'tar'
import { createWriteStream } from 'fs'
import { BackupType } from '../common/types'

export class FileManager {
	static async _rotateBackups(): Promise<void> {
		// TODO
	}

	static async _createDirectory(rootPath: string, directoryName: string): Promise<string> {
		const fullPath: string = `${rootPath}/${directoryName}`

		try {
			if (!await stat(fullPath)) {
				return mkdir(fullPath, { recursive: true, mode: '755' })
			} else {
				console.log(`Backup directory, ${rootPath}/${directoryName}, already exists ... skipping create.`)
				return fullPath
			}
		} catch (err) {
			throw new Error(err)
		}
	}

	static async _makeBackup(
		source: string,
		name: string,
		destination: string = '/tmp',
		useDate: boolean = true,
		type: BackupType = BackupType.Monthly
	): Promise<string> {
		try {
			const generatedFileName = useDate
				? `${destination}/${name}-${type.toString().toLowerCase()}-${new Date().toISOString()}.tar.gz`
				: `${destination}/${name}.tar.gz`

			tar
				.c(
					{
						gzip: true,
						preservePaths: false
					},
					[
						source
					]
				)
				.pipe(createWriteStream(generatedFileName))

			return generatedFileName
		} catch (err) {
			throw new Error(err)
		}
	}

	static async _copyFiles(rootPath: string, relativePath: string): Promise<string> {
		const fileContents = await readFile(`${rootPath}/${relativePath}`, 'utf8')

		return fileContents
	}
}
