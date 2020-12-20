import Storex from '@worldbrain/storex'
import {
    DexieStorageBackend,
    IndexedDbImplementation,
} from '@worldbrain/storex-backend-dexie'

import { Neo4jBackend } from './neo4j'

import schemaPatcher from './storage/dexie-schema'
import stemmerSelector from './stemmers'
import { createStorexPlugins } from './storex-plugins'

export default function initStorex(options: {
    dbName: string
    idbImplementation?: IndexedDbImplementation
}): Storex {
    // const backend = new DexieStorageBackend({
    //     stemmerSelector,
    //     schemaPatcher,
    //     dbName: options.dbName,
    //     idbImplementation: options.idbImplementation,
    //     legacyMemexCompatibility: true,
    // })

    console.log('heyyyyyyyyyyyy initStorex!')
    const backend = new Neo4jBackend(options.dbName)

    for (const plugin of createStorexPlugins()) {
        console.log(plugin)
        backend.use(plugin)
    }

    const storex = new Storex({ backend })
    return storex
}
