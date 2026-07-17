import { CompilerContext } from "../../generator/models/compiler-context.model";
import { ASTNode } from "../../parser/types/ast.type"
import { ImportNode } from "../../parser/types/nodes/import-node.type";
import { InterpolationNode } from "../../parser/types/nodes/interpolation-node.type"
import { TextNode } from "../../parser/types/nodes/text-node.type"

export type TypeCheckerTransitionFunctionReturnType = {
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
      node: Exclude<ASTNode, TextNode | InterpolationNode | ImportNode>,
      /**
       * Identifier of the DOM node (in the generated code) that this
       * function's children are rendered into.
       */
      parentNode: { identifier: string, type: string };
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
    };
    /**
     * Names of the parameters this generated function should declare, in
     * order (e.g. `[parentNode, 'parentContext', 'anchor']`). Determines the
     * function's signature as emitted in the generated source.
     */
    args?: string[];
  }>;
};