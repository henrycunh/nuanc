import chalk from 'chalk'
import consola from 'consola'
import fs, { PathLike } from 'fs'
import fse from 'fs-extra'
import os from 'os'
import path from 'path'
import { Client } from '@notionhq/client'
import DeepDiff from 'deep-diff'

import { Changes } from './changes.js'
import { loading } from '../utils/loading.js'
import { NuancOptions, NuancConfigurationAllowedKeys, NuancPageEvent, NuancPageEventHandler, PageStatus, Database, Page, NuancAvailableStorageDrivers, NuancStorageDriver } from '../@types/index.js'
import { NuancConfiguration, Snapshot } from '../@types/index.js'
import { NuancLocalDriver } from '../data/local.js'
import { NuancBaseDataDriver } from '../data/base-driver.js'

// TODO: document the class and methods 
export class Nuanc {
    static notion = new Client({
        auth: process.env.NOTION_TOKEN
    })

    /* Storage */
    private static storageDriverMap: NuancAvailableStorageDrivers = {
        'local': NuancLocalDriver
    }
    private static storage: NuancBaseDataDriver = new Nuanc.storageDriverMap.local()
    static useStorage (storageDriver: NuancStorageDriver | NuancBaseDataDriver, options?: any) {
        if (typeof storageDriver === 'string') {
            Nuanc.storage = new Nuanc.storageDriverMap[storageDriver](...options)
        } else {
            Nuanc.storage = storageDriver
        }
    }

    static async saveSnapshot (snapshot: Snapshot, database: string) {
        await Nuanc.storage.saveSnapshot(snapshot, database)
    }

    static async fetchLastSnapshot (database: string) {
        return Nuanc.storage.loadLastSnapshot(database)
    }

    static async saveEvent (event: PageStatus, database: string) {
        await Nuanc.storage.saveEvent(event, database)
    }

    static async fetchDatabaseList (query = ''): Promise<any[]> {
        const { results } = await Nuanc.notion.search({ query })
        const databaseList = results
            .filter((result) => result.object === 'database') as Database[]
        const titledDatabaseList = databaseList.
            map((result) => ({
                ...result,
                title: (result as Database).title[0].plain_text
            }))
        return titledDatabaseList
    }

    static async fetchSnapshot(databaseName: string, filter?: any, options?: NuancOptions): Promise<Snapshot> {
        if (!Boolean(databaseName)) {
            throw new Error('No notion database informed.')
        }
        return loading(async () => {
            const [tasksDB] = await Nuanc.fetchDatabaseList(databaseName)

            const snapshot = await Nuanc.notion.databases.query({ database_id: tasksDB.id, filter })
            return await Promise.all(
                snapshot.results.map(async (page) => {
                    const pageData = await Nuanc.notion.pages.retrieve({ page_id: page.id })
                    const pageName = String(await Nuanc.getPageTitle({ ...pageData, name: '' }, options))
                    return { ...pageData, name: pageName }
                })
            )
        }, 'Loading snapshot', options?.silent)
    }


    private static getPageChanges(snapshot: Snapshot, lastSnapshot: Snapshot) {
        return DeepDiff.diff(lastSnapshot, snapshot)
    }

    private static parsePageStatus(diffList: DeepDiff.Diff<any, Snapshot>[], options?: NuancOptions) {
        return async (page: Page, index: number) => {
            const pageChangeList = diffList.filter(({ path }) => {
                const [pageIndex] = path || []
                return pageIndex === index
            })
            const pageName = await Nuanc.getPageTitle(page, options)
            const changed = await Changes.parse(pageChangeList)
            const pageStatus: PageStatus = { ...page, name: pageName as string }
            if (changed.length) {
                pageStatus.status = 'changed'
                pageStatus.changed = changed
            }
            return pageStatus
        }
    }
    
    /**
     * Given a database name, returns a list of page with their status and changes.
     * @param databaseName The name of the database to get the pages from.
     * @param options Default Nuanc options.
     * @returns A list of pages with their status and changed properties.
     */
    static async getPageStatusList(databaseName: string, options?: NuancOptions): Promise<PageStatus[]> {
        let lastSnapshot = await Nuanc.fetchLastSnapshot(databaseName)
        if (lastSnapshot === null) {
            const snapshot = await Nuanc.fetchSnapshot(databaseName, options)
            await Nuanc.saveSnapshot(snapshot, databaseName)
            consola.info(`There was no snapshot saved previously.\nCreated snapshot for database ${chalk.bold(databaseName)}`)
            return []
        }
        let snapshot = await Nuanc.fetchSnapshot(databaseName, options)
        let pageChangeList = Nuanc.getPageChanges(snapshot, lastSnapshot)
        const { added, removed, currentSnapshotIntersection, lastSnapshotIntersection } = await Nuanc.getAddedOrRemovedPages(snapshot, lastSnapshot)
        
        pageChangeList = Nuanc.getPageChanges(
            currentSnapshotIntersection, 
            lastSnapshotIntersection
        )
        
        const changedPageList = (
            await Promise.all(
                snapshot.map(Nuanc.parsePageStatus(pageChangeList || [], options))
            )
        ).filter(page => page.status === 'changed')

        if (options?.persistSnapshot) {
            const freshSnapshot = await Nuanc.fetchSnapshot(databaseName, options)
            await Nuanc.saveSnapshot(freshSnapshot, databaseName)
        }

        return [
            ...added || [],
            ...removed || [],
            ...changedPageList 
        ]
        
    }

