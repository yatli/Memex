import Storex from '@worldbrain/storex'
import { IndexedDbImplementation } from '@worldbrain/storex-backend-dexie'

import { Neo4jBackend } from './neo4j'

import schemaPatcher from './storage/dexie-schema'
import stemmerSelector from './stemmers'
import { createStorexPlugins } from './storex-plugins'

let consoleLogPatched = false
const re = /^([^@]+)@.*$/
const log = console.log

function logWithCallerInfo() {
    let callstack = new Error().stack
    let aRegexResult = re.exec(callstack.split('\n')[1])
    let sCallerName = aRegexResult ? aRegexResult[1] : ''
    let args = ''.concat([].map.call(arguments, (x) => JSON.stringify(x)))
    log.apply(console, [`${sCallerName}: ${args}`])
}

// Debug: patch console.log
if (!consoleLogPatched) {
    console.log = logWithCallerInfo
    consoleLogPatched = true
}

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

    const backend = new Neo4jBackend(options.dbName)

    console.log('Loading plugins')

    for (const plugin of createStorexPlugins()) {
        console.log(plugin)
        backend.use(plugin)
    }

    const storex = new Storex({ backend })
    return storex
}
