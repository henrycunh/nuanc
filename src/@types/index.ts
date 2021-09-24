import { keys } from "ts-transformer-keys";
import { Page } from "@notionhq/client/build/src/api-types";

export type Snapshot = Page[]

export type PageChange = {
    property: string,
    type: string,
    changes: {
        edited?: { old: { value: string | boolean, color?: string }, new: { value: string | boolean, color?: string } },
        added?: { value: string },
        deleted?: { value: string },
    }
}

export type PageStatus = {
    name: string,
    changed: PageChange[]
}

export type NuanceConfiguration = {
    'default-db'?: string 
}

export type NuanceCLIOptions = {
    silent?: boolean
}

export const NuanceConfigurationAllowedKeys = keys<NuanceConfiguration>()