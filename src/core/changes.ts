import { Diff } from "deep-diff";
import { Snapshot } from "../@types";

type PropertyDiff = Diff<any, Snapshot>
type PropertyChange = { property: string, type: string, changes: Diff<any, Snapshot>[] }

export class Changes {

    static parse(diffList: PropertyDiff[]) {
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
            }
        }
        const propertyChangeList = Object.entries(propertyChangeMap)
            .map(([property, data]: [any, any]) => ({ property, type: data.type, changes: data.changes }))
            .map(Changes.byPropertyType)
        return propertyChangeList
    }

    static byPropertyType (modifiedProperty: PropertyChange) {
        const handlerMap: any = ({
            'formula': Changes.handleFormulaProperty,
            'select': Changes.handleSelectProperty,
            'people': Changes.handlePeopleProperty,
            'url': Changes.handleUrlProperty
        })
        const defaultHandler = (property: PropertyChange) => property
        const structuredChanges = (handlerMap[modifiedProperty.type] || defaultHandler)(modifiedProperty.changes)
        return { ...modifiedProperty, changes: structuredChanges }
    }

    private static handleFormulaProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleUrlProperty(changeList: Diff<any, Snapshot>[]) {
        const [diff]: any = changeList
        return { edited: { old: { value: diff.lhs }, new: { value: diff.rhs } } }
    }

    private static handleSelectProperty(changeList: Diff<any, Snapshot>[]) {
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
}