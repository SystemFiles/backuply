// Specifies type of backup
export enum BackupType {
	FULL = 'full',
	DIFF = 'diff'
}

export enum RecordTable {
	BACKUPS,
	ARCHIVE
}

export type FileData = {
	fullPath: string
	byteLength: number
	md5sum: string
	deleted: boolean
}

export type Directory = {
	path: string
	deleted: boolean,
	depth: number,
	mode?: string,
	uid?: number,
	gid?: number,
}

export type BackupRecord = {
	id: string
	basedOn: string
	name: string
	created: string
	type: BackupType
	bytelength: number
	fileList: FileData[]
	directoryList: Directory[]
	sourceRoot: string
	destRoot: string
}

export type RecordType = {
	backups: BackupRecord[]
	archive: BackupRecord[]
}

// App Config
export type SomeConfigData = string|Record<string, unknown>

export type AppConfigObject = {
	db: SomeConfigData
	log: SomeConfigData
}

export type ConfigStoreOptions = {
	configName: string,
	defaults?: AppConfigObject
}