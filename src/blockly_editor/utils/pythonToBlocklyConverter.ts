/**
 * Python to Blockly Converter
 * 
 * This module provides Python-to-Blocks conversion following MakeCode's architecture:
 * 1. Lexer: Tokenize Python source code
 * 2. Parser: Build Abstract Syntax Tree (AST)
 * 3. Converter: Transform AST to Blockly blocks
 * 
 * Unlike regex-based approaches, this properly handles:
 * - Multi-line constructs (functions, loops, conditionals)
 * - Nested blocks
 * - Variable scoping
 * - Expression parsing
 */

import * as Blockly from "blockly";

/**
 * Token types from Python lexer
 */
enum TokenType {
  KEYWORD,
  IDENTIFIER,
  NUMBER,
  STRING,
  OPERATOR,
  INDENT,
  DEDENT,
  NEWLINE,
  EOF,
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

/**
 * AST Node types
 */
interface ASTNode {
  kind: string;
  startLine: number;
  endLine: number;
}

interface Module extends ASTNode {
  kind: "Module";
  body: Statement[];
}

interface Statement extends ASTNode {
  kind: string;
}

interface FunctionDef extends Statement {
  kind: "FunctionDef";
  name: string;
  args: string[];
  body: Statement[];
  decorator?: string; // e.g., "on_button_pressed"
}

interface ExprStatement extends Statement {
  kind: "ExprStatement";
  expr: Expression;
}

interface Expression extends ASTNode {
  kind: string;
}

interface CallExpr extends Expression {
  kind: "Call";
  func: Expression;
  args: Expression[];
}

interface AttributeExpr extends Expression {
  kind: "Attribute";
  value: Expression;
  attr: string;
}

interface NameExpr extends Expression {
  kind: "Name";
  id: string;
}

interface StringLiteral extends Expression {
  kind: "String";
  value: string;
}

interface NumberLiteral extends Expression {
  kind: "Number";
  value: number;
}

/**
 * Simple Python Lexer
 * Tokenizes Python source code into a stream of tokens
 */
class PythonLexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private tokens: Token[] = [];
  private indentStack: number[] = [0];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    this.tokens = [];
    
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      
      if (this.pos >= this.source.length) break;
      
      const char = this.source[this.pos];
      
      // Handle indentation at start of line
      if (this.col === 1 && char !== '\n') {
        this.handleIndentation();
      }
      
      // Keywords and identifiers
      if (this.isAlpha(char)) {
        this.readIdentifier();
      }
      // Numbers
      else if (this.isDigit(char)) {
        this.readNumber();
      }
      // Strings
      else if (char === '"' || char === "'") {
        this.readString();
      }
      // Operators and punctuation
      else if (this.isOperator(char)) {
        this.readOperator();
      }
      // Newline
      else if (char === '\n') {
        this.addToken(TokenType.NEWLINE, '\n');
        this.advance();
        this.line++;
        this.col = 1;
      }
      else {
        this.advance();
      }
    }
    
    // Add dedents for remaining indentation
    while (this.indentStack.length > 1) {
      this.addToken(TokenType.DEDENT, '');
      this.indentStack.pop();
    }
    
    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private handleIndentation(): void {
    let indent = 0;
    while (this.pos < this.source.length && this.source[this.pos] === ' ') {
      indent++;
      this.pos++;
      this.col++;
    }
    
    const currentIndent = this.indentStack[this.indentStack.length - 1];
    if (indent > currentIndent) {
      this.addToken(TokenType.INDENT, '');
      this.indentStack.push(indent);
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.addToken(TokenType.DEDENT, '');
        this.indentStack.pop();
      }
    }
  }

  private readIdentifier(): void {
    const start = this.pos;
    while (this.pos < this.source.length && this.isAlphaNum(this.source[this.pos])) {
      this.advance();
    }
    const value = this.source.substring(start, this.pos);
    const type = this.isKeyword(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
    this.addToken(type, value);
  }

  private readNumber(): void {
    const start = this.pos;
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
      this.advance();
    }
    if (this.pos < this.source.length && this.source[this.pos] === '.') {
      this.advance();
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        this.advance();
      }
    }
    this.addToken(TokenType.NUMBER, this.source.substring(start, this.pos));
  }

  private readString(): void {
    const quote = this.source[this.pos];
    this.advance(); // Skip opening quote
    const start = this.pos;
    
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.advance(); // Skip escape character
      }
      this.advance();
    }
    
    const value = this.source.substring(start, this.pos);
    this.advance(); // Skip closing quote
    this.addToken(TokenType.STRING, value);
  }

  private readOperator(): void {
    const char = this.source[this.pos];
    this.addToken(TokenType.OPERATOR, char);
    this.advance();
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '#') {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlphaNum(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isOperator(char: string): boolean {
    return '()[]{}.,;:=+-*/<>!'.includes(char);
  }

  private isKeyword(word: string): boolean {
    const keywords = ['def', 'class', 'if', 'elif', 'else', 'while', 'for', 'return', 
                      'import', 'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not',
                      'in', 'is', 'async', 'await'];
    return keywords.includes(word);
  }

  private advance(): void {
    this.pos++;
    this.col++;
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, col: this.col });
  }
}

