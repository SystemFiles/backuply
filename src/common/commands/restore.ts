import ora from "ora";
import { join } from "path/posix";
import { cwd } from "process";
import { log } from "../../lib/logger";
import { RestoreManager } from "../../lib/restore";

export async function restoreBackup(ref: string, dest: string): Promise<[ string, Error ]> {
  if (!ref || ref.length === 0 || !dest || dest.length === 0) {
    return [ null, new Error('Invalid reference ID or destination specified ...') ]
  }

  log(`Parameter validation completed ... checking ID format`)

  // Check if refID passed or refName
  let refId = ref
  if (!ref.match('\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b')) {
    // Translate ref name to an ID to use
    log(`Reference backup was not presented as UUID ... attempting to translate to UUID from presumed name ...`)
    refId = ref
    log(`Translation complete. NAME (${ref}) > UUID (${refId})`)
  }

  // Loading indicator (UI)
  const spinner = ora(`Restoring backup for ${refId} ...`).start()
  const mgr: RestoreManager = RestoreManager.getInstance()
  const err = await mgr.restore(refId, join(cwd(), dest))
  spinner.stop()

  if (err) {
    return [ null, err ]
  }
  return [ refId, null ]
}