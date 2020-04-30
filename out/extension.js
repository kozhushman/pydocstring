"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
function getDeclaration() {
    var _a, _b, _c, _d, _e;
    var selection = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.selection;
    var selected_text;
    var lineat = (_b = vscode.window.activeTextEditor) === null || _b === void 0 ? void 0 : _b.document.lineAt(selection === null || selection === void 0 ? void 0 : selection.start.line);
    selected_text = lineat === null || lineat === void 0 ? void 0 : lineat.text;
    var cnt = 1;
    var isNextEmpty = false;
    // getting offset of the first indented line
    while (true) {
        var offset = (_c = vscode.window.activeTextEditor) === null || _c === void 0 ? void 0 : _c.document.lineAt((selection === null || selection === void 0 ? void 0 : selection.start.line) + cnt);
        if (offset === null || offset === void 0 ? void 0 : offset.isEmptyOrWhitespace) {
            cnt += 1;
            // check if it really epmty or whitespaces
            if ((offset === null || offset === void 0 ? void 0 : offset.text.length) === 0) {
                isNextEmpty = true;
            }
        }
        else {
            offset = offset === null || offset === void 0 ? void 0 : offset.firstNonWhitespaceCharacterIndex;
            break;
        }
    }
    var defaultTabSize = (_e = (_d = vscode.window.activeTextEditor) === null || _d === void 0 ? void 0 : _d.options) === null || _e === void 0 ? void 0 : _e.tabSize;
    var tabDiff = offset - defaultTabSize;
    // if there is not indentation yet, set the default one
    if (tabDiff < 0) {
        tabDiff = defaultTabSize;
        offset = defaultTabSize;
    }
    return { "text": selected_text, "line": selection, "offset": { "regular_offset": Array(offset).fill(" ").join(""), "first_offset": Array(tabDiff).fill(" ").join(""), "isNextEmpty": isNextEmpty } };
}
exports.getDeclaration = getDeclaration;
function getParams(declaration) {
    const funcParse = new RegExp('\\s*def\\s*(?<declaration>[^(]*)?\\((?<params>.*)?\\)(\\s*->\\s*)?(?<return>.*):');
    const classParse = new RegExp('\\s*class\\s*(?<classname>[^()]*)\\(?(?<inheritance>[^()]*)?\\)?:');
    var parsedFunction = declaration.match(funcParse);
    var parsedClass = declaration.match(classParse);
    if (parsedFunction !== null) {
        var parsed = parsedFunction === null || parsedFunction === void 0 ? void 0 : parsedFunction.groups;
        var paramArray = new Array();
        if (parsed.params != null) {
            var params = parsed.params.replace(/\s/g, "").split(",");
            var parseParam = new RegExp('(?<variable>[^:,]*):?(?<type>.*)?');
            // array of parametres in {name:"name",type:"type"} format
            params.forEach(function (param) {
                var cur_match = param.match(parseParam).groups;
                if (cur_match !== null) {
                    paramArray.push(cur_match);
                }
            });
        }
        return { "params": paramArray, "return": parsed.return, "declaration": parsed.declaration, "type": "function" };
    }
    else if (classParse !== null) {
        var parsed = parsedClass === null || parsedClass === void 0 ? void 0 : parsedClass.groups;
        if ((parsed === null || parsed === void 0 ? void 0 : parsed.inheritance) != null) {
            var inheritanceArray = parsed === null || parsed === void 0 ? void 0 : parsed.inheritance.replace(/\s/g, "").split(",");
            return { "declaration": parsed === null || parsed === void 0 ? void 0 : parsed.classname, "type": "class", "inheritance": inheritanceArray };
        }
        return { "declaration": parsed === null || parsed === void 0 ? void 0 : parsed.classname, "type": "class" };
    }
    return [];
}
exports.getParams = getParams;
function buildDocstring(declarationParts, offset, editBuilder, insert_position) {
    var _a, _b;
    var default_indent = Array((_b = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.tabSize).fill(" ").join("");
    // choosing first indent of docstring
    if (offset.first_offset.length === 0 || !offset.isNextEmpty) {
        var doctring = offset.first_offset + '"""\n';
    }
    else {
        var doctring = offset.regular_offset + '"""\n';
    }
    doctring += offset.regular_offset + 'Description of ' + declarationParts.declaration + '\n\n';
    if (declarationParts.type == 'function') {
        if (declarationParts.params.length != 0) {
            doctring += offset.regular_offset + 'Args:\n';
            declarationParts.params.forEach(function (param) {
                doctring += offset.regular_offset + default_indent + param.variable + ' (' + param.type + '):\n';
            });
            doctring += '\n';
        }
        if (declarationParts.return != "") {
            doctring += offset.regular_offset + 'Returns:\n';
            doctring += offset.regular_offset + default_indent + declarationParts.return + '\n\n';
        }
    }
    else if (declarationParts.type == 'class' && declarationParts.inheritance != null) {
        doctring += offset.regular_offset + 'Inheritance:\n';
        declarationParts.inheritance.forEach(function (param) {
            doctring += offset.regular_offset + default_indent + param + ':\n';
        });
        doctring += '\n';
    }
    // choosing offset of the next string
    if (offset.first_offset.length == 0) {
        doctring += offset.regular_offset + '"""\n' + offset.regular_offset;
    }
    else {
        doctring += offset.regular_offset + '"""\n' + offset.first_offset;
    }
    return doctring;
}
exports.buildDocstring = buildDocstring;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "python-docstring" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerTextEditorCommand('python-docstring.addDocstring', () => {
        var _a, _b;
        var lang = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.languageId;
        if (lang === "python") {
            console.log('in!');
            var selected = getDeclaration();
            if (selected.text === null) {
                vscode.window.showErrorMessage('You must provide valid line for docstringing!');
                return;
            }
            var parsedDeclaration = getParams(selected.text);
            if (Object.keys(parsedDeclaration).length !== 0) {
                (_b = vscode.window.activeTextEditor) === null || _b === void 0 ? void 0 : _b.edit((editBuilder) => {
                    var insert_position = new vscode.Position(selected.line.end.line + 1, 4);
                    var docstring = buildDocstring(parsedDeclaration, selected.offset, editBuilder, insert_position);
                    editBuilder.insert(insert_position, docstring);
                });
            }
            else {
                vscode.window.showErrorMessage('You must provide valid line for docstringing!');
                return;
            }
        }
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from python_docstring!');
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map