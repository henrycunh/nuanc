import { Storage } from '@google-cloud/storage'
import { Snapshot, PageStatus } from '../@types/index.js'
import { NuancBaseDataDriver } from './base-driver.js'

export class NuancGoogleCloudStorageDriver implements NuancBaseDataDriver {

    private prefix: string
    constructor (prefix?: string) {
        if (prefix) {
            this.prefix = prefix
        } else {
            const { NUANC_GCS_PREFIX } = process.env
            if (!NUANC_GCS_PREFIX) {
                throw new Error('Missing the NUANC_GCS_PREFIX environment variable.')
            }
            this.prefix = NUANC_GCS_PREFIX
        }
    }
    private client = new Storage()

    private async saveFile (filePath: string, fileContent: any, database: string) {
        const bucket = this.client.bucket(`${this.prefix}-${database}`)
        if (!(await bucket.exists()).pop()) {
            await bucket.create()
        }
        const file = bucket.file(filePath)
        await file.save(JSON.stringify(fileContent), {
            contentType: 'application/json'
        })
    }
    
    async saveSnapshot(snapshot: Snapshot, database: string): Promise<void> {
        await this.saveFile('last-snapshot.json', snapshot, database.toLowerCase())
    }
    
    async loadLastSnapshot(database: string): Promise<Snapshot> {
        const bucket = this.client.bucket(`${this.prefix}-${database.toLowerCase()}`)
        if (!(await bucket.exists()).pop()) {
            throw new Error(`You haven't initialized the database snapshot yet, run $ nuanc init "${database}"`)
        }
        const file = bucket.file('last-snapshot.json')
        if (!(await file.exists()).pop()) {
            throw new Error(`You haven't initialized the database snapshot yet, run $ nuanc init "${database}"`)
        }
        const fileContents = (await file.download()).shift()
        if (fileContents) {
            console.log('exists')
            return JSON.parse(fileContents.toString('utf8')) as Snapshot
        } else {
            throw new Error(`Couldn't read file ${bucket}/last-snapshot.json`)
        }

    }
    
    async saveEvent(pageStatus: PageStatus, database: string): Promise<void> {
        const fileName = (new Date().getTime()) + '-event.json'
        this.saveFile(fileName, pageStatus, database)
    }

}