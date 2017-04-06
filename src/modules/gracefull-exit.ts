/**
 * single function that assigns a callback to all exit signals
 * @param {Function} callback
 */
function gracefullExit(callback : Function) {
    process.on('SIGTERM', () => {
        callback();
        setTimeout(() => {
            process.exit();
        }, 2500);
    });
    process.on('SIGINT', () => {
        callback();
        setTimeout(() => {
            process.exit();
        }, 2500);
    });
    process.on('uncaughtException', (error) => {
        console.error(error);
        callback();
        setTimeout(() => {
            process.exit();
        }, 2500);
    });
}

export default gracefullExit;
