import { join } from "path/posix"
import { cwd } from "process"
import { BackupManager } from "../../lib/backup"
import { BackupRecord } from "../types"

export async function makeBackup(name: string, src: string, dest: string, ref?: string): Promise<[ BackupRecord, Error ]> {
  try {
    // Validate input
    if (!name || name.length === 0 || !dest || dest.length === 0) {
      return [ null, new Error(`Invalid options specified...`) ]
    }

    // Differential backup
    if (ref && ref.length > 0) return await differentialBackup(name, src, dest, ref)

    // Full backup
    if (src && src.length > 0) return await fullBackup(name, src, dest)
  } catch (err) {
    return [ null, err ]
  }
}

export async function differentialBackup(name: string, src: string, dest: string, ref: string): Promise<[ BackupRecord, Error ]> {
  try {
    // Check if refID passed or refName
    let refId = ref
    if (!ref.match('\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b')) {
      // Translate ref name to an ID to use
      refId = ref
    }

    // Perform the backup and return
    const mgr: BackupManager = BackupManager.getInstance()
    mgr.clearBuffers()
    return await mgr.diffBackup(refId, join(cwd(), src), name, join(cwd(), dest))
  } catch (err) {
    return [ null, err ]
  }
}

export async function fullBackup(name: string, src: string, dest: string): Promise<[ BackupRecord, Error ]> {
  const mgr: BackupManager = BackupManager.getInstance()
  mgr.clearBuffers()
  return mgr.fullBackup(join(cwd(), src), name, join(cwd(), dest))
}