// Specifies type of backup
export enum BackupType {
	FULL = 'full',
	DIFF = 'incremental'
}

export enum RecordTable {
	BACKUPS,
	ARCHIVE
}

export type FileData = {
	fullPath: string
	byteLength: number
	md5sum: string
}

export type DirectoryTree = {
	root: string
	files: FileData[]
}

export type BackupRecord = {
	id: string
	name: string
	data: FileData
	date: string
	type: BackupType
	allFiles: DirectoryTree
}

export type RecordType = {
	backups: BackupRecord[]
	archive: BackupRecord[]
}
