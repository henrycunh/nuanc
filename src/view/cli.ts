import chalk from "chalk";
import { CardStatus } from "../@types";
import consola from 'consola'

export function renderCardStatusList (statusList: CardStatus[]) {
    if (statusList.length === 0) {
        consola.info('No changes were made since last check!')
    } else {
        for (const status of statusList) {
            console.log(chalk.bold(`⊞ ${status.name}`))
            status.changed.forEach((property, index) => {
                const isLast = index === status.changed.length - 1
                const symbol = isLast ? '└──' : '├──'
                console.log(`${symbol} ${property.property}`)
                if (property.changes.edited) {
                    const { edited } = property.changes
                    const formattedOldText = (chalk as any)[edited.old.color || 'red'](edited.old.value)
                    const formattedNewText = (chalk as any)[edited.new.color || 'green'](edited.new.value)
                    console.log(`${isLast ? ' ' : '│'}   ${formattedOldText} ➜ ${formattedNewText}`)
                }
                if (property.changes.added) {
                    const formattedText = chalk.green('+ ' + property.changes.added.value)
                    console.log(`${isLast ? ' ' : '│'}   ${formattedText}`)
                }
                if (property.changes.deleted) {
                    const formattedText = chalk.red('- ' + property.changes.deleted.value)
                    console.log(`${isLast ? ' ' : '│'}   ${formattedText}`)
                }
            })
            console.log(`\n`)
        }
    }
}