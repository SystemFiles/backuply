import { DB_PATH_KEY, PACKAGE_NAME } from "../common/constants"
import { defaults } from "../config/backuply"

export class AppConfig {
  private static instance: AppConfig

  private constructor() {
    // Do nothing (cannot be instantiated)
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig()
    }

    // configure some store
    return AppConfig.instance
  }

  getValue(key: string): [ any, Error ] {
    try {
      const value = 'PLACEHOLDER_VALUE' // this.store.get(key)
      if (!value) {
        throw new Error(`Failed to retrieve config value from AppConfig`)
      }
      return [value, null]
    } catch (err) {
      return [ null, err ]
    }
  }

  // changeDatabaseLocation(path: string): [ string, Error ] {
  //   try {
  //     this.store.set(DB_PATH_KEY, path)
  //     return [ path, null ]
  //   } catch (err) {
  //     return [ null, err ]
  //   }
  // }
}