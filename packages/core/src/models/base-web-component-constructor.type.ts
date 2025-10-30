import { Constructor } from "@xendar/common";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_SELECTORS } from "../costants";
import { BaseWebComponent } from "../directives/base-web-component";

export type BaseWebComponentConstructor = Constructor<BaseWebComponent, {
  observedAttributes: string[];
  [INTERNAL_OBSERVED_ATTRIBUTES]: string[];
  [INTERNAL_SELECTORS]: string | string[];
}>;