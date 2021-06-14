import { readFile } from 'fs-extra'
import { mkdir, stat } from 'fs/promises'
import * as tar from 'tar'
import { createWriteStream } from 'fs'
import { BackupRecord, BackupType, FileData } from '../common/types'
import { MD5 } from '../common/functions'
import { IOException } from '../common/exceptions'

export class FileManager {
	private static instance: FileManager
	private constructor() {
		/* Singleton private constructor to prevent use of `new` with this class */
	}

	public static getInstance(): FileManager {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager()
		}

		return FileManager.instance
	}

	public async createDirectory(rootPath: string, directoryName: string): Promise<string> {
		const fullPath = `${rootPath}/${directoryName}`

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

	private async _difference(latestFull: BackupRecord) {
		// TODO
	}

	public async makeBackup(
		source: string,
		name: string,
		destination = '/tmp',
		useDate = true,
		type: BackupType = BackupType.FULL
	): Promise<FileData> {
		try {
			const generatedFileName = useDate
				? `${destination}/${name}-${type.toString().toLowerCase()}-${new Date().toISOString()}.tar.gz`
				: `${destination}/${name}.tar.gz`

			// Calculate checksums of entire backup file tree (recursively)
			// Store checksums with absolute paths to files (db entry after operation completed successfully)
			// Create the FULL backup in tar
			// Write changes to database entry (including directories & files)
			// Done

			let buildTar
			if (type === BackupType.FULL) {
				buildTar = tar.c(
					{
						gzip: true,
						preservePaths: false
					},
					[
						source
					]
				)
				// Write backup
				buildTar.pipe(createWriteStream(generatedFileName))
			} else {
				// Differential backup
				// TODO
				// Calculate checksum of entire backup file tree (for all files)
				// Check for all directories from full backup (with fs.stat) that they still exist. If not, mark directory as deleted
				// Compare checksum of each file with that of existing file in full backup to see if they are different (note: if one does not exist in the full backup, consider this file changed (added))
				// Ensure any files existing in FULL backup and not in this backup changed (will have to trigger remove when merged with full backup at restore time)
				// Store full absolute paths to any changed files in memory (later in database entry)
				// Somehow create tar containing only changed files
				// Write changed files into database entry as list of absolute paths
			}

			// promisify the write process to ensure subsequent processing can occur
			const fileData: Promise<FileData> = new Promise((resolve, reject) => {
				if (!buildTar) {
					throw new IOException(`Could not find a valid reference to any backup process`)
				}
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
