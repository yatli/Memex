import { StorageBackendPlugin } from '@worldbrain/storex'
import { Neo4jBackend } from '../neo4j'

import { SocialSearchParams } from './types'
import { Tweet, SocialPage, User } from 'src/social-integration/types'
import {
    POSTS_COLL,
    BMS_COLL,
    TAGS_COLL,
    LIST_ENTRIES_COLL,
} from 'src/social-integration/constants'
import { derivePostUrlIdProps } from 'src/social-integration/util'
import { FilteredIDsManager } from 'src/search/search/filters'
import { FilteredIDs } from '..'

export class SocialSearchPlugin extends StorageBackendPlugin<Neo4jBackend> {
    static SEARCH_OP_ID = 'memex:dexie.searchSocial'
    static MAP_POST_IDS_OP_ID = 'memex:dexie.mapIdsToSocialPages'

    install(backend: Neo4jBackend) {
        super.install(backend)

        backend.registerOperation(
            SocialSearchPlugin.SEARCH_OP_ID,
            this.searchSocial.bind(this),
        )

        backend.registerOperation(
            SocialSearchPlugin.MAP_POST_IDS_OP_ID,
            this.mapIdsToSocialPages.bind(this),
        )
    }

    private async listSearch(lists: number[]): Promise<Set<number>> {
        if (!lists || !lists.length) {
            return undefined
        }

        const ids = new Set<number>()
        const result = await this.backend.readTransaction(`
MATCH (l:socialPosts {listId: ${lists[0]}})<-[*]-(:socialPostListEntries)-[*]->(p:SocialPost)
RETURN p.postId AS postId
`)

        result.records.forEach((r) => ids.add(r['postId']))
        return ids
    }

    private async tagSearch(tags: string[]): Promise<Set<number>> {
        if (!tags || !tags.length) {
            return undefined
        }

        const ids = new Set<number>()
        const result = await this.backend.readTransaction(
            `
MATCH (tag:Tag)-[*]->(p:Page)
WHERE tag.name IN $tagSet
RETURN p.url AS url
`,
            { tagSet: tags },
        )

        result.records.forEach((r) => {
            let url = r['url']
            const { postId } = derivePostUrlIdProps({ url })

            if (postId) {
                ids.add(postId)
            }
        })
        return ids
    }

    private async socialTagSearch(tags: string[]): Promise<Set<number>> {
        if (!tags || !tags.length) {
            return undefined
        }

        const ids = new Set<number>()
        const result = await this.backend.readTransaction(
            `
MATCH (tag:SocialTag)-[*]->(p:SocialPost)
WHERE tag.name IN $tagSet
RETURN p.postId AS postId
`,
            { tagSet: tags },
        )

        result.records.forEach((r) => ids.add(r['postId']))
        return ids as any
    }

    private async userSearch(users: User[]): Promise<Set<number>> {
        if (!users || !users.length) {
            return undefined
        }

        const userIds = users.map((user) => user.id)
        const result = await this.backend.readTransaction(
            `
MATCH (u:SocialUser)-[*]->(p:SocialPost)
WHERE u.userId IN $userIds
RETURN p.postId AS postId
`,
            { userIds: userIds },
        )

        const ids = new Set<number>()
        result.records.forEach((r) => ids.add(r['postId']))

        return ids
    }

    private async findFilteredPosts(params: SocialSearchParams) {
        const [
            incTagUrls,
            excTagUrls,
            incUserUrls,
            excUserUrls,
            incHashtagUrls,
            excHashtagUrls,
            listUrls,
        ] = await Promise.all([
            this.tagSearch(params.tagsInc),
            this.tagSearch(params.tagsExc),
            this.userSearch(params.usersInc),
            this.userSearch(params.usersExc),
            this.socialTagSearch(params.hashtagsInc),
            this.socialTagSearch(params.hashtagsExc),
            this.listSearch(params.collections),
        ])

        return new FilteredIDsManager<number>({
            incTagUrls,
            excTagUrls,
            listUrls,
            incUserUrls,
            excUserUrls,
            incHashtagUrls,
            excHashtagUrls,
        })
    }

