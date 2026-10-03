const TRIPLE_SLASH_DIRECTIVE = /^\/\s*<(reference|amd-module|amd-dependency)\b/;
const LINT_DIRECTIVE =
  /^\s*(eslint|oxlint)-(disable|enable)(-next-line|-line)?\b/;
const LANGUAGE_TAG = /^\s*(glsl|html|css|sql|graphql|gql)\s*$/;

function isAllowed(comment) {
  if (comment.type === 'Line' && TRIPLE_SLASH_DIRECTIVE.test(comment.value))
    return true;
  if (comment.type === 'Block' && LANGUAGE_TAG.test(comment.value)) return true;
  return LINT_DIRECTIVE.test(comment.value);
}

const noComments = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments to prevent comment-code drift',
    },
    messages: {
      noComments:
        'Comments are not allowed. Make the code self-explanatory instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (isAllowed(comment)) continue;
          context.report({ loc: comment.loc, messageId: 'noComments' });
        }
      },
    };
  },
};

export default {
  meta: { name: 'local' },
  rules: { 'no-comments': noComments },
};
