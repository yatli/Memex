import {
    DexieUtilsPlugin,
    SearchLookbacksPlugin,
    SuggestPlugin,
    BackupPlugin,
} from 'src/search/plugins'
import { AnnotationsListPlugin } from 'src/search/background/annots-list'
import { SocialSearchPlugin } from 'src/search/background/social-search'
import { PageUrlMapperPlugin } from 'src/search/background/page-url-mapper'
import { StorageBackendPlugin } from '@worldbrain/storex'
import { Neo4jBackend } from 'src/search/neo4j'

export const createStorexPlugins = (): StorageBackendPlugin<Neo4jBackend>[] => [
    new SocialSearchPlugin(),
    new BackupPlugin(),
    new AnnotationsListPlugin(),
    new PageUrlMapperPlugin(),
    new SuggestPlugin(),
    new DexieUtilsPlugin(),
    new SearchLookbacksPlugin(),
]
