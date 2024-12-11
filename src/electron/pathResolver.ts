/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

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