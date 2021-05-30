import { readFile } from 'fs-extra'
import { mkdir, stat, writeFile } from 'fs/promises'
import { promisify } from 'util'
import * as tar from 'tar'
import * as fstream from 'fstream'
import { gzip } from 'zlib'
import { createWriteStream } from 'fs'

export class FileManager {
	static async _createDirectory(rootPath: string, directoryName: string): Promise<string> {
		const fullPath: string = `${rootPath}/${directoryName}`

		try {
			if (!await stat(fullPath)) {
				return mkdir(fullPath, { recursive: true, mode: '755' })
			} else {
				console.log(`${rootPath}/${directoryName} already exists...`)
				return fullPath
			}
		} catch (err) {
			throw new Error(err)
		}
	}

	static async _makeBackup(
		rootPath: string,
		name: string,
		useDate: boolean = true,
		outPath: string = '/tmp'
	): Promise<string> {
		try {
			const generatedFileName = useDate
				? `${outPath}/${name}-${new Date().toISOString()}.zip`
				: `${outPath}/${name}.zip`

			tar
				.c(
					{
						gzip: true,
						preservePaths: false
					},
					[
						rootPath
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
