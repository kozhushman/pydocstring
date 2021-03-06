// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import console = require('console');

export function getMultiline(line: number): [string, number] {
	var cnt = 1;
	var selected_text = "";
	while (true) {
		var cur_line = vscode.window.activeTextEditor?.document.lineAt(line + cnt)?.text;
		selected_text += cur_line!;

		if (cur_line?.slice(-1) === ':') {
			break;
		}
		cnt += 1;
	}
	var final_line = line + cnt;
	return [selected_text, final_line]
}


export function getDeclaration(): object | undefined {
	var selection = vscode.window.activeTextEditor?.selection;
	var selected_text: string | undefined;

	var lineat = vscode.window.activeTextEditor?.document.lineAt(selection!.start.line);
	selected_text = lineat?.text;
	console.log(selected_text);
	console.log(selected_text?.slice(-1));

	const isClass = new RegExp('\\s*class\\s*(?<name>.*):');
	var lineIsClass = false;
	var cnt = 1;
	if (selected_text?.slice(-1) !== ':') {
		console.log(selected_text?.slice(-1));
		var result = getMultiline(selection!.start.line);
		selected_text += result[0];
		var final_line = result[1];
	}
	else if (selected_text.match(isClass) !== null) {
		lineIsClass = true;
		cnt = 1;
		const isInit = new RegExp('.*__init__\\(.*');
		while (true) {
			var current_line = vscode.window.activeTextEditor?.document.lineAt(selection!.start.line + cnt);
			if (current_line?.isEmptyOrWhitespace) {
				cnt += 1;
				continue;
			}
			else {
				if (current_line?.text.match(isInit)) {
					if (current_line?.text.slice(-1) !== ':') {
						var result = getMultiline(selection!.start.line);
						selected_text += result[0];
						var final_line = selection!.start.line;
					}
					else {
						selected_text += current_line?.text;
						var final_line = selection!.start.line;
					}
				}
				else {
					var final_line = selection!.start.line;
				}
				cnt += 1;
				break;
			}
		}
		while (true) {
			var current_line = vscode.window.activeTextEditor?.document.lineAt(selection!.start.line + cnt);
			var is_attr = new RegExp('self.(?<attr>[^ =()]*)\\s?=');
			var is_end = new RegExp('(async|def|class)');
			if ((current_line?.isEmptyOrWhitespace || !current_line?.text.match(is_attr)) && !current_line?.text.match(is_end)) {
				cnt += 1;
				continue;
			}
			else if (current_line?.text.match(is_end)) {
				break;
			}
			else {
				if (current_line?.text.match(is_attr)) {
					selected_text += current_line?.text;
					cnt += 1;
					continue;
				}
				else {
					cnt += 1;
					continue;
				}
			}
		}
	}
	else {
		var final_line = selection!.start.line;
	}

	cnt = 1;
	var isNextEmpty = false;
	// getting offset of the first indented line
	while (true) {
		var get_offset = vscode.window.activeTextEditor?.document.lineAt(final_line + cnt);
		if (get_offset?.isEmptyOrWhitespace) {
			cnt += 1;
			// check if it really epmty or whitespaces
			if (get_offset?.text.length === 0) {
				isNextEmpty = true;
			}
		}
		else {
			var offset = get_offset?.firstNonWhitespaceCharacterIndex as number;
			break;
		}
	}

	var defaultTabSize = vscode.window.activeTextEditor?.options?.tabSize as number;
	var tabDiff = offset - defaultTabSize;
	// if there is not indentation yet, set the default one
	if (tabDiff < 0) {
		tabDiff = defaultTabSize;
		offset = defaultTabSize;
	}
	return { 'isClass': lineIsClass, "text": selected_text, "line": final_line, "offset": { "regular_offset": Array(offset).fill(" ").join(""), "first_offset": Array(tabDiff).fill(" ").join(""), "isNextEmpty": isNextEmpty } };
}


export function buildParam(paramArray: Array<any>, index: number, end_sign: string): object {
	var readyParam = "";
	readyParam += paramArray[index];
	var stopper = 0;
	for (var param = index + 1; param < paramArray.length; param++) {
		if (!paramArray[param].includes(end_sign)) {
			readyParam += "," + paramArray[param];
		} else {
			readyParam += "," + paramArray[param];
			stopper = param;
			break;
		}
	}

	return {
		"param": readyParam,
		"iteration": stopper
	};
}


