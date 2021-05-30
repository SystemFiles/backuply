// Specifies type of backup
export enum BackupType {
	Daily = 'Daily',
	Weekly = 'Daily',
	Monthly = 'Monthly',
	Quartarly = 'Quarterly',
	SemiAnually = 'SemiAnually',
	Anually = 'Anually'
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

export type BackupRecord = {
	id: string
	name: string
	size: number
	checksum: string
	date: string
	type: BackupType
}

export type RecordType = {
	backups: BackupRecord[]
	archive: BackupRecord[]
}
