#!/usr/bin/env node
import consola from 'consola'
import { Command } from 'commander'

import { Nuanc } from './core/index.js'
import { NuancOptions, NuancConfigurationAllowedKeys } from './@types/index.js'
import { onProcessExit } from './utils/before-exit.js'
import { inspect } from 'util'

const program = new Command()
Nuanc.loadConfiguration()

program
.command('status [database]')
    .option('-s, --silent', 'Hides any animation or aiding text')
    .option('-p, --pretty', 'Renders the information in a human-ish way')
    .description('Compare the status of a database with the last time it was checked')
    .action(async (database: string, options: NuancOptions & { pretty?: boolean }) => {
        const currentDatabase = database || Nuanc.configuration["default-db"]
        if (currentDatabase === undefined) {
            consola.error("You didn't pass a database nor have a default one setted.")
            return
        }
        const pageStatusList = await Nuanc.getPageStatusList(currentDatabase, options)
        if (options.pretty) {
            console.log(inspect(pageStatusList, false, null, true))
        } else {
            console.log(JSON.stringify(pageStatusList))
        }
        const snapshot = await Nuanc.fetchSnapshot(currentDatabase, options)
        await Nuanc.saveSnapshot(snapshot, currentDatabase)
    })

program
    .command('init [database]')
    .description('Initializes the storage with a fresh snapshot of your board')
    .action(async (database: string, options: NuancOptions & { pretty?: boolean }) => {
        const currentDatabase = database || Nuanc.configuration['default-db']
        if (currentDatabase === undefined) {
            consola.error("You didn't pass a database nor have a default one setted.")
            return
        }
        const snapshot = await Nuanc.fetchSnapshot(currentDatabase, options)
        await Nuanc.saveSnapshot(snapshot, currentDatabase)
    })

const configCommand = program
    .command('config')
    .description('Configuration commands')

configCommand
    .command('set <key> <value>')
    .description('Sets the value for a configuration key')
    .action((key: string, value: string) => {
        Nuanc.setConfiguration(key, value)
    })

configCommand
    .command('list')
    .description('Lists the available configuration keys')
    .action(() => {
        console.log(NuancConfigurationAllowedKeys.join('\n'))
    })

program.parse(process.argv)

onProcessExit(() => {
    Nuanc.saveConfiguration()
})