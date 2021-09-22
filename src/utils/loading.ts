import ora from 'ora'

export async function loading(promise: Promise<any>, message: string) {
    const spinner = ora(message).start()
    const result = await promise
    spinner.succeed()
    return result
}