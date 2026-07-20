import { createSourceFile, forEachChild, isClassDeclaration, ScriptTarget, SyntaxKind } from 'typescript';

/**
 * Mock component source for testing decorator parsing
 */
const MOCK_COMPONENT_SOURCE = `
import { WebComponent, Property, Event, BaseWebComponent } from '@xaendar/core';

@WebComponent({
  selector: 'test-button',
  templateUrl: './test-button.html'
})
class TestButtonComponent extends BaseWebComponent {
  @Property()
  accessor label!: string;

  @Property.required({ alias: 'click-count' })
  accessor clickCount!: number;

  @Event({ bubbles: true })
  accessor clicked!: any;
}
`;

// Simple source to test decorator parsing
const SIMPLE_SOURCE = `
class TestComponent {
  @Property()
  accessor myProp!: string;
}
`;


/**
 * Test extraction of WebComponent metadata from a sample component.
 * 
 * This is a basic test to verify that decorator parsing works correctly
 * before integrating into the type-checker pipeline.
 */
function testMetadataExtraction() {
  console.log('Testing component metadata extraction...\n');

  try {
    // Parse the mock component source
    const sourceFile = createSourceFile(
      'test-button.component.ts',
      MOCK_COMPONENT_SOURCE,
      ScriptTarget.Latest,
      true
    );

    let foundClass = false;

    forEachChild(sourceFile, (node) => {
      if (isClassDeclaration(node)) {
        const className = node.name?.text;
        console.log(`✓ Found class: ${className}`);

        // Check decorators
        if (node.decorators && node.decorators.length > 0) {
          console.log(`  Class Decorators: ${node.decorators.length}`);
          node.decorators.forEach((decorator, i) => {
            const expr = (decorator as any).expression;
            const decoratorName = (expr as any).expression?.text || (expr as any).text || 'unknown';
            console.log(`    [${i}] ${decoratorName}`);
          });
        }

        // Check class members (properties, accessors, methods)
        if (node.members) {
          console.log(`  Members: ${node.members.length}`);
          node.members.forEach((member, i) => {
            const memberName = (member as any).name?.text || `member${i}`;
            const kind = member.kind;
            let kindName = 'unknown';
            
            switch (kind) {
              case SyntaxKind.PropertyDeclaration: kindName = 'property'; break;
              case SyntaxKind.MethodDeclaration: kindName = 'method'; break;
              case SyntaxKind.GetAccessor: kindName = 'getter'; break;
              case SyntaxKind.SetAccessor: kindName = 'setter'; break;
              case SyntaxKind.Constructor: kindName = 'constructor'; break;
            }

            console.log(`    [${i}] ${memberName} (${kindName})`);
            
            // Check modifiers (which might contain decorators)
            if ((member as any).modifiers && (member as any).modifiers.length > 0) {
              console.log(`         Modifiers: ${(member as any).modifiers.length}`);
              (member as any).modifiers.forEach((mod: any, mi: number) => {
                console.log(`           [${mi}] kind=${mod.kind} text=${mod.text || '?'}`);
              });
            }
            
            // Print more details about kind
            console.log(`         SyntaxKind: ${kind}`);
            console.log(`         Name: ${(member as any).name?.text || '?'}`);

            if ((member as any).decorators && (member as any).decorators.length > 0) {
              console.log(`        Has ${(member as any).decorators.length} decorator(s)`);
              (member as any).decorators.forEach((dec: any, di: number) => {
                const decExpr = dec.expression;
                const decName = (decExpr.expression?.text) || (decExpr.text) || decExpr.property?.text || 'unknown';
                console.log(`          [${di}] ${decName}`);
              });
            }
          });
        }

        foundClass = true;
      }
    });

    if (!foundClass) {
      console.log('✗ No class found in source');
    }

  } catch (error) {
    console.error('✗ Error during parsing:', error);
  }
}

// Execute test immediately
testMetadataExtraction();

export { MOCK_COMPONENT_SOURCE, testMetadataExtraction };

