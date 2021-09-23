import chalk from 'chalk'
import consola from 'consola'
import fs, { PathLike } from 'fs'
import fse from 'fs-extra'
import os from 'os'
import path from 'path'
import { Client } from '@notionhq/client'
import { Database, Page } from '@notionhq/client/build/src/api-types'
import DeepDiff from 'deep-diff'

import { Changes } from './changes.js'
import { loading } from '../utils/loading.js'
import { NuanceCLIOptions, NuanceConfigurationAllowedKeys } from '../@types/index.js'
import { NuanceConfiguration, Snapshot } from '../@types/index.js'

export class Nuance {
    static notion = new Client({
        auth: process.env.NOTION_TOKEN
    })
    static LAST_SNAPSHOT_PATH: string = path.join(os.homedir(), '.nuance', 'data', 'last-snapshot.json')

    static async fetchDatabaseList (query = '') {
        const { results } = await Nuance.notion.search({ query })
        const databaseList = results
            .filter((result) => result.object === 'database')
            .map((result) => ({
                ...result,
                title: (result as Database).title[0].plain_text
            }))
        return databaseList
    }

    static async fetchSnapshot(databaseName: string, options?: NuanceCLIOptions): Promise<Snapshot> {
        return loading(async () => {
            const [tasksDB] = await Nuance.fetchDatabaseList(databaseName)
            const snapshot = await Nuance.notion.databases.query({ database_id: tasksDB.id })
            return snapshot.results
        }, 'Loading snapshot', options?.silent)
    }

    static saveLastSnapshot (snapshot: Snapshot) {
        fse.outputFileSync(Nuance.LAST_SNAPSHOT_PATH, JSON.stringify(snapshot))
    }

    static fetchLastSnapshot (): Snapshot {
        if (fs.existsSync(Nuance.LAST_SNAPSHOT_PATH)) {
            return JSON.parse(fs.readFileSync(Nuance.LAST_SNAPSHOT_PATH, 'utf-8'))
        } else {
            return []
        }
    }

    static getPageChanges(snapshot: Snapshot, lastSnapshot: Snapshot) {
        return DeepDiff.diff(lastSnapshot, snapshot)
    }

    private static parsePageStatus(diffList: DeepDiff.Diff<any, Snapshot>[]) {
        return async (value: Page, index: number) => {
            const pageChangeList = diffList.filter(({ path }) => {
                const [pageIndex] = path || []
                return pageIndex === index
            })
            const pageName = await this.getPageTitle(value) 
            return { name: pageName as string, changed: await Changes.parse(pageChangeList) } 
        }
    }
    
    static async getPageStatusList(databaseName: string, options?: NuanceCLIOptions) {
        let snapshot = await Nuance.fetchSnapshot(databaseName, options)
        let lastSnapshot = Nuance.fetchLastSnapshot()
        let pageChangeList = Nuance.getPageChanges(snapshot, lastSnapshot)

        const addedOrRemovedElements = Nuance.getAddedOrRemovedPages(snapshot, lastSnapshot)
        if (addedOrRemovedElements !== null) {
            // Removes the added/deleted elements from the 
            // current/last snapshot to enable comparison of
            // the property changes without new items or
            // the gap of deletion messing up the indexes
            if ('added' in addedOrRemovedElements) {
                snapshot = snapshot?.filter(page => {
                    const elementList = addedOrRemovedElements.added
                    if (elementList !== undefined) {
                        return !elementList.some(element => page.id === element.id)
                    }
                })
            } else if ('removed' in addedOrRemovedElements) {
                lastSnapshot = lastSnapshot?.filter(page => {
                    const elementList = addedOrRemovedElements.removed
                    if (elementList !== undefined) {
                        return !elementList.some(element => page.id === element.id)
                    }
                })
            }
        }
        pageChangeList = Nuance.getPageChanges(
            Nuance.sortPageList(snapshot), 
            Nuance.sortPageList(lastSnapshot)
        )
        
        const pageStatusList = await Promise.all(
            snapshot.map(Nuance.parsePageStatus(pageChangeList || []))
        )

        return {
            ...(addedOrRemovedElements || {}),
            changed: pageStatusList.filter((page) => page.changed.length) 
        } 
        
    }

    static getAddedOrRemovedPages(currentSnapshot: Snapshot, lastSnapshot: Snapshot): { added?: Page[], removed?: Page[] } | null {
        // Checks for added elements
        if (currentSnapshot.length > lastSnapshot.length) {
            return { 
                added: currentSnapshot.filter(currentSnapshotPage => 
                    !lastSnapshot.some(lastSnapshotPage => lastSnapshotPage.id === currentSnapshotPage.id)
                )
            }
        } 
        // Checks for removed elements 
        else if (currentSnapshot.length < lastSnapshot.length) {
            return { 
                removed: lastSnapshot.filter(lastSnapshotPage => 
                    !currentSnapshot.some(currentSnapshotPage => lastSnapshotPage.id === currentSnapshotPage.id)
                ) as Page[]
            }
        } 
        return null
    }

    static async getPageTitle(page: string | Page) {
        const pageContent = typeof page === 'string' ? await loading(
            Nuance.notion.pages.retrieve({ page_id: page }),
            'Retrieving page ' + page
        ) : page
        const { properties } = pageContent
        for (const propertyName in properties) {
            const property = properties[propertyName] 
            if (property.type === 'title') {
                return property.title.pop()?.plain_text
            }
        }
        return null
    }

    private static sortPageList(pageList: Snapshot): Snapshot {
        return [...pageList].sort((pageA, pageB) => pageA.id > pageB.id ? -1 : 1)
    }

    /* Configuration */
    static CONFIGURATION_PATH: PathLike = path.join(os.homedir(), '.nuance', 'config.json')
    static configuration: NuanceConfiguration = {}

    static loadConfiguration () {
        if(fs.existsSync(Nuance.CONFIGURATION_PATH)) {
            try {
                const configuration = JSON.parse(fs.readFileSync(Nuance.CONFIGURATION_PATH, 'utf-8')) 
                Nuance.configuration = configuration
            } catch (e) {
                consola.error(e)
            }
        }
    }

    static saveConfiguration () {
        fse.outputFileSync(Nuance.CONFIGURATION_PATH as string, JSON.stringify(Nuance.configuration))
    }

    static setConfiguration (key: any, value: string) {
        if (NuanceConfigurationAllowedKeys.includes(key)) {
            (this.configuration as any)[key] = value
            consola.success(chalk`Key {bold ${key}} value was setted successfully!`)
        } else {
            consola.error(chalk`The key {red.bold ${key}} doesn't exist!`)
        }
    }
    
}