export function parseParams(rawParams: string): Array<any> {
	var paramArray = new Array<any>();
	var params = rawParams.replace(/\s/g, "").split(",");
	params = params.filter(param => param !== "")

	var preparedParams = new Array<any>();
	for (var param = 0; param < params.length; param++) {
		
		var end_sign = null;
		if (params[param].includes("[")) {
			end_sign = "]";
		} else if (params[param].includes("(")) {
			end_sign = ")";

		} else if (params[param].includes("{")) {
			end_sign = "}";

		}
		if (end_sign) {
			var parsedParam = buildParam(params, param, end_sign) as any;
			param = parsedParam!.iteration;
			preparedParams.push(parsedParam!.param)
		} else {
			preparedParams.push(params[param])
		}
	}

	var parseParam = new RegExp('(?<variable>[^:,]*):?(?<type>.*)?');

	// array of parametres in {name:"name",type:"type"} format
	preparedParams.forEach(function (param: string) {
		var cur_match = param.match(parseParam)!.groups;
		if (cur_match !== null) {
			paramArray.push(cur_match);
		}
	});

	return paramArray;
}


export function parseAttrs(rawAttrs: string): Array<any> {
	var attrsArray = new Array<any>();
	var attrs = rawAttrs.split(" ");
	var is_attr = new RegExp('self.(?<attr>.*)');

	// array of parametres in {name:"name",type:"type"} format
	attrs.forEach(function (attr: string) {
		console.log(attr.match(is_attr))
		if (attr.match(is_attr)) {
			var cur_match = attr.match(is_attr)!.groups;
			if (cur_match !== null) {
				attrsArray.push(cur_match);
			}
		}
	});

	return attrsArray;
}


export function parseFunction(parsedFunction: any): object {
	console.log(parsedFunction?.groups);
	var parsed = parsedFunction?.groups;
	var paramArray = new Array<any>();
	if (parsed!.params != null) {
		paramArray = parseParams(parsed!.params);

	}

	return { "params": paramArray, "return": parsed!.return, "declaration": parsed!.declaration, "type": "function" };
}

export function parseClass(parsedClass: any): object {
	var parsed = parsedClass?.groups;
	var paramArray = new Array<any>();
	var attrsArray = new Array<any>();
	var inheritanceArray = new Array<any>();

	if (parsed?.inheritance != null) {
		inheritanceArray = parsed?.inheritance.replace(/\s/g, "").split(",");
	}
	if (parsed?.params != null) {
		paramArray = parseParams(parsed!.params);
		paramArray.forEach(function (item, index, object) {
			if (item.variable === 'self') {
				object.splice(index, 1);
			}
		});
	}
	if (parsed?.attrs != null) {
		attrsArray = parseAttrs(parsed!.attrs);
		// attrsArray.forEach(function(item, index, object){
		// 	if (item.variable === 'self') {
		// 		object.splice(index, 1);
		// 	  }
		// });
	}
	return { "attrs": attrsArray, "params": paramArray, "return": parsed!.return, "declaration": parsed?.classname, "type": "class", "inheritance": inheritanceArray }
}

export function getParams(declaration: string, isClass: Boolean): object | null {
	// const funcParse = new RegExp('\\s*def\\s*(?<declaration>[^(]*)?\\((?<params>.*)?\\)(\\s*->\\s*)?(?<return>.*):');
	const funcParse = new RegExp('\\s*def\\s*(?<declaration>[^(]*)\\([\r\n]?(?<params>(.|[\r\n])*)[\r\n]?\\)(\\s*->\\s*)?(?<return>.*):');
	// const classParse = new RegExp('\\s*class\\s*(?<classname>[^()\n]*)\\(?(?<inheritance>[^()]*)?\\)?:');
	//I hecking love regexpes (irony)
	const classParse = new RegExp('\\s*class\\s*(?<classname>[^():\n]*)\\(?(?<inheritance>[^()]*)?\\)?:[\r\n]?(\\s*def\\s*__init__\\([\r\n]?(?<params>(.|[\r\n])*)[\r\n]?\\)(\\s*->\\s*)?.*:)?\\s*(?<attrs>self..*)?');

	console.log(declaration);
	console.log(funcParse);
	var parsedFunction = declaration.match(funcParse);
	var parsedClass = declaration.match(classParse);

	if (parsedFunction !== null && !isClass) {
		return parseFunction(parsedFunction);
	}
	else if (parsedClass !== null) {
		return parseClass(parsedClass);
	}
	else {
		return null;
	}
}

