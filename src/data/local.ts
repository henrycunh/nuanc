import { Snapshot, PageStatus } from '../@types/index.js'
import Nuanc from '../index.js'
import { NuancBaseDataDriver } from './base-driver.js'
import fs from 'fs'
import consola from 'consola'
import chalk from 'chalk'
import fse from 'fs-extra'
import path from 'path'
import os from 'os'

export class NuancLocalDriver implements NuancBaseDataDriver {
    
    static LAST_SNAPSHOT_PATH = (database: string) => path.join(os.homedir(), '.nuance', 'data', database.toLowerCase(), 'last-snapshot.json')
    static EVENT_LIST_PATH = (database: string) => path.join(os.homedir(), '.nuance', 'data', database.toLowerCase(), 'events.jsonl')
    
    async saveSnapshot(snapshot: Snapshot, database: string): Promise<void> {
        consola.info(`Snapshot saved → ${chalk.blueBright(NuancLocalDriver.LAST_SNAPSHOT_PATH(database))}`)
        fse.outputFileSync(NuancLocalDriver.LAST_SNAPSHOT_PATH(database), JSON.stringify(snapshot))
    }
    
    async loadLastSnapshot(database: string): Promise<Snapshot> {
        if (fs.existsSync(NuancLocalDriver.LAST_SNAPSHOT_PATH(database))) {
            return JSON.parse(fs.readFileSync(NuancLocalDriver.LAST_SNAPSHOT_PATH(database), 'utf-8'))
        } else {
            throw new Error(`You haven't initialized the database snapshot yet, run $ nuanc init "${database}>"`)
        }
    }

    async saveEvent(pageStatus: PageStatus, database: string): Promise<void> {
        fse.appendFileSync(NuancLocalDriver.EVENT_LIST_PATH(database), JSON.stringify(pageStatus) + '\n')
    }


}