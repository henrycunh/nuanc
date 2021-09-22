import consola from 'consola'

export function onProcessExit (callback: any) {
    callback = callback || (() => {})

    process.on("exit", callback)

    process.on("SIGINT", function () {
        process.exit(2)
    })

    process.on("uncaughtException", function (e) {
        consola.error(e)
        process.exit(99)
    })
}