    async mapIdsToSocialPages(
        postIds: number[],
    ): Promise<Map<number, SocialPage>> {
        const socialPosts = new Map<number, SocialPage>()

        const results = new Map<number, SocialPage>()
        const result = await this.backend.readTransaction(
            `
MATCH (p:SocialPost)
WHERE p.postId IN $postIds
RETURN p.postId AS postId, p
`,
            { postIds: postIds },
        )

        result.records.forEach((r) => socialPosts.set(r['postId'], r['p']))

        postIds.map((id) => {
            const post = socialPosts.get(id)
            if (post !== undefined) {
                results.set(id, post)
            }
        })

        return results
    }

    private async queryTermsField(
        args: {
            field: string
            term: string
        },
        { startDate, endDate }: SocialSearchParams,
    ): Promise<number[]> {
        return []
        //        const result = await this.backend.readTransaction(`
        //MATCH (p:SocialPost)
        //WHERE p.${args.field} = '${args.term}'
        //RETURN p AS tweet
        //`)
        //let coll = new Array<Tweet>()
        //result.records.forEach((r) => coll.push(r['tweet'] as Tweet))

        //if (startDate || endDate) {
        //coll = coll.filter(
        //(tweet) =>
        //tweet.createdAt >= new Date(startDate || 0) &&
        //tweet.createdAt <= new Date(endDate || Date.now()),
        //)
        //}

        //return coll.primaryKeys() as Promise<number[]>
    }

    private async lookupTerms({ termsInc, ...params }: SocialSearchParams) {
        const field = '_text_terms'

        const results = new Map<string, number[]>()

        // Run all needed queries for each term and on each field sequentially
        for (const term of termsInc) {
            const termRes = await this.queryTermsField({ field, term }, params)

            // Collect all results from each field for this term
            results.set(term, [...new Set([].concat(...termRes))])
        }

        // Get intersection of results for all terms (all terms must match)
        const intersected = [...results.values()].reduce((a, b) => {
            const bSet = new Set(b)
            return a.filter((res) => bSet.has(res))
        })

        return intersected
    }

    private async lookbackFromEndDate(
        {
            startDate = 0,
            endDate = Date.now(),
            skip = 0,
            limit = 10,
        }: SocialSearchParams,
        filteredUrls: FilteredIDs<number>,
    ) {
        return []
        //        const latestVisits = new Map<number, number>()

        //await this.backend.dexieInstance
        //.table(POSTS_COLL)
        //.where('createdAt')
        //.between(new Date(startDate), new Date(endDate), true, true)
        //.reverse()
        //.until(() => latestVisits.size >= skip + limit)
        //.each(({ createdAt, id }) => {
        //if (
        //!latestVisits.has(id) &&
        //filteredUrls.isAllowed(id.toString())
        //) {
        //latestVisits.set(id, createdAt.valueOf())
        //}
        //})

        //const latestBookmarks = new Map<number, number>()
        //await this.backend.dexieInstance
        //.table(BMS_COLL)
        //.where('createdAt')
        //.between(new Date(startDate), new Date(endDate), true, true)
        //.reverse()
        //.until(() => latestBookmarks.size >= skip + limit)
        //.each(({ createdAt, postId }) => {
        //latestBookmarks.set(postId, createdAt.valueOf())
        //})

        //const results = new Map<number, number>()
        //const addToMap = (time: number, id: number) => {
        //const existing = results.get(id) || 0
        //if (existing < time) {
        //results.set(id, time)
        //}
        //}
        //latestVisits.forEach(addToMap)
        //latestBookmarks.forEach(addToMap)

        //return results
    }

    private async lookbackBookmarksTime({
        startDate = 0,
        endDate = Date.now(),
        skip = 0,
        limit = 10,
    }: Partial<SocialSearchParams>) {
        return []
        //        let bmsExhausted = false
        //let results = new Map<number, number>()
        //let upperBound = new Date()

        //while (results.size < skip + limit && !bmsExhausted) {
        //const bms = new Map<number, number>()

        //await this.backend.dexieInstance
        //.table(BMS_COLL)
        //.where('createdAt')
        //.belowOrEqual(upperBound)
        //.reverse()
        //.until(() => bms.size >= skip + limit)
        //.each(({ createdAt, postId }) => {
        //bms.set(postId, createdAt.valueOf())
        //})

        //if (bms.size < skip + limit) {
        //bmsExhausted = true
        //}

        //upperBound = new Date(Math.min(...bms.values()) - 1)

        //results = new Map([
        //...results,
        //...[...bms].filter(
        //([, createdAt]) =>
        //createdAt >= startDate && createdAt <= endDate,
        //),
        //])
        //}

        //return results
    }

