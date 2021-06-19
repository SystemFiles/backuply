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
	deleted: boolean
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
}

export type RecordType = {
	backups: BackupRecord[]
	archive: BackupRecord[]
}
