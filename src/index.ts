#!/usr/bin/env node
import { Nuance } from "./core"
import { renderCardStatusList } from "./view/cli"
import { Command } from 'commander'
import { onProcessExit } from "./utils/before-exit"
import { NuanceConfigurationAllowedKeys } from "./@types"

const program = new Command()
Nuance.loadConfiguration()

program
    .command('status [database]')
    .option('-p, --pretty', 'Renders the information in a human-ish way')
    .description('Compare the status of a database with the last time it was checked')
    .action(async (database, options) => {
        const currentDatabase = database || Nuance.configuration["default-db"]
        const cardStatusList = await Nuance.getCardStatusList(currentDatabase)
        if (options.pretty) {
            renderCardStatusList(cardStatusList)
        } else {
            console.log(JSON.stringify(cardStatusList))
        }
        Nuance.saveLastSnapshot(await Nuance.fetchSnapshot(currentDatabase))
    })

const configCommand = program
    .command('config')
    .description('Configuration commands')

configCommand
    .command('set <key> <value>')
    .description('Sets the value for a configuration key')
    .action((key, value) => {
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