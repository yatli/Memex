import Dexie from 'dexie'
import Storex from '@worldbrain/storex'

import { DBGet } from './types'

/*
 * Bit of a hack to allow the storex Dexie backend to be available to all
 * the legacy code that uses Dexie directly (i.e., all this module's exports).
 * Storex is init'd async, hence this needs to be a Promise that resolves to
 * the backend. It is resolved after storex is init'd in the BG script entrypoint.
 */
let db: Promise<Storex>
let resolveDb: (db: Storex) => void = null
const createNewDbPromise = () => {
    db = new Promise<Storex>((resolve) => (resolveDb = resolve))
}
createNewDbPromise()

export const setStorex = (storex: Storex) => {
    if (!resolveDb) {
        createNewDbPromise()
    }

    resolveDb(storex)

    resolveDb = null
}

/**
 * WARNING: This should only ever be used by the legacy memex code which relies on Dexie.
 * Any new code should use the storex instance set up in the BG script entrypoint.
 */
const getDb: DBGet = () => db

export default getDb
