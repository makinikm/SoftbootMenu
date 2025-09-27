// New implementation that logs command output
function commandHandler(command) {
    try {
        // Execute command
        let output = executeCommand(command);
        global.log(output); // Log the output
    } catch (error) {
        global.logError(error); // Log the error
    }
}

function executeCommand(cmd) {
    // Placeholder for command execution logic
    return `Executed: ${cmd}`;
}