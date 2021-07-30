import { DB_PATH_KEY } from "../common/constants"
import { AppConfigObject, SomeConfigData } from "../common/types"
import { ConfigStore } from "./configstore"

export class AppConfig {
  private static instance: AppConfig
  private store: ConfigStore

  private constructor(defaults?: AppConfigObject) {
    this.store = new ConfigStore({configName: 'user-preferences', defaults: defaults})
  }

  public static getInstance(defaults?: AppConfigObject): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig(defaults)
    }
    return AppConfig.instance
  }

  getValue(key: string): [ SomeConfigData, Error ] {
      const [ value, error ] = this.store.get(key)
      if (error) return [ null, error ]
      return [ value, null ]
  }

  setValue(key: string, value: SomeConfigData): [ string, Error ] {
    const err = this.store.set(key, value)
    if (err) return [ null, err ]
    return [ key, null ]
  }

  changeDatabaseLocation(path: string): [ string, Error ] {
    try {
      this.store.set(DB_PATH_KEY, path)
      return [ path, null ]
    } catch (err) {
      return [ null, err ]
    }
  }
}