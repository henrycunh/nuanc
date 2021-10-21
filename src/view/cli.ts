import { PageStatus, PageStatusEventType } from '../@types/index.js'

// TODO: implement CLI renderer for events
export class NuancCLIRenderer {

    private static ['view-added'] (pageStatusList: PageStatus[]) {

    }

    private static ['view-removed'] (pageStatusList: PageStatus[]) {
        
    }

    private static ['view-changed'] (pageStatusList: PageStatus[]) {
        
    }

    static view (pageStatusList: PageStatus[]) {
        const eventTypeList: PageStatusEventType[] = ['added', 'removed', 'changed']
        for (const eventType of eventTypeList) {
            NuancCLIRenderer[`view-${eventType}`](pageStatusList)
        }
    }
}

// export function renderPageStatusList (pageStatusList: PageStatus[]) {
//     if (pageStatusList.length === 0) {
//         consola.info('No changes were made since last check!')
//     } else {
//         for (const page of pageStatusList) {

//             console.log(chalk.bold(`⊞ ${status.}`))
//             status.changed.forEach((property, index) => {
//                 const isLast = index === status.changed.length - 1
//                 const symbol = isLast ? '└──' : '├──'
//                 console.log(`${symbol} ${property.property}`)
//                 if (property.changes.edited) {
//                     const { edited } = property.changes
//                     const formattedOldText = (chalk as any)[edited.old.color || 'red'](edited.old.value)
//                     const formattedNewText = (chalk as any)[edited.new.color || 'green'](edited.new.value)
//                     console.log(`${isLast ? ' ' : '│'}   ${formattedOldText} ➜ ${formattedNewText}`)
//                 }
//                 if (property.changes.added) {
//                     const formattedText = chalk.green('+ ' + property.changes.added.value)
//                     console.log(`${isLast ? ' ' : '│'}   ${formattedText}`)
//                 }
//                 if (property.changes.deleted) {
//                     const formattedText = chalk.red('- ' + property.changes.deleted.value)
//                     console.log(`${isLast ? ' ' : '│'}   ${formattedText}`)
//                 }
//             })
//             console.log(`\n`)
//         }
//     }
// }