export function buildSmallDocstring(declarationParts: any, offset: any): string {
	if (offset?.first_offset.length === 0 || !offset.isNextEmpty) {
		var doctring = offset.first_offset + '""" ';
	}
	else {
		var doctring = offset.regular_offset + '""" ';
	}
	doctring += 'Description of ' + declarationParts.declaration;
	if (offset.first_offset.length == 0) {
		doctring +=' """\n' + offset.regular_offset;
	}
	else {
		doctring +=' """\n' + offset.first_offset;
	}
	return doctring;
}

export function buildDocstring(declarationParts: any, offset: any, editBuilder: object, insert_position: object): string {
	var default_indent = Array(vscode.window.activeTextEditor?.options?.tabSize).fill(" ").join("");

	// choosing first indent of docstring
	if (offset?.first_offset.length === 0 || !offset.isNextEmpty) {
		var doctring = offset.first_offset + '"""\n';
	}
	else {
		var doctring = offset.regular_offset + '"""\n';
	}

	doctring += offset.regular_offset + 'Description of ' + declarationParts.declaration + '\n\n';
	if (declarationParts.type == 'function') {
		if (declarationParts.params.length != 0) {
			doctring += offset.regular_offset + 'Args:\n';
			declarationParts.params.forEach(function (param: any) {
				doctring += offset.regular_offset + default_indent + param.variable + ' (' + param.type + '):\n';
			});
			doctring += '\n';
		}
		if (declarationParts.return != "") {
			doctring += offset.regular_offset + 'Returns:\n';
			doctring += offset.regular_offset + default_indent + declarationParts.return + '\n\n';
		}
	}
	else if (declarationParts.type == 'class') {
		if (declarationParts.attrs.length != 0) {
			doctring += offset.regular_offset + 'Attributes:\n';
			declarationParts.attrs.forEach(function (attr: any) {
				doctring += offset.regular_offset + default_indent + attr.attr + ' (type):\n';
			});
			doctring += '\n';
		}
		// else {
		// 	doctring += offset.regular_offset + default_indent + 'attr1 (str): Description of \'attr1\' \n\n';
		// }

		if (declarationParts.inheritance.length != 0) {
			doctring += offset.regular_offset + 'Inheritance:\n';
			declarationParts.inheritance.forEach(function (param: any) {
				doctring += offset.regular_offset + default_indent + param + ':\n';
			});
			doctring += '\n';
		}

		if (declarationParts.params.length != 0) {
			doctring += offset.regular_offset + 'Args:\n';
			declarationParts.params.forEach(function (param: any) {
				doctring += offset.regular_offset + default_indent + param.variable + ' (' + param.type + '):\n';
			});
			doctring += '\n';
		}
	}

	// choosing offset of the next string
	if (offset.first_offset.length == 0) {
		doctring += offset.regular_offset + '"""\n' + offset.regular_offset;
	}
	else {
		doctring += offset.regular_offset + '"""\n' + offset.first_offset;
	}

	var lenCheck = doctring.replace(" ", "");
	console.log(lenCheck)
	console.log(lenCheck.length)
	if (declarationParts.type == 'class'){
		if (lenCheck.length < 90 && 
			declarationParts.params.length == 0 && 
			declarationParts.inheritance.length == 0 &&
			declarationParts.attrs.length == 0){
			doctring = buildSmallDocstring(declarationParts, offset);
		}
	}
	else {
		if (lenCheck.length < 90 && 
			declarationParts.params.length == 0 && 
			declarationParts.return == ""){
			doctring = buildSmallDocstring(declarationParts, offset);
		}
	}
	

	return doctring;
}



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "python-docstring" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerTextEditorCommand('pydocstring.addDocstring', () => {

		var lang = vscode.window.activeTextEditor?.document.languageId;

		if (lang === "python") {
			var selected = getDeclaration() as any;

			if (selected!.text === null) {
				vscode.window.showErrorMessage('You must provide valid line for docstringing!');
				return;
			}

			var parsedDeclaration = getParams(selected.text as string, selected.isClass as Boolean);
			if (parsedDeclaration === null) {
				vscode.window.showErrorMessage('You must provide valid line for docstringing!');
				return;
			}
			else if (Object.keys(parsedDeclaration).length !== 0) {
				vscode.window.activeTextEditor?.edit((editBuilder: vscode.TextEditorEdit) => {
					var insert_position = new vscode.Position(selected.line + 1, 4);
					// var insert_position = new  vscode.Position(selected.line.end.line + 1, 4);
					var docstring = buildDocstring(parsedDeclaration, selected.offset, editBuilder, insert_position);
					editBuilder.insert(insert_position, docstring);
				});
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