    /**
     * Given two snapshots, returns pages that were added and removed.
     * @param currentSnapshot The latest snapshot.
     * @param lastSnapshot The previous snapshot.
     * @returns A list of added and removed pages.
     */
    static async getAddedOrRemovedPages(currentSnapshot: Snapshot, lastSnapshot: Snapshot) {
        const intersection = currentSnapshot.filter(page => lastSnapshot.some(pageOnLastSnapshot => page.id === pageOnLastSnapshot.id))
        const added = (await Promise.all(
            currentSnapshot
                .filter(page => !intersection.some(intersectionPage => page.id === intersectionPage.id))
                .map(async (page) => ({ 
                    ...page, 
                    status: 'added'
                }))
        )) as PageStatus[]
        const removed = (await Promise.all(
            lastSnapshot
                .filter(page => !intersection.some(intersectionPage => page.id === intersectionPage.id))
                .map(async (page) => ({ 
                    ...page, 
                    status: 'removed'
                }))
        )) as PageStatus[]
        const currentSnapshotIntersection = currentSnapshot.filter(page => intersection.some(intersectionPage => page.id === intersectionPage.id))
        const lastSnapshotIntersection = lastSnapshot.filter(page => intersection.some(intersectionPage => page.id === intersectionPage.id))
        return { added, removed, currentSnapshotIntersection, lastSnapshotIntersection }
    }

    /**
     * Gets the title of a page.
     * @param page The page to get the title from, can be a page object or a page id.
     * @param options Default Nuanc options.
     * @returns The title of the page.
     */
    static async getPageTitle(page: string | (Page | PageStatus), options?: NuancOptions) {
        if (typeof page !== 'string') {
            for (const propertyName in page.properties) {
                const property = page.properties[propertyName]
                if (property.type === 'title') {
                    const title = property.title.pop()?.plain_text
                    if (title) {
                        return title
                    }
                }
            }
        }

        const pageId = typeof page === 'string' ? page : page.id
        const title = await Nuanc.notion.pages.properties.retrieve({ page_id: pageId, property_id: 'title' })
        if (title.object === 'list') {
            const result = title.results.pop()
            return result?.type === 'title' ? result.title.plain_text : null
        }
        return null
    }

    /**
     * Returns as list of pages that are related to the given page.
     * @param page The page to find related pages for.
     * @param options Default Nuanc options.
     * @returns A list of related pages.
     */
    static async getRelationPropertyPageList(page: Page, options?: NuancOptions): Promise<(Page & { name: string })[]> {
        for (const propertyName in page.properties) {
            const property = page.properties[propertyName]
            if (property.type === 'relation') {
                return await Promise.all(
                    property.relation.map(
                        async (relatedPage) => {
                            const page = await Nuanc.notion.pages.retrieve({ page_id: relatedPage.id })
                            // sorry for this shit ass code, i'm too tired
                            return { ...page, name: (await Nuanc.getPageTitle({ ...page, name: '' }, options)) as string }
                        }
                    )
                )
            }
        }
        return []
    }
    
    /* Event handling */
    private static handlePageEvent = { 
        added: [] as NuancPageEventHandler[], 
        removed: [] as NuancPageEventHandler[], 
        changed: [] as NuancPageEventHandler[]
    }

    /**
     * Adds an event listener for page events that occurr between snapshots
     * 
     * @param eventType The type of event you're listening for, could be 
     * either `added` for added pages, `removed` for removed pages or 
     * `changed` for pages that had their content changed.
     * @param handler Function that will handle the event. The event
     * parameter are as follows for each type of event:
     * - {@link Page} for the `added` event type
     * - {@link Page} for the `removed` event type
     * - {@link PageStatus} for the `changed` event type
     */
    static on(eventType: NuancPageEvent, handler: NuancPageEventHandler) {
        Nuanc.handlePageEvent[eventType].push(handler)
    }

    static async readEvents(databaseName: string, options?: NuancOptions) {
        const pageStatusList = await Nuanc.getPageStatusList(databaseName, { ...options, persistSnapshot: true })
        // i was drunk when i made this, but it's fast!
        for (const eventType in Nuanc.handlePageEvent) {
            // events segmented by type of event
            const pageListByEventType = pageStatusList.filter((page) => page.status === eventType)

            // for all the events of this type
            await Promise.all(
                pageListByEventType.map(async (pageEvent) => Promise.all(
                    // run all the handlers of this type
                    Nuanc.handlePageEvent[eventType as NuancPageEvent].map((handler) => handler(pageEvent))
                ))
            )
        }
    }

    /* Configuration */
    static CONFIGURATION_PATH: PathLike = path.join(os.homedir(), '.nuance', 'config.json')
    static configuration: NuancConfiguration = {}

    static loadConfiguration () {
        if(fs.existsSync(Nuanc.CONFIGURATION_PATH)) {
            try {
                const configuration = JSON.parse(fs.readFileSync(Nuanc.CONFIGURATION_PATH, 'utf-8')) 
                Nuanc.configuration = configuration
            } catch (e) {
                consola.error(e)
            }
        }
    }

    static saveConfiguration () {
        fse.outputFileSync(Nuanc.CONFIGURATION_PATH as string, JSON.stringify(Nuanc.configuration))
    }

    static setConfiguration (key: any, value: string) {
        if (NuancConfigurationAllowedKeys.includes(key)) {
            (this.configuration as any)[key] = value
            consola.success(chalk`Key {bold ${key}} value was setted successfully!`)
        } else {
            consola.error(chalk`The key {red.bold ${key}} doesn't exist!`)
        }
    }
    

}