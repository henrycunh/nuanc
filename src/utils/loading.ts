export async function loading<T>(callable: Promise<T> | (() => Promise<T>), message: string, hideAnimation = false) {
    if (!hideAnimation) {
        console.log(`${message}...`)
        const result = typeof callable === 'function' ? await callable() : await callable
        return result
    }
    return typeof callable === 'function' ? await callable() : await callable
}