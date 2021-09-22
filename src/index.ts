#!/usr/bin/env node
import consola from 'consola'
import { Command } from 'commander'

import { Nuance } from './core/index.js'
import { NuanceConfigurationAllowedKeys } from './@types/index.js'
import { onProcessExit } from './utils/before-exit.js'
import { renderPageStatusList } from './view/cli.js'

const program = new Command()
Nuance.loadConfiguration()

program
    .option('-s, --silent', 'Hides any animation or aiding text')

program
    .command('status [database]')
    .option('-p, --pretty', 'Renders the information in a human-ish way')
    .description('Compare the status of a database with the last time it was checked')
    .action(async (database: string, options: any) => {
        const currentDatabase = database || Nuance.configuration["default-db"]
        if (currentDatabase === undefined) {
            consola.error("You didn't pass a database nor have a default one setted.")
            return
        }
        const pageStatusList = await Nuance.getPageStatusList(currentDatabase)
        if (options.pretty) {
            renderPageStatusList(pageStatusList)
        } else {
            console.log(JSON.stringify(pageStatusList))
        }
        Nuance.saveLastSnapshot(await Nuance.fetchSnapshot(currentDatabase))
    })

const configCommand = program
    .command('config')
    .description('Configuration commands')

configCommand
    .command('set <key> <value>')
    .description('Sets the value for a configuration key')
    .action((key: string, value: string) => {
        Nuance.setConfiguration(key, value)
    })

configCommand
    .command('list')
    .description('Lists the available configuration keys')
    .action(() => {
        console.log(NuanceConfigurationAllowedKeys.join('\n'))
    })

program.parse(process.argv)

onProcessExit(() => {
    Nuance.saveConfiguration()
})