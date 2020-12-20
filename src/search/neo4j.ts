import {
    CreateObjectDissection,
    dissectCreateObjectOperation,
    convertCreateObjectDissectionToBatch,
    setIn,
} from '@worldbrain/storex/lib/utils'
import * as backend from '@worldbrain/storex/lib/types/backend'
import { StorageBackendFeatureSupport } from '@worldbrain/storex/lib/types/backend-features'
import { CollectionDefinition } from '@worldbrain/storex'

import * as neo4j from 'neo4j-driver'
import { Parameters } from 'neo4j-driver/types/query-runner'
import { FavIcon, Page, Bookmark, Tag } from './models'
import { Annotation } from 'src/annotations/types'

export class Neo4jBackend extends backend.StorageBackend {
    m_neo4j: neo4j.Driver
    m_dbName: string
    m_createObjectRewriter: Map<string, (obj: any) => any>
    m_collectionTypeMap: Map<string, string>

    constructor(dbname: string) {
        super()

        // XXX plain text auth token
        this.m_neo4j = neo4j.driver(
            'neo4j://localhost',
            neo4j.auth.basic('neo4j', 'test'),
        )
        this.m_dbName = dbname
        this.m_collectionTypeMap = new Map([
            ['favIcons', 'FavIcon'],
            ['pages', 'Page'],
            ['annotations', 'Annotation'],
            ['annotBookmarks', 'AnnotationBookmark'],
            ['tags', 'Tag'],
            ['bookmarks', 'Bookmark'],
            ['pageListEntries', 'PageListEntry'],
            ['customLists', 'CustomList'],
            ['customListDescriptions', 'CustomListDescription'],
            ['visits', 'Visit'],
            ['sharedAnnotationMetadata', 'SharedAnnotationMetadata'],
        ])
        this.m_createObjectRewriter = new Map([
            ['favIcons', this.createFavIcons.bind(this)],
        ])
    }

    buildQueryOptions(options?: backend.FindManyOptions): string {
        if (options === undefined) {
            return ''
        }
        let opt_pack = []
        let { limit, skip, order } = options
        if (limit !== undefined) {
            opt_pack.push(`LIMIT ${limit}`)
        }
        if (skip !== undefined) {
            opt_pack.push(`SKIP ${limit}`)
        }
        if (order !== undefined) {
            for (let [f, dir] of order) {
                opt_pack.push(`ORDER BY ${f} ${dir}`)
            }
        }
        console.log(opt_pack)
        return opt_pack.join(' ')
    }

    buildQueryProperties(query: any): string {
        let prop_pack = []
        for (let k in query) {
            let v: any = query[k]
            if (typeof v === 'object') {
                let ins = v['$in']
                let nins = v['$nin']
                if (ins !== undefined) {
                    prop_pack.push(`n.${k} IN ${JSON.stringify(ins)}`)
                }
                if (nins !== undefined) {
                    prop_pack.push(`n.${k} NOT IN ${JSON.stringify(nins)}`)
                }
            } else {
                v = JSON.stringify(query[k])
                if (v.startsWith('"') && v.endsWith('"')) {
                    v = `'${v.substr(1, v.length - 2)}'`
                }
                prop_pack.push(`n.${k}=${v}`)
            }
        }
        console.log(prop_pack)
        return prop_pack.join(' AND ')
    }

    async createFavIcons(obj: any) {
        obj.favIcon = undefined
        return obj
    }

    async createPage(obj: any) {}

    async readTransaction(query: string, params?: Parameters) {
        const session = this.m_neo4j.session({
            database: this.m_dbName,
            defaultAccessMode: 'READ',
        })
        try {
            return await session.readTransaction((tx) => tx.run(query, params))
        } catch (e) {
            console.log(e)
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
        } catch (e) {
            console.log(e)
            return undefined
        } finally {
            await session.close()
        }
    }

    async recreateDatabase() {
        const session = this.m_neo4j.session({
            defaultAccessMode: 'WRITE',
        })
        try {
            await session.writeTransaction((tx) =>
                tx.run(`DROP DATABSE ${this.m_dbName}`),
            )
            await session.writeTransaction((tx) =>
                tx.run(`CREATE DATABASE ${this.m_dbName}`),
            )
        } catch {
            return undefined
        } finally {
            await session.close()
        }
    }

    /** Backend interface implementation */

    async createObject(
        collection: string,
        object: any,
        options?: backend.DBNameOptions,
    ) {
        console.log(
            'collection',
            collection,
            'object',
            object,
            'options',
            options,
        )

        let t = this.m_collectionTypeMap.get(collection)
        if (t === undefined) {
            throw new Error(`unrecognized collection ${collection}`)
        }
        let rewrite = this.m_createObjectRewriter.get(collection)
        if (rewrite !== undefined) {
            object = rewrite(object)
        }

        await this.writeTransaction(
            `
CREATE (n:${t} $props)
`,
            { props: object },
        )
        return { object: object }
    }

    async findObjects<T>(
        collection: string,
        query: any,
        options?: backend.FindManyOptions,
    ): Promise<T[]> {
        console.log(
            'collection',
            collection,
            'query',
            query,
            'options',
            options,
        )

        let t = this.m_collectionTypeMap.get(collection)
        if (t === undefined) {
            throw new Error(`unrecognized collection ${collection}`)
        }
        let ret: T[] = []
        const result = await this.readTransaction(`
MATCH (n:${t})
WHERE ${this.buildQueryProperties(query)}
RETURN n
${this.buildQueryOptions(options)}
`)
        for (let r of result.records) {
            ret.push(r['n'] as T)
        }
        return ret
    }

    updateObjects(
        collection: string,
        query: any,
        updates: any,
        options?: backend.DBNameOptions,
    ): Promise<any> {
        console.log(
            'collection',
            collection,
            'query',
            query,
            'updates',
            updates,
            'options',
            options,
        )
        return Promise.resolve({})
    }

    deleteObjects(
        collection: string,
        query: any,
        options?: backend.DeleteManyOptions,
    ): Promise<any> {
        console.log(
            'collection',
            collection,
            'query',
            query,
            'options',
            options,
        )
        return Promise.resolve({})
    }
}
