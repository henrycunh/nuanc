import ora from 'ora'

export async function loading<T>(callable: Promise<T> | (() => Promise<T>), message: string, hideAnimation = false) {
    if (!hideAnimation) {
        const spinner = ora(message).start()
        const result = typeof callable === 'function' ? await callable() : await callable
        spinner.succeed()
        return result
    }
    return typeof callable === 'function' ? await callable() : await callable
}