import { readFile } from 'fs-extra'
import { mkdir, stat } from 'fs/promises'
import * as tar from 'tar'
import { createWriteStream } from 'fs'
import { BackupType, FileData } from '../common/types'
import { MD5 } from '../common/functions'

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
	): Promise<FileData> {
		try {
			const generatedFileName = useDate
				? `${destination}/${name}-${type.toString().toLowerCase()}-${new Date().toISOString()}.tar.gz`
				: `${destination}/${name}.tar.gz`

			const buildTar = tar.c(
				{
					gzip: true,
					preservePaths: false
				},
				[
					source
				]
			)

			buildTar.pipe(createWriteStream(generatedFileName))

			// promisify the write process to ensure subsequent processing can occur
			const fileData: Promise<FileData> = new Promise((resolve, reject) => {
				buildTar.on('end', async () => {
					const fileBuffer = await readFile(generatedFileName)
					const bufferSize = fileBuffer.byteLength
					const checksum = MD5(unescape(fileBuffer.toString()))

					// Resolve file data for backup tarball
					resolve({
						fullPath: generatedFileName,
						byteLength: bufferSize,
						md5sum: checksum
					})
				})
				buildTar.on('error', (err) => reject(`Failed to write backup file. Reason: ${err}`))
			})

			return fileData
		} catch (err) {
			throw new Error(err)
		}
	}
}
