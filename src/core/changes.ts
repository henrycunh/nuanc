import { Diff } from "deep-diff";
import { Nuanc } from "./index.js";
import { Snapshot } from "../@types/index.js";
import { inspect } from "util";

type PropertyDiff = Diff<any, Snapshot>
type Change = { property: string, type: string, changes: Diff<any, Snapshot>[] }

// TODO: Document the class and methods
export class Changes {

    static async parse(diffList: PropertyDiff[]) {
        const propertyChangeMap: any = {}
        for (const diff of diffList) {
            if(diff.path && diff.path?.length > 2) {
                const property = diff.path[2] as string
                const propertyType = diff.path[3] as string
                if (!(property in propertyChangeMap)) {
                    propertyChangeMap[property] = {
                        type: propertyType,
                        changes: []
                    }
                }
                propertyChangeMap[property].changes.push(diff)
            } else if (diff.path?.length === 2) {
                const metadata = diff.path.pop()
                if (!(metadata in propertyChangeMap)) {
                    propertyChangeMap[metadata] = {
                        type: 'metadata',
                        changes: []
                    }
                }
                propertyChangeMap[metadata].changes.push(diff)
            }
        }
        const propertyChangeList = Object.entries(propertyChangeMap)
            .map(([property, data]: [any, any]) => { 
                return {
                    property, 
                    type: data.type, 
                    changes: data.changes
                } 
            })
            .map(Changes.handleByType)
        return Promise.all(propertyChangeList)
    }

    static async handleByType (modifiedField: Change) {
        const handlerMap: any = ({
            'formula': Changes.handleFormulaProperty,
            'title': Changes.handleTitleProperty,
            'select': Changes.handleSelectProperty,
            'people': Changes.handlePeopleProperty,
            'url': Changes.handleUrlProperty,
            'relation': Changes.handleRelationProperty,
            'metadata': Changes.handleMetadata
            // 'checkbox': Changes.handleCheckboxProperty,
        })
        const defaultHandler = (property: Change) => property
        const structuredChanges = await (handlerMap[modifiedField.type] || defaultHandler)(modifiedField.changes)
        return { ...modifiedField, changes: structuredChanges }
    }

    private static handleMetadata(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleFormulaProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleUrlProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleTitleProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleSelectProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        const wasNull = diff.lhs === null
        if (wasNull) {
            return { 
                edited: {
                    old: { value: diff.lhs, color: diff.lhs },
                    new: { value: diff.rhs.name, color: diff.rhs.name }
                }
            }
        }
        const nameChange: any = changeList.find(change => change.path?.pop() === 'name')
        const colorChange: any = changeList.find(change => change.path?.pop() === 'color')
        return { 
            edited: {
                old: { value: nameChange.lhs, color: colorChange.lhs },
                new: { value: nameChange.rhs, color: colorChange.rhs }
            }
        }
    }

    private static handlePeopleProperty(changeList: Diff<any, Snapshot>[]) {
        const change: any = {}

        const nameChange: any = changeList.find(change => change.path?.pop() === 'name')
        const edited = nameChange ? { old: { value: nameChange.lhs }, new: { value: nameChange.rhs } } : null
        if (edited) {
            change.edited = edited
        }

        const hasArrayChanges = changeList.find(({ kind }) => kind === 'A')
        if (hasArrayChanges) {
            const [{ item: diff }]: any = changeList
            const kind = diff.kind === 'D' ? 'deleted' : 'added'
            change[kind] = { value: diff[diff.kind === 'D' ? 'lhs' : 'rhs'].name }
        }

        return change
    }

    private static async handleRelationProperty(changeList: Diff<any, Snapshot>[]) {
        const change: any = {}

        const idChange: any = changeList.find(change => change.path?.pop() === 'id')
        if (idChange) {
            const [oldPageTitle, newPageTitle] = await Promise.all([
                Nuanc.getPageTitle(idChange.rhs)
            ])
            change.edited = {
                old: { value: oldPageTitle }, 
                new: { value: newPageTitle }
            }
        }

        const hasArrayChanges = changeList.find(({ kind }) => kind === 'A')
        if (hasArrayChanges) {
            const [{ item: diff }]: any = changeList
            const kind = diff.kind === 'D' ? 'deleted' : 'added'

            const relatedPage = await Nuanc.notion.pages.retrieve({ 
                page_id: diff[kind === 'deleted' ? 'lhs' : 'rhs'].id
            })
            change[kind] = { value: await Nuanc.getPageTitle(relatedPage.id) }
        }

        return change
    }

    private static handleCheckboxProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

}