    private async mapUrlsToLatestEvents(
        { endDate, startDate, bookmarksOnly }: Partial<SocialSearchParams>,
        postIds: number[],
    ): Promise<Map<number, number>> {
        // TODO neo4j
        return new Map<number, number>()
        //        function attemptAdd(
        //idTimeMap: Map<number, number>,
        //skipDateCheck = false,
        //) {
        //return (time: number, id: number) => {
        //const existing = idTimeMap.get(id) || 0

        //if (
        //existing > time ||
        //(!skipDateCheck && endDate != null && endDate < time) ||
        //(!skipDateCheck && startDate != null && startDate > time)
        //) {
        //return false
        //}

        //idTimeMap.set(id, time)
        //return true
        //}
        //}

        //const latestBookmarks = new Map<number, number>()
        //await this.backend.dexieInstance
        //.table(BMS_COLL)
        //.where('postId')
        //.anyOf(postIds)
        //.each(({ createdAt, postId }) =>
        //attemptAdd(latestBookmarks, bookmarksOnly)(
        //createdAt.valueOf(),
        //postId,
        //),
        //)

        //const latestVisits = new Map<number, number>()
        //const idsToCheck = bookmarksOnly ? [...latestBookmarks.keys()] : postIds
        //const doneFlags = idsToCheck.map((url) => false)

        //const visitsPerPage = new Map<number, number[]>()

        //await this.backend.dexieInstance
        //.table(POSTS_COLL)
        //.where('id')
        //.anyOf(idsToCheck)
        //.reverse()
        //.each(({ createdAt, id }) => {
        //const current = visitsPerPage.get(id) || []
        //visitsPerPage.set(id, [...current, createdAt.valueOf()])
        //})

        //idsToCheck.forEach((postId, i) => {
        //const currVisits = visitsPerPage.get(postId) || []
        //// `currVisits` array assumed sorted latest first
        //currVisits.forEach((visit) => {
        //if (doneFlags[i]) {
        //return
        //}

        //doneFlags[i] = attemptAdd(latestVisits)(visit, postId)
        //})
        //})

        //const latestEvents = new Map<number, number>()
        //latestVisits.forEach(attemptAdd(latestEvents))
        //latestBookmarks.forEach(attemptAdd(latestEvents))

        //return latestEvents
    }

    private async groupLatestEventsByUrl(
        params: SocialSearchParams,
        filteredUrls: FilteredIDs<number>,
    ): Promise<Map<number, number>> {
        return new Map<number, number>()
        //        return params.bookmarksOnly
        //? this.lookbackBookmarksTime(params)
        //: this.lookbackFromEndDate(params, filteredUrls)
    }

    async searchSocial(
        params: SocialSearchParams,
    ): Promise<Map<number, SocialPage>> {
        let postScoresMap: Map<number, number>
        const filteredPosts = await this.findFilteredPosts(params)

        if (
            (!params.termsInc || !params.termsInc.length) &&
            filteredPosts.isDataFiltered
        ) {
            postScoresMap = await this.mapUrlsToLatestEvents(
                params,
                [...filteredPosts.include].map((id) => Number(id)),
            )
        } else if (!params.termsInc || !params.termsInc.length) {
            postScoresMap = await this.groupLatestEventsByUrl(
                params,
                filteredPosts,
            )
        } else {
            const termsSearchResults = await this.lookupTerms(params)
            const filteredResults = termsSearchResults.filter((id) =>
                filteredPosts.isAllowed(id),
            )
            postScoresMap = await this.mapUrlsToLatestEvents(
                params,
                filteredResults,
            )
        }

        const ids = [...postScoresMap.entries()]
            .sort(([, a], [, b]) => b - a)
            .slice(params.skip, params.skip + params.limit)

        const pages = await this.mapIdsToSocialPages(
            ids.map(([postId]) => postId),
        )

        return pages
    }
}
