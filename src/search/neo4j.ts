import {
    dissectCreateObjectOperation,
    convertCreateObjectDissectionToBatch,
    setIn,
} from '@worldbrain/storex/lib/utils'
import * as backend from '@worldbrain/storex/lib/types/backend'
import { StorageBackendFeatureSupport } from '@worldbrain/storex/lib/types/backend-features'
import { CollectionDefinition } from '@worldbrain/storex'
import * as neo4j from 'neo4j-driver'
import { Parameters } from 'neo4j-driver/types/query-runner'

export class Neo4jBackend extends backend.StorageBackend {
    m_neo4j: neo4j.Driver
    m_dbName: string

    constructor(dbname: string) {
        super()

        // XXX plain text auth token
        this.m_neo4j = neo4j.driver(
            'neo4j://localhost',
            neo4j.auth.basic('yatao', 'test'),
        )
        this.m_dbName = dbname
    }

    async readTransaction(query: string, params?: Parameters) {
        const session = this.m_neo4j.session({
            database: this.m_dbName,
            defaultAccessMode: 'READ',
        })
        try {
            return await session.readTransaction((tx) => tx.run(query, params))
        } catch {
            return undefined
        } finally {
            await session.close()
        }
    }

    async writeTransaction(query: string, params?: Parameters) {
        const session = this.m_neo4j.session({
            database: this.m_dbName,
            defaultAccessMode: 'WRITE',
        })
        try {
            return await session.writeTransaction((tx) => tx.run(query, params))
        } catch {
            return undefined
        } finally {
            await session.close()
        }
    }

    /** Backend interface implementation */

    createObject(
        collection: string,
        object: any,
        options?: backend.DBNameOptions,
    ) {
        throw new Error('Method not implemented.')
    }
    findObjects<T>(
        collection: string,
        query: any,
        options?: backend.FindManyOptions,
    ): Promise<T[]> {
        throw new Error('Method not implemented.')
    }
    updateObjects(
        collection: string,
        query: any,
        updates: any,
        options?: backend.DBNameOptions,
    ): Promise<any> {
        throw new Error('Method not implemented.')
    }
    deleteObjects(
        collection: string,
        query: any,
        options?: backend.DeleteManyOptions,
    ): Promise<any> {
        throw new Error('Method not implemented.')
    }
}
