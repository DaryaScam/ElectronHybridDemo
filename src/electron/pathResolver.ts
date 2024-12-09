import { app } from "electron"
import { join } from "path"
import { isDev } from "./util.js"

export const getPreloadPath = (): string => {
    return join(
        app.getAppPath(),
        isDev ? '.' : '..',
        '/dist-electron/preload.cjs'
    )
}