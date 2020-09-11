/* -----------------------------------------------------------
 * created by takeo asai
 * extension for Redpen (http://redpen.cc)
 * -------------------------------------------------------- */

"use strict";

import * as path from "path";
import {execSync} from "child_process";
import {Diagnostic, DiagnosticSeverity, Files} from "vscode-languageserver";
import { URLSearchParams } from 'url';

export class Redpen {
    static execSync(filename: string, format: string, limit: number = 1000): RedpenVSError[] {
        filename = path.relative("file:", filename);
        const cmd = `redpen -l ${limit} -f ${format} -r json2 /${filename}`;

        let stdout = '';
        try {
            stdout = execSync(cmd, {encoding: "utf8"});
        } catch(e){
            console.error(e);
        }

        function parse(param: RedpenFirstLevelError): RedpenVSError[] {
            return param.errors.map(e => new RedpenVSError(e))
        }
        const json: RedpenDocumentResult[] = JSON.parse(stdout.toString());
        return json[0].errors.flatMap(parse);
    }
}

interface RedpenDocumentResult {
	document: string;
	errors: RedpenFirstLevelError[];
}

interface RedpenPosition {
	offset: number;
	line: number;
}

interface RedpenPositionGroup {
	start: RedpenPosition;
	end: RedpenPosition;
}

interface RedpenFirstLevelError {
	errors: RedpenSecondLevelError[];
	position: RedpenPositionGroup;
}

interface RedpenSecondLevelError {
	subsentence: RedpenPosition;
	level: string;
	validator: string;
	position: RedpenPositionGroup;
	message: string;
}

export class RedpenVSError {
	private code: string;
    private message: string;
    private severity: DiagnosticSeverity;
    private position: {
        start: {offset: number, line: number},
        end: {offset: number, line: number}
	};

	constructor(from: RedpenSecondLevelError){
		this.code = from.validator;
        this.message = from.message;
        this.severity = DiagnosticSeverity.Warning;

        const p = from.position;
        this.position = {
            start: {offset: p.start.offset, line: p.start.line === 0 ? 0 : p.start.line - 1},
            end:  {offset: p.end.offset, line: p.end.line === 0 ? 0 : p.end.line - 1}
        };
	}

	getDiagnostic(): Diagnostic {
        const p  = this.position;
        return {
            severity: this.severity,
            range: {
                start: { line: p.start.line, character: p.start.offset},
                end: { line: p.end.line, character: p.end.offset }
            },
            code: this.code,
            message: this.message,
            source: "Redpen"
        };
    }
}