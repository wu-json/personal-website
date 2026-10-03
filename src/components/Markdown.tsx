import type { Root } from 'hast';
import {
  type Components as JsxComponents,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
import type { Components } from 'react-markdown';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

export type MarkdownModule = {
  data: Record<string, unknown>;
  body: string;
  tree: Root;
  captions?: Record<string, Root>;
};

const Markdown = ({
  tree,
  components,
}: {
  tree: Root;
  components?: Components;
}) =>
  toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: components as Partial<JsxComponents>,
    ignoreInvalidStyle: true,
    passKeys: true,
    passNode: true,
  });

export { Markdown };
