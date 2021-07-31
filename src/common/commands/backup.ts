import ora from "ora"
import { join } from "path/posix"
import { cwd } from "process"
import { BackupManager } from "../../lib/backup"
import { log } from "../../lib/logger"
import { BackupRecord } from "../types"

export async function makeBackup(name: string, src: string, dest: string, ref?: string): Promise<[ BackupRecord, Error ]> {
  try {
    // Validate input
    if (!name || name.length === 0 || !dest || dest.length === 0) {
      return [ null, new Error(`Invalid options specified...`) ]
    }
    log(`Parameters validated ... deciding which backup method to use ...`)

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
    log(`Validating reference backup ID ...`)

    // Check if refID passed or refName
    let refId = ref
    if (!ref.match('\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b')) {
      // Translate ref name to an ID to use
      log(`Reference backup was not presented as UUID ... attempting to translate to UUID from presumed name ...`)
      refId = ref
    }

    // Perform the backup and return
    const mgr: BackupManager = BackupManager.getInstance()
    log(`Clearing temporary backup buffers ...`)
    mgr.clearBuffers()

    // Loading indicator (UI)
    const spinner = ora('Creating differential backup ...').start()
    const res = await mgr.diffBackup(refId, join(cwd(), src), name, join(cwd(), dest))
    spinner.stopAndPersist({text: `Backup completed.`})
    return res
  } catch (err) {
    return [ null, err ]
  }
}

export async function fullBackup(name: string, src: string, dest: string): Promise<[ BackupRecord, Error ]> {
  const mgr: BackupManager = BackupManager.getInstance()
  log(`Clearing temporary backup buffers ...`)
  mgr.clearBuffers()
  
  // Loading indicator (UI)
  const spinner = ora('Creating full backup ...').start()
  const res = await mgr.fullBackup(join(cwd(), src), name, join(cwd(), dest))
  spinner.stopAndPersist({text: `Backup completed.`})
  return res
}