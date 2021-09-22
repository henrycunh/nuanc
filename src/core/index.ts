import fs, { PathLike } from 'fs'
import fse from 'fs-extra'
import os from 'os'
import path from 'path'
import consola from 'consola'
import { Diff, diff } from 'deep-diff'
import { Client } from '@notionhq/client'
import { Database, Page } from '@notionhq/client/build/src/api-types'
import { Changes } from './changes'
import { CardStatus, NuanceConfiguration, Snapshot } from '../@types'
import { NuanceConfigurationAllowedKeys } from '../@types'
import chalk from 'chalk'

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

    static async fetchSnapshot(databaseName: string): Promise<Snapshot> {
        const [tasksDB] = await Nuance.fetchDatabaseList(databaseName)
        const snapshot = await Nuance.notion.databases.query({ database_id: tasksDB.id })
        return snapshot.results
    }

    static saveLastSnapshot (snapshot: Snapshot) {
        fse.outputFileSync(Nuance.LAST_SNAPSHOT_PATH, JSON.stringify(snapshot))
    }

    static fetchLastSnapshot () {
        if (fs.existsSync(Nuance.LAST_SNAPSHOT_PATH)) {
            return JSON.parse(fs.readFileSync(Nuance.LAST_SNAPSHOT_PATH, 'utf-8'))
        } else {
            return []
        }
    }

    static getCardChanges(snapshot: Snapshot, lastSnapshot: Snapshot) {
        return diff(lastSnapshot, snapshot)
    }


    private static parseCardStatus(diffList: Diff<any, Snapshot>[]) {
        return (value: Page, index: number) => {
            const pageChangeList = diffList.filter(({ path }) => {
                const [pageIndex] = path || []
                return pageIndex === index
            })
            const pageName = value.properties.Name.type === 'title' ? value.properties.Name.title.pop()?.plain_text : '' 
            return { name: pageName as string, changed: Changes.parse(pageChangeList) } 
        }
    }
    
    static async getCardStatusList(databaseName: string): Promise<CardStatus[]> {
        const cardList = await Nuance.fetchSnapshot(databaseName)
        const cardChangeList = Nuance.getCardChanges(cardList, Nuance.fetchLastSnapshot())
        return cardList.map(Nuance.parseCardStatus(cardChangeList || [])).filter(card => card.changed.length)
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