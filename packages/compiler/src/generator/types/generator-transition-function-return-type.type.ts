import { ASTNodeKind } from "../../parser/types/ast.type"
import { ImportNode } from "../../parser/types/nodes/import-node.type";
import { InterpolationNode } from "../../parser/types/nodes/interpolation-node.type"
import { TextNode } from "../../parser/types/nodes/text-node.type"
import { CompilerContext } from "../models/compiler-context.model"

export type GeneratorTransitionFunctionReturnType = {
  /**
   * Generated source code lines to be emitted at the call site of the
   * processed node (e.g. the `_renderElement(...)`, `_if(...)`, `_for(...)`
   * or `_switch(...)` invocation representing this node).
   */
  code: string[];
  /**
   * Additional helper functions that must be generated as separate methods
   * on the component class (e.g. `if0`, `for4`, `label0Children`), keyed by
   * their generated method name. Populated when a node produces content that
   * cannot be inlined at the call site — such as branch bodies for `_if`/
   * `_switch`, iteration bodies for `_for`, or child-rendering helpers for
   * an element's children.
   */
  functionsToProcess?: Map<string, {
    fn: {
      /**
       * The AST node whose children should be generated inside this
       * function's body.
       */
      node: Exclude<ASTNodeKind, TextNode | InterpolationNode | ImportNode>,
      /**
       * Identifier of the DOM node (in the generated code) that this
       * function's children are rendered into.
       */
      parentNode: string;
      /**
       * The compiler scope context active inside this function, used to
       * resolve identifiers (e.g. loop variables, aliases) when generating
       * the function's children.
       */
      context: CompilerContext;
      /**
       * Optional line(s) of code to prepend to the function body, before
       * its children are generated (e.g. the `_iterationVariables(...)`
       * destructuring assignment for a `@for` block).
       */
      precode?: string;
      /**
       * Se presente, indica che la funzione generata è un branch di
       * `_if`/`_for`/`_switch` (cioè un `block`/`forFn`) e che questo è il nome
       * della variabile `anchor` disponibile nel suo scope. Le chiamate di
       * rendering dirette nel suo corpo devono inoltrare questo valore.
       * Se `undefined`, la funzione non ha un anchor (es. un helper `*Children`)
       * e le sue chiamate di rendering dirette devono usare `null`.
       */
      anchor?: string;
      /**
       */
      isForBody?: boolean;
    };
    /**
     * Names of the parameters this generated function should declare, in
     * order (e.g. `[parentNode, 'parentContext', 'anchor']`). Determines the
     * function's signature as emitted in the generated source.
     */
    args?: string[];
  }>;
};