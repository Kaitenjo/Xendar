import { ASTNodeKind } from '../../parser/types/ast.type';
import { CompilerContext } from '../models/compiler-context.model';

export function skipGeneration(_node: ASTNodeKind, _parentNode: string, _index: string, _compilerContext: CompilerContext): undefined {
  return;
}
