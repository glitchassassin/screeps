global.debug = {};

export const log = (context: string, message: string) => {
    if (global.debug[context]) {
        console.log(`[${context}] ${message}`)
    }
}
