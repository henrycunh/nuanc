import { Page } from "@notionhq/client/build/src/api-types";
import { keys } from "ts-transformer-keys";

export type Snapshot = Page[]

export type CardChange = {
    property: string,
    type: string,
    changes: {
        edited?: { old: { value: string | boolean, color?: string }, new: { value: string | boolean, color?: string } },
        added?: { value: string },
        deleted?: { value: string },
    }
}

export type CardStatus = {
    name: string,
    changed: CardChange[]
}

export type NuanceConfiguration = {
    'default-db'?: string 
}

export const NuanceConfigurationAllowedKeys = keys<NuanceConfiguration>()