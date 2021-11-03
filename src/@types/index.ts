import { GetDatabaseResponse, GetPageResponse } from "@notionhq/client/build/src/api-endpoints";
import { keys } from "ts-transformer-keys"

export type Page = GetPageResponse & { name: string }
export type Database = GetDatabaseResponse
export type PageStatus = (Page & { 
    status?: PageStatusEventType, 
    name: string, 
    changed?: { 
        changes: any
        property: string
        type: string 
    }[] 
})
export type Snapshot = Page[]

export type PageStatusEventType = 'added' | 'removed' | 'changed'

export type NuancConfiguration = {
    'default-db'?: string 
}

export type NuancAvailableStorageDrivers = {
    local: any
}

export type NuancStorageDriver = keyof NuancAvailableStorageDrivers

export type NuancOptions = {
    silent?: boolean
    update?: boolean
    storage?: string
    persistSnapshot?: boolean
    saveEvents?: boolean
}

export type NuancPageEvent = 'added' | 'removed' | 'changed'
export type NuancPageEventHandler = (event: PageStatus) => Promise<void>

export const NuancConfigurationAllowedKeys = ['default-db']