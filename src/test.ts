import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
<div class="caep-property-grid-body">
  @if (itemData) {
    <div class="caep-plugin-subheader-container">
      <caep-text-input ngModel="{filter()}" prefixIcon="search" @ngModelChange="updateValue($event)" />
    </div>
    <caep-tabs activeIndex="{computedActiveIndex()}" @activeIndexChange="onActiveIndexChanged($event)" titleCollapsed="{tabTitleCollapsed()}">
      @for (tab of filteredTabs(); track tab.id) {
        <ng-template caepPanelTemplate cache="true" headerIcon="{tab.headerIcon}" title="{tab.displayName}">
          <caep-accordion activeIndex="{tab.activeIndex ?? [0]}" multiple="true">
            @for (category of tab.categories; track category.id) {
              <ng-template caepAccordionPanel="{category.id}" hidden="{!!category.hidden}" title="{category.displayName}">
                @for (property of category.items; track property.name) {
                  @if (!editorsReference.get(property.name)?.instance?.hidden()) {
                    <div class="caep-property-grid-editor-container">
                      @if (property.displayName) {
                        <span caepTooltip="{tooltipContent}" class="caep-property-grid-editor-name" innerHTML="{property.displayName}"></span>
                        <caep-v-layout>
                          <caep-text weight="bold">{ property.displayName }</caep-text>
                          @if (description) {
                            <caep-text>{ description }</caep-text>
                          }
                        </caep-v-layout>
                      }

                      @if (prefixIcons) {
                        <ng-container ngTemplateOutlet="{prefixIcons}" ngTemplateOutletContext="{{ $implicit: property }}" />
                      }

                      <div class="caep-property-editor">
                        <ng-template cdkPortalOutlet="{portalsValue[property.name]}" @attached="onAttachedPropertyEditorPortal(property, $event)" />
                      </div>

                      @if (suffixIcons) {
                        <div class="caep-property-grid-editor-icons-container">
                          <ng-container ngTemplateOutlet="{suffixIcons}" ngTemplateOutletContext="{{ implicit: property }}" />
                        </div>
                      }
                    </div>
                  }
                }
              </ng-template>
            }
          </caep-accordion>

          @if (footerTemplate) {
            <ng-container ngTemplateOutlet="{footerTemplate}" ngTemplateOutletContext="{{ category: tab.id }}"/>
          }
        </ng-template>
      }
    </caep-tabs>
  }
</div>
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
