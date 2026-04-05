"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
const child_process_1 = require("child_process");
let openClaudeTerminal;
let hasAutoLaunched = false;
function getConfiguration() {
    return vscode.workspace.getConfiguration("openclaude");
}
function resolveExecutablePath(executablePath) {
    if (!executablePath)
        return undefined;
    // If it's an absolute path, check if it exists
    if (pathIsAbsolute(executablePath)) {
        return fs.existsSync(executablePath) ? executablePath : undefined;
    }
    // Otherwise, try to find it in the PATH
    try {
        const whichCommand = os.platform() === "win32" ? `where ${executablePath}` : `which ${executablePath}`;
        const result = (0, child_process_1.execSync)(whichCommand).toString().trim().split("\n")[0];
        return result && fs.existsSync(result) ? result : undefined;
    }
    catch {
        return undefined;
    }
}
function pathIsAbsolute(path) {
    if (os.platform() === "win32") {
        return /^[a-zA-Z]:\\/.test(path) || path.startsWith("\\\\");
    }
    return path.startsWith("/");
}
function getDefaultShell() {
    const customShell = getConfiguration().get("customShell");
    if (customShell)
        return customShell;
    if (os.platform() === "win32") {
        return "powershell.exe";
    }
    return process.env.SHELL || "/bin/zsh";
}
function activate(context) {
    const provider = new OpenClaudeViewProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider("openclaudeView", provider));
    context.subscriptions.push(vscode.commands.registerCommand("openclaude.openTerminal", async () => {
        console.log("OpenClaude: openTerminal command triggered");
        const config = getConfiguration();
        const executablePathSetting = config.get("executablePath") || "openclaude";
        const terminalName = config.get("terminalName") || "OpenClaude";
        const shellArgs = config.get("shellArgs") || ["-ilc"];
        const resolvedPath = resolveExecutablePath(executablePathSetting);
        if (!resolvedPath) {
            const installBtn = "Install Instructions";
            const selection = await vscode.window.showErrorMessage(`OpenClaude executable not found at: ${executablePathSetting}. Please ensure it is installed or update the path in settings.`, installBtn);
            if (selection === installBtn) {
                vscode.env.openExternal(vscode.Uri.parse("https://github.com/anthropics/claude-code"));
            }
            return;
        }
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        // Close existing if it's not the right one or if we want to ensure new styling
        if (openClaudeTerminal) {
            openClaudeTerminal.dispose();
            openClaudeTerminal = undefined;
        }
        openClaudeTerminal = vscode.window.createTerminal({
            name: terminalName,
            cwd,
            shellPath: getDefaultShell(),
            shellArgs: [...shellArgs, resolvedPath],
            color: new vscode.ThemeColor("terminal.ansiYellow"),
            env: {
                ...process.env,
                PATH: [
                    "/opt/homebrew/bin",
                    "/usr/local/bin",
                    "/usr/bin",
                    "/bin",
                    "/usr/sbin",
                    "/sbin",
                    process.env.PATH || ""
                ].join(":")
            },
            iconPath: new vscode.ThemeIcon("robot")
        });
        openClaudeTerminal.show(true);
    }));
    context.subscriptions.push(vscode.window.onDidCloseTerminal((terminal) => {
        if (openClaudeTerminal && terminal === openClaudeTerminal) {
            openClaudeTerminal = undefined;
        }
    }));
    if (!hasAutoLaunched) {
        hasAutoLaunched = true;
        const autoLaunch = getConfiguration().get("autoLaunch");
        if (autoLaunch) {
            setTimeout(() => {
                void vscode.commands.executeCommand("openclaude.openTerminal");
            }, 2500);
        }
    }
}
function deactivate() { }
class OpenClaudeViewProvider {
    constructor() {
        this.items = [
            new Item("Launch OpenClaude", "openclaude.openTerminal")
        ];
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        return Promise.resolve(this.items);
    }
}
class Item extends vscode.TreeItem {
    constructor(label, commandId) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: commandId,
            title: label
        };
    }
}
//# sourceMappingURL=extension.js.map