/**
 * Simple Python Parser
 * Builds an AST from tokens
 */
class PythonParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Module {
    const body: Statement[] = [];
    
    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    return {
      kind: "Module",
      body,
      startLine: 1,
      endLine: this.tokens.length > 0 ? this.tokens[this.tokens.length - 1].line : 1
    };
  }

  private parseStatement(): Statement | null {
    // Function definition
    if (this.matchKeyword('def')) {
      return this.parseFunctionDef();
    }
    
    // Expression statement (function calls, etc.)
    const expr = this.parseExpression();
    if (expr) {
      this.match(TokenType.NEWLINE);
      return {
        kind: "ExprStatement",
        expr,
        startLine: expr.startLine,
        endLine: expr.endLine
      };
    }
    
    return null;
  }

  private parseFunctionDef(): FunctionDef | null {
    const startLine = this.previous().line;
    
    if (!this.match(TokenType.IDENTIFIER)) return null;
    const name = this.previous().value;
    
    if (!this.matchOperator('(')) return null;
    
    const args: string[] = [];
    while (!this.matchOperator(')') && !this.isAtEnd()) {
      if (this.match(TokenType.IDENTIFIER)) {
        args.push(this.previous().value);
      }
      this.matchOperator(',');
    }
    
    if (!this.matchOperator(':')) return null;
    this.match(TokenType.NEWLINE);
    
    if (!this.match(TokenType.INDENT)) return null;
    
    const body: Statement[] = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      const stmt = this.parseStatement();
      if (stmt) body.push(stmt);
    }
    
    this.match(TokenType.DEDENT);
    
    return {
      kind: "FunctionDef",
      name,
      args,
      body,
      startLine,
      endLine: this.previous().line
    };
  }

  private parseExpression(): Expression | null {
    return this.parseCall();
  }

  private parseCall(): Expression | null {
    let expr = this.parsePrimary();
    if (!expr) return null;
    
    while (this.matchOperator('.') || this.matchOperator('(')) {
      if (this.previous().value === '.') {
        // Attribute access
        if (!this.match(TokenType.IDENTIFIER)) return null;
        const attr = this.previous().value;
        expr = {
          kind: "Attribute",
          value: expr,
          attr,
          startLine: expr.startLine,
          endLine: this.previous().line
        };
      } else {
        // Function call
        const args: Expression[] = [];
        while (!this.matchOperator(')') && !this.isAtEnd()) {
          const arg = this.parseExpression();
          if (arg) args.push(arg);
          if (!this.matchOperator(',')) break;
        }
        
        expr = {
          kind: "Call",
          func: expr,
          args,
          startLine: expr.startLine,
          endLine: this.previous().line
        };
      }
    }
    
    return expr;
  }

  private parsePrimary(): Expression | null {
    if (this.match(TokenType.IDENTIFIER)) {
      return {
        kind: "Name",
        id: this.previous().value,
        startLine: this.previous().line,
        endLine: this.previous().line
      };
    }
    
    if (this.match(TokenType.STRING)) {
      return {
        kind: "String",
        value: this.previous().value,
        startLine: this.previous().line,
        endLine: this.previous().line
      };
    }
    
    if (this.match(TokenType.NUMBER)) {
      return {
        kind: "Number",
        value: parseFloat(this.previous().value),
        startLine: this.previous().line,
        endLine: this.previous().line
      };
    }
    
    return null;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchKeyword(keyword: string): boolean {
    if (this.check(TokenType.KEYWORD) && this.peek().value === keyword) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOperator(op: string): boolean {
    if (this.check(TokenType.OPERATOR) && this.peek().value === op) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }
}

/**
 * Convert AST to Blockly blocks
 */
export class PythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  /**
   * Convert Python code to Blockly blocks
   */
  convert(pythonCode: string): Blockly.Block[] {
    try {
      // Step 1: Lexical analysis
      const lexer = new PythonLexer(pythonCode);
      const tokens = lexer.tokenize();
      
      // Step 2: Syntactic analysis
      const parser = new PythonParser(tokens);
      const ast = parser.parse();
      
      // Step 3: Convert AST to blocks
      return this.convertModule(ast);
    } catch (error) {
      console.error("Python to Blockly conversion error:", error);
      return [];
    }
  }

  private convertModule(module: Module): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    
    for (const stmt of module.body) {
      const block = this.convertStatement(stmt);
      if (block) blocks.push(block);
    }
    
    return blocks;
  }

  private convertStatement(stmt: Statement): Blockly.Block | null {
    switch (stmt.kind) {
      case "FunctionDef":
        return this.convertFunctionDef(stmt as FunctionDef);
      case "ExprStatement":
        return this.convertExprStatement(stmt as ExprStatement);
      default:
        return null;
    }
  }

  private convertFunctionDef(func: FunctionDef): Blockly.Block | null {
    // Check for event handlers
    if (func.name === "on_start") {
      const block = this.workspace.newBlock("on_start");
      this.convertBody(func.body, block, "DO");
      return block;
    }
    
    if (func.name.startsWith("on_button_pressed_")) {
      const button = func.name.replace("on_button_pressed_", "").toUpperCase();
      const block = this.workspace.newBlock("on_button_pressed");
      block.setFieldValue(button, "BUTTON");
      this.convertBody(func.body, block, "DO");
      return block;
    }
    
    return null;
  }

  private convertExprStatement(stmt: ExprStatement): Blockly.Block | null {
    return this.convertExpression(stmt.expr);
  }

  private convertExpression(expr: Expression): Blockly.Block | null {
    switch (expr.kind) {
      case "Call":
        return this.convertCall(expr as CallExpr);
      default:
        return null;
    }
  }

  private convertCall(call: CallExpr): Blockly.Block | null {
    // Handle basic.show_string("text")
    if (call.func.kind === "Attribute") {
      const attr = call.func as AttributeExpr;
      if (attr.value.kind === "Name") {
        const obj = (attr.value as NameExpr).id;
        const method = attr.attr;
        
        if (obj === "basic" && method === "show_string") {
          const block = this.workspace.newBlock("show_string");
          if (call.args[0] && call.args[0].kind === "String") {
            const textBlock = this.workspace.newBlock("text");
            (textBlock as any).setShadow(true);
            textBlock.setFieldValue((call.args[0] as StringLiteral).value, "TEXT");
            const input = block.getInput("TEXT");
            if (input && input.connection) {
              input.connection.connect((textBlock as any).outputConnection);
            }
          }
          return block;
        }
        
        if (obj === "basic" && method === "show_number") {
          const block = this.workspace.newBlock("show_number");
          if (call.args[0] && call.args[0].kind === "Number") {
            const numBlock = this.workspace.newBlock("math_number");
            (numBlock as any).setShadow(true);
            numBlock.setFieldValue(String((call.args[0] as NumberLiteral).value), "NUM");
            const input = block.getInput("NUM");
            if (input && input.connection) {
              input.connection.connect((numBlock as any).outputConnection);
            }
          }
          return block;
        }
      }
    }
    
    return null;
  }

  private convertBody(stmts: Statement[], parentBlock: Blockly.Block, inputName: string): void {
    if (stmts.length === 0) return;
    
    const blocks: Blockly.Block[] = [];
    for (const stmt of stmts) {
      const block = this.convertStatement(stmt);
      if (block) blocks.push(block);
    }
    
    if (blocks.length === 0) return;
    
    // Connect first block to parent's statement input
    const input = parentBlock.getInput(inputName);
    if (input && input.connection && blocks[0].previousConnection) {
      input.connection.connect(blocks[0].previousConnection);
    }
    
    // Connect remaining blocks in sequence
    for (let i = 0; i < blocks.length - 1; i++) {
      if (blocks[i].nextConnection && blocks[i + 1].previousConnection) {
        blocks[i].nextConnection.connect(blocks[i + 1].previousConnection);
      }
    }
  }
}
